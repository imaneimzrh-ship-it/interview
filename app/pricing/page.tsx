'use client'
import { useState, useEffect, Suspense } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { CURRENCY, FREE_TIER, PRO_TIER, PRICING_NOTE, REFUND_NOTE, SUPPORT_EMAIL } from '@/lib/pricing'
import { trackGtagEvent } from '@/lib/analytics'

function PricingInner() {
  const router  = useRouter()
  const params  = useSearchParams()
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState('')

  // Auto-trigger checkout when arriving from signup with ?checkout=1
  useEffect(() => {
    if (params.get('checkout') === '1') startCheckout()
  }, [])

  async function startCheckout() {
    setLoading(true); setError('')
    try {
      const sb = createClient()
      const { data: { session } } = await sb.auth.getSession()
      if (!session) { router.push('/login?next=/pricing'); return }

      trackGtagEvent('begin_checkout', { plan: 'pro' })

      const res  = await fetch('/api/stripe/checkout', {
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
    <div className="min-h-screen" style={{ background: '#FBFAF7', fontFamily: "'Inter', system-ui, sans-serif" }}>

      {/* Nav */}
      <nav className="border-b border-[#E7E2D8] bg-[#FBFAF7]/80 backdrop-blur-sm sticky top-0 z-20">
        <div className="max-w-4xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-[#1E2A44] flex items-center justify-center"><SunMark /></div>
            <span className="font-bold text-[#17140F] text-sm" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>Sonne AI</span>
          </Link>
          <Link href="/login" className="text-sm text-[#7A7267] hover:text-[#17140F] transition-colors">Sign in</Link>
        </div>
      </nav>

      <main className="max-w-3xl mx-auto px-4 py-16 text-center">
        <h1 className="text-3xl sm:text-4xl font-bold text-[#17140F] mb-3" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
          Simple pricing
        </h1>
        <p className="text-[#7A7267] mb-12">Free to start. Upgrade when you're serious about landing AI roles.</p>

        {error && (
          <div className="mb-8 bg-[#FEF2F2] border border-[#FECACA] rounded-xl px-4 py-3 text-sm text-[#B24C3F]">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 text-left">

          {/* Free */}
          <div className="bg-white rounded-2xl border border-[#E7E2D8] p-6 shadow-sm">
            <div className="text-xs font-bold text-[#7A7267] uppercase tracking-widest mb-3"
              style={{ fontFamily: "'JetBrains Mono', monospace" }}>{FREE_TIER.name}</div>
            <div className="text-3xl font-bold text-[#17140F] mb-1" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
              {CURRENCY}0
            </div>
            <div className="text-xs text-[#7A7267] mb-6">{FREE_TIER.description}</div>
            <div className="space-y-2.5 mb-6 text-sm">
              {FREE_TIER.features.map(f => (
                <div key={f} className="flex items-start gap-2">
                  <span className="text-[#2E7D5B] text-xs mt-0.5 flex-shrink-0">✓</span>
                  <span className="text-[#17140F]">{f}</span>
                </div>
              ))}
              {FREE_TIER.locked.map(f => (
                <div key={f} className="flex items-start gap-2">
                  <span className="text-[#C7C2B8] text-xs mt-0.5 flex-shrink-0">○</span>
                  <span className="text-[#B8B2A8] line-through">{f}</span>
                </div>
              ))}
            </div>
            <Link href={FREE_TIER.ctaHref}
              className="block text-center border border-[#E7E2D8] text-[#17140F] text-sm font-medium py-2.5 rounded-xl hover:border-[#C7C2B8] hover:bg-[#F5F4F0] transition-all"
              style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
              {FREE_TIER.cta}
            </Link>
          </div>

          {/* Pro */}
          <div className="rounded-2xl border-2 border-[#F5A524] p-6 shadow-md relative overflow-hidden"
            style={{ background: 'linear-gradient(135deg, #1E2A44 0%, #2d3f61 100%)' }}>
            <div className="absolute top-3 right-3 text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#F5A524] text-[#17140F]"
              style={{ fontFamily: "'JetBrains Mono', monospace" }}>POPULAR</div>
            <div className="text-xs font-bold text-[#F5A524] uppercase tracking-widest mb-3"
              style={{ fontFamily: "'JetBrains Mono', monospace" }}>{PRO_TIER.name}</div>
            <div className="text-3xl font-bold text-white mb-1" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
              {CURRENCY}{PRO_TIER.price}
              <span className="text-sm font-normal text-[#C7D0E0]">/{PRO_TIER.period}</span>
            </div>
            <div className="text-xs text-[#9BADC7] mb-6">{PRO_TIER.description}</div>
            <div className="space-y-2.5 mb-6 text-sm">
              {PRO_TIER.features.map(f => (
                <div key={f} className="flex items-start gap-2">
                  <span className="text-[#F5A524] text-xs mt-0.5 flex-shrink-0">✓</span>
                  <span className="text-[#E8EEFA]">{f}</span>
                </div>
              ))}
            </div>
            <button onClick={startCheckout} disabled={loading}
              className="w-full text-sm font-bold py-2.5 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ background: '#F5A524', color: '#17140F', fontFamily: "'Space Grotesk', sans-serif" }}>
              {loading
                ? <span className="flex items-center justify-center gap-2">
                    <span className="w-4 h-4 border-2 border-[#17140F]/30 border-t-[#17140F] rounded-full animate-spin" />
                    Redirecting...
                  </span>
                : PRO_TIER.cta}
            </button>
          </div>
        </div>

        <div className="mt-8 space-y-2 text-center">
          <p className="text-xs text-[#7A7267]">{PRICING_NOTE}</p>
          {REFUND_NOTE && <p className="text-xs text-[#7A7267]">{REFUND_NOTE}</p>}
          <p className="text-xs text-[#7A7267]">
            Questions?{' '}
            <a href={`mailto:${SUPPORT_EMAIL}`} className="text-[#F5A524] hover:underline">{SUPPORT_EMAIL}</a>
          </p>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-[#E7E2D8] py-8 mt-8">
        <div className="max-w-4xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#7A7267]">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded-md bg-[#1E2A44] flex items-center justify-center"><SunMark /></div>
            <span>Sonne AI © 2026</span>
          </div>
          <div className="flex gap-5">
            <Link href="/cv"      className="hover:text-[#17140F] transition-colors">CV Diagnostic</Link>
            <Link href="/login"   className="hover:text-[#17140F] transition-colors">Sign in</Link>
            <Link href="/privacy" className="hover:text-[#17140F] transition-colors">Privacy</Link>
            <Link href="/terms"   className="hover:text-[#17140F] transition-colors">Terms</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}

export default function Pricing() {
  return <Suspense fallback={null}><PricingInner /></Suspense>
}

function SunMark() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="7" cy="7" r="3" fill="#F5A524"/>
      {[0,45,90,135,180,225,270,315].map((deg, i) => {
        const r = Math.PI * deg / 180
        return <line key={i} x1={7+4*Math.cos(r)} y1={7+4*Math.sin(r)} x2={7+5.5*Math.cos(r)} y2={7+5.5*Math.sin(r)} stroke="#F5A524" strokeWidth="1.2" strokeLinecap="round"/>
      })}
    </svg>
  )
}
