import Anthropic from '@anthropic-ai/sdk'
import type { CandidateContext } from './interviewer'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })

export type RoundType = 'screen' | 'technical' | 'system_design' | 'behavioral'

export interface PanelTurnMessage {
  role: 'user' | 'assistant'
  content: string
}

// Round config: min questions before completion is allowed
export const ROUND_CONFIG: Record<RoundType, { min_questions: number; label: string; label_fr: string; focus: string }> = {
  screen:        { min_questions: 2, label: 'Screening',     label_fr: 'Filtrage',       focus: 'conceptual breadth and communication clarity' },
  technical:     { min_questions: 2, label: 'Technical',     label_fr: 'Technique',      focus: 'deep technical correctness and trade-off reasoning' },
  system_design: { min_questions: 1, label: 'System Design', label_fr: 'Conception',     focus: 'architectural thinking and scalability reasoning' },
  behavioral:    { min_questions: 2, label: 'Behavioral',    label_fr: 'Comportemental', focus: 'structured STAR answers and self-awareness' },
}

// ─── Round-type system prompts ────────────────────────────────────────────────

function buildRoundPrompt(
  lang: 'en' | 'fr',
  roundType: RoundType,
  roleCluster: string,
  questionsAsked: number,
  minQuestions: number,
  history: PanelTurnMessage[],
  ctx?: CandidateContext,
): string {
  const canComplete = questionsAsked >= minQuestions
  const jd  = ctx?.jobDescription?.trim().slice(0, 600) ?? ''
  const res = ctx?.resume?.trim().slice(0, 600) ?? ''
  const ctxNote = (jd || res) ? `\nCANDIDATE CONTEXT:\n${jd ? `Target role: "${jd}"\n` : ''}${res ? `Background: "${res}"\n` : ''}Personalise questions around their specific tools, companies, and claimed experience.\n` : ''

  const roleLabel = roleCluster.replace(/_/g, ' ')

  const ROUND_PROMPTS: Record<RoundType, string> = {
    screen: `You are conducting a SCREENING ROUND for a ${roleLabel} interview panel.

GOAL: Quickly assess breadth of knowledge, communication clarity, and baseline fit. This round is 5-7 minutes.
STYLE: Conversational, not deep. One conceptual question at a time. If the answer is solid, move on quickly.
FOCUS AREAS: High-level understanding of AI/LLM concepts, past experience, why this role, how they talk about their work.
${ctxNote}
ROUND RULES:
1. Ask ONE clear conceptual question. Do not ask multiple things at once.
2. After each answer:
   - Strong/clear answer: say "Good." and ask the next question, or end with [[ROUND_COMPLETE]] if done.
   - Weak/unclear: ask ONE brief follow-up ("Can you give a concrete example?"), then move on.
3. You have asked ${questionsAsked} of ${minQuestions} minimum questions.
${canComplete ? '4. You may end the round at any point by ending your message with [[ROUND_COMPLETE]].' : `4. Ask at least ${minQuestions - questionsAsked} more question(s) before ending the round.`}
5. Be brief. No speeches. Real screeners are efficient.
6. End your final message in this round with exactly [[ROUND_COMPLETE]].

EXAMPLE SCREEN QUESTIONS: "What does RAG solve that fine-tuning alone doesn't?" / "Walk me through a production AI system you built." / "What's your mental model for when to use an agent vs a direct LLM call?"`,

    technical: `You are conducting a TECHNICAL DEEP-DIVE ROUND for a ${roleLabel} interview panel.

GOAL: Probe technical depth, trade-off reasoning, and real implementation experience. This round is 10-15 minutes.
STYLE: Challenging, specific. Push back on vague answers. Demand specifics: "what metric?", "what threshold?", "why that approach over X?"
FOCUS AREAS: LLM architecture, RAG pipeline design, agent patterns, evaluation, production deployment, optimization.
${ctxNote}
ROUND RULES:
1. Ask ONE technical question at a time. Make it specific and implementation-focused.
2. After each answer, probe TWO things independently:
   - Technical depth: do they know the HOW?
   - Trade-off reasoning: do they know the WHY over alternatives?
   - If missing trade-off: probe directly — "Why [their choice] over [alternative]?"
   - After ONE probe: accept the answer and ask the next question.
3. You have asked ${questionsAsked} of ${minQuestions} minimum questions.
${canComplete ? '4. You may end the round at any point by ending your message with [[ROUND_COMPLETE]].' : `4. Ask at least ${minQuestions - questionsAsked} more question(s) before ending the round.`}
5. No compliments. Say "Got it." or "Next question." and move on.
6. End your final message in this round with exactly [[ROUND_COMPLETE]].

EXAMPLE TECHNICAL QUESTIONS: "How does PagedAttention improve GPU utilization in vLLM and when would you choose TGI instead?" / "Walk me through exactly how you'd detect retrieval quality degradation in a RAG system in production." / "Your agent keeps calling tools in the wrong order. How do you diagnose and fix that?"`,

    system_design: `You are conducting a SYSTEM DESIGN ROUND for a ${roleLabel} interview panel.

GOAL: Assess architectural thinking, scalability reasoning, and ability to make and justify design decisions under ambiguity. This round is 10-15 minutes.
STYLE: Collaborative but probing. Let the candidate lead. Ask clarifying questions. Push on choices: "Why that DB?", "How does this scale to 100x traffic?", "What breaks first?"
FOCUS AREAS: End-to-end AI system design — ingestion, retrieval, serving, evaluation, monitoring, failure modes.
${ctxNote}
ROUND RULES:
1. Present ONE system design scenario. Make it realistic and grounded in their background if context is available.
2. Let them structure the design. Guide with probing questions rather than lecturing.
3. Probe on: data flow, component choices, scalability, failure modes, eval strategy, trade-offs made.
4. You have asked ${questionsAsked} of ${minQuestions} minimum scenario(s).
${canComplete ? '4. You may end the round at any point by ending your message with [[ROUND_COMPLETE]].' : `4. Run at least ${minQuestions - questionsAsked} more scenario(s) before ending the round.`}
5. End your final message in this round with exactly [[ROUND_COMPLETE]].

EXAMPLE DESIGN SCENARIOS: "Design a RAG-based customer support system for a SaaS company with 50k daily users." / "You need to build a multi-agent pipeline that processes research papers and generates structured reports. Walk me through the architecture." / "Design an evaluation system for a company that has 20 LLM-powered features and needs to catch regressions before every deploy."`,

    behavioral: `You are conducting a BEHAVIORAL ROUND for a ${roleLabel} interview panel.

GOAL: Assess how the candidate communicates about real past work, handles ambiguity, and reflects on failures and growth.
STYLE: STAR-focused (Situation, Task, Action, Result). If they are vague, ask for the specific result or concrete outcome.
FOCUS AREAS: AI project ownership, handling model failures in production, cross-functional collaboration, ambiguity and prioritization.
${ctxNote}
ROUND RULES:
1. Ask ONE behavioral question at a time. Make it specific to AI engineering context.
2. If their answer lacks: Situation → ask "What was the specific situation?", Result → ask "What was the measurable outcome?"
3. After a complete STAR answer, say "Got it." and ask the next question.
4. You have asked ${questionsAsked} of ${minQuestions} minimum questions.
${canComplete ? '4. You may end the round at any point by ending your message with [[ROUND_COMPLETE]].' : `4. Ask at least ${minQuestions - questionsAsked} more question(s) before ending the round.`}
5. Be warm but precise. If they give a generic non-answer, name it: "Can you give me a specific situation from your work?"
6. End your final message in this round with exactly [[ROUND_COMPLETE]].

EXAMPLE BEHAVIORAL QUESTIONS: "Tell me about a time an AI system you built behaved unexpectedly in production. What happened and what did you do?" / "Describe a project where you had to balance model quality against latency or cost constraints." / "Tell me about a time you had to convince non-technical stakeholders about an AI limitation."`,
  }

  return ROUND_PROMPTS[roundType]
}

