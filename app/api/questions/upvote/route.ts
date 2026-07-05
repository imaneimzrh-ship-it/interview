import { NextRequest, NextResponse } from 'next/server'
import { getServerUser } from '@/lib/supabase/server'
import { adminClient } from '@/lib/supabase/admin'

export async function POST(req: NextRequest) {
  const { user } = await getServerUser(req)
  if (!user) return NextResponse.json({ error: 'Sign in required.' }, { status: 401 })

  const { id } = await req.json()
  if (!id) return NextResponse.json({ error: 'id required.' }, { status: 400 })

  const { error } = await adminClient()
    .rpc('increment_upvotes', { row_id: id })

  // Fallback if RPC not available: manual increment
  if (error) {
    const { data: current } = await adminClient()
      .from('question_reports')
      .select('upvotes')
      .eq('id', id)
      .single()
    const { error: updateErr } = await adminClient()
      .from('question_reports')
      .update({ upvotes: (current?.upvotes ?? 0) + 1 })
      .eq('id', id)
    if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
