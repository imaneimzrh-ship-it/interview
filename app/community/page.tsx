'use client'
import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import SunMark from '@/components/SunMark'

interface Report {
  id: string
  question_text: string
  cluster: string
  round: string
  role_track?: string
  company_name?: string
  year?: number
  outcome?: string
  upvote_count: number
  created_at: string
}

const CLUSTER_LABELS: Record<string, string> = {
  rag:                  'RAG System Design',
  agent_orchestration:  'Agent Orchestration',
  evaluation_testing:   'Evaluation & Testing',
  production_mlops:     'Production / MLOps',
}

const ROUND_LABELS: Record<string, string> = {
  screening:     'Screening',
  technical:     'Technical',
  system_design: 'System Design',
  behavioral:    'Behavioral',
  deep_dive:     'Deep Dive',
}

const OUTCOME_STYLE: Record<string, { label: string; color: string; bg: string }> = {
  got_offer:  { label: 'Got offer',  color: '#166534', bg: '#DCFCE7' },
  rejected:   { label: 'Rejected',   color: '#9F1239', bg: '#FFE4E6' },
  no_update:  { label: 'No update',  color: '#854D0E', bg: '#FEF9C3' },
}

function useAuthUser() {
  const [user, setUser] = useState<{ id: string; email?: string } | null | 'loading'>('loading')
  useEffect(() => {
    const sb = createClient()
    sb.auth.getUser().then(({ data }) => setUser(data.user ?? null))
    const { data: { subscription } } = sb.auth.onAuthStateChange((_, session) => {
      setUser(session?.user ?? null)
    })
    return () => subscription.unsubscribe()
  }, [])
  return user
}

function SignupPrompt({ message, onClose }: { message: string; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-xl p-6 max-w-sm w-full text-center">
        <div className="text-3xl mb-3">🌐</div>
        <h3 className="font-bold text-[#111827] text-lg mb-2">Create a free account</h3>
        <p className="text-[#6B7280] text-sm mb-5">{message}</p>
        <div className="flex gap-3">
          <Link href="/signup" className="flex-1 py-2.5 rounded-lg text-sm font-semibold bg-[#F5A524] text-[#17140F] hover:bg-[#D98A0B] transition-all text-center">
            Sign up free
          </Link>
          <button onClick={onClose} className="flex-1 py-2.5 rounded-lg text-sm font-medium border border-[#E5E7EB] text-[#374151] hover:bg-[#F9FAFB] transition-all">
            Not now
          </button>
        </div>
      </div>
    </div>
  )
}