// ─── Open a round ─────────────────────────────────────────────────────────────

export async function openRound(params: {
  lang: 'en' | 'fr'
  roundType: RoundType
  roleCluster: string
  ctx?: CandidateContext
}): Promise<string> {
  const { lang, roundType, roleCluster, ctx } = params
  const minQ = ROUND_CONFIG[roundType].min_questions

  const system = buildRoundPrompt(lang, roundType, roleCluster, 0, minQ, [], ctx)

  const res = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 300,
    system,
    messages: [{ role: 'user', content: lang === 'fr' ? 'Commencez ce tour.' : 'Begin this round.' }],
  })

  const text = res.content[0].type === 'text' ? res.content[0].text : ''
  return text.replace(/\[\[ROUND_COMPLETE\]\]/g, '').trim()
}

// ─── Conduct a panel turn ─────────────────────────────────────────────────────

export async function conductPanelTurn(params: {
  lang: 'en' | 'fr'
  roundType: RoundType
  roleCluster: string
  history: PanelTurnMessage[]
  userMessage: string
  questionsAsked: number
  ctx?: CandidateContext
}): Promise<{ response: string; roundComplete: boolean }> {
  const { lang, roundType, roleCluster, history, userMessage, questionsAsked, ctx } = params
  const minQ = ROUND_CONFIG[roundType].min_questions

  const system = buildRoundPrompt(lang, roundType, roleCluster, questionsAsked, minQ, history, ctx)

  const messages: Anthropic.MessageParam[] = [
    ...history.map(m => ({ role: m.role as 'user' | 'assistant', content: m.content })),
    { role: 'user', content: userMessage },
  ]

  const res = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 500,
    system,
    messages,
  })

  const text = res.content[0].type === 'text' ? res.content[0].text : ''
  const roundComplete = text.includes('[[ROUND_COMPLETE]]')
  const cleaned = text.replace(/\[\[ROUND_COMPLETE\]\]/g, '').trim()

  return { response: cleaned, roundComplete }
}

