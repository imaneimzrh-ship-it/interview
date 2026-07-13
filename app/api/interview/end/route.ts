import { NextRequest, NextResponse } from 'next/server'
import { getServerUser } from '@/lib/supabase/server'
import { generateDiagnostic } from '@/lib/claude/grader'
import type { GradeResult } from '@/lib/claude/grader'
import { trackServerEvent } from '@/lib/analytics'

export async function POST(req: NextRequest) {
  try {
    const { sb, user } = await getServerUser(req)
    if (!user) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 })

    const { sessionId } = await req.json()
    if (!sessionId) return NextResponse.json({ error: 'sessionId required.' }, { status: 400 })

    const { data: session } = await sb
      .from('interview_sessions')
      .select(`*, skill_modules(name_en, name_fr)`)
      .eq('id', sessionId).eq('user_id', user.id).single()

    if (!session) return NextResponse.json({ error: 'Session not found.' }, { status: 404 })

    // Load all turns with grades
    const { data: turns } = await sb
      .from('session_turns')
      .select(`*, sub_skills(slug, name_en)`)
      .eq('session_id', sessionId)
      .not('grade_score', 'is', null)
      .order('turn_number')

    if (!turns?.length) return NextResponse.json({ error: 'No graded turns found.' }, { status: 400 })

    // Aggregate grades per sub-skill (use highest-scored turn per sub-skill)
    const gradesBySubSkill: Record<string, GradeResult> = {}
    const subSkillNames: Record<string, string> = {}

    for (const turn of turns) {
      const slug = turn.sub_skills?.slug
      if (!slug) continue
      subSkillNames[slug] = turn.sub_skills?.name_en ?? slug
      const existing = gradesBySubSkill[slug]
      if (!existing || turn.grade_score > existing.score) {
        gradesBySubSkill[slug] = {
          sub_skill_slug: slug,
          score: turn.grade_score,
          evidence_quote: turn.grade_evidence ?? '',
          rationale: turn.grade_rationale ?? '',
          gaps: turn.grade_gaps ?? [],
          strengths: turn.grade_strengths ?? [],
          follow_up_warranted: turn.follow_up_used ?? false,
          tradeoff_score: turn.grade_tradeoff_score ?? 1,
          tradeoff_note: turn.grade_tradeoff_note ?? '',
        }
      }
    }

    const grades = Object.values(gradesBySubSkill)
    if (!grades.length) return NextResponse.json({ error: 'No grades to report on.' }, { status: 400 })

    const overallScore = grades.reduce((s, g) => s + g.score, 0) / grades.length

    // Generate diagnostic
    const diagnostic = await generateDiagnostic({
      lang: session.language as 'en' | 'fr',
      moduleName: session.skill_modules.name_en,
      grades,
      subSkillNames,
    })

    // Save report
    const { data: report, error: reportErr } = await sb
      .from('diagnostic_reports')
      .insert({
        session_id:       sessionId,
        user_id:          user.id,
        top_strength:     diagnostic.top_strength,
        top_gap:          diagnostic.top_gap,
        headline_en:      diagnostic.headline_en,
        headline_fr:      diagnostic.headline_fr,
        sub_skill_scores: diagnostic.sub_skill_scores,
        tradeoff_avg:     diagnostic.tradeoff_avg,
        tradeoff_summary: diagnostic.tradeoff_summary,
        improvement_plan: diagnostic.improvement_plan,
        full_summary_en:  diagnostic.full_summary_en,
        full_summary_fr:  diagnostic.full_summary_fr,
        overall_score:    Math.round(overallScore * 10) / 10,
      })
      .select().single()

    if (reportErr) {
      console.error('Report insert error:', reportErr)
      return NextResponse.json({ error: `Failed to save report: ${reportErr.message}` }, { status: 500 })
    }

    // Mark session complete
    const dur = session.started_at
      ? Math.floor((Date.now() - new Date(session.started_at).getTime()) / 1000)
      : 0

    await sb.from('interview_sessions').update({
      status: 'completed',
      completed_at: new Date().toISOString(),
      duration_secs: dur,
    }).eq('id', sessionId)

    // Analytics: session fully completed
    void trackServerEvent(sb, {
      name: 'session_fully_completed',
      user_id: user.id,
      session_id: sessionId,
      module_slug: session.skill_modules?.slug,
    })

    return NextResponse.json({
      reportId: report?.id,
      shareToken: report?.share_token,
      headline: session.language === 'fr' ? diagnostic.headline_fr : diagnostic.headline_en,
    })
  } catch (err) {
    console.error('End session error:', err)
    return NextResponse.json({ error: `Server error: ${err instanceof Error ? err.message : 'unknown'}` }, { status: 500 })
  }
}
