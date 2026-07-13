'use client'
import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import OpenEndedExercisePanel from '@/components/app/OpenEndedExercisePanel'
import TechnicalExercisePanel from '@/components/app/TechnicalExercisePanel'

interface Exercise {
  id: string
  title: string
  difficulty: string
  format: string
  grading_mode: string
  language: string
  task_description: string
  test_cases?: unknown
  rubric_criteria?: { name: string; description: string }[]
}

async function authHeader(): Promise<Record<string, string>> {
  const { data: { session } } = await createClient().auth.getSession()
  return session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}
}

export default function PracticeExercisePage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [exercise, setExercise] = useState<Exercise | null>(null)
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    async function load() {
      const hdrs = await authHeader()
      // Fetch exercise detail
      const res = await fetch(`/api/practice/exercises/${id}`, { headers: hdrs })
      if (!res.ok) { setError('Exercise not found.'); setLoading(false); return }
      const data = await res.json()
      setExercise(data)

      // For code/sql exercises, start an interview session first so hints work
      if (data.format === 'code' || data.format === 'sql') {
        const startRes = await fetch('/api/interview/start', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...hdrs },
          body: JSON.stringify({ module_slug: 'technical_coding', lang: 'en', exercise_id: id }),
        })
        const startData = await startRes.json()
        if (startRes.ok && startData.sessionId) {
          if (startData.exerciseId) sessionStorage.setItem(`session_${startData.sessionId}_exerciseId`, startData.exerciseId)
          sessionStorage.setItem(`session_${startData.sessionId}_opening`, startData.openingMessage ?? '')
          sessionStorage.setItem(`session_${startData.sessionId}_totalSS`, '1')
          sessionStorage.setItem(`session_${startData.sessionId}_voiceEnabled`, 'false')
          // Redirect to full session page for code exercises
          router.replace(`/app/interview/session?id=${startData.sessionId}&lang=en&module=technical_coding`)
          return
        }
      }
      setLoading(false)
    }
    load()
  }, [id, router])

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F9FAFB] flex items-center justify-center">
        <div className="animate-spin w-6 h-6 border-2 border-[#6366F1] border-t-transparent rounded-full" />
      </div>
    )
  }

  if (error || !exercise) {
    return (
      <div className="min-h-screen bg-[#F9FAFB] flex items-center justify-center">
        <div className="text-center">
          <p className="text-[#DC2626] mb-4">{error || 'Exercise not found.'}</p>
          <button onClick={() => router.push('/app/practice')} className="text-[#6366F1] text-sm underline">Back to Practice Hub</button>
        </div>
      </div>
    )
  }

  return (
    <OpenEndedExercisePanel
      exercise={exercise}
      sessionId={sessionId ?? undefined}
      onContinue={() => router.push('/app/practice')}
    />
  )
}
