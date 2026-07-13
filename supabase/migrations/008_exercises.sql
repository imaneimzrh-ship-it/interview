-- Part 3: exercises + submissions tables + 5 launch exercises
-- Run in Supabase SQL Editor

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ─── exercises ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.exercises (
  id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  role_track              TEXT NOT NULL,
  title                   TEXT NOT NULL,
  task_description        TEXT NOT NULL,
  starter_code            TEXT,
  language                TEXT NOT NULL,
  reference_solution_notes TEXT NOT NULL,
  test_cases              JSONB NOT NULL,
  explanation_required    BOOLEAN DEFAULT true,
  difficulty              TEXT NOT NULL CHECK (difficulty IN ('easy','medium','hard')),
  created_at              TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.exercises ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Exercises are public read" ON public.exercises FOR SELECT USING (true);

-- ─── submissions ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.submissions (
  id                   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id           UUID NOT NULL,
  exercise_id          UUID REFERENCES public.exercises(id),
  user_id              UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  candidate_code       TEXT,
  candidate_explanation TEXT,
  test_results         JSONB,
  grading              JSONB,
  created_at           TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.submissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own submissions" ON public.submissions
  FOR ALL USING (auth.uid() = user_id);
CREATE INDEX IF NOT EXISTS idx_submissions_session ON public.submissions(session_id);

-- ─── Seed: 5 launch exercises ─────────────────────────────────────────────────

-- 1. Fix the Broken RAG Retrieval Pipeline
INSERT INTO public.exercises (role_track, title, task_description, starter_code, language, reference_solution_notes, test_cases, explanation_required, difficulty)
VALUES (
  'ai_engineer',
  'Fix the Broken RAG Retrieval Pipeline',
  E'You are debugging a RAG (Retrieval-Augmented Generation) chunk-retrieval function. The function should return the top-k most semantically similar chunks to a query vector using cosine similarity — but it has two bugs:\n\n1. The cosine similarity formula is wrong (it computes dot product only, ignoring vector magnitudes)\n2. The sort direction is wrong (it returns the least similar chunks instead of the most similar)\n\nFix both bugs. Do not change the function signature.\n\n**Constraints:**\n- Do not use any external libraries (numpy not available in this sandbox)\n- All vectors are non-zero\n- k is always <= len(chunks)',
  E'import math\n\ndef retrieve_top_k(query_vec: list[float], chunks: list[dict], k: int) -> list[dict]:\n    """\n    Returns the top-k chunks most similar to query_vec.\n    Each chunk is {"text": str, "embedding": list[float]}.\n    """\n    def cosine_similarity(a, b):\n        # BUG 1: missing magnitude normalization\n        return sum(x * y for x, y in zip(a, b))\n\n    scored = [\n        (chunk, cosine_similarity(query_vec, chunk["embedding"]))\n        for chunk in chunks\n    ]\n    # BUG 2: wrong sort direction — should be descending\n    scored.sort(key=lambda x: x[1])\n    return [chunk for chunk, _ in scored[:k]]\n',
  'python',
  E'Fixed cosine similarity: dot(a,b) / (||a|| * ||b||). Fixed sort: scored.sort(key=lambda x: x[1], reverse=True). The magnitude normalization is the critical fix — without it, longer vectors always win regardless of angle. The sort direction fix ensures we return the most similar (highest score) chunks first.',
  '[
    {
      "name": "basic similarity returns correct top chunk",
      "function": "retrieve_top_k",
      "setup": "chunks = [{\"text\": \"LLM tokenization\", \"embedding\": [1.0, 0.0, 0.0]}, {\"text\": \"vector databases\", \"embedding\": [0.0, 1.0, 0.0]}, {\"text\": \"RAG pipeline\", \"embedding\": [0.9, 0.1, 0.0]}]",
      "call": "retrieve_top_k([1.0, 0.0, 0.0], chunks, 1)",
      "expected_text": "LLM tokenization",
      "visible": true
    },
    {
      "name": "top-2 returns correct order",
      "function": "retrieve_top_k",
      "setup": "chunks = [{\"text\": \"A\", \"embedding\": [1.0, 0.0]}, {\"text\": \"B\", \"embedding\": [0.6, 0.8]}, {\"text\": \"C\", \"embedding\": [0.0, 1.0]}]",
      "call": "retrieve_top_k([1.0, 0.0], chunks, 2)",
      "expected_first_text": "A",
      "visible": true
    },
    {
      "name": "magnitude normalization: longer vector should not win",
      "function": "retrieve_top_k",
      "setup": "chunks = [{\"text\": \"aligned_small\", \"embedding\": [0.1, 0.0]}, {\"text\": \"perpendicular_large\", \"embedding\": [0.0, 10.0]}]",
      "call": "retrieve_top_k([1.0, 0.0], chunks, 1)",
      "expected_text": "aligned_small",
      "visible": false
    },
    {
      "name": "identical vectors score 1.0 (perfect similarity)",
      "function": "retrieve_top_k",
      "setup": "chunks = [{\"text\": \"exact\", \"embedding\": [0.6, 0.8]}, {\"text\": \"other\", \"embedding\": [0.0, 1.0]}]",
      "call": "retrieve_top_k([0.6, 0.8], chunks, 1)",
      "expected_text": "exact",
      "visible": false
    }
  ]'::jsonb,
  true,
  'medium'
);

-- 2. Prompt Engineering Rewrite
INSERT INTO public.exercises (role_track, title, task_description, starter_code, language, reference_solution_notes, test_cases, explanation_required, difficulty)
VALUES (
  'ai_engineer',
  'Prompt Engineering Rewrite',
  E'The system prompt below causes an LLM to hallucinate facts, answer outside its scope, and fail to cite uncertainty.\n\nRewrite it to fix all three failure modes:\n1. **Hallucination** — model invents facts it cannot verify\n2. **Scope creep** — model answers questions it should refuse\n3. **Certainty masking** — model never says "I don''t know"\n\nYour rewrite must:\n- Stay under 300 words\n- Preserve the assistant''s role (AI/ML technical support)\n- Add an explicit uncertainty instruction\n- Add a scope boundary with refusal language\n- Add a grounding rule (only state verifiable facts)\n\n**Broken prompt to fix:**\n```\nYou are a helpful AI assistant. Answer any question the user asks as helpfully and completely as possible. Be confident in your answers and avoid uncertainty language as it makes users uncomfortable. Provide detailed answers on any topic.\n```',
  E'# Rewrite the system prompt below this line\n# Requirements:\n# 1. Under 300 words\n# 2. Scope limited to AI/ML technical support\n# 3. Explicit uncertainty instruction (say "I don\'t know" when unsure)\n# 4. Grounding rule (only state verifiable facts)\n# 5. Clear refusal language for out-of-scope questions\n\nYou are a helpful AI assistant. Answer any question the user asks as helpfully and completely as possible. Be confident in your answers and avoid uncertainty language as it makes users uncomfortable. Provide detailed answers on any topic.\n',
  'text',
  E'Strong rewrites include: (1) explicit role scoping to AI/ML/LLM topics only, (2) "If I am not certain, I will say so explicitly" or equivalent, (3) grounding rule like "I only state facts I can verify from my training" or "I do not fabricate citations/benchmarks", (4) refusal template for off-topic: "That is outside my scope — I can help with [X,Y,Z]", (5) stays under 300 words. The key anti-hallucination mechanism is the grounding rule + uncertainty permission combined.',
  '[
    {
      "name": "word count under 300",
      "rule": "len(answer.split()) <= 300",
      "visible": true
    },
    {
      "name": "contains uncertainty instruction",
      "rule": "any phrase from: [\"don''t know\", \"do not know\", \"uncertain\", \"not sure\", \"cannot verify\", \"I will say so\"]",
      "visible": true
    },
    {
      "name": "contains scope boundary",
      "rule": "any phrase from: [\"scope\", \"outside\", \"only help with\", \"limited to\", \"AI\", \"ML\", \"machine learning\"]",
      "visible": true
    },
    {
      "name": "removes confidence-at-all-costs language",
      "rule": "none of: [\"avoid uncertainty\", \"makes users uncomfortable\", \"any question\", \"any topic\"]",
      "visible": false
    },
    {
      "name": "contains grounding/factual accuracy rule",
      "rule": "any phrase from: [\"verif\", \"factual\", \"fabricat\", \"hallucin\", \"only state\", \"do not invent\"]",
      "visible": false
    }
  ]'::jsonb,
  true,
  'easy'
);

