'use client'
import { Suspense, useState, useEffect } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import AppLayout from '@/components/app/AppLayout'
import { createClient } from '@/lib/supabase/client'
import type { PanelReport, PanelRoundReport, RoundType } from '@/lib/claude/panel-interviewer'

const ROUND_LABELS: Record<RoundType, { label: string; emoji: string }> = {
  screen:        { label: 'Screening',    emoji: '📋' },
  technical:     { label: 'Technical',    emoji: '⚙️' },
  system_design: { label: 'System Design', emoji: '🏗️' },
  behavioral:    { label: 'Behavioral',   emoji: '💬' },
}

function scoreColor(score: number) {
  if (score >= 3.5) return { bg: '#ECFDF5', text: '#065F46', border: '#A7F3D0' }
  if (score >= 2.8) return { bg: '#EFF6FF', text: '#1E40AF', border: '#BFDBFE' }
  if (score >= 2.0) return { bg: '#FFF7ED', text: '#9A3412', border: '#FED7AA' }
  return { bg: '#FEF2F2', text: '#991B1B', border: '#FECACA' }
}

function ScoreBar({ score }: { score: number }) {
  const pct = (score / 4) * 100
  const col = scoreColor(score)
  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 h-2 rounded-full bg-[#F3F4F6] overflow-hidden">
        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: col.text }} />
      </div>
      <span className="text-sm font-bold" style={{ color: col.text, minWidth: 32 }}>{score.toFixed(1)}</span>
    </div>
  )
}

