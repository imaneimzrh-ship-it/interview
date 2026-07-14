import { NextRequest, NextResponse } from 'next/server'
import { adminClient } from '@/lib/supabase/admin'
import { getServerUser } from '@/lib/supabase/server'

// POST /api/reports/:id/upvote — account-gated
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

  // Upsert upvote (idempotent)
  const { error: upErr } = await sb
    .from('report_upvotes')
    .upsert({ report_id: id, user_id: user.id }, { onConflict: 'report_id,user_id', ignoreDuplicates: true })
  if (upErr) return NextResponse.json({ error: 'Failed to upvote' }, { status: 500 })

  // Recount
  const { count } = await sb
    .from('report_upvotes')
    .select('*', { count: 'exact', head: true })
    .eq('report_id', id)

  await sb.from('interview_reports').update({ upvote_count: count ?? report.upvote_count }).eq('id', id)

  return NextResponse.json({ upvote_count: count ?? report.upvote_count })
}
