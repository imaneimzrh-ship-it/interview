import Link from 'next/link'

export const metadata = { title: 'Privacy Policy — Sonne AI' }

const H = ({ children }: { children: React.ReactNode }) => (
  <h2 className="text-base font-bold text-[#17140F] mb-3" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>{children}</h2>
)
const P = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => (
  <p className={`text-sm text-[#374151] leading-relaxed ${className}`}>{children}</p>
)
const UL = ({ children }: { children: React.ReactNode }) => (
  <ul className="space-y-2 list-disc pl-5 text-sm text-[#374151] leading-relaxed">{children}</ul>
)

export default function Privacy() {
  return (
    <div className="min-h-screen" style={{ background: '#FBFAF7', fontFamily: "'Inter', system-ui, sans-serif" }}>

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
        <P className="text-[#7A7267] mb-2">Last updated: 15 July 2026</P>
        <P className="text-[#7A7267] mb-10">This policy applies to all users of sonneai.com, including visitors from the European Economic Area (EEA), the United Kingdom, and other jurisdictions. If you are located in the EEA or UK, the EU General Data Protection Regulation (GDPR) or UK GDPR applies to your personal data.</P>

        <div className="space-y-10">

          <section>
            <H>1. Data controller</H>
            <P>The data controller responsible for your personal data is:</P>
            <div className="mt-3 bg-[#F5F4F0] rounded-xl p-4 text-sm text-[#374151]">
              <p><strong>Sonne AI</strong></p>
              <p>Morocco</p>
              <p>Email: <a href="mailto:support@sonneai.com" className="text-[#F5A524] hover:underline">support@sonneai.com</a></p>
            </div>
            <P className="mt-3">For all privacy requests and data subject rights, contact us at the email above. We respond within 30 days.</P>
          </section>

          <section>
            <H>2. Data we collect and why (legal basis)</H>
            <P className="mb-3">Under GDPR Art. 6, we must have a lawful basis for every processing activity. Here is what we collect and the specific legal basis for each:</P>

            <div className="space-y-4">
              <div className="border border-[#E7E2D8] rounded-xl p-4">
                <p className="text-sm font-semibold text-[#17140F] mb-1">Account data — name, email address</p>
                <p className="text-xs text-[#7A7267] mb-2"><strong>Legal basis:</strong> Art. 6(1)(b) — performance of the contract (account creation and service delivery)</p>
                <p className="text-xs text-[#374151]">Required to create and authenticate your account. Without it we cannot provide the service.</p>
              </div>

              <div className="border border-[#E7E2D8] rounded-xl p-4">
                <p className="text-sm font-semibold text-[#17140F] mb-1">Interview answers and session data</p>
                <p className="text-xs text-[#7A7267] mb-2"><strong>Legal basis:</strong> Art. 6(1)(b) — performance of the contract</p>
                <p className="text-xs text-[#374151]">Your text answers are sent to our AI model to generate follow-up questions and produce your scorecard. Session metadata (module, language, score, timestamp) is stored to show your history.</p>
              </div>

              <div className="border border-[#E7E2D8] rounded-xl p-4">
                <p className="text-sm font-semibold text-[#17140F] mb-1">CV / resume text (optional)</p>
                <p className="text-xs text-[#7A7267] mb-2"><strong>Legal basis:</strong> Art. 6(1)(a) — your explicit consent (you choose to upload and optionally save it)</p>
                <p className="text-xs text-[#374151]">Processed by our AI model to produce your CV diagnostic score. Stored against your account only if you click &ldquo;Save to profile.&rdquo; You can delete it at any time from Settings. Never shared with third parties for any other purpose. <strong>We do not use your CV to train AI models.</strong></p>
              </div>

              <div className="border border-[#E7E2D8] rounded-xl p-4">
                <p className="text-sm font-semibold text-[#17140F] mb-1">Payment data</p>
                <p className="text-xs text-[#7A7267] mb-2"><strong>Legal basis:</strong> Art. 6(1)(b) — performance of the contract</p>
                <p className="text-xs text-[#374151]">Handled entirely by Stripe. We receive only a customer ID and subscription status — never card numbers or full payment details.</p>
              </div>

              <div className="border border-[#E7E2D8] rounded-xl p-4">
                <p className="text-sm font-semibold text-[#17140F] mb-1">Server logs — IP address, page visits, error events</p>
                <p className="text-xs text-[#7A7267] mb-2"><strong>Legal basis:</strong> Art. 6(1)(f) — legitimate interest (security, fraud prevention, debugging)</p>
                <p className="text-xs text-[#374151]">Standard infrastructure logs retained for up to 90 days. Used to detect abuse, enforce rate limits, and diagnose errors.</p>
              </div>

              <div className="border border-[#E7E2D8] rounded-xl p-4">
                <p className="text-sm font-semibold text-[#17140F] mb-1">Analytics and advertising data (Google Analytics, Google Ads)</p>
                <p className="text-xs text-[#7A7267] mb-2"><strong>Legal basis:</strong> Art. 6(1)(a) — your consent via the cookie banner</p>
                <p className="text-xs text-[#374151]">Only collected if you accept analytics/advertising cookies. Includes page-view events, session data, and ad interaction data. You can withdraw consent at any time by clearing your cookie preference (refresh the page after clearing localStorage).</p>
              </div>
            </div>
          </section>

          <section>
            <H>3. Automated processing and AI scoring</H>
            <P>The following features involve <strong>fully automated processing</strong> that produces an assessment of you (relevant under GDPR Art. 22):</P>
            <UL>
              <li className="mt-2"><strong>CV Diagnostic</strong> — your CV text is analysed by an AI model (Claude by Anthropic) which assigns scores across 5 signals and generates written feedback. This assessment is not used for any employment decision by us — it is a practice tool for your own use.</li>
              <li><strong>Interview scoring</strong> — your written answers during practice sessions are evaluated by the same AI model and assigned a numeric score and pass/fail verdict. Again, this is solely for your own practice feedback.</li>
            </UL>
            <P className="mt-3">These assessments have no legal or similarly significant effect on you — they exist only to provide you with feedback. However, you have the right to request human review of any AI-generated assessment by emailing us. You also have the right to object to this processing under Art. 21 GDPR, in which case we cannot provide the core service features.</P>
          </section>

          <section>
            <H>4. Sub-processors and international transfers</H>
            <P className="mb-3">We share your personal data with the following sub-processors. Some are located outside the EEA; where that is the case, transfers are made under European Commission Standard Contractual Clauses (SCCs) or an applicable adequacy decision.</P>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-[#374151] border-collapse">
                <thead>
                  <tr className="border-b border-[#E7E2D8]">
                    <th className="text-left py-2 pr-4 font-semibold text-[#17140F]">Processor</th>
                    <th className="text-left py-2 pr-4 font-semibold text-[#17140F]">Purpose</th>
                    <th className="text-left py-2 pr-4 font-semibold text-[#17140F]">Location</th>
                    <th className="text-left py-2 font-semibold text-[#17140F]">Transfer basis</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F3F4F6]">
                  <tr>
                    <td className="py-2.5 pr-4 font-medium">Supabase</td>
                    <td className="py-2.5 pr-4">Database, authentication</td>
                    <td className="py-2.5 pr-4">EU (AWS eu-west)</td>
                    <td className="py-2.5">EEA — no transfer</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 pr-4 font-medium">Anthropic</td>
                    <td className="py-2.5 pr-4">AI model inference (CV scoring, interview Q&A)</td>
                    <td className="py-2.5 pr-4">USA</td>
                    <td className="py-2.5">SCCs</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 pr-4 font-medium">Stripe</td>
                    <td className="py-2.5 pr-4">Payment processing</td>
                    <td className="py-2.5 pr-4">USA / EU</td>
                    <td className="py-2.5">SCCs + adequacy</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 pr-4 font-medium">Vercel</td>
                    <td className="py-2.5 pr-4">Hosting and edge network</td>
                    <td className="py-2.5 pr-4">USA / global edge</td>
                    <td className="py-2.5">SCCs</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 pr-4 font-medium">Google</td>
                    <td className="py-2.5 pr-4">Analytics (GA4) and advertising (Google Ads) — consent only</td>
                    <td className="py-2.5 pr-4">USA</td>
                    <td className="py-2.5">SCCs + consent</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 pr-4 font-medium">E2B</td>
                    <td className="py-2.5 pr-4">Sandboxed code execution for coding exercises</td>
                    <td className="py-2.5 pr-4">USA</td>
                    <td className="py-2.5">SCCs</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <P className="mt-3">We do not sell personal data to any third party.</P>
          </section>

          <section id="cookies">
            <H>5. Cookies</H>
            <P className="mb-3">We use the following cookies:</P>
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-[#374151] border-collapse">
                <thead>
                  <tr className="border-b border-[#E7E2D8]">
                    <th className="text-left py-2 pr-4 font-semibold text-[#17140F]">Cookie</th>
                    <th className="text-left py-2 pr-4 font-semibold text-[#17140F]">Purpose</th>
                    <th className="text-left py-2 pr-4 font-semibold text-[#17140F]">Type</th>
                    <th className="text-left py-2 font-semibold text-[#17140F]">Duration</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F3F4F6]">
                  <tr>
                    <td className="py-2.5 pr-4 font-mono">sb-*-auth-token</td>
                    <td className="py-2.5 pr-4">Supabase authentication session</td>
                    <td className="py-2.5 pr-4">Essential</td>
                    <td className="py-2.5">Session / 1 week</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 pr-4 font-mono">sonne_cookie_consent</td>
                    <td className="py-2.5 pr-4">Stores your cookie preference (localStorage)</td>
                    <td className="py-2.5 pr-4">Essential</td>
                    <td className="py-2.5">Persistent</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 pr-4 font-mono">_ga, _gid</td>
                    <td className="py-2.5 pr-4">Google Analytics 4 — page-view and session tracking</td>
                    <td className="py-2.5 pr-4">Analytics (consent)</td>
                    <td className="py-2.5">2 years / 24h</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 pr-4 font-mono">_gcl_*, IDE</td>
                    <td className="py-2.5 pr-4">Google Ads — conversion measurement and remarketing</td>
                    <td className="py-2.5 pr-4">Advertising (consent)</td>
                    <td className="py-2.5">90 days</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <P className="mt-3">Analytics and advertising cookies are only placed after you click &ldquo;Accept all&rdquo; on the consent banner. To withdraw consent, clear your browser&apos;s localStorage key <code className="text-xs bg-[#F0EDE8] px-1 py-0.5 rounded">sonne_cookie_consent</code> and reload the page — the banner will reappear.</P>
          </section>

          <section>
            <H>6. Your rights under GDPR</H>
            <P className="mb-3">If you are in the EEA or UK, you have the following rights. We will respond within <strong>30 days</strong> of receiving your request.</P>
            <UL>
              <li><strong>Access (Art. 15)</strong> — request a copy of all personal data we hold about you.</li>
              <li><strong>Rectification (Art. 16)</strong> — correct inaccurate data. You can update your name and email directly in Settings.</li>
              <li><strong>Erasure (Art. 17)</strong> — delete your account and all associated data. Go to Settings → Delete account, or email us. Data is purged within 30 days.</li>
              <li><strong>Portability (Art. 20)</strong> — receive your interview history, session data, and CV diagnostic results in a machine-readable format (JSON). Email us to request an export.</li>
              <li><strong>Restriction (Art. 18)</strong> — ask us to pause processing your data while a dispute is resolved.</li>
              <li><strong>Objection (Art. 21)</strong> — object to processing based on legitimate interest (e.g. server logs). We will stop unless we have compelling grounds.</li>
              <li><strong>Withdraw consent (Art. 7)</strong> — withdraw consent for CV storage or analytics cookies at any time without affecting prior processing.</li>
              <li><strong>Lodge a complaint</strong> — you have the right to complain to your local supervisory authority. For France: <a href="https://www.cnil.fr" target="_blank" rel="noopener" className="text-[#F5A524] hover:underline">CNIL (cnil.fr)</a>. For Germany: your state&apos;s Datenschutzbehörde. For the UK: <a href="https://ico.org.uk" target="_blank" rel="noopener" className="text-[#F5A524] hover:underline">ICO (ico.org.uk)</a>.</li>
            </UL>
            <P className="mt-3">To exercise any right, email <a href="mailto:support@sonneai.com" className="text-[#F5A524] hover:underline">support@sonneai.com</a> with the subject line &ldquo;Data Subject Request.&rdquo;</P>
          </section>

          <section>
            <H>7. Data retention</H>
            <UL>
              <li><strong>Account data</strong> — retained while your account is active. Purged within 30 days of account deletion.</li>
              <li><strong>Interview session data</strong> — retained for 2 years so you can review your progress, then deleted.</li>
              <li><strong>CV text</strong> — deleted immediately when you remove it from your profile, or within 30 days of account deletion.</li>
              <li><strong>Server logs</strong> — 90 days.</li>
              <li><strong>Analytics data</strong> — governed by Google&apos;s data retention settings (default 14 months in GA4).</li>
            </UL>
          </section>

          <section>
            <H>8. Security</H>
            <P>All data is transmitted over HTTPS (TLS 1.2+). Passwords are hashed by Supabase Auth (bcrypt). We enforce row-level security on all database tables so users can only access their own data. Payment data never touches our servers — it is handled entirely within Stripe&apos;s PCI-DSS compliant environment.</P>
          </section>

          <section>
            <H>9. Children</H>
            <P>Sonne AI is not directed at children under 16. We do not knowingly collect personal data from anyone under 16. If you believe a child has provided us with personal data, email us and we will delete it promptly.</P>
          </section>

          <section>
            <H>10. Changes to this policy</H>
            <P>We will notify you of material changes by email at least 14 days before they take effect. The &ldquo;last updated&rdquo; date at the top of this page reflects the most recent revision. Continued use after the effective date constitutes acceptance.</P>
          </section>

          <section>
            <H>11. Contact</H>
            <P>For any privacy questions or data subject rights requests: <a href="mailto:support@sonneai.com" className="text-[#F5A524] hover:underline">support@sonneai.com</a>. We aim to respond within 5 business days and will always respond within the 30-day GDPR deadline.</P>
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
