'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

interface Props {
  reason?: string   // e.g. "Agent Orchestration is a Pro module"
  onClose: () => void
}

export default function UpgradeModal({ reason, onClose }: Props) {
  const router  = useRouter()
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState('')

  async function startCheckout() {
    setLoading(true); setError('')
    try {
      const { data: { session } } = await createClient().auth.getSession()
      if (!session) {
        // Should never happen — modal only shows to signed-in users
        router.push('/login?next=/pricing')
        return
      }
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(2px)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}>

      <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 relative"
        style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>

        {/* Close */}
        <button onClick={onClose}
          className="absolute top-4 right-4 text-[#9CA3AF] hover:text-[#374151] transition-colors text-xl leading-none">
          ×
        </button>

        {/* Icon */}
        <div className="w-12 h-12 rounded-xl bg-[#FFF8EE] flex items-center justify-center text-2xl mb-4">
          ⭐
        </div>

        {/* Copy */}
        <h2 className="text-lg font-bold text-[#111827] mb-2" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
          Pro plan required
        </h2>
        {reason && (
          <p className="text-sm text-[#6B7280] mb-1">{reason}</p>
        )}
        <p className="text-sm text-[#6B7280] mb-5">
          Upgrade to unlock all 4 modules, unlimited sessions, voice mode, trade-off scoring, and practical coding questions.
        </p>

        {/* Pricing hint */}
        <div className="bg-[#F8F9FB] rounded-xl px-4 py-3 mb-5 flex items-center justify-between">
          <div>
            <span className="text-xl font-bold text-[#111827]" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>$39.99</span>
            <span className="text-sm text-[#9CA3AF]">/month</span>
          </div>
          <span className="text-xs text-[#6B7280]">Cancel anytime</span>
        </div>

        {error && <p className="text-xs text-[#DC2626] mb-3">{error}</p>}

        {/* CTA */}
        <button onClick={startCheckout} disabled={loading}
          className="w-full py-3 rounded-xl text-sm font-bold transition-all disabled:opacity-60"
          style={{ background: '#F5A524', color: '#17140F', fontFamily: "'Space Grotesk', sans-serif", boxShadow: '0 4px 12px rgba(245,165,36,.35)' }}>
          {loading ? 'Redirecting to checkout…' : 'Get Pro →'}
        </button>

        <button onClick={onClose}
          className="w-full mt-2 py-2.5 text-sm text-[#6B7280] hover:text-[#111827] transition-colors">
          Maybe later
        </button>
      </div>
    </div>
  )
}
