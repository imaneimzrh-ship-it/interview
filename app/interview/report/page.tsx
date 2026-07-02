'use client'
import { useEffect, useState, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

async function authHeader(): Promise<Record<string, string>> {
  const { data: { session } } = await createClient().auth.getSession()
  if (session?.access_token) return { 'Authorization': `Bearer ${session.access_token}` }
  return {}
}

interface Report {
  top_strength: string; top_gap: string
  headline_en: string;  headline_fr: string
  sub_skill_scores: Record<string, { score: number; summary: string; evidence: string }>
  improvement_plan: string
  full_summary_en: string; full_summary_fr: string
  share_token: string
}

interface Session { language: string; skill_modules: { name_en: string; name_fr: string } }

const SCORE_LABELS = ['','Weak','Fair','Good','Strong']
const SCORE_COLORS = ['','#E84040','#E8A020','#4776F7','#1DB954']

function ScoreBar({ score, label }: { score: number; label: string }) {
  const color = SCORE_COLORS[score] ?? '#7A829A'
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs text-[#7A829A] w-36 flex-shrink-0">{label}</span>
      <div className="flex gap-1 flex-1">
        {[1,2,3,4].map(i => (
          <div key={i} className="h-2 flex-1 rounded-sm transition-all duration-500"
            style={{ background: i <= score ? color : '#1C1D28' }} />
        ))}
      </div>
      <span className="text-xs font-medium w-12 flex-shrink-0" style={{ color }}>
        {SCORE_LABELS[score] ?? '—'}
      </span>
    </div>
  )
}

function ShareCard({ report, lang, moduleName }: { report: Report; lang: string; moduleName: string }) {
  const [copied, setCopied] = useState(false)
  const shareUrl = `${window.location.origin}/share/${report.share_token}`
  const shareText = `🎯 Just did a mock ${moduleName} interview on Sonne AI.\n\nTop strength: ${report.top_strength}\nTop gap: ${report.top_gap}\n\nPractice yours: ${shareUrl}`

  function copy() {
    navigator.clipboard.writeText(shareText)
    setCopied(true)
    setTimeout(() => setCopied(false), 2500)
  }

  return (
    <div className="bg-[#111218] border border-[rgba(71,118,247,0.3)] rounded-xl p-5">
      <p className="text-xs text-[#7A829A] uppercase tracking-widest mb-3">
        {lang === 'fr' ? '★ Carte partageable' : '★ Shareable result'}
      </p>
      <div className="bg-[#09090C] border border-[#1C1D28] rounded-lg p-4 mb-4">
        <p className="text-xs text-[#7A829A] mb-2">🎯 Mock {moduleName} interview — Sonne AI</p>
        <p className="text-sm text-[#F0F2FA] mb-1.5">
          <span className="text-[#1DB954]">✓ Strength:</span> {report.top_strength}
        </p>
        <p className="text-sm text-[#F0F2FA] mb-3">
          <span className="text-[#E8A020]">→ Gap:</span> {report.top_gap}
        </p>
        <p className="text-xs text-[#7A829A]">{shareUrl}</p>
      </div>
      <div className="flex gap-2">
        <button onClick={copy} className="flex-1 bg-[#4776F7] text-white text-xs font-medium px-4 py-2.5 rounded-lg hover:opacity-90 transition-opacity">
          {copied ? '✓ Copied!' : (lang === 'fr' ? 'Copier pour LinkedIn' : 'Copy for LinkedIn')}
        </button>
        <a href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}`} target="_blank" rel="noopener noreferrer"
          className="px-4 py-2.5 border border-[#1C1D28] text-xs text-[#7A829A] rounded-lg hover:text-[#F0F2FA] transition-colors">
          𝕏
        </a>
      </div>
    </div>
  )
}

function ReportInner() {
  const params   = useSearchParams()
  const router   = useRouter()
  const sessionId = params.get('id')
  const lang_    = params.get('lang') ?? 'en'

  const [report,  setReport]  = useState<Report | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState('')
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    if (!sessionId) { router.push('/interview'); return }
    authHeader().then(hdrs =>
      fetch(`/api/interview/report?id=${sessionId}`, { headers: hdrs })
        .then(r => r.json())
        .then(d => { if (d.report) { setReport(d.report); setSession(d.session) } else setError(d.error ?? 'Failed to load.') })
        .catch(() => setError('Network error.'))
        .finally(() => setLoading(false))
    )
  }, [sessionId])

  async function deleteSession() {
    if (!confirm(lang_ === 'fr' ? 'Supprimer cette session et toutes les données associées ?' : 'Delete this session and all associated data?')) return
    setDeleting(true)
    const hdrs = await authHeader()
    const res = await fetch(`/api/interview/delete?id=${sessionId}`, { method: 'DELETE', headers: hdrs })
    if (res.ok) router.push('/interview/history')
    else { setError('Failed to delete.'); setDeleting(false) }
  }

  if (loading) return (
    <div className="min-h-screen bg-[#09090C] flex items-center justify-center" style={{ fontFamily: 'Inter, sans-serif' }}>
      <div className="w-6 h-6 border-2 border-[#4776F7]/30 border-t-[#4776F7] rounded-full animate-spin" />
    </div>
  )

  if (error || !report || !session) return (
    <div className="min-h-screen bg-[#09090C] flex items-center justify-center px-4" style={{ fontFamily: 'Inter, sans-serif' }}>
      <div className="text-center max-w-sm">
        <p className="text-[#E84040] mb-4">{error || 'Report not found.'}</p>
        <Link href="/interview/history" className="text-sm text-[#4776F7] hover:underline">View session history →</Link>
      </div>
    </div>
  )

  const lang      = session.language as 'en' | 'fr'
  const moduleName = lang === 'fr' ? session.skill_modules?.name_fr : session.skill_modules?.name_en
  const headline  = lang === 'fr' ? report.headline_fr : report.headline_en
  const summary   = lang === 'fr' ? report.full_summary_fr : report.full_summary_en
  const scores    = report.sub_skill_scores ?? {}
  const isPro     = !!summary  // free tier gets headline only

  return (
    <div className="min-h-screen bg-[#09090C]" style={{ fontFamily: 'Inter, sans-serif' }}>
      {/* Header */}
      <div className="border-b border-[#1C1D28] bg-[#111218] px-4 py-3">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Link href="/" className="w-6 h-6 rounded-md bg-[#4776F7] flex items-center justify-center text-white text-xs font-bold">S</Link>
            <span className="font-semibold text-sm text-[#F0F2FA]">
              {lang === 'fr' ? 'Rapport de diagnostic' : 'Diagnostic Report'}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/interview" className="text-xs text-[#7A829A] hover:text-[#F0F2FA] transition-colors">
              {lang === 'fr' ? 'Nouvel entretien' : 'New interview'}
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-8 space-y-5">
        {/* Module label */}
        <div>
          <p className="text-xs text-[#7A829A] uppercase tracking-widest mb-1">
            {lang === 'fr' ? 'Module évalué' : 'Module evaluated'}
          </p>
          <h1 className="text-xl font-semibold text-[#F0F2FA]">{moduleName}</h1>
        </div>

        {/* Headline */}
        <div className="bg-[#111218] border border-[#1C1D28] rounded-xl p-5">
          <p className="text-xs text-[#7A829A] uppercase tracking-widest mb-2">
            {lang === 'fr' ? 'Résumé' : 'Summary'}
          </p>
          <p className="text-sm text-[#F0F2FA] leading-relaxed">{headline}</p>
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="bg-[rgba(29,185,84,0.08)] border border-[rgba(29,185,84,0.2)] rounded-lg p-3">
              <p className="text-xs text-[#1DB954] font-medium mb-1">
                {lang === 'fr' ? '✓ Point fort' : '✓ Top strength'}
              </p>
              <p className="text-xs text-[#F0F2FA] leading-relaxed">{report.top_strength}</p>
            </div>
            <div className="bg-[rgba(232,160,32,0.08)] border border-[rgba(232,160,32,0.2)] rounded-lg p-3">
              <p className="text-xs text-[#E8A020] font-medium mb-1">
                {lang === 'fr' ? '→ Point à améliorer' : '→ Top gap'}
              </p>
              <p className="text-xs text-[#F0F2FA] leading-relaxed">{report.top_gap}</p>
            </div>
          </div>
        </div>

        {/* Sub-skill breakdown */}
        {isPro ? (
          <div className="bg-[#111218] border border-[#1C1D28] rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <p className="text-xs text-[#7A829A] uppercase tracking-widest">
                {lang === 'fr' ? 'Scores par sous-compétence' : 'Sub-skill scores'}
              </p>
            </div>
            <div className="space-y-3">
              {Object.entries(scores).map(([slug, data]) => (
                <div key={slug}>
                  <ScoreBar score={data.score} label={slug.replace(/_/g,' ')} />
                  <p className="text-xs text-[#7A829A] mt-1 ml-[9.5rem] leading-relaxed">{data.summary}</p>
                  {data.evidence && (
                    <div className="ml-[9.5rem] mt-1">
                      <p className="text-xs text-[#3D4260] italic">"{data.evidence.slice(0, 120)}{data.evidence.length > 120 ? '…' : ''}"</p>
                      <button onClick={() => fetch('/api/interview/flag', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sessionId, targetType: 'diagnosis', targetId: slug, note: '' }) })}
                        className="text-xs text-[#3D4260] hover:text-[#E8A020] transition-colors mt-0.5">
                        ⚑ {lang === 'fr' ? 'Signaler ce diagnostic' : 'Flag this diagnosis'}
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="bg-[#111218] border border-[rgba(232,160,32,0.3)] rounded-xl p-5">
            <p className="text-xs text-[#E8A020] font-medium mb-2">
              {lang === 'fr' ? '★ Rapport complet — Pro uniquement' : '★ Full sub-skill breakdown — Pro only'}
            </p>
            <p className="text-xs text-[#7A829A] mb-4 leading-relaxed">
              {lang === 'fr'
                ? 'Votre rapport complet montre votre score sur chaque sous-compétence (découpage, qualité de récupération, reclassement, fraîcheur), avec des preuves de vos réponses et un plan d\'amélioration personnalisé.'
                : 'Your full report shows your score on each sub-skill (chunking, retrieval quality, reranking, freshness), with evidence quotes from your answers and a personalised improvement plan.'}
            </p>
            <Link href="/pricing" className="inline-flex items-center bg-[#E8A020] text-black text-xs font-semibold px-4 py-2.5 rounded-lg hover:opacity-90 transition-opacity">
              {lang === 'fr' ? 'Passer à Pro →' : 'Upgrade to Pro →'}
            </Link>
          </div>
        )}

        {/* Improvement plan (Pro) */}
        {isPro && report.improvement_plan && (
          <div className="bg-[#111218] border border-[#1C1D28] rounded-xl p-5">
            <p className="text-xs text-[#7A829A] uppercase tracking-widest mb-3">
              {lang === 'fr' ? 'Plan d\'amélioration' : 'Improvement plan'}
            </p>
            <p className="text-sm text-[#F0F2FA] leading-relaxed whitespace-pre-line">{report.improvement_plan}</p>
          </div>
        )}

        {/* Shareable card */}
        {report.share_token && (
          <ShareCard report={report} lang={lang} moduleName={moduleName ?? 'AI Interview'} />
        )}

        {/* Actions */}
        <div className="flex gap-3 flex-wrap">
          <Link href="/interview" className="flex-1 bg-[#4776F7] text-white text-sm font-medium px-4 py-3 rounded-lg hover:opacity-90 transition-opacity text-center min-w-[140px]">
            {lang === 'fr' ? 'Pratiquer à nouveau →' : 'Practice again →'}
          </Link>
          <Link href="/interview/history" className="px-4 py-3 border border-[#1C1D28] text-sm text-[#7A829A] rounded-lg hover:text-[#F0F2FA] transition-colors text-center">
            {lang === 'fr' ? 'Historique' : 'History'}
          </Link>
          <button onClick={deleteSession} disabled={deleting}
            className="px-4 py-3 border border-[rgba(232,64,64,0.3)] text-xs text-[#E84040] rounded-lg hover:bg-[rgba(232,64,64,0.08)] transition-colors disabled:opacity-50">
            {deleting ? '…' : (lang === 'fr' ? 'Supprimer cette session' : 'Delete this session')}
          </button>
        </div>

        <p className="text-xs text-[#3D4260] text-center">
          {lang === 'fr'
            ? 'La suppression efface la transcription et les données de diagnostic. Cette action est irréversible.'
            : 'Deleting removes the transcript and diagnostic data permanently.'}
        </p>
      </div>
    </div>
  )
}

export default function ReportPage() {
  return <Suspense fallback={null}><ReportInner /></Suspense>
}
