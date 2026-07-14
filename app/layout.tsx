import type { Metadata } from 'next'
import { Inter, Space_Grotesk, JetBrains_Mono } from 'next/font/google'
import Script from 'next/script'
import { GoogleAnalytics } from '@next/third-parties/google'
import './globals.css'

const GA4_ID = process.env.NEXT_PUBLIC_GA4_ID  // set to G-XXXXXXXXXX once GA4 property is created

const inter         = Inter({ subsets: ['latin'], variable: '--font-inter' })
const spaceGrotesk  = Space_Grotesk({ subsets: ['latin'], variable: '--font-space' })
const jetbrainsMono = JetBrains_Mono({ subsets: ['latin'], variable: '--font-mono' })

export const metadata: Metadata = {
  metadataBase: new URL('https://sonneai.com'),
  title: 'Sonne AI — AI Engineer Interview Prep | Coding Exercises, RAG, Agents, MLOps',
  description: 'Practice AI engineer interviews with real hands-on coding exercises graded by AI — fix bugs, run tests, get a scorecard. Plus RAG, agents, evaluation, and MLOps Q&A. EN/FR. Free CV diagnostic.',
  keywords: ['AI engineer interview', 'LLM interview prep', 'RAG interview', 'agent orchestration', 'MLOps interview', 'applied AI engineer', 'CV diagnostic AI', 'hands-on coding interview', 'AI coding exercises'],
  alternates: {
    canonical: 'https://sonneai.com',
  },
  openGraph: {
    title: 'Sonne AI — AI Engineer Interview Prep with Hands-On Coding',
    description: 'Fix real bugs, run live tests, and get an AI scorecard — then practice RAG, agents, evaluation, and MLOps Q&A. The most practical AI interview prep available. EN/FR.',
    type: 'website',
    url: 'https://sonneai.com',
    siteName: 'Sonne AI',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${inter.variable} ${spaceGrotesk.variable} ${jetbrainsMono.variable} ${inter.className} antialiased`}>
        {children}
        {/* Google Ads tag */}
        <Script
          src="https://www.googletagmanager.com/gtag/js?id=AW-18314404853"
          strategy="afterInteractive"
        />
        <Script id="gtag-init" strategy="afterInteractive">{`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', 'AW-18314404853');
          ${GA4_ID ? `gtag('config', '${GA4_ID}');` : ''}
        `}</Script>
        {/* GA4 — loads once NEXT_PUBLIC_GA4_ID is set in env */}
        {GA4_ID && <GoogleAnalytics gaId={GA4_ID} />}
      </body>
    </html>
  )
}
