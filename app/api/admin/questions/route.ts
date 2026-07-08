import { NextRequest, NextResponse } from 'next/server'
import { getServerUser } from '@/lib/supabase/server'
import { adminClient } from '@/lib/supabase/admin'

async function requireAdmin(req: NextRequest) {
  const { user } = await getServerUser(req)
  if (!user) return { error: 'Not signed in.', status: 401 }
  const sb = adminClient()
  const { data: prof } = await sb.from('profiles').select('is_admin').eq('id', user.id).single()
  if (!prof?.is_admin) return { error: 'Forbidden.', status: 403 }
  return { ok: true }
}

export async function GET(req: NextRequest) {
  const auth = await requireAdmin(req)
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status })

  const sb = adminClient()
  const { searchParams } = new URL(req.url)
  const status = searchParams.get('status') ?? 'pending'

  const { data, error } = await sb
    .from('question_reports')
    .select('id, display_name, role_title, role_cluster, company_visibility, company_name, interview_round, question_text, difficulty_rating, outcome, source_note, source_url, status, created_at, submitted_by')
    .eq('status', status)
    .order('created_at', { ascending: true })
    .limit(100)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ entries: data ?? [] })
}

export async function PATCH(req: NextRequest) {
  const auth = await requireAdmin(req)
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status })

  const { id, action } = await req.json()
  if (!id || !['approve', 'reject'].includes(action)) {
    return NextResponse.json({ error: 'id and action (approve|reject) required.' }, { status: 400 })
  }

  const newStatus = action === 'approve' ? 'published' : 'rejected'
  const sb = adminClient()
  const { error } = await sb.from('question_reports').update({ status: newStatus }).eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, status: newStatus })
}
