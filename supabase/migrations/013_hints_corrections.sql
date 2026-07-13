-- Migration 013: Tiered hints + full correction reveal
-- Run in Supabase SQL Editor

-- ── Schema additions ────────────────────────────────────────────────────────

ALTER TABLE public.exercises ADD COLUMN IF NOT EXISTS hints JSONB;
ALTER TABLE public.exercises ADD COLUMN IF NOT EXISTS full_solution_code TEXT;
ALTER TABLE public.exercises ADD COLUMN IF NOT EXISTS concept_explanation TEXT;

ALTER TABLE public.submissions ADD COLUMN IF NOT EXISTS hints_used INTEGER DEFAULT 0;

-- hint_requests: one row per hint level revealed per session+exercise
-- Unique index enforces sequential unlocking (can't skip a level)
CREATE TABLE IF NOT EXISTS public.hint_requests (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id  UUID NOT NULL,
  exercise_id UUID NOT NULL,
  user_id     UUID NOT NULL,
  hint_level  INTEGER NOT NULL CHECK (hint_level BETWEEN 1 AND 3),
  created_at  TIMESTAMPTZ DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS hint_requests_unique_level
  ON public.hint_requests(session_id, exercise_id, hint_level);
ALTER TABLE public.hint_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own hint_requests" ON public.hint_requests
  FOR ALL USING (auth.uid() = user_id);

-- ── Exercise 1: Fix the Broken RAG Retrieval Pipeline ──────────────────────

UPDATE public.exercises SET
  hints = $hints_1$[
    {"level":1,"text":"Look at the cosine_similarity function — the formula is incomplete. Think about what makes cosine similarity different from a plain dot product."},
    {"level":2,"text":"Cosine similarity normalises by vector magnitude: dot(a,b) divided by (|a| × |b|). You have the numerator — what is missing in the denominator?"},
    {"level":3,"text":"Divide by math.sqrt(sum(x**2 for x in a)) * math.sqrt(sum(y**2 for y in b)). Then fix the sort direction — the most similar chunk should come first, meaning the sort should be descending (reverse=True)."}
  ]$hints_1$::jsonb,
  full_solution_code = $sol_1$import math

def retrieve_top_k(query_vec: list[float], chunks: list[dict], k: int) -> list[dict]:
    def cosine_similarity(a, b):
        dot = sum(x * y for x, y in zip(a, b))
        mag_a = math.sqrt(sum(x**2 for x in a))
        mag_b = math.sqrt(sum(y**2 for y in b))
        return dot / (mag_a * mag_b)

    scored = [
        (chunk, cosine_similarity(query_vec, chunk["embedding"]))
        for chunk in chunks
    ]
    scored.sort(key=lambda x: x[1], reverse=True)
    return [chunk for chunk, _ in scored[:k]]
$sol_1$,
  concept_explanation = $exp_1$Cosine similarity measures the angle between two vectors, not their magnitude — a large embedding pointing in the same direction as the query should score identically to a small one with the same direction. Without magnitude normalization, high-magnitude vectors always rank first regardless of semantic direction, corrupting retrieval entirely. This is one of the most common silent bugs in custom RAG implementations: tests may still pass if vectors happen to be unit-length, but the code breaks on any real embedding model that does not L2-normalize its outputs.$exp_1$
WHERE title = 'Fix the Broken RAG Retrieval Pipeline';

-- ── Exercise 2: Prompt Engineering Rewrite ─────────────────────────────────

UPDATE public.exercises SET
  hints = $hints_2$[
    {"level":1,"text":"Count the explicit requirements listed in the task. Your prompt should address every one of them directly — not implicitly or in passing."},
    {"level":2,"text":"The five requirements are: (1) a specific named model role, (2) English-only output constraint, (3) a defined response format with named fields, (4) a factual quality constraint preventing hallucination, (5) a word or sentence length limit. Check each explicitly."},
    {"level":3,"text":"Structure: open with role assignment ('You are a...'), enumerate constraints numbered 1–5, specify output as JSON with named fields ('headline', 'summary', 'key_facts'), add 'Do not include unverified claims', and end with a character or word limit. Each constraint should be its own explicit line."}
  ]$hints_2$::jsonb,
  full_solution_code = $sol_2$You are an expert news summarization assistant specialised in factual, neutral reporting.

Instructions:
1. Respond only in English.
2. Return a JSON object with the following fields:
   - "headline": a single sentence capturing the main event
   - "summary": 3–5 sentences covering the key facts
   - "key_facts": an array of exactly 3 bullet-point strings
3. Do not include opinions, speculation, or any claim not directly stated in the source article.
4. Keep the total response under 200 words.
5. If the article does not contain sufficient factual content to summarise, return {"error": "insufficient_content"} and nothing else.$sol_2$,
  concept_explanation = $exp_2$Production prompt engineering is about explicit constraint enumeration, not implicit trust that the model will infer your intent. Role assignment anchors the model's persona and expertise scope. Format specifications reduce downstream parsing failures — a model that sometimes returns bullet lists and sometimes JSON will break any automated pipeline. Quality constraints ("do not include unverified claims") reduce hallucination. Length limits control token costs at scale. Missing any one of these introduces a degree of freedom where the model can go off-script — and with millions of API calls, it will.$exp_2$
WHERE title = 'Prompt Engineering Rewrite';

-- ── Exercise 3: Token Cost Optimization ────────────────────────────────────

UPDATE public.exercises SET
  hints = $hints_3$[
    {"level":1,"text":"Count how many times the LLM API is called as a function of the input list length. Is there repeated work happening for identical inputs?"},
    {"level":2,"text":"The current code calls embed_query once per item including duplicates. Can you (a) remove duplicates first, and (b) replace the per-item loop with a single batch call using embed_batch?"},
    {"level":3,"text":"Step 1: deduped = list(dict.fromkeys(items)) to deduplicate while preserving order. Step 2: embeddings = embed_batch(deduped) — one API call. Step 3: cache = dict(zip(deduped, embeddings)) for O(1) lookup. Step 4: return [cache[item] for item in items] to restore original order including duplicates."}
  ]$hints_3$::jsonb,
  full_solution_code = $sol_3$def batch_embed(items: list[str]) -> list[list[float]]:
    # Deduplicate while preserving original order
    deduped = list(dict.fromkeys(items))

    # Single batch API call instead of N individual calls
    embeddings = embed_batch(deduped)

    # Build lookup cache
    cache = dict(zip(deduped, embeddings))

    # Return embeddings in original order (including duplicates)
    return [cache[item] for item in items]
$sol_3$,
  concept_explanation = $exp_3$Every LLM API call carries a fixed overhead: network round-trip latency (30–200ms), a minimum billing unit, and connection setup cost. Batching reduces N redundant calls to 1 call with N unique items — often a 10–100x cost and latency reduction at scale. Deduplication ensures you never pay twice for identical inputs. Using dict.fromkeys() instead of set() preserves insertion order, which matters when callers depend on positional alignment between inputs and outputs. This pattern is fundamental to any production embedding pipeline, especially for indexing large document corpora.$exp_3$
WHERE title = 'Token Cost Optimization';

-- ── Exercise 4: SQL Debugging: User Events Join ─────────────────────────────

UPDATE public.exercises SET
  hints = $hints_4$[
    {"level":1,"text":"The result is missing users with no events. Look at the JOIN type — what does it do when a user has no matching rows in the events table?"},
    {"level":2,"text":"INNER JOIN drops rows where no match exists in the right table. Users with zero events disappear entirely. Which JOIN type keeps all rows from the left table, filling NULLs for unmatched right-side columns?"},
    {"level":3,"text":"Replace INNER JOIN with LEFT JOIN. Users with no events will have NULL for e.id — COUNT(e.id) correctly returns 0 for them because COUNT ignores NULLs. No other changes are needed."}
  ]$hints_4$::jsonb,
  full_solution_code = $sol_4$SELECT u.id, u.name, COUNT(e.id) AS event_count
FROM users u
LEFT JOIN events e ON e.user_id = u.id
GROUP BY u.id, u.name
ORDER BY event_count DESC;
$sol_4$,
  concept_explanation = $exp_4$INNER JOIN silently drops rows from the left table when no match exists in the right table — a ubiquitous analytics bug. In user-event schemas, users who have never taken an action completely disappear from reports, skewing funnel metrics and cohort analyses. LEFT JOIN preserves all rows from the left table and fills NULLs for unmatched right-side columns. COUNT(e.id) naturally handles this: it counts non-NULL values only, returning 0 for users with no events. Always ask before writing a JOIN: should rows with no match appear in the output?$exp_4$
WHERE title = 'SQL Debugging: User Events Join';

-- ── Exercise 5: Chunking Strategy Fix ──────────────────────────────────────

UPDATE public.exercises SET
  hints = $hints_5$[
    {"level":1,"text":"Trace the start values generated for a 30-character string with chunk_size=10 and overlap=3. Is the overlap between consecutive chunks actually present in the output?"},
    {"level":2,"text":"The current step between chunks is chunk_size, meaning each chunk starts exactly where the previous one ended — with no overlap. The step should be chunk_size minus overlap to make each new chunk begin overlap characters before the end of the previous one."},
    {"level":3,"text":"Replace start += chunk_size with start += (chunk_size - overlap). With chunk_size=10 and overlap=3, the step becomes 7: chunks start at 0, 7, 14, 21... Each chunk shares its first 3 characters with the tail of the previous one."}
  ]$hints_5$::jsonb,
  full_solution_code = $sol_5$def chunk_text(text: str, chunk_size: int = 512, overlap: int = 50) -> list[str]:
    chunks = []
    start = 0
    step = chunk_size - overlap
    while start < len(text):
        chunks.append(text[start:start + chunk_size])
        start += step
    return chunks
$sol_5$,
  concept_explanation = $exp_5$Overlapping chunks prevent context loss at chunk boundaries, where a sentence or concept spanning two chunks would otherwise be split and retrieved as an incomplete fragment. The overlap creates a sliding window: each new chunk begins overlap characters before the end of the previous one, ensuring any sentence that straddles the boundary appears fully in at least one chunk. The overlap size is a hyperparameter — 10–15% of chunk_size is typical (50 tokens on a 512-token chunk). Without overlap, approximately 1/chunk_size of your content is potentially unretrievable due to mid-sentence boundary splits.$exp_5$
WHERE title = 'Chunking Strategy Fix';

-- ── Exercise 6: Build a BM25 Keyword Scorer ────────────────────────────────

UPDATE public.exercises SET
  hints = $hints_6$[
    {"level":1,"text":"BM25 score is a sum over query terms. For each term you need two components: how rare it is across the corpus (IDF) and how often it appears in this document relative to document length (TF). Make sure you compute both."},
    {"level":2,"text":"IDF formula: math.log((N - df(t) + 0.5) / (df(t) + 0.5) + 1). TF formula: (freq * (k1 + 1)) / (freq + k1 * (1 - b + b * doc_len / avgdl)). Score += IDF * TF for each query term that appears in the document."},
    {"level":3,"text":"For each term in query_terms: count its frequency in doc_terms, look up df from corpus_doc_counts (default 0 if absent), apply both formulas, add to running score. Return 0.0 early if either query_terms or doc_terms is empty. k1=1.5, b=0.75."}
  ]$hints_6$::jsonb,
  full_solution_code = $sol_6$import math

def bm25_score(query_terms, doc_terms, corpus_doc_counts, total_docs, avgdl, k1=1.5, b=0.75):
    if not query_terms or not doc_terms:
        return 0.0

    doc_len = len(doc_terms)
    # Count term frequencies in document
    term_freq = {}
    for term in doc_terms:
        term_freq[term] = term_freq.get(term, 0) + 1

    score = 0.0
    for term in query_terms:
        df = corpus_doc_counts.get(term, 0)
        if df == 0:
            continue
        idf = math.log((total_docs - df + 0.5) / (df + 0.5) + 1)
        freq = term_freq.get(term, 0)
        tf = (freq * (k1 + 1)) / (freq + k1 * (1 - b + b * doc_len / avgdl))
        score += idf * tf

    return score
$sol_6$,
  concept_explanation = $exp_6$BM25 is ElasticSearch's and most hybrid-search pipelines' default ranking function. It combines IDF (inverse document frequency — penalising common terms like "the" that appear in almost every document) with a sub-linear TF (term frequency with saturation — penalising pathological repetition) and length normalisation (preventing long documents from winning simply by being large). The k1=1.5 constant controls TF saturation and b=0.75 controls length normalisation strength — both are calibrated for typical document corpora. Understanding BM25 is essential for building hybrid retrieval systems where sparse (keyword) and dense (embedding) scores are combined.$exp_6$
WHERE title = 'Build a BM25 Keyword Scorer';

-- ── Exercise 7: Optimize a Slow RAG Pipeline ───────────────────────────────

UPDATE public.exercises SET
  hints = $hints_7$[
    {"level":1,"text":"Count how many times embed_text is called as a function of the number of documents and queries in the current implementation. Which calls are redundant across different queries?"},
    {"level":2,"text":"The inner loop calls embed_text(doc) for every query × every document — O(docs × queries) calls. Document embeddings do not change between queries. Can you compute and store them once before the query loop?"},
    {"level":3,"text":"Pre-compute: doc_embeddings = [(doc, embed_text(doc)) for doc in docs] before the query loop. Then inside the loop, only call embed_text(query) once per query. Total calls = len(docs) + len(queries) instead of len(docs) * len(queries)."}
  ]$hints_7$::jsonb,
  full_solution_code = $sol_7$def build_index_and_search(docs, queries):
    # Indexing phase: embed all documents once
    doc_embeddings = [(doc, embed_text(doc)) for doc in docs]

    results = []
    for query in queries:
        # Query phase: only one embed_text call per query
        query_emb = embed_text(query)
        scores = [
            (doc, cosine_similarity(query_emb, doc_emb))
            for doc, doc_emb in doc_embeddings
        ]
        scores.sort(key=lambda x: x[1], reverse=True)
        results.append(scores[0][0] if scores else None)

    return results
$sol_7$,
  concept_explanation = $exp_7$The indexing-vs-query phase distinction is fundamental to all search systems. Documents are indexed once and their embeddings stored; queries are processed at runtime against the pre-built index. Conflating the two phases — re-embedding documents on every query — turns an O(docs) one-time cost into an O(docs × queries) ongoing cost. For 100 documents and 5 queries, that's 500 vs 105 embedding calls — a 5× difference that scales to orders of magnitude in production. Vector databases like FAISS, Qdrant, and Pinecone enforce this separation automatically — but building the naive version first is a common interview mistake.$exp_7$
WHERE title = 'Optimize a Slow RAG Pipeline';

-- ── Exercise 8: Implement Retry with Exponential Backoff ───────────────────

UPDATE public.exercises SET
  hints = $hints_8$[
    {"level":1,"text":"Look at which exception types are being retried and what happens when max_retries is exhausted. Are all exceptions being retried, or only the transient ones?"},
    {"level":2,"text":"Only RateLimitError and ServerError should trigger a retry. Any other exception type (ValueError, TypeError, etc.) should be re-raised immediately. After exhausting all retries, raise the last caught exception — not a new generic one."},
    {"level":3,"text":"Pattern: for attempt in range(max_retries): try: return call_llm(prompt) except (RateLimitError, ServerError) as e: last_exc = e; time.sleep(base_delay * 2**attempt + random.uniform(0, 1)) except Exception: raise. After the loop: raise last_exc."}
  ]$hints_8$::jsonb,
  full_solution_code = $sol_8$def call_with_retry(prompt: str, max_retries: int = 3, base_delay: float = 1.0) -> str:
    last_exc = None
    for attempt in range(max_retries):
        try:
            return call_llm(prompt)
        except (RateLimitError, ServerError) as e:
            last_exc = e
            wait = base_delay * (2 ** attempt) + random.uniform(0, 1)
            time.sleep(wait)
        except Exception:
            raise
    raise last_exc
$sol_8$,
  concept_explanation = $exp_8$Exponential backoff with jitter is the production-standard approach for handling transient API failures. Exponential growth (1×, 2×, 4×, 8× base delay) gives the failing service progressively more recovery time. Jitter (random 0–1 second offset) prevents the thundering herd problem — where multiple clients retry in perfect synchrony and simultaneously flood a recovering service. Only catching and retrying specific transient error types is critical: retrying ValueError or TypeError would mask bugs, creating infinite retry loops on permanent failures. This pattern appears in every production LLM wrapper.$exp_8$
WHERE title = 'Implement Retry with Exponential Backoff';

-- ── Exercise 9: Parse Structured LLM Output ────────────────────────────────

UPDATE public.exercises SET
  hints = $hints_9$[
    {"level":1,"text":"The current code assumes the entire response string is valid JSON. LLM output often wraps JSON in markdown fences or precedes it with prose. How would you locate and extract a JSON object within a larger string?"},
    {"level":2,"text":"Try two strategies in order: (1) use a regex to strip markdown code fences (```json...``` or ```...```), returning the JSON inside. (2) If no fence, find the first { character and try to parse progressively shorter substrings working backwards from the end."},
    {"level":3,"text":"Fence extraction: re.search(r'```(?:json)?\\s*\\n?({.*?})\\s*\\n?```', text, re.DOTALL). Fallback: start = text.find('{'); then for end in range(len(text), start, -1): try json.loads(text[start:end]). Raise ValueError('No valid JSON found') if nothing parses."}
  ]$hints_9$::jsonb,
  full_solution_code = $sol_9$import json
import re

def extract_json(text: str) -> dict:
    # Handle markdown code fences: ```json\n{...}\n``` or ```\n{...}\n```
    fence_match = re.search(r'```(?:json)?\s*\n?({.*?})\s*\n?```', text, re.DOTALL)
    if fence_match:
        return json.loads(fence_match.group(1))

    # Find the first { and scan backwards for the longest valid JSON object
    start = text.find('{')
    if start == -1:
        raise ValueError("No valid JSON found")

    for end in range(len(text), start, -1):
        candidate = text[start:end]
        try:
            result = json.loads(candidate)
            if isinstance(result, dict):
                return result
        except json.JSONDecodeError:
            continue

    raise ValueError("No valid JSON found")
$sol_9$,
  concept_explanation = $exp_9$LLMs frequently return JSON wrapped in markdown code fences, preceded by an explanation sentence, or followed by a closing remark — making naive json.loads(response) fail in production. Robust parsers try fence extraction first (since models explicitly instructed to use them usually do), then fall back to a greedy brace scan that finds the first { and trims back from the end until it parses. The backwards scan is efficient because valid JSON nearly always ends at or near the last } in the text. Alternatively, use structured output via function calling or response_format={"type":"json_object"} — but knowing how to parse unstructured responses remains essential when those options are unavailable or when working with older models.$exp_9$
WHERE title = 'Parse Structured LLM Output';

-- ── Exercise 10: Manage Context Window Overflow ─────────────────────────────

UPDATE public.exercises SET
  hints = $hints_10$[
    {"level":1,"text":"The function currently returns all messages unchanged regardless of token count. Start by identifying which messages must always be kept and which can be safely dropped when the limit is exceeded."},
    {"level":2,"text":"Always anchor the system message (role='system') at position 0 — it defines the assistant's behaviour and must never be dropped. Then add as many recent messages as fit within max_tokens, working backwards from the end of the conversation."},
    {"level":3,"text":"Separate system vs non-system messages. Iterate reversed(others), prepending each to a result list if count_tokens(system + [msg] + result) <= max_tokens. Stop as soon as one doesn't fit. Return system + result. Edge case: if system alone exceeds max_tokens, return just [system_message]."}
  ]$hints_10$::jsonb,
  full_solution_code = $sol_10$def truncate_messages(messages: list[dict], max_tokens: int, count_tokens) -> list[dict]:
    # Separate system message from conversation
    system = [m for m in messages if m['role'] == 'system']
    others = [m for m in messages if m['role'] != 'system']

    # Edge case: system message alone exceeds limit
    if system and count_tokens(system) > max_tokens:
        return system[:]

    # Greedily add recent messages, working backwards
    result = []
    for msg in reversed(others):
        candidate = system + [msg] + result
        if count_tokens(candidate) <= max_tokens:
            result = [msg] + result
        else:
            break

    return system + result
$sol_10$,
  concept_explanation = $exp_10$Every chat assistant eventually hits the context window limit. The correct truncation strategy preserves two anchors: the system prompt (which defines the assistant's behaviour and persona — losing it changes how the model responds) and the most recent exchanges (which give immediate conversational context needed to answer the current question coherently). Dropping messages from the middle — oldest non-system messages first — is the standard approach. Naive truncation from the tail would destroy the most recent user question, breaking the immediate conversation. The greedy-backwards algorithm is O(n) and naturally handles the edge case where even without old messages the context is still too large.$exp_10$
WHERE title = 'Manage Context Window Overflow';
