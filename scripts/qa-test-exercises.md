# QA Test Plan — Technical Exercises
## Status: Ready to execute (run against https://sonneai.com with a Pro user session)

### Pre-requisites
1. Run migrations 010 and 011 in Supabase SQL Editor
2. Have a Pro user account and a valid session cookie / Bearer token

---

## Part 1A — Correctness Spectrum (per exercise, repeat for all 7 exercises)

| Exercise | Submission type | Expected overall_score | Expected pass_fail | Test status |
|----------|----------------|----------------------|--------------------|-------------|
| RAG Retrieval Fix | Correct: fix both bugs (magnitude + sort) | 7–10 | pass | ☐ |
| RAG Retrieval Fix | Wrong: only fix sort, leave magnitude broken | 3–5 | fail | ☐ |
| RAG Retrieval Fix | Partial: fix magnitude, wrong sort | 5–6 | borderline | ☐ |
| Prompt Engineering | Correct: includes all 5 requirements | 7–10 | pass | ☐ |
| Prompt Engineering | Wrong: shorter than 300 words, misses scope | 2–4 | fail | ☐ |
| Token Cost Opt | Correct: dedup + single batch call | 7–10 | pass | ☐ |
| Token Cost Opt | Wrong: just dedup, still N calls | 4–6 | borderline | ☐ |
| SQL Debugging | Correct: LEFT JOIN + GROUP BY | 7–10 | pass | ☐ |
| SQL Debugging | Wrong: keeps INNER JOIN | 2–4 | fail | ☐ |
| Chunking Fix | Correct: start += chunk_size - overlap | 7–10 | pass | ☐ |
| Chunking Fix | Wrong: keeps start += chunk_size | 1–3 | fail | ☐ |
| BM25 Scorer (new) | Correct: full IDF * TF implementation | 7–10 | pass | ☐ |
| BM25 Scorer (new) | Wrong: only dot product, no IDF | 2–5 | fail | ☐ |
| RAG Optimization (new) | Correct: pre-compute all doc embeddings | 7–10 | pass | ☐ |
| RAG Optimization (new) | Wrong: no change, still re-embeds | 1–2 | fail | ☐ |

---

## Part 1B — Sandbox Abuse Cases

| Test | Payload | Expected behavior | Test status |
|------|---------|------------------|-------------|
| Infinite loop | `while True: pass` | 10s timeout → runtime_errors non-empty, clean error message | ☐ |
| Network access | `import requests; requests.get("https://google.com")` | Blocked or connection refused, runtime_error returned | ☐ |
| Large output | `for i in range(1000000): print("x"*1000)` | Truncated output (≤500 chars in runtime_errors), no crash | ☐ |
| Filesystem escape | `open("/etc/passwd").read()` | Sandboxed — reads inside sandbox only, no host data | ☐ |

---

## Part 1C — Grading Consistency

Submit the correct RAG Retrieval Fix solution **5 times**. Record `overall_score` each time.
Variance must be ≤ 2 points between any two runs (temperature 0.1 should hold this).

| Run | overall_score | pass_fail |
|-----|--------------|-----------|
| 1   |              |           |
| 2   |              |           |
| 3   |              |           |
| 4   |              |           |
| 5   |              |           |

Max − Min should be ≤ 2. ☐

---

## Part 1D — Malformed Input Handling

| Input | Expected frontend behavior | Expected HTTP status |
|-------|--------------------------|---------------------|
| Empty string submission | "Submission cannot be empty" error shown | 400 |
| Code with Python syntax error | Tests fail, runtime_errors shows SyntaxError | 200 with failed tests |
| Missing explanation (when required) | Graded without explanation (server uses null) | 200 (explanation is optional on submission) |
| Missing session_id | 400 with field error | 400 |

---

## Part 2 — Security Checklist

- [x] Rate limiting: 5 submissions/min per user (implemented in route.ts)
- [x] API response audit: `reference_solution_notes` never in response (only `test_results`, `grading`, `submission_id`)
- [x] RLS on `submissions`: `FOR ALL USING (auth.uid() = user_id)` — users cannot read other users' rows
- [ ] **Manual verify**: submit 6 requests in 1 minute → 6th should return 429
- [ ] **Manual verify**: inspect response payload — confirm no `reference_solution_notes` key present

---

## Part 3 — Cost Monitoring Checklist

- [x] Per-submission structured log: `submission_cost` JSON event logged to Vercel
- [x] Cost alert: `> $0.50/submission` logs at error level
- [ ] **Action required**: set up Vercel Log Drain → filter on `"event":"submission_cost"` → export to dashboard
- [ ] **Action required**: set Vercel alert on error-level logs containing `[COST_ALERT]` → email/Slack

---

## Part 5 — Analytics Funnel Checklist

After running migrations 011, verify events appear in `analytics_events` table:

- [ ] `signup_completed` fires on new OAuth sign-in
- [ ] `interview_session_started` fires on `/api/interview/start`
- [ ] `technical_exercise_opened` fires when exercise loads in browser
- [ ] `technical_exercise_submitted` fires on each submission
- [ ] `session_fully_completed` fires when `/api/interview/end` is called

**Funnel query (run in Supabase SQL Editor):**
```sql
SELECT
  event_name,
  COUNT(*) as count,
  MIN(created_at) as first_seen,
  MAX(created_at) as last_seen
FROM analytics_events
GROUP BY event_name
ORDER BY count DESC;
```

---

## Part 6 — Ad Copy Checklist

- [x] Site title updated: "Coding Exercises, RAG, Agents, MLOps" in title tag
- [x] Meta description updated: mentions "real hands-on coding exercises graded by AI"
- [x] OG title/description updated with coding angle
- [ ] **Action required**: Update Google Ads headlines to include "Hands-On Coding Exercises" and "AI-Graded Coding Tests"
- [ ] **Action required**: Set Google Ads conversion event to `technical_exercise_submitted` (via GTM dataLayer push or server-side Conversion API)
