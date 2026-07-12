'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import AppLayout from '@/components/app/AppLayout'

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
interface Profile { email: string; full_name: string; plan: string; stripe_customer: string | null }

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
    const { data: { session } } = await sb.auth.getSession()
    if (!session) { router.push('/login'); return }
    const user = session.user
    const [{ data: p }, { data: s }, { data: r }] = await Promise.all([
      sb.from('profiles').select('email, full_name, plan, stripe_customer').eq('id', user.id).single(),
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
    <AppLayout>
      <div className="flex items-center justify-center h-full min-h-[60vh]">
        <div style={{ width:32,height:32,border:'3px solid #E8E4DC',borderTopColor:'#1E2A44',borderRadius:'50%',animation:'spin 1s linear infinite' }} />
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    </AppLayout>
  )

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto px-6 py-8">

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
          <Link href="/app/start"
            className="inline-flex items-center gap-2 text-sm font-semibold px-5 py-2.5 rounded-xl transition-opacity hover:opacity-90 self-start sm:self-auto"
            style={{ background: '#F5A524', color: '#17140F' }}>
            🚀 New interview
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
          <div className="space-y-3">
            {/* What you can do right now */}
            <div className="rounded-xl overflow-hidden" style={{ border: '1px solid #E8E4DC' }}>
              <div className="px-5 py-4" style={{ background: '#F8F9FB' }}>
                <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: '#9CA3AF' }}>
                  {profile?.plan === 'pro' ? 'Get started' : 'Available on your free plan'}
                </p>
              </div>
              <div className="divide-y divide-[#F3F4F6]">

                {/* Action 1 — Practice interview */}
                <div className="flex items-center gap-4 px-5 py-4" style={{ background: '#fff' }}>
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0" style={{ background: '#F5F3EE' }}>🔍</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold" style={{ color: '#17140F' }}>RAG System Design interview</p>
                    <p className="text-xs mt-0.5" style={{ color: '#6B7280' }}>
                      {profile?.plan === 'pro'
                        ? 'Adaptive AI interviewer · voice mode · full diagnostic'
                        : '1 free session · adaptive follow-ups · headline diagnostic'}
                    </p>
                  </div>
                  <Link href="/app/start"
                    className="flex-shrink-0 text-xs font-semibold px-4 py-2 rounded-lg hover:opacity-90 transition-opacity whitespace-nowrap"
                    style={{ background: '#1E2A44', color: '#fff' }}>
                    Start now →
                  </Link>
                </div>

                {/* Action 2 — CV Diagnostic */}
                <div className="flex items-center gap-4 px-5 py-4" style={{ background: '#fff' }}>
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0" style={{ background: '#F5F3EE' }}>📄</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold" style={{ color: '#17140F' }}>CV Readiness Diagnostic</p>
                    <p className="text-xs mt-0.5" style={{ color: '#6B7280' }}>Score your CV across 5 Applied AI signals — free on any plan</p>
                  </div>
                  <Link href="/cv"
                    className="flex-shrink-0 text-xs font-semibold px-4 py-2 rounded-lg hover:opacity-90 transition-opacity whitespace-nowrap"
                    style={{ background: '#F5A524', color: '#17140F' }}>
                    Score CV →
                  </Link>
                </div>

                {/* Action 3 — Pro modules (locked for free) */}
                {profile?.plan !== 'pro' && (
                  <div className="flex items-center gap-4 px-5 py-4" style={{ background: '#FAFAFA' }}>
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0 opacity-40" style={{ background: '#F5F3EE' }}>🔒</div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold" style={{ color: '#6B7280' }}>Agent · Evaluation · MLOps modules</p>
                      <p className="text-xs mt-0.5" style={{ color: '#9CA3AF' }}>Unlimited sessions · voice mode · full sub-skill diagnostics</p>
                    </div>
                    <Link href="/pricing"
                      className="flex-shrink-0 text-xs font-semibold px-4 py-2 rounded-lg whitespace-nowrap"
                      style={{ background: '#FFF8EE', color: '#92400E', border: '1px solid #F5D78A' }}>
                      Upgrade →
                    </Link>
                  </div>
                )}
              </div>
            </div>
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

        {/* Upgrade banner — only show once user has sessions, so it doesn't stack with the get-started card */}
        {sessions.length > 0 && profile?.plan !== 'pro' && (
          <div className="mt-8 rounded-xl p-6 flex flex-col sm:flex-row items-center gap-5"
            style={{ background: 'linear-gradient(135deg, #F0F4FF 0%, #FEF9EC 100%)', border: '1px solid #E8E4DC' }}>
            <div className="text-3xl">🚀</div>
            <div className="flex-1">
              <h3 className="font-semibold mb-1" style={{ color: '#17140F' }}>Unlock all 4 modules + unlimited sessions</h3>
              <p className="text-sm" style={{ color: '#6B7280' }}>RAG · Agents · Evaluation · MLOps — adaptive follow-ups and full diagnostic reports. $39.99/month.</p>
            </div>
            <Link href="/pricing"
              className="flex-shrink-0 text-sm font-semibold px-5 py-2.5 rounded-xl hover:opacity-90 transition-opacity whitespace-nowrap"
              style={{ background: '#1E2A44', color: '#fff' }}>
              Upgrade to Pro →
            </Link>
          </div>
        )}

        {/* Billing portal for Pro with Stripe customer */}
        {profile?.plan === 'pro' && profile?.stripe_customer && (
          <div className="mt-6 flex items-center justify-end">
            <button onClick={openPortal} disabled={portalLoading}
              className="text-xs font-medium text-[#6B7280] hover:text-[#374151] transition-colors disabled:opacity-50">
              {portalLoading ? 'Opening billing portal…' : 'Manage billing →'}
            </button>
          </div>
        )}
        {portalError && <p className="mt-2 text-xs text-[#B24C3F] text-right">{portalError}</p>}
      </div>

      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </AppLayout>
  )
}
