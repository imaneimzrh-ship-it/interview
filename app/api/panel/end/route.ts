import { NextRequest, NextResponse } from 'next/server'
import { getServerUser } from '@/lib/supabase/server'
import { generatePanelReport, type RoundType, type PanelGradeResult } from '@/lib/claude/panel-interviewer'

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

    // Load all rounds and their turns
    const { data: rounds } = await sb
      .from('panel_rounds')
      .select('*')
      .eq('panel_session_id', panel_session_id)
      .order('round_idx')

    const { data: allTurns } = await sb
      .from('panel_turns')
      .select('*')
      .eq('panel_session_id', panel_session_id)
      .order('turn_number')

    const roundGrades = (rounds ?? []).map(round => {
      const turns = (allTurns ?? []).filter(t => t.panel_round_id === round.id && t.grade_score != null)
      const grades: PanelGradeResult[] = turns.map(t => ({
        score:          t.grade_score as 1 | 2 | 3 | 4,
        rationale:      t.grade_rationale ?? '',
        strengths:      t.grade_strengths ?? [],
        gaps:           t.grade_gaps      ?? [],
        tradeoff_score: (t.tradeoff_score ?? 1) as 1 | 2 | 3 | 4,
        tradeoff_note:  t.tradeoff_note ?? '',
      }))
      return { roundType: round.round_type as RoundType, grades }
    })

    const report = await generatePanelReport({
      lang:        session.language as 'en' | 'fr',
      roleCluster: session.role_cluster,
      roundGrades,
    })

    // Mark session complete if not already
    if (session.status !== 'completed') {
      await sb.from('panel_sessions')
        .update({ status: 'completed', completed_at: new Date().toISOString() })
        .eq('id', panel_session_id)
    }

    return NextResponse.json({ report, panelSessionId: panel_session_id })
  } catch (err) {
    const msg = err instanceof Error ? err.message : JSON.stringify(err)
    console.error('Panel end error:', err)
    return NextResponse.json({ error: `Server error: ${msg}` }, { status: 500 })
  }
}
