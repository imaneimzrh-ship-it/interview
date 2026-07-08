'use client'
import { useEffect, useState, Suspense } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

interface Entry {
  id: string
  display_name: string
  role_title: string
  role_cluster: string
  company_visibility: string
  company_name: string | null
  interview_round: string
  question_text: string
  difficulty_rating: number | null
  outcome: string
  source_note: string | null
  source_url: string | null
  status: string
  created_at: string
}

async function authHeader(): Promise<Record<string, string>> {
  const { data: { session } } = await createClient().auth.getSession()
  if (session?.access_token) return { Authorization: `Bearer ${session.access_token}` }
  return {}
}

function Badge({ label, color }: { label: string; color: string }) {
  const colors: Record<string, { bg: string; text: string; border: string }> = {
    orange: { bg: '#FFF8EE', text: '#C77D2E', border: '#F5A524' },
    green:  { bg: '#ECFDF5', text: '#065F46', border: '#A7F3D0' },
    red:    { bg: '#FEF2F2', text: '#991B1B', border: '#FECACA' },
    gray:   { bg: '#F3F4F6', text: '#374151', border: '#E5E7EB' },
  }
  const c = colors[color] ?? colors.gray
  return (
    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
      style={{ background: c.bg, color: c.text, border: `1px solid ${c.border}`, fontFamily: "'JetBrains Mono',monospace" }}>
      {label.toUpperCase()}
    </span>
  )
}

function AdminQueueInner() {
  const router  = useRouter()
  const [entries, setEntries] = useState<Entry[]>([])
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState('')
  const [acting,  setActing]  = useState<string | null>(null)
  const [tab,     setTab]     = useState<'pending' | 'published' | 'rejected'>('pending')

  async function load(status: string) {
    setLoading(true)
    setError('')
    const hdrs = await authHeader()
    const res  = await fetch(`/api/admin/questions?status=${status}`, { headers: hdrs })
    if (res.status === 403) { router.push('/app/start'); return }
    const d = await res.json()
    if (!res.ok) { setError(d.error ?? 'Failed to load.'); setLoading(false); return }
    setEntries(d.entries ?? [])
    setLoading(false)
  }

  useEffect(() => { load(tab) }, [tab])

  async function act(id: string, action: 'approve' | 'reject') {
    setActing(id)
    const hdrs = await authHeader()
    const res  = await fetch('/api/admin/questions', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', ...hdrs },
      body: JSON.stringify({ id, action }),
    })
    if (res.ok) {
      setEntries(prev => prev.filter(e => e.id !== id))
    } else {
      const d = await res.json()
      setError(d.error ?? 'Action failed.')
    }
    setActing(null)
  }

  return (
    <div className="min-h-screen" style={{ background: '#FBFAF7', fontFamily: "'Inter',system-ui,sans-serif" }}>
      <nav className="border-b border-[#E7E2D8] sticky top-0 z-20 bg-white">
        <div className="max-w-4xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="font-bold text-[#17140F] text-sm" style={{ fontFamily: "'Space Grotesk',sans-serif" }}>Sonne AI</span>
            <span className="text-[#E7E2D8]">·</span>
            <span className="text-sm text-[#7A7267]">Admin — Question Review</span>
          </div>
          <Badge label="admin" color="orange" />
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Tab switcher */}
        <div className="flex gap-2 mb-6">
          {(['pending', 'published', 'rejected'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className="px-4 py-2 rounded-lg text-sm font-semibold transition-all"
              style={{
                background: tab === t ? '#1E2A44' : 'white',
                color:      tab === t ? 'white'   : '#7A7267',
                border:     `1px solid ${tab === t ? '#1E2A44' : '#E7E2D8'}`,
              }}>
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>

        {error && (
          <div className="bg-[#FEF2F2] border border-[#FECACA] rounded-xl px-4 py-3 text-sm text-[#DC2626] mb-4">{error}</div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div style={{ width: 24, height: 24, border: '2.5px solid #C7D0E0', borderTopColor: '#1E2A44', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
          </div>
        ) : entries.length === 0 ? (
          <div className="text-center py-20 text-[#9CA3AF] text-sm">
            No {tab} entries.
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-xs text-[#9CA3AF]">{entries.length} {tab} {entries.length === 1 ? 'entry' : 'entries'}</p>
            {entries.map(e => (
              <div key={e.id} className="bg-white rounded-2xl border border-[#E7E2D8] shadow-sm p-5">
                {/* Meta row */}
                <div className="flex flex-wrap items-center gap-2 mb-3">
                  <Badge label={e.interview_round} color="gray" />
                  <Badge label={e.role_cluster.replace(/_/g, ' ')} color="gray" />
                  {e.company_visibility === 'named' && e.company_name && (
                    <Badge label={e.company_name} color="orange" />
                  )}
                  {e.difficulty_rating && (
                    <span className="text-[10px] text-[#9CA3AF]" style={{ fontFamily: "'JetBrains Mono',monospace" }}>
                      diff {e.difficulty_rating}/5
                    </span>
                  )}
                  <span className="text-[10px] text-[#B8B2A8] ml-auto" style={{ fontFamily: "'JetBrains Mono',monospace" }}>
                    {new Date(e.created_at).toLocaleDateString()}
                  </span>
                </div>

                {/* Question text */}
                <p className="text-sm text-[#17140F] leading-relaxed mb-3">"{e.question_text}"</p>

                {/* Source */}
                {(e.source_note || e.source_url) && (
                  <p className="text-xs text-[#9CA3AF] mb-3">
                    Source: {e.source_note ?? ''}{e.source_url ? ` — ${e.source_url}` : ''}
                  </p>
                )}

                {/* Submitter */}
                <p className="text-[10px] text-[#B8B2A8] mb-4" style={{ fontFamily: "'JetBrains Mono',monospace" }}>
                  submitted by {e.display_name}
                </p>

                {/* Actions — only on pending */}
                {tab === 'pending' && (
                  <div className="flex gap-2 border-t border-[#F3F0EB] pt-4">
                    <button onClick={() => act(e.id, 'approve')} disabled={acting === e.id}
                      className="flex-1 py-2 rounded-xl text-sm font-bold transition-all disabled:opacity-40"
                      style={{ background: '#10B981', color: 'white' }}>
                      {acting === e.id ? '…' : '✓ Approve'}
                    </button>
                    <button onClick={() => act(e.id, 'reject')} disabled={acting === e.id}
                      className="flex-1 py-2 rounded-xl text-sm font-bold transition-all disabled:opacity-40"
                      style={{ background: '#FEF2F2', color: '#DC2626', border: '1px solid #FECACA' }}>
                      {acting === e.id ? '…' : '✕ Reject'}
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}

export default function AdminQuestionsPage() {
  return <Suspense fallback={null}><AdminQueueInner /></Suspense>
}
