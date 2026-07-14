'use client'
import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import AppLayout from '@/components/app/AppLayout'
import { createClient } from '@/lib/supabase/client'

/* ─── Types ─────────────────────────────────────────────────────────────── */
interface Report {
  id: string; question_text: string; cluster: string; round: string
  role_track?: string; company_name?: string; year?: number; outcome?: string
  upvote_count: number; comment_count: number; created_at: string
}

interface Comment {
  id: string; body: string; like_count: number; created_at: string
  edited_at: string | null; status: string; user_id: string | null
  profile: { display_name: string }
}

/* ─── Constants ─────────────────────────────────────────────────────────── */
const CLUSTER_LABELS: Record<string, string> = {
  rag: 'RAG System Design', agent_orchestration: 'Agent Orchestration',
  evaluation_testing: 'Evaluation & Testing', production_mlops: 'Production / MLOps',
}
const ROUND_LABELS: Record<string, string> = {
  screening: 'Screening', technical: 'Technical', system_design: 'System Design',
  behavioral: 'Behavioral', deep_dive: 'Deep Dive',
}
const OUTCOME_STYLE: Record<string, { label: string; color: string; bg: string }> = {
  got_offer: { label: 'Got offer', color: '#166534', bg: '#DCFCE7' },
  rejected: { label: 'Rejected', color: '#9F1239', bg: '#FFE4E6' },
  no_update: { label: 'No update', color: '#854D0E', bg: '#FEF9C3' },
}

function timeAgo(date: string) {
  const diff = Date.now() - new Date(date).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return 'just now'
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  const d = Math.floor(h / 24)
  if (d < 30) return `${d}d ago`
  return new Date(date).toLocaleDateString()
}

async function authHeader(): Promise<Record<string, string>> {
  const { data: { session } } = await createClient().auth.getSession()
  return session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}
}

