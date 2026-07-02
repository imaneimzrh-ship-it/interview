import { NextRequest, NextResponse } from 'next/server'
import { getServerUser } from '@/lib/supabase/server'
import { AI_QUESTIONS, GENERAL_QUESTIONS, pickQuestions } from '@/lib/questions/bank'
import { sendMessage, shouldAdvance, isComplete } from '@/lib/claude/interview'

export async function POST(req: NextRequest) {
  try {
    const { sb, user } = await getServerUser()
    if (!user) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 })

    const { sessionId, userMessage, currentQIndex, questionIds } = await req.json()
    if (!sessionId || !userMessage) return NextResponse.json({ error: 'Missing fields.' }, { status: 400 })

    // Get session
    const { data: session } = await sb
      .from('interview_sessions').select('*').eq('id', sessionId).eq('user_id', user.id).single()
    if (!session) return NextResponse.json({ error: 'Session not found.' }, { status: 404 })
    if (session.status !== 'active') return NextResponse.json({ error: 'Session is not active.' }, { status: 400 })

    // Get conversation history
    const { data: msgs } = await sb
      .from('interview_messages').select('role, content')
      .eq('session_id', sessionId).order('created_at', { ascending: true })

    // Find current question
    const allQ = session.is_ai_role ? AI_QUESTIONS : GENERAL_QUESTIONS
    const currentQ = allQ.find(q => q.id === questionIds?.[currentQIndex])
      ?? pickQuestions(session.role, session.company, session.q_total)[currentQIndex]

    if (!currentQ) return NextResponse.json({ error: 'Question not found.' }, { status: 404 })

    // Save user message
    await sb.from('interview_messages').insert({
      session_id: sessionId, user_id: user.id,
      role: 'user', content: userMessage, q_num: currentQIndex + 1,
    })

    // Get AI response
    const aiResponse = await sendMessage(
      currentQ, currentQIndex + 1, session.q_total, session.company,
      (msgs ?? []) as { role: 'user' | 'assistant'; content: string }[],
      userMessage,
    )

    // Save AI response
    await sb.from('interview_messages').insert({
      session_id: sessionId, user_id: user.id,
      role: 'assistant', content: aiResponse, q_num: currentQIndex + 1,
    })

    const advance = shouldAdvance(aiResponse)
    const done = isComplete(aiResponse) || (advance && currentQIndex + 1 >= session.q_total)
    const nextQIndex = advance ? currentQIndex + 1 : currentQIndex

    // Update session state
    if (done) {
      await sb.from('interview_sessions').update({ status: 'completed', q_current: session.q_total, completed_at: new Date().toISOString() }).eq('id', sessionId)
    } else if (advance) {
      await sb.from('interview_sessions').update({ q_current: nextQIndex + 1 }).eq('id', sessionId)
    }

    return NextResponse.json({ aiResponse, advance, done, nextQIndex })
  } catch (err) {
    console.error('Message error:', err)
    return NextResponse.json({ error: `Server error: ${err instanceof Error ? err.message : 'Unknown error'}` }, { status: 500 })
  }
}
