import { NextRequest, NextResponse } from 'next/server'
import { getServerUser } from '@/lib/supabase/server'
import { createClient as createSupabaseAdminClient } from '@supabase/supabase-js'

export async function GET(req: NextRequest) {
  const { user } = await getServerUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = createSupabaseAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )

  const { searchParams } = new URL(req.url)
  const pillar     = searchParams.get('pillar')
  const difficulty = searchParams.get('difficulty')
  const format     = searchParams.get('format')
  const status     = searchParams.get('status') // 'not_attempted' | 'attempted' | 'passed'

  let query = supabase
    .from('exercises')
    .select('id, title, topic_pillar, topic_tags, difficulty, format, grading_mode')
    .order('topic_pillar')
    .order('difficulty')

  if (pillar)     query = query.eq('topic_pillar', pillar)
  if (difficulty) query = query.eq('difficulty', difficulty)
  if (format)     query = query.eq('format', format)

  const { data: exercises, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Fetch this user's passed exercise IDs for user_status enrichment
  const { data: passedRows } = await supabase
    .from('submissions')
    .select('exercise_id, grading')
    .eq('user_id', user.id)

  const passedIds = new Set<string>()
  const attemptedIds = new Set<string>()
  for (const row of passedRows ?? []) {
    attemptedIds.add(row.exercise_id)
    const pf = (row.grading as { pass_fail?: string } | null)?.pass_fail
    if (pf === 'pass') passedIds.add(row.exercise_id)
  }

  let enriched = (exercises ?? []).map(ex => ({
    ...ex,
    user_status: passedIds.has(ex.id)
      ? 'passed'
      : attemptedIds.has(ex.id)
        ? 'attempted'
        : 'not_attempted',
  }))

  // Filter by status after enrichment
  if (status) enriched = enriched.filter(ex => ex.user_status === status)

  return NextResponse.json(enriched)
}
