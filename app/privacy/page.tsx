import Link from 'next/link'

export const metadata = { title: 'Privacy Policy — Sonne AI' }

export default function Privacy() {
  return (
    <div className="min-h-screen" style={{ background: '#FBFAF7', fontFamily: "'Inter', system-ui, sans-serif" }}>

      {/* Nav */}
      <nav className="border-b border-[#E7E2D8] bg-[#FBFAF7]/80 backdrop-blur-sm sticky top-0 z-20">
        <div className="max-w-4xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-[#1E2A44] flex items-center justify-center"><SunMark /></div>
            <span className="font-bold text-[#17140F] text-sm" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>Sonne AI</span>
          </Link>
          <Link href="/login" className="text-sm text-[#7A7267] hover:text-[#17140F] transition-colors">Sign in</Link>
        </div>
      </nav>

      <main className="max-w-2xl mx-auto px-4 py-14">

        <h1 className="text-3xl font-bold text-[#17140F] mb-2" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>Privacy Policy</h1>
        <p className="text-sm text-[#7A7267] mb-10">Last updated: July 2026</p>

        <div className="space-y-10 text-[#374151] text-sm leading-relaxed">

          <section>
            <h2 className="text-base font-bold text-[#17140F] mb-3" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>1. Who we are</h2>
            <p>Sonne AI (&quot;we&quot;, &quot;us&quot;, &quot;our&quot;) operates the interview-prep platform at <strong>sonneai.com</strong>. We help Applied AI Engineer candidates prepare for technical interviews. For privacy inquiries, contact <a href="mailto:support@sonneai.com" className="text-[#F5A524] hover:underline">support@sonneai.com</a>.</p>
          </section>

          <section>
            <h2 className="text-base font-bold text-[#17140F] mb-3" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>2. Data we collect</h2>
            <ul className="space-y-2 list-disc pl-5">
              <li><strong>Account data</strong> — name and email address when you sign up.</li>
              <li><strong>Interview data</strong> — your text answers during practice sessions, session metadata (module chosen, language, score).</li>
              <li><strong>CV / resume text</strong> — only if you choose to upload or paste it. Stored against your account if you click &quot;Save to profile.&quot; Never shared with third parties.</li>
              <li><strong>Payment data</strong> — handled entirely by Stripe. We never see or store full card numbers.</li>
              <li><strong>Usage logs</strong> — standard server logs (IP address, page visits, error events) for security and debugging.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-bold text-[#17140F] mb-3" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>3. How we use your data</h2>
            <ul className="space-y-2 list-disc pl-5">
              <li>Deliver the interview practice service, including generating AI questions and scoring your answers.</li>
              <li>Save your session history and diagnostic reports to your account.</li>
              <li>Process subscription payments via Stripe.</li>
              <li>Send transactional emails (account confirmation, password reset). No marketing emails without consent.</li>
              <li>Detect abuse and enforce rate limits.</li>
            </ul>
            <p className="mt-3"><strong>We do not use your CV or interview answers to train AI models.</strong></p>
          </section>

          <section>
            <h2 className="text-base font-bold text-[#17140F] mb-3" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>4. Data sharing</h2>
            <p className="mb-2">We share data only with the sub-processors required to run the service:</p>
            <ul className="space-y-2 list-disc pl-5">
              <li><strong>Supabase</strong> — database and authentication (EU region).</li>
              <li><strong>Anthropic</strong> — AI model inference. Your interview text is sent to Claude to generate questions and evaluate answers. It is subject to <a href="https://www.anthropic.com/legal/privacy" target="_blank" rel="noopener" className="text-[#F5A524] hover:underline">Anthropic&apos;s privacy policy</a>.</li>
              <li><strong>Stripe</strong> — payment processing.</li>
              <li><strong>Vercel</strong> — hosting and edge network.</li>
            </ul>
            <p className="mt-3">We do not sell personal data.</p>
          </section>

          <section>
            <h2 className="text-base font-bold text-[#17140F] mb-3" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>5. Your rights</h2>
            <p className="mb-2">Depending on your jurisdiction (e.g. GDPR, CCPA), you may have the right to:</p>
            <ul className="space-y-2 list-disc pl-5">
              <li><strong>Access</strong> the personal data we hold about you.</li>
              <li><strong>Rectify</strong> inaccurate data (you can update your name and email in settings).</li>
              <li><strong>Delete</strong> your account and all associated data — go to Settings → Delete account, or email us.</li>
              <li><strong>Export</strong> your interview history and CV data — email us and we will provide a JSON export within 30 days.</li>
              <li><strong>Object</strong> to or restrict processing — contact us and we will respond within 30 days.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-bold text-[#17140F] mb-3" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>6. Data retention</h2>
            <p>We keep your account data for as long as your account is active. Interview session data is retained for 2 years to allow you to review your progress. CV data is deleted immediately when you remove it from your profile. When you delete your account, all personal data is purged within 30 days.</p>
          </section>

          <section>
            <h2 className="text-base font-bold text-[#17140F] mb-3" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>7. Cookies</h2>
            <p>We use only essential cookies required for authentication (Supabase session tokens). We do not use tracking or advertising cookies.</p>
          </section>

          <section>
            <h2 className="text-base font-bold text-[#17140F] mb-3" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>8. Security</h2>
            <p>All data is transmitted over HTTPS. Passwords are hashed by Supabase Auth (bcrypt). We enforce row-level security on all database tables. Payment data never touches our servers.</p>
          </section>

          <section>
            <h2 className="text-base font-bold text-[#17140F] mb-3" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>9. Governing law</h2>
            <p>This policy is governed by the laws of Morocco. Where you are protected by data protection legislation (such as GDPR, CCPA, or equivalent laws), those protections apply to you. For privacy complaints, you may also contact your local data protection authority. For all privacy inquiries, email <a href="mailto:support@sonneai.com" className="text-[#F5A524] hover:underline">support@sonneai.com</a>.</p>
          </section>

          <section>
            <h2 className="text-base font-bold text-[#17140F] mb-3" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>10. Contact</h2>
            <p>For any privacy questions or data requests, email <a href="mailto:support@sonneai.com" className="text-[#F5A524] hover:underline">support@sonneai.com</a>. We respond within 5 business days.</p>
          </section>

        </div>
      </main>

      <footer className="border-t border-[#E7E2D8] py-8 mt-8">
        <div className="max-w-4xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#7A7267]">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded-md bg-[#1E2A44] flex items-center justify-center"><SunMark /></div>
            <span>Sonne AI © 2026</span>
          </div>
          <div className="flex gap-5">
            <Link href="/"        className="hover:text-[#17140F] transition-colors">Home</Link>
            <Link href="/pricing" className="hover:text-[#17140F] transition-colors">Pricing</Link>
            <Link href="/terms"   className="hover:text-[#17140F] transition-colors">Terms</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}

function SunMark() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="7" cy="7" r="3" fill="#F5A524"/>
      {[0,45,90,135,180,225,270,315].map((deg, i) => {
        const r = Math.PI * deg / 180
        return <line key={i} x1={7+4*Math.cos(r)} y1={7+4*Math.sin(r)} x2={7+5.5*Math.cos(r)} y2={7+5.5*Math.sin(r)} stroke="#F5A524" strokeWidth="1.2" strokeLinecap="round"/>
      })}
    </svg>
  )
}
