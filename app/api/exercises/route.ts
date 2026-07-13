import { NextRequest, NextResponse } from 'next/server'
import { getServerUser } from '@/lib/supabase/server'

export async function GET(req: NextRequest) {
  try {
    const { sb, user } = await getServerUser(req)
    if (!user) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 })

    const { data: exercises, error } = await sb
      .from('exercises')
      .select('id, title, difficulty, language')
      .eq('role_track', 'ai_engineer')
      .order('created_at', { ascending: true })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ exercises: exercises ?? [] })
  } catch (e: unknown) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
