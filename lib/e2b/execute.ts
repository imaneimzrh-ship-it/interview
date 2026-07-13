import { Sandbox } from 'e2b'

export interface TestCase {
  name: string
  function?: string
  setup?: string
  call?: string
  expected?: string
  expected_text?: string
  expected_first_text?: string
  check?: string
  rule?: string
  query_check?: string
  seed_sql?: string
  visible: boolean
}

export interface TestDetail {
  test_name: string
  status: 'pass' | 'fail' | 'runtime_error' | 'syntax_error' | 'timeout'
  duration_ms?: number
  error?: string           // legacy compat (error_type: error_message)
  error_type?: string      // e.g. "IndexError"
  error_message?: string   // human-readable message
  line_number?: number     // user's own code line, if extractable
  stack_trace?: string     // full trace, collapsible in UI
}

export interface TestResults {
  total_tests: number
  passed: number
  failed: number
  details: TestDetail[]
  runtime_errors: string[]
  syntax_error?: { message: string; line?: number; col?: number; text?: string | null }
  overall_status: 'all_passed' | 'partial' | 'all_failed' | 'syntax_error' | 'timeout' | 'error'
}

// ── Python harness builder ───────────────────────────────────────────────────

function buildPythonHarness(testCases: TestCase[]): string {
  const testFuncs = testCases.map((tc, idx) => {
    const setup = (tc.setup ?? '').split('\n').map(l => `    ${l}`).join('\n')
    let assertion = ''

    if (tc.expected_text) {
      assertion = `
    result = ${tc.call}
    expected = ${JSON.stringify(tc.expected_text)}
    assert result[0]['text'] == expected, f"Expected {repr(expected)}, got {repr(result[0]['text'] if result else None)}"
`
    } else if (tc.expected_first_text) {
      assertion = `
    result = ${tc.call}
    expected = ${JSON.stringify(tc.expected_first_text)}
    assert result[0]['text'] == expected, f"Expected {repr(expected)}, got {repr(result[0]['text'] if result else None)}"
`
    } else if (tc.expected !== undefined) {
      assertion = `
    import json as _json
    result = ${tc.call}
    _exp_raw = ${JSON.stringify(tc.expected)}
    try:
        expected = _json.loads(_exp_raw) if isinstance(_exp_raw, str) and _exp_raw.strip().startswith(('[','{')) else eval(_exp_raw)
    except Exception:
        expected = eval(_exp_raw)
    assert result == expected, f"Expected {repr(expected)}, got {repr(result)}"
`
    } else if (tc.check) {
      const checkStr = tc.check.replace(/`/g, "'")
      assertion = `
    result = ${tc.call}
    assert ${checkStr}, f"Check failed: ${checkStr.replace(/"/g, "'")}"
`
    } else if (tc.call) {
      assertion = `
    result = ${tc.call}
`
    }

    return `
def _test_${idx}():
${setup}
${assertion}
`.trimEnd()
  })

  const runners = testCases.map((tc, idx) => `
_t0 = _time.time()
try:
    _test_${idx}()
    _results.append({
        "name": ${JSON.stringify(tc.name)},
        "status": "pass",
        "duration_ms": round((_time.time()-_t0)*1000, 1)
    })
except AssertionError as _e:
    _results.append({
        "name": ${JSON.stringify(tc.name)},
        "status": "fail",
        "duration_ms": round((_time.time()-_t0)*1000, 1),
        "error_type": "AssertionError",
        "message": str(_e)
    })
except Exception as _e:
    _tb_list = _tb_mod.extract_tb(_e.__traceback__)
    _user_frames = [f for f in _tb_list if f.filename in ("/candidate.py", "<candidate>")]
    _line = _user_frames[-1].lineno if _user_frames else None
    _results.append({
        "name": ${JSON.stringify(tc.name)},
        "status": "runtime_error",
        "duration_ms": round((_time.time()-_t0)*1000, 1),
        "error_type": type(_e).__name__,
        "message": str(_e),
        "line_number": _line,
        "stack_trace": _tb_mod.format_exc()
    })
`).join('\n')

  return `import ast as _ast, json as _json, sys as _sys, time as _time, traceback as _tb_mod

# ── 1. Syntax pre-check ──────────────────────────────────────────────────────
try:
    with open("/candidate.py") as _f:
        _src = _f.read()
    _ast.parse(_src)
except SyntaxError as _e:
    print(_json.dumps({
        "__sonne": "syntax_error",
        "message": str(_e.msg),
        "line": _e.lineno,
        "col": _e.offset,
        "text": _e.text
    }))
    _sys.exit(0)

# ── 2. Execute candidate code ────────────────────────────────────────────────
try:
    exec(compile(_src, "/candidate.py", "exec"), globals())
except Exception as _e:
    _tb_list = _tb_mod.extract_tb(_e.__traceback__)
    _user = [f for f in _tb_list if f.filename == "/candidate.py"]
    _line = _user[-1].lineno if _user else None
    print(_json.dumps({
        "__sonne": "exec_error",
        "error_type": type(_e).__name__,
        "message": str(_e),
        "line": _line,
        "stack_trace": _tb_mod.format_exc()
    }))
    _sys.exit(0)

# ── 3. Test functions ────────────────────────────────────────────────────────
${testFuncs.join('\n')}

# ── 4. Runners ───────────────────────────────────────────────────────────────
_results = []
${runners}

print(_json.dumps({"__sonne": "results", "tests": _results}))
`
}

// ── Text/prompt harness (client-side, unchanged) ─────────────────────────────

function buildTextPromptHarness(candidateText: string, testCases: TestCase[]): TestResults {
  const details: TestDetail[] = []
  const lower = candidateText.toLowerCase()

  for (const tc of testCases) {
    if (!tc.rule) {
      details.push({ test_name: tc.name, status: 'pass' })
      continue
    }
    const rule = tc.rule
    try {
      if (rule.startsWith('len(')) {
        const match = rule.match(/len\(answer\.split\(\)\)\s*<=\s*(\d+)/)
        if (match) {
          const wordCount = candidateText.trim().split(/\s+/).length
          const limit = parseInt(match[1])
          const pass = wordCount <= limit
          details.push({ test_name: tc.name, status: pass ? 'pass' : 'fail', error: pass ? undefined : `Word count ${wordCount} exceeds ${limit}`, error_message: pass ? undefined : `Word count ${wordCount} exceeds ${limit}` })
          continue
        }
      }
      if (rule.includes('any phrase from:')) {
        const phraseMatch = rule.match(/\[(.*?)\]/)
        if (phraseMatch) {
          const phrases = phraseMatch[1].split(',').map(p => p.trim().replace(/^["']|["']$/g, ''))
          const found = phrases.some(p => lower.includes(p.toLowerCase()))
          details.push({ test_name: tc.name, status: found ? 'pass' : 'fail', error: found ? undefined : `None of [${phrases.join(', ')}] found`, error_message: found ? undefined : `None of [${phrases.join(', ')}] found` })
          continue
        }
      }
      if (rule.includes('none of:')) {
        const phraseMatch = rule.match(/\[(.*?)\]/)
        if (phraseMatch) {
          const phrases = phraseMatch[1].split(',').map(p => p.trim().replace(/^["']|["']$/g, ''))
          const found = phrases.find(p => lower.includes(p.toLowerCase()))
          details.push({ test_name: tc.name, status: found ? 'fail' : 'pass', error: found ? `Disallowed phrase "${found}" found` : undefined, error_message: found ? `Disallowed phrase "${found}" found` : undefined })
          continue
        }
      }
      details.push({ test_name: tc.name, status: 'pass' })
    } catch {
      details.push({ test_name: tc.name, status: 'fail', error: 'Rule evaluation error', error_message: 'Rule evaluation error' })
    }
  }

  const passed = details.filter(d => d.status === 'pass').length
  return {
    total_tests: details.length, passed, failed: details.length - passed,
    details, runtime_errors: [],
    overall_status: passed === details.length ? 'all_passed' : passed === 0 ? 'all_failed' : 'partial'
  }
}

// ── Main executor ────────────────────────────────────────────────────────────

export async function executeSubmission(
  candidateCode: string,
  testCases: TestCase[],
  language: 'python' | 'javascript' | 'text' | 'sql'
): Promise<TestResults> {
  if (language === 'text') return buildTextPromptHarness(candidateCode, testCases)

  if (language === 'sql') {
    return {
      total_tests: testCases.length, passed: 0, failed: 0,
      details: testCases.map(tc => ({ test_name: tc.name, status: 'pass' as const })),
      runtime_errors: ['SQL exercises are graded client-side'],
      overall_status: 'all_passed',
    }
  }

  const apiKey = process.env.E2B_API_KEY
  if (!apiKey) {
    console.error('[E2B] E2B_API_KEY not set')
    return {
      total_tests: testCases.length, passed: 0, failed: testCases.length,
      details: testCases.map(tc => ({ test_name: tc.name, status: 'fail' as const, error: 'Sandbox unavailable', error_message: 'Sandbox unavailable' })),
      runtime_errors: ['E2B_API_KEY not configured'],
      overall_status: 'error',
    }
  }

  let sandbox: Sandbox | null = null
  try {
    sandbox = await Sandbox.create({ apiKey, timeoutMs: 15_000 })

    if (language !== 'python') {
      return {
        total_tests: testCases.length, passed: 0, failed: testCases.length,
        details: testCases.map(tc => ({ test_name: tc.name, status: 'fail' as const, error: 'Language not supported' })),
        runtime_errors: ['Only Python is supported in the sandbox'],
        overall_status: 'error',
      }
    }

    // Write candidate code and harness as separate files
    await sandbox.files.write('/candidate.py', candidateCode)
    await sandbox.files.write('/harness.py', buildPythonHarness(testCases))

    let timedOut = false
    const result = await sandbox.commands.run('python3 /harness.py', { timeoutMs: 10_000 })
      .catch((err: unknown) => {
        const msg = err instanceof Error ? err.message : String(err)
        if (msg.toLowerCase().includes('timeout')) timedOut = true
        return { stdout: '', stderr: msg }
      })

    if (timedOut) {
      return {
        total_tests: testCases.length, passed: 0, failed: testCases.length,
        details: testCases.map(tc => ({ test_name: tc.name, status: 'timeout' as const, error: 'Exceeded 10s time limit', error_message: 'Exceeded 10s time limit' })),
        runtime_errors: [],
        overall_status: 'timeout',
      }
    }

    const stdout = result.stdout.trim()
    const stderr = result.stderr?.trim() ?? ''

    // Parse structured output from harness
    let parsed: Record<string, unknown> | null = null
    try {
      const jsonStart = stdout.lastIndexOf('{')
      if (jsonStart >= 0) parsed = JSON.parse(stdout.slice(jsonStart))
    } catch { /* ignore */ }

    if (!parsed) {
      return {
        total_tests: testCases.length, passed: 0, failed: testCases.length,
        details: testCases.map(tc => ({ test_name: tc.name, status: 'fail' as const, error: 'Parse error', error_message: 'Failed to parse test output' })),
        runtime_errors: [stderr || stdout].filter(Boolean),
        overall_status: 'error',
      }
    }

    const type_ = parsed.__sonne

    // Syntax error
    if (type_ === 'syntax_error') {
      const synErr = { message: String(parsed.message ?? ''), line: parsed.line as number | undefined, col: parsed.col as number | undefined, text: parsed.text as string | undefined }
      return {
        total_tests: testCases.length, passed: 0, failed: testCases.length,
        details: testCases.map(tc => ({ test_name: tc.name, status: 'syntax_error' as const, error: synErr.message, error_message: synErr.message })),
        runtime_errors: [],
        syntax_error: synErr,
        overall_status: 'syntax_error',
      }
    }

    // Module-level exec error
    if (type_ === 'exec_error') {
      const msg = `${parsed.error_type}: ${parsed.message}`
      return {
        total_tests: testCases.length, passed: 0, failed: testCases.length,
        details: testCases.map(tc => ({
          test_name: tc.name,
          status: 'runtime_error' as const,
          error: msg,
          error_type: parsed!.error_type as string | undefined,
          error_message: parsed!.message as string | undefined,
          line_number: parsed!.line as number | undefined,
          stack_trace: parsed!.stack_trace as string | undefined,
        })),
        runtime_errors: [msg],
        overall_status: 'all_failed',
      }
    }

    // Normal test results
    if (type_ === 'results') {
      const rawTests = (parsed.tests as Array<Record<string, unknown>>) ?? []
      const details: TestDetail[] = rawTests.map(r => {
        const status = r.status as string
        const normalizedStatus: TestDetail['status'] =
          status === 'pass' ? 'pass' :
          status === 'runtime_error' ? 'runtime_error' :
          'fail'
        const errMsg = r.message as string | undefined
        const errType = r.error_type as string | undefined
        return {
          test_name: r.name as string,
          status: normalizedStatus,
          duration_ms: r.duration_ms as number | undefined,
          error: errType && errMsg ? `${errType}: ${errMsg}` : errMsg,
          error_type: errType,
          error_message: errMsg,
          line_number: r.line_number as number | undefined,
          stack_trace: r.stack_trace as string | undefined,
        }
      })

      const passed = details.filter(d => d.status === 'pass').length
      const overallStatus: TestResults['overall_status'] =
        passed === details.length ? 'all_passed' :
        passed === 0 ? 'all_failed' : 'partial'

      return {
        total_tests: details.length, passed, failed: details.length - passed,
        details,
        runtime_errors: stderr ? [stderr] : [],
        overall_status: overallStatus,
      }
    }

    // Fallback
    return {
      total_tests: testCases.length, passed: 0, failed: testCases.length,
      details: testCases.map(tc => ({ test_name: tc.name, status: 'fail' as const, error: 'Unexpected output', error_message: 'Unexpected harness output' })),
      runtime_errors: [stdout.slice(0, 300)],
      overall_status: 'error',
    }

  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[E2B] Sandbox error:', msg)
    return {
      total_tests: testCases.length, passed: 0, failed: testCases.length,
      details: testCases.map(tc => ({ test_name: tc.name, status: 'fail' as const, error: 'Sandbox error', error_message: msg.slice(0, 200) })),
      runtime_errors: [msg.slice(0, 300)],
      overall_status: 'error',
    }
  } finally {
    if (sandbox) { try { await sandbox.kill() } catch { /* ignore */ } }
  }
}
