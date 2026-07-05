import Link from 'next/link'
import { CURRENCY, FREE_TIER, PRO_TIER } from '@/lib/pricing'

export default function Home() {
  return (
    <div className="min-h-screen" style={{ background: '#FBFAF7', fontFamily: "'Inter', system-ui, sans-serif" }}>

      {/* Nav */}
      <nav className="sticky top-0 z-50 border-b border-[#E7E2D8]" style={{ background: 'rgba(251,250,247,.92)', backdropFilter: 'blur(12px)' }}>
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-[#1E2A44] flex items-center justify-center">
              <SunMark />
            </div>
            <span className="font-bold text-[#17140F] text-[15px]" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>Sonne AI</span>
          </div>
          <div className="hidden sm:flex items-center gap-6 text-sm text-[#7A7267]">
            <a href="#modules" className="hover:text-[#17140F] transition-colors">Modules</a>
            <a href="#how" className="hover:text-[#17140F] transition-colors">How it works</a>
            <Link href="/pricing" className="hover:text-[#17140F] transition-colors">Pricing</Link>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/login" className="text-sm text-[#7A7267] hover:text-[#17140F] transition-colors hidden sm:block">Sign in</Link>
            <Link href="/cv" className="text-sm font-semibold bg-[#F5A524] text-[#17140F] px-3.5 py-1.5 rounded-lg hover:bg-[#D98A0B] hover:text-white transition-all shadow-sm"
              style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
              Score my CV →
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-3xl mx-auto px-4 sm:px-6 pt-20 pb-16 text-center">
        <div className="inline-flex items-center gap-2 bg-[#FFF8EE] border border-[#F5A524]/30 text-[#D98A0B] text-xs font-semibold px-3 py-1.5 rounded-full mb-7"
          style={{ fontFamily: "'JetBrains Mono', monospace", letterSpacing: '.04em' }}>
          🇬🇧 EN · 🇫🇷 FR — APPLIED AI ENGINEER · 2026
        </div>

        <h1 className="text-4xl sm:text-5xl font-bold text-[#17140F] leading-[1.1] tracking-tight mb-5"
          style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
          Find out if your CV passes<br />
          <span style={{ color: '#F5A524' }}>the AI engineer screen.</span>
        </h1>

        <p className="text-lg text-[#7A7267] max-w-xl mx-auto mb-4 leading-relaxed">
          Score your CV against the 5 signals hiring managers actually care about. Then practice the exact interview loop — adaptive, bilingual, sub-skill diagnostic.
        </p>

        <p className="text-sm text-[#7A7267] mb-10">Free CV diagnostic included with every account. Takes 30 seconds.</p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center mb-6">
          <Link href="/cv"
            className="inline-flex items-center justify-center gap-2 text-base font-bold px-8 py-3.5 rounded-xl transition-all shadow-md"
            style={{ background: '#F5A524', color: '#17140F', fontFamily: "'Space Grotesk', sans-serif", boxShadow: '0 4px 14px rgba(245,165,36,.35)' }}>
            Score my CV free →
          </Link>
          <Link href="/app/start"
            className="inline-flex items-center justify-center gap-2 text-base font-medium px-8 py-3.5 rounded-xl border border-[#E7E2D8] hover:border-[#C7C2B8] transition-all"
            style={{ background: 'white', color: '#374151' }}>
            Practice interview →
          </Link>
        </div>

        <div className="flex items-center justify-center gap-5 text-sm text-[#7A7267]">
          <span className="flex items-center gap-1.5"><span style={{ color: '#2E7D5B' }}>✓</span> Free plan — no card</span>
          <span className="flex items-center gap-1.5"><span style={{ color: '#2E7D5B' }}>✓</span> Sign up in 30 seconds</span>
          <span className="flex items-center gap-1.5"><span style={{ color: '#2E7D5B' }}>✓</span> EN & FR</span>
        </div>
      </section>

      {/* CV diagnostic preview */}
      <section className="max-w-3xl mx-auto px-4 sm:px-6 pb-20">
        <div className="bg-white rounded-2xl border border-[#E7E2D8] shadow-sm overflow-hidden">
          <div className="bg-[#1E2A44] px-6 py-4 flex items-center gap-3">
            <div className="flex gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-[#FF5F57]"/><div className="w-2.5 h-2.5 rounded-full bg-[#FEBC2E]"/><div className="w-2.5 h-2.5 rounded-full bg-[#28C840]"/></div>
            <span className="text-[#EEF1F6] text-xs font-mono">cv-diagnostic.json</span>
          </div>
          <div className="p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="text-4xl font-bold" style={{ fontFamily: "'JetBrains Mono', monospace", color: '#2E7D5B' }}>72</div>
              <div>
                <div className="text-sm font-semibold text-[#17140F]" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>Overall readiness</div>
                <div className="text-xs text-[#7A7267]">Applied AI Engineer · EN</div>
              </div>
              <div className="ml-auto text-xs font-bold px-2.5 py-1 rounded-full" style={{ background: '#F0FDF4', color: '#2E7D5B', border: '1px solid #BBF7D0' }}>Strong</div>
            </div>
            <div className="w-full h-2 rounded-full bg-[#E7E2D8] overflow-hidden">
              <div className="h-full rounded-full" style={{ width: '72%', background: 'linear-gradient(90deg, #2E7D5B, #4ade80)' }} />
            </div>
            <div className="space-y-2">
              {[
                { icon:'🚀', label:'Production Evidence', score: 80, band:'Strong',     color:'#2E7D5B', bg:'#F0FDF4', border:'#BBF7D0' },
                { icon:'🔍', label:'RAG Depth',           score: 75, band:'Strong',     color:'#2E7D5B', bg:'#F0FDF4', border:'#BBF7D0' },
                { icon:'🧪', label:'Evaluation Literacy', score: 45, band:'Developing', color:'#C77D2E', bg:'#FFFBEB', border:'#FDE68A' },
                { icon:'🕵️', label:'Agentic Experience',  score: 60, band:'Developing', color:'#C77D2E', bg:'#FFFBEB', border:'#FDE68A' },
                { icon:'⚙️', label:'Cost & Safety',       score: 30, band:'Gap',        color:'#B24C3F', bg:'#FEF2F2', border:'#FECACA' },
              ].map(s => (
                <div key={s.label} className="flex items-center gap-3">
                  <span className="w-5 text-base">{s.icon}</span>
                  <span className="text-sm text-[#17140F] flex-1">{s.label}</span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: s.bg, color: s.color, border: `1px solid ${s.border}` }}>{s.band}</span>
                  <span className="text-xs font-mono w-6 text-right" style={{ color: s.color }}>{s.score}</span>
                </div>
              ))}
            </div>
            <div className="mt-3 pt-3 border-t border-[#E7E2D8]">
              <p className="text-xs text-[#7A7267]"><span className="font-semibold text-[#C77D2E]">Biggest gap:</span> No evidence of offline evals or regression gates — your strongest differentiator in 2026 hiring.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Modules */}
      <section id="modules" className="max-w-5xl mx-auto px-4 sm:px-6 py-16 border-t border-[#E7E2D8]">
        <div className="text-center mb-10">
          <p className="text-xs font-semibold text-[#7A7267] uppercase tracking-widest mb-2" style={{ fontFamily: "'JetBrains Mono', monospace" }}>4 MODULES</p>
          <h2 className="text-2xl sm:text-3xl font-bold text-[#17140F]" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>One role, four skill areas</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[
            { emoji:'🔍', name:'RAG System Design',         desc:'Chunking · Hybrid retrieval · Reranking · Retrieval diagnosis', free:true },
            { emoji:'🕵️', name:'Agentic Systems',            desc:'Planner & tool design · Memory · Multi-agent failures · Evaluation', free:false },
            { emoji:'🧪', name:'Evaluation & Observability', desc:'Offline evals · LLM-as-judge · Online evals · Hallucination metrics', free:false },
            { emoji:'⚙️', name:'Cost, Latency & Safety',     desc:'Token budgets · Model routing · Streaming · Guardrails', free:false },
          ].map(m => (
            <div key={m.name} className="bg-white rounded-xl border border-[#E7E2D8] p-5 shadow-sm">
              <div className="flex items-start justify-between mb-3">
                <span className="text-2xl">{m.emoji}</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: m.free ? '#F0FDF4' : '#EEF1F6', color: m.free ? '#2E7D5B' : '#1E2A44', border: m.free ? '1px solid #BBF7D0' : '1px solid #C7D0E0', fontFamily: "'JetBrains Mono', monospace" }}>
                  {m.free ? 'FREE' : 'PRO'}
                </span>
              </div>
              <div className="text-sm font-bold text-[#17140F] mb-1" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>{m.name}</div>
              <div className="text-xs text-[#7A7267]">{m.desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="max-w-3xl mx-auto px-4 sm:px-6 py-16 border-t border-[#E7E2D8]">
        <div className="text-center mb-10">
          <h2 className="text-2xl sm:text-3xl font-bold text-[#17140F]" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>How it works</h2>
        </div>
        <div className="space-y-4">
          {[
            { step:'01', title:'Score your CV',       desc:'Paste your CV — get a score on 5 signals in 30 seconds. Included on the free plan.', href:'/cv', cta:'Score my CV →', sun:true },
            { step:'02', title:'Practice the module', desc:'Start with the recommended module. 4 sub-skills, adaptive probing, adaptive follow-ups.', href:'/app/start', cta:'Start session →', sun:false },
            { step:'03', title:'Get your diagnostic', desc:'Per-sub-skill scores, evidence quotes, and one concrete fix for each gap.', href:'/app/history', cta:'View example →', sun:false },
          ].map(s => (
            <div key={s.step} className="flex gap-5 bg-white rounded-xl border border-[#E7E2D8] p-5 shadow-sm items-start">
              <div className="text-base font-bold flex-shrink-0 mt-0.5" style={{ fontFamily: "'JetBrains Mono', monospace", color: s.sun ? '#F5A524' : '#7A7267' }}>{s.step}</div>
              <div className="flex-1">
                <div className="text-sm font-bold text-[#17140F] mb-1" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>{s.title}</div>
                <p className="text-sm text-[#7A7267]">{s.desc}</p>
              </div>
              <Link href={s.href} className="text-xs font-medium text-[#1E2A44] hover:text-[#F5A524] transition-colors flex-shrink-0 whitespace-nowrap hidden sm:block">{s.cta}</Link>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing preview */}
      <section id="pricing" className="max-w-3xl mx-auto px-4 sm:px-6 py-16 border-t border-[#E7E2D8]">
        <div className="text-center mb-10">
          <h2 className="text-2xl sm:text-3xl font-bold text-[#17140F]" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>Simple pricing</h2>
          <p className="text-[#7A7267] text-sm mt-2">Start free. Upgrade when you need more modules.</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Free */}
          <div className="bg-white rounded-xl border border-[#E7E2D8] p-6 shadow-sm">
            <div className="text-sm font-bold text-[#7A7267] mb-1" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>{FREE_TIER.name}</div>
            <div className="text-3xl font-bold text-[#17140F] mb-4" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>{CURRENCY}0</div>
            <ul className="space-y-2 text-sm text-[#7A7267] mb-6">
              {FREE_TIER.features.map(f => (
                <li key={f} className="flex gap-2"><span style={{ color: '#2E7D5B' }}>✓</span> {f}</li>
              ))}
            </ul>
            <Link href={FREE_TIER.ctaHref} className="block text-center text-sm font-medium border border-[#E7E2D8] text-[#374151] px-4 py-2.5 rounded-lg hover:bg-[#F5F4F0] transition-all">
              {FREE_TIER.cta} →
            </Link>
          </div>
          {/* Pro */}
          <div className="rounded-xl border-2 border-[#F5A524] p-6 shadow-md relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #1E2A44 0%, #2d3f61 100%)' }}>
            <div className="absolute top-3 right-3 text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#F5A524] text-[#17140F]" style={{ fontFamily: "'JetBrains Mono', monospace" }}>POPULAR</div>
            <div className="text-sm font-bold text-[#EEF1F6] mb-1" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>{PRO_TIER.name}</div>
            <div className="text-3xl font-bold text-white mb-4" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
              {CURRENCY}{PRO_TIER.price}<span className="text-sm font-normal text-[#C7D0E0]">/mo</span>
            </div>
            <ul className="space-y-2 text-sm text-[#C7D0E0] mb-6">
              {PRO_TIER.features.map(f => (
                <li key={f} className="flex gap-2"><span style={{ color: '#F5A524' }}>✓</span> {f}</li>
              ))}
            </ul>
            <Link href={PRO_TIER.ctaHref} className="block text-center text-sm font-bold bg-[#F5A524] text-[#17140F] px-4 py-2.5 rounded-lg hover:bg-[#D98A0B] transition-all shadow-sm"
              style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
              {PRO_TIER.cta}
            </Link>
          </div>
        </div>
        <p className="text-center text-xs text-[#7A7267] mt-4">Cancel anytime. No surprise charges.</p>
      </section>

      {/* Footer */}
      <footer className="border-t border-[#E7E2D8] py-8">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#7A7267]">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded-md bg-[#1E2A44] flex items-center justify-center"><SunMark /></div>
            <span>Sonne AI © 2026</span>
          </div>
          <div className="flex gap-5">
            <Link href="/cv"      className="hover:text-[#17140F] transition-colors">CV Diagnostic</Link>
            <Link href="/pricing" className="hover:text-[#17140F] transition-colors">Pricing</Link>
            <Link href="/login"   className="hover:text-[#17140F] transition-colors">Sign in</Link>
            <Link href="/privacy" className="hover:text-[#17140F] transition-colors">Privacy</Link>
            <Link href="/terms"   className="hover:text-[#17140F] transition-colors">Terms</Link>
          </div>
        </div>
      </footer>

      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:.5}}`}</style>
    </div>
  )
}

function SunMark() {
  return (
    <svg width="12" height="12" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="7" cy="7" r="3" fill="#F5A524"/>
      {[0,45,90,135,180,225,270,315].map((deg, i) => {
        const r = Math.PI * deg / 180
        return <line key={i} x1={7 + 4*Math.cos(r)} y1={7 + 4*Math.sin(r)} x2={7 + 5.5*Math.cos(r)} y2={7 + 5.5*Math.sin(r)} stroke="#F5A524" strokeWidth="1.2" strokeLinecap="round"/>
      })}
    </svg>
  )
}
