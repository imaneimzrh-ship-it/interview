'use client'
import { useState, useEffect, useCallback } from 'react'
import AppLayout from '@/components/app/AppLayout'
import { createClient } from '@/lib/supabase/client'

/* ─── Types ─────────────────────────────────────────────────────────────── */
interface Report {
  id: string
  display_name: string
  role_title: string
  role_cluster: string
  company_visibility: 'named' | 'generic' | 'undisclosed'
  company_name: string | null
  company_size: string | null
  industry: string | null
  interview_round: string
  year: number | null
  question_text: string
  difficulty_rating: number | null
  outcome: string
  upvotes: number
  created_at: string
}

/* ─── Constants ──────────────────────────────────────────────────────────── */
const CLUSTER_LABELS: Record<string, string> = {
  ai_llm_engineer:       'AI / LLM Engineer',
  applied_ai_mlops:      'Applied AI / MLOps',
  ai_automation_engineer:'AI Automation',
  fde:                   'Forward Deployed Eng',
}
const ROUND_META: Record<string, { label: string; bg: string; color: string }> = {
  screen:       { label: 'Screen',        bg: '#F3F4F6', color: '#4B5563' },
  technical:    { label: 'Technical',     bg: '#EFF6FF', color: '#1D4ED8' },
  system_design:{ label: 'System Design', bg: '#F0FDF4', color: '#15803D' },
  behavioral:   { label: 'Behavioral',    bg: '#FEF3C7', color: '#92400E' },
  final:        { label: 'Final / Onsite',bg: '#FDF4FF', color: '#7E22CE' },
}
const OUTCOME_META: Record<string, { label: string; color: string }> = {
  offer:             { label: 'Got offer',       color: '#15803D' },
  rejected:          { label: 'Rejected',         color: '#B91C1C' },
  no_response:       { label: 'No response',      color: '#6B7280' },
  still_in_process:  { label: 'In process',       color: '#C77D2E' },
  prefer_not_to_say: { label: '',                 color: '' },
}
const CURRENT_YEAR = new Date().getFullYear()

async function authHeader(): Promise<Record<string, string>> {
  const { data: { session } } = await createClient().auth.getSession()
  if (session?.access_token) return { Authorization: `Bearer ${session.access_token}` }
  return {}
}

/* ─── Star rating ────────────────────────────────────────────────────────── */
function StarRating({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const [hover, setHover] = useState(0)
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map(n => (
        <button key={n} type="button"
          onClick={() => onChange(n === value ? 0 : n)}
          onMouseEnter={() => setHover(n)}
          onMouseLeave={() => setHover(0)}
          className="text-xl transition-transform hover:scale-110"
          style={{ color: n <= (hover || value) ? '#F5A524' : '#E5E7EB' }}>
          ★
        </button>
      ))}
    </div>
  )
}

