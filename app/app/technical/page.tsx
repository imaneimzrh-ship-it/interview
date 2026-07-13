'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import AppLayout from '@/components/app/AppLayout'
import UpgradeModal from '@/components/app/UpgradeModal'
import { createClient } from '@/lib/supabase/client'

interface Exercise {
  id: string
  title: string
  difficulty: 'easy' | 'medium' | 'hard'
  language: string
}

const TOPIC_MAP: Record<string, string[]> = {
  'Fix the Broken RAG Retrieval Pipeline':   ['RAG', 'Embeddings', 'Cosine Similarity'],
  'Prompt Engineering Rewrite':              ['Prompting', 'System Prompts', 'Instruction Design'],
  'Token Cost Optimization':                 ['Token Budget', 'Batching', 'Cost Optimization'],
  'SQL Debugging: User Events Join':         ['SQL', 'Data Engineering', 'Analytics'],
  'Chunking Strategy Fix':                   ['RAG', 'Text Chunking', 'Indexing'],
  'Build a BM25 Keyword Scorer':             ['Search', 'BM25', 'Hybrid RAG'],
  'Optimize a Slow RAG Pipeline':            ['RAG', 'Performance', 'Embeddings'],
  'Implement Retry with Exponential Backoff': ['API Reliability', 'Error Handling', 'Production'],
  'Parse Structured LLM Output':             ['Structured Output', 'JSON Parsing', 'Reliability'],
  'Manage Context Window Overflow':          ['Context Window', 'Token Budget', 'Memory'],
}

const DIFFICULTY_STYLE: Record<string, { bg: string; color: string; label: string }> = {
  easy:   { bg: '#DCFCE7', color: '#166534', label: 'Easy' },
  medium: { bg: '#FEF9C3', color: '#854D0E', label: 'Medium' },
  hard:   { bg: '#FFE4E6', color: '#9F1239', label: 'Hard' },
}

const LANG_ICON: Record<string, string> = {
  python: '🐍',
  sql:    '🗃️',
  text:   '✍️',
}

async function authHeader(): Promise<Record<string, string>> {
  const { data: { session } } = await createClient().auth.getSession()
  if (session?.access_token) return { Authorization: `Bearer ${session.access_token}` }
  return {}
}

