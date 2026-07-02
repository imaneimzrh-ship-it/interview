import { NextRequest, NextResponse } from 'next/server'
import { getServerUser } from '@/lib/supabase/server'

export async function GET(req: NextRequest) {
  try {
    const { sb, user } = await getServerUser()
    if (!user) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 })

    const sessionId = req.nextUrl.searchParams.get('id')
    if (!sessionId) return NextResponse.json({ error: 'Session ID required.' }, { status: 400 })

    const { data: session } = await sb
      .from('interview_sessions')
      .select(`*, skill_modules(name_en, name_fr)`)
      .eq('id', sessionId)
      .eq('user_id', user.id)
      .single()

    if (!session) return NextResponse.json({ error: 'Session not found.' }, { status: 404 })

    const { data: report } = await sb
      .from('diagnostic_reports')
      .select('*')
      .eq('session_id', sessionId)
      .single()

    if (!report) return NextResponse.json({ error: 'Report not ready yet. The session may still be processing.' }, { status: 404 })

    return NextResponse.json({ report, session })
  } catch (err) {
    return NextResponse.json({ error: `Server error: ${err instanceof Error ? err.message : 'unknown'}` }, { status: 500 })
  }
}
