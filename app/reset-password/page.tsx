'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

const RULES = [
  { id: 'length',  label: 'At least 8 characters',          test: (p: string) => p.length >= 8 },
  { id: 'upper',   label: 'One uppercase letter',           test: (p: string) => /[A-Z]/.test(p) },
  { id: 'lower',   label: 'One lowercase letter',           test: (p: string) => /[a-z]/.test(p) },
  { id: 'number',  label: 'One number',                     test: (p: string) => /[0-9]/.test(p) },
  { id: 'special', label: 'One special character (!@#$...)',test: (p: string) => /[^A-Za-z0-9]/.test(p) },
]

function strength(pw: string) {
  const passed = RULES.filter(r => r.test(pw)).length
  if (passed <= 1) return { score: passed, label: 'Very weak',   color: '#E84040' }
  if (passed === 2) return { score: passed, label: 'Weak',       color: '#E8A020' }
  if (passed === 3) return { score: passed, label: 'Fair',       color: '#F0C030' }
  if (passed === 4) return { score: passed, label: 'Strong',     color: '#4776F7' }
  return             { score: passed, label: 'Very strong', color: '#1DB954' }
}

export default function ResetPassword() {
  const router = useRouter()
  const [pw,         setPw]         = useState('')
  const [confirm,    setConfirm]    = useState('')
  const [showPw,     setShowPw]     = useState(false)
  const [loading,    setLoading]    = useState(false)
  const [error,      setError]      = useState('')
  const [done,       setDone]       = useState(false)
  // null = still checking, true = recovery session active, false = no session
  const [hasSession, setHasSession] = useState<boolean | null>(null)

  const str      = strength(pw)
  const isStrong = str.score >= 4
  const pwMatch  = pw === confirm && pw.length > 0

  useEffect(() => {
    const sb = createClient()

    // Listen for PASSWORD_RECOVERY — Supabase fires this when it processes the
    // recovery tokens from the URL hash after the user clicks the reset link.
    const { data: { subscription } } = sb.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY') {
        setHasSession(true)
      } else if (event === 'SIGNED_IN' && session) {
        // Supabase may fire SIGNED_IN with a recovery session in some SDK versions
        setHasSession(true)
      }
    })

    // Also check if there's already an active session (e.g. navigated here after
    // the token was already processed)
    sb.auth.getSession().then(({ data }) => {
      if (data.session) {
        setHasSession(true)
      } else {
        // Give the onAuthStateChange listener 2 seconds to fire before showing
        // the "link expired" state — the hash processing is async
        setTimeout(() => {
          setHasSession(prev => prev === null ? false : prev)
        }, 2000)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!isStrong) { setError('Password must meet all strength requirements.'); return }
    if (!pwMatch)  { setError('Passwords do not match.'); return }

    setLoading(true); setError('')
    const sb = createClient()
    const { error: err } = await sb.auth.updateUser({ password: pw })
    if (err) {
      setError(err.message)
      setLoading(false)
      return
    }
    setDone(true)
    setTimeout(() => router.push('/app/start'), 2000)
  }

  // Still waiting to know if there's a recovery session
  if (hasSession === null) return (
    <div className="min-h-screen bg-bg flex items-center justify-center">
      <div className="w-6 h-6 border-2 border-blue/30 border-t-blue rounded-full animate-spin" />
    </div>
  )

  // No recovery session — link was expired, already used, or user navigated here directly
  if (hasSession === false) return (
    <div className="min-h-screen bg-bg flex items-center justify-center px-4">
      <div className="w-full max-w-sm text-center">
        <div className="card p-8">
          <p className="text-bright font-medium mb-2">Link expired or already used</p>
          <p className="text-sm text-dim mb-6">
            Reset links are single-use and expire after 1 hour. Request a new one from the sign-in page.
          </p>
          <Link href="/login" className="btn btn-md btn-primary w-full justify-center py-3 block">
            Back to sign in →
          </Link>
        </div>
      </div>
    </div>
  )

  if (done) return (
    <div className="min-h-screen bg-bg flex items-center justify-center px-4">
      <div className="w-full max-w-sm text-center">
        <div className="w-16 h-16 bg-green-m border border-green/30 rounded-2xl flex items-center justify-center mx-auto mb-5">
          <span className="text-green text-2xl">✓</span>
        </div>
        <h2 className="text-xl font-semibold text-bright mb-2">Password updated</h2>
        <p className="text-sm text-dim">Taking you to your dashboard...</p>
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
          <h1 className="text-2xl font-semibold text-bright mb-1">Set new password</h1>
          <p className="text-sm text-dim">Choose a strong password for your account</p>
        </div>

        <div className="card p-6">
          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            <div>
              <label className="block text-xs font-medium text-dim mb-1.5">New password</label>
              <div className="relative">
                <input className="input pr-10" type={showPw ? 'text' : 'password'}
                  placeholder="Create a strong password"
                  value={pw} onChange={e => setPw(e.target.value)}
                  autoComplete="new-password" autoFocus required />
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
              <label className="block text-xs font-medium text-dim mb-1.5">Confirm new password</label>
              <input
                className={`input ${confirm && !pwMatch ? 'border-red/50' : confirm && pwMatch ? 'border-green/50' : ''}`}
                type={showPw ? 'text' : 'password'}
                placeholder="Repeat your new password"
                value={confirm} onChange={e => setConfirm(e.target.value)}
                autoComplete="new-password" required />
              {confirm && !pwMatch && <p className="text-xs text-red mt-1">Passwords do not match.</p>}
              {confirm && pwMatch  && <p className="text-xs text-green mt-1">✓ Passwords match</p>}
            </div>

            {error && (
              <div className="bg-red-m border border-red/20 rounded-lg px-3 py-2.5 text-xs text-red">
                {error}
              </div>
            )}

            <button type="submit" disabled={loading || !isStrong || !pwMatch}
              className="btn btn-md btn-primary w-full py-3 disabled:opacity-50 disabled:cursor-not-allowed">
              {loading
                ? <span className="flex items-center gap-2 justify-center">
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Saving...
                  </span>
                : 'Save new password →'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
