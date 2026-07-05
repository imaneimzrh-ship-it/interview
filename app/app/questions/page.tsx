'use client'
import { useState, useEffect } from 'react'
import AppLayout from '@/components/app/AppLayout'
import { createClient } from '@/lib/supabase/client'

interface Q {
  id: string
  display_name: string
  company: string | null
  role_title: string
  role_cluster: string
  interview_round: string | null
  year: number | null
  question_text: string
  source_note: string | null
  created_at: string
}

const CLUSTER_LABELS: Record<string, string> = {
  ai_llm_engineer:       'AI / LLM Engineer',
  applied_ai_mlops:      'Applied AI / MLOps',
  ai_automation_engineer:'AI Automation Engineer',
  fde:                   'Forward Deployed Eng',
}

const ROUND_COLORS: Record<string, { bg: string; color: string }> = {
  technical:     { bg: '#EFF6FF', color: '#1D4ED8' },
  system_design: { bg: '#F0FDF4', color: '#15803D' },
  behavioral:    { bg: '#FEF3C7', color: '#92400E' },
  final:         { bg: '#FDF4FF', color: '#7E22CE' },
  not_specified: { bg: '#F3F4F6', color: '#6B7280' },
}

async function authHeader(): Promise<Record<string, string>> {
  const { data: { session } } = await createClient().auth.getSession()
  if (session?.access_token) return { Authorization: `Bearer ${session.access_token}` }
  return {}
}

