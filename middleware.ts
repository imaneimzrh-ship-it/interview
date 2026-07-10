import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

const PUBLIC_PREFIXES = ['/_next', '/favicon.ico', '/api', '/login', '/signup', '/pricing', '/privacy', '/terms', '/cv', '/reset-password']
const PUBLIC_EXACT = new Set(['/', '/login', '/signup', '/pricing', '/privacy', '/terms', '/cv', '/reset-password'])

function isPublic(pathname: string): boolean {
  if (PUBLIC_EXACT.has(pathname)) return true
  return PUBLIC_PREFIXES.some(p => pathname.startsWith(p))
}

export async function middleware(req: NextRequest) {
  const { pathname, search } = req.nextUrl

  // Force HTTPS
  if (req.headers.get('x-forwarded-proto') === 'http') {
    return NextResponse.redirect(`https://${req.nextUrl.host}${pathname}${search}`, 308)
  }

  // Build response early so Supabase can write refreshed cookies into it
  let res = NextResponse.next({ request: req })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => req.cookies.getAll(),
        setAll: (all: { name: string; value: string; options?: Record<string, unknown> }[]) => {
          all.forEach(({ name, value }) => req.cookies.set(name, value))
          res = NextResponse.next({ request: req })
          all.forEach(({ name, value, options }) => res.cookies.set(name, value, options as Parameters<typeof res.cookies.set>[2]))
        },
      },
    }
  )

  // getSession() reads the cookie and auto-refreshes the access token when expired.
  // The refreshed token is written back via setAll above, keeping the session alive.
  const { data: { session } } = await supabase.auth.getSession()

  if (!session && !isPublic(pathname)) {
    const loginUrl = new URL('/login', req.url)
    loginUrl.searchParams.set('next', pathname + search)
    return NextResponse.redirect(loginUrl)
  }

  return res
}

export const config = { matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'] }
