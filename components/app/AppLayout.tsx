'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import AttributionModal from '@/components/app/AttributionModal'
import SunMark from '@/components/SunMark'

interface UserData {
  email?: string
  full_name?: string
  plan?: string
  source?: string | null
  credits_remaining?: number
  credits_total?: number
}

const NAV = [
  {
    group: 'Practice',
    items: [
      { href: '/cv',              label: 'CV Diagnostic',       icon: '📄' },
      { href: '/app/practice',    label: 'Practice Hub',        icon: '🎯' },
      { href: '/community',       label: 'Community DB',        icon: '🌐' },
      { href: '/app/questions',   label: 'Question Bank',       icon: '🗂️' },
      { href: '/app/glossary',    label: 'Tools Glossary',      icon: '📖' },
    ],
  },
  {
    group: 'Account',
    items: [
      { href: '/app/history',   label: 'Past Sessions', icon: '🕐' },
      { href: '/pricing',       label: 'Upgrade',       icon: '⭐' },
      { href: '/app/settings',  label: 'Settings',      icon: '⚙️' },
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
    async function loadProfile(userId: string, email?: string) {
      const [profileRes, planRes] = await Promise.all([
        sb.from('profiles').select('email, full_name, plan, source').eq('id', userId).single(),
        sb.from('user_plans').select('credits_remaining, credits_total').eq('user_id', userId).maybeSingle(),
      ])
      const p = profileRes.data
      const plan = planRes.data
      setUser({
        email,
        full_name:        p?.full_name,
        plan:             p?.plan ?? 'free',
        source:           p?.source,
        credits_remaining: plan?.credits_remaining ?? (p?.plan === 'pro' ? 50 : 3),
        credits_total:     plan?.credits_total ?? (p?.plan === 'pro' ? 50 : 3),
      })
      if (p && p.source === null) setShowAttrib(true)
    }

    // Use onAuthStateChange as the single source of truth.
    // INITIAL_SESSION fires immediately with the current session (or null).
    // This avoids the race where getSession() returns null while the token
    // is mid-refresh, causing a false redirect to /login.
    const { data: { subscription } } = sb.auth.onAuthStateChange((event, session) => {
      if (!session) {
        if (event === 'INITIAL_SESSION' || event === 'SIGNED_OUT') {
          router.push('/login')
        }
      } else if (
        event === 'INITIAL_SESSION' ||
        event === 'SIGNED_IN' ||
        event === 'TOKEN_REFRESHED' ||
        event === 'USER_UPDATED'
      ) {
        loadProfile(session.user.id, session.user.email)
      }
    })
    return () => subscription.unsubscribe()
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
        {/* Primary CTA — always at top */}
        <Link href="/app/start"
          className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl text-sm font-semibold transition-all"
          style={{
            background: pathname === '/app/start' ? '#D98A0B' : '#F5A524',
            color: '#17140F',
            boxShadow: '0 2px 8px rgba(245,165,36,.25)',
          }}>
          <span>🚀</span>
          <span>New Interview</span>
        </Link>

        {NAV.map(section => (
          <div key={section.group}>
            <p className="text-[10px] font-semibold text-[#9CA3AF] uppercase tracking-widest px-2 mb-1.5">{section.group}</p>
            {section.items
              .filter(item => !(item.href === '/pricing' && user?.plan === 'pro'))
              .map(item => {
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
            ✓ Pro plan — {user.credits_remaining}/{user.credits_total} sessions this month
          </div>
        ) : user?.plan === 'free' ? (
          <div className="bg-[#FFF8EE] border border-[#F5A524]/30 rounded-lg px-3 py-2 text-xs text-[#D98A0B] font-medium">
            Free plan — {user.credits_remaining}/{user.credits_total} free sessions left
          </div>
        ) : null}
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
