'use client'
import { useState, useCallback, useEffect, useRef } from 'react'
import dynamic from 'next/dynamic'
import type { GradingResult } from '@/lib/claude/technical-grader'
import type { TestResults, TestDetail } from '@/lib/e2b/execute'
import { createClient } from '@/lib/supabase/client'

const MonacoEditor = dynamic(() => import('@monaco-editor/react'), { ssr: false, loading: () => (
  <div className="flex-1 flex items-center justify-center" style={{ background: '#1A202C' }}>
    <span style={{ color: '#718096', fontSize: 12 }}>Loading editor...</span>
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
  elapsed?: number
  onSkip?: () => void
  onDashboard?: () => void
}

const DIFF: Record<string, { bg: string; text: string }> = {
  easy:   { bg: '#ECFDF5', text: '#059669' },
  medium: { bg: '#FFF8EE', text: '#D98A0B' },
  hard:   { bg: '#FEF2F2', text: '#DC2626' },
}

const SEV: Record<string, string> = {
  minor: '#D98A0B', major: '#EA580C', critical: '#DC2626',
}

// ── ScoreBar ─────────────────────────────────────────────────────────────────

function ScoreBar({ label, score }: { label: string; score: number }) {
  return (
    <div className="space-y-1">
      <div className="flex justify-between items-center">
        <span style={{ fontSize: 12, color: '#6B7280' }}>{label}</span>
        <span style={{ fontSize: 12, fontWeight: 700, color: '#111827' }}>{score}/10</span>
      </div>
      <div style={{ height: 6, background: '#F3F4F6', borderRadius: 9999, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${score * 10}%`, background: score >= 7 ? '#10B981' : score >= 5 ? '#F5A524' : '#EF4444', borderRadius: 9999, transition: 'width .7s ease' }} />
      </div>
    </div>
  )
}

// ── FullSolutionPanel ─────────────────────────────────────────────────────────

interface SolutionData { full_solution_code: string; concept_explanation: string | null; language: string }

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
      const hdrs: Record<string, string> = session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}
      const res = await fetch(`/api/exercises/${exerciseId}/full-solution?session_id=${sessionId}`, { headers: hdrs })
      const data = await res.json()
      if (!res.ok) { setErr(data.error ?? 'Could not load solution'); setLoading(false); return }
      setSolution(data); setOpen(true)
    } catch { setErr('Network error') }
    finally { setLoading(false) }
  }

  return (
    <div style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 16, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,.06)' }}>
      <button onClick={load} disabled={loading} style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px', fontSize: 14, fontWeight: 600, color: '#374151', cursor: 'pointer', background: 'transparent', border: 'none', textAlign: 'left' }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}><span>📖</span><span>Show full corrected solution</span></span>
        <span style={{ color: '#9CA3AF' }}>
          {loading ? <span style={{ width: 14, height: 14, border: '2px solid #D1D5DB', borderTopColor: '#6B7280', borderRadius: '50%', animation: 'spin 1s linear infinite', display: 'inline-block' }} /> : (open ? '▴' : '▾')}
        </span>
      </button>
      {err && <div style={{ padding: '0 20px 14px', fontSize: 12, color: '#DC2626' }}>{err}</div>}
      {open && solution && (
        <div style={{ borderTop: '1px solid #E5E7EB' }}>
          <div style={{ padding: '16px 20px', gap: 8, display: 'flex', flexDirection: 'column' }}>
            <p style={{ fontSize: 10, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.08em', margin: 0 }}>Corrected Solution</p>
            <pre style={{ background: '#1A202C', color: '#E2E8F0', borderRadius: 12, padding: '14px 16px', fontSize: 12, fontFamily: "'JetBrains Mono','Fira Code',monospace", overflowX: 'auto', whiteSpace: 'pre-wrap', wordBreak: 'break-word', margin: 0 }}>{solution.full_solution_code}</pre>
          </div>
          {solution.concept_explanation && (
            <div style={{ padding: '14px 20px 18px', borderTop: '1px solid #E5E7EB', display: 'flex', flexDirection: 'column', gap: 6 }}>
              <p style={{ fontSize: 10, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.08em', margin: 0 }}>Why it matters</p>
              <p style={{ fontSize: 14, color: '#374151', lineHeight: 1.6, margin: 0 }}>{solution.concept_explanation}</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── ConsolePanel ──────────────────────────────────────────────────────────────

function TestRow({ d, isVisible }: { d: TestDetail; isVisible: boolean }) {
  const [expanded, setExpanded] = useState(false)

  const icon =
    d.status === 'pass'         ? '✓' :
    d.status === 'timeout'      ? '⏱' :
    d.status === 'runtime_error'? '⚠' :
    d.status === 'syntax_error' ? '⚠' : '✗'

  const iconColor =
    d.status === 'pass'         ? '#68D391' :
    d.status === 'timeout'      ? '#F6E05E' :
    d.status === 'runtime_error'? '#F6AD55' :
    d.status === 'syntax_error' ? '#A0AEC0' : '#FC8181'

  const hasDetail = d.status !== 'pass' && (d.error_message || d.error_type || d.stack_trace || d.line_number)
  const durationLabel = d.duration_ms !== undefined ? ` (${d.duration_ms < 1 ? '<1' : d.duration_ms}ms)` : ''

  const statusLabel =
    d.status === 'pass'         ? 'passed' :
    d.status === 'fail'         ? 'FAILED' :
    d.status === 'runtime_error'? `${d.error_type ?? 'RuntimeError'}` :
    d.status === 'syntax_error' ? 'syntax error' :
    d.status === 'timeout'      ? 'TIMEOUT' : d.status

  return (
    <div style={{ borderBottom: '1px solid #1A2535' }}>
      <div
        onClick={() => hasDetail && setExpanded(e => !e)}
        style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 14px', cursor: hasDetail ? 'pointer' : 'default', userSelect: 'none' }}
      >
        <span style={{ color: iconColor, fontFamily: 'monospace', fontSize: 11, flexShrink: 0 }}>{icon}</span>
        <span style={{ fontFamily: 'monospace', fontSize: 11, color: '#CBD5E1', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.test_name}</span>
        <span style={{ fontFamily: 'monospace', fontSize: 10, color: iconColor, flexShrink: 0 }}>{statusLabel}{durationLabel}</span>
        {hasDetail && (
          <span style={{ fontFamily: 'monospace', fontSize: 10, color: '#4A5568', flexShrink: 0 }}>{expanded ? '▴' : '▾'}</span>
        )}
      </div>

      {expanded && hasDetail && (
        <div style={{ padding: '6px 14px 10px 32px', background: '#06111F' }}>
          {d.error_type && d.error_type !== 'AssertionError' && (
            <div style={{ fontFamily: 'monospace', fontSize: 11, color: '#F6AD55', marginBottom: 4 }}>
              {d.error_type}: {d.error_message}
            </div>
          )}
          {d.error_type === 'AssertionError' && d.error_message && (
            <div style={{ fontFamily: 'monospace', fontSize: 11, color: '#FC8181', marginBottom: 4 }}>
              {d.error_message}
            </div>
          )}
          {!d.error_type && d.error_message && (
            <div style={{ fontFamily: 'monospace', fontSize: 11, color: '#FC8181', marginBottom: 4 }}>
              {d.error_message}
            </div>
          )}
          {d.line_number && (
            <div style={{ fontFamily: 'monospace', fontSize: 11, color: '#718096', marginBottom: 4 }}>
              at line {d.line_number}
            </div>
          )}
          {d.stack_trace && (
            <StackTrace trace={d.stack_trace} />
          )}
          {!isVisible && (
            <div style={{ fontFamily: 'monospace', fontSize: 10, color: '#4A5568', marginTop: 4, fontStyle: 'italic' }}>
              (hidden test — expected output not shown)
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function StackTrace({ trace }: { trace: string }) {
  const [open, setOpen] = useState(false)
  return (
    <div>
      <button onClick={() => setOpen(o => !o)} style={{ fontFamily: 'monospace', fontSize: 10, color: '#4A5568', background: 'none', border: 'none', cursor: 'pointer', padding: 0, marginBottom: 4 }}>
        {open ? '▴ hide trace' : '▾ show full trace'}
      </button>
      {open && (
        <pre style={{ fontFamily: 'monospace', fontSize: 10, color: '#718096', whiteSpace: 'pre-wrap', wordBreak: 'break-all', margin: 0, lineHeight: 1.5 }}>
          {trace.split('\n').filter(l => !l.includes('/harness.py') && !l.includes('_test_')).join('\n')}
        </pre>
      )}
    </div>
  )
}

function ConsolePanel({
  testResults, status, exercise
}: {
  testResults: TestResults | null
  status: 'idle' | 'running' | 'grading'
  exercise: Exercise
}) {
  const visibleSet = new Set(exercise.test_cases.filter(tc => tc.visible).map(tc => tc.name))

  return (
    <div style={{ background: '#0F1723', borderTop: '1px solid #2D3748', flexShrink: 0, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
      {/* Header */}
      <div style={{ padding: '7px 14px', display: 'flex', alignItems: 'center', gap: 10, borderBottom: '1px solid #2D3748', flexShrink: 0, background: '#0F1723', position: 'sticky', top: 0, zIndex: 1 }}>
        <span style={{ fontFamily: 'monospace', fontSize: 10, color: '#718096', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Console</span>
        {testResults && status === 'idle' && (
          <>
            <span style={{ fontFamily: 'monospace', fontSize: 10, color: '#4A5568' }}>·</span>
            <span style={{ fontFamily: 'monospace', fontSize: 11, fontWeight: 700, color: testResults.passed === testResults.total_tests ? '#68D391' : '#FC8181' }}>
              {testResults.passed}/{testResults.total_tests} tests passing
            </span>
            <span style={{ fontFamily: 'monospace', fontSize: 10, marginLeft: 'auto', color: testResults.overall_status === 'all_passed' ? '#68D391' : testResults.overall_status === 'syntax_error' ? '#A0AEC0' : testResults.overall_status === 'timeout' ? '#F6E05E' : testResults.overall_status === 'error' ? '#F6AD55' : '#FC8181' }}>
              {testResults.overall_status === 'all_passed' ? '✓ all passed' :
               testResults.overall_status === 'syntax_error' ? '⚠ syntax error' :
               testResults.overall_status === 'timeout' ? '⏱ timeout' :
               testResults.overall_status === 'error' ? '⚠ error' :
               testResults.overall_status === 'all_failed' ? '✗ all failed' : '✗ partial'}
            </span>
          </>
        )}
      </div>

      {/* Body */}
      <div style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
        {/* Idle placeholder */}
        {!testResults && status === 'idle' && (
          <div style={{ padding: '12px 14px' }}>
            <span style={{ fontFamily: 'monospace', fontSize: 11, color: '#4A5568' }}>▸ Run your code to see test results</span>
          </div>
        )}

        {/* Running / grading */}
        {(status === 'running' || status === 'grading') && (
          <div style={{ padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ width: 10, height: 10, border: '1.5px solid #2D3748', borderTopColor: '#718096', borderRadius: '50%', animation: 'spin 1s linear infinite', display: 'inline-block', flexShrink: 0 }} />
            <span style={{ fontFamily: 'monospace', fontSize: 11, color: '#718096' }}>{status === 'running' ? 'Running tests…' : 'Grading…'}</span>
          </div>
        )}

        {/* Syntax error — global */}
        {testResults?.overall_status === 'syntax_error' && testResults.syntax_error && (
          <div style={{ padding: '12px 14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <span style={{ fontFamily: 'monospace', fontSize: 12, color: '#A0AEC0', fontWeight: 700 }}>⚠ Syntax Error</span>
              {testResults.syntax_error.line && (
                <span style={{ fontFamily: 'monospace', fontSize: 11, color: '#718096' }}>Line {testResults.syntax_error.line}{testResults.syntax_error.col ? `, col ${testResults.syntax_error.col}` : ''}</span>
              )}
            </div>
            <div style={{ fontFamily: 'monospace', fontSize: 11, color: '#A0AEC0', marginBottom: 6 }}>{testResults.syntax_error.message}</div>
            {testResults.syntax_error.text && (
              <pre style={{ fontFamily: 'monospace', fontSize: 11, color: '#718096', background: '#06111F', padding: '8px 12px', borderRadius: 8, margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>{testResults.syntax_error.text}</pre>
            )}
          </div>
        )}

        {/* Test rows */}
        {testResults && testResults.overall_status !== 'syntax_error' && status === 'idle' && (
          <div>
            {testResults.details.map((d, i) => (
              <TestRow key={i} d={d} isVisible={visibleSet.has(d.test_name)} />
            ))}
            {testResults.runtime_errors.length > 0 && testResults.overall_status !== 'all_failed' && testResults.overall_status !== 'error' && testResults.runtime_errors.map((e, i) => (
              <div key={`re${i}`} style={{ padding: '5px 14px', borderBottom: '1px solid #1A2535' }}>
                <span style={{ fontFamily: 'monospace', fontSize: 11, color: '#F6AD55' }}>⚠ {e}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ── SqlRunner ─────────────────────────────────────────────────────────────────

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
          cols.forEach((c, i) => { obj[c] = row[i] })
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
          if (check.includes('row_count')) { const exp = parseInt(check.match(/==\s*(\d+)/)?.[1] ?? '0'); pass = rows.length === exp }
          else if (check.includes('event_count=')) {
            const nm = check.match(/name='(\w+)'/)
            const cm = check.match(/event_count=(\d+)/)
            if (nm && cm) { const r = rows.find(r => r['name'] === nm[1]); pass = r ? Number(r['event_count']) === parseInt(cm[1]) : false }
          }
          details.push({ test_name: tc.name, status: pass ? 'pass' : 'fail', error: pass ? undefined : `Check "${check}" failed.`, error_message: pass ? undefined : `Check "${check}" failed. Got ${rows.length} rows.` })
        } catch (e) {
          details.push({ test_name: tc.name, status: 'fail', error: String(e), error_message: String(e) })
        }
      }
      db.close()
      const passed = details.filter(d => d.status === 'pass').length
      onResults({ total_tests: details.length, passed, failed: details.length - passed, details, runtime_errors: [], overall_status: passed === details.length ? 'all_passed' : passed === 0 ? 'all_failed' : 'partial' }, query)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e))
    } finally { setRunning(false) }
  }, [query, exercise, onResults])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 16px', background: '#2D3748', borderBottom: '1px solid #3D4A5C', flexShrink: 0 }}>
        <span style={{ fontFamily: 'monospace', fontSize: 10, color: '#A0AEC0', textTransform: 'uppercase', letterSpacing: '0.08em' }}>SQL</span>
        <button onClick={runSql} disabled={running} style={{ fontSize: 12, fontWeight: 600, padding: '4px 12px', borderRadius: 6, background: '#38A169', color: 'white', border: 'none', cursor: running ? 'not-allowed' : 'pointer', opacity: running ? 0.6 : 1 }}>
          {running ? 'Running...' : '▶ Run Query'}
        </button>
      </div>
      <textarea
        value={query} onChange={e => setQuery(e.target.value)}
        style={{ flex: 1, fontFamily: "'JetBrains Mono','Fira Code',monospace", fontSize: 12, color: '#E2E8F0', padding: '12px 16px', resize: 'none', outline: 'none', background: '#1A202C', border: 'none', minHeight: 120 }}
        spellCheck={false}
      />
      {error && <div style={{ padding: '8px 16px', fontSize: 12, color: '#FC8181', background: 'rgba(220,38,38,.1)' }}>{error}</div>}
    </div>
  )
}

// ── TaskDescription renderer ──────────────────────────────────────────────────

function TaskDesc({ text }: { text: string }) {
  return (
    <div style={{ fontSize: 13, color: '#374151', lineHeight: 1.7 }}>
      {text.split('\n').map((line, i) => {
        if (line.startsWith('**') && line.endsWith('**')) return <p key={i} style={{ fontWeight: 700, color: '#111827', margin: '8px 0 4px' }}>{line.replace(/\*\*/g, '')}</p>
        if (line.startsWith('```')) return null
        if (line.startsWith('- ')) return <li key={i} style={{ marginLeft: 16, marginBottom: 2 }}>{line.slice(2)}</li>
        if (line.trim() === '') return <div key={i} style={{ height: 8 }} />
        return <p key={i} style={{ margin: '2px 0' }}>{line}</p>
      })}
    </div>
  )
}

// ── Scorecard ─────────────────────────────────────────────────────────────────

function Scorecard({ exercise, grading, testResults, submissionHintsUsed, onContinue }: {
  exercise: Exercise
  grading: GradingResult
  testResults: TestResults | null
  submissionHintsUsed: number | null
  onContinue: () => void
}) {
  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '24px', display: 'flex', flexDirection: 'column', gap: 20, fontFamily: 'Inter,sans-serif' }}>
      {/* Overall score */}
      <div style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 20, padding: '24px', textAlign: 'center', boxShadow: '0 1px 3px rgba(0,0,0,.06)' }}>
        <div style={{ width: 80, height: 80, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px', fontSize: 28, fontWeight: 700, color: 'white', background: grading.overall_score >= 7 ? '#10B981' : grading.overall_score >= 5 ? '#F5A524' : '#EF4444' }}>
          {grading.overall_score}
        </div>
        <div style={{ display: 'inline-flex', alignItems: 'center', padding: '4px 12px', borderRadius: 9999, fontSize: 12, fontWeight: 600, marginBottom: 12, background: grading.pass_fail === 'pass' ? '#ECFDF5' : grading.pass_fail === 'borderline' ? '#FFFBEB' : '#FEF2F2', color: grading.pass_fail === 'pass' ? '#059669' : grading.pass_fail === 'borderline' ? '#92400E' : '#DC2626' }}>
          {grading.pass_fail === 'pass' ? '✓ Pass' : grading.pass_fail === 'borderline' ? '~ Borderline' : '✗ Fail'}
        </div>
        <h3 style={{ fontSize: 18, fontWeight: 700, color: '#111827', margin: '0 0 8px' }}>{exercise.title}</h3>
        <p style={{ fontSize: 14, color: '#6B7280', lineHeight: 1.6, maxWidth: 480, margin: '0 auto' }}>{grading.summary_feedback}</p>
        {submissionHintsUsed !== null && submissionHintsUsed > 0 && (
          <div style={{ marginTop: 12, display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 12px', borderRadius: 9999, background: '#FFF8EE', border: '1px solid #FDE68A', fontSize: 12, color: '#92400E' }}>
            <span>💡</span>
            <span>Solved with {submissionHintsUsed} hint{submissionHintsUsed !== 1 ? 's' : ''}</span>
            {submissionHintsUsed >= 3 && <span>· max score capped at 6</span>}
            {submissionHintsUsed === 2 && <span>· max score capped at 7</span>}
            {submissionHintsUsed === 1 && <span>· max score capped at 9</span>}
          </div>
        )}
      </div>

      {/* Test banner */}
      {testResults && (
        <div style={{ borderRadius: 12, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12, fontSize: 14, background: testResults.passed === testResults.total_tests ? '#ECFDF5' : '#FEF2F2', border: `1px solid ${testResults.passed === testResults.total_tests ? '#A7F3D0' : '#FECACA'}` }}>
          <span style={{ fontWeight: 700, fontSize: 18 }}>{testResults.passed}/{testResults.total_tests}</span>
          <span style={{ color: testResults.passed === testResults.total_tests ? '#065F46' : '#991B1B' }}>tests passed</span>
        </div>
      )}

      {/* Scores */}
      <div style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 20, padding: '20px', boxShadow: '0 1px 3px rgba(0,0,0,.06)', display: 'flex', flexDirection: 'column', gap: 12 }}>
        <h4 style={{ fontSize: 14, fontWeight: 600, color: '#111827', margin: '0 0 4px' }}>Score Breakdown</h4>
        <ScoreBar label="Correctness" score={grading.correctness_score} />
        <ScoreBar label="Code Quality" score={grading.code_quality_score} />
        <ScoreBar label="Efficiency" score={grading.efficiency_score} />
        <ScoreBar label="Problem Solving" score={grading.problem_solving_score} />
        <ScoreBar label="Edge Cases" score={grading.edge_case_score} />
      </div>

      {/* Strengths */}
      {grading.strengths.length > 0 && (
        <div style={{ background: '#ECFDF5', border: '1px solid #A7F3D0', borderRadius: 20, padding: '20px' }}>
          <h4 style={{ fontSize: 14, fontWeight: 600, color: '#065F46', margin: '0 0 12px' }}>✓ Strengths</h4>
          <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 6 }}>
            {grading.strengths.map((s, i) => <li key={i} style={{ fontSize: 14, color: '#065F46', display: 'flex', gap: 8 }}><span>·</span>{s}</li>)}
          </ul>
        </div>
      )}

      {/* Issues */}
      {grading.line_notes.length > 0 && (
        <div style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 20, padding: '20px', boxShadow: '0 1px 3px rgba(0,0,0,.06)' }}>
          <h4 style={{ fontSize: 14, fontWeight: 600, color: '#111827', margin: '0 0 12px' }}>Issues Found</h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {grading.line_notes.map((note, i) => (
              <div key={i} style={{ borderLeft: `2px solid ${SEV[note.severity] ?? '#D98A0B'}`, paddingLeft: 12 }}>
                <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: SEV[note.severity] ?? '#D98A0B', marginBottom: 2 }}>{note.severity}</div>
                <p style={{ fontSize: 14, color: '#374151', fontWeight: 500, margin: '0 0 2px' }}>{note.issue}</p>
                <p style={{ fontSize: 12, color: '#6B7280', margin: 0 }}>Fix: {note.suggestion}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Next step */}
      <div style={{ background: '#FFF8EE', border: '1px solid #FDE68A', borderRadius: 20, padding: '20px' }}>
        <h4 style={{ fontSize: 14, fontWeight: 600, color: '#92400E', margin: '0 0 8px' }}>Next Step</h4>
        <p style={{ fontSize: 14, color: '#92400E', margin: 0 }}>{grading.next_steps}</p>
      </div>

      <FullSolutionPanel exerciseId={exercise.id} sessionId={''} />

      <button onClick={onContinue} style={{ width: '100%', padding: '14px', borderRadius: 14, fontSize: 14, fontWeight: 600, color: 'white', background: '#F5A524', border: 'none', cursor: 'pointer', boxShadow: '0 2px 8px rgba(245,165,36,.35)' }}>
        Continue to next round →
      </button>
    </div>
  )
}

