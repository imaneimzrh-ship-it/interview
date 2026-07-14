import { NextRequest, NextResponse } from 'next/server'
import { adminClient } from '@/lib/supabase/admin'
import { getServerUser } from '@/lib/supabase/server'

// GET /api/reports/:id/comments — public
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const sb = adminClient()
  const { data: comments, error } = await sb
    .from('report_comments')
    .select('id, body, like_count, created_at, edited_at, status, user_id')
    .eq('report_id', id)
    .in('status', ['visible', 'removed'])
    .order('created_at', { ascending: true })
    .limit(100)

  if (error) return NextResponse.json({ error: 'Failed to fetch comments' }, { status: 500 })

  // Join profiles for display names
  const userIds = [...new Set((comments ?? []).map((c: { user_id: string | null }) => c.user_id).filter(Boolean))]
  const profileMap: Record<string, { display_name: string }> = {}
  if (userIds.length > 0) {
    const { data: profiles } = await sb
      .from('profiles')
      .select('id, question_username, full_name')
      .in('id', userIds)
    for (const p of profiles ?? []) {
      profileMap[p.id] = { display_name: p.question_username || p.full_name || 'Anonymous' }
    }
  }

  const result = (comments ?? []).map((c: { id: string; body: string; like_count: number; created_at: string; edited_at: string | null; status: string; user_id: string | null }) => ({
    id: c.id,
    body: c.status === 'removed' ? '[deleted]' : c.body,
    like_count: c.like_count,
    created_at: c.created_at,
    edited_at: c.edited_at,
    status: c.status,
    user_id: c.user_id,
    profile: c.user_id ? (profileMap[c.user_id] ?? { display_name: 'Anonymous' }) : { display_name: 'Anonymous' },
  }))

  return NextResponse.json(result)
}

// POST /api/reports/:id/comments — account-gated
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user } = await getServerUser(req)
  if (!user) return NextResponse.json({ error: 'auth_required', action: 'signup' }, { status: 401 })

  const { id } = await params
  let body: { body: string }
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }) }

  const text = body.body?.trim()
  if (!text || text.length < 2) return NextResponse.json({ error: 'Comment too short' }, { status: 400 })
  if (text.length > 1000) return NextResponse.json({ error: 'Comment too long (max 1000 chars)' }, { status: 400 })

  const sb = adminClient()
  // Verify report exists and is approved
  const { data: report } = await sb
    .from('interview_reports')
    .select('id')
    .eq('id', id)
    .eq('status', 'approved')
    .maybeSingle()
  if (!report) return NextResponse.json({ error: 'Report not found' }, { status: 404 })

  const { data: comment, error } = await sb.from('report_comments').insert({
    report_id: id,
    user_id:   user.id,
    body:      text,
  }).select('id, body, like_count, created_at, edited_at, status, user_id').single()

  if (error) return NextResponse.json({ error: 'Failed to post comment' }, { status: 500 })

  const { data: profile } = await sb.from('profiles').select('question_username, full_name').eq('id', user.id).single()
  return NextResponse.json({
    ...comment,
    profile: { display_name: profile?.question_username || profile?.full_name || user.email?.split('@')[0] || 'Anonymous' },
  }, { status: 201 })
}