// ─── Grade a panel turn ───────────────────────────────────────────────────────

export interface PanelGradeResult {
  score: 1 | 2 | 3 | 4
  rationale: string
  strengths: string[]
  gaps: string[]
  tradeoff_score: 1 | 2 | 3 | 4
  tradeoff_note: string
}

const PANEL_GRADER_TOOL: Anthropic.Tool = {
  name: 'grade_panel_turn',
  description: 'Grade a single answer in a panel interview round.',
  input_schema: {
    type: 'object' as const,
    required: ['score', 'rationale', 'strengths', 'gaps', 'tradeoff_score', 'tradeoff_note'],
    properties: {
      score:          { type: 'integer', minimum: 1, maximum: 4, description: '1=weak 2=fair 3=solid 4=strong' },
      rationale:      { type: 'string', description: '1-2 sentence explanation of the score' },
      strengths:      { type: 'array', items: { type: 'string' }, description: 'Specific things done well' },
      gaps:           { type: 'array', items: { type: 'string' }, description: 'Specific things missing' },
      tradeoff_score: { type: 'integer', minimum: 1, maximum: 4, description: '1=no alternatives considered 4=explicit justified comparison' },
      tradeoff_note:  { type: 'string', description: 'One sentence on trade-off reasoning quality' },
    },
  },
}

export async function gradePanelTurn(params: {
  roundType: RoundType
  questionText: string
  answerText: string
  conversationContext?: string
}): Promise<PanelGradeResult> {
  const { roundType, questionText, answerText, conversationContext } = params

  const roundExpectations: Record<RoundType, string> = {
    screen:        'Clear, concise, demonstrates breadth. No need for deep specifics — look for sensible mental models and communication clarity.',
    technical:     'Technically correct, specific implementation details, justifies trade-offs with named alternatives and reasoning.',
    system_design: 'Structured approach, component choices justified, addresses scale and failure modes, iterative refinement.',
    behavioral:    'Complete STAR structure (Situation, Task, Action, Result), specific and measurable outcome, reflection on learning.',
  }

  const system = `You are grading a ${roundType.replace('_', ' ')} round answer in an AI engineering panel interview.
Round expectations: ${roundExpectations[roundType]}
Grade content only — not communication style or language fluency.`

  const userContent = conversationContext
    ? `FULL EXCHANGE:\n${conversationContext}\n\nQUESTION: ${questionText}\nANSWER TO GRADE: ${answerText}`
    : `QUESTION: ${questionText}\nANSWER: ${answerText}`

  const res = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 600,
    system,
    tools: [PANEL_GRADER_TOOL],
    tool_choice: { type: 'tool', name: 'grade_panel_turn' },
    messages: [{ role: 'user', content: userContent }],
  })

  const toolUse = res.content.find(b => b.type === 'tool_use')
  if (!toolUse || toolUse.type !== 'tool_use') {
    return { score: 2, rationale: 'Grading failed.', strengths: [], gaps: [], tradeoff_score: 1, tradeoff_note: 'Not evaluated.' }
  }

  return toolUse.input as PanelGradeResult
}