// ── Main panel ────────────────────────────────────────────────────────────────

export default function TechnicalExercisePanel({ exercise, sessionId, onContinue, elapsed, onSkip, onDashboard }: Props) {
  const [code,        setCode]        = useState(exercise.starter_code ?? '')
  const [explanation, setExplanation] = useState('')
  const [status,      setStatus]      = useState<'idle' | 'running' | 'grading' | 'graded'>('idle')
  const [testResults, setTestResults] = useState<TestResults | null>(null)
  const [grading,     setGrading]     = useState<GradingResult | null>(null)
  const [error,       setError]       = useState('')
  const [sqlCode,     setSqlCode]     = useState('')
  const [hintsUsed,   setHintsUsed]   = useState(0)
  const [revealedHints, setRevealedHints] = useState<{ level: number; text: string }[]>([])
  const [hintLoading, setHintLoading] = useState(false)
  const [hintError,   setHintError]   = useState('')
  const [hasRunOnce,  setHasRunOnce]  = useState(false)
  const [submissionHintsUsed, setSubmissionHintsUsed] = useState<number | null>(null)
  const editorRef = useRef<HTMLDivElement>(null)

  const isSql  = exercise.language === 'sql'
  const isText = exercise.language === 'text'
  const diffColors = DIFF[exercise.difficulty] ?? DIFF.medium
  const MAX_HINTS = 3
  const visibleTests = exercise.test_cases.filter(tc => tc.visible)

  const mm  = elapsed !== undefined ? String(Math.floor(elapsed / 60)).padStart(2, '0') : '00'
  const ss_ = elapsed !== undefined ? String(elapsed % 60).padStart(2, '0') : '00'

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
    const results = precomputedResults ?? null

    if (!precomputedResults && !isSql) {
      try {
        const hdrs = await getAuthHeader()
        const res = await fetch('/api/interview/submit-technical-answer', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...hdrs },
          body: JSON.stringify({ session_id: sessionId, exercise_id: exercise.id, candidate_code: finalCode, candidate_explanation: explanation || null }),
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

    // SQL path
    if (results) {
      setTestResults(results)
      setStatus('grading')
      try {
        const hdrs = await getAuthHeader()
        const res = await fetch('/api/interview/submit-technical-answer', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...hdrs },
          body: JSON.stringify({ session_id: sessionId, exercise_id: exercise.id, candidate_code: finalCode, candidate_explanation: explanation || null }),
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
    setHintLoading(true); setHintError('')
    try {
      const hdrs = await getAuthHeader()
      const res = await fetch('/api/interview/request-hint', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...hdrs },
        body: JSON.stringify({ session_id: sessionId, exercise_id: exercise.id, current_hint_level: hintsUsed }),
      })
      const data = await res.json()
      if (!res.ok) { setHintError(data.error ?? 'Could not load hint'); return }
      setRevealedHints(prev => [...prev, { level: data.hint_level, text: data.hint_text }])
      setHintsUsed(prev => prev + 1)
    } catch { setHintError('Network error') }
    finally { setHintLoading(false) }
  }

  // ── Scorecard ────────────────────────────────────────────────────────────

  if (status === 'graded' && grading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%', fontFamily: 'Inter,sans-serif' }}>
        {/* Keep top bar even on scorecard */}
        {(onSkip || onDashboard || elapsed !== undefined) && (
          <div style={{ height: 44, background: '#fff', borderBottom: '1px solid #E5E7EB', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 20px', flexShrink: 0, boxShadow: '0 1px 3px rgba(0,0,0,.05)', zIndex: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: '#111827' }}>AI Interviewer</span>
              <span style={{ fontSize: 12, color: '#9CA3AF' }}>·</span>
              <span style={{ fontSize: 12, color: '#6B7280' }}>Applied AI Engineer</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {elapsed !== undefined && <span style={{ fontFamily: 'monospace', fontSize: 13, color: '#6B7280' }}>{mm}:{ss_}</span>}
              {onDashboard && (
                <button onClick={() => { if (confirm('Exit? Progress saved.')) onDashboard() }} style={{ fontSize: 12, color: '#9CA3AF', background: 'none', border: 'none', cursor: 'pointer', padding: '4px 8px' }}>← Dashboard</button>
              )}
            </div>
          </div>
        )}
        <Scorecard exercise={exercise} grading={grading} testResults={testResults} submissionHintsUsed={submissionHintsUsed} onContinue={onContinue} />
      </div>
    )
  }

  // ── Active exercise view ─────────────────────────────────────────────────

  const hintsLeft = MAX_HINTS - hintsUsed
  const scoreCap  = hintsUsed === 0 ? null : hintsUsed === 1 ? 9 : hintsUsed === 2 ? 7 : 6
  const hintDisabled = !hasRunOnce || hintsUsed >= MAX_HINTS || hintLoading || status === 'running' || status === 'grading'
  const hintTooltip  = !hasRunOnce ? 'Try running your code first — hints unlock after your first attempt' : hintsUsed >= MAX_HINTS ? 'No more hints available' : `Get hint ${hintsUsed + 1} of ${MAX_HINTS} — max score becomes ${hintsUsed === 0 ? 9 : hintsUsed === 1 ? 7 : 6}`

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', fontFamily: 'Inter,sans-serif', background: '#F8F9FB' }}>

      {/* ── Mobile notice (hidden on sm+) ──────────────────────────────────── */}
      <div className="sm:hidden" style={{ background: '#FFF8EE', borderBottom: '1px solid #FDE68A', padding: '10px 16px', flexShrink: 0 }}>
        <p style={{ fontSize: 13, color: '#92400E', margin: 0 }}>
          <strong>Coding exercises are best on desktop.</strong> You can still read the task and results here, but the code editor works best with a keyboard.
        </p>
      </div>

      {/* ── Top bar ─────────────────────────────────────────────────────────── */}
      <div style={{ height: 44, background: '#fff', borderBottom: '1px solid #E5E7EB', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 20px', flexShrink: 0, boxShadow: '0 1px 3px rgba(0,0,0,.05)', zIndex: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#4ADE80', boxShadow: '0 0 0 3px rgba(74,222,128,.2)', display: 'inline-block', flexShrink: 0 }} />
          <span style={{ fontSize: 13, fontWeight: 600, color: '#111827' }}>AI Interviewer</span>
          <span style={{ fontSize: 12, color: '#9CA3AF' }}>·</span>
          <span style={{ fontSize: 12, color: '#6B7280' }}>Applied AI Engineer</span>
          <span style={{ fontSize: 12, color: '#9CA3AF' }}>·</span>
          <span style={{ fontSize: 12, color: '#6B7280', fontWeight: 500 }}>{exercise.title}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {elapsed !== undefined && <span style={{ fontFamily: 'monospace', fontSize: 13, color: '#6B7280' }}>{mm}:{ss_}</span>}
          {onSkip && (
            <button onClick={onSkip} style={{ fontSize: 12, color: '#6B7280', background: 'none', border: '1px solid #E5E7EB', borderRadius: 8, cursor: 'pointer', padding: '4px 10px' }}>
              Skip →
            </button>
          )}
          {onDashboard && (
            <button onClick={() => { if (confirm('Exit? Progress saved.')) onDashboard() }} style={{ fontSize: 12, color: '#9CA3AF', background: 'none', border: 'none', cursor: 'pointer', padding: '4px 8px' }}>
              ← Dashboard
            </button>
          )}
        </div>
      </div>

      {/* ── Two-pane content ─────────────────────────────────────────────────── */}
      <div style={{ flex: 1, display: 'flex', minHeight: 0 }}>

        {/* LEFT: Task pane (35%) */}
        <div style={{ width: '35%', flexShrink: 0, display: 'flex', flexDirection: 'column', borderRight: '1px solid #E5E7EB', background: '#fff', minHeight: 0 }}>
          {/* Header */}
          <div style={{ padding: '14px 18px', borderBottom: '1px solid #F3F4F6', flexShrink: 0 }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
              <div>
                <p style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#9CA3AF', margin: '0 0 4px' }}>Technical Exercise</p>
                <h2 style={{ fontSize: 15, fontWeight: 700, color: '#111827', margin: 0, lineHeight: 1.4 }}>{exercise.title}</h2>
              </div>
              <span style={{ padding: '2px 8px', borderRadius: 9999, fontSize: 10, fontWeight: 700, textTransform: 'uppercase', flexShrink: 0, marginTop: 2, background: diffColors.bg, color: diffColors.text }}>{exercise.difficulty}</span>
            </div>
          </div>

          {/* Scrollable body */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 16 }}>
            <TaskDesc text={exercise.task_description} />

            {visibleTests.length > 0 && (
              <div style={{ background: '#F9FAFB', border: '1px solid #E5E7EB', borderRadius: 12, padding: '14px 16px' }}>
                <p style={{ fontSize: 10, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 10px' }}>Example Tests</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {visibleTests.slice(0, 3).map((tc, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                      <span style={{ width: 18, height: 18, borderRadius: '50%', background: '#F3F4F6', fontSize: 10, fontWeight: 700, color: '#6B7280', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 }}>{i + 1}</span>
                      <span style={{ fontSize: 12, color: '#374151' }}>{tc.name}</span>
                    </div>
                  ))}
                  {exercise.test_cases.filter(tc => !tc.visible).length > 0 && (
                    <p style={{ fontSize: 11, color: '#9CA3AF', margin: '4px 0 0' }}>+{exercise.test_cases.filter(tc => !tc.visible).length} hidden tests</p>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT: Workspace pane (65%) */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, minHeight: 0 }}>

          {/* Editor area */}
          <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }} ref={editorRef}>
            {isSql ? (
              <SqlRunner exercise={exercise} onResults={(results, q) => { setSqlCode(q); runTests(results, q) }} />
            ) : isText ? (
              <textarea
                value={code} onChange={e => setCode(e.target.value)}
                style={{ flex: 1, fontFamily: "'JetBrains Mono','Fira Code',monospace", fontSize: 12, color: '#E2E8F0', padding: '16px 20px', resize: 'none', outline: 'none', background: '#1A202C', border: 'none', minHeight: 200 }}
                placeholder="Write your revised prompt here..." spellCheck={false}
              />
            ) : (
              <MonacoEditor
                height="100%"
                language={exercise.language === 'javascript' ? 'javascript' : 'python'}
                value={code}
                onChange={v => setCode(v ?? '')}
                theme="vs-dark"
                options={{ fontSize: 13, lineHeight: 21, fontFamily: "'JetBrains Mono','Fira Code',monospace", minimap: { enabled: false }, scrollBeyondLastLine: false, wordWrap: 'on', padding: { top: 16, bottom: 16 }, renderLineHighlight: 'gutter' }}
              />
            )}
          </div>

          {/* Console panel — always visible, flexible height */}
          {status !== 'graded' && (
            <div style={{ flexShrink: 0, maxHeight: 220, minHeight: 80, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
              <ConsolePanel testResults={testResults} status={status as 'idle' | 'running' | 'grading'} exercise={exercise} />
            </div>
          )}

          {/* Explanation */}
          {exercise.explanation_required && (
            <div style={{ flexShrink: 0, borderTop: '1px solid #E5E7EB', background: '#fff', padding: '10px 16px' }}>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>Explain your fix in one sentence</label>
              <textarea
                value={explanation} onChange={e => setExplanation(e.target.value)} rows={2}
                style={{ width: '100%', resize: 'none', background: '#F8F9FB', border: '1px solid #E5E7EB', borderRadius: 10, padding: '8px 12px', fontSize: 13, color: '#111827', outline: 'none', boxSizing: 'border-box' }}
                placeholder="e.g. I fixed the cosine similarity by dividing the dot product by the product of the magnitudes..."
              />
            </div>
          )}

          {/* Hints strip */}
          {revealedHints.length > 0 && (
            <div style={{ flexShrink: 0, borderTop: '1px solid #E5E7EB', background: '#FFFBEB', padding: '10px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
              {revealedHints.map(h => (
                <div key={h.level} style={{ display: 'flex', gap: 8 }}>
                  <span style={{ fontSize: 10, fontWeight: 700, color: '#D97706', marginTop: 2, flexShrink: 0 }}>H{h.level}</span>
                  <p style={{ fontSize: 12, color: '#78350F', lineHeight: 1.6, margin: 0 }}>{h.text}</p>
                </div>
              ))}
              {hintError && <p style={{ fontSize: 12, color: '#DC2626', margin: 0 }}>{hintError}</p>}
            </div>
          )}

          {/* Action bar */}
          <div style={{ flexShrink: 0, borderTop: '1px solid #E5E7EB', background: '#fff', padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 8 }}>
            {/* Hint button */}
            {!isSql && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2, flexShrink: 0 }}>
                <button
                  onClick={requestHint}
                  disabled={hintDisabled}
                  title={hintTooltip}
                  style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 8, fontSize: 12, fontWeight: 500, background: '#F9FAFB', border: '1px solid #E5E7EB', color: '#6B7280', cursor: hintDisabled ? 'not-allowed' : 'pointer', opacity: hintDisabled ? 0.4 : 1, transition: 'all .2s' }}
                >
                  {hintLoading ? (
                    <span style={{ width: 10, height: 10, border: '1.5px solid #D1D5DB', borderTopColor: '#6B7280', borderRadius: '50%', animation: 'spin 1s linear infinite', display: 'inline-block' }} />
                  ) : '💡'}
                  {hintsUsed >= MAX_HINTS ? 'No more hints' : hintsUsed === 0 ? 'Get a hint' : `Get another hint (${hintsLeft} left)`}
                </button>
                {scoreCap !== null && <p style={{ fontSize: 9, color: '#D97706', textAlign: 'center', margin: 0 }}>max score capped at {scoreCap}</p>}
              </div>
            )}

            {error && <p style={{ fontSize: 12, color: '#DC2626', flex: 1 }}>{error}</p>}
            {!error && <div style={{ flex: 1 }} />}

            {!isSql && (
              <button
                onClick={() => runTests()}
                disabled={status === 'running' || status === 'grading'}
                style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 20px', borderRadius: 12, fontSize: 14, fontWeight: 600, background: '#F5A524', color: '#17140F', border: 'none', cursor: status === 'running' || status === 'grading' ? 'not-allowed' : 'pointer', opacity: status === 'running' || status === 'grading' ? 0.7 : 1, boxShadow: '0 2px 6px rgba(245,165,36,.3)' }}
              >
                {(status === 'running' || status === 'grading') && (
                  <span style={{ width: 12, height: 12, border: '2px solid rgba(0,0,0,.15)', borderTopColor: '#17140F', borderRadius: '50%', animation: 'spin 1s linear infinite', display: 'inline-block' }} />
                )}
                {status === 'idle' ? '▶ Run & Submit' : status === 'running' ? 'Running tests…' : 'Grading…'}
              </button>
            )}
          </div>
        </div>
      </div>

      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}
