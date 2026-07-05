'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

const MODULES = [
  {
    id: 'rag_system_design', emoji: '🔍',
    name: 'RAG System Design', name_fr: 'Conception de Systèmes RAG',
    desc: 'Chunking strategy · Retrieval quality · Reranking · Freshness',
    skills: ['Chunking Strategy','Retrieval Quality','Reranking','Freshness & Updates'],
    isPro: false, tier: 'FREE', tierColor: '#059669', tierBg: '#ECFDF5', tierBorder: '#A7F3D0',
    why: 'Most commonly tested in applied AI engineer roles. Start here.',
  },
  {
    id: 'agent_orchestration', emoji: '🕵️',
    name: 'Agent / Multi-Agent Orchestration', name_fr: 'Orchestration d\'Agents',
    desc: 'Tool use · Planning & decomposition · Failure handling · Multi-agent coordination',
    skills: ['Tool Use Design','Planning & Decomposition','Failure Handling','Multi-Agent Coordination'],
    isPro: true, tier: 'PRO', tierColor: '#1D4ED8', tierBg: '#EFF6FF', tierBorder: '#BFDBFE',
    why: 'Agent design is now tested at every major AI lab. Critical for 2026 roles.',
  },
  {
    id: 'evaluation_testing', emoji: '🧪',
    name: 'Evaluation & Testing', name_fr: 'Évaluation & Tests',
    desc: 'Eval design · Hallucination detection · Offline vs online · Regression testing',
    skills: ['Eval Design','Hallucination Detection','Offline vs Online Eval','Regression Testing'],
    isPro: true, tier: 'PRO', tierColor: '#92400E', tierBg: '#FFFBEB', tierBorder: '#FDE68A',
    why: 'Eval methodology is what separates junior from senior AI engineers.',
  },
  {
    id: 'production_mlops', emoji: '⚙️',
    name: 'Production / MLOps', name_fr: 'Production / MLOps',
    desc: 'Monitoring · Cost/latency tradeoffs · Versioning & rollback · Deployment safety',
    skills: ['Monitoring & Observability','Cost/Latency Tradeoffs','Versioning & Rollback','Deployment Safety'],
    isPro: true, tier: 'PRO', tierColor: '#5B21B6', tierBg: '#F5F3FF', tierBorder: '#DDD6FE',
    why: 'Production thinking is what companies test to filter real engineers.',
  },
]

