import { NextRequest, NextResponse } from 'next/server'
import { createClient as createSupabaseAdminClient } from '@supabase/supabase-js'
import { executeSubmission } from '@/lib/e2b/execute'
import { gradeSubmission } from '@/lib/claude/technical-grader'
import { gradeRubricSubmission, type RubricCriterion } from '@/lib/claude/rubric-grader'
import { trackServerEvent } from '@/lib/analytics'
import { getServerUser } from '@/lib/supabase/server'
import { CreditService } from '@/lib/credits'
import { PRO_ONLY_PILLARS } from '@/config/plans'
import { v4 as uuidv4 } from 'uuid'

// Service role client — bypasses RLS for server-side writes (submissions, topic performance)
function adminClient() {
  return createSupabaseAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

const RATE_LIMIT_WINDOW_MS = 60_000
const RATE_LIMIT_MAX       = 5

export async function POST(req: NextRequest) {
  const supabase = adminClient()
  const { user } = await getServerUser(req)

  if (!user) {
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

  let body: {
    session_id?: string
    exercise_id: string
    candidate_code?: string
    written_response?: string
    candidate_explanation?: string
  }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { session_id, exercise_id, candidate_code, written_response, candidate_explanation } = body
  if (!exercise_id || (!candidate_code && !written_response)) {
    return NextResponse.json({ error: 'exercise_id and either candidate_code or written_response are required' }, { status: 400 })
  }

  const submissionText = candidate_code ?? written_response ?? ''
  if (!submissionText.trim()) {
    return NextResponse.json({ error: 'Submission cannot be empty.' }, { status: 400 })
  }

  // Fetch exercise — reference_solution_notes fetched server-side only, never forwarded in response
  const { data: exercise, error: exErr } = await supabase
    .from('exercises')
    .select('task_description, test_cases, reference_solution_notes, language, grading_mode, rubric_criteria, topic_pillar, topic_tags')
    .eq('id', exercise_id)
    .single()

  if (exErr || !exercise) {
    return NextResponse.json({ error: 'Exercise not found' }, { status: 404 })
  }

  // Credit gate for standalone practice hub submissions (no session_id = not inside an interview session).
  // Pro-only topic pillars are also enforced here as a backstop.
  const isStandalonePractice = !session_id
  if (isStandalonePractice) {
    const isPillarProOnly = PRO_ONLY_PILLARS.includes(exercise.topic_pillar as typeof PRO_ONLY_PILLARS[number])
    const creditResult = await CreditService.checkAndDeductCredits(
      supabase, user.id, 'practice_exercise',
      isPillarProOnly ? { requirePro: true } : undefined,
    )
    if (!creditResult.ok) {
      return NextResponse.json({ ...creditResult.body, upgrade: true }, { status: creditResult.status })
    }
  }

  const isRubric = exercise.grading_mode === 'rubric'

  // ── E2B execution (test_cases mode only) ─────────────────────────────────
  const e2bStart = Date.now()
  const test_results = isRubric
    ? null
    : exercise.language === 'sql'
      ? { total_tests: 0, passed: 0, failed: 0, details: [], runtime_errors: ['SQL graded client-side'], overall_status: 'all_passed' as const }
      : await executeSubmission(submissionText, exercise.test_cases, exercise.language as 'python' | 'javascript' | 'text' | 'sql')
  const e2bElapsedMs = Date.now() - e2bStart

  // ── Hints count (only relevant for test_cases exercises in a session) ────
  const hints = session_id
    ? (await supabase
        .from('hint_requests')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('session_id', session_id)
        .eq('exercise_id', exercise_id)
      ).count ?? 0
    : 0

  // ── Grade ─────────────────────────────────────────────────────────────────
  const gradeStart = Date.now()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let rawGrading: any
  let claudeUsage: { input_tokens: number; output_tokens: number } | null = null

  if (isRubric) {
    const criteria: RubricCriterion[] = Array.isArray(exercise.rubric_criteria) ? exercise.rubric_criteria : []
    const result = await gradeRubricSubmission({
      taskDescription: exercise.task_description,
      rubricCriteria: criteria,
      candidateResponse: submissionText,
    })
    rawGrading = result.grading
    claudeUsage = result.usage
  } else {
    const result = await gradeSubmission({
      taskDescription: exercise.task_description,
      referenceSolutionNotes: exercise.reference_solution_notes,
      candidateCode: submissionText,
      candidateExplanation: candidate_explanation ?? null,
      testResults: test_results!,
    })
    rawGrading = result.grading
    claudeUsage = result.usage
  }
  const gradeElapsedMs = Date.now() - gradeStart

  // Score cap from hints (only for test_cases exercises)
  let cappedScore = rawGrading.overall_score
  if (!isRubric) {
    if (hints >= 3) cappedScore = Math.min(cappedScore, 6)
    else if (hints === 2) cappedScore = Math.min(cappedScore, 7)
    else if (hints === 1) cappedScore = Math.min(cappedScore, 9)
  }
  const grading = { ...rawGrading, overall_score: cappedScore }

  // ── Cost logging ──────────────────────────────────────────────────────────
  const e2bCostUsd       = (e2bElapsedMs / 1000) * 0.000014
  const claudeInputCost  = ((claudeUsage?.input_tokens  ?? 0) / 1_000_000) * 3
  const claudeOutputCost = ((claudeUsage?.output_tokens ?? 0) / 1_000_000) * 15
  const totalCostUsd     = e2bCostUsd + claudeInputCost + claudeOutputCost

  console.log(JSON.stringify({
    event: 'submission_cost',
    grading_mode: exercise.grading_mode,
    user_id: user.id,
    session_id: session_id ?? null,
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

  if (totalCostUsd > 0.50) {
    console.error(`[COST_ALERT] Single submission cost $${totalCostUsd.toFixed(4)} — above $0.50 threshold`)
  }

  // ── Persist submission ────────────────────────────────────────────────────
  const submission_id = uuidv4()
  await supabase.from('submissions').insert({
    id: submission_id,
    session_id: session_id ?? null,
    exercise_id,
    user_id: user.id,
    candidate_code: submissionText,
    candidate_explanation: candidate_explanation ?? null,
    test_results,
    grading,
    hints_used: hints,
  })

  // ── Update user_topic_performance (weighted running average) ─────────────
  const topicTags: string[] = Array.isArray(exercise.topic_tags) ? exercise.topic_tags : []
  const tagsToTrack = [exercise.topic_pillar, ...topicTags]
  for (const tag of tagsToTrack) {
    try {
      const { data: existing } = await supabase
        .from('user_topic_performance')
        .select('avg_score, attempts_count')
        .eq('user_id', user.id)
        .eq('topic_pillar', exercise.topic_pillar)
        .eq('topic_tag', tag)
        .maybeSingle()

      const prevAttempts = existing?.attempts_count ?? 0
      const newAttempts = prevAttempts + 1
      const newAvg = existing
        ? ((Number(existing.avg_score) * prevAttempts) + grading.overall_score) / newAttempts
        : grading.overall_score

      await supabase.from('user_topic_performance').upsert(
        {
          user_id: user.id,
          topic_pillar: exercise.topic_pillar,
          topic_tag: tag,
          avg_score: +newAvg.toFixed(2),
          attempts_count: newAttempts,
          last_updated: new Date().toISOString(),
        },
        { onConflict: 'user_id,topic_pillar,topic_tag' }
      )
    } catch (err) {
      console.error('[topic_performance] upsert failed for tag', tag, err)
    }
  }

  // ── Analytics ─────────────────────────────────────────────────────────────
  void trackServerEvent(supabase, {
    name: 'technical_exercise_submitted',
    user_id: user.id,
    session_id: session_id ?? 'standalone',
    exercise_id,
    overall_score: grading.overall_score,
    pass_fail: grading.pass_fail,
  })

  // Security: never return reference_solution_notes
  return NextResponse.json({ test_results, grading, submission_id, hints_used: hints })
}
