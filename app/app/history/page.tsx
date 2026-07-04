'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import AppLayout from '@/components/app/AppLayout'
import { createClient } from '@/lib/supabase/client'

interface Session {
  id: string; status: string; started_at: string; duration_secs: number | null
  language: string; has_report?: boolean; overall_score?: number | null
  skill_modules?: { name_en: string }
}

function icon(name: string) {
  if (name?.toLowerCase().includes('rag'))   return '🔍'
  if (name?.toLowerCase().includes('agent')) return '🕵️'
  if (name?.toLowerCase().includes('eval'))  return '🧪'
  return '⚙️'
}

function timeAgo(iso: string) {
  const s = (Date.now() - new Date(iso).getTime()) / 1000
  if (s < 60) return 'just now'
  if (s < 3600) return `${Math.floor(s/60)}m ago`
  if (s < 86400) return `${Math.floor(s/3600)}h ago`
  return `${Math.floor(s/86400)}d ago`
}

async function authHeader(): Promise<Record<string, string>> {
  const { data: { session } } = await createClient().auth.getSession()
  if (session?.access_token) return { Authorization: `Bearer ${session.access_token}` }
  return {}
}

export default function HistoryPage() {
  const router   = useRouter()
  const sb       = createClient()
  const [sessions,  setSessions]  = useState<Session[]>([])
  const [loading,   setLoading]   = useState(true)
  const [deleting,  setDeleting]  = useState<string | null>(null)
  const [regen,     setRegen]     = useState<string | null>(null)

  useEffect(() => { loadSessions() }, [])

  async function loadSessions() {
    const { data: { user: u } } = await sb.auth.getUser()
    if (!u) { router.push('/login'); return }

    const { data: s } = await sb
      .from('interview_sessions')
      .select('id, status, started_at, duration_secs, language, skill_modules(name_en)')
      .eq('user_id', u.id).order('started_at', { ascending: false }).limit(30)

    const ids = (s ?? []).map((x: any) => x.id)
    let reportMap: Record<string, number> = {}
    if (ids.length) {
      const { data: r } = await sb.from('diagnostic_reports').select('session_id, overall_score').in('session_id', ids)
      r?.forEach((x: any) => { reportMap[x.session_id] = x.overall_score })
    }

    setSessions((s ?? []).map((x: any) => ({
      ...x,
      has_report: x.id in reportMap,
      overall_score: reportMap[x.id] ?? null,
    })))
    setLoading(false)
  }

  async function del(id: string) {
    if (!confirm('Delete this session permanently?')) return
    setDeleting(id)
    const hdrs = await authHeader()
    const res = await fetch(`/api/interview/delete?id=${id}`, { method: 'DELETE', headers: hdrs })
    if (res.ok) setSessions(prev => prev.filter(s => s.id !== id))
    setDeleting(null)
  }

  async function genReport(id: string, lang: string) {
    setRegen(id)
    const hdrs = await authHeader()
    const res  = await fetch('/api/interview/end', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...hdrs },
      body: JSON.stringify({ sessionId: id }),
    })
    const d = await res.json()
    if (res.ok) router.push(`/interview/report?id=${id}&lang=${lang}`)
    else { alert(d.error ?? 'Could not generate.'); setRegen(null) }
  }

  const scoreColor = (s: number | null) => s === null ? '#9CA3AF' : s >= 3 ? '#059669' : s >= 2 ? '#D97706' : '#DC2626'

  return (
    <AppLayout>
      <div className="max-w-3xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-[#111827] mb-1">Past Sessions</h1>
            <p className="text-[#6B7280] text-sm">Your interview history — view reports, resume sessions, or delete.</p>
          </div>
          <Link href="/app/start" className="bg-[#2563EB] text-white text-sm font-medium px-4 py-2.5 rounded-xl hover:bg-[#1D4ED8] transition-colors shadow-sm">
            + New session
          </Link>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div style={{ width:24, height:24, border:'2.5px solid #BFDBFE', borderTopColor:'#2563EB', borderRadius:'50%', animation:'spin 1s linear infinite' }} />
          </div>
        ) : sessions.length === 0 ? (
          <div className="bg-white rounded-xl border border-[#E5E7EB] p-16 text-center shadow-sm">
            <div className="text-4xl mb-4">🎯</div>
            <h3 className="font-semibold text-[#111827] mb-2">No sessions yet</h3>
            <p className="text-[#6B7280] text-sm mb-6">Start your first interview to see your progress here.</p>
            <Link href="/app/start" className="bg-[#2563EB] text-white text-sm font-medium px-5 py-2.5 rounded-lg hover:bg-[#1D4ED8] transition-colors shadow-sm">
              Start first session →
            </Link>
          </div>
        ) : (
          <div className="space-y-2">
            {sessions.map(s => {
              const mName = (s.skill_modules as any)?.name_en ?? 'Interview'
              const isCompleted  = s.status === 'completed'
              const isInProgress = s.status === 'active'
              const dur = s.duration_secs && s.duration_secs < 3600 ? `${Math.floor(s.duration_secs / 60)}m` : ''

              return (
                <div key={s.id} className="bg-white rounded-xl border border-[#E5E7EB] p-4 flex items-center gap-4 group hover:border-[#D1D5DB] transition-all shadow-sm">
                  <div className="w-10 h-10 rounded-xl bg-[#F3F4F6] flex items-center justify-center text-xl flex-shrink-0">{icon(mName)}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-[#111827] text-sm">{mName}</span>
                      <span className="text-xs text-[#9CA3AF]">{s.language === 'fr' ? '🇫🇷' : '🇬🇧'}</span>
                    </div>
                    <div className="text-xs text-[#9CA3AF] mt-0.5">{timeAgo(s.started_at)}{dur && ` · ${dur}`}</div>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap justify-end flex-shrink-0">
                    {isCompleted && s.overall_score !== null && (
                      <span className="text-base font-bold" style={{ color: scoreColor(s.overall_score) }}>
                        {s.overall_score?.toFixed(1)}<span className="text-xs text-[#9CA3AF] font-normal">/4</span>
                      </span>
                    )}
                    {isCompleted && s.has_report && (
                      <Link href={`/interview/report?id=${s.id}&lang=${s.language}`}
                        className="text-xs bg-[#EFF6FF] text-[#2563EB] border border-[#BFDBFE] px-3 py-1.5 rounded-lg hover:bg-[#DBEAFE] font-medium whitespace-nowrap">
                        View report →
                      </Link>
                    )}
                    {isCompleted && !s.has_report && (
                      <button onClick={() => genReport(s.id, s.language)} disabled={regen === s.id}
                        className="text-xs text-[#6B7280] border border-[#E5E7EB] px-3 py-1.5 rounded-lg hover:bg-[#F3F4F6] disabled:opacity-60 whitespace-nowrap">
                        {regen === s.id ? 'Generating...' : 'Get report'}
                      </button>
                    )}
                    {isInProgress && (
                      <Link href={`/app/interview/session?id=${s.id}&lang=${s.language}`}
                        className="text-xs bg-[#FEF3C7] text-[#92400E] border border-[#FDE68A] px-3 py-1.5 rounded-lg hover:bg-[#FDE68A] font-medium whitespace-nowrap">
                        Resume →
                      </Link>
                    )}
                    <button onClick={() => del(s.id)} disabled={deleting === s.id}
                      className="text-[#D1D5DB] hover:text-[#DC2626] p-1.5 rounded-lg hover:bg-[#FEF2F2] transition-all opacity-0 group-hover:opacity-100"
                      title="Delete">
                      {deleting === s.id ? '...' : '🗑'}
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </AppLayout>
  )
}
