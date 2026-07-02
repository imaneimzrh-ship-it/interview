import Anthropic from '@anthropic-ai/sdk'
import type { Question, SubSkill } from './interviewer'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })

// ─── Grader output schema ─────────────────────────────────────────────────────
// Forced via tool_use — guarantees structured JSON, no prose parsing

export interface GradeResult {
  sub_skill_slug: string
  score: 1 | 2 | 3 | 4         // 1=weak 2=fair 3=good 4=strong
  evidence_quote: string         // verbatim excerpt from the answer
  rationale: string              // why this score, referencing the rubric
  gaps: string[]                 // specific things missing
  strengths: string[]            // specific things done well
  follow_up_warranted: boolean   // did this answer need probing?
}

const GRADER_TOOL: Anthropic.Tool = {
  name: 'grade_answer',
  description: 'Grade a candidate answer against a rubric. Return structured evaluation.',
  input_schema: {
    type: 'object' as const,
    required: ['sub_skill_slug','score','evidence_quote','rationale','gaps','strengths','follow_up_warranted'],
    properties: {
      sub_skill_slug:       { type: 'string', description: 'The sub-skill being graded' },
      score:                { type: 'integer', minimum: 1, maximum: 4, description: '1=weak 2=fair 3=good 4=strong' },
      evidence_quote:       { type: 'string', description: 'Direct verbatim quote from the answer that most influenced the score' },
      rationale:            { type: 'string', description: 'Why this score, in 1-2 sentences, referencing the rubric criteria' },
      gaps:                 { type: 'array', items: { type: 'string' }, description: 'Specific things missing from the answer' },
      strengths:            { type: 'array', items: { type: 'string' }, description: 'Specific things done well' },
      follow_up_warranted:  { type: 'boolean', description: 'Was a follow-up probe justified based on the answer?' },
    },
  },
}

// ─── Build grader prompt ──────────────────────────────────────────────────────
// IMPORTANT: Language-agnostic — grades content, not fluency.
// The grader never knows if the interview was in EN or FR.

function buildGraderSystem(subSkill: SubSkill, question: Question, moduleName: string): string {
  return `You are an expert technical grader evaluating a candidate's answer to an Applied AI Engineer interview question. You grade CONTENT only — fluency, language, and communication style are NOT part of your rubric.

MODULE: ${moduleName}
SUB-SKILL: ${subSkill.name_en} (${subSkill.slug})
QUESTION ASKED: "${question.body_en}"

GRADING RUBRIC:
STRONG (score 4): ${question.rubric_strong}
GOOD (score 3): Partially meets strong criteria — covers main points but misses 1-2 important aspects
FAIR (score 2): ${question.rubric_medium}
WEAK (score 1): ${question.rubric_weak}

CALIBRATION:
- Score 4 (strong): Candidate demonstrated clear mastery with specifics
- Score 3 (good): Solid answer with minor gaps — a hireable response
- Score 2 (fair): Partial understanding — correct direction but missing key reasoning
- Score 1 (weak): Significant gaps, wrong direction, or no substantive answer

IMPORTANT:
- Quote EXACTLY from the answer as evidence (do not paraphrase the evidence)
- Gaps and strengths must be SPECIFIC to this answer, not generic
- If the answer is in French, still grade it — the rubric is in English but content is the same
- Do NOT grade grammar, word choice, or sentence structure`
}

// ─── Grade a single answer ────────────────────────────────────────────────────

export async function gradeAnswer(params: {
  subSkill: SubSkill
  question: Question
  moduleName: string
  answerText: string              // the candidate's full answer (possibly in FR)
  conversationContext?: string    // the full Q&A exchange including follow-ups
}): Promise<GradeResult> {
  const { subSkill, question, moduleName, answerText, conversationContext } = params

  const userContent = conversationContext
    ? `FULL Q&A EXCHANGE:\n${conversationContext}\n\nCANDIDATE'S FINAL ANSWER TO GRADE:\n${answerText}`
    : `CANDIDATE ANSWER:\n${answerText}`

  const res = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1000,
    system: buildGraderSystem(subSkill, question, moduleName),
    tools: [GRADER_TOOL],
    tool_choice: { type: 'tool', name: 'grade_answer' },
    messages: [{ role: 'user', content: userContent }],
  })

  const toolUse = res.content.find(b => b.type === 'tool_use')
  if (!toolUse || toolUse.type !== 'tool_use') {
    // Fallback if tool use fails
    return {
      sub_skill_slug: subSkill.slug,
      score: 2,
      evidence_quote: answerText.slice(0, 100),
      rationale: 'Grading failed — manual review required.',
      gaps: [],
      strengths: [],
      follow_up_warranted: true,
    }
  }

  const input = toolUse.input as GradeResult
  return { ...input, sub_skill_slug: subSkill.slug }
}

