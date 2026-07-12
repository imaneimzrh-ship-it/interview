import { NextRequest, NextResponse } from 'next/server'
import { getServerUser } from '@/lib/supabase/server'
import { openRound, ROUND_CONFIG, type RoundType } from '@/lib/claude/panel-interviewer'

export const maxDuration = 60

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { sb, user } = await getServerUser(req)
    if (!user) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 })

    const { panel_session_id } = body
    if (!panel_session_id) return NextResponse.json({ error: 'panel_session_id required.' }, { status: 400 })

    const { data: session } = await sb
      .from('panel_sessions')
      .select('*')
      .eq('id', panel_session_id)
      .eq('user_id', user.id)
      .single()

    if (!session) return NextResponse.json({ error: 'Session not found.' }, { status: 404 })
    if (session.status === 'completed') return NextResponse.json({ allDone: true }, { status: 200 })

    const roundSequence   = session.round_sequence as RoundType[]
    const nextRoundIdx    = session.current_round_idx + 1

    if (nextRoundIdx >= roundSequence.length) {
      // All rounds done
      await sb.from('panel_sessions')
        .update({ status: 'completed', completed_at: new Date().toISOString() })
        .eq('id', panel_session_id)
      return NextResponse.json({ allDone: true, panelSessionId: panel_session_id })
    }

    const nextRoundType = roundSequence[nextRoundIdx]
    const cfg           = ROUND_CONFIG[nextRoundType]

    // Create the next round
    const { data: newRound } = await sb
      .from('panel_rounds')
      .insert({
        panel_session_id: panel_session_id,
        round_type:       nextRoundType,
        round_idx:        nextRoundIdx,
        min_questions:    cfg.min_questions,
        questions_asked:  0,
      })
      .select()
      .single()

    if (!newRound) return NextResponse.json({ error: 'Failed to create next round.' }, { status: 500 })

    // Advance session index
    await sb.from('panel_sessions')
      .update({ current_round_idx: nextRoundIdx })
      .eq('id', panel_session_id)

    const candidateCtx = {
      jobDescription: session.job_description ?? undefined,
      resume:         session.resume_text     ?? undefined,
    }

    const openingMessage = await openRound({
      lang:        session.language as 'en' | 'fr',
      roundType:   nextRoundType,
      roleCluster: session.role_cluster,
      ctx:         candidateCtx,
    })

    // Save opening message as first turn of new round
    await sb.from('panel_turns').insert({
      panel_session_id: panel_session_id,
      panel_round_id:   newRound.id,
      turn_number:      0,
      round_type:       nextRoundType,
      question_text:    openingMessage,
      answer_text:      '',
    })

    return NextResponse.json({
      allDone:        false,
      panelRoundId:   newRound.id,
      roundType:      nextRoundType,
      roundIdx:       nextRoundIdx,
      totalRounds:    roundSequence.length,
      openingMessage,
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : JSON.stringify(err)
    console.error('Panel advance error:', err)
    return NextResponse.json({ error: `Server error: ${msg}` }, { status: 500 })
  }
}