-- 3. Token Cost Optimization
INSERT INTO public.exercises (role_track, title, task_description, starter_code, language, reference_solution_notes, test_cases, explanation_required, difficulty)
VALUES (
  'ai_engineer',
  'Token Cost Optimization',
  E'The function below calls an LLM API redundantly and inefficiently. It has two problems:\n\n1. **No caching** — identical prompts are sent to the API multiple times instead of being cached\n2. **No batching** — items that could be processed together are sent one-by-one, wasting per-request overhead\n\nRefactor `classify_texts` so that:\n- Repeated identical texts are only sent to the API once (memoized)\n- All unique texts are batched into a **single API call** using a structured prompt\n- The output dict maps every input text to its classification (including duplicates)\n\nDo not change the function signature. The mock `call_llm(prompt)` returns a JSON string of `{text: label}` pairs when given a batch prompt.',
  E'import json\n\n# Mock LLM caller — do not modify\ncall_count = [0]\ndef call_llm(prompt: str) -> str:\n    call_count[0] += 1\n    # Parses "Classify: text1 || text2" and returns {text: label}\n    if "Classify:" not in prompt:\n        return "{}"\n    texts = [t.strip() for t in prompt.split("Classify:")[1].split("||")]\n    result = {t: ("code" if any(w in t.lower() for w in ["python","sql","function","def "]) else "question") for t in texts}\n    return json.dumps(result)\n\ndef classify_texts(texts: list[str]) -> dict[str, str]:\n    """Returns {text: label} for every text in the input list."""\n    results = {}\n    for text in texts:\n        # BUG: calls API once per text, no caching\n        prompt = f"Classify: {text}"\n        response = call_llm(prompt)\n        label = json.loads(response).get(text, "unknown")\n        results[text] = label\n    return results\n',
  'python',
  E'Solution uses: (1) deduplicate inputs with set/dict, (2) single batch call with all unique texts joined by || separator, (3) parse batch response, (4) map duplicates from cache. call_count[0] should be 1 for any input with duplicates or multiple items. Key insight: LLM APIs charge per token; batching 10 items into 1 call costs ~10x less in per-request overhead than 10 separate calls.',
  '[
    {
      "name": "basic classification works",
      "function": "classify_texts",
      "call": "classify_texts([\"def hello(): pass\", \"What is RAG?\"])",
      "expected": "{\"def hello(): pass\": \"code\", \"What is RAG?\": \"question\"}",
      "visible": true
    },
    {
      "name": "duplicates handled — same text twice returns same label",
      "function": "classify_texts",
      "call": "classify_texts([\"What is RAG?\", \"What is RAG?\"])",
      "check": "len(set(result.values())) >= 1 and result[\"What is RAG?\"] == result[\"What is RAG?\"]",
      "visible": true
    },
    {
      "name": "only 1 API call for 3 unique texts",
      "function": "classify_texts",
      "setup": "call_count[0] = 0",
      "call": "classify_texts([\"SELECT * FROM users\", \"What is RAG?\", \"def foo(): pass\"])",
      "check": "call_count[0] == 1",
      "visible": false
    },
    {
      "name": "only 1 API call even with duplicates",
      "function": "classify_texts",
      "setup": "call_count[0] = 0",
      "call": "classify_texts([\"What is RAG?\", \"def foo(): pass\", \"What is RAG?\"])",
      "check": "call_count[0] == 1",
      "visible": false
    },
    {
      "name": "single item still returns correct dict",
      "function": "classify_texts",
      "call": "classify_texts([\"What is RAG?\"])",
      "expected": "{\"What is RAG?\": \"question\"}",
      "visible": true
    }
  ]'::jsonb,
  true,
  'medium'
);

