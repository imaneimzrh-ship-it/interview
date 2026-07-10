'use client'
import { Suspense, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

function LoginForm() {
  const params  = useSearchParams()
  const next    = params.get('next') ?? '/dashboard'
  const message = params.get('message')

  const [email,       setEmail]       = useState('')
  const [pw,          setPw]          = useState('')
  const [showPw,      setShowPw]      = useState(false)
  const [loading,     setLoading]     = useState(false)
  const [redirecting, setRedirecting] = useState(false)
  const [error,       setError]       = useState('')
  const [resetSent,   setResetSent]   = useState(false)
  const [resetting,   setResetting]   = useState(false)
  const [magicSent,   setMagicSent]   = useState(false)
  const [magicLoading, setMagicLoading] = useState(false)
  const [mode,        setMode]        = useState<'password' | 'magic'>('password')

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    if (!email || !pw) { setError('Email and password are required.'); return }
    setLoading(true); setError('')

    try {
      const sb = createClient()
      const authCall = sb.auth.signInWithPassword({ email: email.trim().toLowerCase(), password: pw })
      const timeout  = new Promise<never>((_, rej) =>
        setTimeout(() => rej(new Error('Sign-in timed out. Please try again.')), 8000)
      )
      const { error: err } = await Promise.race([authCall, timeout])

      if (err) {
        if (err.message.includes('Invalid login') || err.message.includes('invalid_grant')) {
          setError('Incorrect email or password.')
        } else if (err.message.includes('Email not confirmed')) {
          setError('Please confirm your email first — check your inbox.')
        } else if (err.message.includes('rate limit')) {
          setError('Too many attempts. Wait a few minutes and try again.')
        } else {
          setError(err.message)
        }
        setLoading(false); return
      }

      setLoading(false)
      setRedirecting(true)
      window.location.href = next
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Unknown error. Please try again.')
      setLoading(false)
    }
  }

  async function handleMagicLink(e: React.FormEvent) {
    e.preventDefault()
    if (!email) { setError('Enter your email address first.'); return }
    setMagicLoading(true); setError('')
    try {
      const sb = createClient()
      const { error: err } = await sb.auth.signInWithOtp({
        email: email.trim().toLowerCase(),
        options: { emailRedirectTo: `https://sonneai.com/api/auth/callback?next=${encodeURIComponent(next)}` },
      })
      if (err) { setError(err.message); setMagicLoading(false); return }
      setMagicSent(true)
    } catch {
      setError('Could not send magic link. Please try again.')
    } finally {
      setMagicLoading(false)
    }
  }

  async function handleForgotPassword() {
    if (!email) { setError('Enter your email address first, then click "Forgot password".'); return }
    setResetting(true); setError('')
    try {
      const sb = createClient()
      const { error: err } = await sb.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
        redirectTo: 'https://sonneai.com/reset-password',
      })
      if (err) { setError(err.message && err.message !== '{}' ? err.message : 'Could not send reset email.'); return }
      setResetSent(true)
    } catch {
      setError('Could not send reset email. Check your connection and try again.')
    } finally {
      setResetting(false)
    }
  }

  const busy = loading || redirecting

  if (magicSent) return (
    <div className="min-h-screen bg-bg flex items-center justify-center px-4">
      <div className="w-full max-w-sm text-center">
        <div className="w-14 h-14 rounded-2xl bg-[#1E2A44] flex items-center justify-center text-white text-2xl mx-auto mb-5">✉️</div>
        <h1 className="text-xl font-semibold text-bright mb-2">Check your inbox</h1>
        <p className="text-sm text-dim mb-1">We sent a sign-in link to</p>
        <p className="text-sm font-semibold text-bright mb-6">{email}</p>
        <p className="text-xs text-dim mb-4">Click the link in the email to sign in. It expires in 1 hour.</p>
        <button onClick={() => { setMagicSent(false); setError('') }}
          className="text-xs text-blue hover:underline">
          ← Back to sign in
        </button>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-bg flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 mb-6">
            <div className="w-8 h-8 rounded-xl bg-[#1E2A44] flex items-center justify-center text-white text-sm font-bold">S</div>
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
          {redirecting && (
            <div className="bg-green-m border border-green/20 rounded-lg px-3 py-2.5 text-xs text-green mb-4 flex items-center gap-2">
              <span className="w-3 h-3 border-2 border-green/30 border-t-green rounded-full animate-spin inline-block flex-shrink-0" />
              Signed in — redirecting…
              <Link href={next} className="ml-auto underline text-green font-medium whitespace-nowrap">Go now →</Link>
            </div>
          )}

          {/* Mode toggle */}
          <div className="flex gap-1 bg-[#13131A] rounded-lg p-0.5 mb-5">
            {(['password', 'magic'] as const).map(m => (
              <button key={m} type="button"
                onClick={() => { setMode(m); setError('') }}
                className="flex-1 py-2 rounded-md text-xs font-medium transition-all"
                style={{
                  background: mode === m ? '#1E2A44' : 'transparent',
                  color:      mode === m ? '#fff'    : '#7A829A',
                }}>
                {m === 'password' ? '🔑 Password' : '✉️ Email link'}
              </button>
            ))}
          </div>

          {mode === 'password' ? (
            <form onSubmit={handleLogin} className="space-y-4" noValidate>
              <div>
                <label className="block text-xs font-medium text-dim mb-1.5">Email address</label>
                <input className="input" type="email" placeholder="you@example.com"
                  value={email} onChange={e => setEmail(e.target.value)}
                  autoComplete="email" autoFocus required disabled={busy} />
              </div>
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-medium text-dim">Password</label>
                  <button type="button" onClick={handleForgotPassword} disabled={resetting || busy}
                    className="text-xs text-blue hover:underline disabled:opacity-50">
                    {resetting ? 'Sending...' : 'Forgot password?'}
                  </button>
                </div>
                <div className="relative">
                  <input className="input pr-10" type={showPw ? 'text' : 'password'}
                    placeholder="Your password"
                    value={pw} onChange={e => setPw(e.target.value)}
                    autoComplete="current-password" required disabled={busy} />
                  <button type="button" onClick={() => setShowPw(!showPw)} disabled={busy}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-dim hover:text-bright">
                    {showPw ? 'Hide' : 'Show'}
                  </button>
                </div>
              </div>

              {error && (
                <div className="bg-red-m border border-red/20 rounded-lg px-3 py-2.5 text-xs text-red leading-relaxed">{error}</div>
              )}

              {!redirecting && (
                <button type="submit" disabled={busy || !email || !pw} className="btn btn-md btn-primary w-full py-3 disabled:opacity-50">
                  {loading
                    ? <span className="flex items-center gap-2 justify-center">
                        <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Signing in…
                      </span>
                    : 'Sign in →'}
                </button>
              )}
            </form>
          ) : (
            <form onSubmit={handleMagicLink} className="space-y-4" noValidate>
              <div>
                <label className="block text-xs font-medium text-dim mb-1.5">Email address</label>
                <input className="input" type="email" placeholder="you@example.com"
                  value={email} onChange={e => setEmail(e.target.value)}
                  autoComplete="email" autoFocus required disabled={magicLoading} />
              </div>
              <p className="text-xs text-dim">We'll send you a one-click sign-in link — no password needed.</p>

              {error && (
                <div className="bg-red-m border border-red/20 rounded-lg px-3 py-2.5 text-xs text-red leading-relaxed">{error}</div>
              )}

              <button type="submit" disabled={magicLoading || !email} className="btn btn-md btn-primary w-full py-3 disabled:opacity-50">
                {magicLoading
                  ? <span className="flex items-center gap-2 justify-center">
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Sending…
                    </span>
                  : 'Send sign-in link →'}
              </button>
            </form>
          )}

          <p className="text-center text-xs text-dim mt-4">
            No account?{' '}
            <Link href="/signup" className="text-blue hover:underline">Create one free</Link>
          </p>
        </div>
      </div>
    </div>
  )
}

export default function Login() {
  return <Suspense fallback={null}><LoginForm /></Suspense>
}
