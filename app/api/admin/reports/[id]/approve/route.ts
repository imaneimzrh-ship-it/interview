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

// POST /api/admin/reports/:id/approve
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await requireAdmin(req)
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { id } = await params
  const sb = adminClient()
  const { error } = await sb
    .from('interview_reports')
    .update({ status: 'approved', approved_at: new Date().toISOString() })
    .eq('id', id)

  if (error) return NextResponse.json({ error: 'Failed to approve report' }, { status: 500 })
  return NextResponse.json({ ok: true })
}
