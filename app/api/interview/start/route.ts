import { NextRequest, NextResponse } from 'next/server'
import { getServerUser } from '@/lib/supabase/server'
import { adminClient } from '@/lib/supabase/admin'
import { openQuestion } from '@/lib/claude/interviewer'
import { SESSION_SUB_SKILLS, type SessionType } from '@/lib/credits'
import { trackServerEvent } from '@/lib/analytics'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { sb, user } = await getServerUser(req)
    if (!user) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 })

    const { module_slug, lang = 'en', session_type = 'full', job_description = '', resume: resumeRaw = '', interview_stage = 'general_practice', round_type = null, company_name = '' } = body
    if (!module_slug) return NextResponse.json({ error: 'module_slug required.' }, { status: 400 })

    // Require at least one of JD or resume (≥50 chars)
    const jd      = String(job_description).trim()
    const resume  = String(resumeRaw).trim()
    const company = String(company_name).trim().slice(0, 100)
    if (jd.length < 50 && resume.length < 50) {
      return NextResponse.json({ error: 'Please provide a job description or resume (at least 50 characters) to personalise the interview.' }, { status: 400 })
    }

    // Semantic check: reject obvious placeholder text and low-diversity content
    const PLACEHOLDER_PATTERNS = [/\blorem\s+ipsum\b/i, /^(.{1,15})\1{4,}/m, /^[a-z\s]{0,5}$/i]
    const combined = jd + ' ' + resume
    const uniqueWords = new Set((combined.toLowerCase().match(/\b[a-z]{3,}\b/g) ?? []))
    if (PLACEHOLDER_PATTERNS.some(p => p.test(combined)) || uniqueWords.size < 8) {
      return NextResponse.json({ error: 'Please paste a real job description or resume — the text you entered doesn\'t look like professional content.' }, { status: 400 })
    }

    // Injection guard
    const INJECT_PATTERNS = [/ignore (previous|above|all) instructions/i, /you are now/i, /system prompt/i, /disregard your/i]
    if (INJECT_PATTERNS.some(p => p.test(combined))) {
      return NextResponse.json({ error: 'Invalid content detected in job description or resume.' }, { status: 400 })
    }

    const type = (session_type === 'short' ? 'short' : 'full') as SessionType
    const maxSubSkills = SESSION_SUB_SKILLS[type]
    const sessionId = crypto.randomUUID()

    // ── Plan-based access gate ──
    const { data: profile } = await sb.from('profiles').select('plan, has_used_free_session').eq('id', user.id).single()
    const isPro = profile?.plan === 'pro'

    const FREE_MODULES = ['rag_system_design']
    if (!isPro && !FREE_MODULES.includes(module_slug)) {
      return NextResponse.json({ error: 'Pro plan required for this module.', upgrade: true }, { status: 403 })
    }

    // ── Free session cap: 1 session per account (DB-backed, not bypassable client-side) ──
    if (!isPro) {
      const { count } = await sb
        .from('interview_sessions')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id)
      if ((count ?? 0) >= 1) {
        return NextResponse.json({
          error: 'You\'ve used your free session. Upgrade to Pro for unlimited sessions across all modules.',
          upgrade: true,
        }, { status: 403 })
      }
    }

    // ── Rate limit: min 30 s between session starts, per account (DB-backed) ──
    // Prevents scripted/automated abuse regardless of Vercel instance count.
    {
      const { data: lastSession } = await sb
        .from('interview_sessions')
        .select('created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      if (lastSession) {
        const elapsed = Date.now() - new Date(lastSession.created_at).getTime()
        if (elapsed < 30_000) {
          return NextResponse.json({ error: 'Please wait a moment before starting another session.' }, { status: 429 })
        }
      }
    }

    // ── Pro fair-use ceiling: 100 sessions/month, invisible to normal users ──
    // Hard stop + internal alert at 20 sessions/day. Both checks use the DB so
    // they work correctly across all Vercel instances.
    if (isPro) {
      const now = new Date()
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
      const dayStart   = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString()

      const [{ count: monthCount }, { count: dayCount }] = await Promise.all([
        sb.from('interview_sessions').select('id', { count: 'exact', head: true })
          .eq('user_id', user.id).gte('created_at', monthStart),
        sb.from('interview_sessions').select('id', { count: 'exact', head: true })
          .eq('user_id', user.id).gte('created_at', dayStart),
      ])

      if ((monthCount ?? 0) >= 100) {
        return NextResponse.json({
          error: 'Your account has reached the monthly session limit. Contact support@sonneai.com to discuss your usage.',
        }, { status: 429 })
      }

      if ((dayCount ?? 0) >= 20) {
        // Internal alert only — Pro user still proceeds, this is a monitoring signal.
        console.error(`[ABUSE_ALERT] Pro user ${user.id} has started ${dayCount} sessions today (${new Date().toISOString()})`)
      }
    }

    // ── Technical coding exercise: bypass Q&A flow, assign a random exercise ──
    if (module_slug === 'technical_coding') {
      const { data: exercises } = await sb.from('exercises').select('id, title, difficulty').eq('role_track', 'ai_engineer')
      if (!exercises?.length) return NextResponse.json({ error: 'No exercises available.' }, { status: 500 })
      const exercise = exercises[Math.floor(Math.random() * exercises.length)]

      const { data: tcModule } = await sb.from('skill_modules').select('id, role_track_id').eq('slug', 'technical_coding').single()
      if (!tcModule) return NextResponse.json({ error: 'technical_coding module not found in DB — run migration 009.' }, { status: 500 })

      const { data: session, error: sErr } = await sb.from('interview_sessions').insert({
        id:                    sessionId,
        user_id:               user.id,
        role_track_id:         tcModule.role_track_id,
        skill_module_id:       tcModule.id,
        exercise_id:           exercise.id,
        language:              lang,
        modality:              'text',
        session_type:          type,
        max_sub_skills:        1,
        status:                'active',
        current_sub_skill_idx: 0,
        job_description:       jd      || null,
        resume_text:           resume  || null,
        company_name:          company || null,
        interview_stage,
        round_type:            round_type || null,
      }).select().single()

      if (sErr || !session) return NextResponse.json({ error: `Failed to create session: ${sErr?.message}` }, { status: 500 })

      if (!isPro) {
        await sb.from('profiles').update({ has_used_free_session: true }).eq('id', user.id)
      }

      void trackServerEvent(sb, {
        name: 'interview_session_started',
        user_id: user.id,
        session_id: session.id,
        module_slug: 'technical_coding',
        lang,
      })

      return NextResponse.json({
        sessionId:    session.id,
        exerciseId:   exercise.id,
        openingMessage: `Let's work through a hands-on coding exercise: **${exercise.title}** (${exercise.difficulty}). Read the task description on the left, write your fix in the editor, and click Run Tests when you're ready.`,
        totalSubSkills: 1,
        voiceEnabled:   false,
      })
    }

    // Load module + role track
    const { data: module_ } = await sb
      .from('skill_modules')
      .select(`*, role_tracks(id, slug), voice_enabled`)
      .eq('slug', module_slug)
      .eq('is_active', true)
      .single()

    if (!module_) {
      return NextResponse.json({ error: `Module "${module_slug}" not found.` }, { status: 404 })
    }

    // Load sub-skills capped by max_sub_skills
    const { data: allSubSkills } = await sb
      .from('sub_skills')
      .select(`*, questions(id, body_en, body_fr, slug, rubric_strong, rubric_medium, rubric_weak, follow_up_probes, question_type, starter_code, code_language)`)
      .eq('skill_module_id', module_.id)
      .order('display_order')

    if (!allSubSkills?.length) return NextResponse.json({ error: 'No sub-skills found for this module.' }, { status: 500 })

    const subSkills = allSubSkills.slice(0, maxSubSkills)
    const firstSubSkill = subSkills[0]
    const firstQuestion = firstSubSkill.questions?.[0]
    if (!firstQuestion) return NextResponse.json({ error: 'No question found.' }, { status: 500 })

    // Create session — store JD/resume so every subsequent turn can access them
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
        job_description:       jd      || null,
        resume_text:           resume  || null,
        company_name:          company || null,
        interview_stage,
        round_type:            round_type || null,
      })
      .select().single()

    if (sErr || !session) {
      console.error('Session create error:', sErr)
      return NextResponse.json({ error: `Failed to create session: ${sErr?.message ?? 'unknown'}` }, { status: 500 })
    }

    const candidateCtx = {
      jobDescription:  jd      || undefined,
      resume:          resume  || undefined,
      companyName:     company || undefined,
      interviewStage:  (interview_stage as 'general_practice' | 'interview_scheduled') || 'general_practice',
    }

    // Auto-save CV/JD to profile for pre-fill on next session (signed-in users only)
    sb.from('profiles').update({
      saved_resume_text:   resume  || null,
      saved_jd_text:       jd      || null,
      saved_company_name:  company || null,
      resume_updated_at:   new Date().toISOString(),
    }).eq('id', user.id).then(() => {}) // fire-and-forget, don't block session start

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
      candidateCtx,
      roundType: (round_type as import('@/lib/claude/interviewer').RoundType) ?? null,
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

    // Mark free session used on profile + device_signals
    if (!isPro) {
      await sb.from('profiles').update({ has_used_free_session: true }).eq('id', user.id)
      const deviceId: string | undefined = body.device_id
      if (deviceId) {
        await adminClient()
          .from('device_signals')
          .upsert({ device_id: deviceId, used_free_session: true, last_seen_at: new Date().toISOString() }, { onConflict: 'device_id' })
      }
    }

    void trackServerEvent(sb, {
      name: 'interview_session_started',
      user_id: user.id,
      session_id: session.id,
      module_slug,
      lang,
    })

    return NextResponse.json({
      sessionId:          session.id,
      openingMessage,
      currentSubSkillIdx: 0,
      totalSubSkills:     subSkills.length,
      moduleNameEn:       module_.name_en,
      moduleNameFr:       module_.name_fr,
      sessionType:        type,
      voiceEnabled:       module_.voice_enabled ?? true,
      questionType:       firstQuestion.question_type ?? 'text',
      starterCode:        firstQuestion.starter_code ?? null,
      codeLanguage:       firstQuestion.code_language ?? null,
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : JSON.stringify(err)
    console.error('Start error:', err)
    return NextResponse.json({ error: `Server error: ${msg}` }, { status: 500 })
  }
}
