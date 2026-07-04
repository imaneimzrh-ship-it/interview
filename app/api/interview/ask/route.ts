import { NextRequest, NextResponse } from 'next/server'
import { getServerUser } from '@/lib/supabase/server'
import { answerCandidateQuestion } from '@/lib/claude/interviewer'

export async function POST(req: NextRequest) {
  const { sb, user } = await getServerUser(req)
  if (!user) return NextResponse.json({ error: 'Not authenticated.' }, { status: 401 })

  const { sessionId, question } = await req.json()
  if (!sessionId || !question?.trim()) return NextResponse.json({ error: 'Missing fields.' }, { status: 400 })

  const { data: session } = await sb
    .from('interview_sessions')
    .select('language, skill_modules(name_en, name_fr)')
    .eq('id', sessionId).eq('user_id', user.id).single()
  if (!session) return NextResponse.json({ error: 'Session not found.' }, { status: 404 })

  const { data: report } = await sb
    .from('diagnostic_reports')
    .select('top_strength, top_gap')
    .eq('session_id', sessionId).maybeSingle()

  const lang       = session.language as 'en' | 'fr'
  const moduleName = lang === 'fr' ? (session.skill_modules as any).name_fr : (session.skill_modules as any).name_en

  try {
    const answer = await answerCandidateQuestion({
      lang,
      moduleName,
      topStrength: report?.top_strength ?? '',
      topGap:      report?.top_gap      ?? '',
      question:    question.trim(),
    })
    return NextResponse.json({ answer })
  } catch (e: any) {
    return NextResponse.json({ error: e.message ?? 'Failed.' }, { status: 500 })
  }
}
