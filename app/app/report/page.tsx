'use client'
import { useEffect, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'

function ReportRedirect() {
  const params = useSearchParams()
  const router = useRouter()
  useEffect(() => {
    const id   = params.get('id')
    const lang = params.get('lang') ?? 'en'
    if (id) router.replace(`/interview/report?id=${id}&lang=${lang}`)
    else    router.replace('/app/history')
  }, [])
  return null
}

export default function AppReportPage() {
  return <Suspense fallback={null}><ReportRedirect /></Suspense>
}
