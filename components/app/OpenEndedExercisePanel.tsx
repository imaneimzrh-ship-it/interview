'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

interface RubricCriterion {
  name: string
  description: string
}

interface Exercise {
  id: string
  title: string
  difficulty: string
  format: string
  task_description: string
  rubric_criteria?: RubricCriterion[]
}

interface RubricGrading {
  scores: Record<string, number>
  overall_score: number
  pass_fail: 'pass' | 'borderline' | 'fail'
  summary_feedback: string
  strengths: string[]
  gaps: string[]
  next_steps: string
}

const PASS_FAIL_STYLE: Record<string, { bg: string; color: string; label: string }> = {
  pass:       { bg: '#DCFCE7', color: '#166534', label: '✓ Pass' },
  borderline: { bg: '#FEF9C3', color: '#854D0E', label: '~ Borderline' },
  fail:       { bg: '#FFE4E6', color: '#9F1239', label: '✗ Needs Work' },
}

const DIFFICULTY_STYLE: Record<string, { bg: string; color: string }> = {
  easy:   { bg: '#DCFCE7', color: '#166534' },
  medium: { bg: '#FEF9C3', color: '#854D0E' },
  hard:   { bg: '#FFE4E6', color: '#9F1239' },
}

async function authHeader(): Promise<Record<string, string>> {
  const { data: { session } } = await createClient().auth.getSession()
  return session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}
}

