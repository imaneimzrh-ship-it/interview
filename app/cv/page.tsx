'use client'
import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { BAND_COLORS, type Band } from '@/lib/signals'
import { GAP_TO_MODULE, MODULE_NAME_TO_SLUG, SUB_SKILL_TO_MODULE } from '@/lib/gap-module-map'
import AppLayout from '@/components/app/AppLayout'

const SIGNAL_LABELS: Record<string, { en: string; fr: string; icon: string }> = {
  production: { en: 'Production Evidence', fr: 'Expérience en production',   icon: '🚀' },
  rag:        { en: 'RAG Depth',           fr: 'Profondeur RAG',              icon: '🔍' },
  agentic:    { en: 'Agentic Experience',  fr: 'Expérience agentique',        icon: '🕵️' },
  eval:       { en: 'Evaluation Literacy', fr: "Maîtrise de l'évaluation",    icon: '🧪' },
  cost:       { en: 'Cost & Safety',       fr: 'Coût et sécurité',            icon: '⚙️' },
}

interface CvResult {
  overall: number
  signals: { key: string; score: number; band: Band; evidence: string }[]
  strengths: string[]
  gap: string
  flags: string[]
  recommendModule: string
  recommendSubSkill?: string
  recommendWhy: string
}

export default function CvPage() {
  const [lang,        setLang]       = useState<'en'|'fr'>('en')
  const [cv,          setCv]         = useState('')
  const [loading,     setLoading]    = useState(false)
  const [parsing,     setParsing]    = useState(false)
  const [result,      setResult]     = useState<CvResult | null>(null)
  const [error,       setError]      = useState('')
  const [isPro,       setIsPro]      = useState(false)
  const [saved,       setSaved]      = useState(false)
  const [saving,      setSaving]     = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    createClient().auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return
      const sb = createClient()
      const { data: p } = await sb.from('profiles').select('plan').eq('id', user.id).single()
      setIsPro(p?.plan === 'pro')
    })
  }, [])

  async function handleFile(file: File) {
    const ext = file.name.split('.').pop()?.toLowerCase()
    if (!['pdf', 'docx', 'txt', 'md'].includes(ext ?? '')) {
      setError('Unsupported file type. Please upload a PDF, DOCX, TXT, or MD file.')
      return
    }
    setParsing(true); setError('')
    try {
      let text = ''
      if (ext === 'pdf') {
        // PDF is parsed client-side to avoid large server-side payloads
        const pdfjsLib = await import('pdfjs-dist')
        pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs'
        const arrayBuffer = await file.arrayBuffer()
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise
        const parts: string[] = []
        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i)
          const content = await page.getTextContent()
          parts.push(content.items.map((item: any) => ('str' in item ? item.str : '')).join(' '))
        }
        text = parts.join('\n')
        text = text.replace(/\s+/g, ' ').trim().slice(0, 9000)
        if (text.length < 50) { setError('Could not extract text from file. Try pasting your CV directly.'); return }
        setCv(text); setError('')
      } else {
        // DOCX, TXT, MD → server-side parse
        const fd = new FormData()
        fd.append('file', file)
        const res = await fetch('/api/cv/parse', { method: 'POST', body: fd })
        const data = await res.json()
        if (!res.ok) { setError(data.error ?? 'Could not parse file. Try pasting your CV directly.'); return }
        setCv(data.text); setError('')
      }
    } catch (e: any) {
      console.error('[cv/handleFile]', e)
      setError('Could not parse file. Try pasting your CV directly.')
    } finally {
      setParsing(false)
    }
  }

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
      const { data: { session } } = await createClient().auth.getSession()
      const hdrs: Record<string, string> = { 'Content-Type': 'application/json' }
      if (session?.access_token) hdrs.Authorization = `Bearer ${session.access_token}`
      const res  = await fetch('/api/cv/score', {
        method: 'POST',
        headers: hdrs,
        body: JSON.stringify({ cv, lang }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.message ?? data.error ?? 'Something went wrong.'); setLoading(false); return }
      setResult(data)
    } catch { setError('Network error — please try again.') }
    finally { setLoading(false) }
  }

  const scoreColor = (s: number) => s >= 70 ? '#2E7D5B' : s >= 45 ? '#C77D2E' : '#B24C3F'
  const moduleSlug = result
    ? (result.recommendSubSkill && SUB_SKILL_TO_MODULE[result.recommendSubSkill])
      ?? MODULE_NAME_TO_SLUG[result.recommendModule]
      ?? 'rag_system_design'
    : ''
  const subSkillParam = result?.recommendSubSkill ? `&sub_skill=${result.recommendSubSkill}` : ''

  // Free signed-in users get full CV breakdown — it's the free-tier feature
  // Anon users (should not reach here due to middleware) see only overall
  const canSeeFullBreakdown = true
  const weakestSignal = result?.signals?.reduce((a, b) => a.score < b.score ? a : b) ?? null
  // Config-driven gap → module lookup (uses weakest signal key, not AI free text)
  const gapModule = weakestSignal ? (GAP_TO_MODULE[weakestSignal.key] ?? null) : null

  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto px-4 py-8">

        {/* Language switcher */}
        <div className="flex justify-end mb-6">
          <div className="flex gap-0.5 bg-[#F0EDE8] rounded-lg p-0.5">
            {(['en','fr'] as const).map(l => (
              <button key={l} onClick={() => setLang(l)}
                className="px-2.5 py-1 rounded-md text-xs font-medium transition-all"
                style={{ background: lang === l ? 'white' : 'transparent', color: lang === l ? '#17140F' : '#7A7267', boxShadow: lang === l ? '0 1px 2px rgba(0,0,0,.06)' : 'none' }}>
                {l === 'en' ? '🇬🇧 EN' : '🇫🇷 FR'}
              </button>
            ))}
          </div>
        </div>

        {!result ? (
          <>
            <div className="text-center mb-10">
              <div className="inline-flex items-center gap-2 bg-[#FFF8EE] border border-[#F5A524]/30 text-[#D98A0B] text-xs font-semibold px-3 py-1.5 rounded-full mb-5"
                style={{ fontFamily: "'JetBrains Mono', monospace", letterSpacing: '.05em' }}>
                FREE WITH ACCOUNT · NO CARD
              </div>
              <h1 className="text-3xl sm:text-4xl font-bold text-[#17140F] mb-3 leading-tight" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                {lang === 'en' ? 'CV Readiness Diagnostic' : 'Diagnostic de préparation CV'}
              </h1>
              <p className="text-[#7A7267] text-base max-w-lg mx-auto leading-relaxed">
                {lang === 'en'
                  ? 'Find out exactly how your CV scores against an Applied AI Engineer hiring screen — free on any plan, no card required.'
                  : "Découvrez exactement comment votre CV se positionne par rapport à un écran d'embauche — gratuit sur tout plan, sans carte bancaire."}
              </p>
            </div>

            <div className="bg-white rounded-2xl border border-[#E7E2D8] shadow-sm overflow-hidden">
              <div className="p-5 border-b border-[#E7E2D8]">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-semibold text-[#17140F]" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                    {lang === 'en' ? 'Paste your CV or upload a file' : 'Collez votre CV ou importez un fichier'}
                  </span>
                  <div className="flex items-center gap-2">
                    {cv.length > 0 && <span className="text-xs text-[#7A7267]">{Math.min(cv.length, 6000).toLocaleString()} / 6,000</span>}
                    <input ref={fileRef} type="file" accept=".pdf,.docx,.txt,.md" className="hidden"
                      onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = '' }} />
                    <div className="flex flex-col items-end gap-1">
                      <button onClick={() => fileRef.current?.click()} disabled={parsing}
                        className="text-xs font-medium border border-[#E7E2D8] text-[#7A7267] hover:text-[#17140F] hover:border-[#C7C2B8] px-2.5 py-1.5 rounded-lg transition-all disabled:opacity-50">
                        {parsing ? '⏳ Parsing...' : '📎 Upload file'}
                      </button>
                      <span className="text-[10px] text-[#B8B2A8]">PDF, DOCX, TXT or MD</span>
                    </div>
                  </div>
                </div>
                <textarea
                  value={cv}
                  onChange={e => setCv(e.target.value)}
                  rows={12}
                  maxLength={9000}
                  placeholder={lang === 'en'
                    ? "Paste your CV or resume here...\n\nWe don't use your CV to train models. Nothing is stored unless you sign in."
                    : "Collez votre CV ici...\n\nNous n'utilisons pas votre CV pour entraîner des modèles."}
                  className="w-full resize-none bg-transparent text-sm text-[#17140F] placeholder:text-[#B8B2A8] focus:outline-none leading-relaxed"
                />
              </div>
              <div className="px-5 py-4 bg-[#FAFAF8] flex items-center justify-between flex-wrap gap-3">
                <p className="text-xs text-[#7A7267] flex items-center gap-1.5">
                  <span>🔒</span> {lang === 'en' ? "We don't use your CV to train models. Delete it anytime." : "Nous n'utilisons pas votre CV pour entraîner des modèles."}
                </p>
                <button
                  onClick={score}
                  disabled={!cv.trim() || loading || parsing}
                  className="text-sm font-semibold px-5 py-2.5 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{ background: cv.trim() ? '#1E2A44' : '#E7E2D8', color: cv.trim() ? 'white' : '#7A7267', boxShadow: cv.trim() ? '0 2px 8px rgba(30,42,68,.2)' : 'none', fontFamily: "'Space Grotesk', sans-serif" }}>
                  {loading
                    ? <span className="flex items-center gap-2">
                        <span style={{ width:14,height:14,border:'2px solid rgba(255,255,255,.3)',borderTopColor:'white',borderRadius:'50%',animation:'spin 1s linear infinite',display:'inline-block' }} />
                        {lang === 'en' ? 'Scoring your CV...' : 'Évaluation...'}
                      </span>
                    : lang === 'en' ? 'Score my CV →' : 'Évaluer mon CV →'
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

            <div className="mt-10 grid grid-cols-1 sm:grid-cols-2 gap-3">
              {Object.entries(SIGNAL_LABELS).map(([key, { en, fr, icon }]) => (
                <div key={key} className="flex items-start gap-3 bg-white rounded-xl border border-[#E7E2D8] p-3.5 shadow-sm">
                  <span className="text-lg flex-shrink-0 mt-0.5">{icon}</span>
                  <div className="text-sm font-semibold text-[#17140F]" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>{lang === 'en' ? en : fr}</div>
                </div>
              ))}
            </div>
          </>
        ) : (
          <>
            {/* Score header */}
            <div className="text-center mb-8">
              <div className="inline-flex flex-col items-center gap-1 mb-5">
                <div className="text-6xl font-bold" style={{ fontFamily: "'JetBrains Mono', monospace", color: scoreColor(result.overall) }}>
                  {result.overall}
                </div>
                <div className="text-sm text-[#7A7267]">{lang === 'en' ? 'Overall readiness' : 'Préparation globale'} <span className="font-mono text-xs">/100</span></div>
              </div>
              <div className="w-full max-w-xs mx-auto h-2.5 rounded-full bg-[#E7E2D8] mb-2 overflow-hidden">
                <div className="h-full rounded-full transition-all duration-700" style={{ width: `${result.overall}%`, background: scoreColor(result.overall) }} />
              </div>
            </div>

            {/* Signals — gated */}
            <div className="bg-white rounded-2xl border border-[#E7E2D8] shadow-sm mb-5 overflow-hidden">
              <div className="px-5 py-3.5 border-b border-[#E7E2D8] flex items-center justify-between">
                <span className="text-xs font-semibold text-[#7A7267] uppercase tracking-widest" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                  {canSeeFullBreakdown ? '5 SIGNALS' : lang === 'en' ? 'WEAKEST SIGNAL' : 'SIGNAL LE PLUS FAIBLE'}
                </span>
                {!canSeeFullBreakdown && (
                  <span className="text-xs text-[#7A7267]">
                    {lang === 'en' ? '4 more with Pro' : '4 autres avec Pro'}
                  </span>
                )}
              </div>

              {canSeeFullBreakdown ? (
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
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: col.bg, color: col.text, border: `1px solid ${col.border}` }}>{sig.band}</span>
                            <span className="text-xs font-mono ml-auto" style={{ color: scoreColor(sig.score) }}>{sig.score}</span>
                          </div>
                          {sig.evidence && <p className="text-xs text-[#7A7267] leading-relaxed">{sig.evidence}</p>}
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <>
                  {/* Show only weakest signal */}
                  {weakestSignal && (() => {
                    const label = SIGNAL_LABELS[weakestSignal.key]
                    const col   = BAND_COLORS[weakestSignal.band]
                    return (
                      <div className="px-5 py-4 flex items-start gap-4">
                        <span className="text-xl flex-shrink-0 mt-0.5">{label?.icon}</span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <span className="text-sm font-semibold text-[#17140F]" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                              {lang === 'en' ? label?.en : label?.fr}
                            </span>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: col.bg, color: col.text, border: `1px solid ${col.border}` }}>{weakestSignal.band}</span>
                            <span className="text-xs font-mono ml-auto" style={{ color: scoreColor(weakestSignal.score) }}>{weakestSignal.score}</span>
                          </div>
                          {weakestSignal.evidence && <p className="text-xs text-[#7A7267] leading-relaxed">{weakestSignal.evidence}</p>}
                        </div>
                      </div>
                    )
                  })()}
                  {/* Blur/upgrade row for remaining 4 */}
                  <div className="px-5 py-4 border-t border-[#E7E2D8]">
                    <div className="flex gap-2 mb-3">
                      {result.signals.filter(s => s.key !== weakestSignal?.key).map(sig => {
                        const label = SIGNAL_LABELS[sig.key]
                        return (
                          <div key={sig.key} className="flex-1 bg-[#F5F4F0] rounded-lg p-2 text-center" style={{ filter: 'blur(3px)', userSelect: 'none' }}>
                            <div className="text-base">{label?.icon}</div>
                            <div className="text-xs font-bold text-[#9CA3AF]">??</div>
                          </div>
                        )
                      })}
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-[#7A7267] mb-3">
                        {lang === 'en'
                          ? 'Sign in to see all 5 signals. Upgrade to Pro for full evidence breakdowns.'
                          : 'Connectez-vous pour voir les 5 signaux. Passez à Pro pour les détails complets.'}
                      </p>
                      <div className="flex gap-2 justify-center">
                        <Link href="/login?redirect=/cv" className="text-xs font-semibold text-[#1E2A44] border border-[#E7E2D8] px-3 py-2 rounded-lg hover:bg-[#F5F4F0] transition-all"
                          style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                          {lang === 'en' ? 'Sign in free →' : 'Se connecter →'}
                        </Link>
                        <Link href="/pricing" className="text-xs font-semibold bg-[#F5A524] text-[#17140F] px-3 py-2 rounded-lg hover:bg-[#D98A0B] transition-all"
                          style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                          {lang === 'en' ? 'Upgrade to Pro' : 'Passer à Pro'}
                        </Link>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Strengths — pro only */}
            {canSeeFullBreakdown && result.strengths?.length > 0 && (
              <div className="bg-[#F0FDF4] border border-[#BBF7D0] rounded-2xl p-5 mb-4">
                <div className="text-xs font-semibold text-[#2E7D5B] uppercase tracking-widest mb-3" style={{ fontFamily: "'JetBrains Mono', monospace" }}>✓ {lang === 'en' ? 'Strengths' : 'Points forts'}</div>
                <ul className="space-y-1.5">{result.strengths.map((s, i) => <li key={i} className="text-sm text-[#1A4731] flex gap-2"><span>·</span>{s}</li>)}</ul>
              </div>
            )}

            {/* Gap — always shown */}
            {result.gap && (
              <div className="bg-[#FFFBEB] border border-[#FDE68A] rounded-2xl p-5 mb-4">
                <div className="text-xs font-semibold text-[#C77D2E] uppercase tracking-widest mb-2" style={{ fontFamily: "'JetBrains Mono', monospace" }}>⚠ {lang === 'en' ? 'Biggest gap' : 'Lacune principale'}</div>
                <p className="text-sm text-[#78350F]">{result.gap}</p>
              </div>
            )}

            {/* Gap handoff CTA — config-driven, always shown when we have a gap + mapping */}
            {result.gap && gapModule && (
              <div className="rounded-2xl border-2 p-5 mb-4"
                style={{ background: 'linear-gradient(135deg, #1E2A44 0%, #2D3E60 100%)', borderColor: '#F5A524' }}>
                <div className="text-xs font-semibold uppercase tracking-widest mb-3"
                  style={{ fontFamily: "'JetBrains Mono', monospace", color: '#F5A524' }}>
                  → {lang === 'en' ? 'Practice this gap now' : 'Pratiquez cette lacune maintenant'}
                </div>
                <p className="text-sm text-[#CBD5E1] mb-4 leading-relaxed">
                  <span className="font-semibold text-white">{lang === 'en' ? 'Your biggest gap: ' : 'Votre lacune principale : '}</span>
                  {result.gap}
                </p>
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{gapModule.emoji}</span>
                    <div>
                      <div className="text-sm font-bold text-white" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                        {gapModule.name}
                      </div>
                      {!gapModule.free && (
                        <div className="text-[10px] font-bold text-[#F5A524]">
                          {lang === 'en' ? 'Pro module' : 'Module Pro'}
                          {!isPro && (lang === 'en' ? ' — upgrade to unlock' : ' — passez à Pro')}
                        </div>
                      )}
                    </div>
                  </div>
                  <Link
                    href={`/app/start?module=${gapModule.slug}&lang=${lang}${result?.recommendSubSkill ? `&sub_skill=${result.recommendSubSkill}` : (gapModule.subSkillSlug ? `&sub_skill=${gapModule.subSkillSlug}` : '')}`}
                    className="inline-flex items-center gap-1.5 text-sm font-bold px-4 py-2.5 rounded-xl transition-all whitespace-nowrap"
                    style={{ background: '#F5A524', color: '#17140F', fontFamily: "'Space Grotesk', sans-serif", boxShadow: '0 2px 8px rgba(245,165,36,.4)' }}>
                    {lang === 'en' ? 'Practice this now →' : 'Pratiquer maintenant →'}
                  </Link>
                </div>
              </div>
            )}

            {/* Red flags — pro only */}
            {canSeeFullBreakdown && result.flags?.length > 0 && (
              <div className="bg-[#FEF2F2] border border-[#FECACA] rounded-2xl p-5 mb-4">
                <div className="text-xs font-semibold text-[#B24C3F] uppercase tracking-widest mb-3" style={{ fontFamily: "'JetBrains Mono', monospace" }}>⛳ {lang === 'en' ? 'Red flags' : 'Signaux d\'alarme'}</div>
                <ul className="space-y-1.5">{result.flags.map((f, i) => <li key={i} className="text-sm text-[#7F1D1D] flex gap-2"><span>·</span>{f}</li>)}</ul>
              </div>
            )}

            {/* Recommended module CTA */}
            {result.recommendModule && (
              <div className="bg-[#EEF1F6] border border-[#C7D0E0] rounded-2xl p-5 mb-6">
                <div className="text-xs font-semibold text-[#1E2A44] uppercase tracking-widest mb-2" style={{ fontFamily: "'JetBrains Mono', monospace" }}>→ {lang === 'en' ? 'Recommended module' : 'Module recommandé'}</div>
                <div className="text-base font-bold text-[#17140F] mb-1" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>{result.recommendModule}</div>
                <p className="text-sm text-[#7A7267] mb-4">{result.recommendWhy}</p>
                <Link href={`/app/start?module=${moduleSlug}&lang=${lang}${subSkillParam}`}
                  className="inline-flex items-center gap-2 bg-[#1E2A44] text-white text-sm font-semibold px-5 py-2.5 rounded-xl hover:bg-[#2d3f61] transition-all shadow-sm"
                  style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                  {lang === 'en' ? 'Start this interview →' : 'Démarrer cet entretien →'}
                </Link>
              </div>
            )}

            {/* Save to profile */}
            {saved ? (
              <div className="bg-[#F0FDF4] border border-[#BBF7D0] rounded-xl p-4 text-sm text-[#2E7D5B] font-medium text-center mb-4">
                ✓ {lang === 'en' ? 'Saved to your profile' : 'Sauvegardé dans votre profil'}
              </div>
            ) : (
              <button onClick={saveToProfile} disabled={saving}
                className="w-full py-3 rounded-xl border border-[#E7E2D8] bg-white text-sm font-medium text-[#17140F] hover:border-[#C7C2B8] transition-all disabled:opacity-50 mb-4"
                style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                {saving ? (lang === 'en' ? 'Saving...' : 'Sauvegarde...') : (lang === 'en' ? '↑ Save to profile' : '↑ Sauvegarder dans le profil')}
              </button>
            )}

            {error && (
              <div className="mb-4 bg-[#FEF2F2] border border-[#FECACA] rounded-xl p-4 flex items-center justify-between">
                <span className="text-sm text-[#B24C3F]">{error}</span>
                <button onClick={() => setError('')} className="text-[#B24C3F]/50 hover:text-[#B24C3F] text-lg ml-3">×</button>
              </div>
            )}

            <div className="flex gap-3 justify-center">
              <button onClick={() => { setResult(null); setCv(''); setSaved(false) }}
                className="text-sm text-[#7A7267] border border-[#E7E2D8] px-4 py-2 rounded-lg hover:bg-white transition-all">
                {lang === 'en' ? 'Try again' : 'Réessayer'}
              </button>
              <Link href="/app/start"
                className="text-sm font-medium bg-[#1E2A44] text-white px-4 py-2 rounded-lg hover:bg-[#2d3f61] transition-all shadow-sm"
                style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                {lang === 'en' ? 'All modules →' : 'Tous les modules →'}
              </Link>
            </div>
          </>
        )}
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    </AppLayout>
  )
}
