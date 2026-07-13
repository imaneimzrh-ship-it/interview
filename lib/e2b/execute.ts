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

export interface TestResults {
  total_tests: number
  passed: number
  failed: number
  details: { test_name: string; status: 'pass' | 'fail'; error?: string }[]
  runtime_errors: string[]
}

function buildPythonHarness(candidateCode: string, testCases: TestCase[]): string {
  const tests = testCases.map((tc, idx) => {
    const setup = tc.setup ? `    ${tc.setup}` : ''
    let assertion = ''

    if (tc.expected_text) {
      assertion = `
    result = ${tc.call}
    assert result[0]['text'] == ${JSON.stringify(tc.expected_text)}, f"Expected text '${tc.expected_text}', got {result[0]['text'] if result else 'empty'}"
`
    } else if (tc.expected_first_text) {
      assertion = `
    result = ${tc.call}
    assert result[0]['text'] == ${JSON.stringify(tc.expected_first_text)}, f"Expected first text '${tc.expected_first_text}', got {result[0]['text'] if result else 'empty'}"
`
    } else if (tc.expected) {
      assertion = `
    import json as _json
    result = ${tc.call}
    expected = _json.loads(${JSON.stringify(tc.expected)}) if isinstance(${JSON.stringify(tc.expected)}, str) and ${JSON.stringify(tc.expected)}.startswith(('[','{')) else eval(${JSON.stringify(tc.expected)})
    assert result == expected, f"Expected {expected}, got {result}"
`
    } else if (tc.check) {
      assertion = `
    result = ${tc.call}
    assert ${tc.check.replace(/result/g, 'result')}, f"Check failed: ${tc.check.replace(/`/g, "'")}"
`
    }

    return `
def run_test_${idx}():
    import json
${setup}
${assertion}
`
  })

  const runners = testCases.map((tc, idx) => `
try:
    run_test_${idx}()
    results.append({"name": ${JSON.stringify(tc.name)}, "status": "pass"})
except AssertionError as e:
    results.append({"name": ${JSON.stringify(tc.name)}, "status": "fail", "error": str(e)})
except Exception as e:
    results.append({"name": ${JSON.stringify(tc.name)}, "status": "fail", "error": f"{type(e).__name__}: {e}"})
`).join('\n')

  return `
import json
import sys

${candidateCode}

${tests.join('\n')}

results = []
${runners}

print(json.dumps(results))
`
}

function buildTextPromptHarness(candidateText: string, testCases: TestCase[]): TestResults {
  const details: TestResults['details'] = []
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
          details.push({ test_name: tc.name, status: wordCount <= limit ? 'pass' : 'fail', error: wordCount > limit ? `Word count ${wordCount} exceeds ${limit}` : undefined })
          continue
        }
      }
      if (rule.includes('any phrase from:')) {
        const phraseMatch = rule.match(/\[(.*?)\]/)
        if (phraseMatch) {
          const phrases = phraseMatch[1].split(',').map(p => p.trim().replace(/^["']|["']$/g, ''))
          const found = phrases.some(p => lower.includes(p.toLowerCase()))
          details.push({ test_name: tc.name, status: found ? 'pass' : 'fail', error: found ? undefined : `None of [${phrases.join(', ')}] found in prompt` })
          continue
        }
      }
      if (rule.includes('none of:')) {
        const phraseMatch = rule.match(/\[(.*?)\]/)
        if (phraseMatch) {
          const phrases = phraseMatch[1].split(',').map(p => p.trim().replace(/^["']|["']$/g, ''))
          const found = phrases.find(p => lower.includes(p.toLowerCase()))
          details.push({ test_name: tc.name, status: found ? 'fail' : 'pass', error: found ? `Disallowed phrase "${found}" found` : undefined })
          continue
        }
      }
      details.push({ test_name: tc.name, status: 'pass' })
    } catch {
      details.push({ test_name: tc.name, status: 'fail', error: 'Rule evaluation error' })
    }
  }

  const passed = details.filter(d => d.status === 'pass').length
  return { total_tests: details.length, passed, failed: details.length - passed, details, runtime_errors: [] }
}

export async function executeSubmission(
  candidateCode: string,
  testCases: TestCase[],
  language: 'python' | 'javascript' | 'text' | 'sql'
): Promise<TestResults> {
  if (language === 'text') {
    return buildTextPromptHarness(candidateCode, testCases)
  }

  if (language === 'sql') {
    // SQL is handled client-side via sql.js; return placeholder
    return {
      total_tests: testCases.length,
      passed: 0,
      failed: 0,
      details: testCases.map(tc => ({ test_name: tc.name, status: 'pass' as const })),
      runtime_errors: ['SQL exercises are graded client-side'],
    }
  }

  const apiKey = process.env.E2B_API_KEY
  if (!apiKey) {
    console.error('[E2B] E2B_API_KEY not set')
    return { total_tests: testCases.length, passed: 0, failed: testCases.length, details: testCases.map(tc => ({ test_name: tc.name, status: 'fail' as const, error: 'Sandbox unavailable' })), runtime_errors: ['E2B_API_KEY not configured'] }
  }

  let sandbox: Sandbox | null = null
  try {
    sandbox = await Sandbox.create({ apiKey, timeoutMs: 15_000 })

    const harness = language === 'python'
      ? buildPythonHarness(candidateCode, testCases)
      : `// JS not yet supported\nconsole.log(JSON.stringify([]))`

    await sandbox.files.write('/harness.py', harness)

    const result = await sandbox.commands.run('python3 /harness.py', { timeoutMs: 10_000 })
    const stdout = result.stdout.trim()
    const stderr = result.stderr.trim()

    const runtimeErrors: string[] = []
    if (stderr) runtimeErrors.push(stderr.slice(0, 500))

    let rawResults: { name: string; status: string; error?: string }[] = []
    try {
      const jsonStart = stdout.lastIndexOf('[')
      rawResults = jsonStart >= 0 ? JSON.parse(stdout.slice(jsonStart)) : []
    } catch {
      runtimeErrors.push('Failed to parse test output: ' + stdout.slice(0, 200))
      return { total_tests: testCases.length, passed: 0, failed: testCases.length, details: testCases.map(tc => ({ test_name: tc.name, status: 'fail' as const, error: 'Parse error' })), runtime_errors: runtimeErrors }
    }

    const details = rawResults.map(r => ({
      test_name: r.name,
      status: r.status === 'pass' ? 'pass' as const : 'fail' as const,
      ...(r.error ? { error: r.error } : {}),
    }))

    const passed = details.filter(d => d.status === 'pass').length
    return { total_tests: details.length, passed, failed: details.length - passed, details, runtime_errors: runtimeErrors }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[E2B] Sandbox error:', msg)
    return {
      total_tests: testCases.length,
      passed: 0,
      failed: testCases.length,
      details: testCases.map(tc => ({ test_name: tc.name, status: 'fail' as const, error: 'Sandbox error' })),
      runtime_errors: [msg.slice(0, 300)],
    }
  } finally {
    if (sandbox) {
      try { await sandbox.kill() } catch { /* ignore */ }
    }
  }
}