export default function TechnicalPracticePage() {
  const router = useRouter()
  const [exercises, setExercises] = useState<Exercise[]>([])
  const [loading, setLoading] = useState(true)
  const [starting, setStarting] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [isPro, setIsPro] = useState<boolean | null>(null)
  const [upgradeReason, setUpgradeReason] = useState('')

  useEffect(() => {
    createClient().auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return
      const { data: p } = await createClient().from('profiles').select('plan').eq('id', user.id).single()
      setIsPro(p?.plan === 'pro')
    })

    authHeader().then(hdrs =>
      fetch('/api/exercises', { headers: hdrs })
        .then(r => r.json())
        .then(d => setExercises(d.exercises ?? []))
        .catch(() => {})
        .finally(() => setLoading(false))
    )
  }, [])

  async function startExercise(exerciseId?: string) {
    if (isPro === false) {
      setUpgradeReason('Technical Practice is a Pro feature. Upgrade to access all coding exercises.')
      return
    }
    setStarting(exerciseId ?? 'random')
    setError('')
    try {
      const hdrs = await authHeader()
      const res = await fetch('/api/interview/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...hdrs },
        body: JSON.stringify({ module_slug: 'technical_coding', lang: 'en', exercise_id: exerciseId ?? null }),
      })
      const data = await res.json()
      if (!res.ok) {
        if (data.upgrade) { setUpgradeReason(data.error ?? 'This feature requires a Pro plan.'); setStarting(null); return }
        setError(data.error ?? 'Failed to start.'); setStarting(null); return
      }
      sessionStorage.setItem(`session_${data.sessionId}_opening`, data.openingMessage ?? '')
      sessionStorage.setItem(`session_${data.sessionId}_totalSS`, '1')
      sessionStorage.setItem(`session_${data.sessionId}_voiceEnabled`, 'false')
      if (data.exerciseId) {
        sessionStorage.setItem(`session_${data.sessionId}_exerciseId`, data.exerciseId)
      }
      router.push(`/app/interview/session?id=${data.sessionId}&lang=en&module=technical_coding`)
    } catch {
      setError('Network error — please try again.')
      setStarting(null)
    }
  }

  const planLoaded = isPro !== null

  return (
    <AppLayout>
      {upgradeReason && <UpgradeModal reason={upgradeReason} onClose={() => setUpgradeReason('')} />}
      <div className="max-w-3xl mx-auto px-6 py-8">

        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-3xl">⌨️</span>
            <h1 className="text-2xl font-bold text-[#111827]">Technical Practice</h1>
          </div>
          <p className="text-[#6B7280] text-sm leading-relaxed">
            Hands-on coding exercises modelled after real AI engineer interview rounds — fix bugs, implement
            algorithms from scratch, and optimize pipelines. Each submission runs live tests and gets an
            AI-generated scorecard.
          </p>
        </div>

        {/* What to expect */}
        <div className="bg-[#FFFBEB] border border-[#FDE68A] rounded-xl px-5 py-4 mb-8 text-sm text-[#92400E]">
          <p className="font-semibold mb-1">What to expect</p>
          <ul className="list-disc list-inside space-y-0.5 text-[#78350F]">
            <li>Code runs in an isolated sandbox — no setup required</li>
            <li>Automated test suite grades your solution immediately</li>
            <li>Claude grades your explanation and code quality</li>
            <li>Mirrors exercises at companies like Anthropic, Cohere, and AI-first startups</li>
          </ul>
        </div>

        {/* Quick start */}
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-semibold text-[#111827]">Exercise library</h2>
          <button
            onClick={() => startExercise()}
            disabled={!planLoaded || starting !== null}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all disabled:opacity-50"
            style={{ background: '#F5A524', color: '#17140F', boxShadow: '0 2px 8px rgba(245,165,36,.25)' }}
          >
            {starting === 'random' ? (
              <><span className="animate-spin inline-block w-4 h-4 border-2 border-[#17140F] border-t-transparent rounded-full" /><span>Starting…</span></>
            ) : (
              <><span>🎲</span><span>Random Exercise</span></>
            )}
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-[#FEF2F2] border border-[#FECACA] rounded-lg text-sm text-[#DC2626]">{error}</div>
        )}

        {/* Exercise cards */}
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="h-24 bg-[#F3F4F6] rounded-xl animate-pulse" />
            ))}
          </div>
        ) : exercises.length === 0 ? (
          <div className="text-center py-12 text-[#6B7280] text-sm">
            No exercises found. Run migrations 008–010 in Supabase SQL Editor.
          </div>
        ) : (
          <div className="space-y-3">
            {exercises.map(ex => {
              const diff = DIFFICULTY_STYLE[ex.difficulty] ?? DIFFICULTY_STYLE.medium
              const topics = TOPIC_MAP[ex.title] ?? []
              const isStarting = starting === ex.id
              return (
                <div
                  key={ex.id}
                  className="bg-white border border-[#E5E7EB] rounded-xl px-5 py-4 flex items-center gap-4 hover:border-[#F5A524] hover:shadow-sm transition-all"
                >
                  <div className="text-2xl flex-shrink-0">{LANG_ICON[ex.language] ?? '💻'}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="font-semibold text-[#111827] text-sm">{ex.title}</span>
                      <span
                        className="text-[11px] font-semibold px-2 py-0.5 rounded-full"
                        style={{ background: diff.bg, color: diff.color }}
                      >
                        {diff.label}
                      </span>
                    </div>
                    {topics.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {topics.map(t => (
                          <span key={t} className="text-[10px] px-2 py-0.5 rounded-full bg-[#F3F4F6] text-[#6B7280]">{t}</span>
                        ))}
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => startExercise(ex.id)}
                    disabled={!planLoaded || starting !== null}
                    className="flex-shrink-0 px-4 py-1.5 rounded-lg text-sm font-medium border border-[#E5E7EB] text-[#374151] hover:bg-[#F9FAFB] hover:border-[#D1D5DB] transition-all disabled:opacity-50"
                  >
                    {isStarting ? (
                      <span className="animate-spin inline-block w-4 h-4 border-2 border-[#374151] border-t-transparent rounded-full" />
                    ) : (
                      'Start'
                    )}
                  </button>
                </div>
              )
            })}
          </div>
        )}

        {/* Footer note */}
        <p className="text-center text-[#9CA3AF] text-xs mt-8">
          New exercises added regularly · Graded by Claude Sonnet · Runs in E2B sandbox
        </p>
      </div>
    </AppLayout>
  )
}
