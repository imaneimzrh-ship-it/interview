import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { type NextRequest } from 'next/server'

export async function createClient() {
  const cookieStore = await cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {}
        },
      },
    }
  )
}

// Admin client — token verification only, not for data queries
function adminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

// Anon client with the user's JWT injected → RLS resolves auth.uid() correctly
function authedClient(accessToken: string) {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { global: { headers: { Authorization: `Bearer ${accessToken}` } } }
  )
}

// Extract access_token directly from the Supabase auth cookie.
// @supabase/ssr v0.3 stores sessions as plain JSON but getSession() fails
// to parse them — so we read the cookie value ourselves.
async function tokenFromCookie(): Promise<string | null> {
  try {
    const cookieStore = await cookies()
    const allCookies = cookieStore.getAll()

    // Cookie name: sb-<project-ref>-auth-token (or chunked: .0, .1, ...)
    const single = allCookies.find(c => /^sb-.+-auth-token$/.test(c.name))
    if (single) {
      const raw = decodeURIComponent(single.value)
      const parsed = JSON.parse(raw)
      return parsed?.access_token ?? null
    }

    // Reassemble chunked cookies
    const chunks: string[] = []
    for (let i = 0; ; i++) {
      const chunk = allCookies.find(c => c.name.endsWith(`-auth-token.${i}`))
      if (!chunk) break
      chunks.push(chunk.value)
    }
    if (chunks.length) {
      const raw = decodeURIComponent(chunks.join(''))
      const parsed = JSON.parse(raw)
      return parsed?.access_token ?? null
    }
  } catch {}
  return null
}

// Verify a JWT with a hard 5-second timeout.
// Root cause of post-login hangs: admin.auth.getUser() uses fetch with no timeout.
// On a slow/cold Supabase free-tier, the /auth/v1/user call can hang 30s+,
// blocking every authenticated API route.
async function verifyToken(admin: ReturnType<typeof adminClient>, token: string) {
  const controller = new AbortController()
  const tid = setTimeout(() => controller.abort(), 5000)
  try {
    const result = await admin.auth.getUser(token)
    clearTimeout(tid)
    return result
  } catch (err) {
    clearTimeout(tid)
    const isTimeout = err instanceof Error && err.name === 'AbortError'
    console.error('[getServerUser] auth.getUser failed:', isTimeout ? 'TIMEOUT (5s)' : err)
    return { data: { user: null }, error: err }
  }
}

export async function getServerUser(req?: NextRequest) {
  const admin = adminClient()

  // 1. Authorization header (explicit from client)
  const authHeader = req?.headers.get('authorization')
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice(7)
    const { data: { user }, error } = await verifyToken(admin, token)
    if (user && !error) {
      return { sb: authedClient(token), user }
    }
    if (error) console.error('[getServerUser] Bearer token verify failed:', error)
  }

  // 2. Direct cookie parsing — bypasses @supabase/ssr v0.3 getSession() bug
  //    (cookie exists but getSession() returns null due to library parsing failure)
  const token = await tokenFromCookie()
  if (token) {
    const { data: { user }, error } = await verifyToken(admin, token)
    if (user && !error) {
      return { sb: authedClient(token), user }
    }
    if (error) console.error('[getServerUser] cookie token verify failed:', error)
  }

  return { sb: await createClient(), user: null }
}
