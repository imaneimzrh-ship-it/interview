import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })

export interface RubricCriterion {
  name: string
  description: string
}

export interface RubricGradingResult {
  scores: Record<string, number>
  overall_score: number
  pass_fail: 'pass' | 'borderline' | 'fail'
  summary_feedback: string
  strengths: string[]
  gaps: string[]
  next_steps: string
}

const SYSTEM_PROMPT = `You are a senior technical interviewer grading a candidate's open-ended response for an AI/LLM Engineer role.

The response may be a system design answer, an agent architecture proposal, an evaluation strategy write-up, or a prompt engineering rationale — not code.

You will receive the task description, the grading rubric (named criteria with descriptions), and the candidate's written response.

Return ONLY valid JSON. No text outside the JSON. No markdown fences.

{
  "scores": { "<criterion_name>": <integer 0-10> },
  "overall_score": <integer 0-10>,
  "pass_fail": "pass" | "borderline" | "fail",
  "summary_feedback": "<2-3 sentences written directly to the candidate>",
  "strengths": ["<specific thing done well — tied to rubric criteria>"],
  "gaps": ["<specific thing missing or weak — name which criterion it relates to>"],
  "next_steps": "<one concrete thing to practice next>"
}

Scoring rules:
- Score each rubric criterion independently based on its description
- overall_score = average of all criterion scores, rounded to nearest integer
- pass_fail: overall_score >= 7 → "pass"; 5-6 → "borderline"; ≤ 4 → "fail"
- Be specific in gaps — name the rubric criterion each gap relates to
- strengths must be concrete observations from the response, not generic praise
- Calibrate to FAANG/top AI-lab standards: a 7+ should genuinely satisfy an experienced interviewer`

export async function gradeRubricSubmission(params: {
  taskDescription: string
  rubricCriteria: RubricCriterion[]
  candidateResponse: string
}): Promise<{ grading: RubricGradingResult; usage: { input_tokens: number; output_tokens: number } | null }> {
  const { taskDescription, rubricCriteria, candidateResponse } = params

  const userPrompt = `TASK DESCRIPTION:
${taskDescription}

GRADING RUBRIC:
${rubricCriteria.map(c => `- ${c.name}: ${c.description}`).join('\n')}

CANDIDATE'S RESPONSE:
${candidateResponse}

Grade this submission per the schema and guidelines in your system prompt. Return only the JSON object.`

  let lastUsage: { input_tokens: number; output_tokens: number } | null = null

  async function attempt(temperature: number): Promise<RubricGradingResult | null> {
    const msg = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      temperature,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userPrompt }],
    })
    lastUsage = msg.usage
    const raw = msg.content.find(b => b.type === 'text')?.text ?? ''
    const jsonMatch = raw.match(/\{[\s\S]*\}/)
    if (!jsonMatch) return null
    const parsed = JSON.parse(jsonMatch[0])
    if (typeof parsed.overall_score !== 'number' || !parsed.scores) return null
    const overall = parsed.overall_score
    return {
      scores: parsed.scores,
      overall_score: overall,
      pass_fail: parsed.pass_fail ?? (overall >= 7 ? 'pass' : overall >= 5 ? 'borderline' : 'fail'),
      summary_feedback: parsed.summary_feedback ?? '',
      strengths: Array.isArray(parsed.strengths) ? parsed.strengths : [],
      gaps: Array.isArray(parsed.gaps) ? parsed.gaps : [],
      next_steps: parsed.next_steps ?? '',
    }
  }

  try {
    const result = await attempt(0.1)
    if (result) return { grading: result, usage: lastUsage }
    const retry = await attempt(0.3)
    if (retry) return { grading: retry, usage: lastUsage }
  } catch (err) {
    console.error('[rubric-grader] Claude error:', err)
  }

  // Fallback neutral grading if Claude fails
  const neutralScores: Record<string, number> = {}
  for (const c of rubricCriteria) neutralScores[c.name] = 5
  return {
    grading: {
      scores: neutralScores,
      overall_score: 5,
      pass_fail: 'borderline',
      summary_feedback: 'Grading service temporarily unavailable. Your response has been saved.',
      strengths: [],
      gaps: [],
      next_steps: 'Please try submitting again.',
    },
    usage: lastUsage,
  }
}
