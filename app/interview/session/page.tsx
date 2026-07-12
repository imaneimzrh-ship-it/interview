'use client'
import { useState, useEffect, useRef, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import AppLayout from '@/components/app/AppLayout'

interface Msg { role: 'user' | 'assistant'; content: string; idx?: number }

const SS_LABELS: Record<string, string[]> = {
  rag_system_design:  ['Chunking Strategy','Retrieval Quality','Reranking','Freshness'],
  agent_orchestration:['Tool Use','Planning','Failure Handling','Multi-Agent'],
  evaluation_testing: ['Eval Design','Hallucination','Offline/Online','Regression'],
  production_mlops:   ['Monitoring','Cost/Latency','Versioning','Deployment Safety'],
}

async function authHeader(): Promise<Record<string, string>> {
  const { data: { session } } = await createClient().auth.getSession()
  if (session?.access_token) return { Authorization: `Bearer ${session.access_token}` }
  return {}
}

function Flag({ onFlag }: { onFlag: (note: string) => void }) {
  const [open, setOpen] = useState(false)
  const [note, setNote] = useState('')
  if (!open) return (
    <button onClick={() => setOpen(true)} className="text-xs text-[#D1D5DB] hover:text-[#F59E0B] transition-colors mt-1.5 flex items-center gap-1 ml-11">
      ⚑ Flag this question
    </button>
  )
  return (
    <div className="flex items-center gap-2 mt-1.5 ml-11">
      <input className="text-xs border border-[#E5E7EB] rounded-lg px-2.5 py-1.5 bg-white text-[#374151] w-44 focus:outline-none focus:ring-1 focus:ring-[#F5A524]"
        placeholder="Why? (optional)" value={note} onChange={e => setNote(e.target.value)} />
      <button onClick={() => { onFlag(note); setOpen(false); setNote('') }} className="text-xs bg-[#FEF3C7] text-[#92400E] border border-[#FDE68A] px-2.5 py-1.5 rounded-lg hover:bg-[#FDE68A] transition-colors">Send</button>
      <button onClick={() => setOpen(false)} className="text-xs text-[#9CA3AF] hover:text-[#6B7280]">Cancel</button>
    </div>
  )
}

function SessionInner() {
  const params    = useSearchParams()
  const router    = useRouter()
  const sessionId = params.get('id')
  const lang      = (params.get('lang') ?? 'en') as 'en' | 'fr'
  const module_   = params.get('module') ?? ''

  const [messages,   setMessages]   = useState<Msg[]>([])
  const [input,      setInput]      = useState('')
  const [sending,    setSending]    = useState(false)
  const [isTyping,   setIsTyping]   = useState(false)
  const [subIdx,     setSubIdx]     = useState(0)
  const [total,      setTotal]      = useState(4)
  const [done,       setDone]       = useState(false)
  const [scoring,    setScoring]    = useState(false)
  const [error,      setError]      = useState('')
  const [elapsed,    setElapsed]    = useState(0)
  const [showInfo,   setShowInfo]   = useState(true)
  const [skipLoad,   setSkipLoad]   = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef  = useRef<HTMLTextAreaElement>(null)
  const timerRef  = useRef<NodeJS.Timeout>()

  const labels = SS_LABELS[module_] ?? ['Q1','Q2','Q3','Q4']

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages, isTyping])
  useEffect(() => { timerRef.current = setInterval(() => setElapsed(e => e + 1), 1000); return () => clearInterval(timerRef.current) }, [])

  useEffect(() => {
    if (!sessionId) { router.push('/app/start'); return }
    const cached = sessionStorage.getItem(`session_${sessionId}_opening`)
    const cachedTotal = sessionStorage.getItem(`session_${sessionId}_totalSS`)
    if (cached) {
      setMessages([{ role: 'assistant', content: cached }])
      if (cachedTotal) setTotal(Number(cachedTotal))
      return
    }
    authHeader().then(hdrs =>
      fetch(`/api/interview/session?id=${sessionId}`, { headers: hdrs })
        .then(r => r.json())
        .then(d => {
          if (d.openingMessage) { setMessages([{ role: 'assistant', content: d.openingMessage }]); setTotal(d.totalSubSkills ?? 4) }
          if (d.error) setError(d.error)
        })
        .catch(() => setError('Failed to load session.'))
    )
  }, [sessionId])

  async function send() {
    const text = input.trim()
    if (!text || sending || done) return
    setInput(''); setSending(true); setIsTyping(true); setError('')
    setMessages(prev => [...prev, { role: 'user', content: text, idx: prev.length }])
    try {
      const hdrs = await authHeader()
      const res  = await fetch('/api/interview/turn', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...hdrs },
        body: JSON.stringify({ sessionId, userMessage: text, currentSubSkillIdx: subIdx }),
      })
      const data = await res.json()
      setIsTyping(false)
      if (!res.ok) { setError(data.error ?? 'Error.'); setMessages(prev => prev.slice(0,-1)); setSending(false); return }
      setMessages(prev => [...prev, { role: 'assistant', content: data.aiResponse, idx: prev.length }])
      if (data.shouldAdvance) setSubIdx(data.nextSubSkillIdx)
      if (data.nextOpeningMessage) setTimeout(() => setMessages(prev => [...prev, { role: 'assistant', content: data.nextOpeningMessage }]), 500)
      if (data.isComplete) { setDone(true); clearInterval(timerRef.current); setTimeout(endSession, 1500) }
    } catch { setIsTyping(false); setError('Network error.'); setMessages(prev => prev.slice(0,-1)) }
    finally { setSending(false); inputRef.current?.focus() }
  }

  async function skip() {
    if (skipLoad || done) return
    setSkipLoad(true)
    setMessages(prev => [...prev, { role: 'user', content: lang === 'fr' ? '(Question passée)' : '(Skipped)' }])
    setIsTyping(true)
    try {
      const hdrs = await authHeader()
      const res  = await fetch('/api/interview/skip', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...hdrs },
        body: JSON.stringify({ sessionId, currentSubSkillIdx: subIdx }),
      })
      const data = await res.json()
      setIsTyping(false)
      if (data.isComplete) { setDone(true); clearInterval(timerRef.current); setTimeout(endSession, 1200); return }
      setSubIdx(data.nextSubSkillIdx)
      if (data.nextOpeningMessage) setMessages(prev => [...prev, { role: 'assistant', content: data.nextOpeningMessage }])
    } catch { setIsTyping(false); setError('Skip failed.'); setMessages(prev => prev.slice(0,-1)) }
    finally { setSkipLoad(false); inputRef.current?.focus() }
  }

  async function endSession() {
    setScoring(true)
    const hdrs = await authHeader()
    const res  = await fetch('/api/interview/end', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...hdrs },
      body: JSON.stringify({ sessionId }),
    })
    const data = await res.json()
    if (res.ok) router.push(`/interview/report?id=${sessionId}&lang=${lang}`)
    else { setError(data.error ?? 'Report generation failed.'); setScoring(false) }
  }

  async function flagMsg(msgIdx: number, note: string) {
    const hdrs = await authHeader()
    await fetch('/api/interview/flag', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...hdrs },
      body: JSON.stringify({ sessionId, targetType: 'turn', targetId: `turn_${msgIdx}`, note }),
    })
  }

  if (scoring) return (
    <AppLayout>
    <div className="min-h-[60vh] bg-[#F8F9FB] flex items-center justify-center" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
      <div className="text-center bg-white rounded-2xl border border-[#E5E7EB] p-12" style={{ boxShadow: '0 10px 40px rgba(0,0,0,.08)' }}>
        <div className="w-16 h-16 bg-[#EFF6FF] rounded-full flex items-center justify-center mx-auto mb-5">
          <div style={{ width:28,height:28,border:'3px solid rgba(245,165,36,.3)',borderTopColor:'#F5A524',borderRadius:'50%',animation:'spin 1s linear infinite' }} />
        </div>
        <h2 className="text-xl font-bold text-[#111827] mb-2">{lang === 'fr' ? 'Génération du rapport...' : 'Generating your report...'}</h2>
        <p className="text-[#6B7280] text-sm">{lang === 'fr' ? 'Environ 15 secondes.' : 'About 15 seconds. Your sub-skill scores are being calculated.'}</p>
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
    </AppLayout>
  )

  const mm  = String(Math.floor(elapsed/60)).padStart(2,'0')
  const ss_ = String(elapsed%60).padStart(2,'0')

  return (
    <AppLayout>
    <div className="h-full bg-[#F8F9FB] flex flex-col" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>

      {/* Header */}
      <div className="bg-white border-b border-[#E5E7EB] flex-shrink-0" style={{ boxShadow: '0 1px 3px rgba(0,0,0,.06)' }}>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-3">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <span className="w-2.5 h-2.5 rounded-full bg-[#4ADE80] flex-shrink-0" style={{ boxShadow: '0 0 0 4px rgba(74,222,128,.2)' }} />
              <span className="text-sm font-semibold text-[#111827] truncate">
                {lang === 'fr' ? 'Entretien en direct' : 'Live interview'}
              </span>
              <span className="text-[#D1D5DB] hidden sm:block">·</span>
              <span className="text-sm text-[#6B7280] hidden sm:block truncate">
                {labels[subIdx] ?? `Sub-skill ${subIdx+1}`}
              </span>
            </div>

            <div className="hidden md:flex items-center gap-1.5">
              {Array.from({ length: total }).map((_, i) => (
                <div key={i} className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium transition-all"
                  style={{
                    background: i < subIdx ? '#ECFDF5' : i === subIdx ? '#FFF8EE' : '#F9FAFB',
                    border: `1px solid ${i < subIdx ? '#A7F3D0' : i === subIdx ? '#F5A524' : '#E5E7EB'}`,
                    color: i < subIdx ? '#065F46' : i === subIdx ? '#D98A0B' : '#9CA3AF',
                  }}>
                  {i < subIdx ? '✓ ' : i === subIdx ? '● ' : ''}{labels[i] ?? `Q${i+1}`}
                </div>
              ))}
            </div>

            <div className="flex items-center gap-2 flex-shrink-0">
              <span className="font-mono text-sm text-[#6B7280] tabular-nums">{mm}:{ss_}</span>
              {!done && (
                <button onClick={skip} disabled={skipLoad}
                  className="text-xs text-[#6B7280] bg-[#F9FAFB] border border-[#E5E7EB] px-3 py-1.5 rounded-lg hover:bg-[#F3F4F6] hover:text-[#111827] transition-all disabled:opacity-50">
                  {skipLoad ? '...' : (lang === 'fr' ? 'Passer →' : 'Skip →')}
                </button>
              )}
              <button onClick={() => { if (confirm(lang==='fr'?'Quitter ?':'Exit? Progress is saved.')) router.push('/dashboard') }}
                className="text-xs text-[#9CA3AF] hover:text-[#6B7280] px-2 py-1.5 rounded-lg hover:bg-[#F9FAFB] transition-all">
                Exit ×
              </button>
            </div>
          </div>

          <div className="flex items-center gap-1 mt-2 md:hidden">
            {Array.from({ length: total }).map((_, i) => (
              <div key={i} className="h-1.5 flex-1 rounded-full transition-all"
                style={{ background: i < subIdx ? '#4ADE80' : i === subIdx ? '#F5A524' : '#E5E7EB' }} />
            ))}
            <span className="text-xs text-[#9CA3AF] ml-2 whitespace-nowrap">{subIdx+1}/{total}</span>
          </div>
        </div>
      </div>

      {showInfo && (
        <div className="bg-[#FFFBEB] border-b border-[#FDE68A] px-4 py-2.5 flex items-center justify-between gap-4">
          <p className="text-xs text-[#92400E]">
            📋 This session saves your transcript and diagnostic. You can delete it anytime from the dashboard. Avoid sharing confidential employer details if you prefer.
          </p>
          <button onClick={() => setShowInfo(false)} className="text-xs text-[#D97706] font-medium hover:underline flex-shrink-0">Got it</button>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto py-8 px-4">
        <div className="max-w-3xl mx-auto space-y-6">

          {messages.length === 0 && !error && (
            <div className="text-center py-16">
              <div className="w-12 h-12 bg-[#EFF6FF] rounded-xl flex items-center justify-center mx-auto mb-4">
                <div style={{ width:20,height:20,border:'2.5px solid rgba(245,165,36,.3)',borderTopColor:'#F5A524',borderRadius:'50%',animation:'spin 1s linear infinite' }} />
              </div>
              <p className="text-[#6B7280] text-sm">{lang==='fr'?'Chargement...':'Loading your interview...'}</p>
            </div>
          )}

          {error && (
            <div className="bg-[#FEF2F2] border border-[#FECACA] rounded-xl p-4 flex items-center justify-between">
              <span className="text-sm text-[#DC2626]">{error}</span>
              <button onClick={() => setError('')} className="text-[#DC2626]/50 hover:text-[#DC2626] text-lg">×</button>
            </div>
          )}

          {messages.map((msg, i) => (
            <div key={i} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`} style={{ animation: 'slideUp .25s ease' }}>
              <div className="flex-shrink-0 mt-0.5">
                {msg.role === 'assistant' ? (
                  <div className="w-9 h-9 rounded-full bg-[#1E2A44] flex items-center justify-center text-white font-bold text-xs shadow-sm">AI</div>
                ) : (
                  <div className="w-9 h-9 rounded-full bg-[#F3F4F6] border border-[#E5E7EB] flex items-center justify-center text-[#6B7280] font-bold text-xs">Y</div>
                )}
              </div>
              <div className="max-w-[78%] flex flex-col">
                {msg.role === 'assistant' && (
                  <span className="text-xs text-[#9CA3AF] mb-1.5 ml-1">AI Interviewer · {labels[subIdx] ?? 'Question'}</span>
                )}
                <div className={`px-4 py-3 rounded-2xl text-sm leading-relaxed ${
                  msg.role === 'assistant'
                    ? 'bg-white border border-[#E5E7EB] rounded-tl-sm text-[#111827]'
                    : 'bg-[#1E2A44] text-white rounded-tr-sm'
                }`} style={{
                  boxShadow: msg.role === 'assistant' ? '0 1px 3px rgba(0,0,0,.06)' : '0 2px 6px rgba(30,42,68,.2)',
                  fontStyle: msg.content.includes('Skipped') || msg.content.includes('passée') ? 'italic' : 'normal',
                  opacity: msg.content.includes('Skipped') || msg.content.includes('passée') ? 0.5 : 1,
                }}>
                  {msg.content}
                </div>
                {msg.role === 'assistant' && i > 0 && (
                  <Flag onFlag={(note) => flagMsg(i, note)} />
                )}
              </div>
            </div>
          ))}

          {isTyping && (
            <div className="flex gap-3" style={{ animation: 'slideUp .2s ease' }}>
              <div className="w-9 h-9 rounded-full bg-[#1E2A44] flex items-center justify-center text-white font-bold text-xs shadow-sm flex-shrink-0">AI</div>
              <div className="bg-white border border-[#E5E7EB] rounded-2xl rounded-tl-sm px-4 py-3.5" style={{ boxShadow: '0 1px 3px rgba(0,0,0,.06)' }}>
                <div className="flex items-center gap-1.5">
                  <span className="dot dot-1" /><span className="dot dot-2" /><span className="dot dot-3" />
                </div>
              </div>
            </div>
          )}

          {done && !scoring && (
            <div className="bg-[#ECFDF5] border border-[#A7F3D0] rounded-xl p-4 text-sm text-[#065F46] font-medium text-center" style={{ animation: 'slideUp .3s ease' }}>
              ✓ {lang === 'fr' ? 'Entretien terminé — génération du rapport en cours...' : 'Interview complete — generating your diagnostic report...'}
            </div>
          )}

          <div ref={bottomRef} />
        </div>
      </div>

      {/* Input */}
      <div className="flex-shrink-0 bg-white border-t border-[#E5E7EB]" style={{ boxShadow: '0 -1px 6px rgba(0,0,0,.05)' }}>
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex gap-3 items-end">
            <textarea ref={inputRef} value={input} onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }}
              disabled={sending || done}
              placeholder={done
                ? (lang==='fr'?'Entretien terminé':'Interview complete')
                : (lang==='fr'?'Votre réponse... (Entrée pour envoyer)':'Your answer... (Enter to send, Shift+Enter for new line)')}
              rows={2}
              className="flex-1 resize-none bg-[#F8F9FB] border border-[#E5E7EB] rounded-xl px-4 py-3 text-sm text-[#111827] placeholder:text-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-[#F5A524]/15 focus:border-[#F5A524] transition-all max-h-40"
              style={{ boxShadow: 'inset 0 1px 2px rgba(0,0,0,.04)' }}
            />
            <button onClick={send} disabled={!input.trim() || sending || done}
              className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              style={{ background: '#F5A524', color: '#17140F', boxShadow: '0 2px 6px rgba(245,165,36,.3)' }}>
              {sending
                ? <span style={{ width:16,height:16,border:'2px solid rgba(255,255,255,.3)',borderTopColor:'white',borderRadius:'50%',animation:'spin 1s linear infinite',display:'block' }} />
                : <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"/></svg>
              }
            </button>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg) } }
        @keyframes slideUp { from { opacity:0; transform:translateY(6px) } to { opacity:1; transform:translateY(0) } }
        .dot { width:7px; height:7px; border-radius:50%; background:#CBD5E1; display:inline-block; }
        .dot-1 { animation: bounce 1.2s 0s ease-in-out infinite; }
        .dot-2 { animation: bounce 1.2s .2s ease-in-out infinite; }
        .dot-3 { animation: bounce 1.2s .4s ease-in-out infinite; }
        @keyframes bounce { 0%,80%,100%{transform:translateY(0)} 40%{transform:translateY(-5px)} }
      `}</style>
    </div>
    </AppLayout>
  )
}

export default function SessionPage() {
  return <Suspense fallback={null}><SessionInner /></Suspense>
}