function RoundCard({ round }: { round: PanelRoundReport }) {
  const info   = ROUND_LABELS[round.round_type as RoundType] ?? { label: round.round_type, emoji: '🔹' }
  const colors = scoreColor(round.score)
  return (
    <div className="bg-white rounded-xl border border-[#E5E7EB] p-5" style={{ boxShadow: '0 1px 4px rgba(0,0,0,.05)' }}>
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="text-xl">{info.emoji}</span>
          <div>
            <div className="font-semibold text-[#111827] text-sm">{info.label}</div>
            <div className="text-xs font-medium px-2 py-0.5 rounded-full mt-1 inline-block border"
              style={{ background: colors.bg, color: colors.text, borderColor: colors.border }}>
              {round.score_label}
            </div>
          </div>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold" style={{ color: colors.text }}>{round.score.toFixed(1)}</div>
          <div className="text-xs text-[#9CA3AF]">/ 4.0</div>
        </div>
      </div>

      <ScoreBar score={round.score} />

      {round.strengths.length > 0 && (
        <div className="mt-4">
          <p className="text-[10px] font-semibold text-[#9CA3AF] uppercase tracking-widest mb-2">Strengths</p>
          <ul className="space-y-1">
            {round.strengths.map((s, i) => (
              <li key={i} className="flex items-start gap-2 text-xs text-[#374151]">
                <span className="text-[#10B981] mt-0.5 flex-shrink-0">✓</span>
                <span>{s}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {round.gaps.length > 0 && (
        <div className="mt-3">
          <p className="text-[10px] font-semibold text-[#9CA3AF] uppercase tracking-widest mb-2">Gaps</p>
          <ul className="space-y-1">
            {round.gaps.map((g, i) => (
              <li key={i} className="flex items-start gap-2 text-xs text-[#374151]">
                <span className="text-[#F5A524] mt-0.5 flex-shrink-0">→</span>
                <span>{g}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

function PanelReportInner() {
  const searchParams   = useSearchParams()
  const router         = useRouter()
  const panelSessionId = searchParams.get('id') ?? ''

  const [report,  setReport]  = useState<PanelReport | null>(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState('')

  useEffect(() => {
    if (!panelSessionId) { router.push('/app/start'); return }

    async function load() {
      try {
        const { data: { session } } = await createClient().auth.getSession()
        const hdrs: Record<string, string> = session?.access_token
          ? { Authorization: `Bearer ${session.access_token}` }
          : {}

        const res  = await fetch('/api/panel/end', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...hdrs },
          body: JSON.stringify({ panel_session_id: panelSessionId }),
        })
        const data = await res.json()
        if (!res.ok) { setError(data.error ?? 'Failed to load report.'); setLoading(false); return }
        setReport(data.report)
      } catch { setError('Network error.') }
      finally { setLoading(false) }
    }

    load()
  }, [panelSessionId, router])

  if (loading) {
    return (
      <AppLayout>
        <div className="flex flex-col items-center justify-center h-full gap-4">
          <div style={{ width: 32, height: 32, border: '3px solid #E5E7EB', borderTopColor: '#F5A524', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
          <p className="text-sm text-[#9CA3AF]">Generating your scorecard...</p>
        </div>
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </AppLayout>
    )
  }

  if (error || !report) {
    return (
      <AppLayout>
        <div className="max-w-2xl mx-auto px-6 py-16 text-center">
          <p className="text-[#DC2626] text-sm mb-4">{error || 'Report not available.'}</p>
          <Link href="/app/start" className="text-sm font-medium text-[#F5A524]">Start a new session →</Link>
        </div>
      </AppLayout>
    )
  }

  const overallColors = scoreColor(report.overall_score)

  return (
    <AppLayout>
      <div className="max-w-3xl mx-auto px-6 py-8 space-y-6">

        {/* Overall score */}
        <div className="bg-white rounded-2xl border border-[#E5E7EB] p-6" style={{ boxShadow: '0 2px 8px rgba(0,0,0,.06)' }}>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-xl font-bold text-[#111827]">Panel Scorecard</h1>
              <p className="text-sm text-[#6B7280] mt-0.5">{report.rounds.length}-round simulation complete</p>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold" style={{ color: overallColors.text }}>{report.overall_score.toFixed(1)}</div>
              <div className="text-xs text-[#9CA3AF]">/ 4.0</div>
              <div className="text-xs font-semibold mt-1 px-2 py-0.5 rounded-full border inline-block"
                style={{ background: overallColors.bg, color: overallColors.text, borderColor: overallColors.border }}>
                {report.readiness_label}
              </div>
            </div>
          </div>

          {/* Mini round summary */}
          <div className="grid grid-cols-2 gap-3 mb-5">
            {report.rounds.map(r => {
              const info = ROUND_LABELS[r.round_type as RoundType] ?? { label: r.round_type, emoji: '🔹' }
              const cols = scoreColor(r.score)
              return (
                <div key={r.round_type} className="flex items-center justify-between px-3 py-2 rounded-lg border"
                  style={{ background: cols.bg, borderColor: cols.border }}>
                  <span className="text-xs" style={{ color: cols.text }}>{info.emoji} {info.label}</span>
                  <span className="text-sm font-bold" style={{ color: cols.text }}>{r.score.toFixed(1)}</span>
                </div>
              )
            })}
          </div>

          <div className="space-y-3 border-t border-[#F3F4F6] pt-4">
            <div>
              <p className="text-[10px] font-semibold text-[#9CA3AF] uppercase tracking-widest mb-1">Top strength</p>
              <p className="text-sm text-[#374151]">{report.top_strength}</p>
            </div>
            <div>
              <p className="text-[10px] font-semibold text-[#9CA3AF] uppercase tracking-widest mb-1">Biggest gap</p>
              <p className="text-sm text-[#374151]">{report.top_gap}</p>
            </div>
          </div>
        </div>

        {/* Per-round breakdown */}
        <div>
          <h2 className="text-sm font-semibold text-[#374151] mb-3">Round breakdown</h2>
          <div className="space-y-4">
            {report.rounds.map(r => <RoundCard key={r.round_type} round={r} />)}
          </div>
        </div>

        {/* Next steps */}
        <div className="bg-[#FFF8EE] border border-[#F5A524]/30 rounded-xl p-5">
          <p className="text-[10px] font-semibold text-[#9CA3AF] uppercase tracking-widest mb-2">Next steps</p>
          <p className="text-sm text-[#374151] leading-relaxed">{report.next_steps}</p>
        </div>

        {/* Actions */}
        <div className="flex gap-3 pb-8">
          <Link href="/app/start"
            className="flex-1 py-3 rounded-xl text-sm font-semibold text-center transition-all"
            style={{ background: '#F5A524', color: '#17140F', boxShadow: '0 4px 12px rgba(245,165,36,.3)' }}>
            Start another session →
          </Link>
          <Link href="/app/history"
            className="flex-1 py-3 rounded-xl text-sm font-semibold text-center border border-[#E5E7EB] text-[#374151] hover:bg-[#F8F9FB] transition-colors">
            View history
          </Link>
        </div>
      </div>
    </AppLayout>
  )
}

export default function PanelReportPage() {
  return <Suspense fallback={null}><PanelReportInner /></Suspense>
}
