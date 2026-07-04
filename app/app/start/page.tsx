'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import AppLayout from '@/components/app/AppLayout'
import { createClient } from '@/lib/supabase/client'

const MODULES = [
  { id: 'rag_system_design',   emoji: '🔍', name: 'RAG System Design',       desc: 'Chunking · Retrieval quality · Reranking · Freshness',           free: true },
  { id: 'agent_orchestration', emoji: '🕵️', name: 'Agent Orchestration',      desc: 'Tool use · Planning · Failure handling · Multi-agent',            free: false },
  { id: 'evaluation_testing',  emoji: '🧪', name: 'Evaluation & Testing',     desc: 'Eval design · Hallucination · Offline/online · Regression',       free: false },
  { id: 'production_mlops',    emoji: '⚙️', name: 'Production / MLOps',       desc: 'Monitoring · Cost/latency · Versioning · Deployment',             free: false },
]

async function authHeader(): Promise<Record<string, string>> {
  const { data: { session } } = await createClient().auth.getSession()
  if (session?.access_token) return { Authorization: `Bearer ${session.access_token}` }
  return {}
}

export default function StartPage() {
  const router    = useRouter()
  const [jd,      setJd]      = useState('')
  const [resume,  setResume]  = useState('')
  const [module_, setModule]  = useState('')
  const [lang,    setLang]    = useState<'en'|'fr'>('en')
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState('')

  async function start() {
    if (!module_) { setError('Please select a module.'); return }
    setLoading(true); setError('')
    try {
      const hdrs = await authHeader()
      const res  = await fetch('/api/interview/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...hdrs },
        body: JSON.stringify({ module_slug: module_, lang, job_description: jd, resume }),
      })
      const data = await res.json()
      if (!res.ok) {
        if (data.upgrade) { router.push('/pricing'); return }
        setError(data.error ?? 'Failed to start.'); setLoading(false); return
      }
      sessionStorage.setItem(`session_${data.sessionId}_opening`, data.openingMessage ?? '')
      sessionStorage.setItem(`session_${data.sessionId}_totalSS`, String(data.totalSubSkills ?? 4))
      router.push(`/app/interview/session?id=${data.sessionId}&lang=${lang}&module=${module_}`)
    } catch { setError('Network error.'); setLoading(false) }
  }

  return (
    <AppLayout>
      <div className="max-w-3xl mx-auto px-6 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-[#111827] mb-1">Start a new interview</h1>
          <p className="text-[#6B7280] text-sm">Add your job description and resume for personalized questions. Or skip and practice a module directly.</p>
        </div>

        <div className="space-y-6">

          {/* Job Description */}
          <div className="bg-white rounded-xl border border-[#E5E7EB] p-5" style={{ boxShadow: '0 1px 3px rgba(0,0,0,.05)' }}>
            <div className="flex items-center justify-between mb-3">
              <label className="font-semibold text-[#111827] text-sm">Job Description</label>
              <span className="text-xs text-[#9CA3AF]">Optional — personalizes the questions</span>
            </div>
            <textarea value={jd} onChange={e => setJd(e.target.value)} rows={4}
              placeholder={`Paste the job description or role you're preparing for...\n\nExample: 'AI Engineer at Anthropic — you will work on RAG systems, agent orchestration, and production LLM deployments...'`}
              className="w-full text-sm text-[#111827] placeholder:text-[#9CA3AF] bg-[#F8F9FB] border border-[#E5E7EB] rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] resize-none transition-all"
            />
          </div>

          {/* Resume */}
          <div className="bg-white rounded-xl border border-[#E5E7EB] p-5" style={{ boxShadow: '0 1px 3px rgba(0,0,0,.05)' }}>
            <div className="flex items-center justify-between mb-3">
              <label className="font-semibold text-[#111827] text-sm">Your Resume</label>
              <span className="text-xs text-[#9CA3AF]">Optional — AI will tailor questions to your background</span>
            </div>
            <textarea value={resume} onChange={e => setResume(e.target.value)} rows={4}
              placeholder={`Paste your resume or relevant experience...\n\nExample: '3 years ML engineering. Built RAG systems, deployed LLMs in production, experience with agent frameworks...'`}
              className="w-full text-sm text-[#111827] placeholder:text-[#9CA3AF] bg-[#F8F9FB] border border-[#E5E7EB] rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] resize-none transition-all"
            />
          </div>

          {/* Module + Language */}
          <div className="bg-white rounded-xl border border-[#E5E7EB] p-5" style={{ boxShadow: '0 1px 3px rgba(0,0,0,.05)' }}>
            <div className="flex items-center justify-between mb-4">
              <label className="font-semibold text-[#111827] text-sm">Interview Module</label>
              <div className="flex gap-1 bg-[#F3F4F6] rounded-lg p-0.5">
                {(['en','fr'] as const).map(l => (
                  <button key={l} onClick={() => setLang(l)}
                    className="px-3 py-1 rounded-md text-xs font-medium transition-all"
                    style={{ background: lang === l ? 'white' : 'transparent', color: lang === l ? '#111827' : '#6B7280', boxShadow: lang === l ? '0 1px 2px rgba(0,0,0,.05)' : 'none' }}>
                    {l === 'en' ? '🇬🇧 English' : '🇫🇷 Français'}
                  </button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {MODULES.map(m => {
                const selected = module_ === m.id
                return (
                  <button key={m.id} onClick={() => setModule(m.id)}
                    className="text-left p-4 rounded-xl border-2 transition-all"
                    style={{
                      borderColor: selected ? '#2563EB' : '#E5E7EB',
                      background: selected ? '#EFF6FF' : 'white',
                      boxShadow: selected ? '0 0 0 3px rgba(37,99,235,.08)' : '0 1px 2px rgba(0,0,0,.04)',
                    }}>
                    <div className="flex items-start justify-between mb-2">
                      <span className="text-xl">{m.emoji}</span>
                      <div className="flex items-center gap-1">
                        {selected && <span className="text-[#2563EB] text-sm">✓</span>}
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                          style={{ background: m.free ? '#ECFDF5' : '#EFF6FF', color: m.free ? '#065F46' : '#1D4ED8', border: m.free ? '1px solid #A7F3D0' : '1px solid #BFDBFE' }}>
                          {m.free ? 'FREE' : 'PRO'}
                        </span>
                      </div>
                    </div>
                    <div className="text-sm font-semibold text-[#111827] mb-0.5">{m.name}</div>
                    <div className="text-xs text-[#6B7280]">{m.desc}</div>
                  </button>
                )
              })}
            </div>
          </div>

          {error && (
            <div className="bg-[#FEF2F2] border border-[#FECACA] rounded-xl p-4 text-sm text-[#DC2626] flex justify-between items-center">
              {error}
              <button onClick={() => setError('')} className="text-[#DC2626]/50 hover:text-[#DC2626]">×</button>
            </div>
          )}

          <button onClick={start} disabled={!module_ || loading}
            className="w-full py-3.5 rounded-xl text-base font-semibold transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ background: module_ ? '#2563EB' : '#E5E7EB', color: module_ ? 'white' : '#9CA3AF', boxShadow: module_ ? '0 4px 12px rgba(37,99,235,.25)' : 'none' }}>
            {loading ? (
              <span className="flex items-center justify-center gap-3">
                <span style={{ width:18,height:18,border:'2.5px solid rgba(255,255,255,.3)',borderTopColor:'white',borderRadius:'50%',animation:'spin 1s linear infinite',display:'inline-block' }} />
                Starting your interview...
              </span>
            ) : module_ ? (
              `Start interview${jd ? ' (personalized)' : ''} →`
            ) : (
              'Select a module above'
            )}
          </button>
        </div>
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </AppLayout>
  )
}