export default function OpenEndedExercisePanel({
  exercise,
  sessionId,
  onContinue,
}: {
  exercise: Exercise
  sessionId?: string
  onContinue?: () => void
}) {
  const router = useRouter()
  const [response, setResponse] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [grading, setGrading] = useState<RubricGrading | null>(null)
  const [error, setError] = useState('')

  const criteria: RubricCriterion[] = exercise.rubric_criteria ?? []
  const diff = DIFFICULTY_STYLE[exercise.difficulty] ?? DIFFICULTY_STYLE.medium

  async function handleSubmit() {
    if (!response.trim()) { setError('Please write a response before submitting.'); return }
    setSubmitting(true)
    setError('')
    try {
      const hdrs = await authHeader()
      const res = await fetch('/api/interview/submit-technical-answer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...hdrs },
        body: JSON.stringify({
          exercise_id: exercise.id,
          written_response: response,
          session_id: sessionId ?? undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Submission failed.'); setSubmitting(false); return }
      setGrading(data.grading as RubricGrading)
    } catch {
      setError('Network error — please try again.')
    }
    setSubmitting(false)
  }

  if (grading) {
    const pf = PASS_FAIL_STYLE[grading.pass_fail] ?? PASS_FAIL_STYLE.borderline
    return (
      <div className="min-h-screen bg-[#F9FAFB] flex flex-col">
        {/* Top bar */}
        <div className="h-12 bg-white border-b border-[#E5E7EB] flex items-center justify-between px-5 flex-shrink-0">
          <div className="flex items-center gap-2 text-sm font-medium text-[#111827]">
            <span className="w-2 h-2 rounded-full bg-green-400 inline-block" />
            AI Interviewer · {exercise.title}
          </div>
          <button
            onClick={onContinue ?? (() => router.push('/app/practice'))}
            className="px-4 py-1.5 text-sm font-medium rounded-lg bg-[#111827] text-white"
          >
            Done
          </button>
        </div>

        <div className="max-w-2xl mx-auto w-full px-6 py-8">
          <div className="bg-white border border-[#E5E7EB] rounded-2xl p-6 mb-6">
            <div className="flex items-center gap-3 mb-4">
              <span className="text-2xl">📋</span>
              <div>
                <div className="font-bold text-[#111827]">Grading complete</div>
                <div className="text-sm text-[#6B7280]">{exercise.title}</div>
              </div>
              <span className="ml-auto text-sm font-semibold px-3 py-1 rounded-full" style={{ background: pf.bg, color: pf.color }}>
                {pf.label}
              </span>
            </div>

            {/* Overall score */}
            <div className="flex items-center gap-3 mb-5">
              <div className="text-4xl font-bold text-[#111827]">{grading.overall_score}</div>
              <div className="text-sm text-[#6B7280]">/ 10 overall</div>
            </div>

            {/* Per-criterion scores */}
            {criteria.length > 0 && (
              <div className="space-y-2 mb-5">
                {criteria.map(c => {
                  const score = grading.scores[c.name] ?? 0
                  return (
                    <div key={c.name} className="flex items-center gap-3">
                      <div className="flex-1 text-xs text-[#374151]">{c.name.replace(/_/g, ' ')}</div>
                      <div className="w-24 h-1.5 bg-[#E5E7EB] rounded-full overflow-hidden">
                        <div className="h-full rounded-full bg-[#6366F1]" style={{ width: `${score * 10}%` }} />
                      </div>
                      <div className="text-xs font-semibold text-[#111827] w-6 text-right">{score}</div>
                    </div>
                  )
                })}
              </div>
            )}

            <p className="text-sm text-[#374151] leading-relaxed mb-4">{grading.summary_feedback}</p>

            {grading.strengths.length > 0 && (
              <div className="mb-3">
                <div className="text-xs font-semibold text-[#166534] mb-1">Strengths</div>
                <ul className="space-y-1">
                  {grading.strengths.map((s, i) => <li key={i} className="text-xs text-[#374151] flex gap-2"><span className="text-green-500">✓</span>{s}</li>)}
                </ul>
              </div>
            )}

            {grading.gaps.length > 0 && (
              <div className="mb-3">
                <div className="text-xs font-semibold text-[#9F1239] mb-1">Gaps</div>
                <ul className="space-y-1">
                  {grading.gaps.map((g, i) => <li key={i} className="text-xs text-[#374151] flex gap-2"><span className="text-red-400">✗</span>{g}</li>)}
                </ul>
              </div>
            )}

            {grading.next_steps && (
              <div className="bg-[#EEF2FF] rounded-lg px-4 py-3">
                <div className="text-xs font-semibold text-[#4F46E5] mb-0.5">Next step</div>
                <p className="text-xs text-[#374151]">{grading.next_steps}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#F9FAFB] flex flex-col">
      {/* Top bar */}
      <div className="h-12 bg-white border-b border-[#E5E7EB] flex items-center justify-between px-5 flex-shrink-0">
        <div className="flex items-center gap-2 text-sm font-medium text-[#111827]">
          <span className="w-2 h-2 rounded-full bg-green-400 inline-block" />
          AI Interviewer · {exercise.title}
        </div>
        <button
          onClick={() => router.push('/app/practice')}
          className="px-3 py-1 text-xs text-[#6B7280] hover:text-[#111827] border border-[#E5E7EB] rounded-lg"
        >
          Back to Practice Hub
        </button>
      </div>

      {/* Split layout */}
      <div className="flex flex-1 overflow-hidden" style={{ height: 'calc(100vh - 48px)' }}>
        {/* Left: task */}
        <div className="w-[38%] border-r border-[#E5E7EB] bg-white flex flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto p-5">
            <div className="flex items-start gap-2 mb-3 flex-wrap">
              <h2 className="text-base font-bold text-[#111827] flex-1 min-w-0">{exercise.title}</h2>
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full flex-shrink-0" style={{ background: diff.bg, color: diff.color }}>
                {exercise.difficulty.charAt(0).toUpperCase() + exercise.difficulty.slice(1)}
              </span>
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-[#F3F4F6] text-[#6B7280] flex-shrink-0">
                {exercise.format === 'prompt_design' ? 'Prompt Design' : 'Open-ended'}
              </span>
            </div>

            <div className="text-sm text-[#374151] leading-relaxed whitespace-pre-wrap mb-5">
              {exercise.task_description}
            </div>

            {criteria.length > 0 && (
              <div>
                <div className="text-xs font-semibold text-[#6B7280] uppercase tracking-wide mb-2">Graded on</div>
                <div className="space-y-2">
                  {criteria.map(c => (
                    <div key={c.name} className="bg-[#F9FAFB] border border-[#E5E7EB] rounded-lg px-3 py-2">
                      <div className="text-xs font-semibold text-[#111827] mb-0.5">{c.name.replace(/_/g, ' ')}</div>
                      <div className="text-[11px] text-[#6B7280]">{c.description}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right: workspace */}
        <div className="flex-1 flex flex-col overflow-hidden bg-[#F9FAFB]">
          <div className="flex-1 p-5 flex flex-col gap-3 overflow-hidden">
            <div className="text-xs font-semibold text-[#6B7280] uppercase tracking-wide">Your response</div>
            <textarea
              value={response}
              onChange={e => setResponse(e.target.value)}
              placeholder="Describe your approach, architecture decisions, trade-offs, or strategy in detail..."
              className="flex-1 w-full resize-none bg-white border border-[#E5E7EB] rounded-xl p-4 text-sm text-[#111827] placeholder-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-[#6366F1] focus:border-transparent font-mono leading-relaxed"
            />
          </div>

          {error && (
            <div className="mx-5 mb-3 p-3 bg-[#FEF2F2] border border-[#FECACA] rounded-lg text-sm text-[#DC2626]">{error}</div>
          )}

          <div className="px-5 pb-5 flex items-center justify-between">
            <span className="text-xs text-[#9CA3AF]">{response.length} characters · graded by Claude Sonnet</span>
            <button
              onClick={handleSubmit}
              disabled={submitting || !response.trim()}
              className="px-6 py-2.5 rounded-xl text-sm font-semibold transition-all disabled:opacity-50"
              style={{ background: '#6366F1', color: 'white', boxShadow: '0 2px 8px rgba(99,102,241,.3)' }}
            >
              {submitting ? (
                <span className="flex items-center gap-2">
                  <span className="animate-spin inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                  Grading…
                </span>
              ) : 'Submit for Grading'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
