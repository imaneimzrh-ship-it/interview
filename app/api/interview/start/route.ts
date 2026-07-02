import { NextRequest, NextResponse } from 'next/server'
import { getServerUser } from '@/lib/supabase/server'
import { openQuestion } from '@/lib/claude/interviewer'

export async function POST(req: NextRequest) {
  try {
    const { sb, user } = await getServerUser()
    if (!user) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 })

    const { module_slug, lang = 'en' } = await req.json()
    if (!module_slug) return NextResponse.json({ error: 'module_slug required.' }, { status: 400 })

    // Check tier
    const { data: profile } = await sb.from('profiles').select('plan').eq('id', user.id).single()
    if (!profile) return NextResponse.json({ error: 'Profile not found.' }, { status: 404 })

    // Free tier: check if they've used their one session
    if (profile.plan === 'free') {
      const { count } = await sb
        .from('interview_sessions')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .neq('status', 'abandoned')
      if ((count ?? 0) >= 1) {
        return NextResponse.json({
          error: 'Free tier allows 1 session. Upgrade to practice more.',
          upgrade: true,
        }, { status: 403 })
      }
    }

    // Load module + role track
    const { data: module_ } = await sb
      .from('skill_modules')
      .select(`*, role_tracks(id, slug)`)
      .eq('slug', module_slug)
      .eq('is_active', true)
      .single()

    if (!module_) return NextResponse.json({ error: `Module "${module_slug}" not found.` }, { status: 404 })

    // Load all sub-skills + their questions for this module (ordered)
    const { data: subSkills } = await sb
      .from('sub_skills')
      .select(`*, questions(*)`)
      .eq('skill_module_id', module_.id)
      .order('display_order')

    if (!subSkills?.length) return NextResponse.json({ error: 'No sub-skills found for this module.' }, { status: 500 })

    // Create session
    const { data: session, error: sErr } = await sb
      .from('interview_sessions')
      .insert({
        user_id: user.id,
        role_track_id: module_.role_tracks.id,
        skill_module_id: module_.id,
        language: lang,
        modality: 'text',
        tier: profile.plan,
        status: 'active',
        current_sub_skill_idx: 0,
      })
      .select().single()

    if (sErr || !session) {
      console.error('Session create error:', sErr)
      return NextResponse.json({ error: 'Failed to create session.' }, { status: 500 })
    }

    // Get first sub-skill + question
    const firstSubSkill = subSkills[0]
    const firstQuestion = firstSubSkill.questions?.[0]
    if (!firstQuestion) return NextResponse.json({ error: 'No question found.' }, { status: 500 })

    // Get opening message from interviewer
    const openingMessage = await openQuestion({
      lang: lang as 'en' | 'fr',
      moduleName: lang === 'fr' ? module_.name_fr : module_.name_en,
      subSkill: {
        id: firstSubSkill.id,
        slug: firstSubSkill.slug,
        name_en: firstSubSkill.name_en,
        name_fr: firstSubSkill.name_fr,
      },
      question: {
        id: firstQuestion.id,
        body_en: firstQuestion.body_en,
        body_fr: firstQuestion.body_fr,
        rubric_strong: firstQuestion.rubric_strong,
        rubric_medium: firstQuestion.rubric_medium,
        rubric_weak: firstQuestion.rubric_weak,
        follow_up_probes: firstQuestion.follow_up_probes ?? [],
      },
      subSkillsCompleted: [],
      totalSubSkills: subSkills.length,
    })

    // Store opening turn (assistant message only, no user answer yet)
    await sb.from('session_turns').insert({
      session_id: session.id,
      user_id: user.id,
      turn_number: 0,
      question_id: firstQuestion.id,
      sub_skill_id: firstSubSkill.id,
      question_text: lang === 'fr' ? firstQuestion.body_fr : firstQuestion.body_en,
      answer_text: '',
    })

    return NextResponse.json({
      sessionId: session.id,
      openingMessage,
      currentSubSkillIdx: 0,
      totalSubSkills: subSkills.length,
      moduleNameEn: module_.name_en,
      moduleNameFr: module_.name_fr,
    })
  } catch (err) {
    console.error('Start error:', err)
    return NextResponse.json({ error: `Server error: ${err instanceof Error ? err.message : 'unknown'}` }, { status: 500 })
  }
}
