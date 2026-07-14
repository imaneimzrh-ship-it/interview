'use client'
import { useState, useEffect, useCallback } from 'react'
import AppLayout from '@/components/app/AppLayout'
import { createClient } from '@/lib/supabase/client'

/* ─── Types ─────────────────────────────────────────────────────────────── */
interface CuratedReport {
  id: string; display_name: string; role_title: string; role_cluster: string
  company_visibility: 'named' | 'generic' | 'undisclosed'; company_name: string | null
  company_size: string | null; industry: string | null; interview_round: string
  year: number | null; question_text: string; difficulty_rating: number | null
  outcome: string; upvotes: number; depth: 'core' | 'applied' | 'deep_dive' | null
  frequently_asked: boolean | null; entry_type: 'seeded' | 'user_submitted' | null
}

interface CommunityReport {
  id: string; question_text: string; cluster: string; round: string
  role_track?: string; company_name?: string; year?: number; outcome?: string
  upvote_count: number
}

/* ─── Constants ──────────────────────────────────────────────────────────── */
const C_CLUSTER: Record<string, string> = {
  ai_llm_engineer: 'AI / LLM Engineer', applied_ai_mlops: 'Applied AI / MLOps',
  ai_automation_engineer: 'AI Automation', fde: 'Forward Deployed Eng',
}
const C_ROUND: Record<string, { label: string; bg: string; color: string }> = {
  screen: { label: 'Screen', bg: '#F3F4F6', color: '#4B5563' },
  technical: { label: 'Technical', bg: '#EFF6FF', color: '#1D4ED8' },
  system_design: { label: 'System Design', bg: '#F0FDF4', color: '#15803D' },
  behavioral: { label: 'Behavioral', bg: '#FEF3C7', color: '#92400E' },
  final: { label: 'Final / Onsite', bg: '#FDF4FF', color: '#7E22CE' },
}
const C_OUTCOME: Record<string, { label: string; color: string }> = {
  offer: { label: 'Got offer', color: '#15803D' }, rejected: { label: 'Rejected', color: '#B91C1C' },
  no_response: { label: 'No response', color: '#6B7280' }, still_in_process: { label: 'In process', color: '#C77D2E' },
}
const C_DEPTH: Record<string, { label: string; bg: string; color: string }> = {
  core: { label: 'Core', bg: '#F3F4F6', color: '#4B5563' },
  applied: { label: 'Applied', bg: '#EFF6FF', color: '#1D4ED8' },
  deep_dive: { label: 'Deep Dive', bg: '#FDF4FF', color: '#7E22CE' },
}
const COMM_CLUSTER: Record<string, string> = {
  rag: 'RAG System Design', agent_orchestration: 'Agent Orchestration',
  evaluation_testing: 'Evaluation & Testing', production_mlops: 'Production / MLOps',
}
const COMM_ROUND: Record<string, string> = {
  screening: 'Screening', technical: 'Technical', system_design: 'System Design',
  behavioral: 'Behavioral', deep_dive: 'Deep Dive',
}
const COMM_OUTCOME: Record<string, { label: string; color: string; bg: string }> = {
  got_offer: { label: 'Got offer', color: '#166534', bg: '#DCFCE7' },
  rejected: { label: 'Rejected', color: '#9F1239', bg: '#FFE4E6' },
  no_update: { label: 'No update', color: '#854D0E', bg: '#FEF9C3' },
}
const CURRENT_YEAR = new Date().getFullYear()

async function authHeader(): Promise<Record<string, string>> {
  const { data: { session } } = await createClient().auth.getSession()
  return session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}
}

