import { NextRequest, NextResponse } from 'next/server'
import { getServerUser } from '@/lib/supabase/server'
import { openRound, ROUND_CONFIG, type RoundType } from '@/lib/claude/panel-interviewer'

export const maxDuration = 60

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { sb, user } = await getServerUser(req)
    if (!user) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 })

    const { mock_panel_id, lang = 'en', job_description = '', resume: resumeRaw = '' } = body
    if (!mock_panel_id) return NextResponse.json({ error: 'mock_panel_id required.' }, { status: 400 })

    // Pro gate
    const { data: profile } = await sb.from('profiles').select('plan').eq('id', user.id).single()
    if (profile?.plan !== 'pro') {
      return NextResponse.json({ error: 'Mock Panel requires a Pro plan.', upgrade: true }, { status: 403 })
    }

    const jd     = String(job_description).trim()
    const resume = String(resumeRaw).trim()

    // Load panel template
    const { data: panel } = await sb
      .from('mock_panels')
      .select('*')
      .eq('id', mock_panel_id)
      .eq('is_active', true)
      .single()

    if (!panel) return NextResponse.json({ error: 'Panel template not found.' }, { status: 404 })

    const roundSequence = panel.round_sequence as RoundType[]
    const firstRound    = roundSequence[0]

    // Create panel session
    const { data: panelSession, error: sErr } = await sb
      .from('panel_sessions')
      .insert({
        user_id:          user.id,
        mock_panel_id:    mock_panel_id,
        role_cluster:     panel.role_cluster,
        round_sequence:   roundSequence,
        current_round_idx: 0,
        job_description:  jd || null,
        resume_text:      resume || null,
        language:         lang,
        status:           'active',
      })
      .select()
      .single()

    if (sErr || !panelSession) {
      return NextResponse.json({ error: `Failed to create panel session: ${sErr?.message ?? 'unknown'}` }, { status: 500 })
    }

    // Create first round
    const cfg = ROUND_CONFIG[firstRound]
    const { data: panelRound } = await sb
      .from('panel_rounds')
      .insert({
        panel_session_id: panelSession.id,
        round_type:       firstRound,
        round_idx:        0,
        min_questions:    cfg.min_questions,
        questions_asked:  0,
      })
      .select()
      .single()

    if (!panelRound) return NextResponse.json({ error: 'Failed to create round.' }, { status: 500 })

    const candidateCtx = {
      jobDescription: jd || undefined,
      resume:         resume || undefined,
    }

    const openingMessage = await openRound({
      lang: lang as 'en' | 'fr',
      roundType: firstRound,
      roleCluster: panel.role_cluster,
      ctx: candidateCtx,
    })

    // Save opening turn
    await sb.from('panel_turns').insert({
      panel_session_id: panelSession.id,
      panel_round_id:   panelRound.id,
      turn_number:      0,
      round_type:       firstRound,
      question_text:    openingMessage,
      answer_text:      '',
    })

    return NextResponse.json({
      panelSessionId:  panelSession.id,
      panelRoundId:    panelRound.id,
      roundType:       firstRound,
      roundIdx:        0,
      totalRounds:     roundSequence.length,
      roundSequence,
      openingMessage,
      roleCluster:     panel.role_cluster,
      panelTitle:      panel.title,
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : JSON.stringify(err)
    console.error('Panel start error:', err)
    return NextResponse.json({ error: `Server error: ${msg}` }, { status: 500 })
  }
}
