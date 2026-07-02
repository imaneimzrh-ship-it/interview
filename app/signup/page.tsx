'use client'
import { useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function Signup() {
  const router = useRouter()
  const params = useSearchParams()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const isPro = params.get('plan') === 'pro'

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email || !password) { setError('Email and password required.'); return }
    if (password.length < 8) { setError('Password must be at least 8 characters.'); return }
    setLoading(true); setError('')
    const sb = createClient()
    const { error: err } = await sb.auth.signUp({
      email, password,
      options: {
        data: { full_name: name },
        emailRedirectTo: `${window.location.origin}/api/auth/callback`,
      },
    })
    if (err) { setError(err.message); setLoading(false); return }
    // Sign in immediately (skip email confirmation for now in dev)
    const { error: signInErr } = await sb.auth.signInWithPassword({ email, password })
    if (signInErr) {
      // Email confirmation required
      router.push('/login?message=Check your email to confirm your account.')
    } else {
      router.push(isPro ? '/pricing?checkout=1' : '/interview')
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
          <h1 className="text-2xl font-semibold text-bright mb-1">Create your account</h1>
          <p className="text-sm text-dim">
            {isPro ? 'Start your Pro trial →' : '2 free interview sessions included'}
          </p>
        </div>

        <div className="card p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-dim mb-1.5">Full name</label>
              <input className="input" type="text" placeholder="Alex Chen" value={name} onChange={e => setName(e.target.value)} />
            </div>
            <div>
              <label className="block text-xs font-medium text-dim mb-1.5">Email</label>
              <input className="input" type="email" placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)} required />
            </div>
            <div>
              <label className="block text-xs font-medium text-dim mb-1.5">Password</label>
              <input className="input" type="password" placeholder="8+ characters" value={password} onChange={e => setPassword(e.target.value)} required />
            </div>

            {error && (
              <div className="bg-red-m border border-red/20 rounded-lg px-3 py-2.5 text-xs text-red">
                {error}
              </div>
            )}

            <button type="submit" disabled={loading} className="btn-blue w-full py-3">
              {loading ? <span className="flex items-center gap-2"><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Creating account...</span> : 'Create account →'}
            </button>
          </form>

          <p className="text-center text-xs text-dim mt-4">
            Already have an account?{' '}
            <Link href="/login" className="text-blue hover:underline">Sign in</Link>
          </p>
        </div>

        <p className="text-center text-xs text-dim mt-4">
          By signing up you agree to our{' '}
          <Link href="/terms" className="hover:text-soft transition-colors">Terms</Link> and{' '}
          <Link href="/privacy" className="hover:text-soft transition-colors">Privacy Policy</Link>.
        </p>
      </div>
    </div>
  )
}