/* ─── Curated tab ────────────────────────────────────────────────────────── */
function CuratedTab() {
  const [reports, setReports] = useState<CuratedReport[]>([])
  const [loading, setLoading] = useState(true)
  const [cluster, setCluster] = useState('all')
  const [round, setRound] = useState('all')
  const [depth, setDepth] = useState('all')
  const [frequent, setFrequent] = useState(false)
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    const p = new URLSearchParams()
    if (cluster !== 'all') p.set('cluster', cluster)
    if (round !== 'all') p.set('round', round)
    if (depth !== 'all') p.set('depth', depth)
    if (frequent) p.set('frequent', 'true')
    if (search) p.set('q', search)
    const res = await fetch(`/api/questions?${p}`)
    const d = await res.json()
    setReports(d.reports ?? [])
    setLoading(false)
  }, [cluster, round, depth, frequent, search])

  useEffect(() => { load() }, [load])

  async function upvote(id: string) {
    const hdrs = await authHeader()
    fetch('/api/questions/upvote', { method: 'POST', headers: { 'Content-Type': 'application/json', ...hdrs }, body: JSON.stringify({ id }) })
  }
  async function flag(id: string) {
    const hdrs = await authHeader()
    await fetch('/api/questions/flag', { method: 'POST', headers: { 'Content-Type': 'application/json', ...hdrs }, body: JSON.stringify({ id }) })
    setReports(prev => prev.filter(r => r.id !== id))
  }

  return (
    <div>
      {/* Submit CTA */}
      {submitted && !showForm ? (
        <div className="bg-[#ECFDF5] border border-[#A7F3D0] rounded-2xl px-6 py-5 mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">✓</span>
            <div>
              <p className="font-semibold text-[#065F46] text-sm">Report submitted — thank you.</p>
              <p className="text-xs text-[#047857] mt-0.5">Your question will appear after review.</p>
            </div>
          </div>
          <button onClick={() => { setSubmitted(false); setShowForm(true) }} className="text-xs text-[#047857] underline">Submit another</button>
        </div>
      ) : !showForm ? (
        <div className="bg-[#1E2A44] rounded-2xl px-6 py-5 mb-6 flex items-center justify-between shadow-md">
          <div>
            <p className="font-bold text-white text-sm">Were you asked something in an AI role interview?</p>
            <p className="text-[#9EB0D0] text-xs mt-0.5">Add your report — even a paraphrase helps others prepare.</p>
          </div>
          <button onClick={() => setShowForm(true)} className="flex-shrink-0 ml-4 text-sm font-bold px-5 py-2.5 rounded-xl shadow-sm" style={{ background: '#F5A524', color: '#17140F' }}>
            Report your interview →
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-[#E5E7EB] p-6 mb-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-[#111827] text-base">Report an AI role interview question</h2>
            <button onClick={() => setShowForm(false)} className="text-[#9CA3AF] hover:text-[#374151] text-xl">×</button>
          </div>
          <CuratedSubmitForm onSuccess={() => { setSubmitted(true); setShowForm(false); load() }} />
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-3">
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search questions…"
          className="flex-1 text-sm border border-[#E5E7EB] rounded-lg px-3 py-2 focus:outline-none focus:border-[#F5A524]" />
        <select value={cluster} onChange={e => setCluster(e.target.value)} className="text-sm border border-[#E5E7EB] rounded-lg px-3 py-2 focus:outline-none focus:border-[#F5A524]">
          <option value="all">All clusters</option>
          <option value="ai_llm_engineer">AI / LLM Engineer</option>
          <option value="applied_ai_mlops">Applied AI / MLOps</option>
          <option value="ai_automation_engineer">AI Automation</option>
          <option value="fde">Forward Deployed</option>
        </select>
        <select value={round} onChange={e => setRound(e.target.value)} className="text-sm border border-[#E5E7EB] rounded-lg px-3 py-2 focus:outline-none focus:border-[#F5A524]">
          <option value="all">All rounds</option>
          <option value="screen">Screen</option>
          <option value="technical">Technical</option>
          <option value="system_design">System Design</option>
          <option value="behavioral">Behavioral</option>
          <option value="final">Final / Onsite</option>
        </select>
      </div>
      <div className="flex flex-wrap gap-2 mb-5">
        <select value={depth} onChange={e => setDepth(e.target.value)} className="text-sm border border-[#E5E7EB] rounded-lg px-3 py-1.5 focus:outline-none focus:border-[#F5A524]">
          <option value="all">All depths</option>
          <option value="core">Core</option>
          <option value="applied">Applied</option>
          <option value="deep_dive">Deep Dive</option>
        </select>
        <button onClick={() => setFrequent(v => !v)} className="text-sm px-3 py-1.5 rounded-lg border transition-all"
          style={{ borderColor: frequent ? '#F5A524' : '#E5E7EB', background: frequent ? '#FFF8EE' : 'white', color: frequent ? '#C77D2E' : '#6B7280', fontWeight: frequent ? 600 : 400 }}>
          🔥 Frequently asked
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div style={{ width: 24, height: 24, border: '2.5px solid rgba(245,165,36,.3)', borderTopColor: '#F5A524', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
        </div>
      ) : reports.length === 0 ? (
        <div className="text-center py-16 text-[#9CA3AF] text-sm">No reports match your filters.</div>
      ) : (
        <div className="space-y-3">
          {reports.map(r => <CuratedCard key={r.id} report={r} onFlag={flag} onUpvote={upvote} />)}
        </div>
      )}
      {!loading && reports.length > 0 && <p className="text-xs text-[#9CA3AF] text-center mt-6">{reports.length} report{reports.length !== 1 ? 's' : ''}</p>}
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}

function CuratedCard({ report, onFlag, onUpvote }: { report: CuratedReport; onFlag: (id: string) => void; onUpvote: (id: string) => void }) {
  const round = C_ROUND[report.interview_round] ?? C_ROUND.technical
  const outcome = C_OUTCOME[report.outcome]
  const [upvoted, setUpvoted] = useState(false)
  const [count, setCount] = useState(report.upvotes)
  const company = report.company_visibility === 'named' ? report.company_name
    : report.company_visibility === 'generic' ? [report.company_size?.replace('_', '-'), report.industry].filter(Boolean).join(' · ') || null : null
  return (
    <article className="bg-white rounded-xl border border-[#E5E7EB] p-4 shadow-sm group hover:border-[#D1D5DB] transition-colors">
      <div className="flex items-start gap-3">
        <div className="flex flex-col items-center gap-0.5 pt-0.5 flex-shrink-0">
          <button onClick={() => { if (!upvoted) { setUpvoted(true); setCount(v => v + 1); onUpvote(report.id) } }}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-sm transition-all"
            style={{ background: upvoted ? '#FFF8EE' : '#F9FAFB', color: upvoted ? '#F5A524' : '#9CA3AF', border: `1px solid ${upvoted ? '#F5A524' : '#E5E7EB'}` }}>▲</button>
          <span className="text-[10px] font-mono font-bold text-[#9CA3AF]">{count}</span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-2">
            {report.frequently_asked && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#FFF8EE] text-[#C77D2E] border border-[#FDE68A]">🔥 Frequently asked</span>}
            {company && <span className="text-xs font-semibold text-[#1E2A44] bg-[#EEF1F6] px-2 py-0.5 rounded-full border border-[#C7D0E0]">{company}</span>}
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: round.bg, color: round.color }}>{round.label}</span>
            {report.depth && C_DEPTH[report.depth] && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: C_DEPTH[report.depth].bg, color: C_DEPTH[report.depth].color }}>{C_DEPTH[report.depth].label}</span>}
            <span className="text-[10px] text-[#9CA3AF]">{C_CLUSTER[report.role_cluster] ?? report.role_cluster}</span>
            {report.year && <span className="text-[10px] text-[#9CA3AF]">{report.year}</span>}
            {report.difficulty_rating && <span className="text-[10px] text-[#F5A524]">{'★'.repeat(report.difficulty_rating)}{'☆'.repeat(5 - report.difficulty_rating)}</span>}
          </div>
          <p className="text-sm text-[#111827] leading-relaxed">{report.question_text}</p>
          <div className="flex items-center justify-between mt-2.5">
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-[#9CA3AF]">{report.display_name}</span>
              {outcome?.label && <span className="text-[10px] font-medium" style={{ color: outcome.color }}>· {outcome.label}</span>}
            </div>
            <button onClick={() => onFlag(report.id)} className="opacity-0 group-hover:opacity-100 text-[#D1D5DB] hover:text-[#DC2626] transition-all p-1 rounded text-xs">⚑</button>
          </div>
        </div>
      </div>
    </article>
  )
}

function CuratedSubmitForm({ onSuccess }: { onSuccess: () => void }) {
  const [step, setStep] = useState<1 | 2>(1)
  const [submitting, setSubmitting] = useState(false)
  const [err, setErr] = useState('')
  const [questionText, setQuestionText] = useState('')
  const [roleCluster, setRoleCluster] = useState('')
  const [roleTitle, setRoleTitle] = useState('')
  const [round, setRound] = useState('technical')
  const [difficulty, setDifficulty] = useState(0)
  const [year, setYear] = useState(String(CURRENT_YEAR))
  const [outcome, setOutcome] = useState('prefer_not_to_say')
  const [visibility, setVisibility] = useState<'named' | 'generic' | 'undisclosed'>('undisclosed')
  const [companyName, setCompanyName] = useState('')
  const [companySize, setCompanySize] = useState('')
  const [industry, setIndustry] = useState('')
  const [sourceUrl, setSourceUrl] = useState('')
  const [sourceNote, setSourceNote] = useState('')
  const [displayName, setDisplayName] = useState('')

  useEffect(() => {
    createClient().auth.getUser().then(({ data: { user } }) => {
      if (!user?.email) return
      const base = user.email.split('@')[0].replace(/[^a-z0-9]/gi, '').toLowerCase().slice(0, 12)
      setDisplayName(`${base}_${Math.floor(Math.random() * 90) + 10}`)
    })
  }, [])

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (visibility === 'named' && !companyName.trim()) { setErr('Please enter the company name.'); return }
    if (visibility === 'named' && !sourceUrl.trim() && !sourceNote.trim()) { setErr('Naming a real company requires a source.'); return }
    setSubmitting(true); setErr('')
    const hdrs = await authHeader()
    const res = await fetch('/api/questions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...hdrs },
      body: JSON.stringify({ question_text: questionText, role_cluster: roleCluster, role_title: roleTitle, interview_round: round, difficulty_rating: difficulty || null, year: Number(year), outcome, company_visibility: visibility, company_name: companyName, company_size: companySize || null, industry: industry || null, source_url: sourceUrl || null, source_note: sourceNote || null, display_name: displayName }),
    })
    const d = await res.json()
    if (!res.ok) { setErr(d.error ?? 'Submission failed.'); setSubmitting(false); return }
    onSuccess()
  }

  if (step === 2) return (
    <form onSubmit={submit} className="space-y-4">
      <div>
        <label className="block text-sm font-semibold text-[#111827] mb-2">Company info</label>
        <div className="grid grid-cols-3 gap-2">
          {([['named', 'Name the company', 'I can cite a source'], ['generic', 'Describe it', 'Size/industry only'], ['undisclosed', "Don't mention", 'Stay private']] as const).map(([val, label, sub]) => (
            <button key={val} type="button" onClick={() => setVisibility(val)} className="flex flex-col items-start p-3 rounded-xl border-2 text-left transition-all"
              style={{ borderColor: visibility === val ? '#F5A524' : '#E5E7EB', background: visibility === val ? '#FFF8EE' : 'white' }}>
              <span className="text-xs font-bold text-[#111827] mb-0.5">{label}</span>
              <span className="text-[10px] text-[#9CA3AF]">{sub}</span>
            </button>
          ))}
        </div>
      </div>
      {visibility === 'named' && (
        <div className="space-y-3 bg-[#FAFAFA] rounded-xl p-4 border border-[#E5E7EB]">
          <input value={companyName} onChange={e => setCompanyName(e.target.value)} placeholder="Company name *" className="w-full text-sm border border-[#E5E7EB] rounded-lg px-3 py-2 focus:outline-none focus:border-[#F5A524]" />
          <input value={sourceUrl} onChange={e => setSourceUrl(e.target.value)} placeholder="Source URL (optional if you add a note)" className="w-full text-sm border border-[#E5E7EB] rounded-lg px-3 py-2 focus:outline-none focus:border-[#F5A524]" />
          <input value={sourceNote} onChange={e => setSourceNote(e.target.value)} placeholder="Source note (e.g. Interviewing.io thread)" className="w-full text-sm border border-[#E5E7EB] rounded-lg px-3 py-2 focus:outline-none focus:border-[#F5A524]" />
        </div>
      )}
      {visibility === 'generic' && (
        <div className="grid grid-cols-2 gap-3 bg-[#FAFAFA] rounded-xl p-4 border border-[#E5E7EB]">
          <select value={companySize} onChange={e => setCompanySize(e.target.value)} className="text-sm border border-[#E5E7EB] rounded-lg px-3 py-2 focus:outline-none focus:border-[#F5A524]">
            <option value="">Company size</option>
            <option value="startup">Startup (&lt;50)</option>
            <option value="mid_size">Mid-size (50–500)</option>
            <option value="large">Large (500–5k)</option>
            <option value="enterprise">Enterprise (5k+)</option>
          </select>
          <input value={industry} onChange={e => setIndustry(e.target.value)} placeholder="Industry (e.g. Fintech)" className="text-sm border border-[#E5E7EB] rounded-lg px-3 py-2 focus:outline-none focus:border-[#F5A524]" />
        </div>
      )}
      <div>
        <label className="block text-xs font-medium text-[#374151] mb-1.5">Your display name</label>
        <input value={displayName} onChange={e => setDisplayName(e.target.value)} maxLength={40} className="w-full text-sm border border-[#E5E7EB] rounded-lg px-3 py-2 focus:outline-none focus:border-[#F5A524]" />
      </div>
      {err && <div className="bg-[#FEF2F2] border border-[#FECACA] rounded-xl px-4 py-3 text-sm text-[#DC2626]">{err}</div>}
      <div className="flex gap-2">
        <button type="button" onClick={() => { setStep(1); setErr('') }} className="px-4 py-2.5 rounded-xl text-sm text-[#6B7280] border border-[#E5E7EB] hover:bg-[#F9FAFB]">← Back</button>
        <button type="submit" disabled={submitting} className="flex-1 text-sm font-bold py-2.5 rounded-xl disabled:opacity-40" style={{ background: '#F5A524', color: '#17140F' }}>{submitting ? 'Submitting…' : 'Submit report →'}</button>
      </div>
    </form>
  )

  return (
    <form onSubmit={e => { e.preventDefault(); if (questionText.trim().length < 20) { setErr('Question must be at least 20 characters.'); return } if (!roleCluster) { setErr('Please select a role cluster.'); return } setErr(''); setStep(2) }} className="space-y-4">
      <textarea value={questionText} onChange={e => setQuestionText(e.target.value)} rows={4} required placeholder={`e.g. "Design a real-time feature store for a recommendation system…"`}
        className="w-full text-sm border border-[#E5E7EB] rounded-xl px-4 py-3 focus:outline-none focus:border-[#F5A524] resize-none text-[#111827]" />
      <div className="grid grid-cols-2 gap-3">
        <select value={roleCluster} onChange={e => setRoleCluster(e.target.value)} required className="text-sm border border-[#E5E7EB] rounded-lg px-3 py-2 focus:outline-none focus:border-[#F5A524]">
          <option value="">Role cluster *</option>
          <option value="ai_llm_engineer">AI / LLM Engineer</option>
          <option value="applied_ai_mlops">Applied AI / MLOps</option>
          <option value="ai_automation_engineer">AI Automation</option>
          <option value="fde">Forward Deployed</option>
        </select>
        <select value={round} onChange={e => setRound(e.target.value)} className="text-sm border border-[#E5E7EB] rounded-lg px-3 py-2 focus:outline-none focus:border-[#F5A524]">
          <option value="screen">Recruiter screen</option>
          <option value="technical">Technical</option>
          <option value="system_design">System Design</option>
          <option value="behavioral">Behavioral</option>
          <option value="final">Final / Onsite</option>
        </select>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <input value={roleTitle} onChange={e => setRoleTitle(e.target.value)} placeholder="Role title" className="text-sm border border-[#E5E7EB] rounded-lg px-3 py-2 focus:outline-none focus:border-[#F5A524]" />
        <select value={year} onChange={e => setYear(e.target.value)} className="text-sm border border-[#E5E7EB] rounded-lg px-3 py-2 focus:outline-none focus:border-[#F5A524]">
          {[CURRENT_YEAR, CURRENT_YEAR - 1, CURRENT_YEAR - 2, CURRENT_YEAR - 3].map(y => <option key={y} value={y}>{y}</option>)}
        </select>
        <select value={outcome} onChange={e => setOutcome(e.target.value)} className="text-sm border border-[#E5E7EB] rounded-lg px-3 py-2 focus:outline-none focus:border-[#F5A524]">
          <option value="prefer_not_to_say">Outcome</option>
          <option value="offer">Got offer</option>
          <option value="rejected">Rejected</option>
          <option value="still_in_process">In process</option>
          <option value="no_response">No response</option>
        </select>
      </div>
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map(n => (
          <button key={n} type="button" onClick={() => setDifficulty(n === difficulty ? 0 : n)} className="text-xl transition-transform hover:scale-110" style={{ color: n <= difficulty ? '#F5A524' : '#E5E7EB' }}>★</button>
        ))}
      </div>
      {err && <div className="bg-[#FEF2F2] border border-[#FECACA] rounded-xl px-4 py-3 text-sm text-[#DC2626]">{err}</div>}
      <button type="submit" className="w-full text-sm font-bold py-3 rounded-xl transition-all" style={{ background: '#F5A524', color: '#17140F', opacity: questionText.trim().length < 20 || !roleCluster ? 0.45 : 1 }}>
        Next — company details →
      </button>
    </form>
  )
}

