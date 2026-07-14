import { NextRequest, NextResponse } from 'next/server'
import { adminClient } from '@/lib/supabase/admin'
import { getServerUser } from '@/lib/supabase/server'

// POST /api/comments/:id/like — account-gated
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user } = await getServerUser(req)
  if (!user) return NextResponse.json({ error: 'auth_required', action: 'signup' }, { status: 401 })

  const { id } = await params
  const sb = adminClient()

  const { data: comment } = await sb
    .from('report_comments')
    .select('id, like_count')
    .eq('id', id)
    .eq('status', 'visible')
    .maybeSingle()
  if (!comment) return NextResponse.json({ error: 'Comment not found' }, { status: 404 })

  await sb.from('comment_likes')
    .upsert({ comment_id: id, user_id: user.id }, { onConflict: 'comment_id,user_id', ignoreDuplicates: true })

  const { count } = await sb
    .from('comment_likes')
    .select('*', { count: 'exact', head: true })
    .eq('comment_id', id)

  await sb.from('report_comments').update({ like_count: count ?? comment.like_count }).eq('id', id)

  return NextResponse.json({ like_count: count ?? comment.like_count })
}
