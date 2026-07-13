import Anthropic from '@anthropic-ai/sdk'
import type { TestResults } from '@/lib/e2b/execute'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })

export interface GradingResult {
  correctness_score: number
  code_quality_score: number
  efficiency_score: number
  problem_solving_score: number
  edge_case_score: number
  overall_score: number
  pass_fail: 'pass' | 'borderline' | 'fail'
  root_cause_identified: boolean | null
  summary_feedback: string
  line_notes: { issue: string; severity: 'minor' | 'major' | 'critical'; suggestion: string }[]
  strengths: string[]
  next_steps: string
}

const SYSTEM_PROMPT = `You are a senior technical interviewer grading a candidate's response to a hands-on coding/technical exercise for an AI/LLM Engineer role. You are strict but fair, matching the standard of a FAANG or top AI-lab technical interview.

You will receive:
1. The original task description
2. The candidate's submitted code/answer
3. Test execution results (pass/fail per test case, any runtime errors)
4. The candidate's explanation (if provided)

Return ONLY valid JSON matching this schema. No text outside the JSON. No markdown fences.

{
  "correctness_score": <integer 0-10>,
  "code_quality_score": <integer 0-10>,
  "efficiency_score": <integer 0-10>,
  "problem_solving_score": <integer 0-10>,
  "edge_case_score": <integer 0-10>,
  "overall_score": <integer 0-10>,
  "pass_fail": "pass" | "borderline" | "fail",
  "root_cause_identified": true | false | null,
  "summary_feedback": "<2-3 sentences, written directly to the candidate>",
  "line_notes": [
    {"issue": "<short description>", "severity": "minor" | "major" | "critical", "suggestion": "<concrete fix>"}
  ],
  "strengths": ["<specific thing done well>"],
  "next_steps": "<one concrete thing to practice next>"
}

SCORING GUIDELINES:
- correctness_score: based strictly on test pass rate.
- code_quality_score: naming, structure, readability vs industry standard.
- efficiency_score: time/space complexity appropriateness; default 8 if not applicable.
- problem_solving_score: judged from candidate's explanation — did they identify root cause or just patch symptoms.
- edge_case_score: based on edge-case test results and code's handling of boundary conditions.
- overall_score: weighted average — correctness 40%, code_quality 20%, efficiency 15%, problem_solving 15%, edge_case 10%.
- pass_fail: "pass" if overall_score >= 7, "borderline" if 5-6, "fail" if below 5.

Be specific in line_notes — reference actual variable/function names from the submission. Never fabricate issues not present in the code.`

function validateGrading(obj: unknown): obj is GradingResult {
  if (!obj || typeof obj !== 'object') return false
  const o = obj as Record<string, unknown>
  const numFields = ['correctness_score','code_quality_score','efficiency_score','problem_solving_score','edge_case_score','overall_score']
  for (const f of numFields) if (typeof o[f] !== 'number') return false
  if (!['pass','borderline','fail'].includes(o.pass_fail as string)) return false
  if (typeof o.summary_feedback !== 'string') return false
  if (!Array.isArray(o.line_notes)) return false
  if (!Array.isArray(o.strengths)) return false
  if (typeof o.next_steps !== 'string') return false
  return true
}

export async function gradeSubmission(params: {
  taskDescription: string
  referenceSolutionNotes: string
  candidateCode: string
  candidateExplanation: string | null
  testResults: TestResults
}): Promise<GradingResult> {
  const { taskDescription, referenceSolutionNotes, candidateCode, candidateExplanation, testResults } = params

  const userPrompt = `TASK DESCRIPTION:
${taskDescription}

REFERENCE SOLUTION NOTES (grading reference only, never shown to candidate):
${referenceSolutionNotes}

CANDIDATE'S SUBMITTED CODE:
${candidateCode}

CANDIDATE'S EXPLANATION:
${candidateExplanation ?? '(none provided)'}

TEST EXECUTION RESULTS:
${JSON.stringify(testResults, null, 2)}

Grade this submission per the schema and guidelines in your system prompt. Return only the JSON object.`

  async function attempt(temperature: number): Promise<GradingResult | null> {
    const res = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1500,
      temperature,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userPrompt }],
    })

    const text = res.content[0].type === 'text' ? res.content[0].text : ''
    const clean = text.replace(/```json\n?|```/g, '').trim()
    try {
      const parsed = JSON.parse(clean)
      return validateGrading(parsed) ? parsed : null
    } catch {
      return null
    }
  }

  let result = await attempt(0.1)
  if (!result) result = await attempt(0)

  // Fallback: compute mechanically from test pass rate
  if (!result) {
    const passRate = testResults.total_tests > 0 ? testResults.passed / testResults.total_tests : 0
    const correctness = Math.round(passRate * 10)
    const overall = Math.round(correctness * 0.4 + 7 * 0.6)
    result = {
      correctness_score: correctness,
      code_quality_score: 7,
      efficiency_score: 8,
      problem_solving_score: 6,
      edge_case_score: correctness,
      overall_score: overall,
      pass_fail: overall >= 7 ? 'pass' : overall >= 5 ? 'borderline' : 'fail',
      root_cause_identified: null,
      summary_feedback: `${testResults.passed}/${testResults.total_tests} tests passed. Manual review recommended.`,
      line_notes: [],
      strengths: [],
      next_steps: 'Review the failing test cases and debug your solution.',
    }
  }

  // Flag divergent grading for manual review
  const { correctness_score, problem_solving_score, pass_fail } = result
  if (
    Math.abs(correctness_score - problem_solving_score) >= 4 ||
    pass_fail === 'borderline'
  ) {
    console.warn('[technical-grader] flagged for review:', {
      correctness_score,
      problem_solving_score,
      pass_fail,
      overall: result.overall_score,
    })
  }

  return result
}
