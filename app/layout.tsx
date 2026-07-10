import type { Metadata } from 'next'
import { Inter, Space_Grotesk, JetBrains_Mono } from 'next/font/google'
import './globals.css'

const inter         = Inter({ subsets: ['latin'], variable: '--font-inter' })
const spaceGrotesk  = Space_Grotesk({ subsets: ['latin'], variable: '--font-space' })
const jetbrainsMono = JetBrains_Mono({ subsets: ['latin'], variable: '--font-mono' })

export const metadata: Metadata = {
  metadataBase: new URL('https://sonneai.com'),
  title: 'Sonne AI — AI Engineer Interview Prep | RAG, Agents, MLOps',
  description: 'Score your CV and practice AI engineer interviews — RAG, agents, evaluation, MLOps, voice mode, and practical coding questions. EN/FR. Free CV diagnostic. Applied AI, LLM, and Automation Engineer roles.',
  keywords: ['AI engineer interview', 'LLM interview prep', 'RAG interview', 'agent orchestration', 'MLOps interview', 'applied AI engineer', 'CV diagnostic AI'],
  alternates: {
    canonical: 'https://sonneai.com',
  },
  openGraph: {
    title: 'Sonne AI — AI Engineer Interview Prep',
    description: 'Adaptive interview practice for AI, LLM, and Automation Engineer roles. Sub-skill diagnostic, voice mode, trade-off scoring, practical coding questions. EN/FR.',
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
      </body>
    </html>
  )
}
