import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'AI Engineer Interview Prep — Adaptive Mock Interviews | Sonne AI',
  description: 'Practice RAG, agent design, evaluation, and MLOps with an adaptive AI interviewer. Sub-skill diagnostics, voice mode, bilingual (EN/FR). 3 free sessions, no card required.',
}

export default function AIEngineerInterviewPrepPage() {
  return (
    <div className="min-h-screen" style={{ background: '#FBFAF7', fontFamily: "'Inter', system-ui, sans-serif" }}>

      {/* Nav */}
      <nav className="sticky top-0 z-50 border-b border-[#E7E2D8]" style={{ background: 'rgba(251,250,247,.92)', backdropFilter: 'blur(12px)' }}>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-[#1E2A44] flex items-center justify-center">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><circle cx="7" cy="7" r="5" stroke="#F5A524" strokeWidth="1.5"/><circle cx="7" cy="7" r="2" fill="#F5A524"/></svg>
            </div>
            <span className="font-bold text-[#17140F] text-[15px]" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>Sonne AI</span>
          </Link>
          <Link href="/signup"
            className="text-sm font-semibold bg-[#F5A524] text-[#17140F] px-3.5 py-1.5 rounded-lg hover:bg-[#D98A0B] hover:text-white transition-all shadow-sm"
            style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
            Try it free →
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-3xl mx-auto px-4 sm:px-6 pt-20 pb-16 text-center">
        <div className="inline-flex items-center gap-2 bg-[#FFF8EE] border border-[#F5A524]/30 text-[#D98A0B] text-xs font-semibold px-3 py-1.5 rounded-full mb-7"
          style={{ fontFamily: "'JetBrains Mono', monospace", letterSpacing: '.04em' }}>
          RAG · AGENTS · EVALUATION · MLOPS · EN & FR
        </div>

        <h1 className="text-4xl sm:text-5xl font-bold text-[#17140F] leading-[1.1] tracking-tight mb-5"
          style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
          AI Engineer Interview Prep
        </h1>

        <p className="text-lg text-[#7A7267] max-w-xl mx-auto mb-10 leading-relaxed">
          Adaptive AI interviewer that pushes back like a real panel. Covers the exact loop for Applied AI, LLM Engineer, and MLOps roles — with sub-skill diagnostics after every session.
        </p>

        <Link href="/signup?source=ads-ai-engineer-interview-prep"
          className="inline-flex items-center justify-center gap-2 text-base font-bold px-8 py-3.5 rounded-xl transition-all shadow-md mb-6"
          style={{ background: '#F5A524', color: '#17140F', fontFamily: "'Space Grotesk', sans-serif", boxShadow: '0 4px 14px rgba(245,165,36,.35)' }}>
          Try It Free →
        </Link>

        <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-sm text-[#7A7267]">
          <span className="flex items-center gap-1.5"><span style={{ color: '#2E7D5B' }}>✓</span> 3 free sessions</span>
          <span className="flex items-center gap-1.5"><span style={{ color: '#2E7D5B' }}>✓</span> No card required</span>
          <span className="flex items-center gap-1.5"><span style={{ color: '#2E7D5B' }}>✓</span> EN & FR</span>
        </div>
      </section>

      {/* What's covered */}
      <section className="max-w-3xl mx-auto px-4 sm:px-6 py-12 border-t border-[#E7E2D8]">
        <h2 className="text-xl font-bold text-[#17140F] mb-6 text-center" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
          What the prep covers
        </h2>
        <div className="grid sm:grid-cols-2 gap-4">
          {[
            { label: 'RAG system design', desc: 'Chunking, retrieval, re-ranking, hybrid search, evaluation.' },
            { label: 'Agent & tool design', desc: 'Orchestration patterns, tool calling, failure handling, memory.' },
            { label: 'LLM evaluation', desc: 'Ragas, LLM-as-judge, evals at scale, safety and alignment.' },
            { label: 'MLOps & deployment', desc: 'Serving, latency, monitoring, cost optimisation, CI/CD.' },
            { label: 'Adaptive follow-ups', desc: 'The AI probes your answer and adjusts depth in real time.' },
            { label: 'Voice mode', desc: 'Practice speaking your answers under interview conditions.' },
          ].map(item => (
            <div key={item.label} className="bg-white border border-[#E7E2D8] rounded-xl p-4">
              <div className="text-sm font-semibold text-[#17140F] mb-1">{item.label}</div>
              <div className="text-sm text-[#7A7267]">{item.desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA repeat */}
      <section className="max-w-3xl mx-auto px-4 sm:px-6 py-12 text-center">
        <p className="text-sm text-[#7A7267] mb-4">Full sub-skill diagnostic report after every session</p>
        <Link href="/signup?source=ads-ai-engineer-interview-prep"
          className="inline-flex items-center justify-center gap-2 text-base font-bold px-8 py-3.5 rounded-xl transition-all shadow-md"
          style={{ background: '#F5A524', color: '#17140F', fontFamily: "'Space Grotesk', sans-serif", boxShadow: '0 4px 14px rgba(245,165,36,.35)' }}>
          Try It Free →
        </Link>
      </section>

      <footer className="border-t border-[#E7E2D8] py-6 mt-4">
        <div className="max-w-3xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-[#7A7267]">
          <span>© 2026 Sonne AI</span>
          <div className="flex gap-5">
            <a href="/privacy" className="hover:text-[#17140F] transition-colors">Privacy Policy</a>
            <a href="/terms"   className="hover:text-[#17140F] transition-colors">Terms of Service</a>
          </div>
        </div>
      </footer>

    </div>
  )
}
