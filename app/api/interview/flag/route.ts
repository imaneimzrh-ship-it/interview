import { NextRequest, NextResponse } from 'next/server'
import { getServerUser } from '@/lib/supabase/server'

// POST /api/interview/flag — flag a question or diagnosis line
export async function POST(req: NextRequest) {
  try {
    const { sb, user } = await getServerUser()
    if (!user) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 })

    const { sessionId, targetType, targetId, note } = await req.json()
    if (!sessionId || !targetType || !targetId) {
      return NextResponse.json({ error: 'sessionId, targetType, and targetId required.' }, { status: 400 })
    }

    if (!['question','diagnosis','turn'].includes(targetType)) {
      return NextResponse.json({ error: 'Invalid targetType.' }, { status: 400 })
    }

    await sb.from('feedback_flags').insert({
      user_id: user.id,
      session_id: sessionId,
      target_type: targetType,
      target_id: targetId,
      note: note ?? null,
    })

    return NextResponse.json({ ok: true })
  } catch (err) {
    return NextResponse.json({ error: `Server error: ${err instanceof Error ? err.message : 'unknown'}` }, { status: 500 })
  }
}
