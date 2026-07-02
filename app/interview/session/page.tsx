'use client'
import { Suspense, useState, useEffect, useRef } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'

interface Message { role: 'user' | 'assistant'; content: string }

function TypingDots() {
  return (
    <div className="flex gap-1 items-center h-5">
      <span className="w-1.5 h-1.5 rounded-full bg-dim typing-dot" />
      <span className="w-1.5 h-1.5 rounded-full bg-dim typing-dot" />
      <span className="w-1.5 h-1.5 rounded-full bg-dim typing-dot" />
    </div>
  )
}

function SessionInner() {
  const params = useSearchParams()
  const router = useRouter()
  const sessionId    = params.get('id')
  const qidsRaw      = params.get('qids') ?? ''
  const questionIds  = qidsRaw ? qidsRaw.split(',') : []
  const totalQ       = parseInt(params.get('total') ?? '10')

  const [messages, setMessages]       = useState<Message[]>([])
  const [input, setInput]             = useState('')
  const [sending, setSending]         = useState(false)
  const [isTyping, setIsTyping]       = useState(false)
  const [currentQ, setCurrentQ]       = useState(0)
  const [done, setDone]               = useState(false)
  const [scoring, setScoring]         = useState(false)
  const [error, setError]             = useState('')
  const [elapsed, setElapsed]         = useState(0)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef  = useRef<HTMLTextAreaElement>(null)
  const timerRef  = useRef<NodeJS.Timeout>()

  // Auto-scroll
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages, isTyping])

  // Timer
  useEffect(() => {
    timerRef.current = setInterval(() => setElapsed(e => e + 1), 1000)
    return () => clearInterval(timerRef.current)
  }, [])

  // Load first message from DB
  useEffect(() => {
    if (!sessionId) { router.push('/interview'); return }
    loadMessages()
  }, [sessionId])

  async function loadMessages() {
    try {
      const res = await fetch(`/api/interview/messages?sessionId=${sessionId}`)
      if (!res.ok) { setError('Could not load session. Please go back and try again.'); return }
      const data = await res.json()
      if (data.messages?.length) setMessages(data.messages)
    } catch {
      setError('Network error. Please check your connection.')
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
      const res = await fetch('/api/interview/message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, userMessage: text, currentQIndex: currentQ, questionIds }),
      })
      const data = await res.json()
      setIsTyping(false)

      if (!res.ok) {
        setError(data.error ?? 'Failed to send. Try again.')
        setMessages(prev => prev.slice(0, -1))
        setSending(false)
        return
      }

      setMessages(prev => [...prev, { role: 'assistant', content: data.aiResponse }])
      if (data.advance) setCurrentQ(data.nextQIndex)
      if (data.done) { setDone(true); clearInterval(timerRef.current); setTimeout(finishSession, 1500) }
    } catch {
      setIsTyping(false)
      setError('Network error. Try again.')
      setMessages(prev => prev.slice(0, -1))
    } finally {
      setSending(false)
      inputRef.current?.focus()
    }
  }

  async function finishSession() {
    setScoring(true)
    try {
      const res = await fetch('/api/interview/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, questionIds }),
      })
      if (!res.ok) throw new Error('Scoring failed')
      router.push(`/interview/results?id=${sessionId}`)
    } catch {
      setError('Could not generate score. Your session is saved — try visiting /dashboard.')
      setScoring(false)
    }
  }

  const mm = String(Math.floor(elapsed / 60)).padStart(2, '0')
  const ss = String(elapsed % 60).padStart(2, '0')
  const progress = Math.round((currentQ / totalQ) * 100)

  if (scoring) return (
    <div className="min-h-screen bg-bg flex items-center justify-center">
      <div className="text-center">
        <div className="w-12 h-12 rounded-xl bg-blue-m border border-blue/30 flex items-center justify-center mx-auto mb-4 animate-pulse">
          <span className="text-blue text-xl">S</span>
        </div>
        <p className="text-bright font-medium mb-1">Scoring your interview...</p>
        <p className="text-sm text-dim">About 10 seconds.</p>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-bg flex flex-col">
      {/* Header */}
      <div className="border-b border-border bg-card flex-shrink-0 px-4 py-2.5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="w-2 h-2 rounded-full bg-green" style={{ boxShadow: '0 0 0 4px rgba(29,185,84,.15)' }} />
          <span className="text-xs text-dim font-medium">Live interview</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-dim hidden sm:block">Q{currentQ + 1} of {totalQ}</span>
          <div className="w-32 h-1.5 bg-border rounded-full overflow-hidden">
            <div className="h-full bg-blue rounded-full transition-all duration-500" style={{ width: `${progress}%` }} />
          </div>
          <span className="font-mono text-xs text-dim">{mm}:{ss}</span>
        </div>
        <button
          onClick={() => { if (confirm('End this session? Your progress will be saved.')) router.push('/dashboard') }}
          className="text-xs text-dim hover:text-bright transition-colors px-2 py-1"
        >
          End ×
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-6 max-w-3xl w-full mx-auto">
        <div className="space-y-4">
          {messages.length === 0 && !error && (
            <div className="text-center py-16">
              <div className="w-10 h-10 rounded-xl bg-blue-m border border-blue/30 flex items-center justify-center mx-auto mb-3 animate-pulse">
                <span className="text-blue text-sm font-bold">S</span>
              </div>
              <p className="text-sm text-dim">Loading your interview...</p>
            </div>
          )}

          {error && (
            <div className="bg-red-m border border-red/20 rounded-lg px-4 py-3 text-sm text-red flex items-center justify-between">
              <span>{error}</span>
              <button onClick={() => setError('')} className="text-red/60 hover:text-red ml-4">×</button>
            </div>
          )}

          {messages.map((msg, i) => (
            <div key={i} className={`flex gap-3 animate-slide-up ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium flex-shrink-0 mt-0.5 ${msg.role === 'assistant' ? 'bg-blue-m border border-blue/30 text-blue' : 'bg-muted border border-border text-dim'}`}>
                {msg.role === 'assistant' ? 'AI' : 'Y'}
              </div>
              <div className={`max-w-[78%] px-4 py-3 rounded-xl text-sm leading-relaxed ${msg.role === 'assistant' ? 'bg-card border border-border rounded-tl-sm text-bright' : 'bg-blue-m border border-blue/20 rounded-tr-sm text-bright'}`}>
                {msg.content}
              </div>
            </div>
          ))}

          {isTyping && (
            <div className="flex gap-3 animate-fade-in">
              <div className="w-7 h-7 rounded-full bg-blue-m border border-blue/30 flex items-center justify-center text-blue text-xs font-medium flex-shrink-0">AI</div>
              <div className="bg-card border border-border rounded-xl rounded-tl-sm px-4 py-3"><TypingDots /></div>
            </div>
          )}

          {done && !scoring && (
            <div className="bg-green-m border border-green/20 rounded-xl px-4 py-3 text-sm text-green animate-slide-up">
              Interview complete — generating your score report...
            </div>
          )}

          <div ref={bottomRef} />
        </div>
      </div>

      {/* Input */}
      <div className="flex-shrink-0 border-t border-border bg-card px-4 py-3">
        <div className="max-w-3xl mx-auto flex gap-3 items-end">
          <textarea
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }}
            disabled={sending || done}
            placeholder={done ? 'Interview complete' : 'Type your answer... (Enter to send, Shift+Enter for new line)'}
            className="input flex-1 resize-none min-h-[48px] max-h-[120px] py-3"
            rows={1}
          />
          <button onClick={send} disabled={!input.trim() || sending || done} className="btn-blue px-3 py-3 flex-shrink-0">
            {sending
              ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              : <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
            }
          </button>
        </div>
        <p className="text-center text-xs text-dim mt-1.5">Answer as you would in a real interview.</p>
      </div>
    </div>
  )
}

export default function SessionPage() {
  return <Suspense fallback={null}><SessionInner /></Suspense>
}
