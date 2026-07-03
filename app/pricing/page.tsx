'use client'
import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function Pricing() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function startCheckout() {
    setLoading(true)
    setError('')
    try {
      const sb = createClient()
      const { data: { session } } = await sb.auth.getSession()
      if (!session) { router.push('/login?next=/pricing'); return }

      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { Authorization: `Bearer ${session.access_token}` },
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Something went wrong.'); setLoading(false); return }
      window.location.href = data.url
    } catch {
      setError('Network error. Please try again.')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#09090C]" style={{ fontFamily: 'Inter, sans-serif' }}>
      <nav className="border-b border-[#1C1D28]">
        <div className="max-w-5xl mx-auto px-4 h-12 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-[#4776F7] flex items-center justify-center text-white text-xs font-bold">S</div>
            <span className="font-semibold text-sm text-[#F0F2FA]">Sonne AI</span>
          </Link>
          <Link href="/login" className="text-sm text-[#7A829A] hover:text-[#F0F2FA] transition-colors">Sign in</Link>
        </div>
      </nav>

      <div className="max-w-3xl mx-auto px-4 py-16 text-center">
        <h1 className="text-3xl font-semibold text-[#F0F2FA] mb-3">Simple pricing</h1>
        <p className="text-[#7A829A] mb-12">Free to start. Upgrade when you're serious about landing AI roles.</p>

        {error && (
          <div className="mb-6 bg-[rgba(232,64,64,0.1)] border border-[rgba(232,64,64,0.2)] rounded-lg px-4 py-3 text-sm text-[#E84040]">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 text-left">
          {/* Free */}
          <div className="bg-[#111218] border border-[#1C1D28] rounded-xl p-6">
            <div className="text-xs font-medium text-[#7A829A] uppercase tracking-widest mb-3">Free</div>
            <div className="text-3xl font-semibold text-[#F0F2FA] mb-1">$0</div>
            <div className="text-xs text-[#7A829A] mb-6">No card required</div>
            <div className="space-y-2.5 mb-6 text-sm">
              {[
                '1 full session (4 sub-skills)',
                'Any of the 4 AI modules',
                'Adaptive Claude follow-ups',
                'Full diagnostic report',
              ].map(f => (
                <div key={f} className="flex items-center gap-2">
                  <span className="text-[#4ADE80] text-xs">✓</span>
                  <span className="text-[#F0F2FA]">{f}</span>
                </div>
              ))}
              {['Unlimited sessions', 'All module access across sessions'].map(f => (
                <div key={f} className="flex items-center gap-2">
                  <span className="text-[#3D4260] text-xs">○</span>
                  <span className="text-[#7A829A] line-through">{f}</span>
                </div>
              ))}
            </div>
            <Link href="/signup" className="block text-center border border-[#1C1D28] text-[#F0F2FA] text-sm font-medium py-2.5 rounded-lg hover:border-[#2A2B38] transition-colors">
              Start free
            </Link>
          </div>

          {/* Pro */}
          <div className="bg-[#111218] border border-[rgba(71,118,247,0.3)] rounded-xl p-6" style={{ boxShadow: '0 0 0 1px rgba(71,118,247,0.1), 0 0 24px rgba(71,118,247,0.06)' }}>
            <div className="text-xs font-medium text-[#4776F7] uppercase tracking-widest mb-3">Pro</div>
            <div className="text-3xl font-semibold text-[#F0F2FA] mb-1">
              $19<span className="text-base font-normal text-[#7A829A]">/month</span>
            </div>
            <div className="text-xs text-[#7A829A] mb-6">Cancel anytime</div>
            <div className="space-y-2.5 mb-6 text-sm">
              {[
                'Everything in Free',
                'Unlimited sessions',
                'All 4 modules, repeat any module',
                'RAG · Agents · Evaluation · MLOps',
                'Adaptive follow-ups per answer',
                'Full diagnostic report every session',
                'EN / FR bilingual support',
              ].map(f => (
                <div key={f} className="flex items-start gap-2">
                  <span className="text-[#4776F7] text-xs mt-0.5 flex-shrink-0">✓</span>
                  <span className="text-[#F0F2FA]">{f}</span>
                </div>
              ))}
            </div>
            <button
              onClick={startCheckout}
              disabled={loading}
              className="w-full bg-[#4776F7] text-white text-sm font-medium py-2.5 rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading
                ? <span className="flex items-center justify-center gap-2">
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Redirecting...
                  </span>
                : 'Get Pro →'}
            </button>
          </div>
        </div>

        <p className="text-xs text-[#3D4260] mt-8">
          You're interviewing for roles that pay $150K–$500K+. This costs $19/month.
        </p>
      </div>
    </div>
  )
}
