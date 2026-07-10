'use client'
import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Suspense } from 'react'

function CallbackHandler() {
  const router = useSearchParams()
  const nav = useRouter()
  const [error, setError] = useState('')

  useEffect(() => {
    const code = router.get('code')
    const next = router.get('next') ?? '/dashboard'

    if (!code) {
      nav.replace(`/login?message=Sign-in link expired or already used. Please try again.`)
      return
    }

    const sb = createClient()
    sb.auth.exchangeCodeForSession(code).then(({ error: err }) => {
      if (err) {
        nav.replace(`/login?message=${encodeURIComponent(err.message || 'Could not sign you in. Please try again.')}`)
      } else {
        nav.replace(next)
      }
    })
  }, [])

  if (error) return null

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0D0E14]">
      <div className="flex flex-col items-center gap-4">
        <div className="w-8 h-8 border-2 border-[#F5A524]/30 border-t-[#F5A524] rounded-full animate-spin" />
        <p className="text-sm text-[#9CA3AF]">Signing you in…</p>
      </div>
    </div>
  )
}

export default function AuthCallback() {
  return <Suspense fallback={
    <div className="min-h-screen flex items-center justify-center bg-[#0D0E14]">
      <div className="w-8 h-8 border-2 border-[#F5A524]/30 border-t-[#F5A524] rounded-full animate-spin" />
    </div>
  }><CallbackHandler /></Suspense>
}
