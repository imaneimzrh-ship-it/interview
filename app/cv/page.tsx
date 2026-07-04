'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { BAND_COLORS, type Band } from '@/lib/signals'

const SIGNAL_LABELS: Record<string, { en: string; fr: string; icon: string }> = {
  production: { en: 'Production Evidence', fr: 'Expérience en production',   icon: '🚀' },
  rag:        { en: 'RAG Depth',           fr: 'Profondeur RAG',              icon: '🔍' },
  agentic:    { en: 'Agentic Experience',  fr: 'Expérience agentique',        icon: '🕵️' },
  eval:       { en: 'Evaluation Literacy', fr: "Maîtrise de l'évaluation",    icon: '🧪' },
  cost:       { en: 'Cost & Safety',       fr: 'Coût et sécurité',            icon: '⚙️' },
}

const MODULE_SLUGS: Record<string, string> = {
  'RAG System Design':          'rag_system_design',
  'Agentic Systems':            'agentic_systems',
  'Evaluation & Observability': 'evaluation_observability',
  'Cost, Latency & Safety':     'cost_latency_safety',
}

interface CvResult {
  overall: number
  signals: { key: string; score: number; band: Band; evidence: string }[]
  strengths: string[]
  gap: string
  flags: string[]
  recommendModule: string
  recommendWhy: string
}

