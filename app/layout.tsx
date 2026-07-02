import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Sonne AI — AI Engineering Interview Prep',
  description: 'Practice the exact Anthropic, OpenAI, and Google DeepMind interview loops. Technical correctness grading. Real sourced questions.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${inter.className} bg-bg text-bright antialiased`}>
        {children}
      </body>
    </html>
  )
}
