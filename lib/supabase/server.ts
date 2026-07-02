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

// Used by API routes: checks Authorization header first (reliable),
// then falls back to cookie-based session reading.
export async function getServerUser(req?: NextRequest) {
  // 1. Authorization header (sent explicitly by client for reliability)
  const authHeader = req?.headers.get('authorization')
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice(7)
    const admin = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    )
    const { data: { user }, error } = await admin.auth.getUser(token)
    if (user && !error) {
      // Return a regular client (anon key, RLS applies) scoped to this user's cookies
      const sb = await createClient()
      return { sb, user }
    }
  }

  // 2. Cookie-based fallback (getSession reads cookies without a network round-trip)
  const sb = await createClient()
  const { data: { session } } = await sb.auth.getSession()
  if (session?.user) return { sb, user: session.user }

  // 3. Final attempt with getUser (network call, most authoritative)
  const { data: { user } } = await sb.auth.getUser()
  return { sb, user }
}
