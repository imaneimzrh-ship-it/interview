import { NextRequest, NextResponse } from 'next/server'
import { getServerUser } from '@/lib/supabase/server'

export async function GET(req: NextRequest) {
  try {
    const { sb, user } = await getServerUser()
    if (!user) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 })
    const id = req.nextUrl.searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'Session ID required.' }, { status: 400 })
    const { data } = await sb.from('interview_sessions').select('*').eq('id', id).eq('user_id', user.id).single()
    if (!data) return NextResponse.json({ error: 'Session not found.' }, { status: 404 })
    return NextResponse.json({ session: data })
  } catch (err) {
    return NextResponse.json({ error: 'Server error.' }, { status: 500 })
  }
}
