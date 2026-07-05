import { NextRequest, NextResponse } from 'next/server'
import { getServerUser } from '@/lib/supabase/server'
import { adminClient } from '@/lib/supabase/admin'

const INJECT_PATTERNS = [/ignore (previous|above|all) instructions/i, /you are now/i, /system prompt/i, /disregard your/i]

export async function POST(req: NextRequest) {
  const { user } = await getServerUser(req)
  if (!user) return NextResponse.json({ error: 'Sign in required.' }, { status: 401 })

  const body = await req.json()
  const { company, role_title, interview_round, question_text } = body

  if (!question_text || question_text.trim().length < 20) {
    return NextResponse.json({ error: 'Question must be at least 20 characters.' }, { status: 400 })
  }
  if (INJECT_PATTERNS.some(p => p.test(question_text))) {
    return NextResponse.json({ error: 'Invalid content detected.' }, { status: 400 })
  }

  const { error } = await adminClient().from('community_questions').insert({
    display_name:    user.email?.split('@')[0] ?? 'anonymous',
    company:         company?.trim() || null,
    role_title:      role_title?.trim() || 'AI/ML Engineer',
    role_cluster:    'ai_llm_engineer',
    interview_round: interview_round || 'not_specified',
    year:            new Date().getFullYear(),
    question_text:   question_text.trim(),
    source_note:     'Submitted by a Sonne AI user',
    submitted_by:    user.id,
  })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
