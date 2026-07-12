'use client'
import { useState, useEffect, useRef, useCallback, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import AppLayout from '@/components/app/AppLayout'

interface Msg { role: 'user' | 'assistant'; content: string }

type ContentPart = { type: 'text'; text: string } | { type: 'code'; lang: string; code: string }

function parseContent(raw: string): ContentPart[] {
  const parts: ContentPart[] = []
  const re = /```(\w*)\n?([\s\S]*?)```/g
  let last = 0; let m: RegExpExecArray | null
  while ((m = re.exec(raw)) !== null) {
    if (m.index > last) parts.push({ type: 'text', text: raw.slice(last, m.index) })
    parts.push({ type: 'code', lang: m[1] || 'text', code: m[2].trimEnd() })
    last = re.lastIndex
  }
  if (last < raw.length) parts.push({ type: 'text', text: raw.slice(last) })
  return parts
}

function CodeBlock({ lang, code }: { lang: string; code: string }) {
  const [copied, setCopied] = useState(false)
  const copy = useCallback(() => {
    navigator.clipboard.writeText(code).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1800) })
  }, [code])
  return (
    <div className="mt-3 rounded-xl overflow-hidden border border-[#2D3748]" style={{ background: '#1A202C' }}>
      <div className="flex items-center justify-between px-3 py-1.5" style={{ background: '#2D3748' }}>
        <span className="text-[10px] font-mono text-[#718096] uppercase tracking-wide">{lang || 'code'}</span>
        <button onClick={copy} className="text-[10px] font-medium text-[#A0AEC0] hover:text-white transition-colors px-2 py-0.5 rounded"
          style={{ background: 'rgba(255,255,255,.08)' }}>
          {copied ? '✓ Copied' : 'Copy'}
        </button>
      </div>
      <pre className="px-4 py-3 overflow-x-auto text-xs leading-relaxed"
        style={{ fontFamily: "'JetBrains Mono', 'Fira Code', monospace", color: '#E2E8F0', margin: 0 }}>
        <code>{code}</code>
      </pre>
    </div>
  )
}

function MessageContent({ content, role }: { content: string; role: 'user' | 'assistant' }) {
  const parts = parseContent(content)
  const hasCode = parts.some(p => p.type === 'code')
  return (
    <div>
      {parts.map((part, i) =>
        part.type === 'code'
          ? <CodeBlock key={i} lang={part.lang} code={part.code} />
          : <span key={i} style={{ whiteSpace: 'pre-wrap' }}>{part.text}</span>
      )}
      {hasCode && role === 'assistant' && (
        <p className="mt-3 text-xs text-[#9CA3AF] border-t border-[#E5E7EB] pt-2">
          Type your analysis in the text box below — identify the bugs, explain what each one causes, and show the fix.
        </p>
      )}
    </div>
  )
}

const SS_LABELS: Record<string, string[]> = {
  rag_system_design:   ['Chunking Strategy','Retrieval Quality','Reranking','Freshness'],
  agent_orchestration: ['Tool Use & Design','Planning','Failure Handling','Multi-Agent','Tool Creation','Memory Mgmt'],
  evaluation_testing:  ['Eval Design','Hallucination','Offline/Online','Regression Gates'],
  production_mlops:    ['Observability','Guardrails','Cost/Latency','MCP Integration','Deployment'],
}

async function authHeader(): Promise<Record<string, string>> {
  const { data: { session } } = await createClient().auth.getSession()
  if (session?.access_token) return { Authorization: `Bearer ${session.access_token}` }
  return {}
}


