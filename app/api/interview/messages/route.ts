import { NextRequest, NextResponse } from 'next/server'
import { getServerUser } from '@/lib/supabase/server'

export async function GET(req: NextRequest) {
  try {
    const { sb, user } = await getServerUser()
    if (!user) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 })
    const sessionId = req.nextUrl.searchParams.get('sessionId')
    if (!sessionId) return NextResponse.json({ error: 'Session ID required.' }, { status: 400 })
    const { data } = await sb.from('interview_messages')
      .select('role, content, q_num, created_at')
      .eq('session_id', sessionId).eq('user_id', user.id)
      .order('created_at', { ascending: true })
    return NextResponse.json({ messages: data ?? [] })
  } catch (err) {
    return NextResponse.json({ error: 'Server error.' }, { status: 500 })
  }
}
