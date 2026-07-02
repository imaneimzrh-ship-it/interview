import { NextResponse } from 'next/server'

export async function GET() {
  const checks = {
    supabase_url:    !!process.env.NEXT_PUBLIC_SUPABASE_URL,
    supabase_anon:   !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    supabase_service:!!process.env.SUPABASE_SERVICE_ROLE_KEY,
    anthropic_key:   !!process.env.ANTHROPIC_API_KEY,
    stripe_secret:   !!process.env.STRIPE_SECRET_KEY,
    stripe_pub:      !!process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
  }
  const allOk = checks.supabase_url && checks.supabase_anon && checks.anthropic_key
  return NextResponse.json({
    status: allOk ? 'ok' : 'missing_env_vars',
    checks,
    message: allOk
      ? 'All required environment variables are set.'
      : 'Some environment variables are missing. Auth will fail until NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, and ANTHROPIC_API_KEY are set in Vercel.',
  })
}
