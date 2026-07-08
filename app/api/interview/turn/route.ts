import { NextRequest, NextResponse } from 'next/server'
import { getServerUser } from '@/lib/supabase/server'
import { conductTurn, type CandidateContext } from '@/lib/claude/interviewer'
import { gradeAnswer } from '@/lib/claude/grader'

export async function POST(req: NextRequest) {
  try {
    const { sb, user } = await getServerUser(req)
    if (!user) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 })

    const { sessionId, userMessage, currentSubSkillIdx, inputType } = await req.json()
    if (!sessionId || !userMessage) return NextResponse.json({ error: 'Missing fields.' }, { status: 400 })

    // Load session
    const { data: session } = await sb
      .from('interview_sessions')
      .select(`*, skill_modules(name_en, name_fr, voice_enabled), max_sub_skills, job_description, resume_text`)
      .eq('id', sessionId).eq('user_id', user.id).single()

    if (!session) return NextResponse.json({ error: 'Session not found.' }, { status: 404 })
    if (session.status !== 'active') return NextResponse.json({ error: 'Session is not active.' }, { status: 400 })
    if (inputType === 'voice' && session.skill_modules?.voice_enabled === false) {
      return NextResponse.json({ error: 'Voice input is not available for this module.' }, { status: 400 })
    }

    // Load sub-skills + questions
    const { data: subSkills } = await sb
      .from('sub_skills')
      .select(`*, questions(*)`)
      .eq('skill_module_id', session.skill_module_id)
      .order('display_order')

    if (!subSkills?.length) return NextResponse.json({ error: 'No sub-skills found.' }, { status: 500 })

    // Respect max_sub_skills for short sessions
    const effectiveTotal = Math.min(subSkills.length, (session as any).max_sub_skills ?? subSkills.length)

    const currentSubSkill = subSkills[currentSubSkillIdx]
    const currentQuestion = currentSubSkill?.questions?.[0]
    if (!currentSubSkill || !currentQuestion) return NextResponse.json({ error: 'Sub-skill not found.' }, { status: 404 })

    // Load conversation history for this sub-skill
    const { data: turns } = await sb
      .from('session_turns')
      .select('question_text, answer_text, turn_number')
      .eq('session_id', sessionId)
      .eq('sub_skill_id', currentSubSkill.id)
      .order('turn_number')

    // Reconstruct message history
    const history = (turns ?? []).flatMap(t => {
      const msgs = []
      if (t.question_text) msgs.push({ role: 'assistant' as const, content: t.question_text })
      if (t.answer_text)   msgs.push({ role: 'user' as const,      content: t.answer_text })
      return msgs
    })

    const lang = session.language as 'en' | 'fr'
    const moduleName = lang === 'fr' ? session.skill_modules.name_fr : session.skill_modules.name_en

    // Build candidate context from JD/resume stored at session creation
    const candidateCtx: CandidateContext | undefined =
      session.job_description || session.resume_text
        ? { jobDescription: session.job_description ?? undefined, resume: session.resume_text ?? undefined }
        : undefined

    // Run interviewer + grader in parallel
    const [turnResult, gradeResult] = await Promise.all([
      conductTurn({
        lang,
        moduleName,
        subSkill: { id: currentSubSkill.id, slug: currentSubSkill.slug, name_en: currentSubSkill.name_en, name_fr: currentSubSkill.name_fr },
        question: {
          id: currentQuestion.id,
          body_en: currentQuestion.body_en,
          body_fr: currentQuestion.body_fr,
          rubric_strong: currentQuestion.rubric_strong,
          rubric_medium: currentQuestion.rubric_medium,
          rubric_weak: currentQuestion.rubric_weak,
          follow_up_probes: currentQuestion.follow_up_probes ?? [],
        },
        history,
        userMessage,
        subSkillsCompleted: session.sub_skills_covered ?? [],
        totalSubSkills: subSkills.length,
        candidateCtx,
      }),
      gradeAnswer({
        subSkill: { id: currentSubSkill.id, slug: currentSubSkill.slug, name_en: currentSubSkill.name_en, name_fr: currentSubSkill.name_fr },
        question: {
          id: currentQuestion.id,
          body_en: currentQuestion.body_en,
          body_fr: currentQuestion.body_fr,
          rubric_strong: currentQuestion.rubric_strong,
          rubric_medium: currentQuestion.rubric_medium,
          rubric_weak: currentQuestion.rubric_weak,
          follow_up_probes: currentQuestion.follow_up_probes ?? [],
        },
        moduleName: session.skill_modules.name_en, // grader always gets EN context
        answerText: userMessage,
        conversationContext: history.map(m => `${m.role === 'assistant' ? 'INTERVIEWER' : 'CANDIDATE'}: ${m.content}`).join('\n'),
      }),
    ])

    // Store turn with grade
    const turnCount = (turns?.length ?? 0)
    await sb.from('session_turns').insert({
      session_id: sessionId,
      user_id: user.id,
      turn_number: turnCount + 1,
      question_id: currentQuestion.id,
      sub_skill_id: currentSubSkill.id,
      question_text: turnResult.response,
      answer_text: userMessage,
      grade_score: gradeResult.score,
      grade_evidence: gradeResult.evidence_quote,
      grade_rationale: gradeResult.rationale,
      grade_gaps: gradeResult.gaps,
      grade_strengths: gradeResult.strengths,
      follow_up_used: gradeResult.follow_up_warranted,
      grade_tradeoff_score: gradeResult.tradeoff_score,
      grade_tradeoff_note: gradeResult.tradeoff_note,
    })

    let nextSubSkillIdx = currentSubSkillIdx
    let nextOpeningMessage: string | undefined

    if (turnResult.shouldAdvance) {
      // Mark sub-skill complete
      const covered = [...(session.sub_skills_covered ?? []), currentSubSkill.slug]
      nextSubSkillIdx = currentSubSkillIdx + 1

      if (!turnResult.isComplete && nextSubSkillIdx < effectiveTotal) {
        const nextSS = subSkills[nextSubSkillIdx]
        const nextQ  = nextSS.questions?.[0]

        if (nextQ) {
          // Import lazily to avoid circular dep
          const { openQuestion } = await import('@/lib/claude/interviewer')
          nextOpeningMessage = await openQuestion({
            lang,
            moduleName,
            subSkill: { id: nextSS.id, slug: nextSS.slug, name_en: nextSS.name_en, name_fr: nextSS.name_fr },
            question: {
              id: nextQ.id, body_en: nextQ.body_en, body_fr: nextQ.body_fr,
              rubric_strong: nextQ.rubric_strong, rubric_medium: nextQ.rubric_medium, rubric_weak: nextQ.rubric_weak,
              follow_up_probes: nextQ.follow_up_probes ?? [],
            },
            subSkillsCompleted: covered,
            totalSubSkills: effectiveTotal,
            candidateCtx,
          })
        }
      }

      await sb.from('interview_sessions').update({
        sub_skills_covered: [...(session.sub_skills_covered ?? []), currentSubSkill.slug],
        current_sub_skill_idx: nextSubSkillIdx,
        turn_count: (session.turn_count ?? 0) + 1,
        ...(turnResult.isComplete ? { status: 'completed', completed_at: new Date().toISOString() } : {}),
      }).eq('id', sessionId)
    }

    return NextResponse.json({
      aiResponse: turnResult.response,
      shouldAdvance: turnResult.shouldAdvance,
      isComplete: turnResult.isComplete,
      nextSubSkillIdx,
      nextOpeningMessage,
      grade: {
        score: gradeResult.score,
        // Only return grade details to the client after the session ends
        // (prevents gaming the system mid-session)
      },
    })
  } catch (err) {
    console.error('Turn error:', err)
    return NextResponse.json({ error: `Server error: ${err instanceof Error ? err.message : 'unknown'}` }, { status: 500 })
  }
}
