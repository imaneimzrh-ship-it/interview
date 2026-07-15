'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'

const STORAGE_KEY = 'sonne_cookie_consent'

type ConsentState = 'granted' | 'denied' | null

function grantConsent() {
  if (typeof window === 'undefined' || !window.gtag) return
  window.gtag('consent', 'update', {
    analytics_storage: 'granted',
    ad_storage: 'granted',
    ad_user_data: 'granted',
    ad_personalization: 'granted',
  })
}

function denyConsent() {
  if (typeof window === 'undefined' || !window.gtag) return
  window.gtag('consent', 'update', {
    analytics_storage: 'denied',
    ad_storage: 'denied',
    ad_user_data: 'denied',
    ad_personalization: 'denied',
  })
}

export default function CookieConsent() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY) as ConsentState
    if (stored === 'granted') {
      grantConsent()
    } else if (stored === null) {
      // No prior choice — show banner
      setVisible(true)
    }
    // 'denied' → leave gtag defaults (denied) and don't show banner again
  }, [])

  function accept() {
    localStorage.setItem(STORAGE_KEY, 'granted')
    grantConsent()
    setVisible(false)
  }

  function decline() {
    localStorage.setItem(STORAGE_KEY, 'denied')
    denyConsent()
    setVisible(false)
  }

  if (!visible) return null

  return (
    <div
      role="dialog"
      aria-label="Cookie consent"
      className="fixed bottom-0 left-0 right-0 z-50 p-4 sm:p-6"
    >
      <div
        className="max-w-2xl mx-auto rounded-2xl border border-[#E7E2D8] shadow-xl px-5 py-4 flex flex-col sm:flex-row items-start sm:items-center gap-4"
        style={{ background: '#FBFAF7' }}
      >
        <p className="text-sm text-[#374151] leading-relaxed flex-1">
          We use cookies for authentication and, with your consent, analytics and advertising to improve the service.{' '}
          <Link href="/privacy#cookies" className="text-[#F5A524] hover:underline font-medium">
            Learn more
          </Link>
        </p>
        <div className="flex gap-2 flex-shrink-0">
          <button
            onClick={decline}
            className="px-4 py-2 text-sm font-medium rounded-xl border border-[#E7E2D8] text-[#7A7267] hover:border-[#C7C2B8] hover:text-[#17140F] transition-all"
            style={{ fontFamily: "'Space Grotesk', sans-serif" }}
          >
            Essential only
          </button>
          <button
            onClick={accept}
            className="px-4 py-2 text-sm font-bold rounded-xl text-white transition-all"
            style={{ background: '#1E2A44', fontFamily: "'Space Grotesk', sans-serif" }}
          >
            Accept all
          </button>
        </div>
      </div>
    </div>
  )
}
