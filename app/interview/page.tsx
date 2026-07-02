'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

const MODULES = [
  {
    slug: 'rag_system_design',
    emoji: '🔍',
    name_en: 'RAG System Design',
    name_fr: 'Conception de Systèmes RAG',
    desc_en: 'Chunking strategy · Retrieval quality · Reranking · Freshness',
    desc_fr: 'Stratégie de découpage · Qualité de récupération · Reclassement · Fraîcheur',
    sub_en: ['Chunking Strategy', 'Retrieval Quality', 'Reranking', 'Freshness & Updates'],
    sub_fr: ['Stratégie de découpage', 'Qualité de récupération', 'Reclassement', 'Fraîcheur et mises à jour'],
  },
  {
    slug: 'agent_orchestration',
    emoji: '🕵️',
    name_en: 'Agent / Multi-Agent Orchestration',
    name_fr: 'Orchestration d\'Agents',
    desc_en: 'Tool use · Planning · Failure handling · Multi-agent coordination',
    desc_fr: 'Utilisation d\'outils · Planification · Gestion des pannes · Coordination',
    sub_en: ['Tool Use Design', 'Planning & Decomposition', 'Failure Handling', 'Multi-Agent Coordination'],
    sub_fr: ['Conception des outils', 'Planification', 'Gestion des pannes', 'Coordination multi-agents'],
  },
  {
    slug: 'evaluation_testing',
    emoji: '🧪',
    name_en: 'Evaluation & Testing',
    name_fr: 'Évaluation & Tests',
    desc_en: 'Eval design · Hallucination detection · Offline vs online · Regression',
    desc_fr: 'Conception de l\'éval · Détection des hallucinations · Hors ligne vs en ligne',
    sub_en: ['Eval Design', 'Hallucination Detection', 'Offline vs Online Eval', 'Regression Testing'],
    sub_fr: ['Conception de l\'évaluation', 'Détection des hallucinations', 'Éval hors ligne/en ligne', 'Tests de régression'],
  },
  {
    slug: 'production_mlops',
    emoji: '⚙️',
    name_en: 'Production / MLOps',
    name_fr: 'Production / MLOps',
    desc_en: 'Monitoring · Cost/latency tradeoffs · Versioning · Deployment safety',
    desc_fr: 'Surveillance · Compromis coût/latence · Versionnement · Sécurité du déploiement',
    sub_en: ['Monitoring & Observability', 'Cost/Latency Tradeoffs', 'Versioning & Rollback', 'Deployment Safety'],
    sub_fr: ['Surveillance et observabilité', 'Compromis coût/latence', 'Versionnement', 'Sécurité du déploiement'],
  },
]

