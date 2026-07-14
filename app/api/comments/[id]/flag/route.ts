import { NextRequest, NextResponse } from 'next/server'
import { adminClient } from '@/lib/supabase/admin'
import { getServerUser } from '@/lib/supabase/server'

// POST /api/comments/:id/flag — account-gated
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user } = await getServerUser(req)
  if (!user) return NextResponse.json({ error: 'auth_required', action: 'signup' }, { status: 401 })

  const { id } = await params
  let body: { reason?: string } = {}
  try { body = await req.json() } catch {}

  const sb = adminClient()
  const { error } = await sb.from('comment_flags').insert({
    comment_id: id,
    flagged_by: user.id,
    reason:     body.reason ?? null,
  })

  if (error) return NextResponse.json({ error: 'Failed to flag comment' }, { status: 500 })
  return NextResponse.json({ ok: true })
}
