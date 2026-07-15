import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Mock Interview AI Practice for AI Engineers | Sonne AI',
  description: 'AI-powered mock interview practice for RAG, agents, and MLOps. Adaptive follow-ups, voice mode, sub-skill diagnostics. 3 free sessions, no card required.',
}

export default function MockInterviewAIPage() {
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
          ADAPTIVE · VOICE MODE · 3 FREE SESSIONS
        </div>

        <h1 className="text-4xl sm:text-5xl font-bold text-[#17140F] leading-[1.1] tracking-tight mb-5"
          style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
          Mock Interview AI Practice
        </h1>

        <p className="text-lg text-[#7A7267] max-w-xl mx-auto mb-10 leading-relaxed">
          Practice with an AI that pushes back like a real interviewer. Adaptive follow-up questions, voice mode, and a full sub-skill diagnostic after every session.
        </p>

        <Link href="/signup?source=ads-mock-interview-ai"
          className="inline-flex items-center justify-center gap-2 text-base font-bold px-8 py-3.5 rounded-xl transition-all shadow-md mb-6"
          style={{ background: '#F5A524', color: '#17140F', fontFamily: "'Space Grotesk', sans-serif", boxShadow: '0 4px 14px rgba(245,165,36,.35)' }}>
          Try a Mock Interview →
        </Link>

        <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-sm text-[#7A7267]">
          <span className="flex items-center gap-1.5"><span style={{ color: '#2E7D5B' }}>✓</span> 3 free sessions</span>
          <span className="flex items-center gap-1.5"><span style={{ color: '#2E7D5B' }}>✓</span> No card required</span>
          <span className="flex items-center gap-1.5"><span style={{ color: '#2E7D5B' }}>✓</span> Bilingual EN & FR</span>
        </div>
      </section>

      {/* Features */}
      <section className="max-w-3xl mx-auto px-4 sm:px-6 py-12 border-t border-[#E7E2D8]">
        <h2 className="text-xl font-bold text-[#17140F] mb-6 text-center" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
          What makes it different
        </h2>
        <div className="space-y-3">
          {[
            ['Adaptive follow-ups', 'The AI adjusts question depth based on your answers — so you can\'t just memorise bullet points.'],
            ['Voice mode', 'Practice speaking your answers out loud, under real interview conditions.'],
            ['Sub-skill diagnostic', 'After every session you get a breakdown by sub-skill: where you\'re strong, where you\'re losing points.'],
            ['Full topic coverage', 'RAG, agent orchestration, LLM evaluation, MLOps, and coding exercises — the complete AI engineer loop.'],
            ['Bilingual', 'Switch between English and French at any point — same quality, same depth.'],
          ].map(([label, desc]) => (
            <div key={label} className="bg-white border border-[#E7E2D8] rounded-xl p-4 flex gap-3">
              <span className="text-[#2E7D5B] mt-0.5 shrink-0">✓</span>
              <div>
                <div className="text-sm font-semibold text-[#17140F] mb-0.5">{label}</div>
                <div className="text-sm text-[#7A7267]">{desc}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA repeat */}
      <section className="max-w-3xl mx-auto px-4 sm:px-6 py-12 text-center">
        <p className="text-sm text-[#7A7267] mb-4">For Applied AI · LLM Engineer · MLOps · Automation Engineer roles</p>
        <Link href="/signup?source=ads-mock-interview-ai"
          className="inline-flex items-center justify-center gap-2 text-base font-bold px-8 py-3.5 rounded-xl transition-all shadow-md"
          style={{ background: '#F5A524', color: '#17140F', fontFamily: "'Space Grotesk', sans-serif", boxShadow: '0 4px 14px rgba(245,165,36,.35)' }}>
          Try a Mock Interview →
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
