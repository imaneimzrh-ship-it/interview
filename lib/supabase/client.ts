import { createBrowserClient } from '@supabase/ssr'

// No custom cookie implementation — @supabase/ssr handles PKCE verifier
// storage correctly using document.cookie without encoding. A custom
// encodeURIComponent on set / decodeURIComponent on get mismatch caused the
// server callback to see a differently-encoded verifier and fail PKCE exchange.
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
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
