import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { executeSubmission } from '@/lib/e2b/execute'
import { gradeSubmission } from '@/lib/claude/technical-grader'
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

  // 1. Fetch exercise
  const { data: exercise, error: exErr } = await supabase
    .from('exercises')
    .select('task_description, test_cases, reference_solution_notes, language')
    .eq('id', exercise_id)
    .single()

  if (exErr || !exercise) {
    return NextResponse.json({ error: 'Exercise not found' }, { status: 404 })
  }

  // 2. Execute tests (skip E2B for SQL — handled client-side)
  const test_results = exercise.language === 'sql'
    ? { total_tests: 0, passed: 0, failed: 0, details: [], runtime_errors: ['SQL graded client-side'] }
    : await executeSubmission(candidate_code, exercise.test_cases, exercise.language as 'python' | 'javascript' | 'text' | 'sql')

  // 3. Grade with Claude
  const grading = await gradeSubmission({
    taskDescription: exercise.task_description,
    referenceSolutionNotes: exercise.reference_solution_notes,
    candidateCode: candidate_code,
    candidateExplanation: candidate_explanation ?? null,
    testResults: test_results,
  })

  // 4. Persist submission
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
  })

  return NextResponse.json({ test_results, grading, submission_id })
}
