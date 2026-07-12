'use client'
import { Suspense, useState, useEffect } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

const GOOGLE_CLIENT_ID = '571697807202-1ivadidsth2bv4iv3j3fvmg30pa6f4p1.apps.googleusercontent.com'

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (cfg: object) => void
          renderButton: (el: HTMLElement, cfg: object) => void
          prompt: () => void
        }
      }
    }
  }
}

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
  const [gisReady,    setGisReady]    = useState(false)
  const [gisLoading,  setGisLoading]  = useState(false)

  useEffect(() => {
    // Load Google Identity Services script
    if (document.querySelector('script[src*="accounts.google.com/gsi"]')) {
      initGIS(); return
    }
    const script = document.createElement('script')
    script.src = 'https://accounts.google.com/gsi/client'
    script.async = true
    script.onload = initGIS
    document.head.appendChild(script)
  }, [])

  function initGIS() {
    if (!window.google?.accounts?.id) { setTimeout(initGIS, 100); return }
    window.google.accounts.id.initialize({
      client_id: GOOGLE_CLIENT_ID,
      callback: handleGISCredential,
      auto_select: false,
      cancel_on_tap_outside: true,
    })
    setGisReady(true)
  }

  async function handleGISCredential(response: { credential: string }) {
    setGisLoading(true); setError('')
    try {
      const sb = createClient()
      const { error: err } = await sb.auth.signInWithIdToken({
        provider: 'google',
        token: response.credential,
      })
      if (err) { setError(err.message); setGisLoading(false); return }
      setRedirecting(true)
      window.location.href = next
    } catch {
      setError('Google sign-in failed. Please try again.')
      setGisLoading(false)
    }
  }

  function handleGoogleClick() {
    if (!gisReady || !window.google?.accounts?.id) {
      setError('Google is still loading. Please wait a moment and try again.')
      return
    }
    setGisLoading(true); setError('')
    window.google.accounts.id.prompt()
  }

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
      setLoading(false); setRedirecting(true)
      window.location.href = next
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Unknown error. Please try again.')
      setLoading(false)
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
      setError('Could not send reset email. Try again.')
    } finally {
      setResetting(false)
    }
  }

  const busy = loading || redirecting || gisLoading

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

        <div className="card p-6 space-y-4">
          {message && (
            <div className="bg-blue-m border border-blue/20 rounded-lg px-3 py-2.5 text-xs text-blue leading-relaxed">{message}</div>
          )}
          {resetSent && (
            <div className="bg-green-m border border-green/20 rounded-lg px-3 py-2.5 text-xs text-green">
              Password reset link sent to <strong>{email}</strong>. Check your inbox.
            </div>
          )}
          {redirecting && (
            <div className="bg-green-m border border-green/20 rounded-lg px-3 py-2.5 text-xs text-green flex items-center gap-2">
              <span className="w-3 h-3 border-2 border-green/30 border-t-green rounded-full animate-spin inline-block flex-shrink-0" />
              Signed in — redirecting…
              <Link href={next} className="ml-auto underline text-green font-medium whitespace-nowrap">Go now →</Link>
            </div>
          )}

          {/* Google Sign-In via GIS (no redirect URI required) */}
          <button
            onClick={handleGoogleClick}
            disabled={busy}
            className="w-full flex items-center justify-center gap-3 py-2.5 px-4 rounded-lg border text-sm font-medium transition-all disabled:opacity-50"
            style={{ background: '#13131A', borderColor: '#2A2B38', color: '#F0F2FA' }}>
            {gisLoading
              ? <span className="w-4 h-4 border-2 border-white/20 border-t-white/70 rounded-full animate-spin" />
              : (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
              )}
            Continue with Google
          </button>

          {/* Divider */}
          <div className="flex items-center gap-3">
            <div className="flex-1 h-px" style={{ background: '#2A2B38' }} />
            <span className="text-xs text-dim">or sign in with email</span>
            <div className="flex-1 h-px" style={{ background: '#2A2B38' }} />
          </div>

          {/* Email + password form */}
          <form onSubmit={handleLogin} className="space-y-3" noValidate>
            <div>
              <label className="block text-xs font-medium text-dim mb-1.5">Email address</label>
              <input className="input" type="email" placeholder="you@example.com"
                value={email} onChange={e => setEmail(e.target.value)}
                autoComplete="email" required disabled={busy} />
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

          <p className="text-center text-xs text-dim">
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
