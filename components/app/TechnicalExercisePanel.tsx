'use client'
import { useState, useCallback, useEffect } from 'react'
import dynamic from 'next/dynamic'
import type { GradingResult } from '@/lib/claude/technical-grader'
import type { TestResults } from '@/lib/e2b/execute'
import { createClient } from '@/lib/supabase/client'

const MonacoEditor = dynamic(() => import('@monaco-editor/react'), { ssr: false, loading: () => (
  <div className="flex-1 flex items-center justify-center" style={{ background: '#1A202C' }}>
    <span className="text-[#718096] text-xs">Loading editor...</span>
  </div>
)})

interface Exercise {
  id: string
  title: string
  task_description: string
  starter_code: string | null
  language: string
  test_cases: { name: string; visible: boolean; seed_sql?: string }[]
  explanation_required: boolean
  difficulty: 'easy' | 'medium' | 'hard'
}

interface Props {
  exercise: Exercise
  sessionId: string
  onContinue: () => void
}

const DIFFICULTY_COLORS: Record<string, { bg: string; text: string }> = {
  easy:   { bg: '#ECFDF5', text: '#059669' },
  medium: { bg: '#FFF8EE', text: '#D98A0B' },
  hard:   { bg: '#FEF2F2', text: '#DC2626' },
}

const SEVERITY_COLORS: Record<string, string> = {
  minor:    '#D98A0B',
  major:    '#EA580C',
  critical: '#DC2626',
}

function ScoreBar({ label, score }: { label: string; score: number }) {
  return (
    <div className="space-y-1">
      <div className="flex justify-between items-center">
        <span className="text-xs text-[#6B7280]">{label}</span>
        <span className="text-xs font-bold text-[#111827]">{score}/10</span>
      </div>
      <div className="h-1.5 bg-[#F3F4F6] rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${score * 10}%`, background: score >= 7 ? '#10B981' : score >= 5 ? '#F5A524' : '#EF4444' }}
        />
      </div>
    </div>
  )
}

function SqlRunner({ exercise, onResults }: { exercise: Exercise; onResults: (r: TestResults, query: string) => void }) {
  const [query, setQuery] = useState(exercise.starter_code ?? '')
  const [running, setRunning] = useState(false)
  const [error, setError] = useState('')

  const runSql = useCallback(async () => {
    setRunning(true); setError('')
    try {
      const { default: initSqlJs } = await import('sql.js')
      const SQL = await initSqlJs({ locateFile: (f: string) => `https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.10.2/${f}` })
      const db = new SQL.Database()

      const seed = exercise.test_cases.find(tc => tc.seed_sql)?.seed_sql ?? ''
      if (seed) db.run(seed)

      const stmt = db.exec(query)
      const rows: Record<string, unknown>[] = []
      if (stmt.length > 0) {
        const cols = stmt[0].columns
        for (const row of stmt[0].values) {
          const obj: Record<string, unknown> = {}
          cols.forEach((c, i) => obj[c] = row[i])
          rows.push(obj)
        }
      }

      const details: TestResults['details'] = []
      for (const tc of exercise.test_cases) {
        const rule = tc as unknown as { query_check?: string; name: string }
        if (!rule.query_check) { details.push({ test_name: tc.name, status: 'pass' }); continue }
        const check = rule.query_check
        try {
          let pass = false
          if (check.includes('row_count')) {
            const expected = parseInt(check.match(/==\s*(\d+)/)?.[1] ?? '0')
            pass = rows.length === expected
          } else if (check.includes('event_count=')) {
            const nameMatch = check.match(/name='(\w+)'/)
            const countMatch = check.match(/event_count=(\d+)/)
            if (nameMatch && countMatch) {
              const row = rows.find(r => r['name'] === nameMatch[1])
              pass = row ? Number(row['event_count']) === parseInt(countMatch[1]) : false
            }
          }
          details.push({ test_name: tc.name, status: pass ? 'pass' : 'fail', error: pass ? undefined : `Check "${check}" failed. Got ${rows.length} rows.` })
        } catch (e) {
          details.push({ test_name: tc.name, status: 'fail', error: String(e) })
        }
      }

      db.close()
      const passed = details.filter(d => d.status === 'pass').length
      onResults({ total_tests: details.length, passed, failed: details.length - passed, details, runtime_errors: [] }, query)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setRunning(false)
    }
  }, [query, exercise, onResults])

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-4 py-2 bg-[#2D3748] border-b border-[#3D4A5C]">
        <span className="text-[10px] font-mono text-[#A0AEC0] uppercase tracking-wide">SQL</span>
        <button onClick={runSql} disabled={running}
          className="text-xs font-semibold px-3 py-1 rounded-md disabled:opacity-50"
          style={{ background: '#38A169', color: 'white' }}>
          {running ? 'Running...' : '▶ Run Query'}
        </button>
      </div>
      <textarea
        value={query}
        onChange={e => setQuery(e.target.value)}
        className="flex-1 font-mono text-xs text-[#E2E8F0] px-4 py-3 resize-none focus:outline-none"
        style={{ background: '#1A202C', minHeight: 160 }}
        spellCheck={false}
      />
      {error && <div className="px-4 py-2 text-xs text-red-400 bg-red-900/20">{error}</div>}
    </div>
  )
}

