import { NextResponse } from 'next/server'

export async function GET() {
  const envChecks = {
    supabase_url:     !!process.env.NEXT_PUBLIC_SUPABASE_URL,
    supabase_anon:    !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    supabase_service: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    anthropic_key:    !!process.env.ANTHROPIC_API_KEY,
    stripe_secret:    !!process.env.STRIPE_SECRET_KEY,
  }

  // Actually ping Supabase auth — this is what hangs during login
  let supabasePing: { ok: boolean; ms: number | null; error?: string } = { ok: false, ms: null }
  if (envChecks.supabase_url) {
    const t0 = Date.now()
    const controller = new AbortController()
    const tid = setTimeout(() => controller.abort(), 5000)
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/health`,
        { signal: controller.signal, headers: { 'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY! } }
      )
      clearTimeout(tid)
      supabasePing = { ok: res.ok, ms: Date.now() - t0 }
    } catch (err) {
      clearTimeout(tid)
      const isTimeout = err instanceof Error && err.name === 'AbortError'
      supabasePing = {
        ok: false,
        ms: Date.now() - t0,
        error: isTimeout ? 'TIMEOUT after 5s — Supabase unreachable from this Vercel region' : String(err),
      }
      console.error('[health] Supabase ping failed:', supabasePing.error)
    }
  }

  const allOk = envChecks.supabase_url && envChecks.supabase_anon && envChecks.anthropic_key && supabasePing.ok

  return NextResponse.json({
    status: allOk ? 'ok' : 'degraded',
    env: envChecks,
    supabase_ping: supabasePing,
    message: allOk
      ? `All checks passed. Supabase responded in ${supabasePing.ms}ms.`
      : !envChecks.supabase_url || !envChecks.supabase_anon
        ? 'Missing Supabase env vars — set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in Vercel.'
        : !supabasePing.ok
          ? `Supabase auth unreachable: ${supabasePing.error ?? 'non-200 response'}. Login will hang or fail.`
          : 'ANTHROPIC_API_KEY missing — interview sessions will fail.',
  })
}