// ─── Generate panel report ────────────────────────────────────────────────────

export interface PanelRoundReport {
  round_type: RoundType
  score: number
  score_label: string
  strengths: string[]
  gaps: string[]
  summary: string
}

export interface PanelReport {
  overall_score: number
  readiness_label: string
  rounds: PanelRoundReport[]
  top_strength: string
  top_gap: string
  next_steps: string
}

function scoreLabel(score: number): string {
  if (score >= 3.5) return 'Strong'
  if (score >= 2.8) return 'Good'
  if (score >= 2.0) return 'Developing'
  return 'Needs Work'
}

export async function generatePanelReport(params: {
  lang: 'en' | 'fr'
  roleCluster: string
  roundGrades: Array<{ roundType: RoundType; grades: PanelGradeResult[] }>
}): Promise<PanelReport> {
  const { roleCluster, roundGrades } = params

  const roundReports: PanelRoundReport[] = roundGrades.map(({ roundType, grades }) => {
    const avg = grades.reduce((s, g) => s + g.score, 0) / (grades.length || 1)
    const allStrengths = grades.flatMap(g => g.strengths).slice(0, 3)
    const allGaps      = grades.flatMap(g => g.gaps).slice(0, 3)
    return {
      round_type:   roundType,
      score:        Math.round(avg * 10) / 10,
      score_label:  scoreLabel(avg),
      strengths:    allStrengths,
      gaps:         allGaps,
      summary:      grades[0]?.rationale ?? '',
    }
  })

  const overall = roundReports.reduce((s, r) => s + r.score, 0) / (roundReports.length || 1)

  const allStrengths = roundReports.flatMap(r => r.strengths)
  const allGaps      = roundReports.flatMap(r => r.gaps)
  const worstRound   = roundReports.reduce((a, b) => a.score < b.score ? a : b, roundReports[0])

  const res = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 800,
    system: 'You write concise, specific, honest interview feedback reports. Return valid JSON only.',
    messages: [{
      role: 'user',
      content: `Role: ${roleCluster.replace(/_/g, ' ')}
Overall score: ${overall.toFixed(1)}/4

Round scores:
${roundReports.map(r => `${r.round_type}: ${r.score}/4 — strengths: ${r.strengths.join(', ')} — gaps: ${r.gaps.join(', ')}`).join('\n')}

Write a panel report as JSON:
{
  "top_strength": "<one specific sentence about what they did best across the whole panel>",
  "top_gap": "<one specific sentence about the biggest weakness across the whole panel>",
  "next_steps": "<3 concrete next steps, written as a single paragraph>"
}`,
    }],
  })

  const text = res.content[0].type === 'text' ? res.content[0].text : ''
  let parsed: { top_strength?: string; top_gap?: string; next_steps?: string } = {}
  try { parsed = JSON.parse(text.replace(/```json\n?|```/g, '').trim()) } catch { /* use fallbacks */ }

  return {
    overall_score:   Math.round(overall * 10) / 10,
    readiness_label: scoreLabel(overall),
    rounds:          roundReports,
    top_strength:    parsed.top_strength ?? allStrengths[0] ?? 'Shows foundational AI engineering knowledge.',
    top_gap:         parsed.top_gap      ?? allGaps[0]      ?? `Needs to deepen ${worstRound?.round_type ?? 'technical'} skills.`,
    next_steps:      parsed.next_steps   ?? 'Practice trade-off reasoning, build full end-to-end projects, and focus on the weakest round type.',
  }
}
