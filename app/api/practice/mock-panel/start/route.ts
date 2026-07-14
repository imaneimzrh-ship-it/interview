import { NextRequest, NextResponse } from 'next/server'
import { getServerUser } from '@/lib/supabase/server'
import { createClient as createSupabaseAdminClient } from '@supabase/supabase-js'
import { CreditService } from '@/lib/credits'
import { v4 as uuidv4 } from 'uuid'

export async function POST(req: NextRequest) {
  const { user } = await getServerUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = createSupabaseAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )

  // Credit gate: Pro-only, costs 3 credits
  const creditResult = await CreditService.checkAndDeductCredits(supabase, user.id, 'mock_panel_session', { requirePro: true })
  if (!creditResult.ok) {
    return NextResponse.json({ ...creditResult.body, upgrade: true }, { status: creditResult.status })
  }

  let body: { loop_slug: string }
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }) }
  const { loop_slug } = body
  if (!loop_slug) return NextResponse.json({ error: 'loop_slug is required' }, { status: 400 })

  // Fetch loop definition
  const { data: loop, error: loopErr } = await supabase
    .from('mock_panel_loops')
    .select('*')
    .eq('slug', loop_slug)
    .single()
  if (loopErr || !loop) return NextResponse.json({ error: 'Loop not found' }, { status: 404 })

  // Fetch user weak topics — lowest avg_score with enough attempts
  const { data: topicPerf } = await supabase
    .from('user_topic_performance')
    .select('topic_pillar, topic_tag, avg_score, attempts_count')
    .eq('user_id', user.id)
    .gte('attempts_count', 1)
    .order('avg_score', { ascending: true })
    .limit(5)

  const weakTopics = (topicPerf ?? [])
    .filter(t => (t.avg_score ?? 10) < 7)
    .slice(0, 2)
    .map(t => `${t.topic_pillar}.${t.topic_tag}`)

  // Adaptive exercise selection: 40% weak topics, 60% general
  let selectedExerciseIds: string[] = []

  if (weakTopics.length > 0 && (loop.rounds as string[]).includes('technical_coding')) {
    const weakPillars = [...new Set(weakTopics.map(t => t.split('.')[0]))]

    const { data: weakExercises } = await supabase
      .from('exercises')
      .select('id')
      .in('topic_pillar', weakPillars)
      .eq('format', 'code')
      .limit(3)

    const { data: generalExercises } = await supabase
      .from('exercises')
      .select('id')
      .not('topic_pillar', 'in', `(${weakPillars.join(',')})`)
      .eq('format', 'code')
      .limit(5)

    const weakIds = (weakExercises ?? []).map(e => e.id)
    const generalIds = (generalExercises ?? []).map(e => e.id)

    const weakCount = Math.max(1, Math.floor(weakIds.length * 0.4))
    selectedExerciseIds = [
      ...weakIds.slice(0, weakCount),
      ...generalIds.slice(0, Math.max(1, 3 - weakCount)),
    ]
  }

  // Create interview session
  const session_id = uuidv4()
  const { error: sessionErr } = await supabase.from('interview_sessions').insert({
    id: session_id,
    user_id: user.id,
    loop_slug,
    rounds: loop.rounds,
    weak_topics_used: weakTopics,
    status: 'active',
    created_at: new Date().toISOString(),
  })

  if (sessionErr) {
    // Try without loop-specific columns if schema doesn't have them yet
    const { error: fallbackErr } = await supabase.from('interview_sessions').insert({
      id: session_id,
      user_id: user.id,
      status: 'active',
      created_at: new Date().toISOString(),
    })
    if (fallbackErr) {
      console.error('[mock-panel/start] session insert error:', fallbackErr)
      return NextResponse.json({ error: 'Failed to create session' }, { status: 500 })
    }
  }

  return NextResponse.json({
    session_id,
    weak_topics_used: weakTopics,
    suggested_exercise_ids: selectedExerciseIds,
    first_round: (loop.rounds as string[])[0] ?? null,
  })
}
