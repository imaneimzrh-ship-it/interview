import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          if (typeof document === 'undefined') return []
          return document.cookie.split(';').reduce<{ name: string; value: string }[]>((acc, c) => {
            const eq = c.indexOf('=')
            if (eq < 0) return acc
            acc.push({ name: c.slice(0, eq).trim(), value: decodeURIComponent(c.slice(eq + 1).trim()) })
            return acc
          }, [])
        },
        setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
          if (typeof document === 'undefined') return
          cookiesToSet.forEach(({ name, value, options }) => {
            let cookie = `${name}=${encodeURIComponent(value)}; path=${options?.path ?? '/'}`
            if (options?.maxAge != null) cookie += `; max-age=${options.maxAge}`
            if (options?.sameSite)      cookie += `; samesite=${String(options.sameSite).toLowerCase()}`
            if (options?.secure)        cookie += `; secure`
            document.cookie = cookie
          })
        },
      },
    }
  )
}

export async function getProfile(userId: string) {
  const sb = createClient()
  const { data } = await sb.from('profiles').select('*').eq('id', userId).single()
  return data
}

export async function canStartSession(userId: string, isAiRole: boolean) {
  const profile = await getProfile(userId)
  if (!profile) return { ok: false, reason: 'Profile not found.' }
  if (profile.plan === 'pro') return { ok: true }
  if (isAiRole) return { ok: false, reason: 'AI role interviews require Pro. Upgrade for $19/month.' }
  if (profile.trial_used >= 2) return { ok: false, reason: 'You have used both free sessions. Upgrade to Pro for unlimited access.' }
  return { ok: true }
}
