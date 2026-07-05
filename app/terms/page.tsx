import Link from 'next/link'

export const metadata = { title: 'Terms of Service — Sonne AI' }

export default function Terms() {
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

        <h1 className="text-3xl font-bold text-[#17140F] mb-2" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>Terms of Service</h1>
        <p className="text-sm text-[#7A7267] mb-10">Last updated: July 2026</p>

        <div className="space-y-10 text-[#374151] text-sm leading-relaxed">

          <section>
            <h2 className="text-base font-bold text-[#17140F] mb-3" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>1. Acceptance</h2>
            <p>By creating an account or using Sonne AI at <strong>sonneai.com</strong>, you agree to these Terms. If you do not agree, do not use the service. These Terms apply to all users including free and paid subscribers.</p>
          </section>

          <section>
            <h2 className="text-base font-bold text-[#17140F] mb-3" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>2. Service description</h2>
            <p>Sonne AI is an AI-powered interview preparation platform for Applied AI Engineer roles. It provides adaptive practice sessions, diagnostic reports, and CV analysis powered by large language models. The service is for personal, non-commercial practice use only.</p>
          </section>

          <section>
            <h2 className="text-base font-bold text-[#17140F] mb-3" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>3. Accounts</h2>
            <ul className="space-y-2 list-disc pl-5">
              <li>You must be at least 16 years old to create an account.</li>
              <li>You are responsible for maintaining the confidentiality of your password.</li>
              <li>You may not share your account or allow others to access it.</li>
              <li>We may suspend accounts that violate these Terms without prior notice.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-bold text-[#17140F] mb-3" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>4. Subscription and billing</h2>
            <ul className="space-y-2 list-disc pl-5">
              <li><strong>Free tier</strong> — available to all registered users at no cost, subject to the feature limits described on the pricing page.</li>
              <li><strong>Pro tier</strong> — billed monthly at the price shown on <Link href="/pricing" className="text-[#F5A524] hover:underline">/pricing</Link>. Prices may change with 30 days&apos; notice.</li>
              <li><strong>Cancellation</strong> — you may cancel your Pro subscription at any time from your account settings. You retain Pro access until the end of the current billing period.</li>
              <li><strong>Refunds</strong> — if you are not satisfied, contact <a href="mailto:support@sonneai.com" className="text-[#F5A524] hover:underline">support@sonneai.com</a> and we will work it out on a case-by-case basis. No automatic refunds for partial billing periods.</li>
              <li>All payments are processed by Stripe and subject to their terms.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-bold text-[#17140F] mb-3" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>5. Acceptable use</h2>
            <p className="mb-2">You agree not to:</p>
            <ul className="space-y-2 list-disc pl-5">
              <li>Use the service to cheat in actual job interviews in a way that misrepresents your abilities.</li>
              <li>Reverse-engineer, scrape, or extract the AI questions, scoring rubrics, or training methodologies in bulk.</li>
              <li>Resell, sublicense, or share your account credentials.</li>
              <li>Attempt to circumvent rate limits, credit systems, or access controls.</li>
              <li>Submit content that is harmful, unlawful, or violates third-party rights.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-bold text-[#17140F] mb-3" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>6. AI-generated content</h2>
            <p>Interview questions, follow-ups, and diagnostic reports are generated by AI and are provided for practice and educational purposes only. They may not perfectly reflect a specific employer&apos;s interview process. We make no guarantee that using this service will result in passing any particular interview or receiving a job offer.</p>
          </section>

          <section>
            <h2 className="text-base font-bold text-[#17140F] mb-3" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>7. Intellectual property</h2>
            <p>The platform, interface, scoring methodology, and all original content are owned by Sonne AI. Your interview answers and CV content remain your property. You grant us a limited licence to process that content solely to deliver the service to you.</p>
          </section>

          <section>
            <h2 className="text-base font-bold text-[#17140F] mb-3" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>8. Limitation of liability</h2>
            <p>To the maximum extent permitted by law, Sonne AI is not liable for indirect, incidental, or consequential damages arising from your use of the service. Our total liability in any 12-month period shall not exceed the amount you paid us in that period.</p>
          </section>

          <section>
            <h2 className="text-base font-bold text-[#17140F] mb-3" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>9. Termination</h2>
            <p>We may terminate or suspend your account at any time for violations of these Terms. You may delete your account at any time from Settings. Upon termination, your right to use the service ceases immediately.</p>
          </section>

          <section>
            <h2 className="text-base font-bold text-[#17140F] mb-3" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>10. Changes to Terms</h2>
            <p>We may update these Terms. We will notify you of material changes by email or in-app notice at least 14 days before they take effect. Continued use after that date constitutes acceptance.</p>
          </section>

          <section>
            <h2 className="text-base font-bold text-[#17140F] mb-3" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>11. Governing law</h2>
            <p>These Terms are governed by applicable law. We aim to resolve any dispute promptly and in good faith. If you have a concern, please contact us at <a href="mailto:support@sonneai.com" className="text-[#F5A524] hover:underline">support@sonneai.com</a> before pursuing formal proceedings. Nothing in these Terms limits mandatory consumer protection rights you may have under the laws of your country.</p>
          </section>

          <section>
            <h2 className="text-base font-bold text-[#17140F] mb-3" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>12. Contact</h2>
            <p>Questions about these Terms: <a href="mailto:support@sonneai.com" className="text-[#F5A524] hover:underline">support@sonneai.com</a>.</p>
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
            <Link href="/privacy" className="hover:text-[#17140F] transition-colors">Privacy</Link>
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