export default function CvPage() {
  const [lang,     setLang]    = useState<'en'|'fr'>('en')
  const [cv,       setCv]      = useState('')
  const [loading,  setLoading] = useState(false)
  const [result,   setResult]  = useState<CvResult | null>(null)
  const [error,    setError]   = useState('')
  const [loggedIn, setLoggedIn] = useState(false)
  const [saved,    setSaved]    = useState(false)
  const [saving,   setSaving]   = useState(false)

  useEffect(() => {
    createClient().auth.getUser().then(({ data: { user } }) => setLoggedIn(!!user))
  }, [])

  const t = {
    title:        { en: 'CV Readiness Diagnostic', fr: 'Diagnostic de préparation CV' },
    sub:          { en: 'Find out exactly how your CV scores against an Applied AI Engineer hiring screen — free, no login, no card.', fr: "Découvrez exactement comment votre CV se positionne par rapport à un écran d'embauche d'ingénieur IA appliqué — gratuit, sans connexion, sans carte." },
    placeholder:  { en: "Paste your CV or resume here...\n\nWe don't use your CV to train models. Nothing is stored unless you sign in.", fr: "Collez votre CV ici...\n\nNous n'utilisons pas votre CV pour entraîner des modèles. Rien n'est stocké à moins que vous ne vous connectiez." },
    btn:          { en: 'Score my CV →', fr: 'Évaluer mon CV →' },
    scoring:      { en: 'Scoring your CV...', fr: 'Évaluation de votre CV...' },
    overall:      { en: 'Overall readiness',  fr: 'Préparation globale' },
    strengths:    { en: 'Strengths',          fr: 'Points forts' },
    gap:          { en: 'Biggest gap',        fr: 'Lacune principale' },
    flags:        { en: 'Red flags',          fr: 'Signaux d\'alarme' },
    recommend:    { en: 'Recommended module', fr: 'Module recommandé' },
    startInterview: { en: 'Start this interview →', fr: 'Démarrer cet entretien →' },
    privacy:      { en: "We don't use your CV to train models. Delete it anytime.", fr: "Nous n'utilisons pas votre CV pour entraîner des modèles. Supprimez-le à tout moment." },
    tryAgain:     { en: 'Try again', fr: 'Réessayer' },
  }
  const T = (k: keyof typeof t) => t[k][lang]

  async function saveToProfile() {
    if (!result) return
    setSaving(true)
    const { data: { session } } = await createClient().auth.getSession()
    const hdrs: Record<string,string> = { 'Content-Type': 'application/json' }
    if (session?.access_token) hdrs.Authorization = `Bearer ${session.access_token}`
    const res = await fetch('/api/cv/save', { method: 'POST', headers: hdrs, body: JSON.stringify({ cv, report: result }) })
    if (res.ok) setSaved(true)
    else setError((await res.json()).error ?? 'Save failed.')
    setSaving(false)
  }

  async function score() {
    if (!cv.trim() || loading) return
    setLoading(true); setError(''); setResult(null); setSaved(false)
    try {
      const res  = await fetch('/api/cv/score', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cv, lang }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Something went wrong.'); setLoading(false); return }
      setResult(data)
    } catch { setError('Network error — please try again.') }
    finally { setLoading(false) }
  }

  const scoreColor = (s: number) => s >= 70 ? '#2E7D5B' : s >= 45 ? '#C77D2E' : '#B24C3F'
  const moduleSlug = result ? (MODULE_SLUGS[result.recommendModule] ?? 'rag_system_design') : ''

  return (
    <div className="min-h-screen" style={{ background: '#FBFAF7', fontFamily: "'Inter', system-ui, sans-serif" }}>
      {/* Nav */}
      <nav className="border-b border-[#E7E2D8] bg-[#FBFAF7]/80 backdrop-blur-sm sticky top-0 z-20">
        <div className="max-w-4xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-[#1E2A44] flex items-center justify-center">
              <SunMark />
            </div>
            <span className="font-bold text-[#17140F] text-sm" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>Sonne AI</span>
          </Link>
          <div className="flex items-center gap-3">
            <div className="flex gap-0.5 bg-[#F0EDE8] rounded-lg p-0.5">
              {(['en','fr'] as const).map(l => (
                <button key={l} onClick={() => setLang(l)}
                  className="px-2.5 py-1 rounded-md text-xs font-medium transition-all"
                  style={{ background: lang === l ? 'white' : 'transparent', color: lang === l ? '#17140F' : '#7A7267', boxShadow: lang === l ? '0 1px 2px rgba(0,0,0,.06)' : 'none' }}>
                  {l === 'en' ? '🇬🇧 EN' : '🇫🇷 FR'}
                </button>
              ))}
            </div>
            <Link href="/login" className="text-xs text-[#7A7267] hover:text-[#17140F] transition-colors">Sign in</Link>
            <Link href="/app/start" className="text-xs font-medium bg-[#1E2A44] text-white px-3 py-1.5 rounded-lg hover:bg-[#2d3f61] transition-colors shadow-sm">Practice →</Link>
          </div>
        </div>
      </nav>

      <main className="max-w-2xl mx-auto px-4 py-12">

        {!result ? (
          <>
            <div className="text-center mb-10">
              <div className="inline-flex items-center gap-2 bg-[#FFF8EE] border border-[#F5A524]/30 text-[#D98A0B] text-xs font-semibold px-3 py-1.5 rounded-full mb-5" style={{ fontFamily: "'JetBrains Mono', monospace", letterSpacing: '.05em' }}>
                FREE · NO LOGIN · NO CARD
              </div>
              <h1 className="text-3xl sm:text-4xl font-bold text-[#17140F] mb-3 leading-tight" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                {T('title')}
              </h1>
              <p className="text-[#7A7267] text-base max-w-lg mx-auto leading-relaxed">{T('sub')}</p>
            </div>

            <div className="bg-white rounded-2xl border border-[#E7E2D8] shadow-sm overflow-hidden">
              <div className="p-5 border-b border-[#E7E2D8]">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-semibold text-[#17140F]" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                    {lang === 'en' ? 'Paste your CV or resume' : 'Collez votre CV'}
                  </span>
                  <span className="text-xs text-[#7A7267]">{cv.length > 0 ? `${Math.min(cv.length, 6000).toLocaleString()} / 6,000 chars` : ''}</span>
                </div>
                <textarea
                  value={cv}
                  onChange={e => setCv(e.target.value)}
                  rows={12}
                  maxLength={9000}
                  placeholder={T('placeholder')}
                  className="w-full resize-none bg-transparent text-sm text-[#17140F] placeholder:text-[#B8B2A8] focus:outline-none leading-relaxed"
                />
              </div>
              <div className="px-5 py-4 bg-[#FAFAF8] flex items-center justify-between flex-wrap gap-3">
                <p className="text-xs text-[#7A7267] flex items-center gap-1.5">
                  <span>🔒</span> {T('privacy')}
                </p>
                <button
                  onClick={score}
                  disabled={!cv.trim() || loading}
                  className="text-sm font-semibold px-5 py-2.5 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{ background: cv.trim() ? '#1E2A44' : '#E7E2D8', color: cv.trim() ? 'white' : '#7A7267', boxShadow: cv.trim() ? '0 2px 8px rgba(30,42,68,.2)' : 'none', fontFamily: "'Space Grotesk', sans-serif" }}>
                  {loading
                    ? <span className="flex items-center gap-2">
                        <span style={{ width:14,height:14,border:'2px solid rgba(255,255,255,.3)',borderTopColor:'white',borderRadius:'50%',animation:'spin 1s linear infinite',display:'inline-block' }} />
                        {T('scoring')}
                      </span>
                    : T('btn')
                  }
                </button>
              </div>
            </div>

            {error && (
              <div className="mt-4 bg-[#FEF2F2] border border-[#FECACA] rounded-xl p-4 flex items-center justify-between">
                <span className="text-sm text-[#B24C3F]">{error}</span>
                <button onClick={() => setError('')} className="text-[#B24C3F]/50 hover:text-[#B24C3F] text-lg ml-3">×</button>
              </div>
            )}

            {/* What we score */}
            <div className="mt-10 grid grid-cols-1 sm:grid-cols-2 gap-3">
              {Object.entries(SIGNAL_LABELS).map(([key, { en, fr, icon }]) => (
                <div key={key} className="flex items-start gap-3 bg-white rounded-xl border border-[#E7E2D8] p-3.5 shadow-sm">
                  <span className="text-lg flex-shrink-0 mt-0.5">{icon}</span>
                  <div>
                    <div className="text-sm font-semibold text-[#17140F]" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>{lang === 'en' ? en : fr}</div>
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : (
          <>
            {/* Result header */}
            <div className="text-center mb-8">
              <div className="inline-flex flex-col items-center gap-1 mb-5">
                <div className="text-6xl font-bold" style={{ fontFamily: "'JetBrains Mono', monospace", color: scoreColor(result.overall) }}>
                  {result.overall}
                </div>
                <div className="text-sm text-[#7A7267]">{T('overall')} <span className="font-mono text-xs">/100</span></div>
              </div>

              <div className="w-full max-w-xs mx-auto h-2.5 rounded-full bg-[#E7E2D8] mb-6 overflow-hidden">
                <div className="h-full rounded-full transition-all duration-700" style={{ width: `${result.overall}%`, background: `linear-gradient(90deg, ${scoreColor(result.overall)}, ${scoreColor(result.overall)}cc)` }} />
              </div>
            </div>

            {/* Signals */}
            <div className="bg-white rounded-2xl border border-[#E7E2D8] shadow-sm mb-5 overflow-hidden">
              <div className="px-5 py-3.5 border-b border-[#E7E2D8]">
                <span className="text-xs font-semibold text-[#7A7267] uppercase tracking-widest" style={{ fontFamily: "'JetBrains Mono', monospace" }}>5 SIGNALS</span>
              </div>
              <div className="divide-y divide-[#E7E2D8]">
                {result.signals.map(sig => {
                  const label = SIGNAL_LABELS[sig.key]
                  const col   = BAND_COLORS[sig.band]
                  return (
                    <div key={sig.key} className="px-5 py-4 flex items-start gap-4">
                      <span className="text-xl flex-shrink-0 mt-0.5">{label?.icon}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <span className="text-sm font-semibold text-[#17140F]" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                            {lang === 'en' ? label?.en : label?.fr}
                          </span>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: col.bg, color: col.text, border: `1px solid ${col.border}` }}>
                            {sig.band}
                          </span>
                          <span className="text-xs font-mono ml-auto" style={{ color: scoreColor(sig.score) }}>{sig.score}</span>
                        </div>
                        {sig.evidence && <p className="text-xs text-[#7A7267] leading-relaxed">{sig.evidence}</p>}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Strengths */}
            {result.strengths?.length > 0 && (
              <div className="bg-[#F0FDF4] border border-[#BBF7D0] rounded-2xl p-5 mb-4">
                <div className="text-xs font-semibold text-[#2E7D5B] uppercase tracking-widest mb-3" style={{ fontFamily: "'JetBrains Mono', monospace" }}>✓ {T('strengths')}</div>
                <ul className="space-y-1.5">
                  {result.strengths.map((s, i) => <li key={i} className="text-sm text-[#1A4731] flex gap-2"><span className="flex-shrink-0">·</span>{s}</li>)}
                </ul>
              </div>
            )}

            {/* Biggest gap */}
            {result.gap && (
              <div className="bg-[#FFFBEB] border border-[#FDE68A] rounded-2xl p-5 mb-4">
                <div className="text-xs font-semibold text-[#C77D2E] uppercase tracking-widest mb-2" style={{ fontFamily: "'JetBrains Mono', monospace" }}>⚠ {T('gap')}</div>
                <p className="text-sm text-[#78350F]">{result.gap}</p>
              </div>
            )}

            {/* Red flags */}
            {result.flags?.length > 0 && (
              <div className="bg-[#FEF2F2] border border-[#FECACA] rounded-2xl p-5 mb-4">
                <div className="text-xs font-semibold text-[#B24C3F] uppercase tracking-widest mb-3" style={{ fontFamily: "'JetBrains Mono', monospace" }}>⛳ {T('flags')}</div>
                <ul className="space-y-1.5">
                  {result.flags.map((f, i) => <li key={i} className="text-sm text-[#7F1D1D] flex gap-2"><span className="flex-shrink-0">·</span>{f}</li>)}
                </ul>
              </div>
            )}

            {/* CTA: recommended module */}
            {result.recommendModule && (
              <div className="bg-[#EEF1F6] border border-[#C7D0E0] rounded-2xl p-5 mb-6">
                <div className="text-xs font-semibold text-[#1E2A44] uppercase tracking-widest mb-2" style={{ fontFamily: "'JetBrains Mono', monospace" }}>→ {T('recommend')}</div>
                <div className="text-base font-bold text-[#17140F] mb-1" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>{result.recommendModule}</div>
                <p className="text-sm text-[#7A7267] mb-4">{result.recommendWhy}</p>
                <Link
                  href={`/app/start?module=${moduleSlug}&lang=${lang}`}
                  className="inline-flex items-center gap-2 bg-[#1E2A44] text-white text-sm font-semibold px-5 py-2.5 rounded-xl hover:bg-[#2d3f61] transition-all shadow-sm"
                  style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                  {T('startInterview')}
                </Link>
              </div>
            )}

            {/* Save to profile */}
            {!loggedIn ? (
              <div className="bg-[#FFF8EE] border border-[#F5A524]/30 rounded-xl p-4 flex items-center justify-between gap-4 flex-wrap">
                <p className="text-sm text-[#7A7267]">
                  {lang === 'en' ? 'Sign in to save this report and track your progress.' : 'Connectez-vous pour sauvegarder ce rapport.'}
                </p>
                <Link href={`/login?redirect=/cv`} className="text-sm font-semibold text-[#D98A0B] hover:text-[#17140F] whitespace-nowrap"
                  style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                  {lang === 'en' ? 'Sign in →' : 'Se connecter →'}
                </Link>
              </div>
            ) : saved ? (
              <div className="bg-[#F0FDF4] border border-[#BBF7D0] rounded-xl p-4 text-sm text-[#2E7D5B] font-medium text-center">
                ✓ {lang === 'en' ? 'Saved to your profile' : 'Sauvegardé dans votre profil'}
              </div>
            ) : (
              <button onClick={saveToProfile} disabled={saving}
                className="w-full py-3 rounded-xl border border-[#E7E2D8] bg-white text-sm font-medium text-[#17140F] hover:border-[#C7C2B8] transition-all disabled:opacity-50"
                style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                {saving ? (lang === 'en' ? 'Saving...' : 'Sauvegarde...') : (lang === 'en' ? '↑ Save to profile' : '↑ Sauvegarder dans le profil')}
              </button>
            )}

            <div className="flex gap-3 justify-center">
              <button onClick={() => { setResult(null); setCv(''); setSaved(false) }}
                className="text-sm text-[#7A7267] border border-[#E7E2D8] px-4 py-2 rounded-lg hover:bg-white transition-all">
                {T('tryAgain')}
              </button>
              <Link href="/app/start"
                className="text-sm font-medium bg-[#1E2A44] text-white px-4 py-2 rounded-lg hover:bg-[#2d3f61] transition-all shadow-sm"
                style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                {lang === 'en' ? 'All modules →' : 'Tous les modules →'}
              </Link>
            </div>
          </>
        )}
      </main>

      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}

function SunMark() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="7" cy="7" r="3" fill="#F5A524"/>
      {[0,45,90,135,180,225,270,315].map((deg, i) => {
        const r = Math.PI * deg / 180
        const x1 = 7 + 4 * Math.cos(r); const y1 = 7 + 4 * Math.sin(r)
        const x2 = 7 + 5.5 * Math.cos(r); const y2 = 7 + 5.5 * Math.sin(r)
        return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#F5A524" strokeWidth="1.2" strokeLinecap="round"/>
      })}
    </svg>
  )
}
