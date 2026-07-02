import Anthropic from '@anthropic-ai/sdk'
import type { Question } from '@/lib/questions/bank'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })

export interface ChatMessage { role: 'user' | 'assistant'; content: string }

// ─── Interviewer system prompt ────────────────────────────────────────────────
function interviewerPrompt(question: Question, company: string, role: string, qNum: number, total: number): string {
  const companyStyle: Record<string, string> = {
    anthropic: `You are a senior AI engineer at Anthropic with 3+ years experience. You are methodical, safety-conscious, and ask "what could go wrong?" naturally. You push hard on specifics. You expect epistemic honesty — "I'm not certain but here's my reasoning" is better than a confident wrong answer.`,
    openai:    `You are a senior engineer at OpenAI. You think primarily about shipping. You want to know if this person can get something into production. "How would this work at 10 million requests per day?" is your natural follow-up. You are direct and efficient.`,
    google_deepmind: `You are a research engineer at Google DeepMind. You expect deep technical foundations. Paper discussions are normal. You ask "why does this work mathematically?" You value both theory and practical application.`,
    default:   `You are an experienced technical interviewer at a leading AI company. You are rigorous, professional, and push back on vague answers.`,
  }

  const components = question.expectedComponents
    .filter(c => c.weight === 'must_have' || c.weight === 'strong')
    .map(c => `- ${c.component}`)
    .join('\n')

  const signals = question.weakSignals.slice(0, 3).map(s => `- ${s}`).join('\n')
  const followUps = question.followUps.slice(0, 3).map(q => `- "${q}"`).join('\n')

  return `${companyStyle[company] ?? companyStyle.default}

You are conducting a real interview for a ${role.replace(/_/g, ' ')} position.

CURRENT QUESTION (${qNum} of ${total}):
"${question.question}"

WHAT A STRONG ANSWER MUST INCLUDE (use this to know what to probe for):
${components}

WHAT WEAK ANSWERS LOOK LIKE (probe harder if you see these):
${signals}

PREPARED FOLLOW-UP QUESTIONS (use when candidate misses a component):
${followUps}

RULES — follow these exactly:
1. Ask the current question first and nothing else.
2. After their answer, choose ONE follow-up targeting their weakest point. Ask only that one.
3. Keep your messages SHORT — 2-4 sentences maximum. Real interviewers are brief.
4. Push back when answers are vague: "Can you be more specific?" or "What exactly would you do there?"
5. Do NOT give hints, teach, or reveal what they missed.
6. Do NOT say "Great answer!" or give generic praise. Stay neutral.
7. After 2-3 exchanges where you have enough signal, say EXACTLY: "Got it. Let's move to the next question."
8. If this is question ${total} of ${total} and you have enough signal, say EXACTLY: "That's all my questions. Thank you for your time today."
9. NEVER break character. You are the interviewer.

Start now by asking the question.`
}

// ─── Conduct interview exchange ───────────────────────────────────────────────
export async function conductInterview(
  question: Question,
  company: string,
  role: string,
  questionNumber: number,
  totalQuestions: number,
  history: ChatMessage[],
  userMessage: string,
): Promise<{ response: string; shouldAdvance: boolean; isComplete: boolean }> {
  const messages: Anthropic.MessageParam[] = [
    ...history.map(m => ({ role: m.role as 'user' | 'assistant', content: m.content })),
    { role: 'user', content: userMessage },
  ]

  const res = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 350,
    system: interviewerPrompt(question, company, role, questionNumber, totalQuestions),
    messages,
  })

  const text = res.content[0].type === 'text' ? res.content[0].text : ''

  return {
    response: text,
    shouldAdvance: text.includes("Let's move to the next question") || text.includes("next question"),
    isComplete:    text.includes("That's all my questions") || text.includes("Thank you for your time today"),
  }
}

// ─── Start interview (first question) ────────────────────────────────────────
export async function startInterview(
  question: Question,
  company: string,
  role: string,
  totalQuestions: number,
): Promise<string> {
  const res = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 200,
    system: interviewerPrompt(question, company, role, 1, totalQuestions),
    messages: [{ role: 'user', content: 'Please begin the interview.' }],
  })
  return res.content[0].type === 'text' ? res.content[0].text : ''
}

// ─── Grade session ────────────────────────────────────────────────────────────
export async function gradeSession(
  role: string,
  company: string,
  messages: ChatMessage[],
  questions: Question[],
): Promise<{
  overall: number; clarity: number; depth: number; structure: number;
  technical: number; production: number;
  summary: string; strengths: string[]; improvements: string[]; nextSteps: string;
  hireDecision: string;
}> {
  const transcript = messages
    .map(m => `${m.role === 'user' ? 'CANDIDATE' : 'INTERVIEWER'}: ${m.content}`)
    .join('\n\n')

  const qs = questions.map((q, i) => `${i + 1}. [${q.category}] ${q.question}`).join('\n')

  const res = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1200,
    system: `You are an expert AI engineering interview evaluator. Grade this session honestly and specifically. A score of 70 is good, 80 is strong, 90+ is rare. Be rigorous. Return ONLY valid JSON, no markdown.`,
    messages: [{
      role: 'user',
      content: `ROLE: ${role.replace(/_/g, ' ')} | COMPANY: ${company}

QUESTIONS ASKED:
${qs}

FULL TRANSCRIPT:
${transcript}

Return exactly this JSON:
{
  "overall": <0-100>,
  "clarity": <0-100>,
  "depth": <0-100>,
  "structure": <0-100>,
  "technical": <0-100>,
  "production": <0-100>,
  "hireDecision": "<strong_yes|yes|lean_yes|lean_no|no|strong_no>",
  "summary": "<2-3 sentence honest assessment specific to this session>",
  "strengths": ["<specific strength 1>", "<specific strength 2>", "<specific strength 3>"],
  "improvements": ["<specific improvement 1>", "<specific improvement 2>", "<specific improvement 3>"],
  "nextSteps": "<one concrete action: specific resource or practice area to study>"
}`,
    }],
  })

  const text = res.content[0].type === 'text' ? res.content[0].text : '{}'
  return JSON.parse(text.replace(/```json\n?|```/g, '').trim())
}
