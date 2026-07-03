'use client'
import { useState, useEffect, useRef, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

interface Msg {
  role: 'user' | 'assistant' | 'system'
  content: string
}

const DISCLOSURE = {
  en: 'This session stores your transcript and diagnostic results to generate your report. You can delete this session at any time from your session history. Avoid sharing real employer names or confidential project details — the diagnostic works just as well with anonymised examples.',
  fr: 'Cette session enregistre votre transcription et vos résultats de diagnostic pour générer votre rapport. Vous pouvez supprimer cette session à tout moment depuis votre historique. Évitez de mentionner des noms d\'employeurs réels ou des détails confidentiels — le diagnostic fonctionne aussi bien avec des exemples anonymisés.',
}

const SUB_SKILL_LABELS: Record<string, string[]> = {
  rag_system_design:    ['Chunking Strategy', 'Retrieval Quality', 'Reranking', 'Freshness & Updates'],
  agent_orchestration:  ['Tool Use Design', 'Planning & Decomposition', 'Failure Handling', 'Multi-Agent Coordination'],
  evaluation_testing:   ['Eval Design', 'Hallucination Detection', 'Offline vs Online Eval', 'Regression Testing'],
  production_mlops:     ['Monitoring & Observability', 'Cost/Latency Tradeoffs', 'Versioning & Rollback', 'Deployment Safety'],
}

function Flag({ onFlag, label }: { onFlag: (note: string) => void; label: string }) {
  const [open, setOpen] = useState(false)
  const [note, setNote] = useState('')
  if (open) return (
    <div className="flex items-center gap-1.5 mt-1">
      <input className="text-xs bg-[#09090C] border border-[#1C1D28] rounded px-2 py-1 text-[#7A829A] w-48"
        placeholder="Why? (optional)" value={note} onChange={e => setNote(e.target.value)} />
      <button onClick={() => { onFlag(note); setOpen(false); setNote('') }} className="text-xs text-[#E8A020] hover:underline">Send</button>
      <button onClick={() => setOpen(false)} className="text-xs text-[#3D4260] hover:underline">Cancel</button>
    </div>
  )
  return (
    <button onClick={() => setOpen(true)} className="text-xs text-[#3D4260] hover:text-[#E8A020] transition-colors mt-1 flex items-center gap-1">
      <span>⚑</span> {label}
    </button>
  )
}

function SessionInner() {
  const params     = useSearchParams()
  const router     = useRouter()
  const sessionId  = params.get('id')
  const moduleSlug = params.get('module') ?? ''
  const lang       = (params.get('lang') ?? 'en') as 'en' | 'fr'

  const [messages,       setMessages]       = useState<Msg[]>([])
  const [input,          setInput]          = useState('')
  const [sending,        setSending]        = useState(false)
  const [isTyping,       setIsTyping]       = useState(false)
  const [subSkillIdx,    setSubSkillIdx]    = useState(0)
  const [totalSS,        setTotalSS]        = useState(4)
  const [done,           setDone]           = useState(false)
  const [scoring,        setScoring]        = useState(false)
  const [skipping,       setSkipping]       = useState(false)
  const [error,          setError]          = useState('')
  const [elapsed,        setElapsed]        = useState(0)
  const [showDisclosure, setShowDisclosure] = useState(true)
  const [currentModule,  setCurrentModule]  = useState(moduleSlug)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef  = useRef<HTMLTextAreaElement>(null)
  const timerRef  = useRef<ReturnType<typeof setInterval>>()

  const subSkillNames = SUB_SKILL_LABELS[currentModule] ?? []

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages, isTyping])

  useEffect(() => {
    timerRef.current = setInterval(() => setElapsed(e => e + 1), 1000)
    return () => clearInterval(timerRef.current)
  }, [])

  useEffect(() => {
    if (!sessionId) { router.push('/interview'); return }
    loadInitial()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId])

  async function authHeader(): Promise<Record<string, string>> {
    const { data: { session } } = await createClient().auth.getSession()
    if (session?.access_token) return { 'Authorization': `Bearer ${session.access_token}` }
    return {}
  }

  async function loadInitial() {
    const cached     = sessionStorage.getItem(`session_${sessionId}_opening`)
    const cachedMod  = sessionStorage.getItem(`session_${sessionId}_module`)
    if (cached) {
      setMessages([{ role: 'assistant', content: cached }])
      const totalStr = sessionStorage.getItem(`session_${sessionId}_totalSS`)
      setTotalSS(parseInt(totalStr ?? '4'))
      if (cachedMod) setCurrentModule(cachedMod)
      return
    }
    const hdrs = await authHeader()
    const res  = await fetch(`/api/interview/session?id=${sessionId}`, { headers: hdrs })
    const data = await res.json()
    if (data.openingMessage) {
      setMessages([{ role: 'assistant', content: data.openingMessage }])
      setTotalSS(data.totalSubSkills ?? 4)
      if (data.moduleSlug) setCurrentModule(data.moduleSlug)
    } else if (data.error) {
      setError(data.error)
    }
  }

  async function send() {
    const text = input.trim()
    if (!text || sending || done) return
    setInput('')
    setSending(true)
    setIsTyping(true)
    setError('')
    setMessages(prev => [...prev, { role: 'user', content: text }])

    try {
      const hdrs = await authHeader()
      const res  = await fetch('/api/interview/turn', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...hdrs },
        body: JSON.stringify({ sessionId, userMessage: text, currentSubSkillIdx: subSkillIdx }),
      })
      const data = await res.json()
      setIsTyping(false)

      if (!res.ok) {
        setError(data.error ?? 'Error.')
        setMessages(prev => prev.slice(0, -1))
        setSending(false)
        return
      }

      setMessages(prev => [...prev, { role: 'assistant', content: data.aiResponse }])

      if (data.shouldAdvance) {
        const completedName = subSkillNames[subSkillIdx] ?? `Sub-skill ${subSkillIdx + 1}`
        const nextName      = subSkillNames[data.nextSubSkillIdx] ?? `Sub-skill ${data.nextSubSkillIdx + 1}`
        setSubSkillIdx(data.nextSubSkillIdx)

        if (!data.isComplete) {
          setTimeout(() => {
            setMessages(prev => [...prev, {
              role: 'system',
              content: lang === 'fr'
                ? `✓ ${completedName} terminé · Passage à : ${nextName}`
                : `✓ ${completedName} complete · Moving to: ${nextName}`,
            }])
          }, 300)
        }
      }

      if (data.nextOpeningMessage) {
        setTimeout(() => setMessages(prev => [...prev, { role: 'assistant', content: data.nextOpeningMessage }]), 800)
      }

      if (data.isComplete) {
        setDone(true)
        clearInterval(timerRef.current)
        setTimeout(endSession, 1500)
      }
    } catch {
      setIsTyping(false)
      setError(lang === 'fr' ? 'Erreur réseau.' : 'Network error.')
      setMessages(prev => prev.slice(0, -1))
    } finally {
      setSending(false)
      inputRef.current?.focus()
    }
  }

  async function skipSubSkill() {
    if (skipping || done) return
    const label = lang === 'fr' ? 'Passer cette sous-compétence ?' : 'Skip this sub-skill?'
    if (!confirm(label)) return
    setSkipping(true)
    setError('')

    const completedName = subSkillNames[subSkillIdx] ?? `Sub-skill ${subSkillIdx + 1}`

    try {
      const hdrs = await authHeader()
      const res  = await fetch('/api/interview/skip', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...hdrs },
        body: JSON.stringify({ sessionId, currentSubSkillIdx: subSkillIdx }),
      })
      const data = await res.json()

      if (!res.ok) { setError(data.error ?? 'Skip failed.'); setSkipping(false); return }

      setMessages(prev => [...prev, {
        role: 'system',
        content: lang === 'fr'
          ? `⏭ ${completedName} passé`
          : `⏭ ${completedName} skipped`,
      }])

      if (data.isComplete) {
        setDone(true)
        clearInterval(timerRef.current)
        setTimeout(endSession, 1000)
      } else {
        const nextName = subSkillNames[data.nextSubSkillIdx] ?? `Sub-skill ${data.nextSubSkillIdx + 1}`
        setSubSkillIdx(data.nextSubSkillIdx)
        setTimeout(() => {
          setMessages(prev => [...prev, {
            role: 'system',
            content: lang === 'fr' ? `→ ${nextName}` : `→ ${nextName}`,
          }])
        }, 300)
        if (data.nextOpeningMessage) {
          setTimeout(() => setMessages(prev => [...prev, { role: 'assistant', content: data.nextOpeningMessage }]), 700)
        }
      }
    } catch {
      setError('Network error.')
    } finally {
      setSkipping(false)
    }
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
    if (res.ok) {
      router.push(`/interview/report?id=${sessionId}`)
    } else {
      setError(data.error ?? 'Failed to generate report.')
      setScoring(false)
    }
  }

  async function flagTurn(turnIdx: number, note: string) {
    const hdrs = await authHeader()
    await fetch('/api/interview/flag', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...hdrs },
      body: JSON.stringify({ sessionId, targetType: 'turn', targetId: `turn_${turnIdx}`, note }),
    })
  }

  const mm       = String(Math.floor(elapsed / 60)).padStart(2, '0')
  const ss_      = String(elapsed % 60).padStart(2, '0')
  const progress = Math.min(100, Math.round((subSkillIdx / totalSS) * 100))
  const currentSSName = subSkillNames[subSkillIdx] ?? `Sub-skill ${subSkillIdx + 1}`

  if (scoring) return (
    <div className="min-h-screen bg-[#09090C] flex items-center justify-center" style={{ fontFamily: 'Inter, sans-serif' }}>
      <div className="text-center">
        <div className="w-12 h-12 border-2 border-[#4776F7]/30 border-t-[#4776F7] rounded-full animate-spin mx-auto mb-4" />
        <p className="text-[#F0F2FA] font-medium mb-1">{lang === 'fr' ? 'Génération du rapport...' : 'Generating your report...'}</p>
        <p className="text-sm text-[#7A829A]">{lang === 'fr' ? 'Environ 15 secondes.' : 'About 15 seconds.'}</p>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-[#09090C] flex flex-col" style={{ fontFamily: 'Inter, sans-serif' }}>
      {/* Header */}
      <div className="border-b border-[#1C1D28] bg-[#111218] flex-shrink-0 px-4 py-2.5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="w-2 h-2 rounded-full bg-[#1DB954]" style={{ boxShadow: '0 0 0 4px rgba(29,185,84,.12)' }} />
          <span className="text-xs text-[#7A829A] font-medium hidden sm:block">
            {lang === 'fr' ? 'Entretien en cours' : 'Live interview'}
          </span>
        </div>
        <div className="flex items-center gap-3 flex-1 justify-center max-w-xs mx-4">
          <div className="flex gap-1 flex-1">
            {Array.from({ length: totalSS }).map((_, i) => (
              <div key={i} className="h-1.5 flex-1 rounded-full transition-all duration-500"
                style={{ background: i < subSkillIdx ? '#1DB954' : i === subSkillIdx ? '#4776F7' : '#1C1D28' }} />
            ))}
          </div>
          <span className="text-xs text-[#7A829A] whitespace-nowrap">{subSkillIdx + 1}/{totalSS}</span>
          <span className="font-mono text-xs text-[#7A829A]">{mm}:{ss_}</span>
        </div>
        <div className="flex items-center gap-2">
          {!done && (
            <button onClick={skipSubSkill} disabled={skipping || sending}
              className="text-xs text-[#3D4260] hover:text-[#E8A020] transition-colors px-2 py-1 disabled:opacity-50">
              {skipping ? '...' : (lang === 'fr' ? 'Passer ⏭' : 'Skip ⏭')}
            </button>
          )}
          <button
            onClick={() => { if (confirm(lang === 'fr' ? 'Quitter ?' : 'Exit this session?')) router.push('/interview') }}
            className="text-xs text-[#7A829A] hover:text-[#F0F2FA] transition-colors px-2 py-1">
            {lang === 'fr' ? '×' : 'Exit ×'}
          </button>
        </div>
      </div>

      {/* Sub-skill label */}
      <div className="border-b border-[#1C1D28] bg-[#0D0D12] px-4 py-1.5 text-center">
        <span className="text-xs text-[#4776F7] font-medium">{currentSSName}</span>
      </div>

      {/* Disclosure banner */}
      {showDisclosure && (
        <div className="bg-[#1A2550] border-b border-[#4776F7]/20 px-4 py-3 flex items-start justify-between gap-4">
          <p className="text-xs text-[#7A829A] leading-relaxed max-w-2xl">{DISCLOSURE[lang]}</p>
          <button onClick={() => setShowDisclosure(false)} className="text-xs text-[#4776F7] hover:underline flex-shrink-0">OK</button>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-6 max-w-3xl w-full mx-auto">
        <div className="space-y-4">
          {messages.map((msg, i) => {
            if (msg.role === 'system') return (
              <div key={i} className="flex justify-center">
                <div className="px-3 py-1.5 rounded-full bg-[#1C1D28] text-xs text-[#7A829A]">
                  {msg.content}
                </div>
              </div>
            )
            return (
              <div key={i} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium flex-shrink-0 mt-0.5 ${msg.role === 'assistant' ? 'bg-[rgba(71,118,247,0.12)] border border-[rgba(71,118,247,0.3)] text-[#4776F7]' : 'bg-[#1C1D28] border border-[#2A2B38] text-[#7A829A]'}`}>
                  {msg.role === 'assistant' ? 'AI' : 'Y'}
                </div>
                <div className="max-w-[78%]">
                  <div className={`px-4 py-3 rounded-xl text-sm leading-relaxed ${msg.role === 'assistant' ? 'bg-[#111218] border border-[#1C1D28] rounded-tl-sm text-[#F0F2FA]' : 'bg-[rgba(71,118,247,0.12)] border border-[rgba(71,118,247,0.2)] rounded-tr-sm text-[#F0F2FA]'}`}>
                    {msg.content}
                  </div>
                  {msg.role === 'assistant' && i > 0 && (
                    <Flag onFlag={(note) => flagTurn(i, note)} label={lang === 'fr' ? 'Signaler cette question' : 'Flag this question'} />
                  )}
                </div>
              </div>
            )
          })}

          {isTyping && (
            <div className="flex gap-3">
              <div className="w-7 h-7 rounded-full bg-[rgba(71,118,247,0.12)] border border-[rgba(71,118,247,0.3)] flex items-center justify-center text-[#4776F7] text-xs font-medium flex-shrink-0">AI</div>
              <div className="bg-[#111218] border border-[#1C1D28] rounded-xl rounded-tl-sm px-4 py-3">
                <div className="flex gap-1 items-center h-4">
                  {[0, 1, 2].map(i => (
                    <span key={i} className="w-1.5 h-1.5 rounded-full bg-[#7A829A]"
                      style={{ animation: `blink 1.4s ${i * 0.2}s ease-in-out infinite` }} />
                  ))}
                </div>
              </div>
            </div>
          )}

          {done && !scoring && (
            <div className="bg-[rgba(29,185,84,0.1)] border border-[rgba(29,185,84,0.2)] rounded-xl px-4 py-3 text-sm text-[#1DB954] text-center">
              {lang === 'fr' ? '✓ Entretien terminé — génération du rapport...' : '✓ Interview complete — generating your report...'}
            </div>
          )}

          {error && (
            <div className="bg-[rgba(232,64,64,0.1)] border border-[rgba(232,64,64,0.2)] rounded-lg px-4 py-3 text-sm text-[#E84040]">
              {error}
            </div>
          )}

          <div ref={bottomRef} />
        </div>
      </div>

      {/* Input */}
      <div className="flex-shrink-0 border-t border-[#1C1D28] bg-[#111218] px-4 py-3">
        <div className="max-w-3xl mx-auto flex gap-3 items-end">
          <textarea
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }}
            disabled={sending || done}
            placeholder={done
              ? (lang === 'fr' ? 'Entretien terminé' : 'Interview complete')
              : (lang === 'fr' ? 'Votre réponse...' : 'Your answer...')}
            className="flex-1 resize-none min-h-[48px] max-h-[140px] bg-[#09090C] border border-[#1C1D28] rounded-lg px-3.5 py-3 text-sm text-[#F0F2FA] placeholder:text-[#3D4260] focus:outline-none focus:ring-1 focus:ring-[#4776F7] focus:border-[#4776F7] transition-colors"
            rows={1}
          />
          <button
            onClick={send}
            disabled={!input.trim() || sending || done}
            className="bg-[#4776F7] text-white rounded-lg px-3 py-3 flex-shrink-0 disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90 transition-opacity">
            {sending
              ? <span className="w-4 h-4 block border-2 border-white/30 border-t-white rounded-full animate-spin" />
              : <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
            }
          </button>
        </div>
        <p className="text-center text-xs text-[#3D4260] mt-1.5">
          {lang === 'fr' ? 'Entrée pour envoyer · Maj+Entrée pour nouvelle ligne' : 'Enter to send · Shift+Enter for new line'}
        </p>
      </div>

      <style>{`@keyframes blink { 0%,100%{opacity:.2;transform:scale(.85)}50%{opacity:1;transform:scale(1)} }`}</style>
    </div>
  )
}

export default function SessionPage() {
  return <Suspense fallback={null}><SessionInner /></Suspense>
}
