'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import AppLayout from '@/components/app/AppLayout'
import { createClient } from '@/lib/supabase/client'

interface Profile { email: string; full_name: string; plan: string; created_at: string; question_username?: string | null }
interface Cv      { text: string; updated_at: string }

async function authHeader(): Promise<Record<string, string>> {
  const { data: { session } } = await createClient().auth.getSession()
  if (session?.access_token) return { Authorization: `Bearer ${session.access_token}` }
  return {}
}

export default function SettingsPage() {
  const router = useRouter()
  const sb     = createClient()

  const [profile,      setProfile]      = useState<Profile | null>(null)
  const [cv,           setCv]           = useState<Cv | null>(null)
  const [loading,      setLoading]      = useState(true)
  const [saving,         setSaving]         = useState(false)
  const [fullName,       setFullName]       = useState('')
  const [nameSaved,      setNameSaved]      = useState(false)
  const [username,       setUsername]       = useState('')
  const [usernameSaving, setUsernameSaving] = useState(false)
  const [usernameSaved,  setUsernameSaved]  = useState(false)
  const [usernameError,  setUsernameError]  = useState('')
  const [deletingCv,   setDeletingCv]   = useState(false)
  const [portalLoading,setPortalLoading]= useState(false)
  const [deleteConfirm,setDeleteConfirm]= useState(false)
  const [error,        setError]        = useState('')

  useEffect(() => { load() }, [])

  async function load() {
    const { data: { session } } = await sb.auth.getSession()
    if (!session) { router.push('/login'); return }
    const u = session.user

    const [{ data: p }, { data: c }] = await Promise.all([
      sb.from('profiles').select('email, full_name, plan, created_at, question_username').eq('id', u.id).single(),
      sb.from('cvs').select('text, updated_at').eq('user_id', u.id).maybeSingle(),
    ])

    if (p) { setProfile(p); setFullName(p.full_name ?? ''); setUsername(p.question_username ?? '') }
    setCv(c ?? null)
    setLoading(false)
  }

  async function saveName() {
    if (!fullName.trim()) return
    setSaving(true)
    const { data: { user: u } } = await sb.auth.getUser()
    if (!u) return
    const { error } = await sb.from('profiles').update({ full_name: fullName.trim() }).eq('id', u.id)
    if (error) setError(error.message)
    else setNameSaved(true)
    setSaving(false)
    setTimeout(() => setNameSaved(false), 3000)
  }

  async function saveUsername() {
    const trimmed = username.trim().toLowerCase()
    if (!trimmed) return
    if (!/^[a-z0-9_]{3,30}$/.test(trimmed)) {
      setUsernameError('3–30 characters, letters, numbers, and underscores only.')
      return
    }
    setUsernameSaving(true); setUsernameError('')
    const { data: { user: u } } = await sb.auth.getUser()
    if (!u) return
    const { error } = await sb.from('profiles').update({ question_username: trimmed }).eq('id', u.id)
    if (error) {
      setUsernameError(error.message.includes('unique') ? 'That username is already taken.' : error.message)
    } else {
      setUsernameSaved(true)
      setTimeout(() => setUsernameSaved(false), 3000)
    }
    setUsernameSaving(false)
  }

  async function deleteCv() {
    setDeletingCv(true)
    const hdrs = await authHeader()
    const res  = await fetch('/api/cv/delete', { method: 'DELETE', headers: hdrs })
    if (res.ok) setCv(null)
    else setError('Failed to delete CV.')
    setDeletingCv(false); setDeleteConfirm(false)
  }

  async function openPortal() {
    setPortalLoading(true)
    const hdrs = await authHeader()
    const res  = await fetch('/api/stripe/portal', { method: 'POST', headers: { 'Content-Type': 'application/json', ...hdrs } })
    const d    = await res.json()
    if (d.url) window.location.href = d.url
    else { setError(d.error ?? 'Could not open billing portal.'); setPortalLoading(false) }
  }

  const isPro     = profile?.plan === 'pro'
  const joinDate  = profile?.created_at ? new Date(profile.created_at).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' }) : ''
  const cvDate    = cv?.updated_at ? new Date(cv.updated_at).toLocaleDateString('en-GB', { month: 'short', day: 'numeric', year: 'numeric' }) : ''

  if (loading) return (
    <AppLayout>
      <div className="flex items-center justify-center py-24">
        <div style={{ width:24, height:24, border:'2.5px solid rgba(245,165,36,.3)', borderTopColor:'#F5A524', borderRadius:'50%', animation:'spin 1s linear infinite' }} />
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    </AppLayout>
  )

  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto px-6 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-[#111827] mb-1">Settings</h1>
          <p className="text-[#6B7280] text-sm">Manage your profile, CV, and subscription.</p>
        </div>

        {error && (
          <div className="mb-5 bg-[#FEF2F2] border border-[#FECACA] rounded-xl p-4 flex items-center justify-between">
            <span className="text-sm text-[#DC2626]">{error}</span>
            <button onClick={() => setError('')} className="text-[#DC2626]/50 hover:text-[#DC2626]">×</button>
          </div>
        )}

        <div className="space-y-4">

          {/* Profile */}
          <section className="bg-white rounded-xl border border-[#E5E7EB] p-5 shadow-sm">
            <h2 className="text-sm font-semibold text-[#111827] mb-4">Profile</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-xs text-[#6B7280] mb-1.5">Email</label>
                <div className="text-sm text-[#374151] bg-[#F9FAFB] border border-[#E5E7EB] rounded-lg px-3 py-2.5">{profile?.email}</div>
              </div>
              <div>
                <label className="block text-xs text-[#6B7280] mb-1.5">Display name</label>
                <div className="flex gap-2">
                  <input
                    value={fullName}
                    onChange={e => setFullName(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && saveName()}
                    placeholder="Your name"
                    className="flex-1 text-sm text-[#111827] bg-[#F8F9FB] border border-[#E5E7EB] rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#F5A524]/20 focus:border-[#F5A524] transition-all"
                  />
                  <button onClick={saveName} disabled={saving || !fullName.trim()}
                    className="text-sm font-medium px-4 py-2.5 rounded-lg border border-[#E5E7EB] hover:bg-[#F3F4F6] disabled:opacity-50 transition-all"
                    style={{ color: nameSaved ? '#059669' : '#374151' }}>
                    {nameSaved ? '✓ Saved' : saving ? '...' : 'Save'}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-xs text-[#6B7280] mb-1.5">
                  Public username <span className="text-[#9CA3AF]">— shown on AI Reports</span>
                </label>
                <div className="flex gap-2">
                  <input
                    value={username}
                    onChange={e => { setUsername(e.target.value); setUsernameError('') }}
                    onKeyDown={e => e.key === 'Enter' && saveUsername()}
                    placeholder="e.g. alex_ml"
                    maxLength={30}
                    className="flex-1 text-sm text-[#111827] bg-[#F8F9FB] border border-[#E5E7EB] rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#F5A524]/20 focus:border-[#F5A524] transition-all font-mono"
                  />
                  <button onClick={saveUsername} disabled={usernameSaving || !username.trim()}
                    className="text-sm font-medium px-4 py-2.5 rounded-lg border border-[#E5E7EB] hover:bg-[#F3F4F6] disabled:opacity-50 transition-all"
                    style={{ color: usernameSaved ? '#059669' : '#374151' }}>
                    {usernameSaved ? '✓ Saved' : usernameSaving ? '...' : 'Save'}
                  </button>
                </div>
                {usernameError && <p className="text-xs text-[#DC2626] mt-1">{usernameError}</p>}
                {!usernameError && <p className="text-xs text-[#9CA3AF] mt-1">Letters, numbers, underscores · 3–30 characters</p>}
              </div>
              <div className="text-xs text-[#9CA3AF]">Joined {joinDate}</div>
            </div>
          </section>

          {/* Plan */}
          <section className="bg-white rounded-xl border border-[#E5E7EB] p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-[#111827]">Subscription</h2>
              <span className="text-xs font-bold px-2.5 py-1 rounded-full"
                style={{ background: isPro ? '#ECFDF5' : '#F3F4F6', color: isPro ? '#059669' : '#6B7280', border: isPro ? '1px solid #A7F3D0' : '1px solid #E5E7EB' }}>
                {isPro ? 'Pro' : 'Free'}
              </span>
            </div>
            {isPro ? (
              <div className="space-y-3">
                <p className="text-sm text-[#374151]">You have access to all 4 modules, unlimited sessions, and full diagnostic breakdowns.</p>
                <button onClick={openPortal} disabled={portalLoading}
                  className="text-sm font-medium border border-[#E5E7EB] px-4 py-2.5 rounded-lg hover:bg-[#F3F4F6] transition-all disabled:opacity-50">
                  {portalLoading ? 'Opening...' : 'Manage billing →'}
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-sm text-[#374151]">Free plan includes 1 session — any module — plus a headline diagnostic. Upgrade for all 4 modules and unlimited practice.</p>
                <Link href="/pricing"
                  className="inline-flex items-center text-sm font-semibold px-4 py-2.5 rounded-lg transition-all shadow-sm"
                  style={{ background: '#F5A524', color: '#17140F' }}>
                  Upgrade to Pro →
                </Link>
              </div>
            )}
          </section>

          {/* Saved CV */}
          <section className="bg-white rounded-xl border border-[#E5E7EB] p-5 shadow-sm">
            <h2 className="text-sm font-semibold text-[#111827] mb-1">Saved CV</h2>
            <p className="text-xs text-[#6B7280] mb-4">We don't use your CV to train models. Delete it anytime.</p>
            {cv ? (
              <div className="space-y-3">
                <div className="bg-[#F8F9FB] border border-[#E5E7EB] rounded-lg p-3 text-xs text-[#374151] leading-relaxed max-h-32 overflow-y-auto">
                  {cv.text.slice(0, 600)}{cv.text.length > 600 ? '…' : ''}
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-[#9CA3AF]">Last updated {cvDate}</span>
                  {!deleteConfirm ? (
                    <button onClick={() => setDeleteConfirm(true)} className="text-xs text-[#DC2626] hover:underline">Delete CV</button>
                  ) : (
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-[#374151]">Are you sure?</span>
                      <button onClick={deleteCv} disabled={deletingCv} className="text-xs font-medium text-[#DC2626] hover:underline disabled:opacity-50">
                        {deletingCv ? 'Deleting...' : 'Yes, delete'}
                      </button>
                      <button onClick={() => setDeleteConfirm(false)} className="text-xs text-[#9CA3AF] hover:text-[#374151]">Cancel</button>
                    </div>
                  )}
                </div>
                <Link href="/cv" className="inline-block text-xs text-[#2563EB] hover:underline">Re-score with updated CV →</Link>
              </div>
            ) : (
              <div className="text-center py-6">
                <div className="text-2xl mb-2">📄</div>
                <p className="text-sm text-[#6B7280] mb-3">No CV saved yet. Score your CV to save it here.</p>
                <Link href="/cv" className="text-sm font-medium text-[#2563EB] hover:underline">Score my CV →</Link>
              </div>
            )}
          </section>

          {/* Danger zone */}
          <section className="bg-white rounded-xl border border-[#E5E7EB] p-5 shadow-sm">
            <h2 className="text-sm font-semibold text-[#111827] mb-4">Account</h2>
            <button
              onClick={async () => { await sb.auth.signOut(); router.push('/') }}
              className="text-sm text-[#6B7280] border border-[#E5E7EB] px-4 py-2.5 rounded-lg hover:bg-[#F3F4F6] hover:text-[#374151] transition-all">
              Sign out
            </button>
          </section>

          {/* Legal */}
          <div className="flex gap-4 text-xs text-[#9CA3AF] pb-2">
            <Link href="/privacy" className="hover:text-[#374151] transition-colors">Privacy Policy</Link>
            <Link href="/terms"   className="hover:text-[#374151] transition-colors">Terms of Service</Link>
            <a href="mailto:support@sonneai.com" className="hover:text-[#374151] transition-colors">support@sonneai.com</a>
          </div>

        </div>
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </AppLayout>
  )
}
