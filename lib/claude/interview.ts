import Anthropic from '@anthropic-ai/sdk'
import type { Question } from '@/lib/questions/bank'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })

export interface Msg { role: 'user' | 'assistant'; content: string }

// ─── Company-specific interviewer persona ────────────────────────────────────
function persona(company: string): string {
  const p: Record<string, string> = {
    anthropic: 'You are a senior AI engineer at Anthropic. You care deeply about safety, epistemic honesty, and intellectual rigor. You ask "what could go wrong?" reflexively. You push back on vague answers.',
    openai: 'You are a senior engineer at OpenAI. You think primarily about shipping and production scale. "What have you shipped?" and "how does this work at 10M requests/day?" are your default probes.',
    google_deepmind: 'You are a senior researcher at Google DeepMind. You expect mathematical depth and the ability to discuss recent papers. Strong theoretical foundations are assumed.',
    default: 'You are a rigorous technical interviewer at a top AI company. You push back on vague answers, ask for specifics, and probe weak spots.',
  }
  return p[company] ?? p.default
}

// ─── Build system prompt ─────────────────────────────────────────────────────
function buildSystem(question: Question, qNum: number, qTotal: number, company: string): string {
  const must = question.expectedComponents.filter(c => c.weight === 'must_have').map(c => `- ${c.component}`).join('\n')
  const strong = question.expectedComponents.filter(c => c.weight === 'strong').map(c => `- ${c.component}`).join('\n')
  const weak = question.weakSignals.map(s => `- ${s}`).join('\n')
  const probes = question.followUps.map(q => `- "${q}"`).join('\n')

  return `${persona(company)}

You are conducting question ${qNum} of ${qTotal} in a mock interview.

CURRENT QUESTION: "${question.question}"

WHAT A STRONG ANSWER INCLUDES (probe for these — do NOT reveal the list):
Must have:
${must}
Strong to have:
${strong}

WEAK ANSWER SIGNALS (probe harder if you see these):
${weak}

PREPARED FOLLOW-UPS (use when candidate misses a key component):
${probes}

RULES — read carefully:
1. Ask the current question first. Nothing else on the first turn.
2. After their answer, ask ONE follow-up based on what they missed. ONE. Not two.
3. Keep your messages SHORT — 2-4 sentences max. Real interviewers are brief.
4. Push back when answers are vague: "Can you be more specific?" or "What exactly would you do there?"
5. NEVER give hints. NEVER reveal the expected components list. Probe, do not teach.
6. NEVER compliment answers generically. If it is right, move on.
7. After 2-3 exchanges (you have enough signal), say EXACTLY: "Understood. Let's move to the next question."
8. On the FINAL question (${qNum} === ${qTotal}), end with: "That's all the questions I have. Thank you for your time today."
9. NEVER break character.`
}

// ─── Send a message ──────────────────────────────────────────────────────────
export async function sendMessage(
  question: Question,
  qNum: number,
  qTotal: number,
  company: string,
  history: Msg[],
  userMessage: string,
): Promise<string> {
  const messages: Anthropic.MessageParam[] = [
    ...history.map(m => ({ role: m.role as 'user' | 'assistant', content: m.content })),
    { role: 'user', content: userMessage },
  ]

  const res = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 350,
    system: buildSystem(question, qNum, qTotal, company),
    messages,
  })

  return res.content[0].type === 'text' ? res.content[0].text : ''
}

// ─── Open the interview (get first question message) ─────────────────────────
export async function openInterview(question: Question, qNum: number, qTotal: number, company: string): Promise<string> {
  const res = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 200,
    system: buildSystem(question, qNum, qTotal, company),
    messages: [{ role: 'user', content: 'Please begin the interview.' }],
  })
  return res.content[0].type === 'text' ? res.content[0].text : ''
}

// ─── Score the session ───────────────────────────────────────────────────────
export async function scoreSession(
  role: string, company: string, isAiRole: boolean,
  transcript: string, questionsAsked: string[],
): Promise<Record<string, unknown>> {
  const companyBar = company === 'anthropic'
    ? 'Anthropic values safety thinking, epistemic honesty, and intellectual rigor above all.'
    : company === 'openai'
    ? 'OpenAI values shipping mentality, production experience, and cost/scale thinking.'
    : 'Standard bar: technical correctness, production thinking, clear communication.'

  const res = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1200,
    system: `You are an expert technical interview evaluator. Score honestly and calibrate carefully.
${companyBar}
Calibration: 70 = solid candidate, 80 = strong hire, 90+ = exceptional (rare). Be rigorous.
Return ONLY valid JSON — no markdown, no explanation, no backticks.`,
    messages: [{
      role: 'user', content: `ROLE: ${role} | COMPANY: ${company || 'general'}
QUESTIONS ASKED: ${questionsAsked.join('; ')}

FULL TRANSCRIPT:
${transcript}

Return this exact JSON:
{
  "overall": <0-100>,
  "clarity": <0-100>,
  "depth": <0-100>,
  "structure": <0-100>,
  "examples": <0-100>,
  ${isAiRole ? '"technical": <0-100>,' : ''}
  "hire_decision": "<strong_yes|yes|lean_yes|lean_no|no|strong_no>",
  "summary": "<2-3 sentence honest assessment>",
  "strengths": ["<specific strength 1>", "<specific strength 2>", "<specific strength 3>"],
  "gaps": ["<specific gap 1>", "<specific gap 2>", "<specific gap 3>"],
  "next_steps": "<one concrete thing to study before the next session>"
}`,
    }],
  })

  const text = res.content[0].type === 'text' ? res.content[0].text : '{}'
  try { return JSON.parse(text.replace(/```json\n?|```/g, '').trim()) }
  catch { return { overall: 0, summary: 'Scoring failed. Please try again.', strengths: [], gaps: [], next_steps: '' } }
}

// ─── Signal helpers ──────────────────────────────────────────────────────────
export function shouldAdvance(text: string): boolean {
  return text.toLowerCase().includes("next question")
}

export function isComplete(text: string): boolean {
  return text.toLowerCase().includes("thank you for your time")
    || text.toLowerCase().includes("that's all the questions")
}
