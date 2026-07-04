'use client'
import { useEffect, useState, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { BAND_COLORS, scoreToBand } from '@/lib/signals'

async function authHeader(): Promise<Record<string, string>> {
  const { data: { session } } = await createClient().auth.getSession()
  if (session?.access_token) return { Authorization: `Bearer ${session.access_token}` }
  return {}
}

interface SubSkillScore { score: number; summary: string; evidence: string }
interface Report {
  top_strength: string; top_gap: string
  headline_en: string;  headline_fr: string
  sub_skill_scores: Record<string, SubSkillScore>
  improvement_plan: string
  full_summary_en: string; full_summary_fr: string
  share_token: string
  overall_score?: number
}
interface Session { language: string; skill_modules: { name_en: string; name_fr: string } }

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
  const shareUrl  = typeof window !== 'undefined' ? `${window.location.origin}/share/${report.share_token}` : ''
  const shareText = `🎯 Just did a mock ${moduleName} interview on Sonne AI.\n\n✓ Strength: ${report.top_strength}\n→ Gap: ${report.top_gap}\n\nPractice yours: ${shareUrl}`
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
        <p className="text-xs text-[#7A7267] font-mono truncate">{shareUrl}</p>
      </div>
      <div className="flex gap-2">
        <button onClick={copy} className="flex-1 bg-[#1E2A44] text-white text-xs font-semibold px-4 py-2.5 rounded-lg hover:bg-[#2d3f61] transition-colors"
          style={{ fontFamily:"'Space Grotesk',sans-serif" }}>
          {copied ? '✓ Copied!' : (lang==='fr' ? 'Copier pour LinkedIn' : 'Copy for LinkedIn')}
        </button>
        <a href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}`} target="_blank" rel="noopener noreferrer"
          className="px-4 py-2.5 border border-[#E7E2D8] text-xs text-[#7A7267] rounded-lg hover:text-[#17140F] transition-colors">𝕏</a>
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

function ReportInner() {
  const params    = useSearchParams()
  const router    = useRouter()
  const sessionId = params.get('id')
  const lang_     = params.get('lang') ?? 'en'

  const [report,   setReport]   = useState<Report | null>(null)
  const [session,  setSession]  = useState<Session | null>(null)
  const [loading,  setLoading]  = useState(true)
  const [error,    setError]    = useState('')
  const [deleting, setDeleting] = useState(false)
  const [isPro,    setIsPro]    = useState(false)

  useEffect(() => {
    if (!sessionId) { router.push('/app/start'); return }
    Promise.all([
      authHeader().then(hdrs => fetch(`/api/interview/report?id=${sessionId}`, { headers: hdrs }).then(r=>r.json())),
      createClient().auth.getUser().then(async ({ data: { user } }) => {
        if (!user) return false
        const { data: p } = await createClient().from('profiles').select('plan').eq('id', user.id).single()
        return p?.plan === 'pro'
      }),
    ]).then(([d, pro]) => {
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
    <div className="min-h-screen flex items-center justify-center" style={{ background:'#FBFAF7' }}>
      <div style={{ width:24,height:24,border:'2.5px solid #C7D0E0',borderTopColor:'#1E2A44',borderRadius:'50%',animation:'spin 1s linear infinite' }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )

  if (error || !report || !session) return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background:'#FBFAF7' }}>
      <div className="text-center">
        <p className="text-[#B24C3F] text-sm mb-4">{error||'Report not found.'}</p>
        <Link href="/app/history" className="text-sm text-[#1E2A44] hover:underline">← Back to history</Link>
      </div>
    </div>
  )

  const lang       = session.language as 'en'|'fr'
  const moduleName = lang==='fr' ? session.skill_modules?.name_fr : session.skill_modules?.name_en
  const headline   = lang==='fr' ? report.headline_fr : report.headline_en
  const summary    = lang==='fr' ? report.full_summary_fr : report.full_summary_en
  const scores     = report.sub_skill_scores ?? {}
  const overall    = report.overall_score

  return (
    <div className="min-h-screen" style={{ background:'#FBFAF7', fontFamily:"'Inter',system-ui,sans-serif" }}>
      <nav className="border-b border-[#E7E2D8] sticky top-0 z-20" style={{ background:'rgba(251,250,247,.9)', backdropFilter:'blur(12px)' }}>
        <div className="max-w-3xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/app/start" className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-[#1E2A44] flex items-center justify-center"><SunMark /></div>
              <span className="font-bold text-[#17140F] text-sm hidden sm:block" style={{ fontFamily:"'Space Grotesk',sans-serif" }}>Sonne AI</span>
            </Link>
            <span className="text-[#E7E2D8]">·</span>
            <span className="text-sm text-[#7A7267]">{lang==='fr'?'Rapport de diagnostic':'Diagnostic Report'}</span>
          </div>
          <Link href="/app/start" className="text-xs font-medium bg-[#1E2A44] text-white px-3 py-1.5 rounded-lg hover:bg-[#2d3f61] transition-colors shadow-sm"
            style={{ fontFamily:"'Space Grotesk',sans-serif" }}>
            {lang==='fr'?'Nouvel entretien →':'New interview →'}
          </Link>
        </div>
      </nav>

      <div className="max-w-3xl mx-auto px-4 py-8 space-y-5">

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

        {/* Improvement plan */}
        {isPro && summary && (
          <div className="bg-white rounded-2xl border border-[#E7E2D8] shadow-sm p-5">
            <p className="text-xs font-semibold text-[#7A7267] uppercase tracking-widest mb-3" style={{ fontFamily:"'JetBrains Mono',monospace" }}>
              {lang==='fr'?"PLAN D'AMÉLIORATION":'IMPROVEMENT PLAN'}
            </p>
            <p className="text-sm text-[#374151] leading-relaxed whitespace-pre-line">{summary}</p>
          </div>
        )}

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

        <p className="text-xs text-[#B8B2A8] text-center">
          {lang==='fr'?'La suppression efface la transcription et le diagnostic. Irréversible.':'Deleting removes the transcript and diagnostic permanently.'}
        </p>
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}

export default function ReportPage() {
  return <Suspense fallback={null}><ReportInner /></Suspense>
}

function SunMark() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <circle cx="7" cy="7" r="3" fill="#F5A524"/>
      {[0,45,90,135,180,225,270,315].map((deg,i)=>{
        const r=Math.PI*deg/180
        return <line key={i} x1={7+4*Math.cos(r)} y1={7+4*Math.sin(r)} x2={7+5.5*Math.cos(r)} y2={7+5.5*Math.sin(r)} stroke="#F5A524" strokeWidth="1.2" strokeLinecap="round"/>
      })}
    </svg>
  )
}
