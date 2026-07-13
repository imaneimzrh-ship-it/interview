import { NextRequest, NextResponse } from 'next/server'
import { getServerUser } from '@/lib/supabase/server'
import { openQuestion } from '@/lib/claude/interviewer'

export async function GET(req: NextRequest) {
  try {
    const { sb, user } = await getServerUser(req)
    if (!user) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 })

    const sessionId = req.nextUrl.searchParams.get('id')
    if (!sessionId) return NextResponse.json({ error: 'Session ID required.' }, { status: 400 })

    const { data: session } = await sb
      .from('interview_sessions')
      .select(`*, skill_modules(name_en, name_fr, slug)`)
      .eq('id', sessionId)
      .eq('user_id', user.id)
      .single()

    if (!session) return NextResponse.json({ error: 'Session not found.' }, { status: 404 })

    const lang = session.language as 'en' | 'fr'

    // Technical coding exercise — return exerciseId, skip Q&A sub-skill flow
    if ((session as Record<string, unknown>).exercise_id || session.skill_modules?.slug === 'technical_coding') {
      const exerciseId = (session as Record<string, unknown>).exercise_id as string
      const { data: ex } = await sb.from('exercises').select('title, difficulty').eq('id', exerciseId).single()
      return NextResponse.json({
        exerciseId,
        openingMessage: ex
          ? `Let's work through a hands-on coding exercise: **${ex.title}** (${ex.difficulty}). Read the task description on the left, write your fix in the editor, and click Run Tests when ready.`
          : 'Ready for your coding exercise. See the task description on the left.',
        totalSubSkills: 1,
        language: lang,
        voiceEnabled: false,
      })
    }

    // Load sub-skills for this module
    const { data: subSkills } = await sb
      .from('sub_skills')
      .select(`*, questions(*)`)
      .eq('skill_module_id', session.skill_module_id)
      .order('display_order')

    if (!subSkills?.length) return NextResponse.json({ error: 'No sub-skills found.' }, { status: 500 })

    const firstSS = subSkills[0]
    const firstQ  = firstSS.questions?.[0]
    if (!firstQ) return NextResponse.json({ error: 'No question found.' }, { status: 500 })

    const openingMessage = await openQuestion({
      lang,
      moduleName: lang === 'fr' ? session.skill_modules.name_fr : session.skill_modules.name_en,
      subSkill: { id: firstSS.id, slug: firstSS.slug, name_en: firstSS.name_en, name_fr: firstSS.name_fr },
      question: {
        id: firstQ.id,
        body_en: firstQ.body_en,
        body_fr: firstQ.body_fr,
        rubric_strong: firstQ.rubric_strong,
        rubric_medium: firstQ.rubric_medium,
        rubric_weak: firstQ.rubric_weak,
        follow_up_probes: firstQ.follow_up_probes ?? [],
      },
      subSkillsCompleted: [],
      totalSubSkills: subSkills.length,
    })

    return NextResponse.json({
      openingMessage,
      totalSubSkills: subSkills.length,
      moduleSlug: session.skill_modules.slug,
      language: lang,
    })
  } catch (err) {
    return NextResponse.json({ error: `Server error: ${err instanceof Error ? err.message : 'unknown'}` }, { status: 500 })
  }
}
