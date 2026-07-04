import { NextRequest, NextResponse } from 'next/server'
import { getServerUser } from '@/lib/supabase/server'

export async function DELETE(req: NextRequest) {
  const { sb, user } = await getServerUser(req)
  if (!user) return NextResponse.json({ error: 'Not authenticated.' }, { status: 401 })

  const { error } = await sb.from('cvs').delete().eq('user_id', user.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ deleted: true })
}
