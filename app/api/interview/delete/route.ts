import { NextRequest, NextResponse } from 'next/server'
import { getServerUser } from '@/lib/supabase/server'

export async function DELETE(req: NextRequest) {
  try {
    const { sb, user } = await getServerUser(req)
    if (!user) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 })

    const sessionId = req.nextUrl.searchParams.get('id')
    if (!sessionId) return NextResponse.json({ error: 'Session ID required.' }, { status: 400 })

    // Verify ownership
    const { data: session } = await sb
      .from('interview_sessions')
      .select('id, user_id')
      .eq('id', sessionId)
      .eq('user_id', user.id)
      .single()

    if (!session) return NextResponse.json({ error: 'Session not found or not yours.' }, { status: 404 })

    // Delete cascade: turns, report, flags all cascade via FK
    const { error } = await sb
      .from('interview_sessions')
      .delete()
      .eq('id', sessionId)
      .eq('user_id', user.id)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ ok: true, message: 'Session and all associated data deleted.' })
  } catch (err) {
    return NextResponse.json({ error: `Server error: ${err instanceof Error ? err.message : 'unknown'}` }, { status: 500 })
  }
}
