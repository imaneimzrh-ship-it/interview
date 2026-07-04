'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

const OPTIONS = [
  { value: 'google',       label: '🔍 Google search' },
  { value: 'linkedin',     label: '💼 LinkedIn' },
  { value: 'reddit',       label: '🤖 Reddit' },
  { value: 'producthunt',  label: '🐱 Product Hunt' },
  { value: 'friend',       label: '👋 Friend or colleague' },
  { value: 'other',        label: '✨ Other' },
]

export default function AttributionModal({ onDone }: { onDone: () => void }) {
  const [selected, setSelected] = useState('')
  const [saving,   setSaving]   = useState(false)

  async function save() {
    if (!selected) return
    setSaving(true)
    const sb = createClient()
    const { data: { user } } = await sb.auth.getUser()
    if (user) await sb.from('profiles').update({ source: selected }).eq('id', user.id)
    onDone()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,.4)', backdropFilter: 'blur(4px)' }}>
      <div className="bg-white rounded-2xl border border-[#E7E2D8] shadow-xl max-w-sm w-full p-6" style={{ fontFamily: "'Inter', sans-serif" }}>
        <div className="text-center mb-5">
          <div className="w-10 h-10 rounded-xl bg-[#1E2A44] flex items-center justify-center mx-auto mb-3">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <circle cx="7" cy="7" r="3" fill="#F5A524"/>
              {[0,45,90,135,180,225,270,315].map((deg,i) => {
                const r=Math.PI*deg/180
                return <line key={i} x1={7+4*Math.cos(r)} y1={7+4*Math.sin(r)} x2={7+5.5*Math.cos(r)} y2={7+5.5*Math.sin(r)} stroke="#F5A524" strokeWidth="1.2" strokeLinecap="round"/>
              })}
            </svg>
          </div>
          <h2 className="text-base font-bold text-[#17140F]" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>One quick question</h2>
          <p className="text-sm text-[#7A7267] mt-1">How did you find Sonne AI?</p>
        </div>
        <div className="space-y-2 mb-5">
          {OPTIONS.map(o => (
            <button key={o.value} onClick={() => setSelected(o.value)}
              className="w-full text-left px-4 py-2.5 rounded-xl border text-sm transition-all"
              style={{
                borderColor: selected === o.value ? '#1E2A44' : '#E7E2D8',
                background:  selected === o.value ? '#EEF1F6' : 'white',
                color:       selected === o.value ? '#1E2A44' : '#374151',
                fontWeight:  selected === o.value ? 500 : 400,
              }}>
              {o.label}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <button onClick={onDone} className="flex-1 text-sm text-[#7A7267] border border-[#E7E2D8] py-2.5 rounded-xl hover:bg-[#F5F4F0] transition-all">
            Skip
          </button>
          <button onClick={save} disabled={!selected || saving}
            className="flex-1 text-sm font-semibold py-2.5 rounded-xl transition-all disabled:opacity-40"
            style={{ background: '#1E2A44', color: 'white', fontFamily: "'Space Grotesk', sans-serif" }}>
            {saving ? '...' : 'Done →'}
          </button>
        </div>
      </div>
    </div>
  )
}
