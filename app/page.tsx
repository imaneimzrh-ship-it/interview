import Link from 'next/link'

const COMPANIES = [
  { id: 'anthropic', name: 'Anthropic', rounds: ['Written screen', 'ML system design', 'Coding', 'Behavioral'], note: 'Safety-first. Epistemic honesty. High written bar.' },
  { id: 'openai',    name: 'OpenAI',    rounds: ['Recruiter screen', '48h take-home', 'Technical deep-dive', 'Behavioral'], note: 'Shipping mentality. Production at scale.' },
  { id: 'deepmind',  name: 'Google DeepMind', rounds: ['HM screen', 'ML deep-dive', 'Coding', 'Paper discussion', 'Behavioral'], note: 'Research depth. Paper discussions. JAX.' },
  { id: 'meta',      name: 'Meta AI',   rounds: ['Screen', 'AI-enabled coding ★', 'ML system design', 'Behavioral'], note: 'AI at billions-user scale. Open-source culture.' },
]

export default function Home() {
  return (
    <div className="min-h-screen bg-bg">
      {/* Nav */}
      <nav className="sticky top-0 z-50 border-b border-border bg-bg/90 backdrop-blur-sm">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-blue flex items-center justify-center text-white text-xs font-bold">S</div>
            <span className="font-semibold text-sm">Sonne AI</span>
          </Link>
          <div className="hidden sm:flex items-center gap-6 text-sm text-dim">
            <Link href="#how" className="hover:text-bright transition-colors">How it works</Link>
            <Link href="/pricing" className="hover:text-bright transition-colors">Pricing</Link>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/login" className="text-sm text-dim hover:text-bright transition-colors hidden sm:block">Sign in</Link>
            <Link href="/signup" className="btn-blue text-xs px-4 py-2">Start free →</Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-4xl mx-auto px-4 pt-24 pb-16 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-m border border-blue/20 text-xs text-blue mb-8">
          <span className="w-1.5 h-1.5 rounded-full bg-blue animate-pulse" />
          1.6M open AI positions · 3.4× more roles than qualified candidates
        </div>
        <h1 className="text-4xl sm:text-5xl font-semibold text-bright leading-[1.1] tracking-tight mb-5">
          Practice the exact interview<br className="hidden sm:block" />
          <span className="text-blue"> Anthropic and OpenAI run</span>
        </h1>
        <p className="text-lg text-dim max-w-xl mx-auto mb-8 leading-relaxed">
          Not a generic quiz. The real loop — company-specific rounds, real sourced questions, feedback graded on technical correctness not how clearly you spoke.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center mb-6">
          <Link href="/signup" className="btn-blue px-8 py-3 text-base">Start free — 2 sessions included →</Link>
          <Link href="/pricing" className="btn-ghost px-8 py-3 text-base">See pricing</Link>
        </div>
        <p className="text-xs text-dim">No card required · 2 free sessions · Cancel Pro anytime</p>
      </section>

      {/* Company selector demo */}
      <section className="max-w-4xl mx-auto px-4 pb-16" id="how">
        <div className="card p-6">
          <p className="text-xs text-dim uppercase tracking-widest font-medium mb-4">Real loop structure — per company</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {COMPANIES.map(co => (
              <div key={co.id} className="bg-bg border border-border rounded-lg p-4">
                <div className="font-semibold text-sm text-bright mb-2">{co.name}</div>
                <div className="flex flex-wrap gap-1 mb-2">
                  {co.rounds.map((r, i) => (
                    <span key={i} className={`text-xs px-2 py-0.5 rounded-md font-medium ${r.includes('★') ? 'bg-green-m text-green border border-green/20' : r.includes('home') ? 'bg-gold-m text-gold border border-gold/20' : 'bg-blue-m text-blue border border-blue/20'}`}>
                      {r}
                    </span>
                  ))}
                </div>
                <p className="text-xs text-dim">{co.note}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* What's different */}
      <section className="max-w-4xl mx-auto px-4 pb-16">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            {
              title: 'Domain-specific grading',
              body: 'After your RAG answer: "You covered chunk size but skipped hybrid retrieval — that\'s a must-have at Anthropic\'s bar." Not "try to be more specific."',
            },
            {
              title: 'Real sourced questions',
              body: 'Questions from 500+ Glassdoor, Blind, and Reddit candidate reports — not generated. The source is linked next to each question.',
            },
            {
              title: 'Company-specific loop',
              body: 'Anthropic has a written screen before ML system design. OpenAI has a 48h take-home. We simulate the actual loop, not isolated questions.',
            },
          ].map(f => (
            <div key={f.title} className="card p-5">
              <div className="text-sm font-semibold text-bright mb-2">{f.title}</div>
              <div className="text-xs text-dim leading-relaxed">{f.body}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Sample question */}
      <section className="max-w-4xl mx-auto px-4 pb-20">
        <div className="card overflow-hidden">
          <div className="bg-muted/30 border-b border-border px-4 py-3 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-green animate-pulse" />
            <span className="text-xs text-dim font-medium">Live session — Anthropic · ML System Design · Question 2 of 4</span>
          </div>
          <div className="p-5 space-y-4 font-mono text-sm">
            <div className="flex gap-3">
              <div className="w-6 h-6 rounded-full bg-blue-m border border-blue/30 flex items-center justify-center text-blue text-xs flex-shrink-0 mt-0.5">AI</div>
              <div className="bg-muted/30 border border-border rounded-lg px-3 py-2.5 max-w-lg text-xs text-bright leading-relaxed">
                Your RAG retrieval found the right documents but the LLM still gave a wrong answer. Debug this systematically.
              </div>
            </div>
            <div className="flex gap-3 justify-end">
              <div className="bg-blue-m border border-blue/20 rounded-lg px-3 py-2.5 max-w-lg text-xs text-bright leading-relaxed">
                I'd first isolate whether it's a retrieval failure or generation failure — check the exact chunks passed to the LLM and verify they contain the right info.
              </div>
              <div className="w-6 h-6 rounded-full bg-muted border border-border flex items-center justify-center text-dim text-xs flex-shrink-0 mt-0.5">Y</div>
            </div>
            <div className="flex gap-3">
              <div className="w-6 h-6 rounded-full bg-blue-m border border-blue/30 flex items-center justify-center text-blue text-xs flex-shrink-0 mt-0.5">AI</div>
              <div className="bg-muted/30 border border-border rounded-lg px-3 py-2.5 max-w-lg text-xs text-bright leading-relaxed">
                Good start. Say the model is ignoring the context — what does your evaluation harness look like to detect this at scale, not just on one example?
              </div>
            </div>
          </div>
          <div className="border-t border-border bg-muted/20 px-4 py-3">
            <div className="flex gap-2 items-center">
              <div className="flex-1 h-9 bg-bg border border-border rounded-lg px-3 flex items-center">
                <span className="text-xs text-dim">Type your answer...</span>
              </div>
              <div className="btn-blue text-xs px-3 py-2">Send</div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-8 text-center">
        <p className="text-xs text-dim">
          <Link href="/" className="hover:text-soft transition-colors">Sonne AI</Link>
          {' · '}
          <Link href="/pricing" className="hover:text-soft transition-colors">Pricing</Link>
          {' · '}
          <a href="mailto:support@sonneai.com" className="hover:text-soft transition-colors">support@sonneai.com</a>
          {' · '} © 2026 Sonne AI · Switzerland 🇨🇭
        </p>
      </footer>
    </div>
  )
}
