import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { adminClient } from '@/lib/supabase/admin'

const SITE = 'https://sonneai.com'

interface ShareData {
  share_token: string
  headline_en: string
  top_strength: string
  top_gap: string
  overall_score: number | null
  language: string
  module_name_en: string
  module_name_fr: string
}

async function getShareData(token: string): Promise<ShareData | null> {
  const sb = adminClient()
  const { data } = await sb
    .from('diagnostic_reports')
    .select(`
      share_token, headline_en, top_strength, top_gap, overall_score,
      interview_sessions!inner ( language, skill_modules!inner ( name_en, name_fr ) )
    `)
    .eq('share_token', token)
    .single()

  if (!data) return null
  const session = (data as any).interview_sessions
  return {
    share_token: data.share_token,
    headline_en: data.headline_en,
    top_strength: data.top_strength,
    top_gap: data.top_gap,
    overall_score: data.overall_score,
    language: session.language,
    module_name_en: session.skill_modules.name_en,
    module_name_fr: session.skill_modules.name_fr,
  }
}

export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
  const data = await getShareData(params.id)
  if (!data) return { title: 'Result not found — Sonne AI' }

  const module = data.module_name_en
  const score  = data.overall_score != null ? `${data.overall_score.toFixed(1)}/4` : null
  const title  = `${module} interview result — Sonne AI`
  const desc   = [
    score && `Score: ${score}`,
    data.top_strength,
  ].filter(Boolean).join(' · ')
  const ogImg  = `${SITE}/api/og?token=${params.id}`

  return {
    title,
    description: desc,
    openGraph: {
      title,
      description: desc,
      url: `${SITE}/share/${params.id}`,
      siteName: 'Sonne AI',
      type: 'website',
      images: [{ url: ogImg, width: 1200, height: 630, alt: title }],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description: desc,
      images: [ogImg],
    },
  }
}

function SunMark({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 14 14" fill="none">
      <circle cx="7" cy="7" r="3" fill="#F5A524" />
      {[0,45,90,135,180,225,270,315].map((deg, i) => {
        const r = (Math.PI * deg) / 180
        return (
          <line key={i}
            x1={7 + 4 * Math.cos(r)} y1={7 + 4 * Math.sin(r)}
            x2={7 + 5.5 * Math.cos(r)} y2={7 + 5.5 * Math.sin(r)}
            stroke="#F5A524" strokeWidth="1.2" strokeLinecap="round" />
        )
      })}
    </svg>
  )
}

function ScoreRing({ score }: { score: number }) {
  const pct   = Math.min(score / 4, 1)
  const color = score >= 3 ? '#2E7D5B' : score >= 2 ? '#C77D2E' : '#B24C3F'
  const label = score >= 3 ? 'Strong' : score >= 2 ? 'Developing' : 'Needs Work'
  const r = 44
  const circ = 2 * Math.PI * r
  return (
    <div className="flex flex-col items-center gap-2">
      <svg width="112" height="112" viewBox="0 0 112 112">
        <circle cx="56" cy="56" r={r} fill="none" stroke="#E7E2D8" strokeWidth="8" />
        <circle cx="56" cy="56" r={r} fill="none" stroke={color} strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={`${pct * circ} ${circ}`}
          transform="rotate(-90 56 56)" style={{ transition: 'stroke-dasharray .7s ease' }} />
        <text x="56" y="50" textAnchor="middle" fontSize="22" fontWeight="700"
          fill={color} fontFamily="'JetBrains Mono',monospace">{score.toFixed(1)}</text>
        <text x="56" y="66" textAnchor="middle" fontSize="11" fill="#9CA3AF"
          fontFamily="'JetBrains Mono',monospace">/4</text>
      </svg>
      <span className="text-xs font-bold px-3 py-1 rounded-full"
        style={{
          background: score >= 3 ? '#F0FDF4' : score >= 2 ? '#FFFBEB' : '#FEF2F2',
          color,
          border: `1px solid ${score >= 3 ? '#BBF7D0' : score >= 2 ? '#FDE68A' : '#FECACA'}`,
          fontFamily: "'Space Grotesk',sans-serif",
        }}>
        {label}
      </span>
    </div>
  )
}

