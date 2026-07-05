import { NextRequest, NextResponse } from 'next/server'
import { getServerUser } from '@/lib/supabase/server'
import { adminClient } from '@/lib/supabase/admin'

const INJECT_PATTERNS = [
  /ignore (previous|above|all) instructions/i,
  /you are now/i,
  /system prompt/i,
  /disregard your/i,
]

type CompanyVisibility = 'named' | 'generic' | 'undisclosed'
type RoleCluster = 'ai_llm_engineer' | 'ai_automation_engineer' | 'applied_ai_mlops' | 'fde'
type InterviewRound = 'screen' | 'technical' | 'system_design' | 'behavioral' | 'final'
type Outcome = 'offer' | 'rejected' | 'no_response' | 'still_in_process' | 'prefer_not_to_say'

const VALID_CLUSTERS: RoleCluster[] = ['ai_llm_engineer', 'ai_automation_engineer', 'applied_ai_mlops', 'fde']
const VALID_ROUNDS: InterviewRound[] = ['screen', 'technical', 'system_design', 'behavioral', 'final']
const VALID_OUTCOMES: Outcome[] = ['offer', 'rejected', 'no_response', 'still_in_process', 'prefer_not_to_say']
const VALID_VISIBILITY: CompanyVisibility[] = ['named', 'generic', 'undisclosed']
const VALID_SIZES = ['startup', 'mid_size', 'large', 'enterprise']

function generateDisplayName(email: string): string {
  const base = email.split('@')[0].replace(/[^a-z0-9]/gi, '').toLowerCase().slice(0, 12)
  const suffix = Math.floor(Math.random() * 90) + 10
  return `${base}_${suffix}`
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const cluster  = searchParams.get('cluster')
  const round    = searchParams.get('round')
  const q        = searchParams.get('q')
  const limit    = Math.min(parseInt(searchParams.get('limit') ?? '60', 10), 100)

  // Use service-role client so RLS doesn't block (we filter status='published' manually)
  const sb = adminClient()
  let query = sb
    .from('question_reports')
    .select('id, display_name, role_title, role_cluster, company_visibility, company_name, company_size, industry, interview_round, year, question_text, difficulty_rating, outcome, upvotes, created_at')
    .eq('status', 'published')
    .order('upvotes', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(limit)

  if (cluster && VALID_CLUSTERS.includes(cluster as RoleCluster)) {
    query = query.eq('role_cluster', cluster)
  }
  if (round && VALID_ROUNDS.includes(round as InterviewRound)) {
    query = query.eq('interview_round', round)
  }
  if (q) {
    query = query.ilike('question_text', `%${q}%`)
  }

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ reports: data ?? [] })
}

export async function POST(req: NextRequest) {
  const { user } = await getServerUser(req)
  if (!user) return NextResponse.json({ error: 'Sign in required.' }, { status: 401 })

  const body = await req.json()
  const {
    question_text,
    role_cluster,
    role_title,
    interview_round,
    company_visibility = 'undisclosed',
    company_name,
    company_size,
    industry,
    difficulty_rating,
    outcome = 'prefer_not_to_say',
    source_url,
    source_note,
    year,
    display_name: rawDisplayName,
  } = body

  // ── Validation ──
  if (!question_text || typeof question_text !== 'string') {
    return NextResponse.json({ error: 'question_text is required.' }, { status: 400 })
  }
  const trimmed = question_text.trim()
  if (trimmed.length < 20) {
    return NextResponse.json({ error: 'Question must be at least 20 characters.' }, { status: 400 })
  }
  if (trimmed.length > 500) {
    return NextResponse.json({ error: 'Question must be 500 characters or fewer.' }, { status: 400 })
  }
  if (!role_cluster || !VALID_CLUSTERS.includes(role_cluster)) {
    return NextResponse.json({ error: 'A valid role_cluster is required.' }, { status: 400 })
  }
  if (!interview_round || !VALID_ROUNDS.includes(interview_round)) {
    return NextResponse.json({ error: 'A valid interview_round is required.' }, { status: 400 })
  }
  if (!VALID_VISIBILITY.includes(company_visibility)) {
    return NextResponse.json({ error: 'Invalid company_visibility value.' }, { status: 400 })
  }
  if (company_visibility === 'named') {
    if (!company_name?.trim()) {
      return NextResponse.json({ error: 'company_name is required when naming a company.' }, { status: 400 })
    }
    if (!source_url?.trim() && !source_note?.trim()) {
      return NextResponse.json({
        error: 'Naming a real company requires a source — add a URL or a note explaining where this was reported (e.g. a public forum, blog post, or recruiter call).',
      }, { status: 400 })
    }
  }
  if (company_size && !VALID_SIZES.includes(company_size)) {
    return NextResponse.json({ error: 'Invalid company_size value.' }, { status: 400 })
  }
  if (outcome && !VALID_OUTCOMES.includes(outcome)) {
    return NextResponse.json({ error: 'Invalid outcome value.' }, { status: 400 })
  }
  if (difficulty_rating !== undefined && difficulty_rating !== null) {
    const d = Number(difficulty_rating)
    if (!Number.isInteger(d) || d < 1 || d > 5) {
      return NextResponse.json({ error: 'difficulty_rating must be 1–5.' }, { status: 400 })
    }
  }

  // Injection guard
  if (INJECT_PATTERNS.some(p => p.test(trimmed))) {
    return NextResponse.json({ error: 'Invalid content detected.' }, { status: 400 })
  }

  const displayName = rawDisplayName?.trim() || generateDisplayName(user.email ?? 'anon')

  const { error } = await adminClient().from('question_reports').insert({
    submitted_by:       user.id,
    display_name:       displayName.slice(0, 40),
    role_title:         role_title?.trim() || 'AI/ML Engineer',
    role_cluster,
    company_visibility,
    company_name:       company_visibility === 'named' ? company_name.trim() : null,
    company_size:       company_visibility === 'generic' ? (company_size || null) : null,
    industry:           company_visibility === 'generic' ? (industry?.trim() || null) : null,
    interview_round,
    year:               year ? Number(year) : new Date().getFullYear(),
    question_text:      trimmed,
    difficulty_rating:  difficulty_rating ? Number(difficulty_rating) : null,
    outcome,
    source_url:         source_url?.trim() || null,
    source_note:        source_note?.trim() || null,
    status:             'published',
  })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