export default function QuestionsPage() {
  const sb = createClient()
  const [questions,  setQuestions]  = useState<Q[]>([])
  const [loading,    setLoading]    = useState(true)
  const [filter,     setFilter]     = useState('')
  const [clusterF,   setClusterF]   = useState('all')
  const [showForm,   setShowForm]   = useState(false)
  const [flagging,   setFlagging]   = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [formError,  setFormError]  = useState('')
  const [formOk,     setFormOk]     = useState(false)

  const [fCompany,   setFCompany]   = useState('')
  const [fRole,      setFRole]      = useState('')
  const [fRound,     setFRound]     = useState('technical')
  const [fText,      setFText]      = useState('')

  useEffect(() => { load() }, [])

  async function load() {
    const { data } = await sb.from('community_questions')
      .select('*')
      .order('created_at', { ascending: false })
    setQuestions((data as Q[]) ?? [])
    setLoading(false)
  }

  async function flag(id: string) {
    setFlagging(id)
    const hdrs = await authHeader()
    await fetch('/api/questions/flag', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...hdrs },
      body: JSON.stringify({ id }),
    })
    setQuestions(prev => prev.filter(q => q.id !== id))
    setFlagging(null)
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (fText.trim().length < 20) { setFormError('Question must be at least 20 characters.'); return }
    setSubmitting(true); setFormError('')
    const hdrs = await authHeader()
    const res = await fetch('/api/questions/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...hdrs },
      body: JSON.stringify({ company: fCompany, role_title: fRole || 'AI/ML Engineer', interview_round: fRound, question_text: fText }),
    })
    if (res.ok) {
      setFormOk(true); setShowForm(false)
      setFCompany(''); setFRole(''); setFText('')
      load()
    } else {
      const d = await res.json()
      setFormError(d.error ?? 'Submission failed.')
    }
    setSubmitting(false)
  }

  const clusters = ['all', ...Array.from(new Set(questions.map(q => q.role_cluster)))]
  const visible = questions.filter(q => {
    const matchCluster = clusterF === 'all' || q.role_cluster === clusterF
    const matchText    = !filter || q.question_text.toLowerCase().includes(filter.toLowerCase()) || (q.company ?? '').toLowerCase().includes(filter.toLowerCase())
    return matchCluster && matchText
  })

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto px-6 py-8">
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-[#111827] mb-1">Question Bank</h1>
            <p className="text-[#6B7280] text-sm">Real interview questions from Anthropic, OpenAI, Google DeepMind, and others — reported by candidates.</p>
          </div>
          <button onClick={() => { setShowForm(!showForm); setFormOk(false) }}
            className="text-sm font-medium px-4 py-2.5 rounded-xl transition-colors shadow-sm flex-shrink-0"
            style={{ background: '#F5A524', color: '#17140F' }}>
            + Submit question
          </button>
        </div>

        {formOk && (
          <div className="mb-4 bg-[#ECFDF5] border border-[#A7F3D0] rounded-xl px-4 py-3 text-sm text-[#065F46]">
            ✓ Question submitted — thank you!
          </div>
        )}

        {/* Submit form */}
        {showForm && (
          <div className="bg-white rounded-xl border border-[#E5E7EB] p-5 mb-6 shadow-sm">
            <h3 className="font-semibold text-[#111827] mb-4">Share an interview question</h3>
            <form onSubmit={submit} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-[#6B7280] mb-1">Company (optional)</label>
                  <input value={fCompany} onChange={e => setFCompany(e.target.value)} placeholder="e.g. Anthropic"
                    className="w-full text-sm border border-[#E5E7EB] rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#F5A524]/20 focus:border-[#F5A524]" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#6B7280] mb-1">Round</label>
                  <select value={fRound} onChange={e => setFRound(e.target.value)}
                    className="w-full text-sm border border-[#E5E7EB] rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#F5A524]/20 focus:border-[#F5A524]">
                    <option value="technical">Technical</option>
                    <option value="system_design">System Design</option>
                    <option value="behavioral">Behavioral</option>
                    <option value="final">Final / Onsite</option>
                    <option value="not_specified">Not specified</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-[#6B7280] mb-1">Question *</label>
                <textarea value={fText} onChange={e => setFText(e.target.value)} rows={3} required
                  placeholder="Describe the question or topic you were asked..."
                  className="w-full text-sm border border-[#E5E7EB] rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#F5A524]/20 focus:border-[#F5A524] resize-none" />
              </div>
              {formError && <p className="text-xs text-[#DC2626]">{formError}</p>}
              <div className="flex gap-2">
                <button type="submit" disabled={submitting}
                  className="text-sm font-semibold px-4 py-2 rounded-lg disabled:opacity-50"
                  style={{ background: '#F5A524', color: '#17140F' }}>
                  {submitting ? 'Submitting...' : 'Submit'}
                </button>
                <button type="button" onClick={() => setShowForm(false)}
                  className="text-sm px-4 py-2 rounded-lg text-[#6B7280] hover:text-[#374151] border border-[#E5E7EB]">
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3 mb-5">
          <input value={filter} onChange={e => setFilter(e.target.value)} placeholder="Search questions or companies..."
            className="flex-1 text-sm border border-[#E5E7EB] rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#F5A524]/20 focus:border-[#F5A524]" />
          <select value={clusterF} onChange={e => setClusterF(e.target.value)}
            className="text-sm border border-[#E5E7EB] rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#F5A524]/20 focus:border-[#F5A524]">
            {clusters.map(c => <option key={c} value={c}>{c === 'all' ? 'All roles' : (CLUSTER_LABELS[c] ?? c)}</option>)}
          </select>
        </div>

        {/* Questions list */}
        {loading ? (
          <div className="flex justify-center py-20">
            <div style={{ width:24,height:24,border:'2.5px solid rgba(245,165,36,.3)',borderTopColor:'#F5A524',borderRadius:'50%',animation:'spin 1s linear infinite' }} />
          </div>
        ) : visible.length === 0 ? (
          <div className="text-center py-16 text-[#9CA3AF] text-sm">No questions match your filters.</div>
        ) : (
          <div className="space-y-3">
            {visible.map(q => {
              const roundStyle = ROUND_COLORS[q.interview_round ?? 'not_specified'] ?? ROUND_COLORS.not_specified
              return (
                <div key={q.id} className="bg-white rounded-xl border border-[#E5E7EB] p-4 shadow-sm group">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-2">
                        {q.company && (
                          <span className="text-xs font-semibold text-[#1E2A44] bg-[#EEF1F6] px-2 py-0.5 rounded-full border border-[#C7D0E0]">
                            {q.company}
                          </span>
                        )}
                        {q.interview_round && q.interview_round !== 'not_specified' && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full capitalize"
                            style={{ background: roundStyle.bg, color: roundStyle.color }}>
                            {q.interview_round.replace('_', ' ')}
                          </span>
                        )}
                        <span className="text-[10px] text-[#9CA3AF]">{q.year ?? 2026}</span>
                      </div>
                      <p className="text-sm text-[#111827] leading-relaxed">{q.question_text}</p>
                      {q.source_note && (
                        <p className="text-[10px] text-[#9CA3AF] mt-1.5 italic">{q.source_note}</p>
                      )}
                    </div>
                    <button onClick={() => flag(q.id)} disabled={flagging === q.id}
                      title="Flag as inappropriate"
                      className="opacity-0 group-hover:opacity-100 text-[#D1D5DB] hover:text-[#DC2626] transition-all p-1.5 rounded-lg hover:bg-[#FEF2F2] flex-shrink-0 disabled:opacity-30">
                      {flagging === q.id ? '...' : '⚑'}
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
        <p className="text-xs text-[#9CA3AF] text-center mt-6">{visible.length} question{visible.length !== 1 ? 's' : ''}</p>
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </AppLayout>
  )
}
