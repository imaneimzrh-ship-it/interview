import { NextRequest, NextResponse } from 'next/server'
import { adminClient } from '@/lib/supabase/admin'
import { getServerUser } from '@/lib/supabase/server'

// GET /api/reports — public, no auth required
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const cluster  = searchParams.get('cluster')
  const round    = searchParams.get('round')
  const limit    = Math.min(parseInt(searchParams.get('limit') ?? '20', 10), 100)
  const offset   = parseInt(searchParams.get('offset') ?? '0', 10)

  const sb = adminClient()
  let query = sb
    .from('interview_reports')
    .select('id, question_text, cluster, round, role_track, company_name, year, outcome, upvote_count, created_at, approved_at')
    .eq('status', 'approved')
    .order('upvote_count', { ascending: false })
    .order('approved_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (cluster) query = query.eq('cluster', cluster)
  if (round)   query = query.eq('round', round)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: 'Failed to fetch reports' }, { status: 500 })
  return NextResponse.json(data ?? [])
}

// POST /api/reports — requires auth (account-gated, not credit-gated)
export async function POST(req: NextRequest) {
  const { user } = await getServerUser(req)
  if (!user) return NextResponse.json({ error: 'auth_required', action: 'signup' }, { status: 401 })

  let body: {
    question_text: string
    cluster: string
    round: string
    role_track?: string
    company_name?: string
    year?: number
    outcome?: string
  }
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }) }

  const { question_text, cluster, round, role_track, company_name, year, outcome } = body
  if (!question_text?.trim() || !cluster || !round) {
    return NextResponse.json({ error: 'question_text, cluster, and round are required' }, { status: 400 })
  }

  const validClusters = ['rag', 'agent_orchestration', 'evaluation_testing', 'production_mlops']
  const validRounds   = ['screening', 'technical', 'system_design', 'behavioral', 'deep_dive']
  if (!validClusters.includes(cluster)) return NextResponse.json({ error: 'Invalid cluster' }, { status: 400 })
  if (!validRounds.includes(round))     return NextResponse.json({ error: 'Invalid round' }, { status: 400 })

  const sb = adminClient()
  const { data, error } = await sb.from('interview_reports').insert({
    submitted_by:  user.id,
    question_text: question_text.trim().slice(0, 2000),
    cluster,
    round,
    role_track:   role_track ?? null,
    company_name: company_name ?? null,
    year:         year ?? null,
    outcome:      outcome ?? null,
    status:       'pending_review',
  }).select('id, status').single()

  if (error) return NextResponse.json({ error: 'Failed to submit report' }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
