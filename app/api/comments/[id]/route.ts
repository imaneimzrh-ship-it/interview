import { NextRequest, NextResponse } from 'next/server'
import { adminClient } from '@/lib/supabase/admin'
import { getServerUser } from '@/lib/supabase/server'

const ADMIN_EMAILS = (process.env.ADMIN_EMAILS ?? '').split(',').map(e => e.trim()).filter(Boolean)

// PATCH /api/comments/:id — owner edits their comment body
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user } = await getServerUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const { body } = await req.json()
  if (!body || typeof body !== 'string' || !body.trim()) {
    return NextResponse.json({ error: 'body is required' }, { status: 400 })
  }

  const sb = adminClient()
  const { data: comment, error: fetchErr } = await sb
    .from('report_comments')
    .select('user_id, status')
    .eq('id', id)
    .single()

  if (fetchErr || !comment) return NextResponse.json({ error: 'Comment not found' }, { status: 404 })
  if (comment.user_id !== user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  if (comment.status === 'removed') return NextResponse.json({ error: 'Cannot edit a deleted comment' }, { status: 410 })

  const { error } = await sb
    .from('report_comments')
    .update({ body: body.trim(), edited_at: new Date().toISOString() })
    .eq('id', id)

  if (error) return NextResponse.json({ error: 'Failed to update comment' }, { status: 500 })
  return NextResponse.json({ ok: true })
}

// DELETE /api/comments/:id — owner or admin soft-deletes (sets status=removed, body=[deleted])
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user } = await getServerUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const isAdmin = ADMIN_EMAILS.length > 0 && ADMIN_EMAILS.includes(user.email ?? '')

  const sb = adminClient()
  const { data: comment, error: fetchErr } = await sb
    .from('report_comments')
    .select('user_id, status')
    .eq('id', id)
    .single()

  if (fetchErr || !comment) return NextResponse.json({ error: 'Comment not found' }, { status: 404 })
  if (comment.user_id !== user.id && !isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  if (comment.status === 'removed') return NextResponse.json({ ok: true }) // idempotent

  const { error } = await sb
    .from('report_comments')
    .update({ status: 'removed', body: '[deleted]' })
    .eq('id', id)

  if (error) return NextResponse.json({ error: 'Failed to delete comment' }, { status: 500 })
  return NextResponse.json({ ok: true })
}