/* ─── Submit form ────────────────────────────────────────────────────────── */
function SubmitForm({ onSuccess }: { onSuccess: () => void }) {
  const [step,         setStep]         = useState<1 | 2>(1)
  const [submitting,   setSubmitting]   = useState(false)
  const [err,          setErr]          = useState('')
  const [userEmail,    setUserEmail]    = useState('')

  // Step 1
  const [questionText, setQuestionText] = useState('')
  const [roleCluster,  setRoleCluster]  = useState('')
  const [roleTitle,    setRoleTitle]    = useState('')
  const [round,        setRound]        = useState('technical')
  const [difficulty,   setDifficulty]   = useState(0)
  const [year,         setYear]         = useState(String(CURRENT_YEAR))
  const [outcome,      setOutcome]      = useState('prefer_not_to_say')

  // Step 2 — company
  const [visibility,   setVisibility]   = useState<'named'|'generic'|'undisclosed'>('undisclosed')
  const [companyName,  setCompanyName]  = useState('')
  const [companySize,  setCompanySize]  = useState('')
  const [industry,     setIndustry]     = useState('')
  const [sourceUrl,    setSourceUrl]    = useState('')
  const [sourceNote,   setSourceNote]   = useState('')
  const [displayName,  setDisplayName]  = useState('')

  useEffect(() => {
    createClient().auth.getUser().then(({ data: { user } }) => {
      if (!user?.email) return
      setUserEmail(user.email)
      const base = user.email.split('@')[0].replace(/[^a-z0-9]/gi, '').toLowerCase().slice(0, 12)
      const suffix = Math.floor(Math.random() * 90) + 10
      setDisplayName(`${base}_${suffix}`)
    })
  }, [])

  function toStep2(e: React.FormEvent) {
    e.preventDefault()
    if (questionText.trim().length < 20) { setErr('Question must be at least 20 characters.'); return }
    if (!roleCluster) { setErr('Please select a role cluster.'); return }
    setErr('')
    setStep(2)
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (visibility === 'named' && !companyName.trim()) { setErr('Please enter the company name.'); return }
    if (visibility === 'named' && !sourceUrl.trim() && !sourceNote.trim()) {
      setErr('Naming a real company requires a source — add a URL or note explaining where this was reported.')
      return
    }
    setSubmitting(true); setErr('')
    const hdrs = await authHeader()
    const res = await fetch('/api/questions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...hdrs },
      body: JSON.stringify({
        question_text: questionText, role_cluster: roleCluster, role_title: roleTitle,
        interview_round: round, difficulty_rating: difficulty || null, year: Number(year),
        outcome, company_visibility: visibility, company_name: companyName,
        company_size: companySize || null, industry: industry || null,
        source_url: sourceUrl || null, source_note: sourceNote || null,
        display_name: displayName,
      }),
    })
    const d = await res.json()
    if (!res.ok) { setErr(d.error ?? 'Submission failed.'); setSubmitting(false); return }
    onSuccess()
  }

  const charsLeft = 500 - questionText.length

  if (step === 2) return (
    <form onSubmit={submit} className="space-y-5">
      {/* Company visibility */}
      <div>
        <label className="block text-sm font-semibold text-[#111827] mb-2">Company info</label>
        <div className="grid grid-cols-3 gap-2">
          {([
            ['named',      'Name the company', 'I can cite a source'],
            ['generic',    'Describe it',      'Size/industry only'],
            ['undisclosed','Don\'t mention',    'Stay private'],
          ] as const).map(([val, label, sub]) => (
            <button key={val} type="button" onClick={() => setVisibility(val)}
              className="flex flex-col items-start p-3 rounded-xl border-2 text-left transition-all"
              style={{
                borderColor: visibility === val ? '#F5A524' : '#E5E7EB',
                background: visibility === val ? '#FFF8EE' : 'white',
              }}>
              <span className="text-xs font-bold text-[#111827] mb-0.5">{label}</span>
              <span className="text-[10px] text-[#9CA3AF]">{sub}</span>
            </button>
          ))}
        </div>
      </div>

      {visibility === 'named' && (
        <div className="space-y-3 bg-[#FAFAFA] rounded-xl p-4 border border-[#E5E7EB]">
          <div>
            <label className="block text-xs font-medium text-[#374151] mb-1.5">Company name <span className="text-[#DC2626]">*</span></label>
            <input value={companyName} onChange={e => setCompanyName(e.target.value)} placeholder="e.g. Anthropic"
              className="w-full text-sm border border-[#E5E7EB] rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#F5A524]/20 focus:border-[#F5A524]" />
          </div>
          <div>
            <label className="block text-xs font-medium text-[#374151] mb-1.5">Source <span className="text-[#DC2626]">*</span> <span className="text-[#9CA3AF] font-normal">(URL or note — required to name a company)</span></label>
            <input value={sourceUrl} onChange={e => setSourceUrl(e.target.value)} placeholder="https://... (optional if you add a note)"
              className="w-full text-sm border border-[#E5E7EB] rounded-lg px-3 py-2 mb-2 focus:outline-none focus:ring-2 focus:ring-[#F5A524]/20 focus:border-[#F5A524]" />
            <input value={sourceNote} onChange={e => setSourceNote(e.target.value)} placeholder="e.g. Interviewing.io thread, candidate blog, recruiter email"
              className="w-full text-sm border border-[#E5E7EB] rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#F5A524]/20 focus:border-[#F5A524]" />
          </div>
        </div>
      )}

      {visibility === 'generic' && (
        <div className="space-y-3 bg-[#FAFAFA] rounded-xl p-4 border border-[#E5E7EB]">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-[#374151] mb-1.5">Company size</label>
              <select value={companySize} onChange={e => setCompanySize(e.target.value)}
                className="w-full text-sm border border-[#E5E7EB] rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#F5A524]/20 focus:border-[#F5A524]">
                <option value="">Not specified</option>
                <option value="startup">Startup (&lt;50)</option>
                <option value="mid_size">Mid-size (50–500)</option>
                <option value="large">Large (500–5k)</option>
                <option value="enterprise">Enterprise (5k+)</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-[#374151] mb-1.5">Industry</label>
              <input value={industry} onChange={e => setIndustry(e.target.value)} placeholder="e.g. Fintech, Healthcare AI"
                className="w-full text-sm border border-[#E5E7EB] rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#F5A524]/20 focus:border-[#F5A524]" />
            </div>
          </div>
        </div>
      )}

      {/* Display name */}
      <div>
        <label className="block text-xs font-medium text-[#374151] mb-1.5">Your display name <span className="text-[#9CA3AF] font-normal">(shown publicly)</span></label>
        <input value={displayName} onChange={e => setDisplayName(e.target.value)} maxLength={40}
          placeholder="e.g. mle_sarah_26"
          className="w-full text-sm border border-[#E5E7EB] rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#F5A524]/20 focus:border-[#F5A524]" />
        <p className="text-[10px] text-[#9CA3AF] mt-1">Auto-generated from your email. Edit to use a pseudonym.</p>
      </div>

      {err && (
        <div className="bg-[#FEF2F2] border border-[#FECACA] rounded-xl px-4 py-3 text-sm text-[#DC2626]">{err}</div>
      )}

      <div className="flex gap-2">
        <button type="button" onClick={() => { setStep(1); setErr('') }}
          className="px-4 py-2.5 rounded-xl text-sm text-[#6B7280] border border-[#E5E7EB] hover:bg-[#F9FAFB] transition-colors">
          ← Back
        </button>
        <button type="submit" disabled={submitting}
          className="flex-1 text-sm font-bold py-2.5 rounded-xl disabled:opacity-40 transition-all shadow-sm"
          style={{ background: '#F5A524', color: '#17140F' }}>
          {submitting ? 'Submitting…' : 'Submit report →'}
        </button>
      </div>
    </form>
  )

  return (
    <form onSubmit={toStep2} className="space-y-4">
      <div>
        <label className="block text-sm font-semibold text-[#111827] mb-1.5">
          What were you asked? <span className="text-[#DC2626]">*</span>
        </label>
        <textarea value={questionText} onChange={e => setQuestionText(e.target.value)} rows={4} required
          placeholder={`e.g. "Design a real-time feature store for a recommendation system — walk me through your architecture, how you handle late-arriving data, and freshness SLAs."`}
          className="w-full text-sm border border-[#E5E7EB] rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#F5A524]/25 focus:border-[#F5A524] resize-none text-[#111827] placeholder:text-[#9CA3AF]" />
        <div className="flex justify-between mt-1">
          <span className="text-[10px] text-[#9CA3AF]">Paraphrasing is fine — exact wording not required</span>
          <span className="text-[10px]" style={{ color: charsLeft < 50 ? '#DC2626' : '#9CA3AF' }}>{charsLeft} left</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-semibold text-[#374151] mb-1.5">Role cluster <span className="text-[#DC2626]">*</span></label>
          <select value={roleCluster} onChange={e => setRoleCluster(e.target.value)} required
            className="w-full text-sm border border-[#E5E7EB] rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#F5A524]/20 focus:border-[#F5A524]">
            <option value="">Select cluster</option>
            <option value="ai_llm_engineer">AI / LLM Engineer</option>
            <option value="applied_ai_mlops">Applied AI / MLOps</option>
            <option value="ai_automation_engineer">AI Automation Engineer</option>
            <option value="fde">Forward Deployed Engineer</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-semibold text-[#374151] mb-1.5">Interview round <span className="text-[#DC2626]">*</span></label>
          <select value={round} onChange={e => setRound(e.target.value)} required
            className="w-full text-sm border border-[#E5E7EB] rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#F5A524]/20 focus:border-[#F5A524]">
            <option value="screen">Recruiter screen</option>
            <option value="technical">Technical</option>
            <option value="system_design">System Design</option>
            <option value="behavioral">Behavioral</option>
            <option value="final">Final / Onsite</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className="block text-xs font-medium text-[#6B7280] mb-1.5">Your role title</label>
          <input value={roleTitle} onChange={e => setRoleTitle(e.target.value)} placeholder="e.g. ML Engineer"
            className="w-full text-sm border border-[#E5E7EB] rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#F5A524]/20 focus:border-[#F5A524]" />
        </div>
        <div>
          <label className="block text-xs font-medium text-[#6B7280] mb-1.5">Year</label>
          <select value={year} onChange={e => setYear(e.target.value)}
            className="w-full text-sm border border-[#E5E7EB] rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#F5A524]/20 focus:border-[#F5A524]">
            {[CURRENT_YEAR, CURRENT_YEAR - 1, CURRENT_YEAR - 2, CURRENT_YEAR - 3].map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-[#6B7280] mb-1.5">Outcome</label>
          <select value={outcome} onChange={e => setOutcome(e.target.value)}
            className="w-full text-sm border border-[#E5E7EB] rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#F5A524]/20 focus:border-[#F5A524]">
            <option value="prefer_not_to_say">Prefer not to say</option>
            <option value="offer">Got offer</option>
            <option value="rejected">Rejected</option>
            <option value="still_in_process">Still in process</option>
            <option value="no_response">No response</option>
          </select>
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium text-[#6B7280] mb-1.5">Difficulty <span className="text-[#9CA3AF] font-normal">(optional)</span></label>
        <StarRating value={difficulty} onChange={setDifficulty} />
      </div>

      {err && (
        <div className="bg-[#FEF2F2] border border-[#FECACA] rounded-xl px-4 py-3 text-sm text-[#DC2626]">{err}</div>
      )}

      <button type="submit"
        className="w-full text-sm font-bold py-3 rounded-xl transition-all shadow-sm"
        style={{ background: '#F5A524', color: '#17140F', opacity: questionText.trim().length < 20 || !roleCluster ? 0.45 : 1 }}>
        Next — company details →
      </button>
    </form>
  )
}

/* ─── Report card ────────────────────────────────────────────────────────── */
function ReportCard({ report, onFlag, onUpvote }: { report: Report; onFlag: (id: string) => void; onUpvote: (id: string) => void }) {
  const round = ROUND_META[report.interview_round] ?? ROUND_META.technical
  const outcome = OUTCOME_META[report.outcome]
  const [upvoted, setUpvoted] = useState(false)
  const [localUpvotes, setLocalUpvotes] = useState(report.upvotes)

  function handleUpvote() {
    if (upvoted) return
    setUpvoted(true)
    setLocalUpvotes(v => v + 1)
    onUpvote(report.id)
  }

  const companyLabel = report.company_visibility === 'named'
    ? report.company_name
    : report.company_visibility === 'generic'
    ? [report.company_size?.replace('_', '-'), report.industry].filter(Boolean).join(' · ') || 'Undisclosed company'
    : null

  return (
    <article className="bg-white rounded-xl border border-[#E5E7EB] p-4 shadow-sm group hover:border-[#D1D5DB] transition-colors">
      <div className="flex items-start gap-3">

        {/* Upvote */}
        <div className="flex flex-col items-center gap-0.5 pt-0.5 flex-shrink-0">
          <button onClick={handleUpvote} title="Upvote"
            className="w-8 h-8 rounded-lg flex items-center justify-center transition-all text-sm"
            style={{ background: upvoted ? '#FFF8EE' : '#F9FAFB', color: upvoted ? '#F5A524' : '#9CA3AF', border: `1px solid ${upvoted ? '#F5A524' : '#E5E7EB'}` }}>
            ▲
          </button>
          <span className="text-[10px] font-mono font-bold text-[#9CA3AF]">{localUpvotes}</span>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-2">
            {companyLabel && (
              <span className="text-xs font-semibold text-[#1E2A44] bg-[#EEF1F6] px-2 py-0.5 rounded-full border border-[#C7D0E0]">
                {companyLabel}
              </span>
            )}
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full capitalize"
              style={{ background: round.bg, color: round.color }}>
              {round.label}
            </span>
            <span className="text-[10px] text-[#9CA3AF]">{CLUSTER_LABELS[report.role_cluster] ?? report.role_cluster}</span>
            {report.year && <span className="text-[10px] text-[#9CA3AF]">{report.year}</span>}
            {report.difficulty_rating && (
              <span className="text-[10px] text-[#F5A524]">{'★'.repeat(report.difficulty_rating)}{'☆'.repeat(5 - report.difficulty_rating)}</span>
            )}
          </div>

          <p className="text-sm text-[#111827] leading-relaxed">{report.question_text}</p>

          <div className="flex items-center justify-between mt-2.5">
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-[#9CA3AF]">{report.display_name}</span>
              {outcome?.label && (
                <span className="text-[10px] font-medium" style={{ color: outcome.color }}>· {outcome.label}</span>
              )}
            </div>
            <button onClick={() => onFlag(report.id)} title="Flag as inappropriate"
              className="opacity-0 group-hover:opacity-100 text-[#D1D5DB] hover:text-[#DC2626] transition-all p-1 rounded text-xs">
              ⚑
            </button>
          </div>
        </div>
      </div>
    </article>
  )
}

/* ─── Page ───────────────────────────────────────────────────────────────── */
export default function QuestionsPage() {
  const [reports,    setReports]    = useState<Report[]>([])
  const [loading,    setLoading]    = useState(true)
  const [cluster,    setCluster]    = useState('all')
  const [round,      setRound]      = useState('all')
  const [search,     setSearch]     = useState('')
  const [showForm,   setShowForm]   = useState(false)
  const [submitted,  setSubmitted]  = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams()
    if (cluster !== 'all') params.set('cluster', cluster)
    if (round   !== 'all') params.set('round',   round)
    if (search)            params.set('q',       search)
    const res = await fetch(`/api/questions?${params}`)
    const d   = await res.json()
    setReports(d.reports ?? [])
    setLoading(false)
  }, [cluster, round, search])

  useEffect(() => { load() }, [load])

  async function flag(id: string) {
    const hdrs = await authHeader()
    await fetch('/api/questions/flag', {
      method: 'POST', headers: { 'Content-Type': 'application/json', ...hdrs },
      body: JSON.stringify({ id }),
    })
    setReports(prev => prev.filter(r => r.id !== id))
  }

  async function upvote(id: string) {
    const hdrs = await authHeader()
    fetch('/api/questions/upvote', {
      method: 'POST', headers: { 'Content-Type': 'application/json', ...hdrs },
      body: JSON.stringify({ id }),
    })
  }

  function handleSubmitSuccess() {
    setSubmitted(true)
    setShowForm(false)
    load()
  }

  return (
    <AppLayout>
      <div className="max-w-3xl mx-auto px-6 py-10">

        {/* ── Hero ── */}
        <div className="mb-8">
          <div className="inline-flex items-center gap-2 bg-[#FFF8EE] border border-[#F5A524]/30 rounded-full px-3 py-1 mb-4">
            <span className="w-1.5 h-1.5 rounded-full bg-[#F5A524]" />
            <span className="text-xs font-semibold text-[#C77D2E] uppercase tracking-wide">Community database</span>
          </div>
          <h1 className="text-3xl font-bold text-[#111827] mb-2" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
            AI role interview reports
          </h1>
          <p className="text-[#6B7280] text-sm leading-relaxed max-w-xl">
            Real questions asked specifically in AI/ML/agent-role interviews — contributed by engineers who've been through the process. Every report here came from someone like you.
          </p>
        </div>

        {/* ── Submit CTA ── */}
        {submitted && !showForm ? (
          <div className="bg-[#ECFDF5] border border-[#A7F3D0] rounded-2xl px-6 py-5 mb-6 flex items-center justify-between shadow-sm">
            <div className="flex items-center gap-3">
              <span className="text-2xl">✓</span>
              <div>
                <p className="font-semibold text-[#065F46] text-sm">Report submitted — thank you.</p>
                <p className="text-xs text-[#047857] mt-0.5">Your question is now part of the database.</p>
              </div>
            </div>
            <button onClick={() => { setSubmitted(false); setShowForm(true) }}
              className="text-xs text-[#047857] underline underline-offset-2 flex-shrink-0">
              Submit another
            </button>
          </div>
        ) : !showForm ? (
          <div className="bg-[#1E2A44] rounded-2xl px-6 py-5 mb-6 flex items-center justify-between shadow-md">
            <div>
              <p className="font-bold text-white text-sm">Were you asked something in an AI role interview?</p>
              <p className="text-[#9EB0D0] text-xs mt-0.5">Add your report — even a paraphrase helps others prepare.</p>
            </div>
            <button onClick={() => setShowForm(true)}
              className="flex-shrink-0 ml-4 text-sm font-bold px-5 py-2.5 rounded-xl shadow-sm transition-all hover:brightness-105"
              style={{ background: '#F5A524', color: '#17140F' }}>
              Report your interview →
            </button>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-[#E5E7EB] p-6 mb-6 shadow-sm">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="font-bold text-[#111827] text-base">Report an AI role interview question</h2>
                <p className="text-xs text-[#9CA3AF] mt-0.5">2 steps · takes ~2 minutes</p>
              </div>
              <button onClick={() => setShowForm(false)} className="text-[#9CA3AF] hover:text-[#374151] text-xl leading-none">×</button>
            </div>
            <SubmitForm onSuccess={handleSubmitSuccess} />
          </div>
        )}

        {/* ── Filters ── */}
        <div className="flex flex-col sm:flex-row gap-3 mb-5">
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search questions…"
            className="flex-1 text-sm border border-[#E5E7EB] rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#F5A524]/20 focus:border-[#F5A524]" />
          <select value={cluster} onChange={e => setCluster(e.target.value)}
            className="text-sm border border-[#E5E7EB] rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#F5A524]/20 focus:border-[#F5A524]">
            <option value="all">All clusters</option>
            <option value="ai_llm_engineer">AI / LLM Engineer</option>
            <option value="applied_ai_mlops">Applied AI / MLOps</option>
            <option value="ai_automation_engineer">AI Automation</option>
            <option value="fde">Forward Deployed</option>
          </select>
          <select value={round} onChange={e => setRound(e.target.value)}
            className="text-sm border border-[#E5E7EB] rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#F5A524]/20 focus:border-[#F5A524]">
            <option value="all">All rounds</option>
            <option value="screen">Screen</option>
            <option value="technical">Technical</option>
            <option value="system_design">System Design</option>
            <option value="behavioral">Behavioral</option>
            <option value="final">Final / Onsite</option>
          </select>
        </div>

        {/* ── List ── */}
        {loading ? (
          <div className="flex justify-center py-20">
            <div style={{ width:24,height:24,border:'2.5px solid rgba(245,165,36,.3)',borderTopColor:'#F5A524',borderRadius:'50%',animation:'spin 1s linear infinite' }} />
          </div>
        ) : reports.length === 0 ? (
          <div className="text-center py-16 text-[#9CA3AF] text-sm">No reports match your filters.</div>
        ) : (
          <div className="space-y-3">
            {reports.map(r => (
              <ReportCard key={r.id} report={r} onFlag={flag} onUpvote={upvote} />
            ))}
          </div>
        )}

        {!loading && reports.length > 0 && (
          <p className="text-xs text-[#9CA3AF] text-center mt-6">{reports.length} report{reports.length !== 1 ? 's' : ''}</p>
        )}
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </AppLayout>
  )
}
