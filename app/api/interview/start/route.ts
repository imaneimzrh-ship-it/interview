import { NextRequest, NextResponse } from 'next/server'
import { getServerUser } from '@/lib/supabase/server'
import { adminClient } from '@/lib/supabase/admin'
import { openQuestion } from '@/lib/claude/interviewer'
import { CreditService, InsufficientCreditsError, CREDIT_COSTS, SESSION_SUB_SKILLS, type SessionType } from '@/lib/credits'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { sb, user } = await getServerUser(req)
    if (!user) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 })

    const { module_slug, lang = 'en', session_type = 'full' } = body
    if (!module_slug) return NextResponse.json({ error: 'module_slug required.' }, { status: 400 })

    const type = (session_type === 'short' ? 'short' : 'full') as SessionType
    const cost = CREDIT_COSTS[type]
    const maxSubSkills = SESSION_SUB_SKILLS[type]

    // Pre-generate the session UUID so it doubles as the idempotency key for the
    // credit deduction. If the session insert later fails we refund.
    const sessionId = crypto.randomUUID()
    const adminSb = adminClient()

    // ── Credit check + deduction (atomic, server-side, inside DB transaction) ──
    try {
      await CreditService.chargeCredits(adminSb, user.id, cost, sessionId)
    } catch (e) {
      if (e instanceof InsufficientCreditsError) {
        return NextResponse.json({
          error:   'insufficient_credits',
          balance: e.balance,
          needed:  e.needed,
          upgrade: true,
        }, { status: 402 })
      }
      throw e
    }

    // Load module + role track
    const { data: module_ } = await sb
      .from('skill_modules')
      .select(`*, role_tracks(id, slug)`)
      .eq('slug', module_slug)
      .eq('is_active', true)
      .single()

    if (!module_) {
      // Refund — charge succeeded but we can't proceed
      try {
        await adminSb.from('credits_ledger').insert({
          user_id: user.id, delta: cost, reason: 'purchase',
          reference_id: `refund_${sessionId}`,
        })
      } catch { /* best-effort refund */ }
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
      try {
        await adminSb.from('credits_ledger').insert({
          user_id: user.id, delta: cost, reason: 'purchase',
          reference_id: `refund_${sessionId}`,
        })
      } catch { /* best-effort refund */ }
      return NextResponse.json({ error: 'Failed to create session.' }, { status: 500 })
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
    console.error('Start error:', err)
    return NextResponse.json({ error: `Server error: ${err instanceof Error ? err.message : 'unknown'}` }, { status: 500 })
  }
}
