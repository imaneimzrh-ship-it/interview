'use client'
import { Suspense, useState, useEffect, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import AppLayout from '@/components/app/AppLayout'
import UpgradeModal from '@/components/app/UpgradeModal'
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

interface MockPanel { id: string; role_cluster: string; title: string; description: string; round_sequence: string[]; estimated_minutes: number }

function StartPageInner() {
  const router       = useRouter()
  const searchParams = useSearchParams()
  const moduleRef    = useRef<HTMLDivElement>(null)
  const contextRef   = useRef<HTMLDivElement>(null)

  const [jd,           setJd]         = useState('')
  const [resume,       setResume]     = useState('')
  const [module_,      setModule]     = useState('')
  const [lang,         setLang]       = useState<'en'|'fr'>('en')
  const [stage,        setStage]      = useState<'general_practice'|'interview_scheduled'>('general_practice')
  const [roundType,    setRoundType]  = useState<string>('')
  const [loading,      setLoading]    = useState(false)
  const [error,        setError]      = useState('')
  const [isPro,        setIsPro]      = useState<boolean | null>(null)
  const [preview,      setPreview]    = useState<PreviewQuestion[]>([])
  const [highlight,    setHighlight]  = useState(false)
  const [focusSubSkill, setFocusSubSkill] = useState('')
  const [panels,        setPanels]        = useState<MockPanel[]>([])
  const [selectedPanel, setSelectedPanel] = useState('')
  const [showPanel,     setShowPanel]     = useState(false)
  const [panelLoading,  setPanelLoading]  = useState(false)
  const [upgradeReason, setUpgradeReason] = useState('')

  useEffect(() => {
    createClient().auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return
      const { data: p } = await createClient().from('profiles').select('plan').eq('id', user.id).single()
      setIsPro(p?.plan === 'pro')
    })
  }, [])

  useEffect(() => {
    createClient().from('mock_panels').select('*').eq('is_active', true).order('role_cluster')
      .then(({ data }) => setPanels(data ?? []))
  }, [])

  // Pre-select module from URL param (e.g. coming from CV diagnostic gap CTA)
  useEffect(() => {
    const moduleParam   = searchParams.get('module')
    const langParam     = searchParams.get('lang') as 'en' | 'fr' | null
    const subSkillParam = searchParams.get('sub_skill')
    if (moduleParam) {
      setModule(moduleParam)
      if (langParam === 'fr') setLang('fr')
      if (subSkillParam) setFocusSubSkill(subSkillParam)
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

  function handleModuleClick(id: string, isFreeModule: boolean, moduleName: string) {
    if (!isFreeModule && isPro === false) {
      setUpgradeReason(`${moduleName} is a Pro module.`)
      return
    }
    setModule(id)
    setError('')
  }

  const contextOk = jd.trim().length >= 50 || resume.trim().length >= 50

  // Clear the error banner the moment the user satisfies the condition — no submit needed
  useEffect(() => {
    if (contextOk) setError('')
  }, [contextOk])

  async function start() {
    if (!module_) { setError('Please select a module.'); return }
    if (!contextOk) {
      contextRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      setError('Please paste at least 50 characters of a job description or your resume so the AI can personalize the interview.')
      return
    }
    setLoading(true); setError('')
    try {
      const hdrs = await authHeader()
      const deviceId = (() => { try { return localStorage.getItem('sonne_device_id') ?? undefined } catch { return undefined } })()
      const res  = await fetch('/api/interview/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...hdrs },
        body: JSON.stringify({ module_slug: module_, lang, job_description: jd, resume, device_id: deviceId, interview_stage: stage, round_type: roundType || null }),
      })
      const data = await res.json()
      if (!res.ok) {
        if (data.upgrade) { setUpgradeReason(data.error ?? 'This feature requires a Pro plan.'); setLoading(false); return }
        setError(data.error ?? 'Failed to start.'); setLoading(false); return
      }
      sessionStorage.setItem(`session_${data.sessionId}_opening`, data.openingMessage ?? '')
      sessionStorage.setItem(`session_${data.sessionId}_totalSS`, String(data.totalSubSkills ?? 4))
      sessionStorage.setItem(`session_${data.sessionId}_voiceEnabled`, String(data.voiceEnabled !== false))
      if (data.starterCode) {
        sessionStorage.setItem(`session_${data.sessionId}_starterCode`, data.starterCode)
        sessionStorage.setItem(`session_${data.sessionId}_codeLanguage`, data.codeLanguage ?? 'python')
      }
      router.push(`/app/interview/session?id=${data.sessionId}&lang=${lang}&module=${module_}`)
    } catch { setError('Network error.'); setLoading(false) }
  }

  async function startPanel() {
    if (!selectedPanel) return
    if (!contextOk) { setError('Please paste at least 50 characters of a job description or your resume.'); return }
    setPanelLoading(true); setError('')
    try {
      const hdrs = await authHeader()
      const res  = await fetch('/api/panel/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...hdrs },
        body: JSON.stringify({ mock_panel_id: selectedPanel, lang, job_description: jd, resume }),
      })
      const data = await res.json()
      if (!res.ok) {
        if (data.upgrade) { setUpgradeReason(data.error ?? 'This feature requires a Pro plan.'); setPanelLoading(false); return }
        setError(data.error ?? 'Failed to start panel.'); setPanelLoading(false); return
      }
      sessionStorage.setItem(`panel_${data.panelSessionId}`, JSON.stringify({
        roundType:     data.roundType,
        panelRoundId:  data.panelRoundId,
        roundIdx:      data.roundIdx,
        totalRounds:   data.totalRounds,
        roundSequence: data.roundSequence,
        openingMessage: data.openingMessage,
        roleCluster:   data.roleCluster,
        panelTitle:    data.panelTitle,
      }))
      router.push(`/app/panel?id=${data.panelSessionId}&lang=${lang}`)
    } catch { setError('Network error.'); setPanelLoading(false) }
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

          {/* Interview Stage Selector */}
          <div className="bg-white rounded-xl border border-[#E5E7EB] p-5" style={{ boxShadow: '0 1px 3px rgba(0,0,0,.05)' }}>
            <label className="font-semibold text-[#111827] text-sm block mb-3">What are you preparing for?</label>
            <div className="grid grid-cols-2 gap-3 mb-4">
              {([
                { id: 'general_practice', label: 'General practice', icon: '🎯', desc: 'Balanced coverage across all sub-skills' },
                { id: 'interview_scheduled', label: 'I have an interview', icon: '📅', desc: 'Tune questions to your round type' },
              ] as const).map(opt => (
                <button key={opt.id} onClick={() => { setStage(opt.id); if (opt.id === 'general_practice') setRoundType('') }}
                  className="text-left p-3.5 rounded-xl border-2 transition-all"
                  style={{
                    borderColor: stage === opt.id ? '#F5A524' : '#E5E7EB',
                    background:  stage === opt.id ? '#FFF8EE' : 'white',
                  }}>
                  <div className="flex items-center gap-2 mb-0.5">
                    <span>{opt.icon}</span>
                    <span className="text-sm font-semibold text-[#111827]">{opt.label}</span>
                    {stage === opt.id && <span className="text-[#F5A524] text-xs ml-auto">✓</span>}
                  </div>
                  <p className="text-xs text-[#6B7280]">{opt.desc}</p>
                </button>
              ))}
            </div>

            {stage === 'interview_scheduled' && (
              <div>
                <p className="text-xs font-semibold text-[#374151] mb-2">Which round?</p>
                <div className="flex flex-wrap gap-2">
                  {([
                    { id: 'screen',        label: 'Screen',        desc: 'Broad, fast-paced' },
                    { id: 'technical',     label: 'Technical',     desc: 'Deep, trade-off heavy' },
                    { id: 'system_design', label: 'System Design', desc: 'Architecture & scale' },
                    { id: 'behavioral',    label: 'Behavioral',    desc: 'STAR, real examples' },
                    { id: 'final',         label: 'Final round',   desc: 'Technical + culture' },
                  ] as const).map(r => (
                    <button key={r.id} onClick={() => setRoundType(r.id)}
                      className="px-3 py-2 rounded-lg border text-xs font-medium transition-all"
                      style={{
                        borderColor: roundType === r.id ? '#1E2A44' : '#E5E7EB',
                        background:  roundType === r.id ? '#1E2A44' : 'white',
                        color:       roundType === r.id ? 'white'   : '#374151',
                      }}>
                      {r.label}
                      <span className="block text-[10px] mt-0.5 opacity-70">{r.desc}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Job Description */}
          <div ref={contextRef} className="bg-white rounded-xl border border-[#E5E7EB] p-5" style={{ boxShadow: '0 1px 3px rgba(0,0,0,.05)' }}>
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
                  <button key={m.id} onClick={() => handleModuleClick(m.id, m.free, m.name)}
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

            {/* Context prompt — appears right after module selection when fields are empty */}
            {module_ && !contextOk && (
              <button
                onClick={() => contextRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })}
                className="mt-4 w-full flex items-center gap-3 rounded-xl border-2 px-4 py-3.5 text-left transition-all"
                style={{ borderColor: '#F5A524', background: '#FFF8EE' }}>
                <span className="text-xl flex-shrink-0">📋</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-[#111827]">One more thing before you start</p>
                  <p className="text-xs text-[#6B7280] mt-0.5">Paste your job description or resume above — the AI uses it to personalise every question to your exact role.</p>
                </div>
                <span className="text-[#F5A524] font-bold text-sm flex-shrink-0">↑ Fill in</span>
              </button>
            )}
          </div>

          {/* Mock Panel section */}
          <div className="bg-white rounded-xl border border-[#E5E7EB] overflow-hidden" style={{ boxShadow: '0 1px 3px rgba(0,0,0,.05)' }}>
            <button
              className="w-full flex items-center justify-between px-5 py-4 hover:bg-[#F8F9FB] transition-colors"
              onClick={() => setShowPanel(p => !p)}>
              <div className="flex items-center gap-3">
                <span className="text-xl">🎭</span>
                <div className="text-left">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-[#111827] text-sm">Mock Panel Simulation</span>
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-[#EEF1F6] text-[#1E2A44] border border-[#C7D0E0]">PRO</span>
                  </div>
                  <p className="text-xs text-[#6B7280]">4 rounds · ~45 min · Screen → Technical → System Design → Behavioral</p>
                </div>
              </div>
              <svg className="flex-shrink-0 transition-transform text-[#9CA3AF]"
                style={{ transform: showPanel ? 'rotate(180deg)' : 'rotate(0deg)' }}
                width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {showPanel && (
              <div className="border-t border-[#F3F4F6] px-5 pb-5 pt-4 space-y-3">
                {planLoaded && !isPro && (
                  <div className="bg-[#FFF8EE] border border-[#F5A524]/30 rounded-lg px-4 py-3 flex items-center justify-between gap-3">
                    <p className="text-xs text-[#6B7280]">Mock Panel requires a <strong className="text-[#111827]">Pro plan</strong></p>
                    <Link href="/pricing" className="text-xs font-semibold px-3 py-1.5 rounded-lg whitespace-nowrap" style={{ background: '#F5A524', color: '#17140F' }}>
                      Upgrade →
                    </Link>
                  </div>
                )}

                <div className="grid grid-cols-1 gap-2">
                  {panels.map(p => {
                    const locked   = planLoaded && !isPro
                    const selected = selectedPanel === p.id
                    return (
                      <button key={p.id} onClick={() => !locked && setSelectedPanel(p.id)}
                        disabled={locked}
                        className="text-left p-4 rounded-xl border-2 transition-all"
                        style={{
                          borderColor: selected ? '#F5A524' : '#E5E7EB',
                          background:  selected ? '#FFF8EE' : locked ? '#F9FAFB' : 'white',
                          opacity:     locked ? 0.6 : 1,
                        }}>
                        <div className="flex items-start justify-between mb-1">
                          <span className="font-semibold text-[#111827] text-sm">{p.title}</span>
                          {selected && <span className="text-[#F5A524] text-sm ml-2">✓</span>}
                        </div>
                        <p className="text-xs text-[#6B7280] mb-2">{p.description}</p>
                        <div className="flex items-center gap-2 flex-wrap">
                          {p.round_sequence.map((r: string) => (
                            <span key={r} className="text-[10px] px-2 py-0.5 rounded-full bg-[#F3F4F6] text-[#6B7280] border border-[#E5E7EB] capitalize">
                              {r.replace('_', ' ')}
                            </span>
                          ))}
                          <span className="text-[10px] text-[#9CA3AF]">~{p.estimated_minutes} min</span>
                        </div>
                      </button>
                    )
                  })}
                </div>

                {isPro && (
                  <button
                    onClick={startPanel}
                    disabled={!selectedPanel || !contextOk || panelLoading}
                    className="w-full py-3 rounded-xl text-sm font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{ background: selectedPanel && contextOk ? '#1E2A44' : '#E5E7EB', color: selectedPanel && contextOk ? 'white' : '#9CA3AF' }}>
                    {panelLoading ? 'Starting panel...' : !selectedPanel ? 'Select a panel above' : !contextOk ? 'Add job description or resume to continue' : 'Start full panel →'}
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Focus sub-skill hint from CV diagnostic */}
          {focusSubSkill && module_ && (
            <div className="bg-[#FFF8EE] border border-[#F5A524]/40 rounded-xl px-4 py-3 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <span className="text-[#F5A524]">🎯</span>
                <div>
                  <p className="text-sm font-semibold text-[#111827]">Focus area from your CV diagnostic</p>
                  <p className="text-xs text-[#6B7280] mt-0.5">
                    Your CV showed a gap in <span className="font-medium text-[#C77D2E]">{focusSubSkill.replace(/_/g, ' ')}</span> — the interviewer will weight questions toward this area.
                  </p>
                </div>
              </div>
              <button onClick={() => setFocusSubSkill('')} className="text-[#9CA3AF] hover:text-[#374151] text-lg flex-shrink-0">×</button>
            </div>
          )}

          {error && (
            <div className="bg-[#FEF2F2] border border-[#FECACA] rounded-xl p-4 text-sm text-[#DC2626] flex justify-between items-start gap-3">
              <div className="flex-1">
                <p>{error}</p>
                {!contextOk && (
                  <button
                    onClick={() => contextRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })}
                    className="mt-2 text-xs font-semibold underline text-[#DC2626] hover:text-[#B91C1C]">
                    ↑ Scroll to job description / resume fields
                  </button>
                )}
              </div>
              <button onClick={() => setError('')} className="text-[#DC2626]/50 hover:text-[#DC2626] flex-shrink-0">×</button>
            </div>
          )}

          <button onClick={start} disabled={loading}
            className="w-full py-3.5 rounded-xl text-base font-semibold transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ background: module_ && contextOk ? '#F5A524' : '#E5E7EB', color: module_ && contextOk ? '#17140F' : '#9CA3AF', boxShadow: module_ && contextOk ? '0 4px 12px rgba(245,165,36,.3)' : 'none', cursor: loading ? 'not-allowed' : 'pointer' }}>
            {loading ? (
              <span className="flex items-center justify-center gap-3">
                <span style={{ width:18,height:18,border:'2.5px solid rgba(255,255,255,.3)',borderTopColor:'white',borderRadius:'50%',animation:'spin 1s linear infinite',display:'inline-block' }} />
                Starting your interview...
              </span>
            ) : !module_ ? (
              'Select a module above'
            ) : !contextOk ? (
              'Add a job description or resume to continue ↑'
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
      {upgradeReason && <UpgradeModal reason={upgradeReason} onClose={() => setUpgradeReason('')} />}
    </AppLayout>
  )
}

export default function StartPage() {
  return <Suspense fallback={null}><StartPageInner /></Suspense>
}
