'use client'
import { Suspense, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

const RULES = [
  { id: 'length',  label: 'At least 8 characters',          test: (p: string) => p.length >= 8 },
  { id: 'upper',   label: 'One uppercase letter (A-Z)',      test: (p: string) => /[A-Z]/.test(p) },
  { id: 'lower',   label: 'One lowercase letter (a-z)',      test: (p: string) => /[a-z]/.test(p) },
  { id: 'number',  label: 'One number (0-9)',                test: (p: string) => /[0-9]/.test(p) },
  { id: 'special', label: 'One special character (!@#$...)', test: (p: string) => /[^A-Za-z0-9]/.test(p) },
]

function strength(pw: string): { score: number; label: string; color: string } {
  const passed = RULES.filter(r => r.test(pw)).length
  if (passed <= 1) return { score: passed, label: 'Very weak',   color: '#E84040' }
  if (passed === 2) return { score: passed, label: 'Weak',       color: '#E8A020' }
  if (passed === 3) return { score: passed, label: 'Fair',       color: '#F0C030' }
  if (passed === 4) return { score: passed, label: 'Strong',     color: '#4776F7' }
  return             { score: passed, label: 'Very strong', color: '#1DB954' }
}

function SignupForm() {
  const router  = useRouter()
  const params  = useSearchParams()
  const isPro   = params.get('plan') === 'pro'

  const [name,    setName]    = useState('')
  const [email,   setEmail]   = useState('')
  const [pw,      setPw]      = useState('')
  const [confirm, setConfirm] = useState('')
  const [showPw,  setShowPw]  = useState(false)
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState('')
  const [success, setSuccess] = useState(false)

  const str      = strength(pw)
  const isStrong = str.score >= 4
  const pwMatch  = pw === confirm

  function validate(): string | null {
    if (!name.trim())                    return 'Full name is required.'
    if (!email.trim())                   return 'Email is required.'
    if (!/\S+@\S+\.\S+/.test(email))    return 'Enter a valid email address.'
    if (!isStrong)                       return 'Password must meet all strength requirements.'
    if (!pwMatch)                        return 'Passwords do not match.'
    return null
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const err = validate()
    if (err) { setError(err); return }
    setLoading(true); setError('')

    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL.includes('xxxx')) {
      setError('Supabase is not configured yet. Visit /api/health to diagnose setup issues.')
      setLoading(false); return
    }

    try {
      const sb = createClient()
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Request timed out. Check that Supabase environment variables are set correctly in Vercel.')), 10000)
      )
      const { data, error: signUpErr } = await Promise.race([
        sb.auth.signUp({
          email: email.trim().toLowerCase(),
          password: pw,
          options: {
            data: { full_name: name.trim() },
            emailRedirectTo: 'https://sonneai.com/api/auth/callback',
          },
        }),
        timeoutPromise,
      ])

      if (signUpErr) {
        if (signUpErr.message.includes('already registered')) {
          setError('This email is already registered. Sign in instead.')
        } else if (signUpErr.message.includes('rate limit')) {
          setError('Too many attempts. Please wait a minute and try again.')
        } else {
          setError(signUpErr.message)
        }
        setLoading(false); return
      }

      if (data?.user && !data.session) {
        setSuccess(true)
        setLoading(false); return
      }

      router.push(isPro ? '/pricing?checkout=1' : '/interview')
      router.refresh()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unknown error'
      if (msg.includes('fetch') || msg.includes('network') || msg.includes('ECONNREFUSED')) {
        setError('Cannot connect to the database. Check Supabase environment variables in Vercel dashboard.')
      } else {
        setError(msg)
      }
      setLoading(false)
    }
  }

  if (success) return (
    <div className="min-h-screen bg-bg flex items-center justify-center px-4">
      <div className="w-full max-w-sm text-center">
        <div className="w-16 h-16 bg-green-m border border-green/30 rounded-2xl flex items-center justify-center mx-auto mb-5">
          <span className="text-green text-2xl">✓</span>
        </div>
        <h2 className="text-xl font-semibold text-bright mb-2">Check your email</h2>
        <p className="text-sm text-dim mb-6">
          We sent a confirmation link to <strong className="text-bright">{email}</strong>.
          Click the link to activate your account, then come back to sign in.
        </p>
        <Link href="/login" className="btn btn-md btn-primary w-full justify-center py-3 block">Go to sign in →</Link>
        <p className="text-xs text-dim mt-4">
          Didn&apos;t get it? Check spam, or{' '}
          <button onClick={() => setSuccess(false)} className="text-blue hover:underline">try again</button>.
        </p>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-bg flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 mb-6">
            <div className="w-8 h-8 rounded-xl bg-[#1E2A44] flex items-center justify-center text-white text-sm font-bold">S</div>
            <span className="font-semibold text-bright">Sonne AI</span>
          </Link>
          <h1 className="text-2xl font-semibold text-bright mb-1">Create your account</h1>
          <p className="text-sm text-dim">
            {isPro ? 'Start Pro — €19/month, cancel anytime' : '1 free session included · No card required'}
          </p>
        </div>

        <div className="card p-6">
          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            <div>
              <label className="block text-xs font-medium text-dim mb-1.5">Full name *</label>
              <input className="input" type="text" placeholder="Alex Chen"
                value={name} onChange={e => setName(e.target.value)} autoComplete="name" required />
            </div>
            <div>
              <label className="block text-xs font-medium text-dim mb-1.5">Email address *</label>
              <input className="input" type="email" placeholder="you@example.com"
                value={email} onChange={e => setEmail(e.target.value)} autoComplete="email" required />
            </div>
            <div>
              <label className="block text-xs font-medium text-dim mb-1.5">Password *</label>
              <div className="relative">
                <input className="input pr-10" type={showPw ? 'text' : 'password'}
                  placeholder="Create a strong password"
                  value={pw} onChange={e => setPw(e.target.value)} autoComplete="new-password" required />
                <button type="button" onClick={() => setShowPw(!showPw)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-dim hover:text-bright">
                  {showPw ? 'Hide' : 'Show'}
                </button>
              </div>
              {pw && (
                <div className="mt-2">
                  <div className="flex items-center gap-2 mb-1.5">
                    <div className="flex gap-1 flex-1">
                      {[1,2,3,4,5].map(i => (
                        <div key={i} className="h-1 flex-1 rounded-full transition-all duration-300"
                          style={{ background: i <= str.score ? str.color : '#1C1D28' }} />
                      ))}
                    </div>
                    <span className="text-xs font-medium" style={{ color: str.color }}>{str.label}</span>
                  </div>
                  <div className="space-y-1">
                    {RULES.map(r => {
                      const ok = r.test(pw)
                      return (
                        <div key={r.id} className="flex items-center gap-1.5 text-xs">
                          <span className={ok ? 'text-green' : 'text-dim'}>{ok ? '✓' : '○'}</span>
                          <span className={ok ? 'text-soft' : 'text-dim'}>{r.label}</span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
            <div>
              <label className="block text-xs font-medium text-dim mb-1.5">Confirm password *</label>
              <input className={`input ${confirm && !pwMatch ? 'border-red/50' : confirm && pwMatch ? 'border-green/50' : ''}`}
                type={showPw ? 'text' : 'password'} placeholder="Repeat your password"
                value={confirm} onChange={e => setConfirm(e.target.value)} autoComplete="new-password" required />
              {confirm && !pwMatch && <p className="text-xs text-red mt-1">Passwords do not match.</p>}
              {confirm && pwMatch  && <p className="text-xs text-green mt-1">✓ Passwords match</p>}
            </div>

            {error && (
              <div className="bg-red-m border border-red/20 rounded-lg px-3 py-2.5 text-xs text-red leading-relaxed">
                {error}
                {error.includes('environment') && (
                  <div className="mt-1"><a href="/api/health" target="_blank" className="underline">Run health check →</a></div>
                )}
              </div>
            )}

            <button type="submit" disabled={loading || !isStrong || !pwMatch || !name || !email}
              className="btn btn-md btn-primary w-full py-3 disabled:opacity-50 disabled:cursor-not-allowed">
              {loading
                ? <span className="flex items-center gap-2 justify-center">
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Creating account...
                  </span>
                : 'Create account →'}
            </button>
          </form>
          <p className="text-center text-xs text-dim mt-4">
            Already have an account?{' '}
            <Link href="/login" className="text-blue hover:underline">Sign in</Link>
          </p>
        </div>
        <p className="text-center text-xs text-dim mt-3">
          By signing up you agree to our <Link href="/terms" className="hover:text-soft">Terms</Link>
          {' '}and <Link href="/privacy" className="hover:text-soft">Privacy Policy</Link>.
        </p>
      </div>
    </div>
  )
}

export default function Signup() {
  return <Suspense fallback={null}><SignupForm /></Suspense>
}
