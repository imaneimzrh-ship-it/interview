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
  const router  = useRouter()
  const sb      = createClient()
  const [profile,        setProfile]        = useState<Profile | null>(null)
  const [sessions,       setSessions]       = useState<Session[]>([])
  const [reports,        setReports]        = useState<Report[]>([])
  const [loading,        setLoading]        = useState(true)
  const [deleting,       setDeleting]       = useState<string | null>(null)
  const [portalLoading,  setPortalLoading]  = useState(false)
  const [portalError,    setPortalError]    = useState('')

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
    setPortalLoading(true)
    setPortalError('')
    try {
      const { data: { session } } = await sb.auth.getSession()
      const res = await fetch('/api/stripe/portal', {
        method: 'POST',
        headers: session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {},
      })
      const data = await res.json()
      if (data.url) {
        window.location.href = data.url
      } else {
        setPortalError(data.error ?? 'Could not open billing portal.')
        setPortalLoading(false)
      }
    } catch {
      setPortalError('Network error. Please try again.')
      setPortalLoading(false)
    }
  }

  async function signOut() { await sb.auth.signOut(); router.push('/') }

  const reportMap  = Object.fromEntries(reports.map(r => [r.session_id, r]))
  const completed  = sessions.filter(s => s.status === 'completed')
  const scored     = completed.filter(s => reportMap[s.id])
  const avg        = scored.length
    ? (scored.reduce((a, s) => a + reportMap[s.id].overall_score, 0) / scored.length).toFixed(1)
    : null

  const scoreColor = (s: number | null) => s === null ? '#9CA3AF' : s >= 3 ? '#2E7D5B' : s >= 2 ? '#C77D2E' : '#B24C3F'

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: '#FBFAF7' }}>
      <div style={{ width:32,height:32,border:'3px solid #E8E4DC',borderTopColor:'#1E2A44',borderRadius:'50%',animation:'spin 1s linear infinite' }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )

  return (
    <div className="min-h-screen" style={{ background: '#FBFAF7', fontFamily: "'Space Grotesk', Inter, system-ui, sans-serif" }}>

      {/* Nav */}
      <nav style={{ background: '#fff', borderBottom: '1px solid #E8E4DC' }}>
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-sm" style={{ background: '#1E2A44' }}>S</div>
            <span className="font-semibold text-[15px]" style={{ color: '#17140F' }}>Sonne AI</span>
          </Link>
          <div className="flex items-center gap-3">
            {portalError && (
              <span className="text-xs text-[#B24C3F] bg-[#FEF2F2] border border-[#FECACA] px-2.5 py-1 rounded-full">{portalError}</span>
            )}
            {profile?.plan === 'pro' ? (
              <button
                onClick={openPortal}
                disabled={portalLoading}
                className="text-xs font-semibold px-3 py-1.5 rounded-full transition-colors disabled:opacity-60"
                style={{ background: '#F0F4FF', border: '1px solid #C7D2FE', color: '#1E2A44' }}
              >
                {portalLoading ? 'Opening…' : 'Pro · Manage billing'}
              </button>
            ) : (
              <Link href="/pricing" className="text-xs font-semibold px-2.5 py-1 rounded-full"
                style={{ background: '#FEF9EC', border: '1px solid #F5D78A', color: '#92400E' }}>
                ↑ Upgrade to Pro
              </Link>
            )}
            <button onClick={signOut} className="text-sm transition-colors" style={{ color: '#6B7280' }}>Sign out</button>
          </div>
        </div>
      </nav>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-bold" style={{ color: '#17140F' }}>
              Hi, {profile?.full_name?.split(' ')[0] || profile?.email?.split('@')[0] || 'there'} 👋
            </h1>
            <p className="text-sm mt-1" style={{ color: '#6B7280' }}>
              {profile?.plan === 'pro'
                ? 'Pro · unlimited sessions across all modules'
                : sessions.filter(s => s.status !== 'abandoned').length < 1
                  ? 'Free · 1 session remaining'
                  : 'Free · No sessions remaining — upgrade to continue'}
            </p>
          </div>
          <Link href="/interview"
            className="inline-flex items-center gap-2 text-sm font-semibold px-5 py-2.5 rounded-xl transition-opacity hover:opacity-90 self-start sm:self-auto"
            style={{ background: '#1E2A44', color: '#fff' }}>
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
            <div key={stat.label} className="rounded-xl p-5 text-center" style={{ background: '#fff', border: '1px solid #E8E4DC' }}>
              <div className="text-2xl font-bold mb-0.5" style={{ color: '#17140F' }}>{stat.value}</div>
              <div className="text-xs" style={{ color: '#9CA3AF' }}>{stat.label}</div>
            </div>
          ))}
        </div>

        {/* CV Diagnostic */}
        <div className="rounded-xl p-5 flex items-center gap-5 mb-8" style={{ background: '#fff', border: '1px solid #E8E4DC' }}>
          <div className="text-3xl flex-shrink-0">📄</div>
          <div className="flex-1">
            <h3 className="font-semibold mb-0.5" style={{ color: '#17140F' }}>CV Diagnostic</h3>
            <p className="text-sm" style={{ color: '#6B7280' }}>Score your CV against 5 Applied AI signals and find your weakest area before your interview.</p>
          </div>
          <Link href="/cv"
            className="flex-shrink-0 text-sm font-semibold px-4 py-2 rounded-lg hover:opacity-90 transition-opacity whitespace-nowrap"
            style={{ background: '#F5A524', color: '#fff' }}>
            Score my CV →
          </Link>
        </div>

        {/* Sessions */}
        <div className="mb-3">
          <h2 className="text-sm font-semibold" style={{ color: '#374151' }}>Recent sessions</h2>
        </div>

        {sessions.length === 0 ? (
          <div className="rounded-xl p-16 text-center" style={{ background: '#fff', border: '1px solid #E8E4DC' }}>
            <div className="text-4xl mb-4">🎯</div>
            <h3 className="font-semibold mb-2" style={{ color: '#17140F' }}>No sessions yet</h3>
            <p className="text-sm mb-6" style={{ color: '#6B7280' }}>Start your first interview to see your progress here.</p>
            <Link href="/interview"
              className="inline-flex items-center text-sm font-semibold px-5 py-2.5 rounded-lg hover:opacity-90 transition-opacity"
              style={{ background: '#1E2A44', color: '#fff' }}>
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

              return (
                <div key={s.id} className="rounded-xl p-4 flex items-center gap-4 group transition-all"
                  style={{ background: '#fff', border: '1px solid #E8E4DC' }}>
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0" style={{ background: '#F5F3EE' }}>{icon}</div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-sm" style={{ color: '#17140F' }}>{mod?.name_en ?? 'Interview'}</span>
                      <span style={{ color: '#D1D5DB' }}>·</span>
                      <span className="text-xs" style={{ color: '#9CA3AF' }}>{s.language === 'fr' ? '🇫🇷 French' : '🇬🇧 English'}</span>
                    </div>
                    <div className="text-xs mt-0.5" style={{ color: '#9CA3AF' }}>
                      {timeAgo(s.started_at)}
                      {isInProgress && ` · Sub-skill ${(s.current_sub_skill_idx ?? 0) + 1}/4`}
                      {s.completed_at && ` · ${Math.round((new Date(s.completed_at).getTime() - new Date(s.started_at).getTime()) / 60000)}m`}
                    </div>
                  </div>

                  <div className="flex items-center gap-3 flex-shrink-0">
                    {isCompleted && score !== null && (
                      <div className="text-right">
                        <div className="text-lg font-bold" style={{ color: scoreColor(score) }}>
                          {score.toFixed(1)}<span className="text-xs font-normal" style={{ color: '#9CA3AF' }}>/4</span>
                        </div>
                        <div className="text-xs" style={{ color: '#9CA3AF' }}>Score</div>
                      </div>
                    )}
                    {isInProgress && (
                      <span className="text-xs font-medium px-2.5 py-1 rounded-full"
                        style={{ background: '#FEF9EC', color: '#92400E', border: '1px solid #F5D78A' }}>In progress</span>
                    )}
                    {isCompleted && (
                      <Link href={`/interview/report?id=${s.id}&lang=${s.language}`}
                        className="text-xs font-medium px-3 py-1.5 rounded-lg transition-colors"
                        style={{ background: '#F0F4FF', color: '#1E2A44', border: '1px solid #C7D2FE' }}>
                        {report ? 'View report →' : 'No report'}
                      </Link>
                    )}
                    {isInProgress && (
                      <Link href={`/interview/session?id=${s.id}&lang=${s.language}`}
                        className="text-xs font-medium px-3 py-1.5 rounded-lg transition-colors"
                        style={{ background: '#FEF9EC', color: '#92400E', border: '1px solid #F5D78A' }}>
                        Resume →
                      </Link>
                    )}
                    <button onClick={() => deleteSession(s.id)} disabled={deleting === s.id}
                      className="text-xs p-1.5 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                      style={{ color: '#D1D5DB' }}
                      onMouseEnter={e => (e.currentTarget.style.color = '#B24C3F')}
                      onMouseLeave={e => (e.currentTarget.style.color = '#D1D5DB')}
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
          <div className="mt-8 rounded-xl p-6 flex flex-col sm:flex-row items-center gap-5"
            style={{ background: 'linear-gradient(135deg, #F0F4FF 0%, #FEF9EC 100%)', border: '1px solid #E8E4DC' }}>
            <div className="text-3xl">🚀</div>
            <div className="flex-1">
              <h3 className="font-semibold mb-1" style={{ color: '#17140F' }}>Unlock all 4 modules + unlimited sessions</h3>
              <p className="text-sm" style={{ color: '#6B7280' }}>RAG · Agents · Evaluation · MLOps — adaptive follow-ups and full diagnostic reports. $19/month.</p>
            </div>
            <Link href="/pricing"
              className="flex-shrink-0 text-sm font-semibold px-5 py-2.5 rounded-xl hover:opacity-90 transition-opacity whitespace-nowrap"
              style={{ background: '#1E2A44', color: '#fff' }}>
              Upgrade to Pro →
            </Link>
          </div>
        )}
      </div>

      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}
