import Link from 'next/link'

export default function Home() {
  return (
    <div className="min-h-screen bg-[#F8F9FB]" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>

      {/* ── Nav ── */}
      <nav className="sticky top-0 z-50 bg-white border-b border-[#E5E7EB]" style={{ boxShadow: '0 1px 3px rgba(0,0,0,.06)' }}>
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#2563EB] flex items-center justify-center text-white font-bold text-sm shadow-sm">S</div>
            <span className="font-semibold text-[#111827] text-[15px]">Sonne AI Interviewer</span>
          </div>
          <div className="hidden sm:flex items-center gap-6 text-sm text-[#6B7280]">
            <a href="#modules" className="hover:text-[#111827] transition-colors">Modules</a>
            <a href="#how" className="hover:text-[#111827] transition-colors">How it works</a>
            <a href="#pricing" className="hover:text-[#111827] transition-colors">Pricing</a>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/login" className="text-sm text-[#6B7280] hover:text-[#111827] transition-colors hidden sm:block">Sign in</Link>
            <Link href="/signup" className="inline-flex items-center gap-1.5 bg-[#2563EB] text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-[#1D4ED8] transition-colors shadow-sm">
              Start free →
            </Link>
          </div>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 pt-20 pb-16 text-center">
        <div className="inline-flex items-center gap-2 bg-[#EFF6FF] border border-[#BFDBFE] text-[#1D4ED8] text-xs font-medium px-3 py-1.5 rounded-full mb-8">
          <span className="w-2 h-2 rounded-full bg-[#2563EB]" style={{ animation: 'pulse 2s infinite' }} />
          Applied AI Engineer — #1 fastest-growing role in 2026
        </div>

        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-[#111827] leading-[1.08] tracking-tight mb-6">
          The AI interview that actually<br />
          <span className="text-[#2563EB]">adapts to your answer</span>
        </h1>

        <p className="text-lg sm:text-xl text-[#6B7280] max-w-2xl mx-auto mb-4 leading-relaxed">
          Practice RAG, agents, evaluation, and MLOps with an AI interviewer that pushes back on weak answers, probes deeper when needed, and gives you a sub-skill diagnostic — not just a score.
        </p>

        <p className="text-sm text-[#2563EB] font-medium mb-10">
          🇬🇧 English · 🇫🇷 Français — bilingual from day one
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center mb-6">
          <Link href="/signup" className="inline-flex items-center justify-center gap-2 bg-[#2563EB] text-white text-base font-semibold px-8 py-3.5 rounded-xl hover:bg-[#1D4ED8] transition-all shadow-md">
            Start free — 1 full session included →
          </Link>
          <a href="#how" className="inline-flex items-center justify-center gap-2 bg-white text-[#374151] text-base font-medium px-8 py-3.5 rounded-xl border border-[#E5E7EB] hover:bg-[#F9FAFB] transition-all shadow-sm">
            See how it works
          </a>
        </div>

        <div className="flex items-center justify-center gap-6 text-sm text-[#9CA3AF]">
          <span className="flex items-center gap-1.5"><span className="text-[#059669]">✓</span> No card required</span>
          <span className="flex items-center gap-1.5"><span className="text-[#059669]">✓</span> 1 free full session</span>
          <span className="flex items-center gap-1.5"><span className="text-[#059669]">✓</span> Cancel anytime</span>
        </div>
      </section>

      {/* ── Demo preview ── */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 pb-20">
        <div className="bg-white rounded-2xl border border-[#E5E7EB] overflow-hidden" style={{ boxShadow: '0 10px 40px rgba(0,0,0,.1)' }}>
          {/* Window chrome */}
          <div className="bg-[#F3F4F6] border-b border-[#E5E7EB] px-4 py-3 flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-[#FC6058]" />
            <div className="w-3 h-3 rounded-full bg-[#FEC02F]" />
            <div className="w-3 h-3 rounded-full bg-[#2ACA42]" />
            <div className="flex-1 mx-4 bg-white rounded-md px-3 py-1 text-xs text-[#9CA3AF] border border-[#E5E7EB]">sonneai.com/interview/session</div>
          </div>
          {/* Session header */}
          <div className="bg-[#2563EB] px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="w-2 h-2 rounded-full bg-[#4ADE80]" style={{ boxShadow: '0 0 0 4px rgba(74,222,128,.2)' }} />
              <span className="text-white text-sm font-medium">Live interview — RAG System Design</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="bg-white/20 text-white text-xs px-2.5 py-1 rounded-lg">● Chunking Strategy</span>
              <span className="text-white/70 text-xs font-mono">01:24</span>
            </div>
          </div>
          {/* Chat area */}
          <div className="p-6 space-y-5 bg-[#F8F9FB]">
            <div className="flex gap-3">
              <div className="w-9 h-9 rounded-full bg-[#2563EB] flex items-center justify-center text-white text-xs font-bold flex-shrink-0 shadow-sm">AI</div>
              <div className="max-w-[80%] bg-white border border-[#E5E7EB] rounded-xl rounded-tl-sm px-4 py-3 shadow-sm">
                <p className="text-sm text-[#111827] leading-relaxed">Walk me through how you'd choose a chunking strategy for a RAG system ingesting long, unstructured technical documentation. What tradeoffs are you weighing?</p>
              </div>
            </div>
            <div className="flex gap-3 justify-end">
              <div className="max-w-[80%] bg-[#2563EB] text-white rounded-xl rounded-tr-sm px-4 py-3 shadow-sm">
                <p className="text-sm leading-relaxed">I'd consider semantic vs fixed-size chunking depending on document structure. For technical docs with headers and tables, I'd use semantic chunking with ~600 token chunks and 10% overlap...</p>
              </div>
              <div className="w-9 h-9 rounded-full bg-[#E5E7EB] flex items-center justify-center text-[#6B7280] text-xs font-bold flex-shrink-0">Y</div>
            </div>
            <div className="flex gap-3">
              <div className="w-9 h-9 rounded-full bg-[#2563EB] flex items-center justify-center text-white text-xs font-bold flex-shrink-0 shadow-sm">AI</div>
              <div className="max-w-[80%] bg-white border border-[#E5E7EB] rounded-xl rounded-tl-sm px-4 py-3 shadow-sm">
                <p className="text-sm text-[#111827] leading-relaxed">Good. Why 600 tokens specifically? What breaks if a chunk splits a table in half?</p>
              </div>
            </div>
          </div>
          <div className="px-6 pb-4 bg-[#F8F9FB] border-t border-[#E5E7EB] pt-4">
            <div className="flex gap-3 items-center">
              <div className="flex-1 bg-white border border-[#D1D5DB] rounded-xl px-4 py-2.5 text-sm text-[#9CA3AF] shadow-sm">Type your answer...</div>
              <div className="bg-[#2563EB] text-white rounded-xl w-10 h-10 flex items-center justify-center shadow-sm text-xs">↑</div>
            </div>
          </div>
        </div>
        <p className="text-center text-sm text-[#9CA3AF] mt-4">↑ The AI probed a specific gap in the answer — not a generic follow-up</p>
      </section>

      {/* ── Modules ── */}
      <section id="modules" className="max-w-5xl mx-auto px-4 sm:px-6 pb-20">
        <div className="text-center mb-12">
          <p className="text-[#2563EB] text-sm font-medium uppercase tracking-widest mb-3">Four modules · One role · Deep coverage</p>
          <h2 className="text-3xl font-bold text-[#111827] mb-3">Everything an Applied AI Engineer is tested on</h2>
          <p className="text-[#6B7280] max-w-xl mx-auto">Each module has 4 sub-skill areas. Free tier: pick any one module. Pro: practice all four.</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[
            { emoji:'🔍', en:'RAG System Design', fr:'Conception de Systèmes RAG', skills:['Chunking strategy','Retrieval quality','Reranking','Freshness & updates'], color:'#EFF6FF', border:'#BFDBFE', accent:'#1D4ED8', tag:'FREE — available to all' },
            { emoji:'🕵️', en:'Agent / Multi-Agent Orchestration', fr:'Orchestration d\'Agents', skills:['Tool use design','Planning & decomposition','Failure handling','Multi-agent coordination'], color:'#F0FDF4', border:'#BBF7D0', accent:'#065F46', tag:'PRO' },
            { emoji:'🧪', en:'Evaluation & Testing', fr:'Évaluation & Tests', skills:['Eval design','Hallucination detection','Offline vs online eval','Regression testing'], color:'#FFFBEB', border:'#FDE68A', accent:'#92400E', tag:'PRO' },
            { emoji:'⚙️', en:'Production / MLOps', fr:'Production / MLOps', skills:['Monitoring & observability','Cost / latency tradeoffs','Versioning & rollback','Deployment safety'], color:'#F5F3FF', border:'#DDD6FE', accent:'#5B21B6', tag:'PRO' },
          ].map(m => (
            <div key={m.en} className="bg-white rounded-xl border border-[#E5E7EB] p-6 hover:shadow-md transition-all group" style={{ boxShadow: '0 1px 3px rgba(0,0,0,.06)' }}>
              <div className="flex items-start justify-between mb-4">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center text-xl" style={{ background: m.color, border: `1px solid ${m.border}` }}>{m.emoji}</div>
                <span className="text-xs font-semibold px-2.5 py-1 rounded-full" style={{ background: m.color, border: `1px solid ${m.border}`, color: m.accent }}>{m.tag}</span>
              </div>
              <h3 className="font-semibold text-[#111827] mb-0.5">{m.en}</h3>
              <p className="text-xs text-[#9CA3AF] mb-3">{m.fr}</p>
              <div className="space-y-1.5">
                {m.skills.map(s => (
                  <div key={s} className="flex items-center gap-2 text-sm text-[#6B7280]">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#D1D5DB] flex-shrink-0" />
                    {s}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── How it works ── */}
      <section id="how" className="bg-white border-y border-[#E5E7EB] py-20">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-[#111827] mb-3">How it works</h2>
            <p className="text-[#6B7280]">From sign up to diagnostic report in under 30 minutes</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-6">
            {[
              { n:'1', title:'Pick a module', body:'Choose the skill area you want to practice. Free tier: any one module. Start with the one your next interview will test.' },
              { n:'2', title:'Answer 4 questions', body:'The AI asks one question per sub-skill. It probes your specific answer — not a scripted follow-up. Max 2 exchanges per question.' },
              { n:'3', title:'Get your diagnosis', body:'After all 4 questions, you get a breakdown: score per sub-skill, evidence from your actual answers, and a specific improvement plan.' },
              { n:'4', title:'Share + improve', body:'Export a shareable card for LinkedIn. Practice again to track your improvement. Voice mode available on Pro.' },
            ].map(step => (
              <div key={step.n} className="text-center">
                <div className="w-10 h-10 rounded-full bg-[#EFF6FF] border-2 border-[#BFDBFE] flex items-center justify-center text-[#2563EB] font-bold text-sm mx-auto mb-4">{step.n}</div>
                <h3 className="font-semibold text-[#111827] mb-2">{step.title}</h3>
                <p className="text-sm text-[#6B7280] leading-relaxed">{step.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Differentiators ── */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 py-20">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          {[
            { icon:'🎯', title:'Adaptive, not scripted', body:'The interviewer reads your actual answer. Say "chunk into 500 tokens" without justification — it asks why. Nail it — it moves on.' },
            { icon:'📊', title:'Sub-skill diagnosis', body:'You know your score on chunking, retrieval quality, reranking, and freshness separately — not a single vague overall number.' },
            { icon:'🌍', title:'Grade content, not fluency', body:'Answer in English or French. The grader evaluates your technical substance — not how you phrased it.' },
          ].map(f => (
            <div key={f.title} className="bg-white rounded-xl border border-[#E5E7EB] p-6" style={{ boxShadow: '0 1px 3px rgba(0,0,0,.06)' }}>
              <div className="text-2xl mb-3">{f.icon}</div>
              <h3 className="font-semibold text-[#111827] mb-2">{f.title}</h3>
              <p className="text-sm text-[#6B7280] leading-relaxed">{f.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Voice teaser ── */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 pb-20">
        <div className="bg-gradient-to-r from-[#EFF6FF] to-[#F0FDF4] border border-[#BFDBFE] rounded-2xl p-8 flex flex-col sm:flex-row items-center gap-6">
          <div className="text-4xl">🎙️</div>
          <div className="flex-1 text-center sm:text-left">
            <div className="inline-flex items-center gap-1.5 bg-[#FEF3C7] border border-[#FDE68A] text-[#92400E] text-xs font-semibold px-2.5 py-1 rounded-full mb-2">⚡ Coming to Pro soon</div>
            <h3 className="text-xl font-bold text-[#111827] mb-2">Voice mode — practice like the real thing</h3>
            <p className="text-sm text-[#6B7280]">Speak your answers out loud. The AI responds in real time. Same adaptive grading — just like a real video interview. Available on Pro and Prep Sprint.</p>
          </div>
          <Link href="/signup?plan=pro" className="flex-shrink-0 bg-[#2563EB] text-white text-sm font-medium px-5 py-2.5 rounded-lg hover:bg-[#1D4ED8] transition-colors shadow-sm whitespace-nowrap">
            Get early access →
          </Link>
        </div>
      </section>

      {/* ── Pricing ── */}
      <section id="pricing" className="bg-white border-y border-[#E5E7EB] py-20">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-[#111827] mb-3">Simple pricing</h2>
            <p className="text-[#6B7280]">Free to try. Pay when you're serious about landing the role.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-4xl mx-auto">
            {/* Free */}
            <div className="bg-white rounded-xl border border-[#E5E7EB] p-6" style={{ boxShadow: '0 1px 3px rgba(0,0,0,.06)' }}>
              <p className="text-xs font-semibold text-[#9CA3AF] uppercase tracking-widest mb-3">Free</p>
              <div className="text-3xl font-bold text-[#111827] mb-1">$0</div>
              <p className="text-sm text-[#9CA3AF] mb-6">No card required · forever</p>
              <div className="space-y-2.5 mb-6">
                {['1 full interview session','Any module (your choice)','Text mode only','Headline diagnostic (top strength + gap)'].map(f => (
                  <div key={f} className="flex items-start gap-2 text-sm text-[#374151]"><span className="text-[#059669] mt-0.5">✓</span>{f}</div>
                ))}
                {['Full sub-skill scores','All 4 modules','Voice mode','Session history'].map(f => (
                  <div key={f} className="flex items-start gap-2 text-sm text-[#D1D5DB]"><span>—</span>{f}</div>
                ))}
              </div>
              <Link href="/signup" className="block text-center bg-[#F9FAFB] border border-[#E5E7EB] text-[#374151] text-sm font-medium px-4 py-2.5 rounded-lg hover:bg-[#F3F4F6] transition-colors">
                Start free
              </Link>
            </div>

            {/* Monthly */}
            <div className="bg-[#2563EB] rounded-xl p-6 relative" style={{ boxShadow: '0 8px 25px rgba(37,99,235,.25)' }}>
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#059669] text-white text-xs font-bold px-3 py-1 rounded-full">MOST POPULAR</div>
              <p className="text-xs font-semibold text-blue-200 uppercase tracking-widest mb-3">Monthly</p>
              <div className="text-3xl font-bold text-white mb-1">$19<span className="text-base font-normal text-blue-200">/mo</span></div>
              <p className="text-sm text-blue-200 mb-6">Cancel anytime</p>
              <div className="space-y-2.5 mb-6">
                {['Unlimited sessions','All 4 modules unlocked','Full sub-skill diagnostic report','Session history & progress tracking','Voice mode (launching soon)'].map(f => (
                  <div key={f} className="flex items-start gap-2 text-sm text-white"><span className="text-[#4ADE80] mt-0.5">✓</span>{f}</div>
                ))}
              </div>
              <Link href="/signup?plan=monthly" className="block text-center bg-white text-[#2563EB] text-sm font-semibold px-4 py-2.5 rounded-lg hover:bg-[#EFF6FF] transition-colors">
                Get monthly →
              </Link>
            </div>

            {/* Prep Sprint */}
            <div className="bg-white rounded-xl border-2 border-[#F59E0B] p-6" style={{ boxShadow: '0 4px 15px rgba(245,158,11,.15)' }}>
              <p className="text-xs font-semibold text-[#D97706] uppercase tracking-widest mb-3">Prep Sprint</p>
              <div className="text-3xl font-bold text-[#111827] mb-1">$49</div>
              <p className="text-sm text-[#9CA3AF] mb-6">6 weeks · one-time payment</p>
              <div className="space-y-2.5 mb-6">
                {['Everything in Monthly','Full 6-week access window','Perfect for active job search','No recurring billing — ever'].map(f => (
                  <div key={f} className="flex items-start gap-2 text-sm text-[#374151]"><span className="text-[#D97706] mt-0.5">✓</span>{f}</div>
                ))}
              </div>
              <Link href="/signup?plan=sprint" className="block text-center bg-[#D97706] text-white text-sm font-semibold px-4 py-2.5 rounded-lg hover:bg-[#B45309] transition-colors">
                Get Prep Sprint →
              </Link>
              <p className="text-center text-xs text-[#9CA3AF] mt-2">Best if you're interviewing in the next 6 weeks</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section className="max-w-3xl mx-auto px-4 sm:px-6 py-20">
        <h2 className="text-2xl font-bold text-[#111827] text-center mb-10">Common questions</h2>
        <div className="space-y-4">
          {[
            { q:'What is the difference between the free and paid tier?', a:'Free: 1 full session on any module, text only, you see the headline finding (top strength, top gap). Pro: unlimited sessions, all 4 modules, full sub-skill report with scores per area, evidence from your answers, improvement plan, voice mode, and session history.' },
            { q:'What does the AI actually do differently from ChatGPT?', a:'ChatGPT has no interview rubric, no sub-skill tracking, and no calibrated grading bar. Sonne AI knows exactly what a strong vs weak answer to each specific question looks like, probes the specific gap in your answer (not a generic follow-up), and produces a scored diagnostic per sub-skill — not just "try to be more specific."' },
            { q:'Can I answer in French?', a:'Yes. Choose French at the start of your session. The interviewer asks in French, you answer in French. The grader evaluates your technical content — it ignores language and fluency.' },
            { q:'What is voice mode and when does it launch?', a:'Voice mode lets you speak your answers out loud and hear the AI respond. It mimics a real video interview. It is available on Pro and Prep Sprint, currently in final testing and launching very soon.' },
            { q:'Can I delete my session data?', a:'Yes. From your session history or from the report page, there is a delete button that permanently removes the transcript and diagnostic — nothing is retained.' },
          ].map((faq, i) => (
            <details key={i} className="bg-white rounded-xl border border-[#E5E7EB] p-5 group" style={{ boxShadow: '0 1px 3px rgba(0,0,0,.04)' }}>
              <summary className="font-medium text-[#111827] cursor-pointer flex justify-between items-center text-sm list-none">
                {faq.q}
                <span className="text-[#9CA3AF] text-lg ml-4 transition-transform group-open:rotate-45">+</span>
              </summary>
              <p className="text-sm text-[#6B7280] mt-3 leading-relaxed">{faq.a}</p>
            </details>
          ))}
        </div>
      </section>

      {/* ── Final CTA ── */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 pb-20">
        <div className="bg-[#2563EB] rounded-2xl p-10 text-center" style={{ boxShadow: '0 10px 40px rgba(37,99,235,.25)' }}>
          <h2 className="text-3xl font-bold text-white mb-3">Ready to prepare seriously?</h2>
          <p className="text-blue-200 mb-8 max-w-lg mx-auto">Start free. No card required. Upgrade when you're ready for unlimited access across all four modules.</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/signup" className="bg-white text-[#2563EB] font-semibold px-8 py-3.5 rounded-xl hover:bg-[#EFF6FF] transition-colors text-base">
              Start free now →
            </Link>
            <Link href="/signup?plan=sprint" className="bg-[#1D4ED8] text-white font-medium px-8 py-3.5 rounded-xl border border-white/20 hover:bg-[#1E40AF] transition-colors text-base">
              Get Prep Sprint — $49
            </Link>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-[#E5E7EB] bg-white py-8">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-[#2563EB] flex items-center justify-center text-white font-bold text-xs">S</div>
            <span className="font-semibold text-[#374151] text-sm">Sonne AI</span>
            <span className="text-[#D1D5DB] text-xs ml-1">· Switzerland 🇨🇭</span>
          </div>
          <div className="flex gap-5 text-xs text-[#9CA3AF]">
            <Link href="/pricing" className="hover:text-[#6B7280]">Pricing</Link>
            <Link href="/privacy" className="hover:text-[#6B7280]">Privacy</Link>
            <Link href="/terms" className="hover:text-[#6B7280]">Terms</Link>
            <a href="mailto:support@sonneai.com" className="hover:text-[#6B7280]">support@sonneai.com</a>
            <span>© 2026</span>
          </div>
        </div>
      </footer>

      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:.5}}`}</style>
    </div>
  )
}
