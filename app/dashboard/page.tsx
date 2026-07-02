'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { ROLE_LABELS, COMPANY_LABELS } from '@/lib/questions/bank'

interface Session { id: string; role: string; company: string; status: string; score_overall: number | null; started_at: string; duration_secs: number | null; is_ai_role: boolean; hire_decision: string | null }
interface Profile { email: string; full_name: string; plan: string; trial_used: number }

function timeAgo(iso: string) {
  const s = (Date.now() - new Date(iso).getTime()) / 1000
  if (s < 60) return 'just now'
  if (s < 3600) return `${Math.floor(s/60)}m ago`
  if (s < 86400) return `${Math.floor(s/3600)}h ago`
  return `${Math.floor(s/86400)}d ago`
}

export default function Dashboard() {
  const router = useRouter()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [sessions, setSessions] = useState<Session[]>([])
  const [loading, setLoading] = useState(true)
  const sb = createClient()

  useEffect(() => { loadData() }, [])

  async function loadData() {
    const { data: { user } } = await sb.auth.getUser()
    if (!user) { router.push('/login'); return }
    const [{ data: p }, { data: s }] = await Promise.all([
      sb.from('profiles').select('email, full_name, plan, trial_used').eq('id', user.id).single(),
      sb.from('interview_sessions').select('id,role,company,status,score_overall,started_at,duration_secs,is_ai_role,hire_decision')
        .eq('user_id', user.id).order('started_at', { ascending: false }).limit(20),
    ])
    setProfile(p); setSessions(s ?? [])
    setLoading(false)
  }

  async function signOut() {
    await sb.auth.signOut(); router.push('/')
  }

  const completed = sessions.filter(s => s.status === 'completed' && s.score_overall !== null)
  const avg = completed.length ? Math.round(completed.reduce((a, s) => a + (s.score_overall ?? 0), 0) / completed.length) : null

  if (loading) return (
    <div className="min-h-screen bg-bg flex items-center justify-center">
      <div className="w-6 h-6 border-2 border-blue/30 border-t-blue rounded-full animate-spin" />
    </div>
  )

  return (
    <div className="min-h-screen bg-bg">
      <div className="border-b border-border bg-card">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-blue flex items-center justify-center text-white text-xs font-bold">S</div>
            <span className="font-semibold text-sm text-bright">Sonne AI</span>
          </Link>
          <div className="flex items-center gap-3">
            {profile?.plan === 'free' && (
              <Link href="/pricing" className="badge-gold text-xs px-2.5 py-1 hidden sm:inline-flex">Upgrade to Pro</Link>
            )}
            <button onClick={signOut} className="text-xs text-dim hover:text-bright transition-colors">Sign out</button>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="flex items-start justify-between mb-8">
          <div>
            <h1 className="text-xl font-semibold text-bright mb-1">
              {profile?.full_name ? `Hi, ${profile.full_name.split(' ')[0]}` : 'Dashboard'}
            </h1>
            <p className="text-sm text-dim">
              {profile?.plan === 'pro' ? 'Pro plan · unlimited sessions' : `Free plan · ${2 - (profile?.trial_used ?? 0)} sessions remaining`}
            </p>
          </div>
          <Link href="/interview" className="btn-blue text-sm px-4 py-2">+ New interview</Link>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
          {[
            { label: 'Sessions', value: sessions.length },
            { label: 'Completed', value: completed.length },
            { label: 'Avg score', value: avg ?? '—' },
            { label: 'AI sessions', value: sessions.filter(s => s.is_ai_role).length },
          ].map(s => (
            <div key={s.label} className="card p-4 text-center">
              <div className="text-xl font-semibold text-bright">{s.value}</div>
              <div className="text-xs text-dim mt-0.5">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Sessions */}
        {sessions.length === 0 ? (
          <div className="card p-12 text-center">
            <p className="text-dim text-sm mb-4">No sessions yet. Start your first interview.</p>
            <Link href="/interview" className="btn-blue">Start first interview →</Link>
          </div>
        ) : (
          <div className="space-y-2">
            <p className="text-xs text-dim mb-2">Recent sessions</p>
            {sessions.map(s => (
              <Link key={s.id}
                href={s.status === 'completed' ? `/interview/results?id=${s.id}` : `/interview/session?id=${s.id}`}
                className="card p-4 flex items-center justify-between gap-4 hover:border-muted transition-all group block">
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-medium flex-shrink-0 ${s.is_ai_role ? 'bg-gold-m text-gold border border-gold/20' : 'bg-blue-m text-blue border border-blue/20'}`}>
                    AI
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-bright truncate">
                      {ROLE_LABELS[s.role] ?? s.role}
                      {s.company !== 'none' && <span className="text-dim font-normal"> · {COMPANY_LABELS[s.company] ?? s.company}</span>}
                    </div>
                    <div className="text-xs text-dim">{timeAgo(s.started_at)}{s.duration_secs ? ` · ${Math.floor(s.duration_secs/60)}m` : ''}</div>
                  </div>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  {s.score_overall !== null
                    ? <span className={`text-sm font-bold ${s.score_overall >= 75 ? 'text-green' : s.score_overall >= 60 ? 'text-blue' : 'text-gold'}`}>{s.score_overall}</span>
                    : <span className="text-xs text-dim">{s.status === 'active' ? 'In progress' : '—'}</span>
                  }
                  <span className="text-dim text-xs group-hover:text-soft transition-colors">→</span>
                </div>
              </Link>
            ))}
          </div>
        )}

        {profile?.plan === 'free' && (
          <div className="card p-5 mt-6 border-gold/20">
            <div className="flex items-start gap-3">
              <span className="text-gold text-lg flex-shrink-0">★</span>
              <div>
                <div className="text-sm font-semibold text-bright mb-1">Unlock AI engineering interviews</div>
                <p className="text-xs text-dim leading-relaxed mb-3">Practice for Anthropic, OpenAI, Google DeepMind and more — with company-specific loops and technical correctness grading. $19/month, cancel anytime.</p>
                <Link href="/pricing" className="btn-gold text-xs px-4 py-2">Upgrade to Pro →</Link>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
