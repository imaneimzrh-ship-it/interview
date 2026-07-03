'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

interface Session {
  id: string
  status: string
  started_at: string
  completed_at: string | null
  language: string
  current_sub_skill_idx: number
  skill_modules: { name_en: string; name_fr: string; slug: string } | null
}

interface Report {
  session_id: string
  overall_score: number
  created_at: string
}

interface Profile { email: string; full_name: string; plan: string }

const MODULE_EMOJI: Record<string, string> = {
  rag_system_design: '🔍',
  agent_orchestration: '🕵️',
  evaluation_testing: '🧪',
  production_mlops: '⚙️',
}

function timeAgo(iso: string) {
  const s = (Date.now() - new Date(iso).getTime()) / 1000
  if (s < 60) return 'just now'
  if (s < 3600) return `${Math.floor(s / 60)}m ago`
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`
  return `${Math.floor(s / 86400)}d ago`
}

function scoreColor(n: number) {
  if (n >= 3.5) return 'text-[#4ADE80]'
  if (n >= 2.5) return 'text-[#4776F7]'
  if (n >= 1.5) return 'text-[#F59E0B]'
  return 'text-[#E84040]'
}

export default function Dashboard() {
  const router = useRouter()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [sessions, setSessions] = useState<Session[]>([])
  const [reports, setReports] = useState<Report[]>([])
  const [loading, setLoading] = useState(true)
  const sb = createClient()

  useEffect(() => { loadData() }, [])

  async function loadData() {
    const { data: { user } } = await sb.auth.getUser()
    if (!user) { router.push('/login'); return }

    const [{ data: p }, { data: s }, { data: r }] = await Promise.all([
      sb.from('profiles').select('email, full_name, plan').eq('id', user.id).single(),
      sb.from('interview_sessions')
        .select('id, status, started_at, completed_at, language, current_sub_skill_idx, skill_modules(name_en, name_fr, slug)')
        .eq('user_id', user.id)
        .order('started_at', { ascending: false })
        .limit(20),
      sb.from('diagnostic_reports')
        .select('session_id, overall_score, created_at')
        .eq('user_id', user.id),
    ])

    setProfile(p)
    setSessions((s ?? []) as unknown as Session[])
    setReports(r ?? [])
    setLoading(false)
  }

  async function deleteSession(id: string, e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    const { data: { session } } = await sb.auth.getSession()
    await fetch(`/api/interview/delete?id=${id}`, {
      method: 'DELETE',
      headers: session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {},
    })
    setSessions(prev => prev.filter(s => s.id !== id))
    setReports(prev => prev.filter(r => r.session_id !== id))
  }

  async function signOut() {
    await sb.auth.signOut()
    router.push('/')
  }

  const reportMap = Object.fromEntries(reports.map(r => [r.session_id, r]))
  const completed = sessions.filter(s => s.status === 'completed')
  const scored = completed.filter(s => reportMap[s.id])
  const avgScore = scored.length
    ? (scored.reduce((a, s) => a + reportMap[s.id].overall_score, 0) / scored.length).toFixed(1)
    : null

  if (loading) return (
    <div className="min-h-screen bg-[#09090C] flex items-center justify-center">
      <div className="w-6 h-6 border-2 border-[#4776F7]/30 border-t-[#4776F7] rounded-full animate-spin" />
    </div>
  )

  return (
    <div className="min-h-screen bg-[#09090C]" style={{ fontFamily: 'Inter, sans-serif' }}>
      {/* Nav */}
      <nav className="sticky top-0 z-50 border-b border-[#1C1D28] bg-[rgba(9,9,12,0.9)] backdrop-blur-sm">
        <div className="max-w-4xl mx-auto px-4 h-12 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-[#4776F7] flex items-center justify-center text-white text-xs font-bold">S</div>
            <span className="font-semibold text-sm text-[#F0F2FA]">Sonne AI</span>
          </Link>
          <div className="flex items-center gap-3">
            {profile?.plan === 'free' && (
              <Link href="/pricing" className="text-xs px-3 py-1 rounded-md bg-[rgba(245,158,11,0.1)] border border-[rgba(245,158,11,0.2)] text-[#F59E0B] font-medium hover:bg-[rgba(245,158,11,0.15)] transition-colors">
                Upgrade
              </Link>
            )}
            <button onClick={signOut} className="text-xs text-[#7A829A] hover:text-[#F0F2FA] transition-colors">Sign out</button>
          </div>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-start justify-between mb-8">
          <div>
            <h1 className="text-xl font-semibold text-[#F0F2FA] mb-1">
              {profile?.full_name ? `Hi, ${profile.full_name.split(' ')[0]}` : 'Dashboard'}
            </h1>
            <p className="text-sm text-[#7A829A]">
              {profile?.plan === 'pro' ? 'Pro · unlimited sessions across all modules' : 'Free · 1 session included'}
            </p>
          </div>
          <Link href="/interview" className="bg-[#4776F7] text-white text-sm font-medium px-4 py-2 rounded-lg hover:opacity-90 transition-opacity">
            + New session
          </Link>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 mb-8">
          {[
            { label: 'Sessions', value: sessions.length },
            { label: 'Completed', value: completed.length },
            { label: 'Avg score', value: avgScore ? `${avgScore}/4` : '—' },
          ].map(stat => (
            <div key={stat.label} className="bg-[#111218] border border-[#1C1D28] rounded-xl p-4 text-center">
              <div className="text-xl font-semibold text-[#F0F2FA]">{stat.value}</div>
              <div className="text-xs text-[#7A829A] mt-0.5">{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Sessions list */}
        {sessions.length === 0 ? (
          <div className="bg-[#111218] border border-[#1C1D28] rounded-xl p-12 text-center">
            <p className="text-[#7A829A] text-sm mb-4">No sessions yet. Start your first module.</p>
            <Link href="/interview" className="bg-[#4776F7] text-white text-sm font-medium px-6 py-2.5 rounded-lg hover:opacity-90 transition-opacity">
              Start first session →
            </Link>
          </div>
        ) : (
          <div className="space-y-2">
            <p className="text-xs text-[#7A829A] mb-3">Recent sessions</p>
            {sessions.map(s => {
              const mod = s.skill_modules
              const report = reportMap[s.id]
              const emoji = mod?.slug ? (MODULE_EMOJI[mod.slug] ?? '📋') : '📋'
              const isActive = s.status === 'active'
              const href = report
                ? `/interview/report?id=${s.id}`
                : isActive
                  ? `/interview/session?id=${s.id}&lang=${s.language ?? 'en'}`
                  : '#'

              return (
                <Link key={s.id} href={href}
                  className="bg-[#111218] border border-[#1C1D28] hover:border-[#2A2B38] rounded-xl p-4 flex items-center justify-between gap-4 transition-all group block">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-lg bg-[#1C1D28] flex items-center justify-center text-lg flex-shrink-0">
                      {emoji}
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-[#F0F2FA] truncate">
                        {mod ? (s.language === 'fr' ? mod.name_fr : mod.name_en) : 'Unknown module'}
                      </div>
                      <div className="text-xs text-[#7A829A]">
                        {timeAgo(s.started_at)}
                        {s.status === 'active' && ` · Sub-skill ${s.current_sub_skill_idx + 1}/4`}
                        {s.completed_at && ` · ${Math.round((new Date(s.completed_at).getTime() - new Date(s.started_at).getTime()) / 60000)}m`}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    {report ? (
                      <span className={`text-sm font-bold ${scoreColor(report.overall_score)}`}>
                        {report.overall_score.toFixed(1)}/4
                      </span>
                    ) : isActive ? (
                      <span className="text-xs px-2 py-0.5 rounded-md bg-[rgba(71,118,247,0.1)] text-[#4776F7] border border-[rgba(71,118,247,0.2)]">
                        In progress
                      </span>
                    ) : (
                      <span className="text-xs text-[#3D4260]">No report</span>
                    )}
                    <button
                      onClick={(e) => deleteSession(s.id, e)}
                      className="text-[#3D4260] hover:text-[#E84040] transition-colors text-xs opacity-0 group-hover:opacity-100"
                      title="Delete session"
                    >
                      ✕
                    </button>
                    <span className="text-[#3D4260] text-xs group-hover:text-[#7A829A] transition-colors">→</span>
                  </div>
                </Link>
              )
            })}
          </div>
        )}

        {/* Upgrade banner for free users */}
        {profile?.plan === 'free' && (
          <div className="mt-6 bg-[#111218] border border-[rgba(71,118,247,0.2)] rounded-xl p-5" style={{ boxShadow: '0 0 20px rgba(71,118,247,0.05)' }}>
            <div className="flex items-start gap-3">
              <span className="text-[#4776F7] text-lg flex-shrink-0">★</span>
              <div>
                <div className="text-sm font-semibold text-[#F0F2FA] mb-1">Unlock all 4 modules, unlimited sessions</div>
                <p className="text-xs text-[#7A829A] leading-relaxed mb-3">
                  Full access to RAG System Design, Agent Orchestration, Evaluation & Testing, and Production/MLOps — with adaptive follow-ups and a full diagnostic report. $19/month.
                </p>
                <Link href="/pricing" className="inline-flex items-center gap-1.5 text-xs font-medium text-white bg-[#4776F7] px-4 py-2 rounded-lg hover:opacity-90 transition-opacity">
                  Upgrade to Pro →
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