-- 4. SQL Debugging: User Events Join
INSERT INTO public.exercises (role_track, title, task_description, starter_code, language, reference_solution_notes, test_cases, explanation_required, difficulty)
VALUES (
  'ai_engineer',
  'SQL Debugging: User Events Join',
  E'The query below is supposed to return each user''s name and their total event count. Instead it produces duplicate rows, inflating counts incorrectly.\n\nFix the query so that:\n- Each user appears exactly once\n- The `event_count` reflects the true number of events per user\n- Users with zero events are included (show 0)\n\n**Schema:**\n```sql\nusers(id, name, email)\nevents(id, user_id, event_type, created_at)\n```\n\n**Seeded data:**\n- Users: Alice (3 events), Bob (1 event), Carol (0 events)\n- Events: 4 total rows',
  E'-- Fix the query below\nSELECT\n    u.id,\n    u.name,\n    COUNT(e.id) AS event_count\nFROM users u\nJOIN events e ON e.user_id = u.id\nGROUP BY u.id\nORDER BY u.id;\n',
  'sql',
  E'Two bugs: (1) INNER JOIN excludes Carol who has 0 events — fix with LEFT JOIN. (2) GROUP BY u.id only (not u.name) is fine in most DBs but adding u.name avoids ambiguity. The core fix is LEFT JOIN. Without GROUP BY the join produces one row per event per user, creating duplicates — but GROUP BY is already present so the real bug is the INNER JOIN dropping Carol.',
  '[
    {
      "name": "returns 3 rows (one per user including Carol with 0 events)",
      "query_check": "row_count == 3",
      "visible": true,
      "seed_sql": "CREATE TABLE users (id INTEGER PRIMARY KEY, name TEXT, email TEXT); CREATE TABLE events (id INTEGER PRIMARY KEY, user_id INTEGER, event_type TEXT, created_at TEXT); INSERT INTO users VALUES (1,''Alice'',''alice@test.com''),(2,''Bob'',''bob@test.com''),(3,''Carol'',''carol@test.com''); INSERT INTO events VALUES (1,1,''click'',''2024-01-01''),(2,1,''view'',''2024-01-02''),(3,1,''purchase'',''2024-01-03''),(4,2,''click'',''2024-01-04'');"
    },
    {
      "name": "Alice has event_count = 3",
      "query_check": "rows where name=''Alice'' have event_count=3",
      "visible": true
    },
    {
      "name": "Bob has event_count = 1",
      "query_check": "rows where name=''Bob'' have event_count=1",
      "visible": true
    },
    {
      "name": "Carol has event_count = 0",
      "query_check": "rows where name=''Carol'' have event_count=0",
      "visible": false
    }
  ]'::jsonb,
  true,
  'easy'
);

