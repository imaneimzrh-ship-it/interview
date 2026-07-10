import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const { searchParams, origin } = new URL(req.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/dashboard'

  if (code) {
    // Hand off to the client-side page which exchanges the code using the
    // browser Supabase client — it has access to the PKCE verifier in storage.
    return NextResponse.redirect(
      `${origin}/auth/callback?code=${encodeURIComponent(code)}&next=${encodeURIComponent(next)}`
    )
  }

  return NextResponse.redirect(
    `${origin}/login?message=${encodeURIComponent('Sign-in link expired or already used. Please try again.')}`
  )
}
