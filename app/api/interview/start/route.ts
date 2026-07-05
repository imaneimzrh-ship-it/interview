import { NextRequest, NextResponse } from 'next/server'
import { getServerUser } from '@/lib/supabase/server'
import { openQuestion } from '@/lib/claude/interviewer'
import { SESSION_SUB_SKILLS, type SessionType } from '@/lib/credits'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { sb, user } = await getServerUser(req)
    if (!user) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 })

    const { module_slug, lang = 'en', session_type = 'full' } = body
    if (!module_slug) return NextResponse.json({ error: 'module_slug required.' }, { status: 400 })

    const type = (session_type === 'short' ? 'short' : 'full') as SessionType
    const maxSubSkills = SESSION_SUB_SKILLS[type]
    const sessionId = crypto.randomUUID()

    // ── Plan-based access gate ──
    const { data: profile } = await sb.from('profiles').select('plan').eq('id', user.id).single()
    const isPro = profile?.plan === 'pro'

    const FREE_MODULES = ['rag_system_design']
    if (!isPro && !FREE_MODULES.includes(module_slug)) {
      return NextResponse.json({ error: 'Pro plan required for this module.', upgrade: true }, { status: 403 })
    }

    // Load module + role track
    const { data: module_ } = await sb
      .from('skill_modules')
      .select(`*, role_tracks(id, slug)`)
      .eq('slug', module_slug)
      .eq('is_active', true)
      .single()

    if (!module_) {
      return NextResponse.json({ error: `Module "${module_slug}" not found.` }, { status: 404 })
    }

    // Load sub-skills capped by max_sub_skills
    const { data: allSubSkills } = await sb
      .from('sub_skills')
      .select(`*, questions(*)`)
      .eq('skill_module_id', module_.id)
      .order('display_order')

    if (!allSubSkills?.length) return NextResponse.json({ error: 'No sub-skills found for this module.' }, { status: 500 })

    const subSkills = allSubSkills.slice(0, maxSubSkills)
    const firstSubSkill = subSkills[0]
    const firstQuestion = firstSubSkill.questions?.[0]
    if (!firstQuestion) return NextResponse.json({ error: 'No question found.' }, { status: 500 })

    // Create session with pre-generated ID
    const { data: session, error: sErr } = await sb
      .from('interview_sessions')
      .insert({
        id:                    sessionId,
        user_id:               user.id,
        role_track_id:         module_.role_tracks.id,
        skill_module_id:       module_.id,
        language:              lang,
        modality:              'text',
        session_type:          type,
        max_sub_skills:        maxSubSkills,
        status:                'active',
        current_sub_skill_idx: 0,
      })
      .select().single()

    if (sErr || !session) {
      console.error('Session create error:', sErr)
      return NextResponse.json({ error: `Failed to create session: ${sErr?.message ?? 'unknown'}` }, { status: 500 })
    }

    const openingMessage = await openQuestion({
      lang: lang as 'en' | 'fr',
      moduleName: lang === 'fr' ? module_.name_fr : module_.name_en,
      subSkill: {
        id: firstSubSkill.id, slug: firstSubSkill.slug,
        name_en: firstSubSkill.name_en, name_fr: firstSubSkill.name_fr,
      },
      question: {
        id: firstQuestion.id,
        body_en: firstQuestion.body_en, body_fr: firstQuestion.body_fr,
        rubric_strong: firstQuestion.rubric_strong, rubric_medium: firstQuestion.rubric_medium,
        rubric_weak: firstQuestion.rubric_weak, follow_up_probes: firstQuestion.follow_up_probes ?? [],
      },
      subSkillsCompleted: [],
      totalSubSkills: subSkills.length,
    })

    await sb.from('session_turns').insert({
      session_id:    session.id,
      user_id:       user.id,
      turn_number:   0,
      question_id:   firstQuestion.id,
      sub_skill_id:  firstSubSkill.id,
      question_text: lang === 'fr' ? firstQuestion.body_fr : firstQuestion.body_en,
      answer_text:   '',
    })

    return NextResponse.json({
      sessionId:          session.id,
      openingMessage,
      currentSubSkillIdx: 0,
      totalSubSkills:     subSkills.length,
      moduleNameEn:       module_.name_en,
      moduleNameFr:       module_.name_fr,
      sessionType:        type,
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : JSON.stringify(err)
    console.error('Start error:', err)
    return NextResponse.json({ error: `Server error: ${msg}` }, { status: 500 })
  }
}
