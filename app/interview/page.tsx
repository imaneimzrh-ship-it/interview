'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ROLE_LABELS, COMPANY_LABELS, AI_ROLES, GENERAL_ROLES } from '@/lib/questions/bank'

const AI_COS = ['none','anthropic','openai','google_deepmind','meta_ai','scale_ai','databricks','microsoft']

export default function InterviewHub() {
  const router = useRouter()
  const [role, setRole] = useState('')
  const [company, setCompany] = useState('none')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const isAI = AI_ROLES.includes(role)

  async function start() {
    if (!role) { setError('Pick a role first.'); return }
    setLoading(true); setError('')
    try {
      const res = await fetch('/api/interview/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role, company }),
      })
      const data = await res.json()
      if (!res.ok) {
        if (data.upgrade) { router.push('/pricing?reason=upgrade'); return }
        setError(data.error ?? 'Something went wrong. Try again.')
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
      <div className="border-b border-border">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-blue flex items-center justify-center text-white text-xs font-bold">S</div>
            <span className="font-semibold text-sm text-bright">Sonne AI</span>
          </Link>
          <Link href="/dashboard" className="text-xs text-dim hover:text-bright transition-colors">Dashboard →</Link>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-10">
        <h1 className="text-2xl font-semibold text-bright mb-1">Set up your interview</h1>
        <p className="text-sm text-dim mb-8">Choose a role. The AI will interview you the way real interviewers do.</p>

        {/* General roles */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-xs font-medium text-dim">General roles</span>
            <span className="badge-blue text-xs">Free · 2 trial sessions</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {GENERAL_ROLES.map(r => (
              <button key={r} onClick={() => { setRole(r); setCompany('none') }}
                className={`px-3 py-2.5 rounded-lg text-xs font-medium text-left border transition-all ${role === r ? 'border-blue/50 bg-blue-m text-blue' : 'border-border bg-card text-dim hover:text-bright hover:border-muted'}`}>
                {ROLE_LABELS[r]}
              </button>
            ))}
          </div>
        </div>

        {/* AI roles */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-xs font-medium text-dim">AI engineering roles</span>
            <span className="badge-gold">Pro · $19/mo</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {AI_ROLES.map(r => (
              <button key={r} onClick={() => setRole(r)}
                className={`px-3 py-2.5 rounded-lg text-xs font-medium text-left border transition-all ${role === r ? 'border-gold/50 bg-gold-m text-gold' : 'border-border bg-card text-dim hover:border-gold/20 hover:text-gold'}`}>
                {ROLE_LABELS[r]}
              </button>
            ))}
          </div>
        </div>

        {/* Company (AI roles only) */}
        {isAI && (
          <div className="mb-6 animate-fade-in">
            <div className="text-xs font-medium text-dim mb-3">Company format (optional)</div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {AI_COS.map(c => (
                <button key={c} onClick={() => setCompany(c)}
                  className={`px-3 py-2 rounded-lg text-xs font-medium text-center border transition-all ${company === c ? 'border-blue/50 bg-blue-m text-blue' : 'border-border bg-card text-dim hover:text-bright'}`}>
                  {COMPANY_LABELS[c] ?? c}
                </button>
              ))}
            </div>
            {company !== 'none' && <p className="text-xs text-dim mt-2">Questions and interview style calibrated for {COMPANY_LABELS[company]}.</p>}
          </div>
        )}

        {error && (
          <div className="bg-red-m border border-red/20 rounded-lg px-4 py-3 text-sm text-red mb-4">{error}</div>
        )}

        <button onClick={start} disabled={!role || loading}
          className="btn-blue w-full py-3.5 text-sm disabled:opacity-50">
          {loading
            ? <span className="flex items-center gap-2 justify-center"><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Starting interview...</span>
            : role ? `Start interview · ${ROLE_LABELS[role]} ${company !== 'none' ? `· ${COMPANY_LABELS[company]}` : ''} →` : 'Pick a role to start'
          }
        </button>
      </div>
    </div>
  )
}
