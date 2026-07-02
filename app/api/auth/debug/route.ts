import { NextRequest, NextResponse } from 'next/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'

export async function GET(req: NextRequest) {
  const result: Record<string, unknown> = {}

  // 1. What cookies does the server see?
  const cookieStore = await cookies()
  const allCookies = cookieStore.getAll()
  result.cookies = allCookies.map(c => ({
    name: c.name,
    length: c.value.length,
    preview: c.value.slice(0, 40),
  }))
  result.hasSbCookie = allCookies.some(c => c.name.includes('auth-token'))

  // 2. Authorization header
  const authHeader = req.headers.get('authorization')
  result.hasAuthHeader = !!authHeader
  result.authHeaderPreview = authHeader ? authHeader.slice(0, 30) + '...' : null

  // 3. Try getSession from cookies
  try {
    const sb = await createClient()
    const { data: { session }, error } = await sb.auth.getSession()
    result.getSession = {
      hasSession: !!session,
      userId: session?.user?.id ?? null,
      email: session?.user?.email ?? null,
      tokenPreview: session?.access_token?.slice(0, 30) ?? null,
      error: error?.message ?? null,
    }
  } catch (e) {
    result.getSession = { error: String(e) }
  }

  // 4. Try Bearer token verification
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice(7)
    try {
      const admin = createSupabaseClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
      )
      const { data: { user }, error } = await admin.auth.getUser(token)
      result.bearerVerification = {
        ok: !!user,
        userId: user?.id ?? null,
        email: user?.email ?? null,
        error: error?.message ?? null,
      }
    } catch (e) {
      result.bearerVerification = { error: String(e) }
    }
  }

  // 5. Env check
  result.env = {
    supabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
    anonKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    serviceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
  }

  return NextResponse.json(result)
}