/* ─── Comment row ────────────────────────────────────────────────────────── */
function CommentRow({ comment, currentUserId, onDelete, onEdit }: {
  comment: Comment
  currentUserId: string | null
  onDelete: (id: string) => void
  onEdit: (id: string, newBody: string) => void
}) {
  const [editing, setEditing] = useState(false)
  const [editText, setEditText] = useState(comment.body)
  const [saving, setSaving] = useState(false)
  const [liked, setLiked] = useState(false)
  const [likeCount, setLikeCount] = useState(comment.like_count)
  const [menuOpen, setMenuOpen] = useState(false)
  const canModify = currentUserId && comment.user_id === currentUserId && comment.status !== 'removed'

  async function saveEdit() {
    if (!editText.trim()) return
    setSaving(true)
    const hdrs = await authHeader()
    const res = await fetch(`/api/comments/${comment.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', ...hdrs },
      body: JSON.stringify({ body: editText }),
    })
    setSaving(false)
    if (res.ok) { onEdit(comment.id, editText.trim()); setEditing(false) }
  }

  async function handleLike() {
    if (!currentUserId || liked) return
    setLiked(true); setLikeCount(v => v + 1)
    const hdrs = await authHeader()
    fetch(`/api/comments/${comment.id}/like`, { method: 'POST', headers: hdrs })
  }

  async function handleDelete() {
    const hdrs = await authHeader()
    await fetch(`/api/comments/${comment.id}`, { method: 'DELETE', headers: hdrs })
    onDelete(comment.id)
    setMenuOpen(false)
  }

  const initials = comment.profile.display_name.slice(0, 1).toUpperCase()

  return (
    <div className="flex gap-3 py-4 border-b border-[#F3F4F6] last:border-0">
      {/* Avatar */}
      <div className="w-8 h-8 rounded-full bg-[#EEF2FF] flex items-center justify-center text-[#4F46E5] font-bold text-sm flex-shrink-0">
        {initials}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-sm font-semibold text-[#111827]">{comment.profile.display_name}</span>
          <span className="text-xs text-[#9CA3AF]">{timeAgo(comment.created_at)}</span>
          {comment.edited_at && <span className="text-[10px] text-[#9CA3AF] italic">(edited)</span>}
        </div>

        {editing ? (
          <div className="space-y-2">
            <textarea
              value={editText}
              onChange={e => setEditText(e.target.value)}
              rows={3}
              className="w-full border border-[#E5E7EB] rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:border-[#F5A524]"
            />
            <div className="flex gap-2">
              <button onClick={saveEdit} disabled={saving || !editText.trim()}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#1E2A44] text-white disabled:opacity-50">
                {saving ? 'Saving…' : 'Save'}
              </button>
              <button onClick={() => { setEditing(false); setEditText(comment.body) }}
                className="px-3 py-1.5 rounded-lg text-xs border border-[#E5E7EB] text-[#6B7280]">
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <p className="text-sm text-[#374151] leading-relaxed">{comment.status === 'removed' ? <span className="text-[#9CA3AF] italic">[deleted]</span> : comment.body}</p>
        )}

        {/* Actions */}
        {!editing && comment.status !== 'removed' && (
          <div className="flex items-center gap-3 mt-1.5">
            <button onClick={handleLike} disabled={!currentUserId}
              className="flex items-center gap-1 text-xs transition-colors disabled:cursor-default"
              style={{ color: liked ? '#F5A524' : '#9CA3AF' }}>
              ♥ {likeCount > 0 && likeCount}
            </button>
            {canModify && (
              <div className="relative">
                <button onClick={() => setMenuOpen(v => !v)} className="text-xs text-[#9CA3AF] hover:text-[#374151]">•••</button>
                {menuOpen && (
                  <div className="absolute left-0 top-5 bg-white border border-[#E5E7EB] rounded-lg shadow-lg py-1 z-10 min-w-[100px]">
                    <button onClick={() => { setEditing(true); setMenuOpen(false) }} className="block w-full text-left px-3 py-1.5 text-xs text-[#374151] hover:bg-[#F9FAFB]">Edit</button>
                    <button onClick={handleDelete} className="block w-full text-left px-3 py-1.5 text-xs text-[#DC2626] hover:bg-[#FEF2F2]">Delete</button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

/* ─── Page ───────────────────────────────────────────────────────────────── */
export default function ReportDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [report, setReport] = useState<Report | null>(null)
  const [comments, setComments] = useState<Comment[]>([])
  const [loading, setLoading] = useState(true)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [upvoted, setUpvoted] = useState(false)
  const [newComment, setNewComment] = useState('')
  const [posting, setPosting] = useState(false)
  const [postError, setPostError] = useState('')

  useEffect(() => {
    createClient().auth.getUser().then(({ data }) => setCurrentUserId(data.user?.id ?? null))
  }, [])

  const loadData = useCallback(async () => {
    const hdrs = await authHeader()
    const [rRes, cRes, uvRes] = await Promise.all([
      fetch(`/api/reports/${id}`),
      fetch(`/api/reports/${id}/comments`),
      fetch(`/api/reports/${id}/upvote`, { headers: hdrs }),
    ])
    if (rRes.status === 404) { router.replace('/app/question-bank'); return }
    const [r, c, uv] = await Promise.all([rRes.json(), cRes.json(), uvRes.json()])
    setReport(r)
    setComments(Array.isArray(c) ? c : [])
    setUpvoted(uv.upvoted ?? false)
    setLoading(false)
  }, [id, router])

  useEffect(() => { loadData() }, [loadData])

  async function upvote() {
    if (!currentUserId) return
    // Optimistic update
    const wasUpvoted = upvoted
    setUpvoted(!wasUpvoted)
    setReport(r => r ? { ...r, upvote_count: r.upvote_count + (wasUpvoted ? -1 : 1) } : r)
    const hdrs = await authHeader()
    const res = await fetch(`/api/reports/${id}/upvote`, { method: 'POST', headers: hdrs })
    if (res.ok) {
      const { upvoted: serverUpvoted, upvote_count } = await res.json()
      setUpvoted(serverUpvoted)
      setReport(r => r ? { ...r, upvote_count } : r)
    } else {
      // Revert on failure
      setUpvoted(wasUpvoted)
      setReport(r => r ? { ...r, upvote_count: r.upvote_count + (wasUpvoted ? 1 : -1) } : r)
    }
  }

  async function postComment(e: React.FormEvent) {
    e.preventDefault()
    if (!newComment.trim() || !currentUserId) return
    setPosting(true); setPostError('')
    const hdrs = await authHeader()
    const res = await fetch(`/api/reports/${id}/comments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...hdrs },
      body: JSON.stringify({ body: newComment }),
    })
    setPosting(false)
    if (!res.ok) { setPostError('Failed to post. Try again.'); return }
    const c = await res.json()
    setComments(prev => [...prev, c])
    setNewComment('')
    setReport(r => r ? { ...r, comment_count: r.comment_count + 1 } : r)
  }

  function handleDelete(commentId: string) {
    setComments(prev => prev.map(c => c.id === commentId ? { ...c, status: 'removed', body: '[deleted]' } : c))
    setReport(r => r ? { ...r, comment_count: Math.max(0, r.comment_count - 1) } : r)
  }

  function handleEdit(commentId: string, newBody: string) {
    setComments(prev => prev.map(c => c.id === commentId ? { ...c, body: newBody, edited_at: new Date().toISOString() } : c))
  }

  if (loading) return (
    <AppLayout>
      <div className="flex items-center justify-center py-32">
        <div style={{ width: 24, height: 24, border: '2.5px solid rgba(245,165,36,.3)', borderTopColor: '#F5A524', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    </AppLayout>
  )

  if (!report) return null
  const outcome = report.outcome ? OUTCOME_STYLE[report.outcome] : null

  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto px-6 py-10">
        {/* Back */}
        <Link href="/app/question-bank" className="inline-flex items-center gap-1.5 text-sm text-[#7A7267] hover:text-[#17140F] mb-6 transition-colors">
          ← Question Bank
        </Link>

        {/* Report card */}
        <div className="bg-white border border-[#E5E7EB] rounded-2xl p-6 mb-8 shadow-sm">
          <blockquote className="text-lg text-[#111827] leading-relaxed font-medium mb-4">
            &ldquo;{report.question_text}&rdquo;
          </blockquote>

          <div className="flex items-center gap-2 flex-wrap mb-5">
            <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-[#EEF2FF] text-[#4F46E5]">
              {CLUSTER_LABELS[report.cluster] ?? report.cluster}
            </span>
            <span className="text-[11px] px-2.5 py-1 rounded-full bg-[#F3F4F6] text-[#6B7280]">
              {ROUND_LABELS[report.round] ?? report.round}
            </span>
            {report.role_track && <span className="text-[11px] text-[#9CA3AF]">{report.role_track}</span>}
            {report.year && <span className="text-[11px] text-[#9CA3AF]">{report.year}</span>}
            {outcome && (
              <span className="text-[11px] font-medium px-2.5 py-1 rounded-full" style={{ background: outcome.bg, color: outcome.color }}>
                {outcome.label}
              </span>
            )}
          </div>

          <div className="flex items-center gap-4">
            <button onClick={upvote} disabled={!currentUserId}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border transition-all disabled:cursor-default"
              style={upvoted ? { background: '#FFF8EE', color: '#D98A0B', borderColor: '#F5A524' } : { background: 'white', color: '#6B7280', borderColor: '#E5E7EB' }}>
              ▲ {report.upvote_count} {report.upvote_count === 1 ? 'upvote' : 'upvotes'}
            </button>
            <span className="text-sm text-[#9CA3AF]">💬 {report.comment_count} {report.comment_count === 1 ? 'comment' : 'comments'}</span>
          </div>
        </div>

        {/* Comment section */}
        <div>
          <h2 className="text-base font-bold text-[#111827] mb-4">
            Comments ({comments.filter(c => c.status !== 'removed').length})
          </h2>

          {/* Composer */}
          {currentUserId ? (
            <form onSubmit={postComment} className="mb-6">
              <textarea
                value={newComment}
                onChange={e => setNewComment(e.target.value)}
                placeholder="Add a comment or share your experience with this question…"
                rows={3}
                maxLength={1000}
                className="w-full border border-[#E5E7EB] rounded-xl px-4 py-3 text-sm resize-none focus:outline-none focus:border-[#F5A524] mb-2"
              />
              {postError && <p className="text-xs text-red-600 mb-2">{postError}</p>}
              <button type="submit" disabled={posting || !newComment.trim()}
                className="px-5 py-2 rounded-lg text-sm font-semibold bg-[#1E2A44] text-white hover:bg-[#2d3f61] disabled:opacity-50 transition-all">
                {posting ? 'Posting…' : 'Comment'}
              </button>
            </form>
          ) : (
            <div className="bg-[#F9FAFB] border border-[#E5E7EB] rounded-xl px-4 py-3 mb-6 text-sm text-[#6B7280]">
              <Link href="/signup" className="font-semibold text-[#F5A524] hover:underline">Create a free account</Link> to join the discussion.
            </div>
          )}

          {/* Comments list */}
          {comments.length === 0 ? (
            <div className="text-center py-8 text-[#9CA3AF] text-sm">No comments yet. Be the first to share your experience.</div>
          ) : (
            <div>
              {comments.map(c => (
                <CommentRow
                  key={c.id}
                  comment={c}
                  currentUserId={currentUserId}
                  onDelete={handleDelete}
                  onEdit={handleEdit}
                />
              ))}
            </div>
          )}
        </div>
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </AppLayout>
  )
}
