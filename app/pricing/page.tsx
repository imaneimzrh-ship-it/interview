import Link from 'next/link'

export default function Pricing() {
  return (
    <div className="min-h-screen bg-bg">
      <nav className="border-b border-border">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-blue flex items-center justify-center text-white text-xs font-bold">S</div>
            <span className="font-semibold text-sm text-bright">Sonne AI</span>
          </Link>
          <Link href="/login" className="text-sm text-dim hover:text-bright transition-colors">Sign in</Link>
        </div>
      </nav>

      <div className="max-w-3xl mx-auto px-4 py-16 text-center">
        <h1 className="text-3xl font-semibold text-bright mb-3">Simple pricing</h1>
        <p className="text-dim mb-12">Free to start. Pay when you're preparing for AI roles.</p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 text-left">
          <div className="card p-6">
            <div className="text-xs font-medium text-dim uppercase tracking-widest mb-3">Free</div>
            <div className="text-3xl font-semibold text-bright mb-1">$0</div>
            <div className="text-xs text-dim mb-6">No card required</div>
            <div className="space-y-2.5 mb-6 text-sm">
              {['2 interview sessions total','Any general role (SWE, PM, DS...)','10 questions per session','Score and feedback after each session'].map(f => (
                <div key={f} className="flex items-center gap-2"><span className="text-green text-xs">✓</span><span className="text-bright">{f}</span></div>
              ))}
              {['AI engineering roles','Company-specific loops (Anthropic, OpenAI...)','Technical correctness grading','Unlimited sessions'].map(f => (
                <div key={f} className="flex items-center gap-2"><span className="text-border text-xs">○</span><span className="text-dim line-through">{f}</span></div>
              ))}
            </div>
            <Link href="/signup" className="btn-ghost w-full justify-center py-2.5">Start free</Link>
          </div>

          <div className="card p-6 border-blue/30" style={{ boxShadow: '0 0 0 1px rgba(71,118,247,0.2), 0 0 20px rgba(71,118,247,0.05)' }}>
            <div className="text-xs font-medium text-blue uppercase tracking-widest mb-3">Pro</div>
            <div className="text-3xl font-semibold text-bright mb-1">$19<span className="text-base font-normal text-dim">/month</span></div>
            <div className="text-xs text-dim mb-6">Cancel anytime</div>
            <div className="space-y-2.5 mb-6 text-sm">
              {[
                'Everything in Free',
                'Unlimited sessions',
                'All general roles',
                'AI engineering roles (AI engineer, MLE, MLOps...)',
                'Anthropic, OpenAI, DeepMind, Meta AI and more',
                'Technical correctness grading per question',
                'Session history and score tracking',
                'Updated every 6 weeks from new candidate reports',
              ].map(f => (
                <div key={f} className="flex items-start gap-2">
                  <span className="text-blue text-xs mt-0.5 flex-shrink-0">✓</span>
                  <span className="text-bright">{f}</span>
                </div>
              ))}
            </div>
            <Link href="/signup?plan=pro" className="btn-gold w-full justify-center py-2.5">Get Pro →</Link>
          </div>
        </div>

        <p className="text-xs text-dim mt-8">
          Interviewing for a role that pays $200K–$1M+. This costs $19/month.
        </p>
      </div>
    </div>
  )
}
