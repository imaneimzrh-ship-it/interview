import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { trackServerEvent } from '@/lib/analytics'

export async function GET(req: NextRequest) {
  const { searchParams, origin } = new URL(req.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/dashboard'

  if (!code) {
    return NextResponse.redirect(
      `${origin}/login?message=${encodeURIComponent('Sign-in link expired or already used. Please try again.')}`
    )
  }

  const cookieStore = await cookies()
  // @supabase/ssr v0.3.0 uses { get, set, remove } — getAll/setAll were added in v0.4
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
        set(name: string, value: string, options: Parameters<typeof cookieStore.set>[2]) {
          try { cookieStore.set(name, value, options) } catch {}
        },
        remove(name: string, options: Parameters<typeof cookieStore.set>[2]) {
          try { cookieStore.set(name, '', { ...options, maxAge: 0 }) } catch {}
        },
      },
    }
  )

  const { data: sessionData, error } = await supabase.auth.exchangeCodeForSession(code)

  if (error) {
    return NextResponse.redirect(
      `${origin}/login?message=${encodeURIComponent(error.message || 'Authentication failed. Please try again.')}`
    )
  }

  // Track signup only on first OAuth callback (new user — created_at ≈ updated_at)
  const user = sessionData?.user
  if (user) {
    const createdAt  = new Date(user.created_at).getTime()
    const isNewUser  = Date.now() - createdAt < 60_000 // within last 60s
    if (isNewUser) {
      void trackServerEvent(supabase, {
        name: 'signup_completed',
        user_id: user.id,
        method: user.app_metadata?.provider ?? 'oauth',
      })
    }
  }

  return NextResponse.redirect(`${origin}${next}`)
}
