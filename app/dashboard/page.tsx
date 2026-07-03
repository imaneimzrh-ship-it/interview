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
  skill_modules: { name_en: string; slug: string } | null
}

interface Report { session_id: string; overall_score: number }
interface Profile { email: string; full_name: string; plan: string }

const MODULE_ICONS: Record<string, string> = {
  rag_system_design: '🔍', agent_orchestration: '🕵️',
  evaluation_testing: '🧪', production_mlops: '⚙️',
}

function timeAgo(iso: string) {
  const s = (Date.now() - new Date(iso).getTime()) / 1000
  if (s < 60) return 'just now'
  if (s < 3600) return `${Math.floor(s/60)}m ago`
  if (s < 86400) return `${Math.floor(s/3600)}h ago`
  return `${Math.floor(s/86400)}d ago`
}

export default function Dashboard() {
  const router = useRouter()
  const sb     = createClient()
  const [profile,  setProfile]  = useState<Profile | null>(null)
  const [sessions, setSessions] = useState<Session[]>([])
  const [reports,  setReports]  = useState<Report[]>([])
  const [loading,  setLoading]  = useState(true)
  const [deleting, setDeleting] = useState<string | null>(null)

  useEffect(() => { loadData() }, [])

  async function loadData() {
    const { data: { user } } = await sb.auth.getUser()
    if (!user) { router.push('/login'); return }
    const [{ data: p }, { data: s }, { data: r }] = await Promise.all([
      sb.from('profiles').select('email, full_name, plan').eq('id', user.id).single(),
      sb.from('interview_sessions')
        .select('id, status, started_at, completed_at, language, current_sub_skill_idx, skill_modules(name_en, slug)')
        .eq('user_id', user.id).order('started_at', { ascending: false }).limit(20),
      sb.from('diagnostic_reports').select('session_id, overall_score').eq('user_id', user.id),
    ])
    setProfile(p)
    setSessions((s ?? []) as unknown as Session[])
    setReports(r ?? [])
    setLoading(false)
  }

  async function deleteSession(id: string) {
    if (!confirm('Delete this session? The transcript and diagnostic will be permanently removed.')) return
    setDeleting(id)
    const { data: { session } } = await sb.auth.getSession()
    const res = await fetch(`/api/interview/delete?id=${id}`, {
      method: 'DELETE',
      headers: session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {},
    })
    if (res.ok) { setSessions(prev => prev.filter(s => s.id !== id)); setReports(prev => prev.filter(r => r.session_id !== id)) }
    setDeleting(null)
  }

  async function openPortal() {
    const { data: { session } } = await sb.auth.getSession()
    const res = await fetch('/api/stripe/portal', {
      method: 'POST',
      headers: session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {},
    })
    const data = await res.json()
    if (data.url) window.location.href = data.url
  }

  async function signOut() { await sb.auth.signOut(); router.push('/') }

  const reportMap  = Object.fromEntries(reports.map(r => [r.session_id, r]))
  const completed  = sessions.filter(s => s.status === 'completed')
  const scored     = completed.filter(s => reportMap[s.id])
  const avg        = scored.length
    ? (scored.reduce((a, s) => a + reportMap[s.id].overall_score, 0) / scored.length).toFixed(1)
    : null

  if (loading) return (
    <div className="min-h-screen bg-[#F8F9FB] flex items-center justify-center">
      <div style={{ width:32,height:32,border:'3px solid #BFDBFE',borderTopColor:'#2563EB',borderRadius:'50%',animation:'spin 1s linear infinite' }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )

  return (
    <div className="min-h-screen bg-[#F8F9FB]" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>

      {/* Nav */}
      <nav className="bg-white border-b border-[#E5E7EB]" style={{ boxShadow: '0 1px 3px rgba(0,0,0,.06)' }}>
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#2563EB] flex items-center justify-center text-white font-bold text-sm shadow-sm">S</div>
            <span className="font-semibold text-[#111827] text-[15px]">Sonne AI</span>
          </Link>
          <div className="flex items-center gap-3">
            {profile?.plan === 'pro' ? (
              <button onClick={openPortal} className="text-xs bg-[#EFF6FF] border border-[#BFDBFE] text-[#1D4ED8] font-semibold px-2.5 py-1 rounded-full hover:bg-[#DBEAFE] transition-colors">
                Pro · Manage billing
              </button>
            ) : (
              <Link href="/pricing" className="text-xs bg-[#FEF3C7] border border-[#FDE68A] text-[#92400E] font-semibold px-2.5 py-1 rounded-full hover:bg-[#FDE68A] transition-colors">
                ↑ Upgrade to Pro
              </Link>
            )}
            <button onClick={signOut} className="text-sm text-[#6B7280] hover:text-[#111827] transition-colors">Sign out</button>
          </div>
        </div>
      </nav>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-bold text-[#111827]">
              Hi, {profile?.full_name?.split(' ')[0] || profile?.email?.split('@')[0] || 'there'} 👋
            </h1>
            <p className="text-[#6B7280] text-sm mt-1">
              {profile?.plan === 'pro'
                ? 'Pro · unlimited sessions across all modules'
                : sessions.filter(s => s.status !== 'abandoned').length < 1
                  ? 'Free · 1 session remaining'
                  : 'Free · No sessions remaining — upgrade to continue'}
            </p>
          </div>
          <Link href="/interview" className="inline-flex items-center gap-2 bg-[#2563EB] text-white text-sm font-medium px-5 py-2.5 rounded-xl hover:bg-[#1D4ED8] transition-colors shadow-sm self-start sm:self-auto">
            + New interview session
          </Link>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          {[
            { label: 'Total sessions', value: sessions.length },
            { label: 'Completed',      value: completed.length },
            { label: 'Average score',  value: avg ? `${avg}/4` : '—' },
          ].map(stat => (
            <div key={stat.label} className="bg-white rounded-xl border border-[#E5E7EB] p-5 text-center" style={{ boxShadow: '0 1px 3px rgba(0,0,0,.05)' }}>
              <div className="text-2xl font-bold text-[#111827] mb-0.5">{stat.value}</div>
              <div className="text-xs text-[#9CA3AF]">{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Sessions */}
        <div className="mb-3">
          <h2 className="text-sm font-semibold text-[#374151]">Recent sessions</h2>
        </div>

        {sessions.length === 0 ? (
          <div className="bg-white rounded-xl border border-[#E5E7EB] p-16 text-center" style={{ boxShadow: '0 1px 3px rgba(0,0,0,.05)' }}>
            <div className="text-4xl mb-4">🎯</div>
            <h3 className="font-semibold text-[#111827] mb-2">No sessions yet</h3>
            <p className="text-[#6B7280] text-sm mb-6">Start your first interview to see your progress here.</p>
            <Link href="/interview" className="inline-flex items-center bg-[#2563EB] text-white text-sm font-medium px-5 py-2.5 rounded-lg hover:bg-[#1D4ED8] transition-colors shadow-sm">
              Start first session →
            </Link>
          </div>
        ) : (
          <div className="space-y-2">
            {sessions.map(s => {
              const mod    = s.skill_modules
              const report = reportMap[s.id]
              const icon   = mod?.slug ? (MODULE_ICONS[mod.slug] ?? '📋') : '📋'
              const isCompleted  = s.status === 'completed'
              const isInProgress = s.status === 'active'
              const score  = report?.overall_score ?? null
              const scoreColor = score === null ? '' : score >= 3 ? '#059669' : score >= 2 ? '#D97706' : '#DC2626'

              return (
                <div key={s.id} className="bg-white rounded-xl border border-[#E5E7EB] p-4 flex items-center gap-4 hover:border-[#D1D5DB] transition-all group" style={{ boxShadow: '0 1px 3px rgba(0,0,0,.04)' }}>
                  <div className="w-10 h-10 rounded-xl bg-[#F3F4F6] flex items-center justify-center text-xl flex-shrink-0">{icon}</div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-[#111827] text-sm">{mod?.name_en ?? 'Interview'}</span>
                      <span className="text-[#D1D5DB]">·</span>
                      <span className="text-xs text-[#9CA3AF]">{s.language === 'fr' ? '🇫🇷 French' : '🇬🇧 English'}</span>
                    </div>
                    <div className="text-xs text-[#9CA3AF] mt-0.5">
                      {timeAgo(s.started_at)}
                      {isInProgress && ` · Sub-skill ${(s.current_sub_skill_idx ?? 0) + 1}/4`}
                      {s.completed_at && ` · ${Math.round((new Date(s.completed_at).getTime() - new Date(s.started_at).getTime()) / 60000)}m`}
                    </div>
                  </div>

                  <div className="flex items-center gap-3 flex-shrink-0">
                    {isCompleted && score !== null ? (
                      <div className="text-right">
                        <div className="text-lg font-bold" style={{ color: scoreColor }}>{score.toFixed(1)}<span className="text-xs text-[#9CA3AF] font-normal">/4</span></div>
                        <div className="text-xs text-[#9CA3AF]">Score</div>
                      </div>
                    ) : isInProgress ? (
                      <span className="text-xs bg-[#FFFBEB] text-[#92400E] border border-[#FDE68A] px-2.5 py-1 rounded-full font-medium">In progress</span>
                    ) : null}

                    {isCompleted && (
                      <Link href={`/interview/report?id=${s.id}&lang=${s.language}`}
                        className="text-xs bg-[#EFF6FF] text-[#2563EB] border border-[#BFDBFE] px-3 py-1.5 rounded-lg hover:bg-[#DBEAFE] transition-colors font-medium">
                        {report ? 'View report →' : 'No report'}
                      </Link>
                    )}
                    {isInProgress && (
                      <Link href={`/interview/session?id=${s.id}&lang=${s.language}`}
                        className="text-xs bg-[#FEF3C7] text-[#92400E] border border-[#FDE68A] px-3 py-1.5 rounded-lg hover:bg-[#FDE68A] transition-colors font-medium">
                        Resume →
                      </Link>
                    )}

                    <button onClick={() => deleteSession(s.id)} disabled={deleting === s.id}
                      className="text-xs text-[#D1D5DB] hover:text-[#DC2626] transition-colors p-1.5 rounded-lg hover:bg-[#FEF2F2] opacity-0 group-hover:opacity-100"
                      title="Delete session">
                      {deleting === s.id ? '...' : '🗑'}
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Upgrade banner */}
        {profile?.plan !== 'pro' && (
          <div className="mt-8 bg-gradient-to-r from-[#EFF6FF] to-[#F0FDF4] border border-[#BFDBFE] rounded-xl p-6 flex flex-col sm:flex-row items-center gap-5">
            <div className="text-3xl">🚀</div>
            <div className="flex-1">
              <h3 className="font-semibold text-[#111827] mb-1">Unlock all 4 modules + unlimited sessions</h3>
              <p className="text-sm text-[#6B7280]">RAG · Agents · Evaluation · MLOps — adaptive follow-ups and full diagnostic reports. $19/month.</p>
            </div>
            <Link href="/pricing" className="flex-shrink-0 bg-[#2563EB] text-white text-sm font-semibold px-5 py-2.5 rounded-xl hover:bg-[#1D4ED8] transition-colors shadow-sm whitespace-nowrap">
              Upgrade to Pro →
            </Link>
          </div>
        )}
      </div>

      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}