// ─── Generate diagnostic report from all grades ───────────────────────────────

export interface DiagnosticReport {
  top_strength: string
  top_gap: string
  headline_en: string
  headline_fr: string
  sub_skill_scores: Record<string, { score: number; summary: string; evidence: string }>
  improvement_plan: string
  full_summary_en: string
  full_summary_fr: string
}

export async function generateDiagnostic(params: {
  lang: 'en' | 'fr'
  moduleName: string
  grades: GradeResult[]
  subSkillNames: Record<string, string>  // slug → name_en
}): Promise<DiagnosticReport> {
  const { moduleName, grades, subSkillNames } = params

  const gradesText = grades.map(g => `
Sub-skill: ${subSkillNames[g.sub_skill_slug] ?? g.sub_skill_slug}
Score: ${g.score}/4
Evidence: "${g.evidence_quote}"
Rationale: ${g.rationale}
Gaps: ${g.gaps.join('; ')}
Strengths: ${g.strengths.join('; ')}
`).join('\n---\n')

  const avgScore = grades.reduce((s, g) => s + g.score, 0) / grades.length
  const strongest = grades.reduce((a, b) => a.score > b.score ? a : b)
  const weakest   = grades.reduce((a, b) => a.score < b.score ? a : b)

  const res = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1500,
    system: `You are writing a diagnostic report for an Applied AI Engineer interview candidate.
Be specific, honest, and actionable. Reference the actual evidence from their answers.
Return valid JSON only — no markdown, no explanation.`,
    messages: [{
      role: 'user',
      content: `MODULE: ${moduleName}
AVERAGE SCORE: ${avgScore.toFixed(1)}/4
STRONGEST SUB-SKILL: ${subSkillNames[strongest.sub_skill_slug]} (${strongest.score}/4)
WEAKEST SUB-SKILL: ${subSkillNames[weakest.sub_skill_slug]} (${weakest.score}/4)

GRADES:
${gradesText}

Return this exact JSON:
{
  "top_strength": "<one sentence, specific to their answers>",
  "top_gap": "<one sentence, specific to their answers>",
  "headline_en": "<2-sentence summary a candidate can understand>",
  "headline_fr": "<French translation of headline_en>",
  "sub_skill_scores": {
    "<slug>": { "score": <1-4>, "summary": "<1 sentence>", "evidence": "<quote>" }
  },
  "improvement_plan": "<3-5 concrete, specific steps to improve the weakest area>",
  "full_summary_en": "<3-4 paragraph honest assessment, mentioning specific things said>",
  "full_summary_fr": "<French version of full_summary_en>"
}`
    }],
  })

  const text = res.content[0].type === 'text' ? res.content[0].text : ''
  try {
    return JSON.parse(text.replace(/```json\n?|```/g, '').trim()) as DiagnosticReport
  } catch {
    // Fallback
    return {
      top_strength: strongest.strengths[0] ?? 'Shows understanding of core concepts.',
      top_gap: weakest.gaps[0] ?? `Needs to deepen ${subSkillNames[weakest.sub_skill_slug]}.`,
      headline_en: `Average score: ${avgScore.toFixed(1)}/4. Strongest in ${subSkillNames[strongest.sub_skill_slug]}.`,
      headline_fr: `Score moyen : ${avgScore.toFixed(1)}/4. Points forts en ${subSkillNames[strongest.sub_skill_slug]}.`,
      sub_skill_scores: Object.fromEntries(grades.map(g => [
        g.sub_skill_slug,
        { score: g.score, summary: g.rationale, evidence: g.evidence_quote }
      ])),
      improvement_plan: `Focus on ${subSkillNames[weakest.sub_skill_slug]}: ${weakest.gaps.join(', ')}`,
      full_summary_en: grades.map(g => `${subSkillNames[g.sub_skill_slug]}: ${g.rationale}`).join('\n'),
      full_summary_fr: '',
    }
  }
}
