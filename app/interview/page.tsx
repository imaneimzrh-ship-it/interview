'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ALL_ROLES, ROLES_BY_CATEGORY, COMPANY_LABELS, DEMAND_LABELS, type Role } from '@/lib/questions/roles'

const AI_COS = ['none','anthropic','openai','google_deepmind','meta_ai','microsoft','amazon','scale_ai','databricks','nvidia','cohere','perplexity','xai','mistral','huggingface','startup']

export default function InterviewHub() {
  const router = useRouter()
  const [selected, setSelected] = useState<Role | null>(null)
  const [company,  setCompany]  = useState('none')
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState('')
  const [tab,      setTab]      = useState<'engineering'|'data'|'automation'|'product'|'free'>('engineering')

  const TABS: { id: typeof tab; label: string }[] = [
    { id: 'engineering', label: '🤖 AI Engineering' },
    { id: 'data',        label: '📊 Data & Research' },
    { id: 'automation',  label: '⚙️ Automation' },
    { id: 'product',     label: '📋 Product & Strategy' },
    { id: 'free',        label: '🎓 General (Free)' },
  ]

  async function start() {
    if (!selected) { setError('Please select a role first.'); return }
    setLoading(true); setError('')
    try {
      const res = await fetch('/api/interview/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: selected.id, company }),
      })
      const data = await res.json()
      if (!res.ok) {
        if (data.upgrade) { router.push('/pricing?reason=upgrade'); return }
        setError(data.error ?? 'Something went wrong.')
        setLoading(false); return
      }
      router.push(`/interview/session?id=${data.sessionId}&qids=${data.questionIds.join(',')}&total=${data.totalQuestions}`)
    } catch {
      setError('Network error. Check your connection.')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-bg">
      <div className="border-b border-border bg-card">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-blue flex items-center justify-center text-white text-xs font-bold">S</div>
            <span className="font-semibold text-sm text-bright">Sonne AI — Interview Prep</span>
          </Link>
          <Link href="/dashboard" className="text-xs text-dim hover:text-bright transition-colors">Dashboard →</Link>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-semibold text-bright mb-1">Set up your interview</h1>
        <p className="text-sm text-dim mb-6">
          Select the role you're interviewing for. The AI interviewer will ask questions specific to that role and grade your answers against what real interviewers check for.
        </p>

        {/* Tab bar */}
        <div className="flex gap-1 overflow-x-auto mb-5 pb-1">
          {TABS.map(t => (
            <button key={t.id} onClick={() => { setTab(t.id); setSelected(null) }}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap border transition-all flex-shrink-0 ${tab === t.id ? 'border-blue/50 bg-blue-m text-blue' : 'border-border bg-card text-dim hover:text-bright'}`}>
              {t.label}
            </button>
          ))}
        </div>

        {/* Role grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-6">
          {ROLES_BY_CATEGORY[tab]?.map(role => (
            <button key={role.id} onClick={() => setSelected(role)}
              className={`flex items-start gap-3 p-3.5 rounded-xl border text-left transition-all ${selected?.id === role.id
                ? (role.isPro ? 'border-gold/50 bg-gold-m' : 'border-blue/50 bg-blue-m')
                : 'border-border bg-card hover:border-muted'}`}>
              <span className="text-lg flex-shrink-0 mt-0.5">{role.emoji}</span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`text-sm font-medium ${selected?.id === role.id ? (role.isPro ? 'text-gold' : 'text-blue') : 'text-bright'}`}>
                    {role.label}
                  </span>
                  {role.isPro && <span className="badge-gold text-xs">Pro</span>}
                  {role.demandLevel === 'extreme' && <span className="text-xs">🔥</span>}
                </div>
                <p className="text-xs text-dim mt-0.5 leading-relaxed line-clamp-2">{role.description}</p>
                {role.salaryRange && <p className="text-xs text-dim mt-0.5 opacity-70">{role.salaryRange}</p>}
              </div>
            </button>
          ))}
        </div>

        {/* Company selector (Pro AI roles only) */}
        {selected?.isPro && (
          <div className="mb-6 animate-fade-in">
            <p className="text-xs font-medium text-dim mb-3">Company format — optional</p>
            <div className="flex flex-wrap gap-2">
              {AI_COS.map(c => (
                <button key={c} onClick={() => setCompany(c)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${company === c ? 'border-blue/50 bg-blue-m text-blue' : 'border-border bg-card text-dim hover:text-bright'}`}>
                  {COMPANY_LABELS[c] ?? c}
                </button>
              ))}
            </div>
            {company !== 'none' && <p className="text-xs text-dim mt-2">Questions and grading calibrated for {COMPANY_LABELS[company]}.</p>}
          </div>
        )}

        {error && (
          <div className="bg-red-m border border-red/20 rounded-lg px-4 py-3 text-sm text-red mb-4">{error}</div>
        )}

        <button onClick={start} disabled={!selected || loading}
          className="btn-blue w-full py-3.5 text-sm disabled:opacity-50 disabled:cursor-not-allowed">
          {loading
            ? <span className="flex items-center gap-2 justify-center"><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Starting interview...</span>
            : selected
              ? `Start interview — ${selected.label}${company !== 'none' ? ` · ${COMPANY_LABELS[company]}` : ''} →`
              : 'Select a role to start'
          }
        </button>

        {selected?.isPro && (
          <p className="text-center text-xs text-dim mt-2">
            Pro role. <Link href="/pricing" className="text-gold hover:underline">Upgrade to Pro →</Link>
          </p>
        )}
      </div>
    </div>
  )
}
