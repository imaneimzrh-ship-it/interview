'use client'
import { useEffect, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'

interface Session {
  score_overall: number; score_clarity: number; score_depth: number
  score_structure: number; score_examples: number; score_technical?: number
  hire_decision: string; ai_summary: string; ai_strengths: string[]
  ai_gaps: string[]; ai_next: string; role: string; company: string
  duration_secs: number; is_ai_role: boolean
}

const HIRE_COLORS: Record<string, string> = {
  strong_yes: 'text-green', yes: 'text-green', lean_yes: 'text-blue',
  lean_no: 'text-gold', no: 'text-red', strong_no: 'text-red',
}
const HIRE_LABELS: Record<string, string> = {
  strong_yes: 'Strong yes — would hire', yes: 'Yes — would hire',
  lean_yes: 'Lean yes — would likely hire', lean_no: 'Lean no — gaps to address',
  no: 'No — not ready', strong_no: 'Strong no — significant gaps',
}

function ScoreBar({ label, score }: { label: string; score: number }) {
  const color = score >= 80 ? '#1DB954' : score >= 65 ? '#4776F7' : score >= 50 ? '#E8A020' : '#E84040'
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs text-dim w-20 flex-shrink-0">{label}</span>
      <div className="flex-1 h-1.5 bg-border rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all duration-700" style={{ width: `${score}%`, background: color }} />
      </div>
      <span className="text-xs font-medium w-7 text-right" style={{ color }}>{score}</span>
    </div>
  )
}

export default function ResultsPage() {
  const params = useSearchParams()
  const router = useRouter()
  const id = params.get('id')
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!id) { router.push('/interview'); return }
    fetch(`/api/interview/results?id=${id}`)
      .then(r => r.json())
      .then(d => { if (d.session) setSession(d.session); else setError(d.error ?? 'Could not load results.') })
      .catch(() => setError('Network error.'))
      .finally(() => setLoading(false))
  }, [id])

  if (loading) return (
    <div className="min-h-screen bg-bg flex items-center justify-center">
      <div className="text-center">
        <div className="w-8 h-8 border-2 border-blue/30 border-t-blue rounded-full animate-spin mx-auto mb-3" />
        <p className="text-sm text-dim">Loading results...</p>
      </div>
    </div>
  )

  if (error || !session) return (
    <div className="min-h-screen bg-bg flex items-center justify-center px-4">
      <div className="card p-8 text-center max-w-sm">
        <p className="text-red mb-4">{error || 'Results not available.'}</p>
        <Link href="/dashboard" className="btn-blue">Go to dashboard</Link>
      </div>
    </div>
  )

  const score = session.score_overall ?? 0
  const scoreColor = score >= 80 ? '#1DB954' : score >= 65 ? '#4776F7' : score >= 50 ? '#E8A020' : '#E84040'
  const dur = session.duration_secs ? `${Math.floor(session.duration_secs / 60)}m ${session.duration_secs % 60}s` : ''

  return (
    <div className="min-h-screen bg-bg">
      <div className="border-b border-border bg-card px-4 py-3">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-blue flex items-center justify-center text-white text-xs font-bold">S</div>
            <span className="font-semibold text-sm text-bright">Interview Results</span>
          </div>
          <Link href="/interview" className="btn-ghost text-xs px-3 py-1.5">Practice again</Link>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-8 space-y-4">

        {/* Overall */}
        <div className="card p-6 flex flex-col sm:flex-row gap-6 items-center sm:items-start">
          <div className="flex flex-col items-center gap-1 flex-shrink-0">
            <div className="relative w-24 h-24">
              <svg className="w-24 h-24 -rotate-90" viewBox="0 0 96 96">
                <circle cx="48" cy="48" r="40" stroke="#1C1D28" strokeWidth="8" fill="none" />
                <circle cx="48" cy="48" r="40" fill="none" stroke={scoreColor} strokeWidth="8"
                  strokeLinecap="round" strokeDasharray={`${2 * Math.PI * 40}`}
                  strokeDashoffset={`${2 * Math.PI * 40 * (1 - score / 100)}`}
                  style={{ transition: 'stroke-dashoffset 1s ease' }} />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-2xl font-bold" style={{ color: scoreColor }}>{score}</span>
                <span className="text-xs text-dim">/100</span>
              </div>
            </div>
            {session.hire_decision && (
              <span className={`text-xs font-medium ${HIRE_COLORS[session.hire_decision] ?? 'text-dim'}`}>
                {HIRE_LABELS[session.hire_decision] ?? session.hire_decision}
              </span>
            )}
            {dur && <span className="text-xs text-dim">{dur}</span>}
          </div>
          <div className="flex-1">
            <p className="text-xs text-dim uppercase tracking-widest mb-1">Overall assessment</p>
            <p className="text-sm text-bright leading-relaxed">{session.ai_summary}</p>
          </div>
        </div>

        {/* Score breakdown */}
        <div className="card p-5">
          <p className="text-xs text-dim uppercase tracking-widest mb-4">Score breakdown</p>
          <div className="space-y-3">
            <ScoreBar label="Clarity" score={session.score_clarity ?? 0} />
            <ScoreBar label="Depth" score={session.score_depth ?? 0} />
            <ScoreBar label="Structure" score={session.score_structure ?? 0} />
            <ScoreBar label="Examples" score={session.score_examples ?? 0} />
            {session.is_ai_role && session.score_technical && (
              <ScoreBar label="Technical" score={session.score_technical} />
            )}
          </div>
        </div>

        {/* Strengths and gaps */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="card p-5">
            <p className="text-xs text-dim uppercase tracking-widest mb-3">Strengths</p>
            <div className="space-y-2">
              {(session.ai_strengths ?? []).map((s, i) => (
                <div key={i} className="flex items-start gap-2 text-xs text-bright">
                  <span className="text-green mt-0.5 flex-shrink-0">✓</span>{s}
                </div>
              ))}
            </div>
          </div>
          <div className="card p-5">
            <p className="text-xs text-dim uppercase tracking-widest mb-3">Gaps to address</p>
            <div className="space-y-2">
              {(session.ai_gaps ?? []).map((g, i) => (
                <div key={i} className="flex items-start gap-2 text-xs text-bright">
                  <span className="text-gold mt-0.5 flex-shrink-0">→</span>{g}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Next step */}
        {session.ai_next && (
          <div className="card p-5 border-blue/20">
            <p className="text-xs text-blue font-medium mb-1">One thing to do before your next session</p>
            <p className="text-sm text-bright leading-relaxed">{session.ai_next}</p>
          </div>
        )}

        <div className="flex gap-3">
          <Link href="/interview" className="btn-blue flex-1 justify-center py-3">Practice again →</Link>
          <Link href="/dashboard" className="btn-ghost flex-1 justify-center py-3">All sessions</Link>
        </div>
      </div>
    </div>
  )
}
