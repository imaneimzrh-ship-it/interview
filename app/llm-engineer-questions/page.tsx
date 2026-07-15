import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'LLM Engineer Interview Questions — Real Candidate Database | Sonne AI',
  description: 'Browse real LLM engineer interview questions reported by candidates — RAG, agent design, evaluation, MLOps. Free community database + adaptive AI practice.',
}

export default function LLMEngineerQuestionsPage() {
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
          REPORTED BY REAL CANDIDATES · FREE · NO LOGIN TO BROWSE
        </div>

        <h1 className="text-4xl sm:text-5xl font-bold text-[#17140F] leading-[1.1] tracking-tight mb-5"
          style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
          LLM Engineer Interview Questions
        </h1>

        <p className="text-lg text-[#7A7267] max-w-xl mx-auto mb-10 leading-relaxed">
          Community database of real questions reported by candidates who sat the interview. Filtered by role and round — RAG, agent design, evaluation, MLOps, and more.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center mb-6">
          <Link href="/community?source=ads-llm-questions"
            className="inline-flex items-center justify-center gap-2 text-base font-bold px-8 py-3.5 rounded-xl transition-all shadow-md"
            style={{ background: '#F5A524', color: '#17140F', fontFamily: "'Space Grotesk', sans-serif", boxShadow: '0 4px 14px rgba(245,165,36,.35)' }}>
            Browse Free Questions →
          </Link>
          <Link href="/signup?source=ads-llm-questions"
            className="inline-flex items-center justify-center gap-2 text-base font-medium px-8 py-3.5 rounded-xl border border-[#E7E2D8] hover:border-[#C7C2B8] transition-all"
            style={{ background: 'white', color: '#374151' }}>
            Practice with AI →
          </Link>
        </div>

        <div className="flex items-center justify-center gap-5 text-sm text-[#7A7267]">
          <span className="flex items-center gap-1.5"><span style={{ color: '#2E7D5B' }}>✓</span> Free to browse</span>
          <span className="flex items-center gap-1.5"><span style={{ color: '#2E7D5B' }}>✓</span> Real candidate reports</span>
          <span className="flex items-center gap-1.5"><span style={{ color: '#2E7D5B' }}>✓</span> RAG · Agents · MLOps</span>
        </div>
      </section>

      {/* Topics */}
      <section className="max-w-3xl mx-auto px-4 sm:px-6 py-12 border-t border-[#E7E2D8]">
        <h2 className="text-xl font-bold text-[#17140F] mb-6 text-center" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
          Topics covered in the database
        </h2>
        <div className="flex flex-wrap gap-2 justify-center">
          {[
            'RAG system design', 'Chunking strategy', 'Vector similarity', 'Re-ranking',
            'Agent orchestration', 'Tool calling', 'Memory patterns', 'Multi-agent systems',
            'LLM evaluation', 'RAGAS metrics', 'LLM-as-judge', 'Prompt engineering',
            'MLOps & serving', 'Latency optimisation', 'Fine-tuning', 'Safety & alignment',
          ].map(tag => (
            <span key={tag} className="bg-white border border-[#E7E2D8] text-sm text-[#374151] px-3 py-1.5 rounded-full">
              {tag}
            </span>
          ))}
        </div>
      </section>

      {/* CTA repeat */}
      <section className="max-w-3xl mx-auto px-4 sm:px-6 py-12 text-center">
        <p className="text-sm text-[#7A7267] mb-4">Sign up free to contribute your own reports and practice with the AI</p>
        <Link href="/community?source=ads-llm-questions"
          className="inline-flex items-center justify-center gap-2 text-base font-bold px-8 py-3.5 rounded-xl transition-all shadow-md"
          style={{ background: '#F5A524', color: '#17140F', fontFamily: "'Space Grotesk', sans-serif", boxShadow: '0 4px 14px rgba(245,165,36,.35)' }}>
          Browse Free Questions →
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
