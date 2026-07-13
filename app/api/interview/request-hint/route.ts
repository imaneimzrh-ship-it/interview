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

export async function POST(req: NextRequest) {
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

  let body: { session_id: string; exercise_id: string; current_hint_level: number }
  try { body = await req.json() } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { session_id, exercise_id, current_hint_level } = body
  if (!session_id || !exercise_id || current_hint_level === undefined) {
    return NextResponse.json({ error: 'session_id, exercise_id, current_hint_level are required' }, { status: 400 })
  }

  // Fetch exercise hints
  const { data: exercise, error: exErr } = await supabase
    .from('exercises')
    .select('hints')
    .eq('id', exercise_id)
    .single()

  if (exErr || !exercise) {
    return NextResponse.json({ error: 'Exercise not found' }, { status: 404 })
  }

  const hints: { level: number; text: string }[] = exercise.hints ?? []
  if (!hints.length) {
    return NextResponse.json({ error: 'No hints available for this exercise' }, { status: 404 })
  }

  const nextLevel = current_hint_level + 1

  // Enforce sequential unlocking: can't jump to level 3 without level 2
  if (nextLevel > 1) {
    const { data: prevHint } = await supabase
      .from('hint_requests')
      .select('id')
      .eq('session_id', session_id)
      .eq('exercise_id', exercise_id)
      .eq('hint_level', nextLevel - 1)
      .maybeSingle()

    if (!prevHint) {
      return NextResponse.json({ error: `You must reveal hint ${nextLevel - 1} before unlocking hint ${nextLevel}` }, { status: 400 })
    }
  }

  const hint = hints.find(h => h.level === nextLevel)
  if (!hint) {
    return NextResponse.json({ error: 'All hints have been revealed' }, { status: 400 })
  }

  // Record hint request (unique index prevents double-counting)
  await supabase.from('hint_requests').upsert({
    session_id,
    exercise_id,
    user_id: user.id,
    hint_level: nextLevel,
  }, { onConflict: 'session_id,exercise_id,hint_level', ignoreDuplicates: true })

  return NextResponse.json({
    hint_level: nextLevel,
    hint_text: hint.text,
    hints_remaining: hints.length - nextLevel,
  })
}