// ── Full-solution reveal (after scorecard) ───────────────────────────────────

interface SolutionData {
  full_solution_code: string
  concept_explanation: string | null
  language: string
}

function FullSolutionPanel({ exerciseId, sessionId }: { exerciseId: string; sessionId: string }) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [solution, setSolution] = useState<SolutionData | null>(null)
  const [err, setErr] = useState('')

  async function load() {
    if (solution) { setOpen(o => !o); return }
    setLoading(true); setErr('')
    try {
      const { data: { session } } = await createClient().auth.getSession()
      const hdrs: Record<string, string> = session?.access_token
        ? { Authorization: `Bearer ${session.access_token}` }
        : {}
      const res = await fetch(`/api/exercises/${exerciseId}/full-solution?session_id=${sessionId}`, { headers: hdrs })
      const data = await res.json()
      if (!res.ok) { setErr(data.error ?? 'Could not load solution'); setLoading(false); return }
      setSolution(data)
      setOpen(true)
    } catch { setErr('Network error') }
    finally { setLoading(false) }
  }

  return (
    <div className="bg-white border border-[#E5E7EB] rounded-2xl overflow-hidden shadow-sm">
      <button
        onClick={load}
        disabled={loading}
        className="w-full flex items-center justify-between px-5 py-4 text-sm font-semibold text-[#374151] hover:bg-[#F9FAFB] transition-colors"
      >
        <span className="flex items-center gap-2">
          <span>📖</span>
          <span>Show full corrected solution</span>
        </span>
        <span className="text-[#9CA3AF]">
          {loading ? (
            <span style={{ width: 14, height: 14, border: '2px solid #D1D5DB', borderTopColor: '#6B7280', borderRadius: '50%', animation: 'spin 1s linear infinite', display: 'inline-block' }} />
          ) : (
            open ? '▴' : '▾'
          )}
        </span>
      </button>

      {err && (
        <div className="px-5 pb-4 text-xs text-red-600">{err}</div>
      )}

      {open && solution && (
        <div className="border-t border-[#E5E7EB]">
          {/* Full solution code */}
          <div className="px-5 py-4 space-y-2">
            <p className="text-[10px] font-semibold text-[#9CA3AF] uppercase tracking-widest">Corrected Solution</p>
            <pre
              className="rounded-xl text-xs font-mono leading-relaxed overflow-x-auto p-4"
              style={{ background: '#1A202C', color: '#E2E8F0', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}
            >
              {solution.full_solution_code}
            </pre>
          </div>

          {/* Concept explanation */}
          {solution.concept_explanation && (
            <div className="px-5 pb-5 space-y-2 border-t border-[#E5E7EB] pt-4">
              <p className="text-[10px] font-semibold text-[#9CA3AF] uppercase tracking-widest">Why it matters</p>
              <p className="text-sm text-[#374151] leading-relaxed">{solution.concept_explanation}</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── Main panel ───────────────────────────────────────────────────────────────

export default function TechnicalExercisePanel({ exercise, sessionId, onContinue }: Props) {
  const [code,        setCode]        = useState(exercise.starter_code ?? '')
  const [explanation, setExplanation] = useState('')
  const [status,      setStatus]      = useState<'idle' | 'running' | 'grading' | 'graded'>('idle')
  const [testResults, setTestResults] = useState<TestResults | null>(null)
  const [grading,     setGrading]     = useState<GradingResult | null>(null)
  const [error,       setError]       = useState('')
  const [sqlCode,     setSqlCode]     = useState('')

  // Hint state
  const [hintsUsed,    setHintsUsed]    = useState(0)
  const [revealedHints, setRevealedHints] = useState<{ level: number; text: string }[]>([])
  const [hintLoading,  setHintLoading]  = useState(false)
  const [hintError,    setHintError]    = useState('')
  const [hasRunOnce,   setHasRunOnce]   = useState(false)

  // Hints-used count returned from the submit response
  const [submissionHintsUsed, setSubmissionHintsUsed] = useState<number | null>(null)

  const isSql = exercise.language === 'sql'
  const isText = exercise.language === 'text'
  const diffColors = DIFFICULTY_COLORS[exercise.difficulty] ?? DIFFICULTY_COLORS.medium

  const MAX_HINTS = 3

  async function getAuthHeader(): Promise<Record<string, string>> {
    const { data: { session } } = await createClient().auth.getSession()
    if (session?.access_token) return { Authorization: `Bearer ${session.access_token}` }
    return {}
  }

  const runTests = useCallback(async (precomputedResults?: TestResults, submittedCode?: string) => {
    setError('')
    setStatus('running')
    setHasRunOnce(true)
    const finalCode = submittedCode ?? (isSql ? sqlCode : code)
    let results = precomputedResults ?? null

    if (!precomputedResults && !isSql) {
      try {
        const hdrs = await getAuthHeader()
        const res = await fetch('/api/interview/submit-technical-answer', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...hdrs },
          body: JSON.stringify({
            session_id:            sessionId,
            exercise_id:           exercise.id,
            candidate_code:        finalCode,
            candidate_explanation: explanation || null,
          }),
        })
        const data = await res.json()
        if (!res.ok) { setError(data.error ?? 'Submission failed'); setStatus('idle'); return }
        setTestResults(data.test_results)
        setGrading(data.grading)
        setSubmissionHintsUsed(data.hints_used ?? null)
        setStatus('graded')
        return
      } catch {
        setError('Network error — please try again')
        setStatus('idle')
        return
      }
    }

    // SQL path: results were computed client-side
    if (results) {
      setTestResults(results)
      setStatus('grading')
      try {
        const hdrs = await getAuthHeader()
        const res = await fetch('/api/interview/submit-technical-answer', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...hdrs },
          body: JSON.stringify({
            session_id:            sessionId,
            exercise_id:           exercise.id,
            candidate_code:        finalCode,
            candidate_explanation: explanation || null,
          }),
        })
        const data = await res.json()
        if (!res.ok) { setError(data.error ?? 'Grading failed'); setStatus('idle'); return }
        setGrading(data.grading)
        setSubmissionHintsUsed(data.hints_used ?? null)
        setStatus('graded')
      } catch {
        setError('Network error during grading')
        setStatus('idle')
      }
    }
  }, [code, sqlCode, explanation, exercise.id, sessionId, isSql])

  async function requestHint() {
    if (hintsUsed >= MAX_HINTS || hintLoading) return
    setHintLoading(true)
    setHintError('')
    try {
      const hdrs = await getAuthHeader()
      const res = await fetch('/api/interview/request-hint', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...hdrs },
        body: JSON.stringify({
          session_id:        sessionId,
          exercise_id:       exercise.id,
          current_hint_level: hintsUsed,
        }),
      })
      const data = await res.json()
      if (!res.ok) { setHintError(data.error ?? 'Could not load hint'); return }
      setRevealedHints(prev => [...prev, { level: data.hint_level, text: data.hint_text }])
      setHintsUsed(prev => prev + 1)
    } catch {
      setHintError('Network error')
    } finally {
      setHintLoading(false)
    }
  }

  const visibleTests = exercise.test_cases.filter(tc => tc.visible)

  // ── Scorecard view (after grading) ──────────────────────────────────────

  if (status === 'graded' && grading) {
    return (
      <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6" style={{ fontFamily: 'Inter,sans-serif' }}>
        {/* Overall score */}
        <div className="bg-white border border-[#E5E7EB] rounded-2xl p-6 text-center shadow-sm">
          <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-3 text-3xl font-bold text-white"
            style={{ background: grading.overall_score >= 7 ? '#10B981' : grading.overall_score >= 5 ? '#F5A524' : '#EF4444' }}>
            {grading.overall_score}
          </div>
          <div className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold mb-3 ${grading.pass_fail === 'pass' ? 'bg-green-100 text-green-700' : grading.pass_fail === 'borderline' ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}`}>
            {grading.pass_fail === 'pass' ? '✓ Pass' : grading.pass_fail === 'borderline' ? '~ Borderline' : '✗ Fail'}
          </div>
          <h3 className="text-lg font-bold text-[#111827] mb-2">{exercise.title}</h3>
          <p className="text-sm text-[#6B7280] leading-relaxed max-w-lg mx-auto">{grading.summary_feedback}</p>

          {/* Hint disclosure */}
          {submissionHintsUsed !== null && submissionHintsUsed > 0 && (
            <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#FFF8EE] border border-[#FDE68A] text-xs text-[#92400E]">
              <span>💡</span>
              <span>Solved with {submissionHintsUsed} hint{submissionHintsUsed !== 1 ? 's' : ''}</span>
              {submissionHintsUsed >= 3 && <span>· max score capped at 6</span>}
              {submissionHintsUsed === 2 && <span>· max score capped at 7</span>}
              {submissionHintsUsed === 1 && <span>· max score capped at 9</span>}
            </div>
          )}
        </div>

        {/* Test results banner */}
        {testResults && (
          <div className={`rounded-xl px-4 py-3 flex items-center gap-3 text-sm ${testResults.passed === testResults.total_tests ? 'bg-[#ECFDF5] border border-[#A7F3D0]' : 'bg-[#FEF2F2] border border-[#FECACA]'}`}>
            <span className="font-bold text-lg">{testResults.passed}/{testResults.total_tests}</span>
            <span className={testResults.passed === testResults.total_tests ? 'text-[#065F46]' : 'text-[#991B1B]'}>tests passed</span>
          </div>
        )}

        {/* Dimension scores */}
        <div className="bg-white border border-[#E5E7EB] rounded-2xl p-5 shadow-sm space-y-3">
          <h4 className="text-sm font-semibold text-[#111827] mb-4">Score Breakdown</h4>
          <ScoreBar label="Correctness"    score={grading.correctness_score} />
          <ScoreBar label="Code Quality"   score={grading.code_quality_score} />
          <ScoreBar label="Efficiency"     score={grading.efficiency_score} />
          <ScoreBar label="Problem Solving" score={grading.problem_solving_score} />
          <ScoreBar label="Edge Cases"     score={grading.edge_case_score} />
        </div>

        {/* Strengths */}
        {grading.strengths.length > 0 && (
          <div className="bg-[#ECFDF5] border border-[#A7F3D0] rounded-2xl p-5">
            <h4 className="text-sm font-semibold text-[#065F46] mb-3">✓ Strengths</h4>
            <ul className="space-y-1.5">
              {grading.strengths.map((s, i) => (
                <li key={i} className="text-sm text-[#065F46] flex gap-2"><span>·</span>{s}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Issues */}
        {grading.line_notes.length > 0 && (
          <div className="bg-white border border-[#E5E7EB] rounded-2xl p-5 shadow-sm">
            <h4 className="text-sm font-semibold text-[#111827] mb-3">Issues Found</h4>
            <div className="space-y-3">
              {grading.line_notes.map((note, i) => (
                <div key={i} className="border-l-2 pl-3" style={{ borderColor: SEVERITY_COLORS[note.severity] }}>
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-[10px] font-bold uppercase tracking-wide" style={{ color: SEVERITY_COLORS[note.severity] }}>{note.severity}</span>
                  </div>
                  <p className="text-sm text-[#374151] font-medium">{note.issue}</p>
                  <p className="text-xs text-[#6B7280] mt-0.5">Fix: {note.suggestion}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Next steps */}
        <div className="bg-[#FFF8EE] border border-[#FDE68A] rounded-2xl p-5">
          <h4 className="text-sm font-semibold text-[#92400E] mb-2">Next Step</h4>
          <p className="text-sm text-[#92400E]">{grading.next_steps}</p>
        </div>

        {/* Full solution reveal — collapsed by default */}
        <FullSolutionPanel exerciseId={exercise.id} sessionId={sessionId} />

        {/* Continue */}
        <button
          onClick={onContinue}
          className="w-full py-3.5 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90"
          style={{ background: '#F5A524', boxShadow: '0 2px 8px rgba(245,165,36,.35)' }}>
          Continue to next round →
        </button>
      </div>
    )
  }

  // ── Active exercise view ────────────────────────────────────────────────

  return (
    <div className="flex-1 flex flex-col min-h-0 lg:flex-row" style={{ fontFamily: 'Inter,sans-serif' }}>
      {/* LEFT: Task description */}
      <div className="lg:w-[42%] flex-shrink-0 flex flex-col border-r border-[#E5E7EB] overflow-y-auto" style={{ maxHeight: '100%' }}>
        <div className="px-5 py-4 border-b border-[#E5E7EB] bg-white flex items-start justify-between gap-3">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-widest text-[#9CA3AF] mb-1 block">Technical Exercise</span>
            <h2 className="text-base font-bold text-[#111827] leading-snug">{exercise.title}</h2>
          </div>
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase flex-shrink-0"
            style={{ background: diffColors.bg, color: diffColors.text }}>
            {exercise.difficulty}
          </span>
        </div>

        <div className="flex-1 px-5 py-4 space-y-4 bg-[#FAFAFA]">
          <div className="prose prose-sm text-[#374151] max-w-none">
            {exercise.task_description.split('\n').map((line, i) => {
              if (line.startsWith('**') && line.endsWith('**'))
                return <p key={i} className="font-semibold text-[#111827]">{line.replace(/\*\*/g, '')}</p>
              if (line.startsWith('```')) return null
              if (line.startsWith('- ')) return <li key={i} className="text-sm text-[#374151] ml-3">{line.slice(2)}</li>
              if (line.trim() === '') return <div key={i} className="h-2" />
              return <p key={i} className="text-sm text-[#374151] leading-relaxed">{line}</p>
            })}
          </div>

          {visibleTests.length > 0 && (
            <div className="bg-white border border-[#E5E7EB] rounded-xl p-4">
              <p className="text-xs font-semibold text-[#9CA3AF] uppercase tracking-widest mb-3">Example Tests</p>
              <div className="space-y-2">
                {visibleTests.slice(0, 3).map((tc, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <span className="w-4 h-4 rounded-full bg-[#F3F4F6] text-[10px] flex items-center justify-center flex-shrink-0 mt-0.5 font-bold text-[#6B7280]">{i+1}</span>
                    <span className="text-xs text-[#374151]">{tc.name}</span>
                  </div>
                ))}
                {exercise.test_cases.filter(tc => !tc.visible).length > 0 && (
                  <p className="text-[10px] text-[#9CA3AF] mt-1">+{exercise.test_cases.filter(tc => !tc.visible).length} hidden tests</p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* RIGHT: Editor + controls */}
      <div className="flex-1 flex flex-col min-h-0 min-w-0">
        {/* Editor */}
        <div className="flex-1 min-h-0" style={{ background: '#1A202C' }}>
          {isSql ? (
            <SqlRunner
              exercise={exercise}
              onResults={(results, q) => { setSqlCode(q); runTests(results, q) }}
            />
          ) : isText ? (
            <textarea
              value={code}
              onChange={e => setCode(e.target.value)}
              className="w-full h-full min-h-[200px] font-mono text-xs text-[#E2E8F0] px-5 py-4 resize-none focus:outline-none"
              style={{ background: '#1A202C' }}
              placeholder="Write your revised prompt here..."
              spellCheck={false}
            />
          ) : (
            <MonacoEditor
              height="100%"
              language={exercise.language === 'javascript' ? 'javascript' : 'python'}
              value={code}
              onChange={v => setCode(v ?? '')}
              theme="vs-dark"
              options={{
                fontSize: 13,
                lineHeight: 21,
                fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
                minimap: { enabled: false },
                scrollBeyondLastLine: false,
                wordWrap: 'on',
                padding: { top: 16, bottom: 16 },
                renderLineHighlight: 'gutter',
              }}
            />
          )}
        </div>

        {/* Test results console */}
        {testResults && status !== 'graded' && (
          <div className="border-t border-[#2D3748] flex-shrink-0" style={{ background: '#0F1723', maxHeight: 160, overflowY: 'auto' }}>
            <div className="px-4 py-2 flex items-center gap-2 border-b border-[#2D3748]">
              <span className="text-[10px] font-mono text-[#718096] uppercase tracking-wide">Test Results</span>
              <span className="text-[10px] font-bold" style={{ color: testResults.passed === testResults.total_tests ? '#68D391' : '#FC8181' }}>
                {testResults.passed}/{testResults.total_tests} passed
              </span>
            </div>
            <div className="px-4 py-2 space-y-1">
              {testResults.details.map((d, i) => (
                <div key={i} className="flex items-start gap-2 text-[11px] font-mono">
                  <span style={{ color: d.status === 'pass' ? '#68D391' : '#FC8181' }}>{d.status === 'pass' ? '✓' : '✗'}</span>
                  <span className="text-[#E2E8F0]">{d.test_name}</span>
                  {d.error && <span className="text-[#FC8181] ml-1 truncate" title={d.error}>— {d.error.slice(0, 80)}</span>}
                </div>
              ))}
              {testResults.runtime_errors.map((e, i) => (
                <div key={`re${i}`} className="text-[11px] font-mono text-[#FC8181]">⚠ {e.slice(0, 120)}</div>
              ))}
            </div>
          </div>
        )}

        {/* Explanation */}
        {exercise.explanation_required && (
          <div className="flex-shrink-0 border-t border-[#E5E7EB] bg-white px-4 py-3">
            <label className="text-[11px] font-semibold text-[#6B7280] uppercase tracking-wide block mb-1.5">
              Explain your fix in one sentence
            </label>
            <textarea
              value={explanation}
              onChange={e => setExplanation(e.target.value)}
              rows={2}
              className="w-full resize-none bg-[#F8F9FB] border border-[#E5E7EB] rounded-lg px-3 py-2 text-sm text-[#111827] placeholder:text-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-[#F5A524]/20 focus:border-[#F5A524]"
              placeholder="e.g. I fixed the cosine similarity by dividing the dot product by the product of the magnitudes..."
            />
          </div>
        )}

        {/* Hints panel — revealed hints stack here */}
        {revealedHints.length > 0 && (
          <div className="flex-shrink-0 border-t border-[#E5E7EB] bg-[#FFFBEB] px-4 py-3 space-y-2">
            {revealedHints.map(h => (
              <div key={h.level} className="flex gap-2">
                <span className="text-[10px] font-bold text-[#D97706] mt-0.5 flex-shrink-0">H{h.level}</span>
                <p className="text-xs text-[#78350F] leading-relaxed">{h.text}</p>
              </div>
            ))}
            {hintError && <p className="text-xs text-red-600">{hintError}</p>}
          </div>
        )}

        {/* Controls */}
        <div className="flex-shrink-0 border-t border-[#E5E7EB] bg-white px-4 py-3 flex items-center gap-2">
          {/* Hint button */}
          {!isSql && (
            <button
              onClick={requestHint}
              disabled={!hasRunOnce || hintsUsed >= MAX_HINTS || hintLoading || status === 'running' || status === 'grading'}
              title={!hasRunOnce ? 'Run tests first to unlock hints' : hintsUsed >= MAX_HINTS ? 'All hints revealed' : 'Get next hint'}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium border border-[#E5E7EB] text-[#6B7280] hover:bg-[#FFF8EE] hover:border-[#FDE68A] hover:text-[#92400E] transition-all disabled:opacity-40 disabled:cursor-not-allowed flex-shrink-0"
            >
              {hintLoading ? (
                <span style={{ width: 10, height: 10, border: '1.5px solid #D1D5DB', borderTopColor: '#6B7280', borderRadius: '50%', animation: 'spin 1s linear infinite', display: 'inline-block' }} />
              ) : (
                <span>💡</span>
              )}
              <span>Hint {hintsUsed > 0 ? `(${hintsUsed}/${MAX_HINTS})` : ''}</span>
            </button>
          )}

          {error && <p className="text-xs text-red-600 flex-1">{error}</p>}
          {!error && <div className="flex-1" />}

          {!isSql && (
            <button
              onClick={() => runTests()}
              disabled={status === 'running' || status === 'grading'}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold disabled:opacity-50 transition-all"
              style={{ background: '#F5A524', color: '#17140F', boxShadow: '0 2px 6px rgba(245,165,36,.25)' }}>
              {(status === 'running' || status === 'grading') && (
                <span style={{ width: 12, height: 12, border: '2px solid rgba(0,0,0,.2)', borderTopColor: '#17140F', borderRadius: '50%', animation: 'spin 1s linear infinite', display: 'inline-block' }} />
              )}
              {status === 'idle' && '▶'}
              {status === 'idle' ? ' Run Tests' : status === 'running' ? ' Running tests...' : ' Grading...'}
            </button>
          )}
        </div>
      </div>

      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}
