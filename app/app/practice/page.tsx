'use client'
import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import AppLayout from '@/components/app/AppLayout'
import UpgradeModal from '@/components/app/UpgradeModal'
import { createClient } from '@/lib/supabase/client'

interface TopicPillar {
  pillar: string
  label: string
  exercise_count: number
  tier: string
}

interface Exercise {
  id: string
  title: string
  topic_pillar: string
  topic_tags: string[]
  difficulty: string
  format: string
  grading_mode: string
  user_status: 'not_attempted' | 'attempted' | 'passed'
}

interface MockPanelLoop {
  slug: string
  title: string
  description: string
  rounds: string[]
  estimated_minutes: number
  tier: string
}

const DIFFICULTY_STYLE: Record<string, { bg: string; color: string }> = {
  easy:   { bg: '#DCFCE7', color: '#166534' },
  medium: { bg: '#FEF9C3', color: '#854D0E' },
  hard:   { bg: '#FFE4E6', color: '#9F1239' },
}

const FORMAT_ICON: Record<string, string> = {
  code:         '🐍',
  sql:          '🗃️',
  prompt_design:'✍️',
  open_ended:   '💬',
}

const STATUS_BADGE: Record<string, { label: string; bg: string; color: string }> = {
  passed:       { label: '✓ Passed',       bg: '#DCFCE7', color: '#166534' },
  attempted:    { label: '○ Attempted',     bg: '#F3F4F6', color: '#6B7280' },
  not_attempted:{ label: '',                bg: '',        color: ''         },
}

const ROUND_LABELS: Record<string, string> = {
  rag_system_design:  'RAG Design',
  technical_coding:   'Technical Coding',
  production_mlops:   'Production / MLOps',
  behavioral:         'Behavioral',
  agent_orchestration:'Agent Orchestration',
  evaluation_testing: 'Evaluation & Testing',
}

async function authHeader(): Promise<Record<string, string>> {
  const { data: { session } } = await createClient().auth.getSession()
  return session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}
}

