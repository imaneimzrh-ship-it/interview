import { NextRequest, NextResponse } from 'next/server'
import { getServerUser } from '@/lib/supabase/server'
import { openQuestion } from '@/lib/claude/interviewer'

export async function POST(req: NextRequest) {
  try {
    const { sb, user } = await getServerUser(req)
    if (!user) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 })

    const { sessionId, currentSubSkillIdx } = await req.json()
    if (!sessionId) return NextResponse.json({ error: 'sessionId required.' }, { status: 400 })

    const { data: session } = await sb
      .from('interview_sessions')
      .select(`*, skill_modules(name_en, name_fr)`)
      .eq('id', sessionId).eq('user_id', user.id).single()

    if (!session) return NextResponse.json({ error: 'Session not found.' }, { status: 404 })
    if (session.status !== 'active') return NextResponse.json({ error: 'Session is not active.' }, { status: 400 })

    const { data: subSkills } = await sb
      .from('sub_skills')
      .select(`*, questions(*)`)
      .eq('skill_module_id', session.skill_module_id)
      .order('display_order')

    if (!subSkills?.length) return NextResponse.json({ error: 'No sub-skills found.' }, { status: 500 })

    const currentSS = subSkills[currentSubSkillIdx]
    const nextIdx   = currentSubSkillIdx + 1
    const isLast    = nextIdx >= subSkills.length

    // Mark current sub-skill as skipped (store empty answer with grade 0 marker)
    if (currentSS) {
      const currentQ = currentSS.questions?.[0]
      await sb.from('session_turns').insert({
        session_id: sessionId,
        user_id: user.id,
        turn_number: currentSubSkillIdx,
        question_id: currentQ?.id ?? null,
        sub_skill_id: currentSS.id,
        question_text: currentQ?.body_en ?? '',
        answer_text: '[SKIPPED]',
        grade_score: 1,
        grade_rationale: 'Sub-skill was skipped by the candidate.',
        grade_gaps: ['Skipped — not evaluated'],
        grade_strengths: [],
      })
    }

    const covered = [...(session.sub_skills_covered ?? []), currentSS?.slug].filter(Boolean)

    if (isLast) {
      await sb.from('interview_sessions').update({
        sub_skills_covered: covered,
        current_sub_skill_idx: nextIdx,
        status: 'completed',
        completed_at: new Date().toISOString(),
      }).eq('id', sessionId)

      return NextResponse.json({ isComplete: true, nextSubSkillIdx: nextIdx })
    }

    const nextSS = subSkills[nextIdx]
    const nextQ  = nextSS.questions?.[0]
    const lang   = session.language as 'en' | 'fr'

    let nextOpeningMessage = ''
    if (nextQ) {
      nextOpeningMessage = await openQuestion({
        lang,
        moduleName: lang === 'fr' ? session.skill_modules.name_fr : session.skill_modules.name_en,
        subSkill: { id: nextSS.id, slug: nextSS.slug, name_en: nextSS.name_en, name_fr: nextSS.name_fr },
        question: {
          id: nextQ.id, body_en: nextQ.body_en, body_fr: nextQ.body_fr,
          rubric_strong: nextQ.rubric_strong, rubric_medium: nextQ.rubric_medium, rubric_weak: nextQ.rubric_weak,
          follow_up_probes: nextQ.follow_up_probes ?? [],
        },
        subSkillsCompleted: covered,
        totalSubSkills: subSkills.length,
      })
    }

    await sb.from('interview_sessions').update({
      sub_skills_covered: covered,
      current_sub_skill_idx: nextIdx,
    }).eq('id', sessionId)

    return NextResponse.json({
      isComplete: false,
      nextSubSkillIdx: nextIdx,
      nextOpeningMessage,
      totalSubSkills: subSkills.length,
    })
  } catch (err) {
    return NextResponse.json({ error: `Server error: ${err instanceof Error ? err.message : 'unknown'}` }, { status: 500 })
  }
}
