import { NextRequest, NextResponse } from 'next/server'
import { adminClient } from '@/lib/supabase/admin'
import { getServerUser } from '@/lib/supabase/server'

// GET /api/reports/:id/upvote — returns whether the current user has upvoted
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user } = await getServerUser(req)
  if (!user) return NextResponse.json({ upvoted: false })

  const { id } = await params
  const sb = adminClient()

  const { data } = await sb
    .from('report_upvotes')
    .select('id')
    .eq('report_id', id)
    .eq('user_id', user.id)
    .maybeSingle()

  return NextResponse.json({ upvoted: !!data })
}

// POST /api/reports/:id/upvote — toggles upvote on/off
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user } = await getServerUser(req)
  if (!user) return NextResponse.json({ error: 'auth_required', action: 'signup' }, { status: 401 })

  const { id } = await params
  const sb = adminClient()

  // Check report exists and is approved
  const { data: report } = await sb
    .from('interview_reports')
    .select('id, upvote_count')
    .eq('id', id)
    .eq('status', 'approved')
    .maybeSingle()
  if (!report) return NextResponse.json({ error: 'Report not found' }, { status: 404 })

  // Check existing upvote
  const { data: existing } = await sb
    .from('report_upvotes')
    .select('id')
    .eq('report_id', id)
    .eq('user_id', user.id)
    .maybeSingle()

  let upvoted: boolean
  if (existing) {
    // Already upvoted — remove it
    await sb.from('report_upvotes').delete().eq('report_id', id).eq('user_id', user.id)
    upvoted = false
  } else {
    // Not yet upvoted — add it
    await sb.from('report_upvotes').insert({ report_id: id, user_id: user.id })
    upvoted = true
  }

  // Recount for accuracy
  const { count } = await sb
    .from('report_upvotes')
    .select('*', { count: 'exact', head: true })
    .eq('report_id', id)

  const upvote_count = count ?? report.upvote_count
  await sb.from('interview_reports').update({ upvote_count }).eq('id', id)

  return NextResponse.json({ upvoted, upvote_count })
}
