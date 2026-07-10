import { NextResponse, type NextRequest } from 'next/server'

const PUBLIC_PREFIXES = ['/_next', '/favicon.ico', '/api', '/auth', '/login', '/signup', '/pricing', '/privacy', '/terms', '/cv', '/reset-password']
const PUBLIC_EXACT = new Set(['/', '/login', '/signup', '/pricing', '/privacy', '/terms', '/cv', '/reset-password'])

function isPublic(pathname: string): boolean {
  if (PUBLIC_EXACT.has(pathname)) return true
  return PUBLIC_PREFIXES.some(p => pathname.startsWith(p))
}

function hasAuthCookie(req: NextRequest): boolean {
  // Supabase stores auth as sb-<ref>-auth-token (or chunked .0, .1, ...)
  // The cookie contains both access token AND refresh token, so presence means
  // the user has a stored session. The browser-side Supabase client handles
  // refreshing the access token automatically when it expires.
  return req.cookies.getAll().some(c => /^sb-.+-auth-token/.test(c.name))
}

export async function middleware(req: NextRequest) {
  const { pathname, search } = req.nextUrl

  // Force HTTPS
  if (req.headers.get('x-forwarded-proto') === 'http') {
    return NextResponse.redirect(`https://${req.nextUrl.host}${pathname}${search}`, 308)
  }

  if (!isPublic(pathname) && !hasAuthCookie(req)) {
    const loginUrl = new URL('/login', req.url)
    loginUrl.searchParams.set('next', pathname + search)
    return NextResponse.redirect(loginUrl)
  }

  return NextResponse.next({ request: req })
}

export const config = { matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'] }
