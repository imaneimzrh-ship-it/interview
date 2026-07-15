import { NextRequest, NextResponse } from 'next/server'
import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { trackServerEvent } from '@/lib/analytics'

export async function GET(req: NextRequest) {
  const { searchParams, origin } = new URL(req.url)
  const token_hash = searchParams.get('token_hash')
  const type = searchParams.get('type') as 'email' | 'recovery' | 'invite' | null

  if (!token_hash || !type) {
    return NextResponse.redirect(
      `${origin}/login?message=${encodeURIComponent('Invalid confirmation link. Please sign up again.')}`
    )
  }

  const cookieStore = await cookies()
  const supabase = createServerClient(
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

  const { data, error } = await supabase.auth.verifyOtp({ token_hash, type })

  if (error) {
    return NextResponse.redirect(
      `${origin}/login?message=${encodeURIComponent('Confirmation link expired or already used. Please sign up again.')}`
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
        method: 'email',
      })
    }
  }

  return NextResponse.redirect(`${origin}/cv`)
}
