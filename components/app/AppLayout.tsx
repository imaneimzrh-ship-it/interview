'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import AttributionModal from '@/components/app/AttributionModal'
import SunMark from '@/components/SunMark'

interface UserData { email?: string; full_name?: string; plan?: string; source?: string | null }

const NAV = [
  {
    group: 'Practice',
    items: [
      { href: '/app/start',   label: 'New Interview', icon: '🚀' },
      { href: '/cv',          label: 'CV Diagnostic', icon: '📄' },
      { href: '/app/history',   label: 'Past Sessions',  icon: '🕐' },
      { href: '/app/questions', label: 'Question Bank',  icon: '📚' },
    ],
  },
  {
    group: 'Account',
    items: [
      { href: '/pricing',      label: 'Upgrade',  icon: '⭐' },
      { href: '/app/settings', label: 'Settings', icon: '⚙️' },
    ],
  },
]

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router   = useRouter()
  const sb       = createClient()
  const [mobile,       setMobile]       = useState(false)
  const [user,         setUser]         = useState<UserData | null>(null)
  const [showAttrib,   setShowAttrib]   = useState(false)

  useEffect(() => {
    async function load() {
      const { data: { user: u } } = await sb.auth.getUser()
      if (!u) { router.push('/login'); return }
      const { data: p } = await sb.from('profiles').select('email, full_name, plan, source').eq('id', u.id).single()
      setUser({ email: u.email, full_name: p?.full_name, plan: p?.plan ?? 'free', source: p?.source })
      // Show attribution modal once for users who haven't answered yet
      if (p && p.source === null) setShowAttrib(true)
    }
    load()
  }, [])

  const initials = (user?.full_name ?? user?.email ?? '?').slice(0, 1).toUpperCase()

  async function signOut() { await sb.auth.signOut(); router.push('/') }

  const Sidebar = () => (
    <aside className="w-52 flex-shrink-0 bg-white border-r border-[#E5E7EB] flex flex-col h-screen overflow-y-auto" style={{ minWidth: 208 }}>
      <div className="h-16 flex items-center px-4 border-b border-[#E5E7EB]">
        <Link href="/app/start" className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-[#1E2A44] flex items-center justify-center shadow-sm"><SunMark size={14} /></div>
          <div>
            <div className="font-bold text-[#111827] text-sm leading-tight">Sonne AI</div>
            <div className="text-[10px] text-[#9CA3AF] leading-tight">Interview Prep</div>
          </div>
        </Link>
      </div>

      <div className="flex-1 px-3 py-4 space-y-5">
        {NAV.map(section => (
          <div key={section.group}>
            <p className="text-[10px] font-semibold text-[#9CA3AF] uppercase tracking-widest px-2 mb-1.5">{section.group}</p>
            {section.items.map(item => {
              const active = pathname === item.href || pathname.startsWith(item.href + '/')
              return (
                <Link key={item.href} href={item.href}
                  className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm transition-all mb-0.5"
                  style={{
                    background: active ? '#FFF8EE' : 'transparent',
                    color: active ? '#D98A0B' : '#374151',
                    fontWeight: active ? 500 : 400,
                  }}>
                  <span>{item.icon}</span>
                  <span>{item.label}</span>
                </Link>
              )
            })}
          </div>
        ))}
      </div>

      <div className="px-3 pb-2">
        {user?.plan === 'pro' ? (
          <div className="bg-[#ECFDF5] border border-[#A7F3D0] rounded-lg px-3 py-2 text-xs text-[#065F46] font-medium">
            ✓ Pro plan — unlimited
          </div>
        ) : (
          <Link href="/pricing" className="block bg-[#FFF8EE] border border-[#F5A524]/30 rounded-lg px-3 py-2 text-xs text-[#C77D2E] font-medium hover:bg-[#FEEFC7] transition-colors">
            ↑ Upgrade to Pro →
          </Link>
        )}
      </div>

      <div className="border-t border-[#E5E7EB] px-3 py-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-[#F5A524] flex items-center justify-center text-[#17140F] font-bold text-sm flex-shrink-0">
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xs font-medium text-[#111827] truncate">{user?.full_name || user?.email?.split('@')[0] || '...'}</div>
            <div className="text-[10px] text-[#9CA3AF] truncate">{user?.email ?? ''}</div>
          </div>
          <button onClick={signOut} title="Sign out" className="text-[#9CA3AF] hover:text-[#374151] transition-colors text-xs flex-shrink-0">→</button>
        </div>
      </div>
    </aside>
  )

  return (
    <div className="flex h-screen overflow-hidden bg-[#F8F9FB]" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
      {showAttrib && <AttributionModal onDone={() => setShowAttrib(false)} />}
      <div className="hidden md:flex">
        <Sidebar />
      </div>

      {mobile && (
        <div className="fixed inset-0 z-50 flex md:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setMobile(false)} />
          <div className="relative z-10"><Sidebar /></div>
        </div>
      )}

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <div className="md:hidden flex items-center justify-between px-4 h-14 bg-white border-b border-[#E5E7EB]" style={{ boxShadow: '0 1px 3px rgba(0,0,0,.06)' }}>
          <button onClick={() => setMobile(true)} className="text-[#374151] p-1">
            <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16"/></svg>
          </button>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-md bg-[#1E2A44] flex items-center justify-center"><SunMark size={12} /></div>
            <span className="font-semibold text-[#111827] text-sm">Sonne AI</span>
          </div>
          <div className="w-8" />
        </div>

        <div className="flex-1 overflow-auto">
          {children}
        </div>
      </div>
    </div>
  )
}
