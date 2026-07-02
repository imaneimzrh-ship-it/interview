import Link from 'next/link'

const MODULES = [
  { id: 'rag_system_design', emoji: '🔍', en: 'RAG System Design', fr: 'Conception de Systèmes RAG', en_desc: 'Chunking, retrieval quality, reranking, freshness', fr_desc: 'Découpage, qualité de récupération, reclassement, fraîcheur' },
  { id: 'agent_orchestration', emoji: '🕵️', en: 'Agent Orchestration', fr: 'Orchestration d\'Agents', en_desc: 'Tool use, planning, failure handling, multi-agent', fr_desc: 'Utilisation d\'outils, planification, gestion des pannes' },
  { id: 'evaluation_testing', emoji: '🧪', en: 'Evaluation & Testing', fr: 'Évaluation & Tests', en_desc: 'Eval design, hallucination detection, offline/online', fr_desc: 'Conception de l\'évaluation, détection des hallucinations' },
  { id: 'production_mlops', emoji: '⚙️', en: 'Production / MLOps', fr: 'Production / MLOps', en_desc: 'Monitoring, cost, latency, versioning, rollback', fr_desc: 'Surveillance, coût, latence, versionnement, retour arrière' },
]

export default function Home() {
  return (
    <div className="min-h-screen bg-[#09090C]" style={{ fontFamily: 'Inter, sans-serif' }}>
      {/* Nav */}
      <nav className="sticky top-0 z-50 border-b border-[#1C1D28] bg-[rgba(9,9,12,0.9)] backdrop-blur-sm">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-[#4776F7] flex items-center justify-center text-white text-xs font-bold">S</div>
            <span className="font-semibold text-sm text-[#F0F2FA]">Sonne AI Interviewer</span>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/login" className="text-sm text-[#7A829A] hover:text-[#F0F2FA] transition-colors hidden sm:block">Sign in</Link>
            <Link href="/signup" className="bg-[#4776F7] text-white text-xs font-medium px-4 py-2 rounded-lg hover:opacity-90 transition-opacity">
              Start free →
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-4xl mx-auto px-4 pt-20 pb-14 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[rgba(71,118,247,0.1)] border border-[rgba(71,118,247,0.2)] text-xs text-[#4776F7] mb-8">
          <span className="w-1.5 h-1.5 rounded-full bg-[#4776F7] animate-pulse" />
          Applied AI Engineer — one of the fastest-growing roles in 2026
        </div>

        <h1 className="text-4xl sm:text-5xl font-semibold text-[#F0F2FA] leading-[1.1] tracking-tight mb-5">
          The AI engineering interview<br />
          <span className="text-[#4776F7]">that actually adapts to you</span>
        </h1>

        <p className="text-lg text-[#7A829A] max-w-xl mx-auto mb-4 leading-relaxed">
          Practice RAG design, agent orchestration, evaluation, and MLOps with an AI interviewer that reacts to your specific answers — probes shallow claims, pushes back, and tells you exactly what you missed.
        </p>
        <p className="text-sm text-[#4776F7] mb-8 font-medium">Pratique disponible en anglais et en français. / Available in English and French.</p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center mb-5">
          <Link href="/signup" className="bg-[#4776F7] text-white font-medium px-8 py-3 rounded-lg hover:opacity-90 transition-opacity text-base">
            Start free — 1 full session included →
          </Link>
          <Link href="/pricing" className="border border-[#1C1D28] text-[#7A829A] font-medium px-8 py-3 rounded-lg hover:text-[#F0F2FA] transition-colors text-base">
            See pricing
          </Link>
        </div>
        <p className="text-xs text-[#3D4260]">No card required · Free tier: 1 session, any module · No company-specific lock-in</p>
      </section>

      {/* Modules */}
      <section className="max-w-4xl mx-auto px-4 pb-16">
        <p className="text-xs text-[#7A829A] uppercase tracking-widest text-center mb-6">Four modules — one role — deep coverage</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {MODULES.map(m => (
            <div key={m.id} className="bg-[#111218] border border-[#1C1D28] rounded-xl p-5">
              <div className="text-2xl mb-3">{m.emoji}</div>
              <div className="text-sm font-semibold text-[#F0F2FA] mb-1">{m.en} / {m.fr}</div>
              <div className="text-xs text-[#7A829A]">{m.en_desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Differentiators */}
      <section className="max-w-4xl mx-auto px-4 pb-16">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { title: 'Adaptive, not scripted', body: 'The interviewer sees your actual answer. If you say "chunk into 500 tokens" without justification, it asks why. If you nail it, it moves on.' },
            { title: 'Sub-skill diagnosis', body: 'After your session, you know your score on chunking strategy, retrieval quality, reranking, and freshness — not just a single overall number.' },
            { title: 'Grade content, not fluency', body: 'Answer in English or French. The grader evaluates whether you knew your stuff — not how you phrased it.' },
          ].map(f => (
            <div key={f.title} className="bg-[#111218] border border-[#1C1D28] rounded-xl p-5">
              <div className="text-sm font-semibold text-[#F0F2FA] mb-2">{f.title}</div>
              <div className="text-xs text-[#7A829A] leading-relaxed">{f.body}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing */}
      <section className="max-w-3xl mx-auto px-4 pb-20" id="pricing">
        <p className="text-xs text-[#7A829A] uppercase tracking-widest text-center mb-6">Pricing</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-[#111218] border border-[#1C1D28] rounded-xl p-5">
            <div className="text-xs text-[#7A829A] uppercase tracking-widest mb-3">Free</div>
            <div className="text-3xl font-semibold text-[#F0F2FA] mb-4">$0</div>
            <div className="space-y-2 text-xs mb-5">
              {['1 full session, any module','Text modality','Headline diagnostic only'].map(f => (
                <div key={f} className="flex items-center gap-2"><span className="text-[#1DB954]">✓</span><span className="text-[#F0F2FA]">{f}</span></div>
              ))}
            </div>
            <Link href="/signup" className="border border-[#1C1D28] text-xs text-[#7A829A] px-4 py-2.5 rounded-lg hover:text-[#F0F2FA] transition-colors block text-center">
              Start free
            </Link>
          </div>

          <div className="bg-[#111218] border border-[rgba(71,118,247,0.4)] rounded-xl p-5">
            <div className="text-xs text-[#4776F7] uppercase tracking-widest mb-3">Monthly</div>
            <div className="text-3xl font-semibold text-[#F0F2FA] mb-1">$19<span className="text-base font-normal text-[#7A829A]">/mo</span></div>
            <div className="text-xs text-[#7A829A] mb-4">Cancel anytime</div>
            <div className="space-y-2 text-xs mb-5">
              {['Unlimited sessions','All 4 modules','Full sub-skill report','Voice mode (coming soon)','Session history'].map(f => (
                <div key={f} className="flex items-center gap-2"><span className="text-[#4776F7]">✓</span><span className="text-[#F0F2FA]">{f}</span></div>
              ))}
            </div>
            <Link href="/signup?plan=monthly" className="bg-[#4776F7] text-white text-xs font-medium px-4 py-2.5 rounded-lg hover:opacity-90 transition-opacity block text-center">
              Get monthly →
            </Link>
          </div>

          <div className="bg-[#111218] border border-[rgba(232,160,32,0.4)] rounded-xl p-5">
            <div className="text-xs text-[#E8A020] uppercase tracking-widest mb-3">Prep Sprint</div>
            <div className="text-3xl font-semibold text-[#F0F2FA] mb-1">$49</div>
            <div className="text-xs text-[#7A829A] mb-4">6 weeks, one-time payment</div>
            <div className="space-y-2 text-xs mb-5">
              {['Everything in Monthly','6-week window','Perfect for active job search','No recurring billing'].map(f => (
                <div key={f} className="flex items-center gap-2"><span className="text-[#E8A020]">✓</span><span className="text-[#F0F2FA]">{f}</span></div>
              ))}
            </div>
            <Link href="/signup?plan=sprint" className="bg-[#E8A020] text-black text-xs font-semibold px-4 py-2.5 rounded-lg hover:opacity-90 transition-opacity block text-center">
              Get Prep Sprint →
            </Link>
          </div>
        </div>
        <p className="text-center text-xs text-[#3D4260] mt-4">
          Prep Sprint is ideal for a job search: full access for 6 weeks, no subscription commitment.
        </p>
      </section>

      {/* Footer */}
      <footer className="border-t border-[#1C1D28] py-8 text-center">
        <p className="text-xs text-[#3D4260]">
          <Link href="/" className="hover:text-[#7A829A] transition-colors">Sonne AI</Link> ·{' '}
          <Link href="/pricing" className="hover:text-[#7A829A] transition-colors">Pricing</Link> ·{' '}
          <a href="mailto:support@sonneai.com" className="hover:text-[#7A829A] transition-colors">support@sonneai.com</a>
          {' '}· © 2026 Sonne AI · Switzerland 🇨🇭
        </p>
      </footer>
    </div>
  )
}