function SubmitForm({ userId, onSuccess }: { userId: string; onSuccess: () => void }) {
  const [form, setForm] = useState({ question_text: '', cluster: 'rag', round: 'technical', role_track: '', company_name: '', year: '', outcome: '' })
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.question_text.trim()) return
    setSubmitting(true)
    setError('')
    const sb = createClient()
    const { data: { session } } = await sb.auth.getSession()
    const res = await fetch('/api/reports', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token}` },
      body: JSON.stringify({
        ...form,
        year: form.year ? parseInt(form.year) : undefined,
        outcome: form.outcome || undefined,
        role_track: form.role_track || undefined,
        company_name: form.company_name || undefined,
      }),
    })
    setSubmitting(false)
    if (!res.ok) { setError('Failed to submit. Try again.'); return }
    onSuccess()
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <div>
        <label className="block text-xs font-semibold text-[#374151] mb-1">Interview question *</label>
        <textarea
          value={form.question_text}
          onChange={e => setForm(f => ({ ...f, question_text: e.target.value }))}
          placeholder="Paste the exact question you were asked..."
          rows={3}
          maxLength={2000}
          className="w-full border border-[#E5E7EB] rounded-lg px-3 py-2 text-sm text-[#111827] resize-none focus:outline-none focus:border-[#F5A524]"
          required
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-semibold text-[#374151] mb-1">Topic cluster *</label>
          <select value={form.cluster} onChange={e => setForm(f => ({ ...f, cluster: e.target.value }))} className="w-full border border-[#E5E7EB] rounded-lg px-3 py-2 text-sm text-[#111827] focus:outline-none focus:border-[#F5A524]">
            {Object.entries(CLUSTER_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-semibold text-[#374151] mb-1">Interview round *</label>
          <select value={form.round} onChange={e => setForm(f => ({ ...f, round: e.target.value }))} className="w-full border border-[#E5E7EB] rounded-lg px-3 py-2 text-sm text-[#111827] focus:outline-none focus:border-[#F5A524]">
            {Object.entries(ROUND_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className="block text-xs font-semibold text-[#374151] mb-1">Role (optional)</label>
          <input value={form.role_track} onChange={e => setForm(f => ({ ...f, role_track: e.target.value }))} placeholder="e.g. AI Engineer" maxLength={100} className="w-full border border-[#E5E7EB] rounded-lg px-3 py-2 text-sm text-[#111827] focus:outline-none focus:border-[#F5A524]" />
        </div>
        <div>
          <label className="block text-xs font-semibold text-[#374151] mb-1">Year (optional)</label>
          <input value={form.year} onChange={e => setForm(f => ({ ...f, year: e.target.value }))} placeholder="2026" maxLength={4} className="w-full border border-[#E5E7EB] rounded-lg px-3 py-2 text-sm text-[#111827] focus:outline-none focus:border-[#F5A524]" />
        </div>
        <div>
          <label className="block text-xs font-semibold text-[#374151] mb-1">Outcome (optional)</label>
          <select value={form.outcome} onChange={e => setForm(f => ({ ...f, outcome: e.target.value }))} className="w-full border border-[#E5E7EB] rounded-lg px-3 py-2 text-sm text-[#111827] focus:outline-none focus:border-[#F5A524]">
            <option value="">—</option>
            <option value="got_offer">Got offer</option>
            <option value="rejected">Rejected</option>
            <option value="no_update">No update</option>
          </select>
        </div>
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
      <button type="submit" disabled={submitting} className="w-full py-2.5 rounded-lg text-sm font-semibold bg-[#1E2A44] text-white hover:bg-[#2d3f61] transition-all disabled:opacity-50">
        {submitting ? 'Submitting…' : 'Submit question (pending review)'}
      </button>
    </form>
  )
}

export default function CommunityPage() {
  const user = useAuthUser()
  const [reports, setReports] = useState<Report[]>([])
  const [loading, setLoading] = useState(true)
  const [cluster, setCluster] = useState<string | null>(null)
  const [showSubmit, setShowSubmit] = useState(false)
  const [showPrompt, setShowPrompt] = useState(false)
  const [promptMsg, setPromptMsg] = useState('')
  const [upvoted, setUpvoted] = useState<Set<string>>(new Set())

  const loadReports = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams({ limit: '30' })
    if (cluster) params.set('cluster', cluster)
    const res = await fetch(`/api/reports?${params}`)
    const data = await res.json()
    setReports(Array.isArray(data) ? data : [])
    setLoading(false)
  }, [cluster])

  useEffect(() => { loadReports() }, [loadReports])

  async function requireAuth(action: () => void, msg: string) {
    if (user === 'loading') return
    if (!user) { setPromptMsg(msg); setShowPrompt(true); return }
    action()
  }

  async function upvote(reportId: string) {
    if (user === 'loading' || !user) { setPromptMsg('Create a free account to upvote questions.'); setShowPrompt(true); return }
    if (upvoted.has(reportId)) return
    const sb = createClient()
    const { data: { session } } = await sb.auth.getSession()
    await fetch(`/api/reports/${reportId}/upvote`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${session?.access_token}` },
    })
    setUpvoted(prev => new Set([...prev, reportId]))
    setReports(prev => prev.map(r => r.id === reportId ? { ...r, upvote_count: r.upvote_count + 1 } : r))
  }

  const isLoggedIn = user !== 'loading' && user !== null

  return (
    <div className="min-h-screen" style={{ background: '#FBFAF7', fontFamily: "'Inter', system-ui, sans-serif" }}>
      {showPrompt && <SignupPrompt message={promptMsg} onClose={() => setShowPrompt(false)} />}

      {/* Nav */}
      <nav className="sticky top-0 z-40 border-b border-[#E7E2D8]" style={{ background: 'rgba(251,250,247,.92)', backdropFilter: 'blur(12px)' }}>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-[#1E2A44] flex items-center justify-center"><SunMark size={12} /></div>
            <span className="font-bold text-[#17140F] text-[15px]">Sonne AI</span>
          </Link>
          <div className="flex items-center gap-3">
            {isLoggedIn ? (
              <Link href="/app/start" className="text-sm font-medium text-[#374151] hover:text-[#111827] transition-colors">Dashboard →</Link>
            ) : (
              <>
                <Link href="/login" className="text-sm text-[#7A7267] hover:text-[#17140F] transition-colors">Sign in</Link>
                <Link href="/signup" className="text-sm font-semibold bg-[#F5A524] text-[#17140F] px-3.5 py-1.5 rounded-lg hover:bg-[#D98A0B] transition-all shadow-sm">
                  Try it free →
                </Link>
              </>
            )}
          </div>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10">
        {/* Header */}
        <div className="mb-8">
          <p className="text-xs font-semibold text-[#7A7267] uppercase tracking-widest mb-2">COMMUNITY DATABASE</p>
          <h1 className="text-3xl font-bold text-[#17140F] mb-3">Real interview questions from real candidates</h1>
          <p className="text-[#7A7267] text-base leading-relaxed max-w-2xl">
            Every question here was reported by someone who actually sat in the interview.
            Browse for free — no account needed. Create a free account to add your own report,
            upvote questions you recognise, or join the discussion in comments.
          </p>
          <div className="flex items-center gap-4 mt-4">
            <button
              onClick={() => requireAuth(() => setShowSubmit(s => !s), 'Create a free account to submit interview questions.')}
              className="px-5 py-2 rounded-lg text-sm font-semibold bg-[#1E2A44] text-white hover:bg-[#2d3f61] transition-all"
            >
              + Submit a question
            </button>
            {!isLoggedIn && (
              <p className="text-xs text-[#9CA3AF]">Free to browse · Free account to contribute</p>
            )}
          </div>
        </div>

        {/* Submit form */}
        {showSubmit && isLoggedIn && typeof user !== 'string' && user && (
          <div className="bg-white border border-[#E5E7EB] rounded-2xl p-6 mb-8">
            <h2 className="font-bold text-[#111827] mb-4">Submit an interview question</h2>
            <SubmitForm
              userId={user.id}
              onSuccess={() => { setShowSubmit(false); loadReports() }}
            />
          </div>
        )}

        {/* Cluster filter */}
        <div className="flex flex-wrap gap-2 mb-6">
          <button
            onClick={() => setCluster(null)}
            className="px-4 py-1.5 rounded-full text-sm font-medium border transition-all"
            style={cluster === null
              ? { background: '#111827', color: 'white', borderColor: '#111827' }
              : { background: 'white', color: '#6B7280', borderColor: '#E5E7EB' }}
          >
            All topics
          </button>
          {Object.entries(CLUSTER_LABELS).map(([v, l]) => (
            <button
              key={v}
              onClick={() => setCluster(prev => prev === v ? null : v)}
              className="px-4 py-1.5 rounded-full text-sm font-medium border transition-all"
              style={cluster === v
                ? { background: '#111827', color: 'white', borderColor: '#111827' }
                : { background: 'white', color: '#374151', borderColor: '#E5E7EB' }}
            >
              {l}
            </button>
          ))}
        </div>

        {/* Reports */}
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4].map(i => <div key={i} className="h-24 bg-[#F3F4F6] rounded-xl animate-pulse" />)}
          </div>
        ) : reports.length === 0 ? (
          <div className="text-center py-16 text-[#6B7280] text-sm">No questions yet for this topic.</div>
        ) : (
          <div className="space-y-4">
            {reports.map(r => {
              const outcome = r.outcome ? OUTCOME_STYLE[r.outcome] : null
              return (
                <div key={r.id} className="bg-white border border-[#E5E7EB] rounded-xl p-5 hover:border-[#D1D5DB] transition-all">
                  <p className="text-sm text-[#17140F] leading-relaxed mb-3">&ldquo;{r.question_text}&rdquo;</p>
                  <div className="flex items-center justify-between gap-3 flex-wrap">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-[#EEF2FF] text-[#4F46E5]">
                        {CLUSTER_LABELS[r.cluster] ?? r.cluster}
                      </span>
                      <span className="text-[11px] px-2 py-0.5 rounded-full bg-[#F3F4F6] text-[#6B7280]">
                        {ROUND_LABELS[r.round] ?? r.round}
                      </span>
                      {r.role_track && (
                        <span className="text-[11px] text-[#9CA3AF]">{r.role_track}</span>
                      )}
                      {r.year && (
                        <span className="text-[11px] text-[#9CA3AF]">{r.year}</span>
                      )}
                      {outcome && (
                        <span className="text-[11px] font-medium px-2 py-0.5 rounded-full" style={{ background: outcome.bg, color: outcome.color }}>
                          {outcome.label}
                        </span>
                      )}
                    </div>
                    <button
                      onClick={() => upvote(r.id)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all"
                      style={upvoted.has(r.id)
                        ? { background: '#FFF8EE', color: '#D98A0B', borderColor: '#F5A524' }
                        : { background: 'white', color: '#6B7280', borderColor: '#E5E7EB' }}
                    >
                      ▲ {r.upvote_count}
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
