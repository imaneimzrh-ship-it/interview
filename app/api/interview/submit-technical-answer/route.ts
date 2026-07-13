import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { executeSubmission } from '@/lib/e2b/execute'
import { gradeSubmission } from '@/lib/claude/technical-grader'
import { trackServerEvent } from '@/lib/analytics'
import { v4 as uuidv4 } from 'uuid'

function serverClient(cookieStore: Awaited<ReturnType<typeof cookies>>) {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (all: { name: string; value: string; options?: Parameters<typeof cookieStore.set>[2] }[]) => { try { all.forEach(({ name, value, options }) => cookieStore.set(name, value, options)) } catch {} },
      },
    }
  )
}

const RATE_LIMIT_WINDOW_MS = 60_000
const RATE_LIMIT_MAX       = 5

export async function POST(req: NextRequest) {
  const cookieStore = await cookies()
  const supabase = serverClient(cookieStore)

  // Authenticate
  const authHeader = req.headers.get('Authorization') ?? ''
  const token = authHeader.replace('Bearer ', '')
  const { data: { user }, error: authErr } = token
    ? await supabase.auth.getUser(token)
    : await supabase.auth.getUser()

  if (authErr || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Rate limit: max 5 submissions per minute per user
  const windowStart = new Date(Date.now() - RATE_LIMIT_WINDOW_MS).toISOString()
  const { count: recentCount } = await supabase
    .from('submissions')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .gte('created_at', windowStart)

  if ((recentCount ?? 0) >= RATE_LIMIT_MAX) {
    return NextResponse.json(
      { error: 'Too many submissions. Please wait a moment before trying again.' },
      { status: 429 }
    )
  }

  let body: { session_id: string; exercise_id: string; candidate_code: string; candidate_explanation?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { session_id, exercise_id, candidate_code, candidate_explanation } = body
  if (!session_id || !exercise_id || !candidate_code) {
    return NextResponse.json({ error: 'session_id, exercise_id, candidate_code are required' }, { status: 400 })
  }

  // Guard: empty submission
  if (!candidate_code.trim()) {
    return NextResponse.json({ error: 'Submission cannot be empty.' }, { status: 400 })
  }

  // Fetch exercise — deliberately exclude reference_solution_notes from local var to avoid accidental leakage,
  // but we need it for grading. It is fetched server-side only and never forwarded in the response.
  const { data: exercise, error: exErr } = await supabase
    .from('exercises')
    .select('task_description, test_cases, reference_solution_notes, language')
    .eq('id', exercise_id)
    .single()

  if (exErr || !exercise) {
    return NextResponse.json({ error: 'Exercise not found' }, { status: 404 })
  }

  // Execute tests in E2B sandbox and measure wall-clock time
  const e2bStart = Date.now()
  const test_results = exercise.language === 'sql'
    ? { total_tests: 0, passed: 0, failed: 0, details: [], runtime_errors: ['SQL graded client-side'], overall_status: 'all_passed' as const }
    : await executeSubmission(candidate_code, exercise.test_cases, exercise.language as 'python' | 'javascript' | 'text' | 'sql')
  const e2bElapsedMs = Date.now() - e2bStart

  // Count hints used for this session+exercise (DB-authoritative, not client-supplied)
  const { count: hintsUsed } = await supabase
    .from('hint_requests')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .eq('session_id', session_id)
    .eq('exercise_id', exercise_id)

  // Grade with Claude and capture token usage
  const gradeStart = Date.now()
  const { grading: rawGrading, usage: claudeUsage } = await gradeSubmission({
    taskDescription: exercise.task_description,
    referenceSolutionNotes: exercise.reference_solution_notes,
    candidateCode: candidate_code,
    candidateExplanation: candidate_explanation ?? null,
    testResults: test_results,
  })
  const gradeElapsedMs = Date.now() - gradeStart

  // Deterministic score cap based on hints used (applied in orchestrator, not in Claude prompt)
  const hints = hintsUsed ?? 0
  let cappedScore = rawGrading.overall_score
  if (hints >= 3) cappedScore = Math.min(cappedScore, 6)
  else if (hints === 2) cappedScore = Math.min(cappedScore, 7)
  else if (hints === 1) cappedScore = Math.min(cappedScore, 9)

  const grading = { ...rawGrading, overall_score: cappedScore }

  // Cost estimates (USD) — E2B: ~$0.000014/s; Claude Sonnet 4.6: $3/M input + $15/M output
  const e2bCostUsd      = (e2bElapsedMs / 1000) * 0.000014
  const claudeInputCost = ((claudeUsage?.input_tokens  ?? 0) / 1_000_000) * 3
  const claudeOutputCost= ((claudeUsage?.output_tokens ?? 0) / 1_000_000) * 15
  const totalCostUsd    = e2bCostUsd + claudeInputCost + claudeOutputCost

  // Structured cost log — visible in Vercel Log Drain / dashboard filters
  console.log(JSON.stringify({
    event: 'submission_cost',
    user_id: user.id,
    session_id,
    exercise_id,
    e2b_elapsed_ms:    e2bElapsedMs,
    e2b_cost_usd:      +e2bCostUsd.toFixed(6),
    claude_input_tok:  claudeUsage?.input_tokens  ?? 0,
    claude_output_tok: claudeUsage?.output_tokens ?? 0,
    claude_cost_usd:   +(claudeInputCost + claudeOutputCost).toFixed(6),
    total_cost_usd:    +totalCostUsd.toFixed(6),
    pass_fail:         grading.pass_fail,
    overall_score:     grading.overall_score,
    ts: new Date().toISOString(),
  }))

  // Daily spend alert — log at error level so Vercel alerts can trigger on it
  if (totalCostUsd > 0.50) {
    console.error(`[COST_ALERT] Single submission cost $${totalCostUsd.toFixed(4)} — above $0.50 threshold`)
  }

  // Persist submission (cost metadata stored alongside results)
  const submission_id = uuidv4()
  await supabase.from('submissions').insert({
    id: submission_id,
    session_id,
    exercise_id,
    user_id: user.id,
    candidate_code,
    candidate_explanation: candidate_explanation ?? null,
    test_results,
    grading,
    hints_used: hints,
  })

  // Analytics: exercise submitted
  void trackServerEvent(supabase, {
    name: 'technical_exercise_submitted',
    user_id: user.id,
    session_id,
    exercise_id,
    overall_score: grading.overall_score,
    pass_fail: grading.pass_fail,
  })

  // Security: return only test_results and grading — never reference_solution_notes
  return NextResponse.json({ test_results, grading, submission_id, hints_used: hints })
}
