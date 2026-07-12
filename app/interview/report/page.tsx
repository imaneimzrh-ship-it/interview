'use client'
import { useEffect, useState, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { BAND_COLORS, scoreToBand } from '@/lib/signals'
import AppLayout from '@/components/app/AppLayout'

async function authHeader(): Promise<Record<string, string>> {
  const { data: { session } } = await createClient().auth.getSession()
  if (session?.access_token) return { Authorization: `Bearer ${session.access_token}` }
  return {}
}

interface SubSkillScore { score: number; summary: string; evidence: string; tradeoff_score?: number; tradeoff_note?: string }
interface Report {
  top_strength: string; top_gap: string
  headline_en: string;  headline_fr: string
  sub_skill_scores: Record<string, SubSkillScore>
  tradeoff_avg?: number
  tradeoff_summary?: string
  improvement_plan: string
  full_summary_en: string; full_summary_fr: string
  share_token: string
  overall_score?: number
}
interface Session { language: string; skill_modules: { name_en: string; name_fr: string; slug: string } }

function ScoreMeter({ score, label }: { score: number; label: string }) {
  const band = scoreToBand(score * 25)
  const col  = BAND_COLORS[band]
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="text-sm text-[#374151] capitalize">{label.replace(/_/g,' ')}</span>
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
            style={{ background: col.bg, color: col.text, border: `1px solid ${col.border}` }}>{band}</span>
          <span className="text-xs font-mono font-bold" style={{ color: col.text }}>{score}/4</span>
        </div>
      </div>
      <div className="h-1.5 rounded-full bg-[#E7E2D8] overflow-hidden">
        <div className="h-full rounded-full transition-all duration-700" style={{ width:`${score*25}%`, background: col.text }} />
      </div>
    </div>
  )
}

function ShareCard({ report, lang, moduleName }: { report: Report; lang: string; moduleName: string }) {
  const [copied, setCopied] = useState(false)
  const shareUrl  = `https://sonneai.com/share/${report.share_token}`
  const shareText = `🎯 Just completed a mock ${moduleName} interview on Sonne AI — AI interview prep for applied AI roles.\n\n✓ Strength: ${report.top_strength}\n→ Gap: ${report.top_gap}\n\nSee the full result: ${shareUrl}\n\n#AIEngineering #InterviewPrep`
  function copy() { navigator.clipboard.writeText(shareText); setCopied(true); setTimeout(() => setCopied(false), 2500) }
  return (
    <div className="bg-[#EEF1F6] border border-[#C7D0E0] rounded-2xl p-5">
      <div className="text-xs font-semibold text-[#1E2A44] uppercase tracking-widest mb-3" style={{ fontFamily:"'JetBrains Mono',monospace" }}>
        {lang==='fr' ? '★ CARTE PARTAGEABLE' : '★ SHAREABLE RESULT'}
      </div>
      <div className="bg-white border border-[#E7E2D8] rounded-xl p-4 mb-4">
        <p className="text-xs text-[#7A7267] mb-2">🎯 Mock {moduleName} — Sonne AI</p>
        <p className="text-sm text-[#17140F] mb-1.5"><span className="text-[#2E7D5B] font-medium">✓</span> {report.top_strength}</p>
        <p className="text-sm text-[#17140F] mb-3"><span className="text-[#C77D2E] font-medium">→</span> {report.top_gap}</p>
        <p className="text-xs text-[#F5A524] font-mono truncate">{shareUrl}</p>
      </div>
      <div className="flex gap-2 flex-wrap">
        <a href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`}
          target="_blank" rel="noopener noreferrer"
          className="flex items-center gap-2 bg-[#0A66C2] text-white text-xs font-semibold px-4 py-2.5 rounded-lg hover:bg-[#004182] transition-colors"
          style={{ fontFamily:"'Space Grotesk',sans-serif" }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
            <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
          </svg>
          {lang==='fr' ? 'Partager sur LinkedIn' : 'Share on LinkedIn'}
        </a>
        <button onClick={copy}
          className="flex-1 bg-[#1E2A44] text-white text-xs font-semibold px-4 py-2.5 rounded-lg hover:bg-[#2d3f61] transition-colors"
          style={{ fontFamily:"'Space Grotesk',sans-serif" }}>
          {copied ? '✓ Copied!' : (lang==='fr' ? 'Copier le texte' : 'Copy caption')}
        </button>
        <a href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(`🎯 Mock ${moduleName} interview on Sonne AI\n✓ ${report.top_strength}\n${shareUrl}`)}`}
          target="_blank" rel="noopener noreferrer"
          className="px-4 py-2.5 border border-[#E7E2D8] text-xs text-[#7A7267] rounded-lg hover:text-[#17140F] transition-colors">𝕏</a>
      </div>
    </div>
  )
}

