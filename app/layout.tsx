import type { Metadata } from 'next'
import { Inter, Space_Grotesk, JetBrains_Mono } from 'next/font/google'
import './globals.css'

const inter         = Inter({ subsets: ['latin'], variable: '--font-inter' })
const spaceGrotesk  = Space_Grotesk({ subsets: ['latin'], variable: '--font-space' })
const jetbrainsMono = JetBrains_Mono({ subsets: ['latin'], variable: '--font-mono' })

export const metadata: Metadata = {
  title: 'Sonne AI — Applied AI Engineer Interview Prep',
  description: 'Score your CV and practice the Applied AI Engineer interview. RAG, agents, evaluation, cost & safety. EN/FR. Free CV diagnostic — no card, no login.',
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
