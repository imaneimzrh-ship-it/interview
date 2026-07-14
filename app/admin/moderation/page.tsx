'use client'
import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

interface PendingReport {
  id: string
  question_text: string
  cluster: string
  round: string
  role_track: string | null
  company_name: string | null
  outcome: string | null
  submitted_by: string | null
  created_at: string
}

interface FlaggedComment {
  id: string
  comment_id: string
  flagged_by: string
  reason: string | null
  created_at: string
  report_comments: {
    id: string
    body: string
    report_id: string
    status: string
  } | null
}

const CLUSTER_LABELS: Record<string, string> = {
  rag: 'RAG', agent_orchestration: 'Agent Orch.', evaluation_testing: 'Eval & Testing', production_mlops: 'Prod / MLOps',
}
const ROUND_LABELS: Record<string, string> = {
  screening: 'Screening', technical: 'Technical', system_design: 'System Design', behavioral: 'Behavioral', deep_dive: 'Deep Dive',
}

async function authHeader(): Promise<Record<string, string>> {
  const { data: { session } } = await createClient().auth.getSession()
  return session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}
}

function EditModal({ report, onClose, onSaved }: { report: PendingReport; onClose: () => void; onSaved: () => void }) {
  const [text, setText] = useState(report.question_text)
  const [saving, setSaving] = useState(false)

  async function saveAndApprove() {
    setSaving(true)
    const hdrs = await authHeader()
    await fetch(`/api/admin/reports/${report.id}/approve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...hdrs },
      body: JSON.stringify({ question_text: text }),
    })
    setSaving(false)
    onSaved()
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl p-6 max-w-lg w-full">
        <h3 className="font-bold text-[#111827] mb-3">Edit before approving</h3>
        <textarea
          value={text}
          onChange={e => setText(e.target.value)}
          rows={5}
          className="w-full border border-[#E5E7EB] rounded-lg px-3 py-2 text-sm text-[#111827] resize-none focus:outline-none focus:border-[#F5A524] mb-4"
        />
        <div className="flex gap-3 justify-end">
          <button onClick={onClose} className="px-4 py-2 rounded-lg text-sm border border-[#E5E7EB] text-[#6B7280] hover:bg-[#F9FAFB]">
            Cancel
          </button>
          <button
            onClick={saveAndApprove}
            disabled={saving || !text.trim()}
            className="px-4 py-2 rounded-lg text-sm font-semibold bg-[#166534] text-white hover:bg-[#14532D] disabled:opacity-50"
          >
            {saving ? 'Saving…' : 'Save & Approve'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function ModerationPage() {
  const router = useRouter()
  const [tab, setTab] = useState<'reports' | 'comments'>('reports')
  const [reports, setReports] = useState<PendingReport[]>([])
  const [flagged, setFlagged] = useState<FlaggedComment[]>([])
  const [loading, setLoading] = useState(true)
  const [forbidden, setForbidden] = useState(false)
  const [editingReport, setEditingReport] = useState<PendingReport | null>(null)

  const loadReports = useCallback(async () => {
    const hdrs = await authHeader()
    const res = await fetch('/api/admin/reports/pending', { headers: hdrs })
    if (res.status === 403) { setForbidden(true); return }
    const data = await res.json()
    setReports(Array.isArray(data) ? data : [])
  }, [])

  const loadFlagged = useCallback(async () => {
    const hdrs = await authHeader()
    const res = await fetch('/api/admin/comments/flagged', { headers: hdrs })
    const data = await res.json()
    setFlagged(Array.isArray(data) ? data : [])
  }, [])

  useEffect(() => {
    async function init() {
      setLoading(true)
      await Promise.all([loadReports(), loadFlagged()])
      setLoading(false)
    }
    init()
  }, [loadReports, loadFlagged])

  useEffect(() => {
    if (forbidden) router.replace('/app/start')
  }, [forbidden, router])

  async function approve(id: string) {
    const hdrs = await authHeader()
    await fetch(`/api/admin/reports/${id}/approve`, { method: 'POST', headers: hdrs })
    setReports(prev => prev.filter(r => r.id !== id))
  }

  async function reject(id: string) {
    const hdrs = await authHeader()
    await fetch(`/api/admin/reports/${id}/reject`, { method: 'POST', headers: hdrs })
    setReports(prev => prev.filter(r => r.id !== id))
  }

  async function commentAction(flagRow: FlaggedComment, action: 'restore' | 'delete') {
    if (!flagRow.report_comments) return
    const hdrs = await authHeader()
    await fetch(`/api/admin/comments/${flagRow.report_comments.id}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...hdrs },
      body: JSON.stringify({ action }),
    })
    setFlagged(prev => prev.filter(f => f.comment_id !== flagRow.comment_id))
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FBFAF7] flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-[#E7E2D8] border-t-[#1E2A44] rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#FBFAF7]" style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>
      {editingReport && (
        <EditModal
          report={editingReport}
          onClose={() => setEditingReport(null)}
          onSaved={() => setReports(prev => prev.filter(r => r.id !== editingReport.id))}
        />
      )}

      {/* Header */}
      <div className="border-b border-[#E7E2D8] bg-white px-6 py-4 flex items-center justify-between">
        <div>
          <p className="text-xs text-[#7A7267] uppercase tracking-widest font-semibold mb-0.5">Admin</p>
          <h1 className="text-xl font-bold text-[#17140F]">Moderation</h1>
        </div>
        <button onClick={() => router.push('/app/start')} className="text-sm text-[#7A7267] hover:text-[#17140F]">← Dashboard</button>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Tabs */}
        <div className="flex gap-1 bg-[#F5F4F0] rounded-xl p-1 mb-6 w-fit">
          {(['reports', 'comments'] as const).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className="px-4 py-2 rounded-lg text-sm font-medium transition-all"
              style={tab === t ? { background: 'white', color: '#17140F', boxShadow: '0 1px 3px rgba(0,0,0,.08)' } : { color: '#7A7267' }}
            >
              {t === 'reports'
                ? `Pending Reports (${reports.length})`
                : `Flagged Comments (${flagged.length})`}
            </button>
          ))}
        </div>

        {/* Pending Reports */}
        {tab === 'reports' && (
          <div className="space-y-4">
            {reports.length === 0 && (
              <div className="text-center py-16 text-[#7A7267] text-sm">No reports waiting for review.</div>
            )}
            {reports.map(r => (
              <div key={r.id} className="bg-white border border-[#E7E2D8] rounded-xl p-5">
                <p className="text-sm text-[#17140F] leading-relaxed mb-3">&ldquo;{r.question_text}&rdquo;</p>
                <div className="flex items-center gap-2 flex-wrap mb-4">
                  <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-[#EEF2FF] text-[#4F46E5]">
                    {CLUSTER_LABELS[r.cluster] ?? r.cluster}
                  </span>
                  <span className="text-[11px] px-2 py-0.5 rounded-full bg-[#F3F4F6] text-[#6B7280]">
                    {ROUND_LABELS[r.round] ?? r.round}
                  </span>
                  {r.company_name && <span className="text-[11px] text-[#9CA3AF]">{r.company_name}</span>}
                  {r.submitted_by && <span className="text-[11px] text-[#9CA3AF]">by {r.submitted_by}</span>}
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => approve(r.id)} className="px-4 py-1.5 rounded-lg text-xs font-semibold bg-[#DCFCE7] text-[#166534] hover:bg-[#BBF7D0] transition-all">
                    Approve
                  </button>
                  <button onClick={() => reject(r.id)} className="px-4 py-1.5 rounded-lg text-xs font-semibold bg-[#FFE4E6] text-[#9F1239] hover:bg-[#FECDD3] transition-all">
                    Reject
                  </button>
                  <button onClick={() => setEditingReport(r)} className="px-4 py-1.5 rounded-lg text-xs font-medium border border-[#E7E2D8] text-[#374151] hover:bg-[#F5F4F0] transition-all">
                    Edit before approving
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Flagged Comments */}
        {tab === 'comments' && (
          <div className="space-y-4">
            {flagged.length === 0 && (
              <div className="text-center py-16 text-[#7A7267] text-sm">No flagged comments.</div>
            )}
            {flagged.map(f => (
              <div key={f.id} className="bg-white border border-[#E7E2D8] rounded-xl p-5">
                <p className="text-sm text-[#17140F] leading-relaxed mb-1">
                  {f.report_comments?.body ?? '[deleted]'}
                </p>
                {f.reason && <p className="text-xs text-[#9CA3AF] mb-3">Flag reason: {f.reason}</p>}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => commentAction(f, 'restore')}
                    className="px-4 py-1.5 rounded-lg text-xs font-semibold bg-[#DCFCE7] text-[#166534] hover:bg-[#BBF7D0] transition-all"
                  >
                    Restore
                  </button>
                  <button
                    onClick={() => commentAction(f, 'delete')}
                    className="px-4 py-1.5 rounded-lg text-xs font-semibold bg-[#FFE4E6] text-[#9F1239] hover:bg-[#FECDD3] transition-all"
                  >
                    Delete permanently
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
