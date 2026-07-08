'use client'
import { Suspense, useState, useEffect, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import AppLayout from '@/components/app/AppLayout'
import { createClient } from '@/lib/supabase/client'

const MODULES = [
  { id: 'rag_system_design',   emoji: '🔍', name: 'RAG System Design',       desc: 'Chunking · Hybrid retrieval · Reranking · FAISS vs HNSW · Freshness · Retrieval diagnosis',                        free: true,  voice: true },
  { id: 'agent_orchestration', emoji: '🕵️', name: 'Agent Orchestration',      desc: 'Tool creation & validation · Memory management · Planning · Failure handling · Multi-agent · LangGraph · MCP',    free: false, voice: true },
  { id: 'evaluation_testing',  emoji: '🧪', name: 'Evaluation & Testing',     desc: 'Offline evals · LLM-as-judge vs human eval · Online evals · Hallucination · Regression gates',                   free: false, voice: true },
  { id: 'production_mlops',    emoji: '⚙️', name: 'Production / MLOps',       desc: 'Observability & tracing · Guardrails & safe failure · MCP integration · Cost/latency · vLLM · Deployment',        free: false, voice: true },
]

async function authHeader(): Promise<Record<string, string>> {
  const { data: { session } } = await createClient().auth.getSession()
  if (session?.access_token) return { Authorization: `Bearer ${session.access_token}` }
  return {}
}

const MODULE_TO_CLUSTER: Record<string, string> = {
  rag_system_design:   'ai_llm_engineer',
  agent_orchestration: 'ai_automation_engineer',
  evaluation_testing:  'applied_ai_mlops',
  production_mlops:    'applied_ai_mlops',
}

type PreviewQuestion = { id: string; question_text: string; interview_round: string; difficulty_rating: number | null }

function StartPageInner() {
  const router       = useRouter()
  const searchParams = useSearchParams()
  const moduleRef    = useRef<HTMLDivElement>(null)

  const [jd,        setJd]      = useState('')
  const [resume,    setResume]  = useState('')
  const [module_,   setModule]  = useState('')
  const [lang,      setLang]    = useState<'en'|'fr'>('en')
  const [loading,   setLoading] = useState(false)
  const [error,     setError]   = useState('')
  const [isPro,     setIsPro]   = useState<boolean | null>(null)
  const [preview,   setPreview] = useState<PreviewQuestion[]>([])
  const [highlight, setHighlight] = useState(false)

  useEffect(() => {
    createClient().auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return
      const { data: p } = await createClient().from('profiles').select('plan').eq('id', user.id).single()
      setIsPro(p?.plan === 'pro')
    })
  }, [])

  // Pre-select module from URL param (e.g. coming from CV diagnostic gap CTA)
  useEffect(() => {
    const moduleParam = searchParams.get('module')
    const langParam   = searchParams.get('lang') as 'en' | 'fr' | null
    if (moduleParam) {
      setModule(moduleParam)
      if (langParam === 'fr') setLang('fr')
      // Scroll module grid into view and briefly highlight
      setHighlight(true)
      setTimeout(() => {
        moduleRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }, 200)
      setTimeout(() => setHighlight(false), 2000)
    }
  }, [searchParams])

  useEffect(() => {
    if (!module_) { setPreview([]); return }
    const cluster = MODULE_TO_CLUSTER[module_]
    if (!cluster) return
    fetch(`/api/questions?cluster=${cluster}&limit=2`)
      .then(r => r.json())
      .then(d => setPreview(d.reports ?? []))
      .catch(() => {})
  }, [module_])

  function handleModuleClick(id: string, isFreeModule: boolean) {
    if (!isFreeModule && isPro === false) {
      // Free user trying to access a Pro module — send to pricing
      router.push('/pricing')
      return
    }
    setModule(id)
    setError('')
  }

  const contextOk = jd.trim().length >= 50 || resume.trim().length >= 50

  async function start() {
    if (!module_) { setError('Please select a module.'); return }
    if (!contextOk) { setError('Please paste at least 50 characters of a job description or your resume so the AI can personalize the interview.'); return }
    setLoading(true); setError('')
    try {
      const hdrs = await authHeader()
      const deviceId = (() => { try { return localStorage.getItem('sonne_device_id') ?? undefined } catch { return undefined } })()
      const res  = await fetch('/api/interview/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...hdrs },
        body: JSON.stringify({ module_slug: module_, lang, job_description: jd, resume, device_id: deviceId }),
      })
      const data = await res.json()
      if (!res.ok) {
        if (data.upgrade) { router.push('/pricing'); return }
        setError(data.error ?? 'Failed to start.'); setLoading(false); return
      }
      sessionStorage.setItem(`session_${data.sessionId}_opening`, data.openingMessage ?? '')
      sessionStorage.setItem(`session_${data.sessionId}_totalSS`, String(data.totalSubSkills ?? 4))
      sessionStorage.setItem(`session_${data.sessionId}_voiceEnabled`, String(data.voiceEnabled !== false))
      router.push(`/app/interview/session?id=${data.sessionId}&lang=${lang}&module=${module_}`)
    } catch { setError('Network error.'); setLoading(false) }
  }

  const planLoaded = isPro !== null

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
              className="w-full text-sm text-[#111827] placeholder:text-[#9CA3AF] bg-[#F8F9FB] border border-[#E5E7EB] rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#F5A524]/15 focus:border-[#F5A524] resize-none transition-all"
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
              className="w-full text-sm text-[#111827] placeholder:text-[#9CA3AF] bg-[#F8F9FB] border border-[#E5E7EB] rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#F5A524]/15 focus:border-[#F5A524] resize-none transition-all"
            />
          </div>

          {/* Module + Language */}
          <div ref={moduleRef} className="bg-white rounded-xl border p-5 transition-all duration-500"
            style={{ boxShadow: highlight ? '0 0 0 3px rgba(245,165,36,.35)' : '0 1px 3px rgba(0,0,0,.05)', borderColor: highlight ? '#F5A524' : '#E5E7EB' }}>
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
                const selected  = module_ === m.id
                const locked    = planLoaded && !isPro && !m.free

                return (
                  <button key={m.id} onClick={() => handleModuleClick(m.id, m.free)}
                    className="text-left p-4 rounded-xl border-2 transition-all relative"
                    style={{
                      borderColor: selected ? '#F5A524' : locked ? '#E5E7EB' : '#E5E7EB',
                      background:  selected ? '#FFF8EE' : locked ? '#F9FAFB' : 'white',
                      boxShadow:   selected ? '0 0 0 3px rgba(245,165,36,.12)' : '0 1px 2px rgba(0,0,0,.04)',
                      opacity:     locked ? 0.65 : 1,
                    }}>
                    <div className="flex items-start justify-between mb-2">
                      <span className="text-xl">{locked ? '🔒' : m.emoji}</span>
                      <div className="flex items-center gap-1">
                        {selected && <span className="text-[#F5A524] text-sm">✓</span>}
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                          style={{
                            background: m.free ? '#ECFDF5' : '#EEF1F6',
                            color:      m.free ? '#065F46' : '#1E2A44',
                            border:     m.free ? '1px solid #A7F3D0' : '1px solid #C7D0E0',
                          }}>
                          {m.free ? 'FREE' : 'PRO'}
                        </span>
                      </div>
                    </div>
                    <div className="text-sm font-semibold text-[#111827] mb-0.5">{m.name}</div>
                    <div className="text-xs text-[#6B7280]">{m.desc}</div>
                    <div className="flex items-center gap-2 mt-2">
                      {m.voice && !locked && (
                        <span className="text-[10px] text-[#6B7280] flex items-center gap-0.5">🎙️ Voice</span>
                      )}
                      {locked && (
                        <span className="text-[10px] font-semibold text-[#F5A524]">Upgrade to Pro to unlock →</span>
                      )}
                    </div>
                  </button>
                )
              })}
            </div>

            {/* Module preview: sample questions from question_reports */}
            {preview.length > 0 && (
              <div className="mt-4 rounded-lg border border-[#E5E7EB] bg-[#F8F9FB] px-4 py-3">
                <p className="text-[10px] font-semibold text-[#9CA3AF] uppercase tracking-widest mb-2">What others were asked</p>
                <div className="space-y-2">
                  {preview.map(q => (
                    <div key={q.id} className="flex items-start gap-2">
                      <span className="text-[#F5A524] mt-0.5 text-xs flex-shrink-0">→</span>
                      <p className="text-xs text-[#374151] leading-snug line-clamp-2">{q.question_text}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Upgrade banner for free users */}
            {planLoaded && !isPro && (
              <div className="mt-4 flex items-center justify-between gap-3 bg-[#F8F9FB] border border-[#E5E7EB] rounded-lg px-4 py-3">
                <p className="text-xs text-[#6B7280]">
                  <span className="font-semibold text-[#111827]">Free plan:</span> RAG module only · 1 session
                </p>
                <Link href="/pricing"
                  className="text-xs font-semibold px-3 py-1.5 rounded-lg whitespace-nowrap transition-colors"
                  style={{ background: '#F5A524', color: '#17140F' }}>
                  Upgrade to Pro →
                </Link>
              </div>
            )}
          </div>

          {error && (
            <div className="bg-[#FEF2F2] border border-[#FECACA] rounded-xl p-4 text-sm text-[#DC2626] flex justify-between items-center">
              {error}
              <button onClick={() => setError('')} className="text-[#DC2626]/50 hover:text-[#DC2626]">×</button>
            </div>
          )}

          <button onClick={start} disabled={!module_ || !contextOk || loading}
            className="w-full py-3.5 rounded-xl text-base font-semibold transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ background: module_ && contextOk ? '#F5A524' : '#E5E7EB', color: module_ && contextOk ? '#17140F' : '#9CA3AF', boxShadow: module_ && contextOk ? '0 4px 12px rgba(245,165,36,.3)' : 'none' }}>
            {loading ? (
              <span className="flex items-center justify-center gap-3">
                <span style={{ width:18,height:18,border:'2.5px solid rgba(255,255,255,.3)',borderTopColor:'white',borderRadius:'50%',animation:'spin 1s linear infinite',display:'inline-block' }} />
                Starting your interview...
              </span>
            ) : !module_ ? (
              'Select a module above'
            ) : !contextOk ? (
              'Add a job description or resume to continue'
            ) : (
              'Start interview →'
            )}
          </button>

          <div className="pt-2 text-center">
            <Link href="/app/questions"
              className="inline-flex items-center gap-1.5 text-xs text-[#9CA3AF] hover:text-[#374151] transition-colors">
              <span>🗂️</span>
              <span>See what others were asked in AI role interviews →</span>
            </Link>
          </div>
        </div>
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </AppLayout>
  )
}

export default function StartPage() {
  return <Suspense fallback={null}><StartPageInner /></Suspense>
}