export default function PracticeHubPage() {
  const router = useRouter()
  const [topics, setTopics] = useState<TopicPillar[]>([])
  const [exercises, setExercises] = useState<Exercise[]>([])
  const [loops, setLoops] = useState<MockPanelLoop[]>([])
  const [loading, setLoading] = useState(true)
  const [isPro, setIsPro] = useState<boolean | null>(null)
  const [upgradeReason, setUpgradeReason] = useState('')
  const [starting, setStarting] = useState<string | null>(null)
  const [weakTopicsBanner, setWeakTopicsBanner] = useState<string[]>([])

  const [pillar, setPillar]       = useState<string | null>(null)
  const [difficulty, setDifficulty] = useState<string | null>(null)
  const [format, setFormat]       = useState<string | null>(null)
  const [status, setStatus]       = useState<string | null>(null)

  useEffect(() => {
    createClient().auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return
      const { data: p } = await createClient().from('profiles').select('plan').eq('id', user.id).single()
      setIsPro(p?.plan === 'pro')
    })

    authHeader().then(async hdrs => {
      const [topicsRes, loopsRes] = await Promise.all([
        fetch('/api/practice/topics', { headers: hdrs }),
        fetch('/api/practice/mock-panel-loops', { headers: hdrs }),
      ])
      const [topicsData, loopsData] = await Promise.all([topicsRes.json(), loopsRes.json()])
      setTopics(Array.isArray(topicsData) ? topicsData : [])
      setLoops(Array.isArray(loopsData) ? loopsData : [])
    })
  }, [])

  const loadExercises = useCallback(async () => {
    setLoading(true)
    const hdrs = await authHeader()
    const params = new URLSearchParams()
    if (pillar)     params.set('pillar', pillar)
    if (difficulty) params.set('difficulty', difficulty)
    if (format)     params.set('format', format)
    if (status)     params.set('status', status)
    try {
      const res = await fetch(`/api/practice/exercises?${params}`, { headers: hdrs })
      const data = await res.json()
      setExercises(Array.isArray(data) ? data : [])
    } catch { setExercises([]) }
    setLoading(false)
  }, [pillar, difficulty, format, status])

  useEffect(() => { loadExercises() }, [loadExercises])

  async function startExercise(ex: Exercise) {
    if (isPro === false && ex.topic_pillar !== 'rag') {
      setUpgradeReason('This topic is a Pro feature. Upgrade to access all Practice Hub exercises.')
      return
    }
    if (ex.format === 'open_ended' || ex.format === 'prompt_design') {
      router.push(`/app/practice/exercise/${ex.id}`)
      return
    }
    setStarting(ex.id)
    try {
      const hdrs = await authHeader()
      const res = await fetch('/api/interview/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...hdrs },
        body: JSON.stringify({ module_slug: 'technical_coding', lang: 'en', exercise_id: ex.id }),
      })
      const data = await res.json()
      if (!res.ok) {
        if (data.upgrade) { setUpgradeReason(data.error ?? 'This feature requires a Pro plan.'); setStarting(null); return }
        setStarting(null); return
      }
      if (data.exerciseId) sessionStorage.setItem(`session_${data.sessionId}_exerciseId`, data.exerciseId)
      sessionStorage.setItem(`session_${data.sessionId}_opening`, data.openingMessage ?? '')
      sessionStorage.setItem(`session_${data.sessionId}_totalSS`, '1')
      sessionStorage.setItem(`session_${data.sessionId}_voiceEnabled`, 'false')
      router.push(`/app/interview/session?id=${data.sessionId}&lang=en&module=technical_coding`)
    } catch { setStarting(null) }
  }

  async function startMockPanel(loopSlug: string, tier: string) {
    if (isPro === false && tier === 'pro') {
      setUpgradeReason('Mock Panel Simulations require a Pro plan. Upgrade to run full interview loops.')
      return
    }
    setStarting(`loop:${loopSlug}`)
    try {
      const hdrs = await authHeader()
      const res = await fetch('/api/practice/mock-panel/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...hdrs },
        body: JSON.stringify({ loop_slug: loopSlug }),
      })
      const data = await res.json()
      if (!res.ok) { setStarting(null); setUpgradeReason(data.message ?? data.error ?? 'This feature requires a Pro plan.'); return }
      if (Array.isArray(data.weak_topics_used) && data.weak_topics_used.length > 0) {
        setWeakTopicsBanner(data.weak_topics_used)
        setTimeout(() => setWeakTopicsBanner([]), 6000)
      }
      router.push(`/app/interview/session?id=${data.session_id}`)
    } catch { setStarting(null) }
  }

  const planLoaded = isPro !== null

  return (
    <AppLayout>
      {upgradeReason && <UpgradeModal reason={upgradeReason} onClose={() => setUpgradeReason('')} />}

      {weakTopicsBanner.length > 0 && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-[#1E1B4B] text-white text-sm px-5 py-3 rounded-xl shadow-lg flex items-center gap-2">
          <span>🎯</span>
          <span>This session includes extra {weakTopicsBanner.map(t => t.split('.').pop()).join(', ')} questions based on your last attempt</span>
        </div>
      )}

      <div className="max-w-3xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-3xl">🎯</span>
            <h1 className="text-2xl font-bold text-[#111827]">Practice Hub</h1>
          </div>
          <p className="text-[#6B7280] text-sm">Drill by topic, or run a full mock panel simulation.</p>
        </div>

        {/* Topic pillar filter chips */}
        <div className="flex flex-wrap gap-2 mb-4">
          <button
            onClick={() => setPillar(null)}
            className="px-4 py-1.5 rounded-full text-sm font-medium border transition-all"
            style={pillar === null
              ? { background: '#111827', color: 'white', borderColor: '#111827' }
              : { background: 'white', color: '#6B7280', borderColor: '#E5E7EB' }}
          >
            All topics
          </button>
          {topics.map(t => (
            <button
              key={t.pillar}
              onClick={() => setPillar(prev => prev === t.pillar ? null : t.pillar)}
              className="px-4 py-1.5 rounded-full text-sm font-medium border transition-all flex items-center gap-1.5"
              style={pillar === t.pillar
                ? { background: '#111827', color: 'white', borderColor: '#111827' }
                : { background: 'white', color: '#374151', borderColor: '#E5E7EB' }}
            >
              {t.label}
              <span className="text-xs opacity-60">{t.exercise_count}</span>
              {t.tier === 'pro' && <span className="text-[10px] font-bold tracking-wide opacity-70">PRO</span>}
            </button>
          ))}
        </div>

        {/* Secondary filters */}
        <div className="flex flex-wrap gap-2 mb-6">
          {/* Difficulty */}
          {(['easy', 'medium', 'hard'] as const).map(d => (
            <button
              key={d}
              onClick={() => setDifficulty(prev => prev === d ? null : d)}
              className="px-3 py-1 rounded-full text-xs font-semibold border transition-all"
              style={difficulty === d
                ? { background: DIFFICULTY_STYLE[d].bg, color: DIFFICULTY_STYLE[d].color, borderColor: DIFFICULTY_STYLE[d].color }
                : { background: 'white', color: '#6B7280', borderColor: '#E5E7EB' }}
            >
              {d.charAt(0).toUpperCase() + d.slice(1)}
            </button>
          ))}
          <div className="w-px self-stretch bg-[#E5E7EB]" />
          {/* Format */}
          {([['code', '🐍 Code'], ['sql', '🗃️ SQL'], ['open_ended', '💬 Open-ended'], ['prompt_design', '✍️ Prompt']] as const).map(([f, label]) => (
            <button
              key={f}
              onClick={() => setFormat(prev => prev === f ? null : f)}
              className="px-3 py-1 rounded-full text-xs font-semibold border transition-all"
              style={format === f
                ? { background: '#EEF2FF', color: '#4F46E5', borderColor: '#4F46E5' }
                : { background: 'white', color: '#6B7280', borderColor: '#E5E7EB' }}
            >
              {label}
            </button>
          ))}
          <div className="w-px self-stretch bg-[#E5E7EB]" />
          {/* Status */}
          {([['not_attempted', 'Not started'], ['attempted', 'Attempted'], ['passed', 'Passed']] as const).map(([s, label]) => (
            <button
              key={s}
              onClick={() => setStatus(prev => prev === s ? null : s)}
              className="px-3 py-1 rounded-full text-xs font-semibold border transition-all"
              style={status === s
                ? { background: '#F0FDF4', color: '#15803D', borderColor: '#15803D' }
                : { background: 'white', color: '#6B7280', borderColor: '#E5E7EB' }}
            >
              {label}
            </button>
          ))}
          {(difficulty || format || status) && (
            <button
              onClick={() => { setDifficulty(null); setFormat(null); setStatus(null) }}
              className="px-3 py-1 text-xs font-medium text-[#6B7280] hover:text-[#111827] transition-colors"
            >
              Clear
            </button>
          )}
        </div>

        {/* Exercise list */}
        {loading ? (
          <div className="space-y-3 mb-10">
            {[1, 2, 3, 4].map(i => <div key={i} className="h-20 bg-[#F3F4F6] rounded-xl animate-pulse" />)}
          </div>
        ) : exercises.length === 0 ? (
          <div className="text-center py-10 text-[#6B7280] text-sm mb-10">No exercises match the selected filters.</div>
        ) : (
          <div className="space-y-3 mb-10">
            {exercises.map(ex => {
              const diff = DIFFICULTY_STYLE[ex.difficulty] ?? DIFFICULTY_STYLE.medium
              const statusBadge = STATUS_BADGE[ex.user_status]
              const isStarting = starting === ex.id
              return (
                <div
                  key={ex.id}
                  className="bg-white border border-[#E5E7EB] rounded-xl px-5 py-4 flex items-center gap-4 hover:border-[#F5A524] hover:shadow-sm transition-all"
                >
                  <div className="text-2xl flex-shrink-0">{FORMAT_ICON[ex.format] ?? '💻'}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="font-semibold text-[#111827] text-sm">{ex.title}</span>
                      <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full" style={{ background: diff.bg, color: diff.color }}>
                        {ex.difficulty.charAt(0).toUpperCase() + ex.difficulty.slice(1)}
                      </span>
                      {statusBadge.label && (
                        <span className="text-[11px] font-medium px-2 py-0.5 rounded-full" style={{ background: statusBadge.bg, color: statusBadge.color }}>
                          {statusBadge.label}
                        </span>
                      )}
                    </div>
                    {ex.topic_tags?.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {ex.topic_tags.slice(0, 3).map(t => (
                          <span key={t} className="text-[10px] px-2 py-0.5 rounded-full bg-[#F3F4F6] text-[#6B7280]">{t.replace(/_/g, ' ')}</span>
                        ))}
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => startExercise(ex)}
                    disabled={!planLoaded || starting !== null}
                    className="flex-shrink-0 px-4 py-1.5 rounded-lg text-sm font-medium border border-[#E5E7EB] text-[#374151] hover:bg-[#F9FAFB] hover:border-[#D1D5DB] transition-all disabled:opacity-50"
                  >
                    {isStarting
                      ? <span className="animate-spin inline-block w-4 h-4 border-2 border-[#374151] border-t-transparent rounded-full" />
                      : ex.user_status === 'passed' ? 'Retry' : 'Start'
                    }
                  </button>
                </div>
              )
            })}
          </div>
        )}

        {/* Mock Panel Simulation */}
        <div className="border-t border-[#E5E7EB] pt-8">
          <div className="mb-5">
            <h2 className="text-lg font-bold text-[#111827] mb-1">Mock Panel Simulation</h2>
            <p className="text-sm text-[#6B7280]">Put it all together — a complete interview loop across the topics above.</p>
          </div>

          {loops.length === 0 ? (
            <div className="text-center py-8 text-[#6B7280] text-sm">Loading loops…</div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {loops.map(loop => {
                const isStarting = starting === `loop:${loop.slug}`
                return (
                  <div key={loop.slug} className="bg-white border border-[#E5E7EB] rounded-xl p-5 flex flex-col gap-3 hover:border-[#6366F1] hover:shadow-sm transition-all">
                    <div>
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <span className="font-semibold text-[#111827] text-sm leading-snug">{loop.title}</span>
                        {loop.tier === 'pro' && (
                          <span className="text-[10px] font-bold tracking-wide px-2 py-0.5 rounded-full bg-[#EEF2FF] text-[#4F46E5] flex-shrink-0">PRO</span>
                        )}
                      </div>
                      <p className="text-xs text-[#6B7280] leading-relaxed">{loop.description}</p>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {(loop.rounds as string[]).map(r => (
                        <span key={r} className="text-[10px] px-2 py-0.5 rounded-full bg-[#F3F4F6] text-[#374151]">
                          {ROUND_LABELS[r] ?? r}
                        </span>
                      ))}
                    </div>
                    <div className="flex items-center justify-between mt-auto pt-2 border-t border-[#F3F4F6]">
                      <span className="text-xs text-[#9CA3AF]">~{loop.estimated_minutes} min</span>
                      <button
                        onClick={() => startMockPanel(loop.slug, loop.tier)}
                        disabled={!planLoaded || starting !== null}
                        className="px-4 py-1.5 rounded-lg text-sm font-semibold transition-all disabled:opacity-50"
                        style={{ background: '#6366F1', color: 'white' }}
                      >
                        {isStarting
                          ? <span className="animate-spin inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                          : 'Start Loop'
                        }
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  )
}