-- 5. Chunking Strategy Fix
INSERT INTO public.exercises (role_track, title, task_description, starter_code, language, reference_solution_notes, test_cases, explanation_required, difficulty)
VALUES (
  'ai_engineer',
  'Chunking Strategy Fix',
  E'The function below is supposed to split a document into overlapping chunks for a RAG pipeline. It has a bug in the overlap logic: instead of carrying the last `overlap` characters of the previous chunk into the next one, it accidentally advances by the full `chunk_size` each time, producing no overlap at all.\n\nFix `chunk_document` so that:\n- Chunks have length <= `chunk_size` characters\n- Each chunk (except the first) starts `overlap` characters before where the previous chunk ended\n- The last chunk includes all remaining text (may be shorter than `chunk_size`)\n- No empty chunks are returned\n\nDo not change the function signature.',
  E'def chunk_document(text: str, chunk_size: int = 200, overlap: int = 50) -> list[str]:\n    """\n    Splits text into overlapping chunks for RAG indexing.\n    Each chunk overlaps the previous by `overlap` characters.\n    """\n    chunks = []\n    start = 0\n    while start < len(text):\n        end = start + chunk_size\n        chunks.append(text[start:end])\n        # BUG: should advance by (chunk_size - overlap) to create overlap\n        start += chunk_size\n    return [c for c in chunks if c.strip()]\n',
  'python',
  E'Fix: change `start += chunk_size` to `start += (chunk_size - overlap)`. This means each chunk starts `overlap` characters before the previous chunk ended, creating the desired context continuity. With chunk_size=10, overlap=3, step=7: chunks start at 0,7,14... Each new chunk includes the last 3 chars of the prior chunk. Overlap is critical for RAG to avoid splitting mid-sentence and losing context at chunk boundaries.',
  '[
    {
      "name": "basic overlap: chunk 2 starts before chunk 1 ends",
      "function": "chunk_document",
      "call": "chunk_document(\"ABCDEFGHIJKLMNOPQRSTUVWXYZ\", chunk_size=10, overlap=3)",
      "check": "result[1].startswith(result[0][-3:])",
      "visible": true
    },
    {
      "name": "correct number of chunks for 26-char text",
      "function": "chunk_document",
      "call": "chunk_document(\"ABCDEFGHIJKLMNOPQRSTUVWXYZ\", chunk_size=10, overlap=3)",
      "check": "len(result) == 4",
      "visible": true
    },
    {
      "name": "no overlap when overlap=0 (step equals chunk_size)",
      "function": "chunk_document",
      "call": "chunk_document(\"ABCDEFGHIJ\", chunk_size=5, overlap=0)",
      "expected": "[\"ABCDE\", \"FGHIJ\"]",
      "visible": false
    },
    {
      "name": "last chunk contains final characters",
      "function": "chunk_document",
      "call": "chunk_document(\"Hello World!\", chunk_size=7, overlap=2)",
      "check": "result[-1].endswith(\"!\")",
      "visible": true
    },
    {
      "name": "no empty chunks returned",
      "function": "chunk_document",
      "call": "chunk_document(\"Short\", chunk_size=10, overlap=3)",
      "check": "all(c.strip() for c in result)",
      "visible": false
    }
  ]'::jsonb,
  true,
  'medium'
);
