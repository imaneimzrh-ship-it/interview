import { NextRequest, NextResponse } from 'next/server'
import { getServerUser } from '@/lib/supabase/server'
import { pickQuestions, AI_ROLES } from '@/lib/questions/bank'
import { openInterview } from '@/lib/claude/interview'

export async function POST(req: NextRequest) {
  try {
    const { sb, user } = await getServerUser()
    if (!user) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 })

    const { role, company = 'none' } = await req.json()
    if (!role) return NextResponse.json({ error: 'Role is required.' }, { status: 400 })

    const isAiRole = AI_ROLES.includes(role)

    // Plan check
    const { data: profile } = await sb.from('profiles').select('plan, trial_used').eq('id', user.id).single()
    if (!profile) return NextResponse.json({ error: 'Profile not found.' }, { status: 404 })
    if (isAiRole && profile.plan !== 'pro') return NextResponse.json({ error: 'AI role interviews require Pro. Upgrade for $19/month.', upgrade: true }, { status: 403 })
    if (profile.plan === 'free' && profile.trial_used >= 2) return NextResponse.json({ error: 'Free tier limit reached. Upgrade to Pro for unlimited sessions.', upgrade: true }, { status: 403 })

    // Pick questions
    const questions = pickQuestions(role, company, 10)
    if (!questions.length) return NextResponse.json({ error: 'No questions found for this role.' }, { status: 400 })

    // Create session
    const { data: session, error: sessionErr } = await sb
      .from('interview_sessions')
      .insert({ user_id: user.id, role, company, is_ai_role: isAiRole, q_total: questions.length, status: 'active' })
      .select().single()

    if (sessionErr || !session) {
      console.error('Session creation error:', sessionErr)
      return NextResponse.json({ error: 'Failed to create session. Check Supabase connection.' }, { status: 500 })
    }

    // Get first AI message
    const firstMsg = await openInterview(questions[0], 1, questions.length, company)

    // Store first message
    await sb.from('interview_messages').insert({
      session_id: session.id, user_id: user.id,
      role: 'assistant', content: firstMsg, q_num: 1,
    })

    // Increment trial counter for free users
    if (profile.plan === 'free') {
      await sb.from('profiles').update({ trial_used: profile.trial_used + 1 }).eq('id', user.id)
    }

    return NextResponse.json({
      sessionId: session.id,
      firstMessage: firstMsg,
      questionIds: questions.map(q => q.id),
      totalQuestions: questions.length,
    })
  } catch (err) {
    console.error('Start error:', err)
    return NextResponse.json({ error: `Server error: ${err instanceof Error ? err.message : 'Unknown error'}` }, { status: 500 })
  }
}
