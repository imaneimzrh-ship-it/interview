import { createServerClient } from '@supabase/ssr'
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
        getAll: () => cookieStore.getAll(),
        setAll: (all: { name: string; value: string; options?: Parameters<typeof cookieStore.set>[2] }[]) => {
          try { all.forEach(({ name, value, options }) => cookieStore.set(name, value, options)) } catch {}
        },
      },
    }
  )
}

// Admin client for token verification (service role, bypasses RLS)
function adminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
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

export async function getServerUser(req?: NextRequest) {
  // 1. Authorization header (explicit from client, most reliable if available)
  const authHeader = req?.headers.get('authorization')
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice(7)
    const { data: { user }, error } = await adminClient().auth.getUser(token)
    if (user && !error) {
      return { sb: await createClient(), user }
    }
  }

  // 2. Direct cookie parsing (bypasses @supabase/ssr v0.3 getSession() bug)
  const token = await tokenFromCookie()
  if (token) {
    const { data: { user }, error } = await adminClient().auth.getUser(token)
    if (user && !error) {
      return { sb: await createClient(), user }
    }
  }

  return { sb: await createClient(), user: null }
}
