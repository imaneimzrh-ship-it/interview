import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

function serverClient(cookieStore: Awaited<ReturnType<typeof cookies>>) {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (all: { name: string; value: string; options?: Parameters<typeof cookieStore.set>[2] }[]) => {
          try { all.forEach(({ name, value, options }) => cookieStore.set(name, value, options)) } catch {}
        },
      },
    }
  )
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const cookieStore = await cookies()
  const supabase = serverClient(cookieStore)

  const authHeader = req.headers.get('Authorization') ?? ''
  const token = authHeader.replace('Bearer ', '')
  const { data: { user }, error: authErr } = token
    ? await supabase.auth.getUser(token)
    : await supabase.auth.getUser()

  if (authErr || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id: exercise_id } = await params
  const session_id = req.nextUrl.searchParams.get('session_id')

  if (!session_id) {
    return NextResponse.json({ error: 'session_id query param required' }, { status: 400 })
  }

  // Gate: user must have submitted at least once for this session + exercise
  const { count } = await supabase
    .from('submissions')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .eq('session_id', session_id)
    .eq('exercise_id', exercise_id)

  if ((count ?? 0) === 0) {
    return NextResponse.json(
      { error: 'You must submit at least one attempt before viewing the full solution' },
      { status: 403 }
    )
  }

  const { data: exercise, error: exErr } = await supabase
    .from('exercises')
    .select('full_solution_code, concept_explanation, language')
    .eq('id', exercise_id)
    .single()

  if (exErr || !exercise) {
    return NextResponse.json({ error: 'Exercise not found' }, { status: 404 })
  }

  if (!exercise.full_solution_code) {
    return NextResponse.json({ error: 'Full solution not yet available for this exercise' }, { status: 404 })
  }

  return NextResponse.json({
    full_solution_code: exercise.full_solution_code,
    concept_explanation: exercise.concept_explanation ?? null,
    language: exercise.language,
  })
}
