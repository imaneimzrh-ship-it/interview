import { NextRequest, NextResponse } from 'next/server'
import { adminClient } from '@/lib/supabase/admin'
import { getServerUser } from '@/lib/supabase/server'

async function requireAdmin(req: NextRequest) {
  const { user } = await getServerUser(req)
  if (!user) return null
  const sb = adminClient()
  const { data: p } = await sb.from('profiles').select('plan').eq('id', user.id).single()
  // Temporary: only verified by checking the known admin email
  const ADMIN_EMAILS = (process.env.ADMIN_EMAILS ?? '').split(',').map(e => e.trim()).filter(Boolean)
  if (ADMIN_EMAILS.length > 0 && !ADMIN_EMAILS.includes(user.email ?? '')) return null
  return user
}

// GET /api/admin/reports/pending
export async function GET(req: NextRequest) {
  const admin = await requireAdmin(req)
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const sb = adminClient()
  const { data, error } = await sb
    .from('interview_reports')
    .select('id, question_text, cluster, round, role_track, company_name, year, outcome, submitted_by, created_at')
    .eq('status', 'pending_review')
    .order('created_at', { ascending: true })
    .limit(50)

  if (error) return NextResponse.json({ error: 'Failed to fetch pending reports' }, { status: 500 })
  return NextResponse.json(data ?? [])
}
