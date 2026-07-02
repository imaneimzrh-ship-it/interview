'use client'
import { Suspense, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

function LoginForm() {
  const router  = useRouter()
  const params  = useSearchParams()
  const next    = params.get('next') ?? '/dashboard'
  const message = params.get('message')

  const [email,    setEmail]    = useState('')
  const [pw,       setPw]       = useState('')
  const [showPw,   setShowPw]   = useState(false)
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState('')
  const [resetSent,setResetSent]= useState(false)
  const [resetting,setResetting]= useState(false)

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    if (!email || !pw) { setError('Email and password are required.'); return }
    setLoading(true); setError('')

    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL.includes('xxxx')) {
      setError('Supabase is not configured. Visit /api/health to diagnose. You need to set NEXT_PUBLIC_SUPABASE_URL in Vercel environment variables.')
      setLoading(false); return
    }

    try {
      const sb = createClient()
      const timeout = new Promise<never>((_, rej) =>
        setTimeout(() => rej(new Error('Connection timed out. Supabase environment variables may not be set in Vercel. Go to Vercel Dashboard → Settings → Environment Variables.')), 10000)
      )
      const { error: err } = await Promise.race([
        sb.auth.signInWithPassword({ email: email.trim().toLowerCase(), password: pw }),
        timeout,
      ])
      if (err) {
        if (err.message.includes('Invalid login') || err.message.includes('invalid_grant')) {
          setError('Incorrect email or password. Check your credentials and try again.')
        } else if (err.message.includes('Email not confirmed')) {
          setError('Please confirm your email first. Check your inbox for a confirmation link.')
        } else if (err.message.includes('rate limit')) {
          setError('Too many login attempts. Please wait a few minutes before trying again.')
        } else {
          setError(err.message)
        }
        setLoading(false); return
      }
      router.push(next)
      router.refresh()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Unknown error')
      setLoading(false)
    }
  }

  async function handleForgotPassword() {
    if (!email) { setError('Enter your email address first, then click "Forgot password".'); return }
    setResetting(true); setError('')
    try {
      const sb = createClient()
      const { error: err } = await sb.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
        redirectTo: 'https://sonneai.com/api/auth/callback?next=/reset-password',
      })
      if (err) {
        const msg = err.message && err.message !== '{}' ? err.message : 'Could not send reset email. Make sure this email is registered.'
        setError(msg)
        setResetting(false)
        return
      }
      setResetSent(true)
    } catch {
      setError('Could not send reset email. Check your connection and try again.')
    } finally {
      setResetting(false)
    }
  }

  return (
    <div className="min-h-screen bg-bg flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 mb-6">
            <div className="w-8 h-8 rounded-xl bg-blue flex items-center justify-center text-white text-sm font-bold">S</div>
            <span className="font-semibold text-bright">Sonne AI</span>
          </Link>
          <h1 className="text-2xl font-semibold text-bright mb-1">Welcome back</h1>
          <p className="text-sm text-dim">Sign in to continue practicing</p>
        </div>

        <div className="card p-6">
          {message && (
            <div className="bg-blue-m border border-blue/20 rounded-lg px-3 py-2.5 text-xs text-blue mb-4 leading-relaxed">{message}</div>
          )}
          {resetSent && (
            <div className="bg-green-m border border-green/20 rounded-lg px-3 py-2.5 text-xs text-green mb-4">
              Password reset link sent to <strong>{email}</strong>. Check your inbox.
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4" noValidate>
            <div>
              <label className="block text-xs font-medium text-dim mb-1.5">Email address</label>
              <input className="input" type="email" placeholder="you@example.com"
                value={email} onChange={e => setEmail(e.target.value)}
                autoComplete="email" autoFocus required />
            </div>
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-medium text-dim">Password</label>
                <button type="button" onClick={handleForgotPassword} disabled={resetting}
                  className="text-xs text-blue hover:underline disabled:opacity-50">
                  {resetting ? 'Sending...' : 'Forgot password?'}
                </button>
              </div>
              <div className="relative">
                <input className="input pr-10" type={showPw ? 'text' : 'password'}
                  placeholder="Your password"
                  value={pw} onChange={e => setPw(e.target.value)}
                  autoComplete="current-password" required />
                <button type="button" onClick={() => setShowPw(!showPw)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-dim hover:text-bright">
                  {showPw ? 'Hide' : 'Show'}
                </button>
              </div>
            </div>

            {error && (
              <div className="bg-red-m border border-red/20 rounded-lg px-3 py-2.5 text-xs text-red leading-relaxed">
                {error}
                {(error.includes('environment') || error.includes('timed out')) && (
                  <div className="mt-2 space-y-1">
                    <p className="font-medium">How to fix:</p>
                    <p>1. Go to vercel.com → your project → Settings → Environment Variables</p>
                    <p>2. Add: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, ANTHROPIC_API_KEY</p>
                    <p>3. Redeploy</p>
                    <a href="/api/health" target="_blank" className="underline block mt-1">Run health check →</a>
                  </div>
                )}
              </div>
            )}

            <button type="submit" disabled={loading || !email || !pw} className="btn-blue w-full py-3 disabled:opacity-50">
              {loading
                ? <span className="flex items-center gap-2 justify-center">
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Signing in...
                  </span>
                : 'Sign in →'}
            </button>
          </form>

          <p className="text-center text-xs text-dim mt-4">
            No account?{' '}
            <Link href="/signup" className="text-blue hover:underline">Create one free</Link>
          </p>
        </div>

        <div className="mt-4 p-3 bg-muted/20 border border-border rounded-lg">
          <p className="text-xs text-dim text-center">
            If login keeps loading:{' '}
            <a href="/api/health" target="_blank" className="text-blue hover:underline">check setup status →</a>
          </p>
        </div>
      </div>
    </div>
  )
}

export default function Login() {
  return <Suspense fallback={null}><LoginForm /></Suspense>
}
