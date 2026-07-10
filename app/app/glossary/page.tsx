'use client'
import { useState, useEffect } from 'react'
import AppLayout from '@/components/app/AppLayout'

interface GlossaryTool {
  id: string
  name: string
  category: string
  one_line_definition: string
  common_interview_angle: string
  role_clusters: string[]
  display_order: number
}

const CATEGORIES = [
  { id: '',             label: 'All' },
  { id: 'orchestration', label: 'Orchestration' },
  { id: 'retrieval',     label: 'Retrieval' },
  { id: 'serving',       label: 'Serving' },
  { id: 'evaluation',    label: 'Evaluation' },
  { id: 'fine_tuning',   label: 'Fine-Tuning' },
  { id: 'automation',    label: 'Automation' },
]

const CLUSTERS = [
  { id: '',                    label: 'All roles' },
  { id: 'ai_llm_engineer',     label: 'AI / LLM Engineer' },
  { id: 'ai_automation_engineer', label: 'Automation Engineer' },
  { id: 'applied_ai_mlops',    label: 'Applied AI / MLOps' },
  { id: 'fde',                 label: 'FDE / Solutions' },
]

const CATEGORY_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  orchestration: { bg: '#EEF2FF', text: '#3730A3', border: '#C7D2FE' },
  retrieval:     { bg: '#F0FDF4', text: '#166534', border: '#86EFAC' },
  serving:       { bg: '#FFF7ED', text: '#9A3412', border: '#FED7AA' },
  evaluation:    { bg: '#FEF3C7', text: '#92400E', border: '#FDE68A' },
  fine_tuning:   { bg: '#F5F3FF', text: '#5B21B6', border: '#DDD6FE' },
  automation:    { bg: '#EFF6FF', text: '#1E40AF', border: '#BFDBFE' },
}

export default function GlossaryPage() {
  const [tools,       setTools]       = useState<GlossaryTool[]>([])
  const [category,    setCategory]    = useState('')
  const [cluster,     setCluster]     = useState('')
  const [search,      setSearch]      = useState('')
  const [expanded,    setExpanded]    = useState<string | null>(null)
  const [loading,     setLoading]     = useState(true)

  useEffect(() => {
    async function load() {
      setLoading(true)
      const params = new URLSearchParams()
      if (category) params.set('category', category)
      if (cluster)  params.set('role_cluster', cluster)
      const res  = await fetch(`/api/glossary?${params}`)
      const data = await res.json()
      setTools(data.tools ?? [])
      setLoading(false)
    }
    load()
  }, [category, cluster])

  const filtered = tools.filter(t =>
    !search || t.name.toLowerCase().includes(search.toLowerCase()) ||
    t.one_line_definition.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto px-6 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-[#111827] mb-1">Tools Glossary</h1>
          <p className="text-sm text-[#6B7280]">Quick-reference for every AI tool you&apos;ll encounter — what it does and how it gets asked in interviews.</p>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl border border-[#E5E7EB] p-4 mb-6 space-y-3" style={{ boxShadow: '0 1px 3px rgba(0,0,0,.05)' }}>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search tools..."
            className="w-full text-sm bg-[#F8F9FB] border border-[#E5E7EB] rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#F5A524]/15 focus:border-[#F5A524] transition-all"
          />
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map(c => (
              <button key={c.id} onClick={() => setCategory(c.id)}
                className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all border"
                style={{
                  background:   category === c.id ? '#FFF8EE' : 'white',
                  color:        category === c.id ? '#D98A0B' : '#374151',
                  borderColor:  category === c.id ? '#F5A524' : '#E5E7EB',
                  fontWeight:   category === c.id ? 600 : 400,
                }}>
                {c.label}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            {CLUSTERS.map(c => (
              <button key={c.id} onClick={() => setCluster(c.id)}
                className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all border"
                style={{
                  background:  cluster === c.id ? '#EEF2FF' : 'white',
                  color:       cluster === c.id ? '#3730A3' : '#374151',
                  borderColor: cluster === c.id ? '#C7D2FE' : '#E5E7EB',
                  fontWeight:  cluster === c.id ? 600 : 400,
                }}>
                {c.label}
              </button>
            ))}
          </div>
        </div>

        {/* Tool count */}
        <p className="text-xs text-[#9CA3AF] mb-4">{filtered.length} tool{filtered.length !== 1 ? 's' : ''}</p>

        {/* Tool cards */}
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div style={{ width: 24, height: 24, border: '2.5px solid #E5E7EB', borderTopColor: '#F5A524', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-[#9CA3AF] text-sm">No tools match your filters.</div>
        ) : (
          <div className="space-y-3">
            {filtered.map(tool => {
              const colors  = CATEGORY_COLORS[tool.category] ?? { bg: '#F8F9FB', text: '#374151', border: '#E5E7EB' }
              const isOpen  = expanded === tool.id
              return (
                <div key={tool.id}
                  className="bg-white rounded-xl border border-[#E5E7EB] overflow-hidden transition-all"
                  style={{ boxShadow: isOpen ? '0 4px 12px rgba(0,0,0,.06)' : '0 1px 3px rgba(0,0,0,.04)' }}>
                  <button
                    className="w-full text-left px-5 py-4 flex items-start gap-3 hover:bg-[#F8F9FB] transition-colors"
                    onClick={() => setExpanded(isOpen ? null : tool.id)}>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1.5">
                        <span className="font-semibold text-[#111827] text-sm">{tool.name}</span>
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full border"
                          style={{ background: colors.bg, color: colors.text, borderColor: colors.border }}>
                          {tool.category.replace('_', ' ')}
                        </span>
                      </div>
                      <p className="text-xs text-[#6B7280] leading-snug">{tool.one_line_definition}</p>
                    </div>
                    <svg
                      className="flex-shrink-0 mt-0.5 transition-transform"
                      style={{ transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)', color: '#9CA3AF' }}
                      width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>

                  {isOpen && (
                    <div className="px-5 pb-5 border-t border-[#F3F4F6]">
                      <div className="mt-4 p-4 rounded-lg border" style={{ background: '#FFFBEB', borderColor: '#FDE68A' }}>
                        <p className="text-[10px] font-semibold text-[#92400E] uppercase tracking-widest mb-2">How interviewers ask about this</p>
                        <p className="text-sm text-[#451A03] leading-relaxed">{tool.common_interview_angle}</p>
                      </div>
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {tool.role_clusters.map(c => (
                          <span key={c} className="text-[10px] px-2 py-1 rounded-full bg-[#F3F4F6] text-[#6B7280] border border-[#E5E7EB]">
                            {c.replace(/_/g, ' ')}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
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