export default async function SharePage({ params }: { params: { id: string } }) {
  const data = await getShareData(params.id)
  if (!data) notFound()

  const moduleName = data.language === 'fr' ? data.module_name_fr : data.module_name_en
  const shareUrl   = `${SITE}/share/${data.share_token}`

  return (
    <div style={{ background: '#FBFAF7', minHeight: '100vh', fontFamily: "'Inter',system-ui,sans-serif" }}>
      {/* Nav */}
      <nav style={{ background: '#1E2A44', position: 'sticky', top: 0, zIndex: 20 }}>
        <div style={{ maxWidth: 720, margin: '0 auto', padding: '0 20px', height: 56, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(245,165,36,.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <SunMark size={16} />
            </div>
            <span style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, color: '#fff', fontSize: 15 }}>Sonne AI</span>
          </Link>
          <Link href="/app/start"
            style={{ background: '#F5A524', color: '#17140F', fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: 13, padding: '8px 18px', borderRadius: 8, textDecoration: 'none' }}>
            Practice yours →
          </Link>
        </div>
      </nav>

      <div style={{ maxWidth: 720, margin: '0 auto', padding: '36px 20px 64px' }}>

        {/* Module badge */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24 }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: '#F5A524', background: 'rgba(245,165,36,.1)', border: '1px solid rgba(245,165,36,.25)', borderRadius: 6, padding: '4px 10px', fontFamily: "'JetBrains Mono',monospace", letterSpacing: '.06em', textTransform: 'uppercase' }}>
            MOCK INTERVIEW RESULT
          </span>
        </div>

        {/* Hero card */}
        <div style={{
          background: '#fff',
          border: '1px solid #E7E2D8',
          borderRadius: 20,
          overflow: 'hidden',
          boxShadow: '0 2px 16px rgba(0,0,0,.06)',
          marginBottom: 16,
        }}>
          {/* Card header stripe */}
          <div style={{ background: 'linear-gradient(135deg,#1E2A44 0%,#2d3f61 100%)', padding: '28px 32px 24px' }}>
            <p style={{ fontSize: 11, fontWeight: 600, color: 'rgba(245,165,36,.8)', letterSpacing: '.1em', textTransform: 'uppercase', fontFamily: "'JetBrains Mono',monospace", marginBottom: 6 }}>
              MODULE EVALUATED
            </p>
            <h1 style={{ fontSize: 24, fontWeight: 800, color: '#fff', margin: 0, fontFamily: "'Space Grotesk',sans-serif", lineHeight: 1.2 }}>
              {moduleName}
            </h1>
          </div>

          {/* Score + headline */}
          <div style={{ padding: '28px 32px', display: 'flex', gap: 28, alignItems: 'flex-start', flexWrap: 'wrap' }}>
            {data.overall_score != null && (
              <div style={{ flexShrink: 0 }}>
                <ScoreRing score={data.overall_score} />
              </div>
            )}
            <div style={{ flex: 1, minWidth: 200 }}>
              {data.headline_en && (
                <p style={{ fontSize: 15, color: '#374151', lineHeight: 1.65, margin: '0 0 16px' }}>
                  {data.headline_en}
                </p>
              )}
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                <span style={{ fontSize: 11, color: '#9CA3AF', fontFamily: "'JetBrains Mono',monospace" }}>
                  Shared from
                </span>
                <span style={{ fontSize: 11, color: '#F5A524', fontWeight: 700, fontFamily: "'JetBrains Mono',monospace" }}>
                  sonneai.com
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Strength + Gap */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(280px,1fr))', gap: 16, marginBottom: 16 }}>
          <div style={{
            background: '#F0FDF4', border: '1px solid #BBF7D0',
            borderRadius: 16, padding: '20px 24px',
          }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: '#2E7D5B', letterSpacing: '.08em', fontFamily: "'JetBrains Mono',monospace", marginBottom: 10 }}>
              ✓ TOP STRENGTH
            </p>
            <p style={{ fontSize: 14, color: '#17140F', lineHeight: 1.6, margin: 0 }}>
              {data.top_strength}
            </p>
          </div>

          <div style={{
            background: '#FFFBEB', border: '1px solid #FDE68A',
            borderRadius: 16, padding: '20px 24px',
          }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: '#C77D2E', letterSpacing: '.08em', fontFamily: "'JetBrains Mono',monospace", marginBottom: 10 }}>
              → TOP GAP
            </p>
            <p style={{ fontSize: 14, color: '#17140F', lineHeight: 1.6, margin: 0 }}>
              {data.top_gap}
            </p>
          </div>
        </div>

        {/* Teaser: blurred sub-skills */}
        <div style={{
          background: '#fff', border: '1px solid #E7E2D8',
          borderRadius: 16, padding: '20px 24px', marginBottom: 28,
          position: 'relative', overflow: 'hidden',
        }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: '#9CA3AF', letterSpacing: '.08em', fontFamily: "'JetBrains Mono',monospace", marginBottom: 14 }}>
            SUB-SKILL BREAKDOWN
          </p>
          {/* Blurred mock rows */}
          <div style={{ filter: 'blur(5px)', userSelect: 'none', pointerEvents: 'none', marginBottom: 16 }}>
            {['Sub-skill 1','Sub-skill 2','Sub-skill 3'].map(l => (
              <div key={l} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <span style={{ fontSize: 13, color: '#374151' }}>{l}</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ width: 120, height: 6, background: '#E7E2D8', borderRadius: 4, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: '70%', background: '#2E7D5B', borderRadius: 4 }} />
                  </div>
                  <span style={{ fontSize: 11, color: '#9CA3AF', fontFamily: "'JetBrains Mono',monospace" }}>?/4</span>
                </div>
              </div>
            ))}
          </div>
          {/* Overlay CTA */}
          <div style={{ textAlign: 'center', borderTop: '1px solid #F3F0EB', paddingTop: 16 }}>
            <p style={{ fontSize: 12, color: '#7A7267', marginBottom: 10 }}>
              Full breakdown and improvement plan available when you practice on Sonne AI.
            </p>
            <Link href="/app/start"
              style={{ display: 'inline-block', background: '#1E2A44', color: '#fff', fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: 13, padding: '9px 20px', borderRadius: 9, textDecoration: 'none' }}>
              Practice for free →
            </Link>
          </div>
        </div>

        {/* Share actions */}
        <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
          <a
            href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`}
            target="_blank" rel="noopener noreferrer"
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              background: '#0A66C2', color: '#fff',
              fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: 13,
              padding: '10px 20px', borderRadius: 9, textDecoration: 'none',
            }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
            </svg>
            Share on LinkedIn
          </a>
          <a
            href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(`🎯 Mock ${moduleName} interview on Sonne AI\n\nSee my result: ${shareUrl}`)}`}
            target="_blank" rel="noopener noreferrer"
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              background: '#000', color: '#fff',
              fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: 13,
              padding: '10px 20px', borderRadius: 9, textDecoration: 'none',
            }}>
            𝕏 Share on X
          </a>
        </div>

        {/* Bottom CTA card */}
        <div style={{
          background: 'linear-gradient(135deg,#1E2A44 0%,#2d3f61 100%)',
          borderRadius: 20, padding: '28px 32px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          gap: 20, flexWrap: 'wrap',
        }}>
          <div>
            <p style={{ fontSize: 15, fontWeight: 700, color: '#fff', fontFamily: "'Space Grotesk',sans-serif", marginBottom: 4 }}>
              How would you score on {moduleName}?
            </p>
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,.6)', margin: 0 }}>
              AI interview prep · instant diagnostic · free to start
            </p>
          </div>
          <Link href="/app/start"
            style={{ flexShrink: 0, background: '#F5A524', color: '#17140F', fontFamily: "'Space Grotesk',sans-serif", fontWeight: 800, fontSize: 14, padding: '11px 24px', borderRadius: 10, textDecoration: 'none', whiteSpace: 'nowrap' }}>
            Try it now →
          </Link>
        </div>

        <p style={{ textAlign: 'center', fontSize: 11, color: '#B8B2A8', marginTop: 28 }}>
          Generated by <a href={SITE} style={{ color: '#C77D2E', textDecoration: 'none' }}>sonneai.com</a> · AI interview preparation for applied AI roles ·{' '}
          <a href={shareUrl} style={{ color: '#B8B2A8', textDecoration: 'none', fontFamily: "'JetBrains Mono',monospace" }}>{shareUrl.replace('https://', '')}</a>
        </p>
      </div>
    </div>
  )
}
