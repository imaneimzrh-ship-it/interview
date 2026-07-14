import { NextRequest, NextResponse } from 'next/server'
import { adminClient } from '@/lib/supabase/admin'
import { getServerUser } from '@/lib/supabase/server'

async function requireAdmin(req: NextRequest) {
  const { user } = await getServerUser(req)
  if (!user) return null
  const ADMIN_EMAILS = (process.env.ADMIN_EMAILS ?? '').split(',').map(e => e.trim()).filter(Boolean)
  if (ADMIN_EMAILS.length > 0 && !ADMIN_EMAILS.includes(user.email ?? '')) return null
  return user
}

// GET /api/admin/comments/flagged
export async function GET(req: NextRequest) {
  const admin = await requireAdmin(req)
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const sb = adminClient()
  const { data, error } = await sb
    .from('comment_flags')
    .select('id, comment_id, flagged_by, reason, created_at, report_comments(id, body, report_id, status)')
    .order('created_at', { ascending: false })
    .limit(50)

  if (error) return NextResponse.json({ error: 'Failed to fetch flagged comments' }, { status: 500 })
  return NextResponse.json(data ?? [])
}
