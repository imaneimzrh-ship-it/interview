'use client'
import { Suspense, useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import SunMark from '@/components/SunMark'
import { trackGtagEvent } from '@/lib/analytics'

function getOrCreateDeviceId(): string {
  try {
    let id = localStorage.getItem('sonne_device_id')
    if (!id) {
      id = crypto.randomUUID()
      localStorage.setItem('sonne_device_id', id)
    }
    return id
  } catch { return '' }
}

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

const FREE_FEATURES = [
  '📄 CV upload + 5-signal diagnostic',
  '🔍 1 RAG System Design session',
  '📊 Headline score (overall + top gap)',
  '🌐 English & French',
]

const PRO_FEATURES = [
  '♾️ Unlimited sessions — all 4 modules',
  '🔍 RAG · 🕵️ Agents · 🧪 Eval · ⚙️ MLOps',
  '📋 Full per-skill diagnostic breakdown',
  '📄 CV diagnostic (full report)',
  '🌐 English & French',
]

function SignupForm() {
  const router = useRouter()

  const [step,    setStep]    = useState<'details' | 'plan'>('details')
  const [plan,    setPlan]    = useState<'free' | 'pro' | null>(null)

  const [name,    setName]    = useState('')
  const [email,   setEmail]   = useState('')
  const [pw,      setPw]      = useState('')
  const [confirm, setConfirm] = useState('')
  const [showPw,  setShowPw]  = useState(false)
  const [loading, setLoading] = useState(false)
  const [oauthLoading, setOauthLoading] = useState<'google' | 'linkedin' | null>(null)
  const [error,   setError]   = useState('')
  const [success, setSuccess] = useState(false)
  const [deviceUsed, setDeviceUsed] = useState(false)

  useEffect(() => {
    createClient().auth.getSession().then(({ data }) => {
      if (data.session) router.replace('/cv')
    })
  }, [router])

  function handleGoogle() {
    setError(''); setOauthLoading('google')
    window.location.href = '/api/auth/google/start?next=%2Fcv'
  }

  async function handleLinkedIn() {
    setError(''); setOauthLoading('linkedin')
    const sb = createClient()
    const { error: err } = await sb.auth.signInWithOAuth({
      provider: 'linkedin_oidc',
      options: { redirectTo: `${window.location.origin}/api/auth/callback?next=/cv` },
    })
    if (err) { setError(err.message); setOauthLoading(null) }
  }

  useEffect(() => {
    const id = getOrCreateDeviceId()
    if (!id) return
    fetch('/api/auth/device-checkin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ device_id: id }),
    })
      .then(r => r.json())
      .then(d => { if (d.used_free_session) setDeviceUsed(true) })
      .catch(() => {})
  }, [])

  const str      = strength(pw)
  const isStrong = str.score >= 4
  const pwMatch  = pw === confirm

  function validateDetails(): string | null {
    if (!name.trim())                    return 'Full name is required.'
    if (!email.trim())                   return 'Email is required.'
    if (!/\S+@\S+\.\S+/.test(email))    return 'Enter a valid email address.'
    if (!isStrong)                       return 'Password must meet all strength requirements.'
    if (!pwMatch)                        return 'Passwords do not match.'
    return null
  }

  function goToPlan(e: React.FormEvent) {
    e.preventDefault()
    const err = validateDetails()
    if (err) { setError(err); return }
    setError('')
    setStep('plan')
  }

  async function createAccount(selectedPlan: 'free' | 'pro') {
    setPlan(selectedPlan)
    setLoading(true); setError('')

    try {
      const sb = createClient()
      const deviceId = getOrCreateDeviceId()
      const { data, error: signUpErr } = await sb.auth.signUp({
        email: email.trim().toLowerCase(),
        password: pw,
        options: {
          data: { full_name: name.trim() },
          emailRedirectTo: `https://sonneai.com/api/auth/callback?next=${selectedPlan === 'pro' ? '/pricing?checkout=1' : '/cv'}`,
        },
      })

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

      // Link device_id to the new account
      if (deviceId && data?.user?.id) {
        fetch('/api/auth/device-checkin', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ device_id: deviceId, user_id: data.user.id }),
        }).catch(() => {})
      }

      // Record which Terms version the user accepted at signup
      if (data?.user?.id) {
        sb.from('profiles')
          .update({ terms_accepted_version: '2026-07', terms_accepted_at: new Date().toISOString() })
          .eq('id', data.user.id)
          .then(() => {})
      }

      if (data?.user && !data.session) {
        // Email verification required — after verifying they'll land on the right page
        trackGtagEvent('signup_completed', { method: 'email', plan: selectedPlan })
        setSuccess(true)
        setLoading(false); return
      }

      // Session available immediately (e.g. Google OAuth or no-verify flow)
      trackGtagEvent('signup_completed', { method: 'immediate', plan: selectedPlan })

      if (selectedPlan === 'pro' && data?.session?.access_token) {
        trackGtagEvent('begin_checkout', { plan: 'pro' })
        // Session available immediately — call Stripe checkout directly
        const res = await fetch('/api/stripe/checkout', {
          method: 'POST',
          headers: { Authorization: `Bearer ${data.session.access_token}` },
        })
        const checkout = await res.json()
        if (res.ok && checkout.url) {
          window.location.href = checkout.url
          return
        }
      }

      router.push(selectedPlan === 'pro' ? '/pricing?checkout=1' : '/cv')
      router.refresh()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unknown error'
      setError(msg)
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
          <button onClick={() => { setSuccess(false); setStep('details') }} className="text-blue hover:underline">try again</button>.
        </p>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-bg flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">

        {/* Logo */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 mb-6">
            <div className="w-8 h-8 rounded-xl bg-[#1E2A44] flex items-center justify-center shadow-sm">
              <SunMark size={14} />
            </div>
            <span className="font-semibold text-bright">Sonne AI</span>
          </Link>
          <h1 className="text-2xl font-semibold text-bright mb-1">
            {step === 'details' ? 'Create your account' : 'Choose your plan'}
          </h1>
          <p className="text-sm text-dim">
            {step === 'details' ? 'Free plan available · No card required' : 'You can upgrade or cancel anytime'}
          </p>
        </div>

        {/* Step indicator */}
        <div className="flex items-center gap-2 mb-6">
          <div className="flex-1 h-1 rounded-full" style={{ background: '#F5A524' }} />
          <div className="flex-1 h-1 rounded-full" style={{ background: step === 'plan' ? '#F5A524' : '#E5E7EB' }} />
        </div>

        {/* ── Step 1: Account details ── */}
        {step === 'details' && (
          <div className="card p-6">

            {/* OAuth buttons */}
            <div className="space-y-3 mb-4">
              <button type="button" onClick={handleGoogle} disabled={oauthLoading !== null}
                className="w-full flex items-center justify-center gap-3 py-2.5 px-4 rounded-lg border text-sm font-semibold transition-colors disabled:opacity-50"
                style={{ background: '#FFFFFF', borderColor: '#DADCE0', color: '#1F1F1F' }}>
                {oauthLoading === 'google'
                  ? <span className="w-4 h-4 border-2 border-[#1F1F1F]/20 border-t-[#1F1F1F] rounded-full animate-spin" />
                  : <svg width="18" height="18" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
                      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                    </svg>
                }
                <span>Continue with Google</span>
              </button>

              <button type="button" onClick={handleLinkedIn} disabled={oauthLoading !== null}
                className="w-full flex items-center justify-center gap-3 py-2.5 px-4 rounded-lg border text-sm font-semibold transition-colors disabled:opacity-50"
                style={{ background: '#0A66C2', borderColor: '#0A66C2', color: '#fff' }}>
                {oauthLoading === 'linkedin'
                  ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  : <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                    </svg>
                }
                Continue with LinkedIn
              </button>
            </div>

            <div className="flex items-center gap-3 mb-4">
              <div className="flex-1 h-px" style={{ background: '#2A2B38' }} />
              <span className="text-xs text-dim">or sign up with email</span>
              <div className="flex-1 h-px" style={{ background: '#2A2B38' }} />
            </div>

            <form onSubmit={goToPlan} className="space-y-4" noValidate>
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
                <div className="bg-red-m border border-red/20 rounded-lg px-3 py-2.5 text-xs text-red leading-relaxed">{error}</div>
              )}

              <button type="submit" disabled={!isStrong || !pwMatch || !name || !email}
                className="btn btn-md btn-primary w-full py-3 disabled:opacity-50 disabled:cursor-not-allowed">
                Next: Choose plan →
              </button>
            </form>
            <p className="text-center text-xs text-dim mt-4">
              Already have an account?{' '}
              <Link href="/login" className="text-blue hover:underline">Sign in</Link>
            </p>
          </div>
        )}

        {/* ── Step 2: Plan selection ── */}
        {step === 'plan' && (
          <div className="space-y-3">

            {deviceUsed && (
              <div className="bg-[#FFFBEB] border border-[#FDE68A] rounded-lg px-4 py-3 text-xs text-[#92400E]">
                <span className="font-semibold">Heads up:</span> A free session was already used on this device. You&apos;ll need Pro for additional interview practice.
              </div>
            )}

            {/* Free card */}
            <div className="bg-white rounded-xl border-2 border-[#E5E7EB] p-5" style={{ boxShadow: '0 1px 3px rgba(0,0,0,.05)' }}>
              <div className="flex items-center justify-between mb-3">
                <div>
                  <span className="font-bold text-[#111827] text-base">Free</span>
                  <span className="text-[#6B7280] text-sm ml-2">$0 / month</span>
                </div>
                <span className="text-[10px] font-bold px-2 py-1 rounded-full bg-[#ECFDF5] text-[#065F46] border border-[#A7F3D0]">FREE</span>
              </div>
              <ul className="space-y-1.5 mb-4">
                {FREE_FEATURES.map(f => (
                  <li key={f} className="text-xs text-[#374151] flex items-start gap-1.5">
                    <span className="mt-px">{f}</span>
                  </li>
                ))}
              </ul>
              <button onClick={() => createAccount('free')} disabled={loading}
                className="w-full py-2.5 rounded-lg text-sm font-semibold border-2 border-[#E5E7EB] text-[#374151] hover:border-[#D1D5DB] hover:bg-[#F9FAFB] transition-all disabled:opacity-50">
                {loading && plan === 'free' ? 'Creating account...' : 'Start free →'}
              </button>
            </div>

            {/* Pro card */}
            <div className="rounded-xl border-2 p-5" style={{ background: 'linear-gradient(135deg, #1E2A44 0%, #2D3E60 100%)', borderColor: '#F5A524', boxShadow: '0 4px 16px rgba(245,165,36,.2)' }}>
              <div className="flex items-center justify-between mb-3">
                <div>
                  <span className="font-bold text-white text-base">Pro</span>
                  <span className="text-[#F5A524] text-sm ml-2 font-semibold">$39.99 / month</span>
                </div>
                <span className="text-[10px] font-bold px-2 py-1 rounded-full bg-[#F5A524] text-[#17140F]">PRO</span>
              </div>
              <ul className="space-y-1.5 mb-4">
                {PRO_FEATURES.map(f => (
                  <li key={f} className="text-xs text-[#CBD5E1] flex items-start gap-1.5">
                    <span className="mt-px">{f}</span>
                  </li>
                ))}
              </ul>
              <button onClick={() => createAccount('pro')} disabled={loading}
                className="w-full py-2.5 rounded-lg text-sm font-semibold transition-all disabled:opacity-50"
                style={{ background: '#F5A524', color: '#17140F', boxShadow: '0 2px 8px rgba(245,165,36,.4)' }}>
                {loading && plan === 'pro' ? 'Creating account...' : 'Start Pro — $39.99/month →'}
              </button>
            </div>

            {error && (
              <div className="bg-red-m border border-red/20 rounded-lg px-3 py-2.5 text-xs text-red">{error}</div>
            )}

            <button onClick={() => { setStep('details'); setError('') }} className="w-full text-xs text-[#9CA3AF] hover:text-[#6B7280] py-1 transition-colors">
              ← Back to account details
            </button>
          </div>
        )}

        <p className="text-center text-xs text-dim mt-4">
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
