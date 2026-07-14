import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Technical Interview Practice Tool for AI Engineers | Sonne AI',
  description: 'Adaptive technical interview practice for AI/ML engineers. Real coding exercises, system design questions, and sub-skill diagnostics. 3 free sessions, no card.',
}

export default function TechnicalInterviewPracticePage() {
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
          CODING · SYSTEM DESIGN · RAG · AGENTS · MLOPS
        </div>

        <h1 className="text-4xl sm:text-5xl font-bold text-[#17140F] leading-[1.1] tracking-tight mb-5"
          style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
          Technical Interview Practice Tool
        </h1>

        <p className="text-lg text-[#7A7267] max-w-xl mx-auto mb-10 leading-relaxed">
          Practice the full technical loop for AI engineer roles — real coding exercises, system design, and adaptive Q&A. Sub-skill breakdown after every session.
        </p>

        <Link href="/signup?source=ads-technical-interview-practice"
          className="inline-flex items-center justify-center gap-2 text-base font-bold px-8 py-3.5 rounded-xl transition-all shadow-md mb-6"
          style={{ background: '#F5A524', color: '#17140F', fontFamily: "'Space Grotesk', sans-serif", boxShadow: '0 4px 14px rgba(245,165,36,.35)' }}>
          Start Practicing Free →
        </Link>

        <div className="flex items-center justify-center gap-5 text-sm text-[#7A7267]">
          <span className="flex items-center gap-1.5"><span style={{ color: '#2E7D5B' }}>✓</span> 3 free sessions</span>
          <span className="flex items-center gap-1.5"><span style={{ color: '#2E7D5B' }}>✓</span> No card required</span>
          <span className="flex items-center gap-1.5"><span style={{ color: '#2E7D5B' }}>✓</span> Sub-skill diagnostic</span>
        </div>
      </section>

      {/* Practice areas */}
      <section className="max-w-3xl mx-auto px-4 sm:px-6 py-12 border-t border-[#E7E2D8]">
        <h2 className="text-xl font-bold text-[#17140F] mb-6 text-center" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
          What you practice
        </h2>
        <div className="grid sm:grid-cols-3 gap-4">
          {[
            { label: 'Coding exercises', desc: 'Real bug-fix and implementation tasks, graded by AI with rubric feedback.' },
            { label: 'System design', desc: 'RAG pipelines, agent architectures, evaluation frameworks, MLOps setups.' },
            { label: 'Adaptive Q&A', desc: 'The AI follows up on your answers like a real interviewer — no two sessions are the same.' },
            { label: 'Sub-skill breakdown', desc: 'After each session, see exactly which sub-skills to work on next.' },
            { label: 'Voice mode', desc: 'Practice out loud — answer design questions as if you\'re in a live panel.' },
            { label: 'Bilingual', desc: 'Full parity in English and French — same depth, same grading.' },
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
        <p className="text-sm text-[#7A7267] mb-4">Built for Applied AI · LLM Engineer · MLOps · Automation Engineer roles</p>
        <Link href="/signup?source=ads-technical-interview-practice"
          className="inline-flex items-center justify-center gap-2 text-base font-bold px-8 py-3.5 rounded-xl transition-all shadow-md"
          style={{ background: '#F5A524', color: '#17140F', fontFamily: "'Space Grotesk', sans-serif", boxShadow: '0 4px 14px rgba(245,165,36,.35)' }}>
          Start Practicing Free →
        </Link>
      </section>

    </div>
  )
}
