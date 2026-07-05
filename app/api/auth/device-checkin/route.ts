import { NextRequest, NextResponse } from 'next/server'
import { adminClient } from '@/lib/supabase/admin'

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}))
  const { device_id, user_id } = body as { device_id?: string; user_id?: string }

  if (!device_id || typeof device_id !== 'string' || device_id.length > 128) {
    return NextResponse.json({ ok: false })
  }

  const sb = adminClient()

  // Upsert device signal
  await sb.from('device_signals').upsert(
    { device_id, last_seen_at: new Date().toISOString() },
    { onConflict: 'device_id', ignoreDuplicates: false },
  )

  // Link device_id to profile if user_id provided
  if (user_id) {
    await sb.from('profiles')
      .update({ device_id })
      .eq('id', user_id)
      .is('device_id', null) // only set if not already set
  }

  // Check if this device has previously used a free session
  const { data } = await sb
    .from('device_signals')
    .select('used_free_session, account_count')
    .eq('device_id', device_id)
    .single()

  return NextResponse.json({
    ok: true,
    used_free_session: data?.used_free_session ?? false,
    account_count: data?.account_count ?? 1,
  })
}
