import Link from 'next/link'

export const metadata = { title: 'Terms of Service — Sonne AI' }

const H = ({ children }: { children: React.ReactNode }) => (
  <h2 className="text-base font-bold text-[#17140F] mb-3" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>{children}</h2>
)
const P = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => (
  <p className={`text-sm text-[#374151] leading-relaxed ${className}`}>{children}</p>
)
const UL = ({ children }: { children: React.ReactNode }) => (
  <ul className="space-y-2 list-disc pl-5 text-sm text-[#374151] leading-relaxed">{children}</ul>
)

export default function Terms() {
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
        <h1 className="text-3xl font-bold text-[#17140F] mb-2" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>Terms of Service</h1>
        <P className="text-[#7A7267] mb-2">Last updated: 15 July 2026</P>
        <P className="text-[#7A7267] mb-10">These Terms govern your use of sonneai.com and all associated services (&ldquo;the Service&rdquo;). By creating an account or using the Service you agree to these Terms. If you do not agree, do not use the Service. Where mandatory consumer-protection law in your country grants you stronger rights than these Terms, those rights prevail.</P>

        <div className="space-y-10">

          <section>
            <H>1. Who we are</H>
            <P>Sonne AI operates the interview-preparation platform at <strong>sonneai.com</strong>. Contact: <a href="mailto:support@sonneai.com" className="text-[#F5A524] hover:underline">support@sonneai.com</a>.</P>
          </section>

          <section>
            <H>2. Service description</H>
            <P>Sonne AI is an AI-powered interview-preparation platform for Applied AI Engineer roles. It provides adaptive practice sessions, diagnostic reports, coding exercises, and CV analysis powered by large language models. The Service is for your personal, non-commercial practice use only.</P>
          </section>

          <section>
            <H>3. Eligibility and accounts</H>
            <UL>
              <li>You must be at least <strong>16 years old</strong> to create an account (or the minimum digital age of consent in your country if higher).</li>
              <li>You are responsible for maintaining the confidentiality of your password and for all activity that occurs under your account.</li>
              <li>You may not share your account or allow others to access it.</li>
              <li>You must provide accurate information when registering. We may suspend accounts linked to false information.</li>
              <li>We may suspend or terminate accounts that violate these Terms, with or without prior notice depending on the severity of the violation.</li>
            </UL>
          </section>

          <section>
            <H>4. Subscription and billing</H>
            <UL>
              <li><strong>Free tier</strong> — available at no cost to all registered users, subject to feature limits described on the <Link href="/pricing" className="text-[#F5A524] hover:underline">pricing page</Link>.</li>
              <li><strong>Pro tier</strong> — billed monthly at the price shown on the pricing page at the time you subscribe. Prices shown exclude VAT/GST; applicable taxes will be added at checkout depending on your location. We will give at least <strong>30 days&apos; notice</strong> of any price increase before it applies to your subscription.</li>
              <li><strong>Cancellation</strong> — you may cancel at any time from your account settings. Your Pro access continues until the end of the current billing period. No pro-rata refunds are issued for unused days.</li>
              <li>All payments are processed by <strong>Stripe</strong> and subject to <a href="https://stripe.com/legal" target="_blank" rel="noopener" className="text-[#F5A524] hover:underline">Stripe&apos;s terms</a>.</li>
            </UL>
          </section>

          <section>
            <H>5. EU / UK right of withdrawal</H>
            <P className="mb-3">If you are a consumer located in the European Union or the United Kingdom, you ordinarily have a <strong>14-day right of withdrawal</strong> from a distance contract under the Consumer Rights Directive (2011/83/EU) or the UK Consumer Contracts Regulations 2013.</P>
            <P className="mb-3">However, when you start a paid Pro subscription you will be asked to <strong>expressly request that we begin providing the digital service immediately</strong> and to acknowledge that your right of withdrawal is thereby waived once the service has been fully performed — or, for a subscription, once delivery has begun. This is standard for digital services under Art. 16(m) of the Directive.</P>
            <P>If performance has not yet begun (e.g. you subscribed but have not accessed any Pro feature), you may exercise your right of withdrawal within 14 days by emailing <a href="mailto:support@sonneai.com" className="text-[#F5A524] hover:underline">support@sonneai.com</a> with the subject &ldquo;Right of Withdrawal.&rdquo; We will refund your payment within 14 days.</P>
          </section>

          <section>
            <H>6. Acceptable use</H>
            <P className="mb-2">You agree not to:</P>
            <UL>
              <li>Use the Service to impersonate someone else or misrepresent your abilities in actual job interviews.</li>
              <li>Reverse-engineer, scrape, or extract AI questions, scoring rubrics, or training methodologies in bulk.</li>
              <li>Resell, sublicense, or share your account credentials.</li>
              <li>Attempt to circumvent rate limits, credit systems, or access controls.</li>
              <li>Submit content that is harmful, unlawful, defamatory, or that infringes third-party intellectual property rights.</li>
              <li>Use automated tools (bots, scrapers) to access the Service without our written consent.</li>
            </UL>
          </section>

          <section>
            <H>7. AI-generated content and no guarantee of results</H>
            <P>Interview questions, follow-up prompts, diagnostic reports, and CV scores are generated by AI and are provided for <strong>educational and practice purposes only</strong>. They may not reflect any specific employer&apos;s actual interview process. <strong>We make no guarantee that using this Service will result in passing any interview or receiving a job offer.</strong> AI outputs can be inaccurate — treat them as one input among many, not as a definitive assessment.</P>
          </section>

          <section>
            <H>8. Intellectual property</H>
            <P>The platform, interface, scoring methodology, question bank, and all original content are owned by Sonne AI and protected by copyright and other intellectual property laws. Your interview answers and CV content remain <strong>your property</strong>. You grant us a limited, non-exclusive licence to process that content solely to deliver the Service to you. We do not claim ownership of your content and do not use it to train AI models.</P>
          </section>

          <section>
            <H>9. Limitation of liability</H>
            <P className="mb-2">To the maximum extent permitted by applicable law:</P>
            <UL>
              <li>Sonne AI is not liable for indirect, incidental, special, or consequential damages arising from your use of or inability to use the Service.</li>
              <li>Our total aggregate liability to you in any 12-month period shall not exceed the greater of (a) the amount you paid us in that period, or (b) €50.</li>
            </UL>
            <P className="mt-3">Nothing in these Terms excludes or limits liability for death or personal injury caused by negligence, fraud, or any other liability that cannot be limited by law. If you are a consumer in the EU or UK, your statutory rights are not affected by this clause.</P>
          </section>

          <section>
            <H>10. Termination</H>
            <P>We may terminate or suspend your account immediately for material violations of these Terms (e.g. abuse, fraud, scraping). For less serious violations we will give you notice and an opportunity to cure. You may delete your account at any time from Settings. Upon termination, your right to use the Service ceases immediately; your data is deleted per our <Link href="/privacy" className="text-[#F5A524] hover:underline">Privacy Policy</Link>.</P>
          </section>

          <section>
            <H>11. Changes to Terms</H>
            <P>We may update these Terms. We will notify you of material changes by email and in-app notice at least <strong>14 days</strong> before they take effect. Continued use after the effective date constitutes acceptance. If you do not accept the new Terms, you must stop using the Service and may delete your account.</P>
          </section>

          <section>
            <H>12. Governing law and dispute resolution</H>
            <P className="mb-3">These Terms are governed by the laws of <strong>Morocco</strong>. Any dispute that cannot be resolved informally (by emailing us first) shall be subject to the jurisdiction of the competent courts of Morocco.</P>
            <P className="mb-3"><strong>EU consumers:</strong> Nothing in these Terms removes your right to rely on mandatory consumer-protection provisions of the law of your country of habitual residence. If you are an EU consumer, you may also use the <strong>EU Online Dispute Resolution platform</strong>: <a href="https://ec.europa.eu/consumers/odr" target="_blank" rel="noopener" className="text-[#F5A524] hover:underline">ec.europa.eu/consumers/odr</a>.</P>
            <P><strong>UK consumers:</strong> UK mandatory consumer rights under the Consumer Rights Act 2015 and Consumer Contracts Regulations 2013 are preserved.</P>
          </section>

          <section>
            <H>13. Contact</H>
            <P>Questions about these Terms or any disputes: <a href="mailto:support@sonneai.com" className="text-[#F5A524] hover:underline">support@sonneai.com</a>. We will respond within 5 business days.</P>
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
