import { NextRequest, NextResponse } from 'next/server'
import { adminClient } from '@/lib/supabase/admin'
import { getServerUser } from '@/lib/supabase/server'

const ADMIN_EMAILS = (process.env.ADMIN_EMAILS ?? '').split(',').map(e => e.trim()).filter(Boolean)

async function requireAdmin(req: NextRequest) {
  const { user } = await getServerUser(req)
  if (!user) return null
  if (ADMIN_EMAILS.length > 0 && !ADMIN_EMAILS.includes(user.email ?? '')) return null
  return user
}

// POST /api/admin/comments/:id/restore — un-soft-delete a comment
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await requireAdmin(req)
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { id } = await params
  const { action } = await req.json().catch(() => ({ action: 'restore' }))

  const sb = adminClient()

  if (action === 'delete') {
    // Hard delete — permanent removal
    const { error } = await sb.from('report_comments').delete().eq('id', id)
    if (error) return NextResponse.json({ error: 'Failed to delete' }, { status: 500 })
  } else {
    // Restore — clear removed status
    const { error } = await sb
      .from('report_comments')
      .update({ status: 'approved' })
      .eq('id', id)
    if (error) return NextResponse.json({ error: 'Failed to restore' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
