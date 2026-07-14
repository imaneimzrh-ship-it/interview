import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'AI Resume Scoring Tool for AI Engineers | Sonne AI',
  description: 'Score your CV against 5 signals AI hiring managers screen for. Instant resume diagnostic for Applied AI, LLM, and MLOps engineer roles. Free, no card required.',
}

export default function AIResumeScoringPage() {
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
          FREE · INSTANT RESULTS · AI-POWERED
        </div>

        <h1 className="text-4xl sm:text-5xl font-bold text-[#17140F] leading-[1.1] tracking-tight mb-5"
          style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
          AI Resume Scoring Tool
        </h1>

        <p className="text-lg text-[#7A7267] max-w-xl mx-auto mb-10 leading-relaxed">
          Most AI engineer CVs fail the screen — not because of skills, but because they're not framed right. See how yours scores in 30 seconds.
        </p>

        <Link href="/cv?source=ads-ai-resume-scoring"
          className="inline-flex items-center justify-center gap-2 text-base font-bold px-8 py-3.5 rounded-xl transition-all shadow-md mb-6"
          style={{ background: '#F5A524', color: '#17140F', fontFamily: "'Space Grotesk', sans-serif", boxShadow: '0 4px 14px rgba(245,165,36,.35)' }}>
          Check My Resume Score →
        </Link>

        <div className="flex items-center justify-center gap-5 text-sm text-[#7A7267]">
          <span className="flex items-center gap-1.5"><span style={{ color: '#2E7D5B' }}>✓</span> Free, no card</span>
          <span className="flex items-center gap-1.5"><span style={{ color: '#2E7D5B' }}>✓</span> 30-second diagnostic</span>
          <span className="flex items-center gap-1.5"><span style={{ color: '#2E7D5B' }}>✓</span> AI & ML roles</span>
        </div>
      </section>

      {/* Scoring signals */}
      <section className="max-w-3xl mx-auto px-4 sm:px-6 py-12 border-t border-[#E7E2D8]">
        <h2 className="text-xl font-bold text-[#17140F] mb-6 text-center" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
          5 signals your score is based on
        </h2>
        <div className="space-y-3">
          {[
            ['01', 'AI/ML skill visibility', 'Are the right keywords visible within the first 10 seconds of a recruiter scan?'],
            ['02', 'Impact framing', 'Do your bullet points lead with outcomes, not just duties?'],
            ['03', 'Seniority signals', 'Does your CV communicate scope of ownership and scale of systems?'],
            ['04', 'Role alignment', 'Is it clear which AI engineer role this CV is optimised for?'],
            ['05', 'Presentation', 'Length, density, structure — do they match the role\'s expectations?'],
          ].map(([num, label, desc]) => (
            <div key={num} className="bg-white border border-[#E7E2D8] rounded-xl p-4 flex gap-4">
              <span className="text-sm font-mono text-[#F5A524] font-bold mt-0.5 shrink-0">{num}</span>
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
        <p className="text-sm text-[#7A7267] mb-4">Built for Applied AI · LLM Engineer · MLOps · Automation Engineer roles</p>
        <Link href="/cv?source=ads-ai-resume-scoring"
          className="inline-flex items-center justify-center gap-2 text-base font-bold px-8 py-3.5 rounded-xl transition-all shadow-md"
          style={{ background: '#F5A524', color: '#17140F', fontFamily: "'Space Grotesk', sans-serif", boxShadow: '0 4px 14px rgba(245,165,36,.35)' }}>
          Check My Resume Score →
        </Link>
      </section>

    </div>
  )
}
