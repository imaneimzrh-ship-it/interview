import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function POST(req: NextRequest) {
  try {
    const cookieStore = await cookies()
    const sb = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        cookies: {
          getAll: () => cookieStore.getAll(),
          setAll: (all: { name: string; value: string; options?: Parameters<typeof cookieStore.set>[2] }[]) => {
            try { all.forEach(({ name, value, options }) => cookieStore.set(name, value, options)) } catch {}
          },
        },
      }
    )

    const body = await req.json()
    const { name, ...properties } = body

    if (!name || typeof name !== 'string') {
      return NextResponse.json({ error: 'event name required' }, { status: 400 })
    }

    // Best-effort — don't block on this
    await sb.from('analytics_events').insert({ event_name: name, properties })
    return NextResponse.json({ ok: true })
  } catch {
    // Analytics endpoint must never 500 in a way that's visible to users
    return NextResponse.json({ ok: true })
  }
}
