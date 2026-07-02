'use client'
import { useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function Login() {
  const router = useRouter()
  const params = useSearchParams()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const message = params.get('message')
  const next = params.get('next') ?? '/dashboard'

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true); setError('')
    const sb = createClient()
    const { error: err } = await sb.auth.signInWithPassword({ email, password })
    if (err) { setError(err.message); setLoading(false); return }
    router.push(next)
    router.refresh()
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
          <p className="text-sm text-dim">Sign in to your account</p>
        </div>

        <div className="card p-6">
          {message && (
            <div className="bg-blue-m border border-blue/20 rounded-lg px-3 py-2.5 text-xs text-blue mb-4">{message}</div>
          )}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-dim mb-1.5">Email</label>
              <input className="input" type="email" placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)} required />
            </div>
            <div>
              <label className="block text-xs font-medium text-dim mb-1.5">Password</label>
              <input className="input" type="password" placeholder="Your password" value={password} onChange={e => setPassword(e.target.value)} required />
            </div>

            {error && (
              <div className="bg-red-m border border-red/20 rounded-lg px-3 py-2.5 text-xs text-red">{error}</div>
            )}

            <button type="submit" disabled={loading} className="btn-blue w-full py-3">
              {loading ? <span className="flex items-center gap-2"><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Signing in...</span> : 'Sign in →'}
            </button>
          </form>

          <p className="text-center text-xs text-dim mt-4">
            No account?{' '}
            <Link href="/signup" className="text-blue hover:underline">Create one free</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