/* ─── Community tab ──────────────────────────────────────────────────────── */
function CommunityTab({ userId }: { userId: string | null }) {
  const [reports, setReports] = useState<CommunityReport[]>([])
  const [loading, setLoading] = useState(true)
  const [cluster, setCluster] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [upvoted, setUpvoted] = useState<Set<string>>(new Set())

  const load = useCallback(async () => {
    setLoading(true)
    const p = new URLSearchParams({ limit: '40' })
    if (cluster) p.set('cluster', cluster)
    const res = await fetch(`/api/reports?${p}`)
    const data = await res.json()
    setReports(Array.isArray(data) ? data : [])
    setLoading(false)
  }, [cluster])

  useEffect(() => { load() }, [load])

  async function upvote(id: string) {
    if (!userId || upvoted.has(id)) return
    const hdrs = await authHeader()
    await fetch(`/api/reports/${id}/upvote`, { method: 'POST', headers: hdrs })
    setUpvoted(prev => new Set([...prev, id]))
    setReports(prev => prev.map(r => r.id === id ? { ...r, upvote_count: r.upvote_count + 1 } : r))
  }

  return (
    <div>
      {/* Submit */}
      {submitted && !showForm ? (
        <div className="bg-[#ECFDF5] border border-[#A7F3D0] rounded-2xl px-6 py-4 mb-6 flex items-center justify-between">
          <p className="text-sm font-semibold text-[#065F46]">✓ Submitted — pending review.</p>
          <button onClick={() => { setSubmitted(false); setShowForm(true) }} className="text-xs text-[#047857] underline">Submit another</button>
        </div>
      ) : !showForm ? (
        <div className="mb-6 flex items-center gap-3">
          <button onClick={() => userId ? setShowForm(true) : null}
            className="px-5 py-2 rounded-lg text-sm font-semibold bg-[#1E2A44] text-white hover:bg-[#2d3f61] transition-all">
            + Submit a question
          </button>
          {!userId && <p className="text-xs text-[#9CA3AF]"><a href="/signup" className="underline text-[#F5A524]">Sign up free</a> to submit</p>}
        </div>
      ) : userId ? (
        <div className="bg-white border border-[#E5E7EB] rounded-2xl p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-[#111827]">Submit an interview question</h2>
            <button onClick={() => setShowForm(false)} className="text-[#9CA3AF] hover:text-[#374151] text-xl">×</button>
          </div>
          <CommSubmitForm userId={userId} onSuccess={() => { setSubmitted(true); setShowForm(false); load() }} />
        </div>
      ) : null}

      {/* Cluster filters */}
      <div className="flex flex-wrap gap-2 mb-5">
        {[null, ...Object.keys(COMM_CLUSTER)].map(v => (
          <button key={v ?? 'all'} onClick={() => setCluster(v)}
            className="px-4 py-1.5 rounded-full text-sm font-medium border transition-all"
            style={cluster === v ? { background: '#111827', color: 'white', borderColor: '#111827' } : { background: 'white', color: '#374151', borderColor: '#E5E7EB' }}>
            {v ? COMM_CLUSTER[v] : 'All topics'}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-3">{[1, 2, 3].map(i => <div key={i} className="h-24 bg-[#F3F4F6] rounded-xl animate-pulse" />)}</div>
      ) : reports.length === 0 ? (
        <div className="text-center py-16 text-[#9CA3AF] text-sm">No questions yet for this topic.</div>
      ) : (
        <div className="space-y-4">
          {reports.map(r => {
            const oc = r.outcome ? COMM_OUTCOME[r.outcome] : null
            return (
              <div key={r.id} className="bg-white border border-[#E5E7EB] rounded-xl p-5 hover:border-[#D1D5DB] transition-all">
                <p className="text-sm text-[#17140F] leading-relaxed mb-3">&ldquo;{r.question_text}&rdquo;</p>
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-[#EEF2FF] text-[#4F46E5]">{COMM_CLUSTER[r.cluster] ?? r.cluster}</span>
                    <span className="text-[11px] px-2 py-0.5 rounded-full bg-[#F3F4F6] text-[#6B7280]">{COMM_ROUND[r.round] ?? r.round}</span>
                    {r.role_track && <span className="text-[11px] text-[#9CA3AF]">{r.role_track}</span>}
                    {r.year && <span className="text-[11px] text-[#9CA3AF]">{r.year}</span>}
                    {oc && <span className="text-[11px] font-medium px-2 py-0.5 rounded-full" style={{ background: oc.bg, color: oc.color }}>{oc.label}</span>}
                  </div>
                  <button onClick={() => upvote(r.id)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all"
                    style={upvoted.has(r.id) ? { background: '#FFF8EE', color: '#D98A0B', borderColor: '#F5A524' } : { background: 'white', color: '#6B7280', borderColor: '#E5E7EB' }}>
                    ▲ {r.upvote_count}
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function CommSubmitForm({ userId, onSuccess }: { userId: string; onSuccess: () => void }) {
  const [form, setForm] = useState({ question_text: '', cluster: 'rag', round: 'technical', role_track: '', company_name: '', year: '', outcome: '' })
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.question_text.trim()) return
    setSubmitting(true); setError('')
    const hdrs = await authHeader()
    const res = await fetch('/api/reports', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...hdrs },
      body: JSON.stringify({ ...form, year: form.year ? parseInt(form.year) : undefined, outcome: form.outcome || undefined, role_track: form.role_track || undefined, company_name: form.company_name || undefined }),
    })
    setSubmitting(false)
    if (!res.ok) { setError('Failed to submit. Try again.'); return }
    onSuccess()
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <textarea value={form.question_text} onChange={e => setForm(f => ({ ...f, question_text: e.target.value }))} placeholder="Paste the exact question you were asked…" rows={3} maxLength={2000}
        className="w-full border border-[#E5E7EB] rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:border-[#F5A524]" required />
      <div className="grid grid-cols-2 gap-3">
        <select value={form.cluster} onChange={e => setForm(f => ({ ...f, cluster: e.target.value }))} className="text-sm border border-[#E5E7EB] rounded-lg px-3 py-2 focus:outline-none focus:border-[#F5A524]">
          {Object.entries(COMM_CLUSTER).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
        <select value={form.round} onChange={e => setForm(f => ({ ...f, round: e.target.value }))} className="text-sm border border-[#E5E7EB] rounded-lg px-3 py-2 focus:outline-none focus:border-[#F5A524]">
          {Object.entries(COMM_ROUND).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <input value={form.role_track} onChange={e => setForm(f => ({ ...f, role_track: e.target.value }))} placeholder="Role (optional)" className="text-sm border border-[#E5E7EB] rounded-lg px-3 py-2 focus:outline-none focus:border-[#F5A524]" />
        <input value={form.year} onChange={e => setForm(f => ({ ...f, year: e.target.value }))} placeholder="Year" maxLength={4} className="text-sm border border-[#E5E7EB] rounded-lg px-3 py-2 focus:outline-none focus:border-[#F5A524]" />
        <select value={form.outcome} onChange={e => setForm(f => ({ ...f, outcome: e.target.value }))} className="text-sm border border-[#E5E7EB] rounded-lg px-3 py-2 focus:outline-none focus:border-[#F5A524]">
          <option value="">Outcome</option>
          <option value="got_offer">Got offer</option>
          <option value="rejected">Rejected</option>
          <option value="no_update">No update</option>
        </select>
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
      <button type="submit" disabled={submitting} className="w-full py-2.5 rounded-lg text-sm font-semibold bg-[#1E2A44] text-white hover:bg-[#2d3f61] disabled:opacity-50">
        {submitting ? 'Submitting…' : 'Submit question (pending review)'}
      </button>
    </form>
  )
}

/* ─── Page ───────────────────────────────────────────────────────────────── */
export default function QuestionBankPage() {
  const [tab, setTab] = useState<'curated' | 'community'>('curated')
  const [userId, setUserId] = useState<string | null>(null)

  useEffect(() => {
    createClient().auth.getUser().then(({ data }) => setUserId(data.user?.id ?? null))
  }, [])

  return (
    <AppLayout>
      <div className="max-w-3xl mx-auto px-6 py-10">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-[#111827] mb-2" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
            Question Bank
          </h1>
          <p className="text-[#6B7280] text-sm">Curated reference questions and real candidate reports, all in one place.</p>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-[#F3F4F6] rounded-xl p-1 mb-8 w-fit">
          {([['curated', 'Curated Reference'], ['community', 'Community Reports']] as const).map(([t, label]) => (
            <button key={t} onClick={() => setTab(t)}
              className="px-5 py-2 rounded-lg text-sm font-medium transition-all"
              style={tab === t ? { background: 'white', color: '#111827', boxShadow: '0 1px 3px rgba(0,0,0,.08)' } : { color: '#6B7280' }}>
              {label}
            </button>
          ))}
        </div>

        {tab === 'curated'   && <CuratedTab />}
        {tab === 'community' && <CommunityTab userId={userId} />}
      </div>
    </AppLayout>
  )
}
