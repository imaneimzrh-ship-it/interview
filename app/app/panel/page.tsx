'use client'
import { Suspense, useState, useEffect, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import AppLayout from '@/components/app/AppLayout'
import { createClient } from '@/lib/supabase/client'
import type { RoundType } from '@/lib/claude/panel-interviewer'

const ROUND_LABELS: Record<RoundType, { label: string; emoji: string; desc: string }> = {
  screen:        { label: 'Screening',    emoji: '📋', desc: 'Conceptual breadth · Communication clarity' },
  technical:     { label: 'Technical',    emoji: '⚙️', desc: 'Deep technical · Trade-off reasoning' },
  system_design: { label: 'System Design', emoji: '🏗️', desc: 'Architecture · Scalability · Failure modes' },
  behavioral:    { label: 'Behavioral',   emoji: '💬', desc: 'STAR structure · Real examples · Self-awareness' },
}

interface Message { role: 'assistant' | 'user'; content: string }

async function authHeader(): Promise<Record<string, string>> {
  const { data: { session } } = await createClient().auth.getSession()
  if (session?.access_token) return { Authorization: `Bearer ${session.access_token}` }
  return {}
}

function PanelPageInner() {
  const router       = useRouter()
  const searchParams = useSearchParams()

  const panelSessionId = searchParams.get('id') ?? ''
  const lang           = (searchParams.get('lang') ?? 'en') as 'en' | 'fr'

  // Session state
  const [roundType,     setRoundType]     = useState<RoundType>('screen')
  const [panelRoundId,  setPanelRoundId]  = useState('')
  const [roundIdx,      setRoundIdx]      = useState(0)
  const [totalRounds,   setTotalRounds]   = useState(4)
  const [roundSequence, setRoundSequence] = useState<RoundType[]>([])
  const [roleCluster,   setRoleCluster]   = useState('')
  const [panelTitle,    setPanelTitle]    = useState('')

  // Chat state
  const [messages,      setMessages]      = useState<Message[]>([])
  const [input,         setInput]         = useState('')
  const [sending,       setSending]       = useState(false)
  const [questionsAsked, setQuestionsAsked] = useState(0)

  // Round-complete state
  const [roundComplete,      setRoundComplete]      = useState(false)
  const [advancing,          setAdvancing]           = useState(false)
  const [allDone,            setAllDone]             = useState(false)
  const [error,              setError]               = useState('')

  const bottomRef = useRef<HTMLDivElement>(null)

  // Load session from sessionStorage (set by start page) or fetch
  useEffect(() => {
    if (!panelSessionId) { router.push('/app/start'); return }

    const stored = sessionStorage.getItem(`panel_${panelSessionId}`)
    if (stored) {
      const data = JSON.parse(stored)
      setRoundType(data.roundType)
      setPanelRoundId(data.panelRoundId)
      setRoundIdx(data.roundIdx ?? 0)
      setTotalRounds(data.totalRounds ?? 4)
      setRoundSequence(data.roundSequence ?? [])
      setRoleCluster(data.roleCluster ?? '')
      setPanelTitle(data.panelTitle ?? '')
      setMessages([{ role: 'assistant', content: data.openingMessage }])
    } else {
      router.push('/app/start')
    }
  }, [panelSessionId, router])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function send() {
    if (!input.trim() || sending || roundComplete) return
    const userMsg = input.trim()
    setInput('')
    setSending(true)
    setError('')

    const history: Message[] = [...messages]
    setMessages(prev => [...prev, { role: 'user', content: userMsg }])

    try {
      const hdrs = await authHeader()
      const res  = await fetch('/api/panel/turn', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...hdrs },
        body: JSON.stringify({
          panel_session_id: panelSessionId,
          panel_round_id:   panelRoundId,
          user_message:     userMsg,
          history:          history.map(m => ({ role: m.role, content: m.content })),
        }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Error'); setSending(false); return }

      setMessages(prev => [...prev, { role: 'assistant', content: data.response }])
      setQuestionsAsked(data.questionsAsked ?? questionsAsked + 1)

      if (data.roundComplete) {
        setRoundComplete(true)
      }
    } catch { setError('Network error.') }
    finally { setSending(false) }
  }

  async function advanceToNextRound() {
    setAdvancing(true)
    setError('')
    try {
      const hdrs = await authHeader()
      const res  = await fetch('/api/panel/advance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...hdrs },
        body: JSON.stringify({ panel_session_id: panelSessionId }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Error'); setAdvancing(false); return }

      if (data.allDone) {
        setAllDone(true)
        setAdvancing(false)
        return
      }

      // Start next round
      const nextRound = data.roundType as RoundType
      setPanelRoundId(data.panelRoundId)
      setRoundType(nextRound)
      setRoundIdx(data.roundIdx)
      setMessages([{ role: 'assistant', content: data.openingMessage }])
      setRoundComplete(false)
      setQuestionsAsked(0)

      // Update sessionStorage
      const stored = sessionStorage.getItem(`panel_${panelSessionId}`)
      if (stored) {
        const parsed = JSON.parse(stored)
        sessionStorage.setItem(`panel_${panelSessionId}`, JSON.stringify({
          ...parsed,
          roundType:    nextRound,
          panelRoundId: data.panelRoundId,
          roundIdx:     data.roundIdx,
          openingMessage: data.openingMessage,
        }))
      }
    } catch { setError('Network error.') }
    finally { setAdvancing(false) }
  }

  async function finishPanel() {
    setAdvancing(true)
    try {
      const hdrs = await authHeader()
      await fetch('/api/panel/end', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...hdrs },
        body: JSON.stringify({ panel_session_id: panelSessionId }),
      })
      router.push(`/app/panel/report?id=${panelSessionId}`)
    } catch { setError('Network error.'); setAdvancing(false) }
  }

  const roundInfo = ROUND_LABELS[roundType]
  const isLastRound = roundIdx === totalRounds - 1

  return (
    <AppLayout>
      <div className="flex flex-col h-full max-w-3xl mx-auto">

        {/* Round progress bar */}
        <div className="bg-white border-b border-[#E5E7EB] px-6 py-4">
          <div className="flex items-center justify-between mb-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-lg">{roundInfo.emoji}</span>
                <span className="font-semibold text-[#111827] text-sm">{roundInfo.label}</span>
                {roundComplete && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#ECFDF5] text-[#065F46] border border-[#A7F3D0]">Complete</span>
                )}
              </div>
              <p className="text-xs text-[#9CA3AF] mt-0.5">{roundInfo.desc}</p>
            </div>
            <div className="text-right">
              <div className="text-xs font-medium text-[#374151]">Round {roundIdx + 1} of {totalRounds}</div>
              {panelTitle && <div className="text-[10px] text-[#9CA3AF]">{panelTitle}</div>}
            </div>
          </div>

          {/* Round dots */}
          <div className="flex gap-2">
            {roundSequence.map((rt, i) => {
              const info   = ROUND_LABELS[rt]
              const isDone = i < roundIdx
              const isCurr = i === roundIdx
              return (
                <div key={rt} className="flex items-center gap-1 flex-1">
                  <div className="flex items-center gap-1 flex-1 min-w-0">
                    <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 text-[10px] font-bold transition-all"
                      style={{
                        background: isDone ? '#ECFDF5' : isCurr ? '#FFF8EE' : '#F3F4F6',
                        color:      isDone ? '#065F46' : isCurr ? '#D98A0B' : '#9CA3AF',
                        border:     `2px solid ${isDone ? '#A7F3D0' : isCurr ? '#F5A524' : '#E5E7EB'}`,
                      }}>
                      {isDone ? '✓' : i + 1}
                    </div>
                    <span className="text-[10px] truncate" style={{ color: isCurr ? '#111827' : '#9CA3AF', fontWeight: isCurr ? 600 : 400 }}>
                      {info.label}
                    </span>
                  </div>
                  {i < roundSequence.length - 1 && (
                    <div className="h-px w-4 flex-shrink-0" style={{ background: i < roundIdx ? '#A7F3D0' : '#E5E7EB' }} />
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-4">
          {messages.map((m, i) => (
            <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className="max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap"
                style={{
                  background: m.role === 'user' ? '#1E2A44' : 'white',
                  color:      m.role === 'user' ? 'white' : '#111827',
                  border:     m.role === 'user' ? 'none' : '1px solid #E5E7EB',
                  boxShadow:  '0 1px 3px rgba(0,0,0,.06)',
                }}>
                {m.content}
              </div>
            </div>
          ))}

          {sending && (
            <div className="flex justify-start">
              <div className="bg-white border border-[#E5E7EB] rounded-2xl px-4 py-3 flex gap-1.5 items-center" style={{ boxShadow: '0 1px 3px rgba(0,0,0,.06)' }}>
                {[0,1,2].map(i => (
                  <div key={i} className="w-1.5 h-1.5 rounded-full bg-[#9CA3AF]"
                    style={{ animation: `bounce 1.2s ease-in-out ${i * 0.2}s infinite` }} />
                ))}
              </div>
            </div>
          )}

          {/* Round complete banner */}
          {roundComplete && !allDone && (
            <div className="bg-[#ECFDF5] border border-[#A7F3D0] rounded-xl p-4 text-center">
              <div className="text-2xl mb-2">✓</div>
              <p className="font-semibold text-[#065F46] text-sm mb-1">
                {roundInfo.label} round complete
              </p>
              <p className="text-xs text-[#047857] mb-4">
                {isLastRound
                  ? "That's the last round. Ready to see your scorecard?"
                  : `Next up: ${ROUND_LABELS[roundSequence[roundIdx + 1] as RoundType]?.label ?? ''} round`}
              </p>
              <button
                onClick={isLastRound ? finishPanel : advanceToNextRound}
                disabled={advancing}
                className="px-6 py-2.5 rounded-xl font-semibold text-sm transition-all disabled:opacity-50"
                style={{ background: '#10B981', color: 'white', boxShadow: '0 4px 12px rgba(16,185,129,.25)' }}>
                {advancing ? 'Loading...' : isLastRound ? 'View full scorecard →' : `Start ${ROUND_LABELS[roundSequence[roundIdx + 1] as RoundType]?.label ?? 'next'} round →`}
              </button>
            </div>
          )}

          {allDone && (
            <div className="bg-[#FFF8EE] border border-[#F5A524]/30 rounded-xl p-4 text-center">
              <div className="text-2xl mb-2">🎉</div>
              <p className="font-semibold text-[#111827] text-sm mb-3">All rounds complete!</p>
              <button
                onClick={finishPanel}
                disabled={advancing}
                className="px-6 py-2.5 rounded-xl font-semibold text-sm"
                style={{ background: '#F5A524', color: '#17140F' }}>
                {advancing ? 'Generating scorecard...' : 'View full scorecard →'}
              </button>
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        {/* Error */}
        {error && (
          <div className="mx-6 mb-2 bg-[#FEF2F2] border border-[#FECACA] rounded-lg px-4 py-2 text-xs text-[#DC2626]">
            {error}
          </div>
        )}

        {/* Input */}
        {!roundComplete && !allDone && (
          <div className="bg-white border-t border-[#E5E7EB] px-6 py-4">
            <div className="flex gap-3">
              <textarea
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }}
                rows={3}
                placeholder={lang === 'fr' ? 'Votre réponse...' : 'Your answer...'}
                disabled={sending}
                className="flex-1 text-sm bg-[#F8F9FB] border border-[#E5E7EB] rounded-xl px-4 py-3 resize-none focus:outline-none focus:ring-2 focus:ring-[#F5A524]/15 focus:border-[#F5A524] transition-all disabled:opacity-50"
              />
              <button
                onClick={send}
                disabled={!input.trim() || sending}
                className="px-5 py-3 rounded-xl font-semibold text-sm self-end transition-all disabled:opacity-40"
                style={{ background: '#1E2A44', color: 'white' }}>
                {sending ? '...' : '→'}
              </button>
            </div>
            <p className="text-[10px] text-[#9CA3AF] mt-2 text-center">Enter to send · Shift+Enter for new line</p>
          </div>
        )}
      </div>

      <style>{`
        @keyframes bounce {
          0%, 80%, 100% { transform: translateY(0); opacity: .4; }
          40% { transform: translateY(-4px); opacity: 1; }
        }
      `}</style>
    </AppLayout>
  )
}

export default function PanelPage() {
  return <Suspense fallback={null}><PanelPageInner /></Suspense>
}
