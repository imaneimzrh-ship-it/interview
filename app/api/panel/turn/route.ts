import { NextRequest, NextResponse } from 'next/server'
import { getServerUser } from '@/lib/supabase/server'
import { conductPanelTurn, gradePanelTurn, type RoundType, type PanelTurnMessage } from '@/lib/claude/panel-interviewer'

export const maxDuration = 60

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { sb, user } = await getServerUser(req)
    if (!user) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 })

    const { panel_session_id, panel_round_id, user_message, history = [] } = body
    if (!panel_session_id || !panel_round_id || !user_message) {
      return NextResponse.json({ error: 'panel_session_id, panel_round_id, and user_message are required.' }, { status: 400 })
    }

    // Load session + round
    const { data: session } = await sb
      .from('panel_sessions')
      .select('*')
      .eq('id', panel_session_id)
      .eq('user_id', user.id)
      .single()

    if (!session) return NextResponse.json({ error: 'Session not found.' }, { status: 404 })
    if (session.status === 'completed') return NextResponse.json({ error: 'Panel already completed.' }, { status: 400 })

    const { data: round } = await sb
      .from('panel_rounds')
      .select('*')
      .eq('id', panel_round_id)
      .eq('panel_session_id', panel_session_id)
      .single()

    if (!round) return NextResponse.json({ error: 'Round not found.' }, { status: 404 })
    if (round.completed_at) return NextResponse.json({ error: 'Round already completed.' }, { status: 400 })

    const roundType    = round.round_type as RoundType
    const turnMessages = (history as PanelTurnMessage[])

    const candidateCtx = {
      jobDescription: session.job_description ?? undefined,
      resume:         session.resume_text     ?? undefined,
    }

    const { response, roundComplete } = await conductPanelTurn({
      lang:           session.language as 'en' | 'fr',
      roundType,
      roleCluster:    session.role_cluster,
      history:        turnMessages,
      userMessage:    user_message,
      questionsAsked: round.questions_asked,
      ctx:            candidateCtx,
    })

    // Find the last question asked by assistant (from history)
    const lastAssistantMsg = [...turnMessages].reverse().find(m => m.role === 'assistant')
    const questionText     = lastAssistantMsg?.content ?? ''

    // Grade the answer
    const grade = await gradePanelTurn({
      roundType,
      questionText,
      answerText:   user_message,
      conversationContext: turnMessages.slice(-4).map(m => `${m.role}: ${m.content}`).join('\n'),
    })

    const newTurnNumber = (round.questions_asked ?? 0) + 1

    // Save this turn
    await sb.from('panel_turns').insert({
      panel_session_id: panel_session_id,
      panel_round_id:   panel_round_id,
      turn_number:      newTurnNumber,
      round_type:       roundType,
      question_text:    questionText,
      answer_text:      user_message,
      grade_score:      grade.score,
      grade_rationale:  grade.rationale,
      grade_strengths:  grade.strengths,
      grade_gaps:       grade.gaps,
      tradeoff_score:   grade.tradeoff_score,
      tradeoff_note:    grade.tradeoff_note,
    })

    // Increment questions_asked
    const updatedQuestionsAsked = round.questions_asked + 1
    const roundUpdate: Record<string, unknown> = { questions_asked: updatedQuestionsAsked }

    if (roundComplete) {
      const avgScore = (round.score == null
        ? grade.score
        : ((round.score * round.questions_asked) + grade.score) / updatedQuestionsAsked)
      roundUpdate.score        = avgScore
      roundUpdate.completed_at = new Date().toISOString()
    } else {
      // Running avg score
      const avgScore = round.score == null
        ? grade.score
        : ((round.score * round.questions_asked) + grade.score) / updatedQuestionsAsked
      roundUpdate.score = avgScore
    }

    await sb.from('panel_rounds').update(roundUpdate).eq('id', panel_round_id)

    return NextResponse.json({
      response,
      roundComplete,
      questionsAsked: updatedQuestionsAsked,
      grade: {
        score:          grade.score,
        tradeoff_score: grade.tradeoff_score,
      },
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : JSON.stringify(err)
    console.error('Panel turn error:', err)
    return NextResponse.json({ error: `Server error: ${msg}` }, { status: 500 })
  }
}
