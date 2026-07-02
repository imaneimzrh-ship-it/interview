import { NextRequest, NextResponse } from 'next/server'
import { getServerUser } from '@/lib/supabase/server'
import { scoreSession } from '@/lib/claude/interview'
import { AI_QUESTIONS, GENERAL_QUESTIONS } from '@/lib/questions/bank'

export async function POST(req: NextRequest) {
  try {
    const { sb, user } = await getServerUser()
    if (!user) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 })

    const { sessionId, questionIds } = await req.json()
    if (!sessionId) return NextResponse.json({ error: 'Session ID required.' }, { status: 400 })

    const { data: session } = await sb
      .from('interview_sessions').select('*').eq('id', sessionId).eq('user_id', user.id).single()
    if (!session) return NextResponse.json({ error: 'Session not found.' }, { status: 404 })

    const { data: msgs } = await sb
      .from('interview_messages').select('role, content')
      .eq('session_id', sessionId).order('created_at', { ascending: true })

    if (!msgs || msgs.length < 2) return NextResponse.json({ error: 'Not enough messages to score.' }, { status: 400 })

    const transcript = msgs.map(m => `${m.role === 'user' ? 'CANDIDATE' : 'INTERVIEWER'}: ${m.content}`).join('\n\n')
    const allQ = session.is_ai_role ? AI_QUESTIONS : GENERAL_QUESTIONS
    const asked = (questionIds ?? []).map((id: string) => allQ.find(q => q.id === id)?.question ?? id)

    const scores = await scoreSession(session.role, session.company, session.is_ai_role, transcript, asked)
    const dur = session.started_at ? Math.floor((Date.now() - new Date(session.started_at).getTime()) / 1000) : 0

    await sb.from('interview_sessions').update({
      status: 'completed',
      completed_at: new Date().toISOString(),
      duration_secs: dur,
      score_overall: (scores as Record<string, number>).overall,
      score_clarity: (scores as Record<string, number>).clarity,
      score_depth: (scores as Record<string, number>).depth,
      score_structure: (scores as Record<string, number>).structure,
      score_examples: (scores as Record<string, number>).examples,
      score_technical: (scores as Record<string, number>).technical,
      ai_summary: (scores as Record<string, string>).summary,
      ai_strengths: (scores as Record<string, string[]>).strengths,
      ai_gaps: (scores as Record<string, string[]>).gaps,
      ai_next: (scores as Record<string, string>).next_steps,
      hire_decision: (scores as Record<string, string>).hire_decision,
    }).eq('id', sessionId)

    return NextResponse.json({ scores, durationSecs: dur })
  } catch (err) {
    console.error('Complete error:', err)
    return NextResponse.json({ error: `Scoring failed: ${err instanceof Error ? err.message : 'Unknown error'}` }, { status: 500 })
  }
}