function SessionInner() {
  const params    = useSearchParams()
  const router    = useRouter()
  const sessionId = params.get('id')
  const lang      = (params.get('lang') ?? 'en') as 'en'|'fr'
  const module_   = params.get('module') ?? ''

  const [messages,    setMessages]    = useState<Msg[]>([])
  const [input,       setInput]       = useState('')
  const [sending,     setSending]     = useState(false)
  const [isTyping,    setIsTyping]    = useState(false)
  const [subIdx,      setSubIdx]      = useState(0)
  const [total,       setTotal]       = useState(4)
  const [done,        setDone]        = useState(false)
  const [scoring,     setScoring]     = useState(false)
  const [error,       setError]       = useState('')
  const [elapsed,     setElapsed]     = useState(0)
  const [voiceOn,      setVoiceOn]      = useState(false)
  const [isRecording,  setIsRecording]  = useState(false)
  const [voiceOk,      setVoiceOk]      = useState(false)
  const [voiceEnabled, setVoiceEnabled] = useState(true)
  const [skipLoad,     setSkipLoad]     = useState(false)
  const [starterCode,  setStarterCode]  = useState<string | null>(null)
  const [codeLanguage, setCodeLanguage] = useState<string>('python')

  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef  = useRef<HTMLTextAreaElement>(null)
  const timerRef  = useRef<NodeJS.Timeout>()
  const recRef    = useRef<any>(null)

  const labels          = SS_LABELS[module_] ?? ['Q1','Q2','Q3','Q4']
  const currentQuestion = messages.filter(m => m.role === 'assistant').pop()?.content ?? ''

  useEffect(() => {
    setVoiceOk(!!(((window as any).SpeechRecognition) || (window as any).webkitSpeechRecognition))
    if (sessionId) {
      const flag = sessionStorage.getItem(`session_${sessionId}_voiceEnabled`)
      if (flag === 'false') setVoiceEnabled(false)
    }
  }, [])
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages, isTyping])
  useEffect(() => {
    timerRef.current = setInterval(() => setElapsed(e => e + 1), 1000)
    return () => clearInterval(timerRef.current)
  }, [])

  useEffect(() => {
    if (!sessionId) { router.push('/app/start'); return }
    const cached = sessionStorage.getItem(`session_${sessionId}_opening`)
    const cachedTotal = sessionStorage.getItem(`session_${sessionId}_totalSS`)
    const cachedCode  = sessionStorage.getItem(`session_${sessionId}_starterCode`)
    const cachedLang  = sessionStorage.getItem(`session_${sessionId}_codeLanguage`)
    if (cached) {
      setMessages([{ role: 'assistant', content: cached }])
      if (cachedTotal) setTotal(Number(cachedTotal))
      if (cachedCode)  { setStarterCode(cachedCode); setCodeLanguage(cachedLang ?? 'python') }
      return
    }
    authHeader().then(hdrs =>
      fetch(`/api/interview/session?id=${sessionId}`, { headers: hdrs })
        .then(r => r.json())
        .then(d => {
          if (d.openingMessage) {
            setMessages([{ role: 'assistant', content: d.openingMessage }])
            setTotal(d.totalSubSkills ?? 4)
            if (d.starterCode) { setStarterCode(d.starterCode); setCodeLanguage(d.codeLanguage ?? 'python') }
          }
          if (d.error) setError(d.error)
        })
        .catch(() => setError('Failed to load session.'))
    )
  }, [sessionId])

  function startRec() {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SR) return
    const r = new SR()
    r.lang = lang === 'fr' ? 'fr-FR' : 'en-US'
    r.continuous = true; r.interimResults = false
    r.onresult = (e: any) => setInput(Array.from(e.results).map((x: any) => x[0].transcript).join(' '))
    r.onerror  = () => setIsRecording(false)
    r.onend    = () => setIsRecording(false)
    r.start(); recRef.current = r; setIsRecording(true)
  }
  function stopRec() { recRef.current?.stop(); recRef.current = null; setIsRecording(false) }

  async function send(text?: string) {
    const content = (text ?? input).trim()
    if (!content || sending || done) return
    setInput(''); setSending(true); setIsTyping(true); setError('')
    setMessages(prev => [...prev, { role: 'user', content }])
    try {
      const hdrs = await authHeader()
      const res  = await fetch('/api/interview/turn', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...hdrs },
        body: JSON.stringify({ sessionId, userMessage: content, currentSubSkillIdx: subIdx, inputType: voiceOn ? 'voice' : 'text' }),
      })
      const data = await res.json()
      setIsTyping(false)
      if (!res.ok) { setError(data.error ?? 'Error'); setMessages(prev => prev.slice(0,-1)); setSending(false); return }
      setMessages(prev => [...prev, { role: 'assistant', content: data.aiResponse }])
      if (voiceOn && !data.isComplete) setTimeout(startRec, 400)
      if (data.shouldAdvance) {
        setSubIdx(data.nextSubSkillIdx)
        if (data.starterCode) { setStarterCode(data.starterCode); setCodeLanguage(data.codeLanguage ?? 'python') }
        else setStarterCode(null)
      }
      if (data.nextOpeningMessage) setTimeout(() => {
        setMessages(prev => [...prev, { role: 'assistant', content: data.nextOpeningMessage }])
        if (voiceOn) setTimeout(startRec, 400)
      }, 500)
      if (data.isComplete) { setDone(true); clearInterval(timerRef.current); setTimeout(end, 1500) }
    } catch { setIsTyping(false); setError('Network error'); setMessages(prev => prev.slice(0,-1)) }
    finally { setSending(false) }
  }

  async function skip() {
    if (skipLoad || done) return
    setSkipLoad(true)
    setMessages(prev => [...prev, { role: 'user', content: lang === 'fr' ? '(Passée)' : '(Skipped)' }]); setIsTyping(true)
    try {
      const hdrs = await authHeader()
      const res  = await fetch('/api/interview/skip', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...hdrs },
        body: JSON.stringify({ sessionId, currentSubSkillIdx: subIdx }),
      })
      const d = await res.json()
      setIsTyping(false)
      if (d.isComplete) { setDone(true); clearInterval(timerRef.current); setTimeout(end, 1200); return }
      setSubIdx(d.nextSubSkillIdx)
      if (d.nextOpeningMessage) { setMessages(prev => [...prev, { role: 'assistant', content: d.nextOpeningMessage }]); if (voiceOn) setTimeout(startRec, 400) }
    } catch { setIsTyping(false) }
    finally { setSkipLoad(false) }
  }

  async function end() {
    setScoring(true)
    const hdrs = await authHeader()
    const res  = await fetch('/api/interview/end', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...hdrs },
      body: JSON.stringify({ sessionId }),
    })
    const data = await res.json()
    if (res.ok) router.push(`/interview/report?id=${sessionId}&lang=${lang}`)
    else { setError(data.error ?? 'Report failed'); setScoring(false) }
  }

  if (scoring) return (
    <AppLayout>
    <div className="h-full bg-[#F8F9FB] flex items-center justify-center min-h-[60vh]" style={{ fontFamily:'Inter,sans-serif' }}>
      <div className="text-center bg-white rounded-2xl border border-[#E5E7EB] p-12 shadow-lg">
        <div className="w-16 h-16 bg-[#FFF8EE] rounded-full flex items-center justify-center mx-auto mb-5">
          <div style={{ width:28, height:28, border:'3px solid rgba(245,165,36,.3)', borderTopColor:'#F5A524', borderRadius:'50%', animation:'spin 1s linear infinite' }} />
        </div>
        <h2 className="text-xl font-bold text-[#111827] mb-2">Generating your report...</h2>
        <p className="text-[#6B7280] text-sm">Scoring all 4 sub-skills — about 15 seconds.</p>
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
    </AppLayout>
  )

  const mm  = String(Math.floor(elapsed/60)).padStart(2,'0')
  const ss_ = String(elapsed%60).padStart(2,'0')

  return (
    <AppLayout>
    <div className="h-full flex flex-col bg-[#F8F9FB]" style={{ fontFamily:'Inter,sans-serif' }}>

      {/* Top bar */}
      <div className="bg-white border-b border-[#E5E7EB] px-4 sm:px-6 py-3 flex items-center justify-between flex-shrink-0" style={{ boxShadow:'0 1px 3px rgba(0,0,0,.06)' }}>
        <div className="flex items-center gap-3">
          <span className="w-2.5 h-2.5 rounded-full bg-[#4ADE80] flex-shrink-0" style={{ boxShadow:'0 0 0 4px rgba(74,222,128,.2)' }} />
          <span className="text-sm font-semibold text-[#111827]">{lang === 'fr' ? 'Entretien en direct' : 'Live interview'}</span>
          <span className="text-[#E5E7EB] hidden sm:block">·</span>
          <span className="text-sm text-[#6B7280] hidden sm:block">{labels[subIdx] ?? `Q${subIdx+1}`}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="font-mono text-sm text-[#6B7280]">{mm}:{ss_}</span>
          {voiceOk && voiceEnabled && (
            <button onClick={() => { setVoiceOn(v => !v); if (isRecording) stopRec() }}
              className="text-xs font-medium px-2.5 py-1.5 rounded-lg border transition-all"
              style={{ background: voiceOn ? '#FFF8EE' : '#F9FAFB', borderColor: voiceOn ? '#F5A524' : '#E5E7EB', color: voiceOn ? '#D98A0B' : '#6B7280' }}>
              🎙️ {voiceOn ? 'Voice on' : 'Voice'}
            </button>
          )}
          {!done && (
            <button onClick={skip} disabled={skipLoad}
              className="text-xs text-[#6B7280] border border-[#E5E7EB] px-2.5 py-1.5 rounded-lg hover:bg-[#F3F4F6] transition-all disabled:opacity-50">
              {skipLoad ? '...' : lang === 'fr' ? 'Passer →' : 'Skip →'}
            </button>
          )}
          <button onClick={() => { if (confirm('Exit? Progress saved.')) router.push('/dashboard') }}
            className="text-xs text-[#9CA3AF] hover:text-[#374151] px-2 py-1.5 transition-colors">← Dashboard</button>
        </div>
      </div>

      {/* Main: two-column */}
      <div className="flex-1 flex min-h-0">

        {/* LEFT: Interviewer panel (desktop only) */}
        <div className="w-72 flex-shrink-0 border-r border-[#E5E7EB] bg-white flex-col hidden lg:flex">
          <div className="flex-1 flex flex-col items-center justify-center p-6 bg-gradient-to-b from-[#F5F4F0] to-white">
            <div className="relative mb-5">
              <div className="w-24 h-24 rounded-full bg-[#1E2A44] flex items-center justify-center text-white text-4xl font-bold shadow-lg">AI</div>
              {isTyping && (
                <div className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-white border-2 border-[#E5E7EB] flex items-center justify-center">
                  <div className="flex gap-0.5">
                    {[0,1,2].map(i => <span key={i} className="w-1.5 h-1.5 rounded-full bg-[#F5A524]" style={{ animation:`bounce 1.2s ${i*.2}s ease-in-out infinite` }} />)}
                  </div>
                </div>
              )}
            </div>
            <div className="text-center">
              <div className="font-bold text-[#111827] mb-0.5">AI Interviewer</div>
              <div className="text-xs text-[#6B7280]">Applied AI Engineer</div>
            </div>
          </div>

          {currentQuestion && !isTyping && (
            <div className="p-4 border-t border-[#E5E7EB]">
              <p className="text-xs font-semibold text-[#9CA3AF] uppercase tracking-widest mb-2">Current question</p>
              <p className="text-sm text-[#374151] leading-relaxed line-clamp-4">{currentQuestion}</p>
            </div>
          )}

          <div className="p-4 border-t border-[#E5E7EB]">
            <p className="text-xs font-semibold text-[#9CA3AF] uppercase tracking-widest mb-3">Progress</p>
            <div className="space-y-2">
              {Array.from({ length: total }).map((_, i) => (
                <div key={i} className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold"
                    style={{ background: i < subIdx ? '#ECFDF5' : i === subIdx ? '#FFF8EE' : '#F3F4F6', border: `1px solid ${i < subIdx ? '#A7F3D0' : i === subIdx ? '#F5A524' : '#E5E7EB'}`, color: i < subIdx ? '#059669' : i === subIdx ? '#D98A0B' : '#9CA3AF' }}>
                    {i < subIdx ? '✓' : i+1}
                  </div>
                  <span className="text-xs" style={{ color: i < subIdx ? '#059669' : i === subIdx ? '#D98A0B' : '#9CA3AF', fontWeight: i === subIdx ? 600 : 400 }}>
                    {labels[i] ?? `Q${i+1}`}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* RIGHT: Chat */}
        <div className="flex-1 flex flex-col min-w-0">
          {voiceOn && (
            <div className="bg-[#FFF8EE] border-b border-[#F5A524]/30 px-4 py-2 flex items-center justify-center gap-3 flex-shrink-0">
              <span className="text-xs text-[#C77D2E] font-medium">
                {isRecording ? '🔴 Recording — speak your answer...' : '🎙️ Voice mode — hold mic to answer'}
              </span>
            </div>
          )}

          <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-6">
            <div className="max-w-2xl mx-auto space-y-5">
              {messages.length === 0 && (
                <div className="text-center py-16">
                  <div style={{ width:24, height:24, border:'2.5px solid rgba(245,165,36,.3)', borderTopColor:'#F5A524', borderRadius:'50%', animation:'spin 1s linear infinite', margin:'0 auto 12px' }} />
                  <p className="text-[#9CA3AF] text-sm">Loading your interview...</p>
                </div>
              )}

              {messages.map((msg, i) => (
                <div key={i} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`} style={{ animation:'slideUp .25s ease' }}>
                  <div className="flex-shrink-0 mt-0.5">
                    {msg.role === 'assistant'
                      ? <div className="w-8 h-8 rounded-full bg-[#1E2A44] flex items-center justify-center text-white font-bold text-xs shadow-sm">AI</div>
                      : <div className="w-8 h-8 rounded-full bg-[#F3F4F6] border border-[#E5E7EB] flex items-center justify-center text-[#6B7280] font-bold text-xs">Y</div>
                    }
                  </div>
                  <div className="max-w-[78%] flex flex-col">
                    {msg.role === 'assistant' && i > 0 && (
                      <span className="text-[10px] text-[#9CA3AF] mb-1 ml-1">AI Interviewer · {labels[subIdx] ?? 'Q'}</span>
                    )}
                    <div className={`px-4 py-3 rounded-2xl text-sm leading-relaxed ${msg.role === 'assistant' ? 'bg-white border border-[#E5E7EB] rounded-tl-sm text-[#111827]' : 'bg-[#1E2A44] text-white rounded-tr-sm'}`}
                      style={{ boxShadow: msg.role === 'assistant' ? '0 1px 3px rgba(0,0,0,.06)' : '0 2px 6px rgba(37,99,235,.25)', opacity: (msg.content.includes('Skipped') || msg.content.includes('Passée')) ? 0.5 : 1 }}>
                      <MessageContent content={msg.content} role={msg.role} />
                    </div>
                  </div>
                </div>
              ))}

              {isTyping && (
                <div className="flex gap-3" style={{ animation:'slideUp .2s ease' }}>
                  <div className="w-8 h-8 rounded-full bg-[#1E2A44] flex items-center justify-center text-white font-bold text-xs shadow-sm flex-shrink-0">AI</div>
                  <div className="bg-white border border-[#E5E7EB] rounded-2xl rounded-tl-sm px-4 py-3.5 shadow-sm">
                    <div className="flex items-center gap-1.5">
                      {[0,1,2].map(i => <span key={i} style={{ width:7, height:7, borderRadius:'50%', background:'#CBD5E1', display:'inline-block', animation:`bounce 1.2s ${i*.2}s ease-in-out infinite` }} />)}
                    </div>
                  </div>
                </div>
              )}

              {done && !scoring && (
                <div className="bg-[#ECFDF5] border border-[#A7F3D0] rounded-xl p-4 text-sm text-[#065F46] font-medium text-center" style={{ animation:'slideUp .3s ease' }}>
                  ✓ Interview complete — generating your diagnostic report...
                </div>
              )}

              {error && (
                <div className="bg-[#FEF2F2] border border-[#FECACA] rounded-xl p-4 flex items-center justify-between">
                  <span className="text-sm text-[#DC2626]">{error}</span>
                  <button onClick={() => setError('')} className="text-[#DC2626]/50 hover:text-[#DC2626] text-xl">×</button>
                </div>
              )}

              <div ref={bottomRef} />
            </div>
          </div>

          {/* Practical question code panel */}
          {starterCode && (
            <div className="border-t border-[#E5E7EB] flex-shrink-0" style={{ background: '#1A202C', maxHeight: '38vh', overflowY: 'auto' }}>
              <div className="flex items-center justify-between px-4 py-2" style={{ background: '#2D3748' }}>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono text-[#A0AEC0] uppercase tracking-wide">{codeLanguage}</span>
                  <span className="text-[10px] text-[#718096]">·</span>
                  <span className="text-[10px] text-[#68D391] font-semibold">Practical question — read the code, type your analysis below</span>
                </div>
                <button onClick={() => { navigator.clipboard.writeText(starterCode) }} className="text-[10px] text-[#A0AEC0] hover:text-white px-2 py-0.5 rounded" style={{ background: 'rgba(255,255,255,.08)' }}>
                  Copy
                </button>
              </div>
              <pre className="px-4 py-3 text-xs leading-relaxed overflow-x-auto"
                style={{ fontFamily: "'JetBrains Mono','Fira Code',monospace", color: '#E2E8F0', margin: 0 }}>
                <code>{starterCode}</code>
              </pre>
            </div>
          )}

          {/* Input */}
          <div className="bg-white border-t border-[#E5E7EB] px-4 sm:px-6 py-4 flex-shrink-0" style={{ boxShadow:'0 -1px 6px rgba(0,0,0,.05)' }}>
            <div className="max-w-2xl mx-auto">
              {voiceOn ? (
                <div className="flex flex-col items-center gap-3">
                  <button
                    onMouseDown={startRec}
                    onMouseUp={() => { stopRec(); setTimeout(() => { if (input.trim()) send() }, 200) }}
                    onTouchStart={startRec}
                    onTouchEnd={() => { stopRec(); setTimeout(() => { if (input.trim()) send() }, 200) }}
                    disabled={sending || done}
                    style={{ width:72, height:72, borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', fontSize:28, background: isRecording ? '#FEE2E2' : '#F5A524', border: isRecording ? '3px solid #DC2626' : '3px solid transparent', boxShadow: isRecording ? '0 0 0 6px rgba(220,38,38,.2)' : '0 4px 12px rgba(245,165,36,.3)', cursor:'pointer' }}>
                    {isRecording ? '⏹' : '🎤'}
                  </button>
                  <p className="text-xs text-[#9CA3AF] text-center">{isRecording ? 'Release to send' : 'Hold to speak'}</p>
                  {input && <div className="w-full bg-[#F8F9FB] border border-[#E5E7EB] rounded-xl px-4 py-2.5 text-sm text-[#374151]"><span className="text-[#9CA3AF] text-xs">Transcript: </span>{input}</div>}
                  <button onClick={() => setVoiceOn(false)} className="text-xs text-[#9CA3AF] hover:text-[#6B7280]">Switch to text</button>
                </div>
              ) : (
                <div className="flex gap-3 items-end">
                  <textarea ref={inputRef} value={input} onChange={e => setInput(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }}
                    disabled={sending || done} rows={2}
                    placeholder={done ? 'Interview complete' : (lang === 'fr' ? 'Votre réponse... (Entrée pour envoyer)' : 'Your answer... (Enter to send · Shift+Enter for new line)')}
                    className="flex-1 resize-none bg-[#F8F9FB] border border-[#E5E7EB] rounded-xl px-4 py-3 text-sm text-[#111827] placeholder:text-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-[#F5A524]/15 focus:border-[#F5A524] transition-all max-h-32"
                  />
                  <button onClick={() => send()} disabled={!input.trim() || sending || done}
                    className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 disabled:opacity-40 disabled:cursor-not-allowed transition-all hover:opacity-90"
                    style={{ background:'#F5A524', color:'#17140F', boxShadow:'0 2px 6px rgba(245,165,36,.3)' }}>
                    {sending
                      ? <span style={{ width:16, height:16, border:'2px solid rgba(255,255,255,.3)', borderTopColor:'white', borderRadius:'50%', animation:'spin 1s linear infinite', display:'block' }} />
                      : <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="white" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"/></svg>
                    }
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes slideUp{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}
        @keyframes bounce{0%,80%,100%{transform:translateY(0)}40%{transform:translateY(-5px)}}
      `}</style>
    </div>
    </AppLayout>
  )
}

export default function SessionPage() {
  return <Suspense fallback={null}><SessionInner /></Suspense>
}
