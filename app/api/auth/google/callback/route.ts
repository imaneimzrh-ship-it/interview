import { NextRequest, NextResponse } from 'next/server'
import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { trackServerEvent } from '@/lib/analytics'

export async function GET(req: NextRequest) {
  const { searchParams, origin } = new URL(req.url)
  const code = searchParams.get('code')
  const stateParam = searchParams.get('state')
  const errorParam = searchParams.get('error')

  if (errorParam) {
    return NextResponse.redirect(
      `${origin}/login?message=${encodeURIComponent('Google sign-in was cancelled.')}`
    )
  }

  if (!code) {
    return NextResponse.redirect(
      `${origin}/login?message=${encodeURIComponent('Google sign-in failed. Please try again.')}`
    )
  }

  let next = '/cv'
  try {
    if (stateParam) {
      const decoded = JSON.parse(Buffer.from(stateParam, 'base64url').toString())
      next = decoded.next ?? '/cv'
    }
  } catch {}

  const cookieStore = await cookies()
  const codeVerifier = cookieStore.get('_g_pkce')?.value

  if (!codeVerifier) {
    return NextResponse.redirect(
      `${origin}/login?message=${encodeURIComponent('Session expired. Please try signing in again.')}`
    )
  }

  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      redirect_uri: `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/google/callback`,
      grant_type: 'authorization_code',
      code_verifier: codeVerifier,
    }),
  })

  if (!tokenRes.ok) {
    console.error('Google token exchange failed:', await tokenRes.text())
    return NextResponse.redirect(
      `${origin}/login?message=${encodeURIComponent('Google sign-in failed. Please try again.')}`
    )
  }

  const { id_token } = await tokenRes.json()

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
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

  const { data, error } = await supabase.auth.signInWithIdToken({
    provider: 'google',
    token: id_token,
  })

  if (error) {
    console.error('Supabase signInWithIdToken error:', error)
    return NextResponse.redirect(
      `${origin}/login?message=${encodeURIComponent('Google sign-in failed. Please try again.')}`
    )
  }

  const user = data?.user
  if (user) {
    const createdAt = new Date(user.created_at).getTime()
    const isNewUser = Date.now() - createdAt < 120_000
    if (isNewUser) {
      void trackServerEvent(supabase, {
        name: 'signup_completed',
        user_id: user.id,
        method: 'google',
      })
    }
  }

  const response = NextResponse.redirect(`${origin}${next}`)
  response.cookies.delete('_g_pkce')
  return response
}
