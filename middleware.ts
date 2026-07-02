import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(req: NextRequest) {
  // Force HTTPS so session cookies (Secure flag) are always stored
  if (req.headers.get('x-forwarded-proto') === 'http') {
    return NextResponse.redirect(`https://${req.nextUrl.host}${req.nextUrl.pathname}${req.nextUrl.search}`, 308)
  }
  return NextResponse.next({ request: req })
}

export const config = { matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'] }
