import { NextResponse, type NextRequest } from 'next/server'

// Routes that don't require authentication
const PUBLIC_PREFIXES = ['/_next', '/favicon.ico', '/api', '/login', '/signup', '/pricing', '/privacy', '/terms']
const PUBLIC_EXACT = new Set(['/', '/login', '/signup', '/pricing', '/privacy', '/terms'])

function isPublic(pathname: string): boolean {
  if (PUBLIC_EXACT.has(pathname)) return true
  return PUBLIC_PREFIXES.some(p => pathname.startsWith(p))
}

function hasAuthCookie(req: NextRequest): boolean {
  const cookies = req.cookies.getAll()
  // Supabase stores auth as sb-<ref>-auth-token (or chunked .0, .1, ...)
  return cookies.some(c => /^sb-.+-auth-token(\.0)?$/.test(c.name))
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