export default function InterviewHub() {
  const router   = useRouter()
  const [selected, setSelected] = useState<string | null>(null)
  const [lang,     setLang]     = useState<'en' | 'fr'>('en')
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState('')

  const selectedModule = MODULES.find(m => m.id === selected)

  async function start() {
    if (!selected) return
    setLoading(true); setError('')
    try {
      const res  = await fetch('/api/interview/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ module_slug: selected, lang }),
      })
      const data = await res.json()
      if (!res.ok) {
        if (data.upgrade) { router.push('/pricing?reason=upgrade'); return }
        setError(data.error ?? 'Failed to start. Try again.'); setLoading(false); return
      }
      router.push(`/interview/session?id=${data.sessionId}&lang=${lang}&module=${selected}`)
    } catch {
      setError('Network error. Check your connection.')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#F8F9FB]" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>

      {/* Nav */}
      <nav className="bg-white border-b border-[#E5E7EB]" style={{ boxShadow: '0 1px 3px rgba(0,0,0,.06)' }}>
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#1E2A44] flex items-center justify-center text-white font-bold text-sm shadow-sm">S</div>
            <span className="font-semibold text-[#111827] text-[15px]">Sonne AI</span>
          </Link>
          <Link href="/dashboard" className="text-sm text-[#6B7280] hover:text-[#111827] transition-colors">Dashboard</Link>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10">

        {/* Header */}
        <div className="text-center mb-10">
          <h1 className="text-3xl font-bold text-[#111827] mb-2">Choose a module</h1>
          <p className="text-[#6B7280]">Each module covers 4 sub-skills with adaptive questions and a full diagnostic report.</p>
        </div>

        {/* Language toggle */}
        <div className="flex justify-center mb-8">
          <div className="bg-white border border-[#E5E7EB] rounded-xl p-1 flex gap-1 shadow-sm">
            {(['en','fr'] as const).map(l => (
              <button key={l} onClick={() => setLang(l)}
                className="px-5 py-2 rounded-lg text-sm font-medium transition-all"
                style={{ background: lang === l ? '#1E2A44' : 'transparent', color: lang === l ? 'white' : '#6B7280' }}>
                {l === 'en' ? '🇬🇧 English' : '🇫🇷 Français'}
              </button>
            ))}
          </div>
        </div>

        {/* Module cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
          {MODULES.map(m => {
            const isSelected = selected === m.id
            return (
              <button key={m.id} onClick={() => setSelected(m.id)}
                className="text-left p-5 rounded-xl border-2 transition-all"
                style={{
                  background: isSelected ? '#FFF8EE' : 'white',
                  borderColor: isSelected ? '#F5A524' : '#E5E7EB',
                  boxShadow: isSelected ? '0 0 0 3px rgba(245,165,36,.12)' : '0 1px 3px rgba(0,0,0,.05)',
                  transform: isSelected ? 'translateY(-1px)' : 'none',
                }}>

                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">{m.emoji}</span>
                    {isSelected && <span className="text-[#F5A524] text-lg">✓</span>}
                  </div>
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full"
                    style={{ background: m.tierBg, border: `1px solid ${m.tierBorder}`, color: m.tierColor }}>
                    {m.tier}
                  </span>
                </div>

                <h3 className="font-semibold text-[#111827] text-sm mb-0.5">{m.name}</h3>
                <p className="text-xs text-[#9CA3AF] mb-3">{m.name_fr}</p>

                <div className="space-y-1 mb-3">
                  {m.skills.map(s => (
                    <div key={s} className="flex items-center gap-1.5 text-xs text-[#6B7280]">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#D1D5DB] flex-shrink-0" />
                      {s}
                    </div>
                  ))}
                </div>

                {!m.isPro && (
                  <p className="text-xs text-[#059669] font-medium">✓ Included in free tier</p>
                )}
              </button>
            )
          })}
        </div>

        {/* Selected module summary */}
        {selectedModule && (
          <div className="bg-[#F0FDF4] border border-[#BBF7D0] rounded-xl p-4 mb-6 flex items-start gap-3 animate-slide-up">
            <span className="text-xl">{selectedModule.emoji}</span>
            <div>
              <p className="text-sm font-semibold text-[#065F46]">{selectedModule.name} selected</p>
              <p className="text-xs text-[#059669] mt-0.5">{selectedModule.why}</p>
            </div>
          </div>
        )}

        {error && (
          <div className="bg-[#FEF2F2] border border-[#FECACA] rounded-xl p-4 mb-5 text-sm text-[#DC2626] flex justify-between items-center">
            {error}
            <button onClick={() => setError('')} className="text-[#DC2626]/50 hover:text-[#DC2626]">×</button>
          </div>
        )}

        {/* Start button */}
        <button onClick={start} disabled={!selected || loading}
          className="w-full py-4 rounded-xl text-base font-semibold transition-all shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
          style={{
            background: selected ? '#F5A524' : '#E5E7EB',
            color: selected ? '#17140F' : '#9CA3AF',
            boxShadow: selected ? '0 4px 14px rgba(245,165,36,.3)' : 'none',
          }}>
          {loading ? (
            <span className="flex items-center justify-center gap-3">
              <span style={{ width:18,height:18,border:'2.5px solid rgba(255,255,255,.3)',borderTopColor:'white',borderRadius:'50%',animation:'spin 1s linear infinite',display:'inline-block' }} />
              Starting your interview...
            </span>
          ) : selected ? (
            `Start interview — ${selectedModule?.name} →`
          ) : (
            'Select a module above to start'
          )}
        </button>

        <p className="text-center text-sm text-[#9CA3AF] mt-4">
          You can practice in English or French. The interview adapts to your specific answers.
        </p>

        {/* Free tier info */}
        <div className="mt-6 bg-white border border-[#E5E7EB] rounded-xl p-4 text-center">
          <p className="text-sm text-[#6B7280]">
            <span className="font-medium text-[#111827]">Free tier:</span> CV diagnostic + 1 RAG session · headline score.{' '}
            <Link href="/pricing" className="text-[#F5A524] hover:underline font-medium">Upgrade for unlimited access →</Link>
          </p>
        </div>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg) } }
        @keyframes slideUp { from { opacity:0; transform:translateY(8px) } to { opacity:1; transform:translateY(0) } }
        .animate-slide-up { animation: slideUp .25s ease; }
      `}</style>
    </div>
  )
}