function TradeoffCard({ report, lang, isPro }: { report: Report; lang: string; isPro: boolean }) {
  const avg = report.tradeoff_avg ?? null
  const summary = report.tradeoff_summary ?? ''

  const band = avg == null ? null : avg >= 3.5 ? 'Strong' : avg >= 2.5 ? 'Developing' : avg >= 1.5 ? 'Gap' : 'Gap'
  const bandColor = band === 'Strong'
    ? { bg:'#ECFDF5', text:'#065F46', border:'#A7F3D0' }
    : band === 'Developing'
    ? { bg:'#FFFBEB', text:'#92400E', border:'#FDE68A' }
    : { bg:'#FEF2F2', text:'#991B1B', border:'#FECACA' }

  return (
    <div className="bg-white rounded-2xl border border-[#E7E2D8] shadow-sm p-5">
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-semibold text-[#7A7267] uppercase tracking-widest" style={{ fontFamily:"'JetBrains Mono',monospace" }}>
          {lang === 'fr' ? 'RAISONNEMENT PAR COMPROMIS' : 'TRADE-OFF REASONING'}
        </p>
        {avg != null && band && (
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
              style={{ background: bandColor.bg, color: bandColor.text, border: `1px solid ${bandColor.border}` }}>{band}</span>
            <span className="text-xs font-mono font-bold" style={{ color: bandColor.text }}>{avg.toFixed(1)}/4</span>
          </div>
        )}
      </div>

      <p className="text-xs text-[#7A7267] mb-4 leading-relaxed">
        {lang === 'fr'
          ? 'Évalue si vous expliquez POURQUOI vous avez choisi une approche plutôt qu\'une autre — pas seulement si votre réponse est techniquement correcte.'
          : 'Measures whether you explain WHY you chose one approach over alternatives — not just whether your answer is technically correct.'}
      </p>

      {isPro ? (
        <>
          {avg != null && (
            <div className="mb-4 space-y-1.5">
              <div className="h-1.5 rounded-full bg-[#E7E2D8] overflow-hidden">
                <div className="h-full rounded-full transition-all duration-700"
                  style={{ width:`${(avg/4)*100}%`, background: bandColor.text }} />
              </div>
            </div>
          )}
          {summary && <p className="text-sm text-[#374151] leading-relaxed mb-4">{summary}</p>}
          <div className="bg-[#F8F9FB] rounded-xl p-3.5 space-y-1.5">
            <p className="text-xs font-semibold text-[#374151]">
              {lang === 'fr' ? 'Comparaisons à maîtriser' : 'Trade-offs to master'}
            </p>
            {[
              'RAG vs fine-tuning — when does each win?',
              'FAISS flat vs HNSW — what changes at 10M+ vectors?',
              'LLM-as-judge vs human eval — cost, latency, bias trade-offs',
              'Agent loop vs direct call — when is orchestration overkill?',
              'Online vs offline eval — what each catches and misses',
            ].map(t => (
              <p key={t} className="text-xs text-[#6B7280] flex gap-2">
                <span className="text-[#C77D2E] flex-shrink-0">→</span>{t}
              </p>
            ))}
          </div>
        </>
      ) : (
        <div className="text-center border border-[#E7E2D8] rounded-xl p-4">
          <p className="text-xs text-[#7A7267] mb-3">
            {lang === 'fr' ? 'Score détaillé et feedback réservés aux membres Pro.' : 'Detailed score and feedback are Pro-only.'}
          </p>
          <a href="/pricing" className="inline-flex items-center gap-1.5 bg-[#F5A524] text-[#17140F] text-xs font-bold px-4 py-2 rounded-lg hover:bg-[#D98A0B] transition-all"
            style={{ fontFamily:"'Space Grotesk',sans-serif" }}>
            {lang === 'fr' ? 'Passer à Pro →' : 'Upgrade to Pro →'}
          </a>
        </div>
      )}
    </div>
  )
}

const SUGGESTED_QUESTIONS: Record<string, string[]> = {
  rag_system_design: [
    "How do you currently measure retrieval quality in production — do you use offline eval sets, online metrics, or both?",
    "What's your approach to handling embedding model upgrades when you have millions of already-indexed documents?",
    "When do you choose to add a reranking step versus investing in better chunking or a higher-quality embedding model?",
  ],
  agent_orchestration: [
    "How do you handle mid-loop failures in your production agents — do you retry at the tool call level or restart the whole plan?",
    "What does your memory architecture look like for long-running agents, and how do you decide what to persist versus summarize?",
    "Have you run into prompt injection through tool results in production, and how do you currently defend against it?",
  ],
  production_mlops: [
    "How do you detect output quality drift in production when you don't have real-time ground-truth labels?",
    "What's your current guardrails approach — rule-based filters, a separate LLM judge, or something else?",
    "How do you decide when observability overhead is worth adding to a latency-sensitive inference path?",
  ],
  evaluation_testing: [
    "What does your team use as the primary signal that an LLM change actually improved things — human eval, LLM-as-judge, or something else?",
    "How do you handle the coverage gap when your eval set can't realistically cover the long tail of user inputs?",
    "When a model upgrade passes your evals but causes regressions in production, what's your postmortem process?",
  ],
}

function SuggestedQuestions({ moduleSlug, lang }: { moduleSlug: string; lang: string }) {
  const questions = SUGGESTED_QUESTIONS[moduleSlug] ?? []
  const [copied, setCopied] = useState<number | null>(null)
  if (!questions.length) return null

  function copy(i: number, q: string) {
    navigator.clipboard.writeText(q)
    setCopied(i)
    setTimeout(() => setCopied(null), 2000)
  }

  return (
    <div className="bg-white rounded-2xl border border-[#E7E2D8] shadow-sm p-5">
      <p className="text-xs font-semibold text-[#7A7267] uppercase tracking-widest mb-1" style={{ fontFamily:"'JetBrains Mono',monospace" }}>
        {lang === 'fr' ? '💡 QUESTIONS À POSER À VOTRE INTERVIEWEUR' : '💡 QUESTIONS TO ASK YOUR INTERVIEWER'}
      </p>
      <p className="text-xs text-[#9CA3AF] mb-4">
        {lang === 'fr'
          ? 'Ces questions montrent que vous avez compris les enjeux — pas seulement les réponses.'
          : 'These signal depth — candidates who ask them leave a strong impression.'}
      </p>
      <div className="space-y-3">
        {questions.map((q, i) => (
          <div key={i} className="flex items-start gap-3 bg-[#FBFAF7] border border-[#E7E2D8] rounded-xl px-4 py-3">
            <p className="text-sm text-[#374151] leading-relaxed flex-1">"{q}"</p>
            <button
              onClick={() => copy(i, q)}
              className="flex-shrink-0 text-[10px] font-bold px-2.5 py-1.5 rounded-lg transition-all"
              style={{
                background: copied === i ? '#ECFDF5' : '#F3F0EB',
                color:      copied === i ? '#065F46' : '#7A7267',
                border:     `1px solid ${copied === i ? '#A7F3D0' : '#E7E2D8'}`,
                fontFamily: "'JetBrains Mono',monospace",
              }}>
              {copied === i ? '✓' : lang === 'fr' ? 'COPIER' : 'COPY'}
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}

function AskInterviewer({ sessionId, lang }: { sessionId: string; lang: string }) {
  const [q,       setQ]       = useState('')
  const [answer,  setAnswer]  = useState('')
  const [loading, setLoading] = useState(false)
  const [asked,   setAsked]   = useState(0)
  const MAX = 3

  async function ask() {
    if (!q.trim() || loading || asked >= MAX) return
    setLoading(true)
    const hdrs = await authHeader()
    const res  = await fetch('/api/interview/ask', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...hdrs },
      body: JSON.stringify({ sessionId, question: q }),
    })
    const d = await res.json()
    setAnswer(d.answer ?? d.error ?? ''); setAsked(a=>a+1); setQ(''); setLoading(false)
  }

  return (
    <div className="bg-white rounded-2xl border border-[#E7E2D8] shadow-sm p-5">
      <p className="text-xs font-semibold text-[#7A7267] uppercase tracking-widest mb-1" style={{ fontFamily:"'JetBrains Mono',monospace" }}>
        {lang==='fr' ? '💬 POSER UNE QUESTION À L\'INTERVIEWEUR' : '💬 ASK THE INTERVIEWER'}
      </p>
      <p className="text-xs text-[#7A7267] mb-4">
        {lang==='fr' ? `L'intervieweur se souvient de votre performance. Jusqu'à ${MAX} questions.` : `The interviewer remembers your session. Up to ${MAX} questions.`}
      </p>
      {answer && (
        <div className="bg-[#FBFAF7] border border-[#E7E2D8] rounded-xl p-4 mb-4">
          <p className="text-xs font-semibold text-[#7A7267] mb-1.5">{lang==='fr' ? 'Intervieweur :' : 'Interviewer:'}</p>
          <p className="text-sm text-[#17140F] leading-relaxed">{answer}</p>
        </div>
      )}
      {asked < MAX ? (
        <div className="flex gap-2">
          <input value={q} onChange={e=>setQ(e.target.value)} onKeyDown={e=>e.key==='Enter'&&ask()}
            placeholder={lang==='fr' ? 'Votre question...' : 'Your question...'}
            className="flex-1 text-sm bg-[#F8F9FB] border border-[#E7E2D8] rounded-lg px-3 py-2.5 text-[#17140F] placeholder:text-[#B8B2A8] focus:outline-none focus:ring-2 focus:ring-[#1E2A44]/10 focus:border-[#1E2A44] transition-all" />
          <button onClick={ask} disabled={!q.trim()||loading}
            className="bg-[#1E2A44] text-white text-sm font-medium px-4 py-2.5 rounded-lg hover:bg-[#2d3f61] disabled:opacity-40 transition-all"
            style={{ fontFamily:"'Space Grotesk',sans-serif" }}>
            {loading ? '...' : lang==='fr' ? 'Envoyer' : 'Ask'}
          </button>
        </div>
      ) : (
        <p className="text-xs text-[#9CA3AF] text-center">{lang==='fr'?`Limite de ${MAX} questions atteinte.`:`${MAX}-question limit reached.`}</p>
      )}
      <p className="text-xs text-[#9CA3AF] mt-2 text-right">{MAX-asked} {lang==='fr'?'restantes':'left'}</p>
    </div>
  )
}

function ShareQuestionPrompt({ lang, moduleName }: { lang: string; moduleName: string }) {
  const [text,       setText]       = useState('')
  const [round,      setRound]      = useState('technical')
  const [cluster,    setCluster]    = useState('ai_llm_engineer')
  const [visibility, setVisibility] = useState<'named'|'undisclosed'>('undisclosed')
  const [company,    setCompany]    = useState('')
  const [source,     setSource]     = useState('')
  const [difficulty, setDifficulty] = useState(0)
  const [submitting, setSubmitting] = useState(false)
  const [done,       setDone]       = useState(false)
  const [open,       setOpen]       = useState(false)
  const [err,        setErr]        = useState('')

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (text.trim().length < 20) { setErr(lang === 'fr' ? 'Au moins 20 caractères.' : 'At least 20 characters.'); return }
    if (visibility === 'named' && !company.trim()) { setErr('Company name is required when naming a company.'); return }
    if (visibility === 'named' && !source.trim()) { setErr('A source note is required when naming a company.'); return }
    setSubmitting(true); setErr('')
    const hdrs = await authHeader()
    const res = await fetch('/api/questions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...hdrs },
      body: JSON.stringify({
        question_text:      text,
        role_cluster:       cluster,
        role_title:         moduleName,
        interview_round:    round,
        difficulty_rating:  difficulty || null,
        company_visibility: visibility,
        company_name:       visibility === 'named' ? company : null,
        source_note:        visibility === 'named' ? source : null,
        outcome:            'prefer_not_to_say',
      }),
    })
    if (res.ok) { setDone(true) } else { const d = await res.json(); setErr(d.error ?? 'Failed.') }
    setSubmitting(false)
  }

  if (done) return (
    <div className="bg-[#ECFDF5] border border-[#A7F3D0] rounded-2xl px-5 py-4 text-sm text-[#065F46] flex items-center gap-3">
      <span className="text-lg">✓</span>
      <div>
        <p className="font-semibold">{lang === 'fr' ? 'Merci pour votre contribution !' : 'Report submitted — thank you.'}</p>
        <p className="text-xs text-[#047857] mt-0.5">{lang === 'fr' ? 'Votre question sera publiée après vérification, sous 24–48h.' : 'Your question will appear in the database once reviewed — usually within 24–48h.'}</p>
      </div>
    </div>
  )

  return (
    <div className="bg-white rounded-2xl border border-[#E7E2D8] shadow-sm overflow-hidden">
      <button onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-[#FAFAF8] transition-colors">
        <div>
          <p className="text-sm font-semibold text-[#374151]">
            {lang === 'fr' ? 'Ajouter une question au répertoire AI' : 'Add a question to the AI role interview database'}
          </p>
          <p className="text-xs text-[#9CA3AF] mt-0.5">
            {lang === 'fr' ? 'Aidez d\'autres ingénieurs en partageant ce que vous avez rencontré' : 'Help other engineers see what real AI-role interviews look like'}
          </p>
        </div>
        <span className="text-[#C77D2E] text-xs font-bold flex-shrink-0 ml-4"
          style={{ display:'inline-block', transform: open ? 'rotate(180deg)' : 'rotate(0)', transition:'transform .2s' }}>↓</span>
      </button>

      {open && (
        <div className="px-5 pb-5 border-t border-[#F3F0EB]">
          <form onSubmit={submit} className="space-y-3 pt-4">
            <textarea value={text} onChange={e => setText(e.target.value)} rows={3} required
              placeholder={lang === 'fr' ? 'Décrivez la question — paraphrase acceptée…' : 'Describe the question — paraphrasing is fine…'}
              className="w-full text-sm border border-[#E7E2D8] rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#F5A524]/25 focus:border-[#F5A524] resize-none" />
            <div className="grid grid-cols-2 gap-3">
              <select value={cluster} onChange={e => setCluster(e.target.value)}
                className="text-sm border border-[#E7E2D8] rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#F5A524]/20 focus:border-[#F5A524]">
                <option value="ai_llm_engineer">AI / LLM Engineer</option>
                <option value="applied_ai_mlops">Applied AI / MLOps</option>
                <option value="ai_automation_engineer">AI Automation</option>
                <option value="fde">Forward Deployed</option>
              </select>
              <select value={round} onChange={e => setRound(e.target.value)}
                className="text-sm border border-[#E7E2D8] rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#F5A524]/20 focus:border-[#F5A524]">
                <option value="screen">Screen</option>
                <option value="technical">Technical</option>
                <option value="system_design">System Design</option>
                <option value="behavioral">Behavioral</option>
                <option value="final">Final / Onsite</option>
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <button type="button" onClick={() => setVisibility('undisclosed')}
                className="p-2.5 rounded-lg border-2 text-xs text-left transition-all"
                style={{ borderColor: visibility === 'undisclosed' ? '#F5A524' : '#E7E2D8', background: visibility === 'undisclosed' ? '#FFF8EE' : 'white' }}>
                <span className="font-semibold block">{lang === 'fr' ? 'Entreprise non divulguée' : 'Company undisclosed'}</span>
                <span className="text-[#9CA3AF]">{lang === 'fr' ? 'Rester privé' : 'Stay private'}</span>
              </button>
              <button type="button" onClick={() => setVisibility('named')}
                className="p-2.5 rounded-lg border-2 text-xs text-left transition-all"
                style={{ borderColor: visibility === 'named' ? '#F5A524' : '#E7E2D8', background: visibility === 'named' ? '#FFF8EE' : 'white' }}>
                <span className="font-semibold block">{lang === 'fr' ? 'Nommer l\'entreprise' : 'Name the company'}</span>
                <span className="text-[#9CA3AF]">{lang === 'fr' ? 'Source requise' : 'Requires a source'}</span>
              </button>
            </div>
            {visibility === 'named' && (
              <div className="space-y-2">
                <input value={company} onChange={e => setCompany(e.target.value)}
                  placeholder={lang === 'fr' ? 'Nom de l\'entreprise *' : 'Company name *'}
                  className="w-full text-sm border border-[#E7E2D8] rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#F5A524]/20 focus:border-[#F5A524]" />
                <input value={source} onChange={e => setSource(e.target.value)}
                  placeholder={lang === 'fr' ? 'Source : forum, blog, appel recruteur… *' : 'Source: public forum, blog, recruiter call… *'}
                  className="w-full text-sm border border-[#E7E2D8] rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#F5A524]/20 focus:border-[#F5A524]" />
              </div>
            )}
            {err && <p className="text-xs text-[#DC2626]">{err}</p>}
            <button type="submit" disabled={submitting || text.trim().length < 20}
              className="w-full text-sm font-bold py-2.5 rounded-xl disabled:opacity-40 transition-all"
              style={{ background: '#F5A524', color: '#17140F' }}>
              {submitting ? '…' : (lang === 'fr' ? 'Ajouter au répertoire →' : 'Add to the database →')}
            </button>
          </form>
        </div>
      )}
    </div>
  )
}

function ReportInner() {
  const params    = useSearchParams()
  const router    = useRouter()
  const sessionId = params.get('id')
  const lang_     = params.get('lang') ?? 'en'

  const [report,    setReport]    = useState<Report | null>(null)
  const [session,   setSession]   = useState<Session | null>(null)
  const [loading,   setLoading]   = useState(true)
  const [error,     setError]     = useState('')
  const [deleting,  setDeleting]  = useState(false)
  const [isPro,     setIsPro]     = useState(false)
  const [userEmail, setUserEmail] = useState('')

  useEffect(() => {
    if (!sessionId) { router.push('/app/start'); return }
    Promise.all([
      authHeader().then(hdrs => fetch(`/api/interview/report?id=${sessionId}`, { headers: hdrs }).then(r=>r.json())),
      createClient().auth.getUser().then(async ({ data: { user } }) => {
        if (!user) return { pro: false, email: '' }
        setUserEmail(user.email ?? '')
        const { data: p } = await createClient().from('profiles').select('plan').eq('id', user.id).single()
        return { pro: p?.plan === 'pro', email: user.email ?? '' }
      }),
    ]).then(([d, { pro }]) => {
      if (d.report) { setReport(d.report); setSession(d.session) } else setError(d.error ?? 'Failed to load.')
      setIsPro(pro as boolean)
      setLoading(false)
    }).catch(() => { setError('Network error.'); setLoading(false) })
  }, [sessionId])

  async function deleteSession() {
    if (!confirm(lang_==='fr'?'Supprimer cette session ?':'Delete this session?')) return
    setDeleting(true)
    const hdrs = await authHeader()
    const res = await fetch(`/api/interview/delete?id=${sessionId}`, { method:'DELETE', headers: hdrs })
    if (res.ok) router.push('/app/history')
    else { setError('Failed to delete.'); setDeleting(false) }
  }

  if (loading) return (
    <AppLayout>
      <div className="flex items-center justify-center h-full min-h-[60vh]">
        <div style={{ width:24,height:24,border:'2.5px solid #C7D0E0',borderTopColor:'#1E2A44',borderRadius:'50%',animation:'spin 1s linear infinite' }} />
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    </AppLayout>
  )

  if (error || !report || !session) return (
    <AppLayout>
      <div className="flex items-center justify-center min-h-[60vh] px-4">
        <div className="text-center">
          <p className="text-[#B24C3F] text-sm mb-4">{error||'Report not found.'}</p>
          <Link href="/app/history" className="text-sm text-[#1E2A44] hover:underline">← Back to history</Link>
        </div>
      </div>
    </AppLayout>
  )

  const lang       = session.language as 'en'|'fr'
  const moduleName = lang==='fr' ? session.skill_modules?.name_fr : session.skill_modules?.name_en
  const headline   = lang==='fr' ? report.headline_fr : report.headline_en
  const summary    = lang==='fr' ? report.full_summary_fr : report.full_summary_en
  const scores     = report.sub_skill_scores ?? {}
  const overall    = report.overall_score

  return (
    <AppLayout>
      <div className="max-w-3xl mx-auto px-6 py-8 space-y-5">

        {/* Header */}
        <div className="bg-white rounded-2xl border border-[#E7E2D8] shadow-sm p-6">
          <p className="text-xs font-semibold text-[#7A7267] uppercase tracking-widest mb-1" style={{ fontFamily:"'JetBrains Mono',monospace" }}>
            {lang==='fr'?'MODULE ÉVALUÉ':'MODULE EVALUATED'}
          </p>
          <h1 className="text-xl font-bold text-[#17140F] mb-4" style={{ fontFamily:"'Space Grotesk',sans-serif" }}>{moduleName}</h1>
          {overall!=null && (
            <div className="flex items-center gap-4">
              <div>
                <span className="text-4xl font-bold" style={{ fontFamily:"'JetBrains Mono',monospace", color: overall>=3?'#2E7D5B':overall>=2?'#C77D2E':'#B24C3F' }}>
                  {overall.toFixed(1)}
                </span>
                <span className="text-sm text-[#7A7267] ml-1">/4</span>
              </div>
              <div className="flex-1 h-2 rounded-full bg-[#E7E2D8] overflow-hidden">
                <div className="h-full rounded-full" style={{ width:`${(overall/4)*100}%`, background: overall>=3?'#2E7D5B':overall>=2?'#C77D2E':'#B24C3F', transition:'width .7s' }} />
              </div>
            </div>
          )}
        </div>

        {/* Summary */}
        <div className="bg-white rounded-2xl border border-[#E7E2D8] shadow-sm p-5">
          <p className="text-xs font-semibold text-[#7A7267] uppercase tracking-widest mb-3" style={{ fontFamily:"'JetBrains Mono',monospace" }}>
            {lang==='fr'?'RÉSUMÉ':'SUMMARY'}
          </p>
          {headline && <p className="text-sm text-[#374151] leading-relaxed mb-4">{headline}</p>}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="bg-[#F0FDF4] border border-[#BBF7D0] rounded-xl p-3.5">
              <p className="text-xs font-semibold text-[#2E7D5B] mb-1.5">✓ {lang==='fr'?'Point fort':'Top strength'}</p>
              <p className="text-sm text-[#17140F] leading-relaxed">{report.top_strength}</p>
            </div>
            <div className="bg-[#FFFBEB] border border-[#FDE68A] rounded-xl p-3.5">
              <p className="text-xs font-semibold text-[#C77D2E] mb-1.5">→ {lang==='fr'?'Point à améliorer':'Top gap'}</p>
              <p className="text-sm text-[#17140F] leading-relaxed">{report.top_gap}</p>
            </div>
          </div>
        </div>

        {/* Sub-skills — gated */}
        {isPro ? (
          <div className="bg-white rounded-2xl border border-[#E7E2D8] shadow-sm p-5">
            <p className="text-xs font-semibold text-[#7A7267] uppercase tracking-widest mb-5" style={{ fontFamily:"'JetBrains Mono',monospace" }}>
              {lang==='fr'?'SCORES PAR SOUS-COMPÉTENCE':'SUB-SKILL SCORES'}
            </p>
            <div className="space-y-5">
              {Object.entries(scores).map(([slug, data]) => (
                <div key={slug}>
                  <ScoreMeter score={data.score} label={slug} />
                  {data.summary  && <p className="text-xs text-[#7A7267] mt-1.5 leading-relaxed">{data.summary}</p>}
                  {data.evidence && <p className="text-xs text-[#B8B2A8] italic mt-1">"{data.evidence.slice(0,140)}{data.evidence.length>140?'…':''}"</p>}
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border-2 border-[#F5A524]/30 shadow-sm p-5">
            <p className="text-xs font-semibold text-[#7A7267] uppercase tracking-widest mb-4" style={{ fontFamily:"'JetBrains Mono',monospace" }}>
              {lang==='fr'?'SCORES PAR SOUS-COMPÉTENCE':'SUB-SKILL SCORES'}
            </p>
            <div className="space-y-4 mb-5" style={{ filter:'blur(4px)', userSelect:'none', pointerEvents:'none' }}>
              {['Sub-skill 1','Sub-skill 2','Sub-skill 3','Sub-skill 4'].map(l => (
                <div key={l} className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-[#374151]">{l}</span>
                    <span className="text-xs font-mono text-[#9CA3AF]">?/4</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-[#E7E2D8]"><div className="h-full rounded-full bg-[#C7D0E0]" style={{ width:'55%' }} /></div>
                </div>
              ))}
            </div>
            <div className="text-center border-t border-[#E7E2D8] pt-4">
              <p className="text-xs text-[#7A7267] mb-3">
                {lang==='fr'
                  ? 'Scores détaillés, preuves et plan d\'amélioration réservés aux membres Pro.'
                  : 'Per-sub-skill scores, evidence quotes, and improvement plan are Pro-only.'}
              </p>
              <Link href="/pricing" className="inline-flex items-center gap-1.5 bg-[#F5A524] text-[#17140F] text-sm font-bold px-5 py-2.5 rounded-xl hover:bg-[#D98A0B] transition-all shadow-sm"
                style={{ fontFamily:"'Space Grotesk',sans-serif" }}>
                {lang==='fr'?'Passer à Pro →':'Upgrade to Pro →'}
              </Link>
            </div>
          </div>
        )}

        {/* Trade-off Reasoning */}
        <TradeoffCard report={report} lang={lang} isPro={isPro} />

        {/* Improvement plan */}
        {isPro && summary && (
          <div className="bg-white rounded-2xl border border-[#E7E2D8] shadow-sm p-5">
            <p className="text-xs font-semibold text-[#7A7267] uppercase tracking-widest mb-3" style={{ fontFamily:"'JetBrains Mono',monospace" }}>
              {lang==='fr'?"PLAN D'AMÉLIORATION":'IMPROVEMENT PLAN'}
            </p>
            <p className="text-sm text-[#374151] leading-relaxed whitespace-pre-line">{summary}</p>
          </div>
        )}

        {/* Suggested questions to ask */}
        <SuggestedQuestions moduleSlug={session.skill_modules?.slug ?? ''} lang={lang} />

        {/* Ask the Interviewer */}
        <AskInterviewer sessionId={sessionId!} lang={lang} />

        {/* Share */}
        {report.share_token && <ShareCard report={report} lang={lang} moduleName={moduleName??'AI Interview'} />}

        {/* Actions */}
        <div className="flex gap-3 flex-wrap">
          <Link href="/app/start" className="flex-1 min-w-[140px] text-center bg-[#1E2A44] text-white text-sm font-semibold px-4 py-3 rounded-xl hover:bg-[#2d3f61] transition-colors shadow-sm"
            style={{ fontFamily:"'Space Grotesk',sans-serif" }}>
            {lang==='fr'?'Pratiquer à nouveau →':'Practice again →'}
          </Link>
          <Link href="/app/history" className="px-4 py-3 border border-[#E7E2D8] text-sm text-[#7A7267] rounded-xl hover:bg-white transition-colors text-center">
            {lang==='fr'?'Historique':'History'}
          </Link>
          <button onClick={deleteSession} disabled={deleting}
            className="px-4 py-3 border border-[#FECACA]/60 text-xs text-[#B24C3F] rounded-xl hover:bg-[#FEF2F2] transition-colors disabled:opacity-50">
            {deleting?'…':(lang==='fr'?'Supprimer':'Delete')}
          </button>
        </div>

        {/* Community share nudge */}
        <ShareQuestionPrompt lang={lang} moduleName={moduleName ?? 'AI Interview'} />

        <p className="text-xs text-[#B8B2A8] text-center">
          {lang==='fr'?'La suppression efface la transcription et le diagnostic. Irréversible.':'Deleting removes the transcript and diagnostic permanently.'}
        </p>
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </AppLayout>
  )
}

export default function ReportPage() {
  return <Suspense fallback={null}><ReportInner /></Suspense>
}
