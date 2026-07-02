import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(req: NextRequest) {
  let res = NextResponse.next({ request: req })
  const sb = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => req.cookies.getAll(), setAll: (all: { name: string; value: string; options?: Parameters<typeof res.cookies.set>[2] }[]) => { all.forEach(({ name, value, options }) => res.cookies.set(name, value, options)) } } },
  )
  const { data: { user } } = await sb.auth.getUser()
  const path = req.nextUrl.pathname
  const protected_ = ['/dashboard', '/interview']
  if (protected_.some(p => path.startsWith(p)) && !user) {
    return NextResponse.redirect(new URL('/login?next=' + encodeURIComponent(path), req.url))
  }
  if ((path === '/login' || path === '/signup') && user) {
    return NextResponse.redirect(new URL('/dashboard', req.url))
  }
  return res
}

export const config = { matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'] }