export default function InterviewPage() {
  const router = useRouter()
  const [selected,  setSelected]  = useState<string | null>(null)
  const [lang,      setLang]      = useState<'en' | 'fr'>('en')
  const [starting,  setStarting]  = useState(false)
  const [error,     setError]     = useState('')

  async function startInterview() {
    if (!selected) return
    setStarting(true)
    setError('')
    try {
      const sb = createClient()
      const { data: { session } } = await sb.auth.getSession()
      if (!session) {
        setError('No local session found. Please sign out and sign back in at /login.')
        setStarting(false)
        return
      }

      const res  = await fetch('/api/interview/start', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ module_slug: selected, lang }),
      })
      const data = await res.json()

      if (!res.ok) {
        if (data.upgrade) {
          router.push('/pricing')
          return
        }
        // Show raw error + hint to visit debug endpoint
        setError(`API error (${res.status}): ${data.error ?? 'unknown'} — visit /api/auth/debug for details`)
        setStarting(false)
        return
      }

      // Cache opening message for session page
      sessionStorage.setItem(`session_${data.sessionId}_opening`, data.openingMessage)
      sessionStorage.setItem(`session_${data.sessionId}_totalSS`, String(data.totalSubSkills))

      router.push(`/interview/session?id=${data.sessionId}&lang=${lang}`)
    } catch {
      setError('Network error. Please try again.')
      setStarting(false)
    }
  }

  const selectedModule = MODULES.find(m => m.slug === selected)

  return (
    <div className="min-h-screen bg-[#09090C]" style={{ fontFamily: 'Inter, sans-serif' }}>
      {/* Nav */}
      <nav className="sticky top-0 z-50 border-b border-[#1C1D28] bg-[rgba(9,9,12,0.9)] backdrop-blur-sm">
        <div className="max-w-4xl mx-auto px-4 h-12 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-[#4776F7] flex items-center justify-center text-white text-xs font-bold">S</div>
            <span className="font-semibold text-sm text-[#F0F2FA]">Sonne AI</span>
          </Link>
          <div className="flex items-center gap-3">
            <Link href="/dashboard" className="text-xs text-[#7A829A] hover:text-[#F0F2FA] transition-colors">Dashboard</Link>
          </div>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-semibold text-[#F0F2FA] mb-1">Choose a module</h1>
          <p className="text-sm text-[#7A829A]">Each module covers 4 sub-skills with adaptive questions and a full diagnostic report.</p>
        </div>

        {/* Language selector */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setLang('en')}
            className={`px-4 py-1.5 rounded-lg text-xs font-medium transition-colors ${lang === 'en' ? 'bg-[#4776F7] text-white' : 'border border-[#1C1D28] text-[#7A829A] hover:text-[#F0F2FA]'}`}>
            English
          </button>
          <button
            onClick={() => setLang('fr')}
            className={`px-4 py-1.5 rounded-lg text-xs font-medium transition-colors ${lang === 'fr' ? 'bg-[#4776F7] text-white' : 'border border-[#1C1D28] text-[#7A829A] hover:text-[#F0F2FA]'}`}>
            Français
          </button>
        </div>

        {/* Module grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
          {MODULES.map(m => {
            const isSelected = selected === m.slug
            const subs = lang === 'fr' ? m.sub_fr : m.sub_en
            return (
              <button
                key={m.slug}
                onClick={() => setSelected(isSelected ? null : m.slug)}
                className={`text-left p-5 rounded-xl border transition-all ${isSelected
                  ? 'border-[#4776F7] bg-[rgba(71,118,247,0.08)]'
                  : 'border-[#1C1D28] bg-[#111218] hover:border-[#2A2B38]'}`}>
                <div className="text-2xl mb-3">{m.emoji}</div>
                <div className="text-sm font-semibold text-[#F0F2FA] mb-1">
                  {lang === 'fr' ? m.name_fr : m.name_en}
                </div>
                <div className="text-xs text-[#7A829A] mb-3">
                  {lang === 'fr' ? m.desc_fr : m.desc_en}
                </div>
                <div className="space-y-1">
                  {subs.map((s, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs text-[#7A829A]">
                      <span className="w-1 h-1 rounded-full bg-[#3D4260] flex-shrink-0" />
                      {s}
                    </div>
                  ))}
                </div>
                {isSelected && (
                  <div className="mt-3 flex items-center gap-1.5 text-xs text-[#4776F7] font-medium">
                    <span className="w-3.5 h-3.5 rounded-full border-2 border-[#4776F7] flex items-center justify-center">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#4776F7]" />
                    </span>
                    Selected
                  </div>
                )}
              </button>
            )
          })}
        </div>

        {/* Start button */}
        {error && (
          <div className="mb-4 bg-[rgba(232,64,64,0.1)] border border-[rgba(232,64,64,0.2)] rounded-lg px-4 py-3 text-sm text-[#E84040]">
            {error}
          </div>
        )}

        <div className="flex items-center gap-4">
          <button
            onClick={startInterview}
            disabled={!selected || starting}
            className="bg-[#4776F7] text-white font-medium px-8 py-3 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90 transition-opacity text-sm">
            {starting
              ? <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  {lang === 'fr' ? 'Démarrage...' : 'Starting...'}
                </span>
              : selectedModule
                ? (lang === 'fr' ? `Commencer ${selectedModule.name_fr} →` : `Start ${selectedModule.name_en} →`)
                : (lang === 'fr' ? 'Sélectionnez un module' : 'Select a module')}
          </button>
          {selected && !starting && (
            <p className="text-xs text-[#7A829A]">
              {lang === 'fr' ? '~15 min · 4 sous-compétences · rapport complet inclus' : '~15 min · 4 sub-skills · full diagnostic included'}
            </p>
          )}
        </div>

        <div className="mt-8 pt-6 border-t border-[#1C1D28]">
          <p className="text-xs text-[#3D4260]">
            {lang === 'fr'
              ? 'Le tier gratuit inclut 1 session complète. Mettez à niveau pour des sessions illimitées sur tous les modules.'
              : 'Free tier includes 1 full session. Upgrade for unlimited sessions across all modules.'}
            {' '}<Link href="/pricing" className="text-[#4776F7] hover:underline">{lang === 'fr' ? 'Voir les tarifs →' : 'See pricing →'}</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
