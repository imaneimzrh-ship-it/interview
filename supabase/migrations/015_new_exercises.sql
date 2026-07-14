-- 015_new_exercises.sql
-- Expands exercise library: 2 new RAG, 4 Agent Orchestration, 4 Evaluation & Testing, 3 Production/MLOps
-- All use WHERE NOT EXISTS so safe to re-run.
-- expected values must be Python-eval-able strings or JSON arrays/objects (json.loads'd if starts with [ or {).

-- ══════════════════════════════════════════════════════════════════
-- RAG — 2 new exercises
-- ══════════════════════════════════════════════════════════════════

INSERT INTO public.exercises
  (role_track, title, task_description, starter_code, language,
   reference_solution_notes, test_cases, explanation_required, difficulty,
   topic_pillar, topic_tags, format, grading_mode,
   hints, full_solution_code, concept_explanation)
SELECT
  'ai_engineer',
  'Implement Hybrid BM25 + Vector Retrieval',
  E'Production RAG systems combine keyword (BM25) and semantic (vector) search to handle both exact-match queries and fuzzy semantic ones. You must implement `hybrid_search` that merges the two score types.\n\n**Your task:** Implement `hybrid_search` so that:\n1. Computes a vector cosine score and a raw BM25 score for every document\n2. Normalises BM25 scores to [0, 1] by dividing by the max BM25 in the result set\n3. Combines using linear interpolation: `score = alpha * vector_score + (1 - alpha) * norm_bm25`\n4. If all BM25 scores are 0 (no keyword overlap), falls back to pure vector scores\n5. Returns the top-`k` document IDs in descending score order\n\n`cosine_similarity` and `bm25_score` helpers are already provided — do not modify them.\n\n**Constraints:**\n- `alpha=1.0` must produce the same ranking as pure vector search\n- `alpha=0.0` must produce the same ranking as pure BM25 search\n- Ties broken arbitrarily',
  E'import math\n\ndef cosine_similarity(a: list[float], b: list[float]) -> float:\n    dot = sum(x * y for x, y in zip(a, b))\n    mag = math.sqrt(sum(x**2 for x in a)) * math.sqrt(sum(x**2 for x in b))\n    return dot / mag if mag else 0.0\n\ndef bm25_score(\n    query_terms: list[str], doc_terms: list[str],\n    df: dict, N: int, avgdl: float, k1: float = 1.5, b: float = 0.75\n) -> float:\n    """Raw BM25 score — already implemented, do not modify."""\n    if not query_terms or not doc_terms:\n        return 0.0\n    doc_len = len(doc_terms)\n    tf: dict = {}\n    for t in doc_terms:\n        tf[t] = tf.get(t, 0) + 1\n    score = 0.0\n    for t in query_terms:\n        n = df.get(t, 0)\n        if n == 0:\n            continue\n        idf = math.log((N - n + 0.5) / (n + 0.5) + 1)\n        f = tf.get(t, 0)\n        score += idf * (f * (k1 + 1)) / (f + k1 * (1 - b + b * doc_len / avgdl))\n    return score\n\ndef hybrid_search(\n    query_vec: list[float],\n    query_terms: list[str],\n    docs: list[dict],    # [{\"id\": str, \"embedding\": list[float], \"terms\": list[str]}]\n    df: dict,            # term -> document frequency in corpus\n    N: int,              # total docs in corpus\n    avgdl: float,        # average doc length\n    alpha: float = 0.5,  # weight for vector score; (1-alpha) for BM25\n    top_k: int = 3,\n) -> list[str]:          # doc IDs in descending score order\n    """\n    Combine BM25 and vector scores via linear interpolation.\n    Normalise BM25 to [0,1] before combining.\n    Fall back to vector-only if all BM25 scores are 0.\n    """\n    # TODO: implement hybrid_search\n    pass\n',
  'python',
  E'Reference solution:\n```python\ndef hybrid_search(query_vec, query_terms, docs, df, N, avgdl, alpha=0.5, top_k=3):\n    vec_scores = [cosine_similarity(query_vec, d["embedding"]) for d in docs]\n    raw_bm25   = [bm25_score(query_terms, d["terms"], df, N, avgdl) for d in docs]\n    max_bm25   = max(raw_bm25) if max(raw_bm25) > 0 else 0\n    use_bm25   = max_bm25 > 0\n    norm_bm25  = [s / max_bm25 for s in raw_bm25] if use_bm25 else [0.0] * len(docs)\n    scored = []\n    for i, doc in enumerate(docs):\n        score = alpha * vec_scores[i] + (1 - alpha) * norm_bm25[i] if use_bm25 else vec_scores[i]\n        scored.append((doc["id"], score))\n    scored.sort(key=lambda x: x[1], reverse=True)\n    return [doc_id for doc_id, _ in scored[:top_k]]\n```\nKey: normalise BM25 first (divide by max), only combine when max_bm25 > 0, alpha=1.0 must give identical order to pure cosine.',
  '[
    {
      "name": "alpha=1.0 gives pure vector ranking",
      "setup": "import math\ndocs = [\n  {\"id\": \"a\", \"embedding\": [1,0,0], \"terms\": [\"foo\"]},\n  {\"id\": \"b\", \"embedding\": [0,1,0], \"terms\": [\"bar\"]},\n  {\"id\": \"c\", \"embedding\": [0.9,0.1,0], \"terms\": [\"baz\"]}\n]\ndf = {\"foo\":1,\"bar\":1,\"baz\":1}\nquery_vec = [1,0,0]",
      "call": "hybrid_search(query_vec, [], docs, df, 3, 2.0, alpha=1.0, top_k=2)",
      "expected": "[\"a\", \"c\"]",
      "visible": true
    },
    {
      "name": "alpha=0.0 gives pure BM25 ranking",
      "setup": "import math\ndocs = [\n  {\"id\": \"a\", \"embedding\": [1,0,0], \"terms\": [\"rag\",\"rag\",\"rag\"]},\n  {\"id\": \"b\", \"embedding\": [0.9,0,0], \"terms\": [\"rag\"]},\n  {\"id\": \"c\", \"embedding\": [0.8,0,0], \"terms\": [\"other\"]}\n]\ndf = {\"rag\":2,\"other\":1}\nquery_terms = [\"rag\"]\nquery_vec = [1,0,0]",
      "call": "hybrid_search(query_vec, query_terms, docs, df, 3, 1.67, alpha=0.0, top_k=2)[0]",
      "expected": "\"a\"",
      "visible": true
    },
    {
      "name": "zero BM25 scores falls back to vector only",
      "setup": "import math\ndocs = [\n  {\"id\": \"a\", \"embedding\": [0.9,0.1], \"terms\": [\"foo\"]},\n  {\"id\": \"b\", \"embedding\": [0.1,0.9], \"terms\": [\"bar\"]}\n]\ndf = {}\nquery_vec = [1,0]\nquery_terms = [\"missing\"]",
      "call": "hybrid_search(query_vec, query_terms, docs, df, 2, 1.0, alpha=0.5, top_k=1)",
      "expected": "[\"a\"]",
      "visible": true
    },
    {
      "name": "returns correct top_k count",
      "setup": "import math\ndocs = [{\"id\": str(i), \"embedding\": [float(i),0], \"terms\": []} for i in range(10)]\ndf = {}\nquery_vec = [9,0]",
      "call": "len(hybrid_search(query_vec, [], docs, df, 10, 1.0, alpha=1.0, top_k=3))",
      "expected": "3",
      "visible": true
    },
    {
      "name": "hybrid alpha=0.5 re-ranks by combined score (hidden)",
      "setup": "import math\ndocs = [\n  {\"id\": \"keyword_winner\", \"embedding\": [0.5,0.5], \"terms\": [\"llm\",\"llm\",\"rag\",\"rag\",\"rag\"]},\n  {\"id\": \"vector_winner\",  \"embedding\": [1.0,0.0], \"terms\": [\"other\"]}\n]\ndf = {\"llm\":1,\"rag\":1,\"other\":1}\nquery_vec = [1,0]\nquery_terms = [\"rag\",\"llm\"]",
      "call": "hybrid_search(query_vec, query_terms, docs, df, 2, 3.0, alpha=0.5, top_k=2)",
      "expected": "[\"keyword_winner\", \"vector_winner\"]",
      "visible": false
    }
  ]'::jsonb,
  true,
  'medium',
  'rag',
  '["hybrid_retrieval","bm25","embeddings","reranking"]'::jsonb,
  'code',
  'test_cases',
  '[
    {"level":1,"text":"Think about what hybrid means here: you need two separate scores (vector cosine and BM25) for every document, then combine them. What does the combination formula look like when alpha=1.0 vs alpha=0.0?"},
    {"level":2,"text":"Compute all BM25 scores first, then find the max. Dividing every score by the max normalises them to [0,1]. If max is 0, skip normalisation and use vector scores only."},
    {"level":3,"text":"For each doc: vector_score = cosine_similarity(query_vec, doc[\"embedding\"]); raw_bm25 = bm25_score(...). Normalise: norm_bm25 = raw / max_bm25 (only if max > 0). Combined = alpha * vector + (1-alpha) * norm_bm25. Sort descending, return top-k IDs."}
  ]'::jsonb,
  $fs$def hybrid_search(query_vec, query_terms, docs, df, N, avgdl, alpha=0.5, top_k=3):
    vec_scores = [cosine_similarity(query_vec, d["embedding"]) for d in docs]
    raw_bm25   = [bm25_score(query_terms, d["terms"], df, N, avgdl) for d in docs]
    max_bm25   = max(raw_bm25) if max(raw_bm25) > 0 else 0
    use_bm25   = max_bm25 > 0
    norm_bm25  = [s / max_bm25 for s in raw_bm25] if use_bm25 else [0.0] * len(docs)
    scored = []
    for i, doc in enumerate(docs):
        score = alpha * vec_scores[i] + (1 - alpha) * norm_bm25[i] if use_bm25 else vec_scores[i]
        scored.append((doc["id"], score))
    scored.sort(key=lambda x: x[1], reverse=True)
    return [doc_id for doc_id, _ in scored[:top_k]]$fs$,
  'Hybrid retrieval combines the precision of keyword search (exact term matching via BM25) with the recall of semantic search (cosine similarity over dense vectors). Neither alone handles all query types: BM25 misses paraphrases, vector search misses exact product codes or rare proper nouns. Normalising BM25 before combining is essential — raw BM25 scores are unbounded and would dominate the interpolation without it.'
WHERE NOT EXISTS (SELECT 1 FROM public.exercises WHERE title = 'Implement Hybrid BM25 + Vector Retrieval');


INSERT INTO public.exercises
  (role_track, title, task_description, starter_code, language,
   reference_solution_notes, test_cases, explanation_required, difficulty,
   topic_pillar, topic_tags, format, grading_mode,
   hints, full_solution_code, concept_explanation)
SELECT
  'ai_engineer',
  'Fix a Stale Embedding Cache',
  E'A document embedding cache stores pre-computed embeddings to avoid re-calling the embedding API on every retrieval. But when a document''s content is updated, the cache must be invalidated — otherwise you retrieve stale embeddings that no longer represent the document.\n\n**The current implementation has two bugs:**\n1. It returns a cached embedding without checking if the document content has changed\n2. It stores the embedding without recording a content hash, so staleness can never be detected later\n\n**Your task:** Fix `get_or_compute_embedding` so that:\n1. It checks if the doc is cached **and** the stored hash matches `hashlib.md5(content.encode()).hexdigest()`\n2. If both match → return cached embedding (cache hit)\n3. If hash mismatch or doc not in cache → call `embed(content)`, store `{"embedding": ..., "hash": ...}`, return new embedding\n\nDo not modify the `embed` stub.',
  E'import hashlib\n\ndef embed(text: str) -> list[float]:\n    """Stub — do not modify."""\n    return [float(ord(c)) for c in text[:4]]\n\ndef get_or_compute_embedding(\n    doc_id: str,\n    content: str,\n    cache: dict,  # {doc_id: {"embedding": list[float], "hash": str}}\n) -> list[float]:\n    """\n    Return cached embedding if content is unchanged, else recompute.\n    Updates cache in place.\n    """\n    if doc_id in cache:                          # BUG 1: ignores content hash\n        return cache[doc_id]["embedding"]\n    embedding = embed(content)\n    cache[doc_id] = {"embedding": embedding}     # BUG 2: no hash stored\n    return embedding\n',
  'python',
  E'Fix:\n```python\ndef get_or_compute_embedding(doc_id, content, cache):\n    current_hash = hashlib.md5(content.encode()).hexdigest()\n    if doc_id in cache and cache[doc_id]["hash"] == current_hash:\n        return cache[doc_id]["embedding"]\n    embedding = embed(content)\n    cache[doc_id] = {"embedding": embedding, "hash": current_hash}\n    return embedding\n```\nBug 1: must compare stored hash to current hash — not just check key presence.\nBug 2: must store hash alongside embedding so future calls can detect staleness.',
  '[
    {
      "name": "cache hit — same content returns cached embedding",
      "setup": "import hashlib\ncache = {\"doc1\": {\"embedding\": [99.0, 99.0], \"hash\": hashlib.md5(\"hello\".encode()).hexdigest()}}",
      "call": "get_or_compute_embedding(\"doc1\", \"hello\", cache)",
      "expected": "[99.0, 99.0]",
      "visible": true
    },
    {
      "name": "cache miss — new doc is stored",
      "setup": "import hashlib\ncache = {}",
      "call": "get_or_compute_embedding(\"new_doc\", \"test\", cache) and (\"new_doc\" in cache)",
      "expected": "True",
      "visible": true
    },
    {
      "name": "stale cache — content changed triggers recompute",
      "setup": "import hashlib\nold_hash = hashlib.md5(\"old content\".encode()).hexdigest()\ncache = {\"doc1\": {\"embedding\": [42.0], \"hash\": old_hash}}",
      "call": "result = get_or_compute_embedding(\"doc1\", \"new content\", cache); result == [42.0]",
      "expected": "False",
      "visible": true
    },
    {
      "name": "hash is stored after compute",
      "setup": "import hashlib\ncache = {}",
      "call": "get_or_compute_embedding(\"d\", \"abc\", cache); cache[\"d\"][\"hash\"] == hashlib.md5(\"abc\".encode()).hexdigest()",
      "expected": "True",
      "visible": true
    },
    {
      "name": "repeated call with same content uses cache (hidden)",
      "setup": "import hashlib\ncache = {}\nget_or_compute_embedding(\"doc\", \"v2\", cache)\ne1 = get_or_compute_embedding(\"doc\", \"v2\", cache)",
      "call": "e2 = get_or_compute_embedding(\"doc\", \"v2\", cache); e1 == e2",
      "expected": "True",
      "visible": false
    }
  ]'::jsonb,
  true,
  'medium',
  'rag',
  '["caching","embeddings","indexing","staleness"]'::jsonb,
  'code',
  'test_cases',
  '[
    {"level":1,"text":"The function checks if the doc_id is in the cache — but it never checks whether the cached embedding is still valid. What information would you need to store alongside the embedding to detect staleness?"},
    {"level":2,"text":"A content hash (MD5 of the content string) stored alongside the embedding lets you detect changes. Use hashlib.md5(content.encode()).hexdigest(). If the stored hash does not equal the current hash, the cache is stale."},
    {"level":3,"text":"current_hash = hashlib.md5(content.encode()).hexdigest(). Cache hit condition: doc_id in cache AND cache[doc_id][\"hash\"] == current_hash. On miss: compute embedding, store {\"embedding\": ..., \"hash\": current_hash}."}
  ]'::jsonb,
  $fs$def get_or_compute_embedding(doc_id, content, cache):
    current_hash = hashlib.md5(content.encode()).hexdigest()
    if doc_id in cache and cache[doc_id]["hash"] == current_hash:
        return cache[doc_id]["embedding"]
    embedding = embed(content)
    cache[doc_id] = {"embedding": embedding, "hash": current_hash}
    return embedding$fs$,
  'Content-addressed caching is the standard pattern for embedding caches: instead of expiring by time, invalidate by content hash. This guarantees freshness without over-invalidation. MD5 is fast and collision-resistant enough for this purpose. The same pattern appears in vector database upsert logic — most production systems track document version hashes to avoid re-embedding unchanged content.'
WHERE NOT EXISTS (SELECT 1 FROM public.exercises WHERE title = 'Fix a Stale Embedding Cache');


-- ══════════════════════════════════════════════════════════════════
-- Agent Orchestration — 4 new exercises
-- ══════════════════════════════════════════════════════════════════

INSERT INTO public.exercises
  (role_track, title, task_description, starter_code, language,
   reference_solution_notes, test_cases, explanation_required, difficulty,
   topic_pillar, topic_tags, format, grading_mode,
   hints, full_solution_code, concept_explanation)
SELECT
  'ai_engineer',
  'Debug a Broken Tool-Call Validator',
  E'LLM agents call tools by generating a JSON payload with a tool name and arguments. Before executing, a validator checks the call against the tool''s schema. The current validator has **two bugs**:\n\n**Bug 1:** The required-field check looks in the wrong place — it checks whether the field exists in `properties` (it always does) instead of checking whether the caller actually passed it in `arguments`.\n\n**Bug 2:** When a type mismatch is detected, the function returns `(True, "")` — the exact opposite of what it should.\n\n**Your task:** Fix both bugs so `validate_tool_call` correctly returns:\n- `(True, "")` when the call is fully valid\n- `(False, <error message>)` for: unknown tool, missing required field, or wrong argument type\n\nDo not change the function signature or the type_map.',
  E'def validate_tool_call(\n    tool_call: dict,    # {"name": str, "arguments": dict}\n    tool_schema: dict,  # {"name": str, "properties": {field: {"type": str}}, "required": [str]}\n) -> tuple[bool, str]:\n    """\n    Returns (True, "") if valid.\n    Returns (False, error_message) if not.\n    """\n    name = tool_call.get("name")\n    args = tool_call.get("arguments", {})\n\n    if name != tool_schema["name"]:\n        return False, f"Unknown tool: {name}"\n\n    required   = tool_schema.get("required", [])\n    properties = tool_schema.get("properties", {})\n\n    for field in required:\n        if field not in properties:       # BUG 1: should check args, not properties\n            return False, f"Missing required field: {field}"\n\n    type_map = {"string": str, "integer": int, "boolean": bool, "number": (int, float)}\n    for field, value in args.items():\n        if field in properties:\n            expected = properties[field]["type"]\n            if not isinstance(value, type_map.get(expected, object)):\n                return True, ""           # BUG 2: should return False with error\n\n    return True, ""\n',
  'python',
  E'Fix:\n```python\n    for field in required:\n        if field not in args:      # FIX 1\n            return False, f"Missing required field: {field}"\n\n    for field, value in args.items():\n        if field in properties:\n            exp_type = properties[field]["type"]\n            if not isinstance(value, type_map.get(exp_type, object)):\n                return False, f"Field \'{field}\' expected {exp_type}, got {type(value).__name__}"  # FIX 2\n```\nBug 1: `field not in properties` is always False — check `args` instead.\nBug 2: returning True on type error is backwards; should be False with a descriptive message.',
  '[
    {
      "name": "valid call returns (True, empty string)",
      "setup": "schema = {\"name\": \"search\", \"properties\": {\"query\": {\"type\": \"string\"}, \"k\": {\"type\": \"integer\"}}, \"required\": [\"query\"]}",
      "call": "validate_tool_call({\"name\": \"search\", \"arguments\": {\"query\": \"rag\", \"k\": 5}}, schema)",
      "expected": "(True, \"\")",
      "visible": true
    },
    {
      "name": "missing required field returns (False, ...)",
      "setup": "schema = {\"name\": \"search\", \"properties\": {\"query\": {\"type\": \"string\"}}, \"required\": [\"query\"]}",
      "call": "validate_tool_call({\"name\": \"search\", \"arguments\": {}}, schema)[0]",
      "expected": "False",
      "visible": true
    },
    {
      "name": "wrong argument type returns (False, ...)",
      "setup": "schema = {\"name\": \"search\", \"properties\": {\"k\": {\"type\": \"integer\"}}, \"required\": [\"k\"]}",
      "call": "validate_tool_call({\"name\": \"search\", \"arguments\": {\"k\": \"five\"}}, schema)[0]",
      "expected": "False",
      "visible": true
    },
    {
      "name": "unknown tool name returns (False, ...)",
      "setup": "schema = {\"name\": \"search\", \"properties\": {}, \"required\": []}",
      "call": "validate_tool_call({\"name\": \"wrong_tool\", \"arguments\": {}}, schema)[0]",
      "expected": "False",
      "visible": true
    },
    {
      "name": "optional fields may be absent — still valid (hidden)",
      "setup": "schema = {\"name\": \"embed\", \"properties\": {\"text\": {\"type\": \"string\"}, \"model\": {\"type\": \"string\"}}, \"required\": [\"text\"]}",
      "call": "validate_tool_call({\"name\": \"embed\", \"arguments\": {\"text\": \"hello\"}}, schema)",
      "expected": "(True, \"\")",
      "visible": false
    }
  ]'::jsonb,
  true,
  'medium',
  'agent_orchestration',
  '["tool_use","validation","agents","debugging"]'::jsonb,
  'code',
  'test_cases',
  '[
    {"level":1,"text":"Read the required-field check carefully: what is it actually testing? It checks if each required field exists in the schema properties — but properties defines ALL possible fields. What should it be checking instead?"},
    {"level":2,"text":"Bug 1: check if the field is in args (the caller-supplied arguments), not in properties. Bug 2: when isinstance() returns False (type mismatch), the code returns True. What should it return instead?"},
    {"level":3,"text":"Fix 1: change `if field not in properties` to `if field not in args`. Fix 2: change the inner return to `return False, f\"Field {field} expected {exp_type}, got {type(value).__name__}\"`."}
  ]'::jsonb,
  $fs$def validate_tool_call(tool_call, tool_schema):
    name = tool_call.get("name")
    args = tool_call.get("arguments", {})
    if name != tool_schema["name"]:
        return False, f"Unknown tool: {name}"
    required   = tool_schema.get("required", [])
    properties = tool_schema.get("properties", {})
    for field in required:
        if field not in args:
            return False, f"Missing required field: {field}"
    type_map = {"string": str, "integer": int, "boolean": bool, "number": (int, float)}
    for field, value in args.items():
        if field in properties:
            exp_type = properties[field]["type"]
            if not isinstance(value, type_map.get(exp_type, object)):
                return False, f"Field '{field}' expected {exp_type}, got {type(value).__name__}"
    return True, ""$fs$,
  'Tool-call validation is a critical safety layer in agent systems — without it, malformed arguments cause silent failures or unpredictable tool behaviour. Both bugs here are logic inversions: checking the wrong collection and returning the wrong boolean. This class of bug often survives code review because the code looks plausible at a glance but fails every negative test case.'
WHERE NOT EXISTS (SELECT 1 FROM public.exercises WHERE title = 'Debug a Broken Tool-Call Validator');


INSERT INTO public.exercises
  (role_track, title, task_description, starter_code, language,
   reference_solution_notes, test_cases, explanation_required, difficulty,
   topic_pillar, topic_tags, format, grading_mode,
   hints, full_solution_code, concept_explanation)
SELECT
  'ai_engineer',
  'Fix an Agent State Handoff Bug',
  E'In a multi-agent pipeline, Agent A collects results from multiple tool calls and passes its state to Agent B via an `AgentHandoff` object. Agent B is supposed to see all the tool results — but it only ever sees the last one.\n\n**Your task:** Find and fix the bug in `AgentHandoff.record_result`.\n\nRequirements after fix:\n- Every call to `record_result` appends to the result list (not overwrites)\n- `get_handoff_context()` reflects all recorded results\n- `all_succeeded` is `False` if any result has `success=False`\n- `total_calls` equals the number of `record_result` calls made\n\nDo not change method signatures or the structure of the returned context dict.',
  E'class AgentHandoff:\n    """Accumulates Agent A''s tool results for handoff to Agent B."""\n\n    def __init__(self):\n        self.tool_results = []\n        self.metadata: dict = {}\n\n    def record_result(self, tool_name: str, result: str, success: bool = True):\n        self.tool_results = [{          # BUG: overwrites instead of appending\n            "tool": tool_name,\n            "result": result,\n            "success": success,\n        }]\n\n    def get_handoff_context(self) -> dict:\n        return {\n            "tool_results": self.tool_results,\n            "total_calls": len(self.tool_results),\n            "all_succeeded": all(r["success"] for r in self.tool_results),\n        }\n',
  'python',
  E'Fix: replace `self.tool_results = [{...}]` with `self.tool_results.append({...})`.\nUsing assignment with a list literal creates a new single-element list on every call, discarding all prior results. `.append()` adds to the existing list.',
  '[
    {
      "name": "single result — handoff has 1 entry",
      "setup": "h = AgentHandoff()\nh.record_result(\"search\", \"found 3 docs\")",
      "call": "len(h.get_handoff_context()[\"tool_results\"])",
      "expected": "1",
      "visible": true
    },
    {
      "name": "multiple results — total_calls is correct",
      "setup": "h = AgentHandoff()\nh.record_result(\"search\", \"docs\")\nh.record_result(\"embed\", \"vectors\")\nh.record_result(\"rerank\", \"ranked\")",
      "call": "h.get_handoff_context()[\"total_calls\"]",
      "expected": "3",
      "visible": true
    },
    {
      "name": "all_succeeded False when any failure",
      "setup": "h = AgentHandoff()\nh.record_result(\"search\", \"ok\")\nh.record_result(\"embed\", \"timeout\", success=False)",
      "call": "h.get_handoff_context()[\"all_succeeded\"]",
      "expected": "False",
      "visible": true
    },
    {
      "name": "all_succeeded True when all succeed",
      "setup": "h = AgentHandoff()\nh.record_result(\"a\", \"ok\")\nh.record_result(\"b\", \"ok\")",
      "call": "h.get_handoff_context()[\"all_succeeded\"]",
      "expected": "True",
      "visible": true
    },
    {
      "name": "results preserved in insertion order (hidden)",
      "setup": "h = AgentHandoff()\nfor i in range(5):\n    h.record_result(f\"tool_{i}\", f\"result_{i}\")",
      "call": "[r[\"tool\"] for r in h.get_handoff_context()[\"tool_results\"]]",
      "expected": "[\"tool_0\", \"tool_1\", \"tool_2\", \"tool_3\", \"tool_4\"]",
      "visible": false
    }
  ]'::jsonb,
  true,
  'easy',
  'agent_orchestration',
  '["multi_agent","state_management","handoff","debugging"]'::jsonb,
  'code',
  'test_cases',
  '[
    {"level":1,"text":"Look at the record_result method. After calling it three times, how many items does tool_results contain? Trace through the code — what does assigning to self.tool_results do on each call?"},
    {"level":2,"text":"self.tool_results = [{...}] creates a brand-new single-element list each time, replacing whatever was there before. Python list assignment replaces; you need the method that adds to the existing list."},
    {"level":3,"text":"Replace self.tool_results = [{...}] with self.tool_results.append({...}). The .append() method mutates the existing list in place, preserving all previous entries."}
  ]'::jsonb,
  $fs$class AgentHandoff:
    def __init__(self):
        self.tool_results = []
        self.metadata = {}

    def record_result(self, tool_name, result, success=True):
        self.tool_results.append({
            "tool": tool_name,
            "result": result,
            "success": success,
        })

    def get_handoff_context(self):
        return {
            "tool_results": self.tool_results,
            "total_calls": len(self.tool_results),
            "all_succeeded": all(r["success"] for r in self.tool_results),
        }$fs$,
  'State accumulation bugs (overwrite vs append) are common in agent pipelines where multiple tool calls must be tracked across an execution. The fix is straightforward but the impact is severe — Agent B received only the last tool result. In production multi-agent systems, always use integration tests that verify the full accumulated state after N tool calls, not just after one.'
WHERE NOT EXISTS (SELECT 1 FROM public.exercises WHERE title = 'Fix an Agent State Handoff Bug');


INSERT INTO public.exercises
  (role_track, title, task_description, starter_code, language,
   reference_solution_notes, test_cases, explanation_required, difficulty,
   topic_pillar, topic_tags, format, grading_mode,
   rubric_criteria)
SELECT
  'ai_engineer',
  'Design a Multi-Agent Memory Architecture',
  E'You are designing the memory layer for a production multi-agent system. Three agents operate concurrently:\n- **Researcher**: retrieves documents and stores findings\n- **Analyst**: reads Researcher findings and generates structured insights\n- **Writer**: reads Analyst insights and generates the final output\n\n**Scenario — the problem you need to solve:**\nIn the current system, each agent has only a local in-process dict for memory. This causes three production bugs:\n1. Agent A''s findings are lost if it crashes mid-run\n2. Analyst sometimes reads stale Researcher data (Researcher updated a finding but Analyst has the old version)\n3. Writer occasionally outputs duplicate content because it can''t tell what it already wrote in a previous run\n\n**Your task:** Design a memory architecture that fixes all three bugs. Your written response should cover:\n- What memory store(s) you would use (type, technology, why)\n- How reads/writes are coordinated across agents (locking, versioning, pub/sub, etc.)\n- How you handle the stale-read problem specifically\n- What failure modes remain and how you would mitigate them\n\nYou do not need to write code — describe the design in prose with enough implementation detail that an engineer could build it.',
  NULL,
  'text',
  E'Strong answer covers: (1) durable shared store (Redis, Postgres, or object store) instead of in-process dicts to survive crashes; (2) version/ETag on each record so Analyst can detect if Researcher updated since last read; (3) writer tracks completed output IDs in a persistent set (idempotency keys); (4) at least one failure mode acknowledged (e.g., write-after-read races, store unavailability) with a mitigation.',
  '[]'::jsonb,
  true,
  'hard',
  'agent_orchestration',
  '["multi_agent","memory","state_management","architecture"]'::jsonb,
  'open_ended',
  'rubric',
  '[
    {"name": "store_selection", "description": "Identifies a durable, shared memory store (not in-process) and justifies why it solves the crash-loss and cross-agent visibility problems."},
    {"name": "staleness_handling", "description": "Proposes a concrete mechanism for detecting and handling stale reads — e.g., versioning, ETags, read-your-writes, or change notifications."},
    {"name": "idempotency", "description": "Addresses the Writer duplicate-output problem with a specific idempotency approach (e.g., output IDs, completion flags, or a write-once key store)."},
    {"name": "failure_mode_awareness", "description": "Identifies at least one remaining failure mode (race condition, store unavailability, etc.) and proposes a mitigation rather than claiming the design is bulletproof."}
  ]'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM public.exercises WHERE title = 'Design a Multi-Agent Memory Architecture');


INSERT INTO public.exercises
  (role_track, title, task_description, starter_code, language,
   reference_solution_notes, test_cases, explanation_required, difficulty,
   topic_pillar, topic_tags, format, grading_mode,
   hints, full_solution_code, concept_explanation)
SELECT
  'ai_engineer',
  'Fix an Agent Memory Deduplication Bug',
  E'An agent maintains a working memory of facts it has learned. When it learns a new value for a key it already knows, it should **replace** the old fact — not accumulate duplicates. The current implementation always appends, causing the memory to grow unboundedly with stale entries.\n\n**Your task:** Fix `update_agent_memory` so that:\n1. If a fact with the same `key` already exists, replace it with the new fact\n2. If the key is new, append the fact\n3. Return the updated memory list\n4. Do not modify the input list — return a new list\n\nFact format: `{"key": str, "value": str, "timestamp": float}`',
  E'def update_agent_memory(\n    memory: list[dict],\n    new_fact: dict,           # {"key": str, "value": str, "timestamp": float}\n) -> list[dict]:\n    """\n    Add new_fact to memory, replacing any existing fact with the same key.\n    Returns a new list — do not modify the input.\n    """\n    memory.append(new_fact)    # BUG: appends even if key already exists; modifies input\n    return memory\n',
  'python',
  E'Fix:\n```python\ndef update_agent_memory(memory, new_fact):\n    return [f for f in memory if f["key"] != new_fact["key"]] + [new_fact]\n```\nFilter out any existing fact with the same key, then append the new one. The input list is never mutated.',
  '[
    {
      "name": "new key is appended",
      "setup": "mem = [{\"key\": \"user_name\", \"value\": \"Alice\", \"timestamp\": 1.0}]",
      "call": "result = update_agent_memory(mem, {\"key\": \"task\", \"value\": \"summarise\", \"timestamp\": 2.0}); len(result)",
      "expected": "2",
      "visible": true
    },
    {
      "name": "existing key is replaced not duplicated",
      "setup": "mem = [{\"key\": \"status\", \"value\": \"pending\", \"timestamp\": 1.0}]",
      "call": "[f[\"value\"] for f in update_agent_memory(mem, {\"key\": \"status\", \"value\": \"done\", \"timestamp\": 2.0}) if f[\"key\"] == \"status\"]",
      "expected": "[\"done\"]",
      "visible": true
    },
    {
      "name": "does not modify input list",
      "setup": "mem = [{\"key\": \"a\", \"value\": \"1\", \"timestamp\": 0.0}]",
      "call": "update_agent_memory(mem, {\"key\": \"a\", \"value\": \"2\", \"timestamp\": 1.0}); len(mem)",
      "expected": "1",
      "visible": true
    },
    {
      "name": "empty memory — fact is added",
      "setup": "",
      "call": "len(update_agent_memory([], {\"key\": \"goal\", \"value\": \"research\", \"timestamp\": 1.0}))",
      "expected": "1",
      "visible": true
    },
    {
      "name": "multiple updates to same key leave exactly one entry (hidden)",
      "setup": "m = []\nm = update_agent_memory(m, {\"key\": \"ctx\", \"value\": \"v1\", \"timestamp\": 1.0})\nm = update_agent_memory(m, {\"key\": \"ctx\", \"value\": \"v2\", \"timestamp\": 2.0})\nm = update_agent_memory(m, {\"key\": \"ctx\", \"value\": \"v3\", \"timestamp\": 3.0})",
      "call": "[f[\"value\"] for f in m if f[\"key\"] == \"ctx\"]",
      "expected": "[\"v3\"]",
      "visible": false
    }
  ]'::jsonb,
  true,
  'easy',
  'agent_orchestration',
  '["memory","agents","deduplication","state_management"]'::jsonb,
  'code',
  'test_cases',
  '[
    {"level":1,"text":"An agent memory should never grow unboundedly with duplicate keys — if you learn status: done after status: pending, only the latest should survive. The current code just appends. What operation would let you replace an existing entry?"},
    {"level":2,"text":"Filter out any existing fact with the same key before adding the new one. A list comprehension works well: [f for f in memory if f[\"key\"] != new_fact[\"key\"]]. Then concatenate the new fact."},
    {"level":3,"text":"return [f for f in memory if f[\"key\"] != new_fact[\"key\"]] + [new_fact]. This filters all old entries with the same key and appends the new one at the end. The input list is never modified."}
  ]'::jsonb,
  $fs$def update_agent_memory(memory, new_fact):
    return [f for f in memory if f["key"] != new_fact["key"]] + [new_fact]$fs$,
  'Agent working memory is a key-value store where facts get updated as the agent learns more. Unbounded append creates two problems: context bloat (old facts waste tokens) and inconsistency (the agent sees contradictory values for the same key). The filter-then-append pattern gives upsert semantics without a database.'
WHERE NOT EXISTS (SELECT 1 FROM public.exercises WHERE title = 'Fix an Agent Memory Deduplication Bug');


-- ══════════════════════════════════════════════════════════════════
-- Evaluation & Testing — 4 new exercises
-- ══════════════════════════════════════════════════════════════════

INSERT INTO public.exercises
  (role_track, title, task_description, starter_code, language,
   reference_solution_notes, test_cases, explanation_required, difficulty,
   topic_pillar, topic_tags, format, grading_mode,
   hints, full_solution_code, concept_explanation)
SELECT
  'ai_engineer',
  'Build an LLM-as-Judge Score Parser',
  E'LLM-as-judge pipelines use a language model to score candidate outputs against a rubric. The judge returns a free-text response that must be parsed into a numeric score. Real judge outputs are messy:\n\n- `"Score: 7/10"` → 7\n- `"I give this a 8 out of 10"` → 8\n- `"**Rating: 6**"` → 6\n- `"rating:9"` → 9\n- `"This response is completely wrong."` → raises ValueError\n\n**Your task:** Implement `parse_judge_score(text: str) -> int` that:\n1. Searches for a number between 1 and 10 (inclusive) associated with score/rating language\n2. Returns the first matching integer\n3. Raises `ValueError("No score found")` if no valid score is detected\n4. Returns only integer scores (no floats)\n\n**Constraints:** Use only the Python standard library (`re`).',
  E'import re\n\ndef parse_judge_score(text: str) -> int:\n    """\n    Extract a 1-10 integer score from a judge LLM''s text response.\n    Raises ValueError("No score found") if no score detected.\n    """\n    # TODO: implement score parsing\n    raise NotImplementedError\n',
  'python',
  E'Reference solution:\n```python\nimport re\n\ndef parse_judge_score(text):\n    patterns = [\n        r"(?:score|rating)\\s*[:\\-]?\\s*(10|[1-9])(?:/10)?",\n        r"give\\s+this\\s+a?\\s+(10|[1-9])(?:\\s+out\\s+of)?",\n        r"\\b(10|[1-9])\\s*/\\s*10\\b",\n        r"\\*\\*(10|[1-9])\\*\\*",\n    ]\n    for pattern in patterns:\n        m = re.search(pattern, text, re.IGNORECASE)\n        if m:\n            return int(m.group(1))\n    raise ValueError("No score found")\n```\nKey: try specific patterns before generic ones to avoid false positives. Always validate range 1-10.',
  '[
    {
      "name": "parses Score: N/10 format",
      "setup": "",
      "call": "parse_judge_score(\"Score: 7/10\")",
      "expected": "7",
      "visible": true
    },
    {
      "name": "parses give this a N format",
      "setup": "",
      "call": "parse_judge_score(\"I give this a 8 out of 10\")",
      "expected": "8",
      "visible": true
    },
    {
      "name": "parses bold rating format",
      "setup": "",
      "call": "parse_judge_score(\"**Rating: 6**\")",
      "expected": "6",
      "visible": true
    },
    {
      "name": "raises ValueError when no score found",
      "setup": "caught = False\ntry:\n    parse_judge_score(\"This response is completely wrong.\")\nexcept ValueError:\n    caught = True",
      "call": "caught",
      "expected": "True",
      "visible": true
    },
    {
      "name": "parses inline N/10 pattern (hidden)",
      "setup": "",
      "call": "parse_judge_score(\"The answer deserves 9/10 for accuracy.\")",
      "expected": "9",
      "visible": false
    }
  ]'::jsonb,
  true,
  'medium',
  'evaluation_testing',
  '["llm_as_judge","evaluation","parsing","reliability"]'::jsonb,
  'code',
  'test_cases',
  '[
    {"level":1,"text":"LLM judges use many different phrasings: Score: 7/10, I give this a 8, **Rating: 6**. A single regex won''t catch all of them. How would you try multiple patterns in sequence?"},
    {"level":2,"text":"Write separate regex patterns for each format. Use re.search() with re.IGNORECASE. Try patterns from most specific to most general. Return int(match.group(1)) on the first match."},
    {"level":3,"text":"Patterns to try: r\"(?:score|rating)\\s*[:\\-]?\\s*(10|[1-9])(?:/10)?\" for Score/Rating formats; r\"give\\s+this\\s+a?\\s+(10|[1-9])\" for natural language; r\"\\b(10|[1-9])\\s*/\\s*10\\b\" for N/10 inline. Raise ValueError if none match."}
  ]'::jsonb,
  $fs$import re

def parse_judge_score(text):
    patterns = [
        r"(?:score|rating)\s*[:\-]?\s*(10|[1-9])(?:/10)?",
        r"give\s+this\s+a?\s+(10|[1-9])(?:\s+out\s+of)?",
        r"\b(10|[1-9])\s*/\s*10\b",
        r"\*\*(10|[1-9])\*\*",
    ]
    for pattern in patterns:
        m = re.search(pattern, text, re.IGNORECASE)
        if m:
            return int(m.group(1))
    raise ValueError("No score found")$fs$,
  'LLM judges rarely produce perfectly structured output even when prompted to. Production parsing must handle the realistic distribution of judge outputs — which varies by model, prompt version, and temperature. Trying multiple patterns in priority order (most specific first) avoids false positives. Alternatively, use structured output (response_format or tool_use) to eliminate parsing entirely — but knowing how to parse unstructured scores remains essential for legacy integrations.'
WHERE NOT EXISTS (SELECT 1 FROM public.exercises WHERE title = 'Build an LLM-as-Judge Score Parser');


INSERT INTO public.exercises
  (role_track, title, task_description, starter_code, language,
   reference_solution_notes, test_cases, explanation_required, difficulty,
   topic_pillar, topic_tags, format, grading_mode,
   hints, full_solution_code, concept_explanation)
SELECT
  'ai_engineer',
  'Fix a Broken Regression Gate',
  E'A CI regression gate checks whether a new model version should be blocked from deploying. It compares each metric against a baseline and blocks the deploy if **any metric degrades by more than `threshold` (relative percentage)**.\n\nFor example, with `threshold=0.05` (5%):\n- baseline accuracy 0.80, new 0.75 → degradation of 6.25% → **block**\n- baseline accuracy 0.80, new 0.78 → degradation of 2.5% → allow\n- new metric is better than baseline → always allow\n\n**The current implementation has two bugs:**\n1. It computes absolute change instead of relative (percentage) change\n2. It blocks when the new score is **better**, not worse\n\n**Your task:** Fix `should_block_deploy` so it:\n- Computes relative degradation: `(baseline - new) / baseline`\n- Blocks if **any** metric degrades by more than `threshold`\n- Never blocks when a metric improves\n- Returns `(True, blocking_metric_name)` if blocked, `(False, "")` if allowed\n- Skips metrics where `baseline == 0` (avoid division by zero)',
  E'def should_block_deploy(\n    baseline: dict,   # {metric_name: float}\n    new_scores: dict, # {metric_name: float}\n    threshold: float = 0.05,\n) -> tuple[bool, str]:  # (should_block, reason)\n    """\n    Returns (True, metric_name) if any metric regressed beyond threshold.\n    Returns (False, "") if deploy is safe.\n    """\n    for metric, base_val in baseline.items():\n        new_val = new_scores.get(metric, base_val)\n        change = new_val - base_val          # BUG 1: absolute, not relative\n        if change > threshold:               # BUG 2: blocks on improvement, not degradation\n            return True, metric\n    return False, ""\n',
  'python',
  E'Fix:\n```python\ndef should_block_deploy(baseline, new_scores, threshold=0.05):\n    for metric, base_val in baseline.items():\n        if base_val == 0:\n            continue\n        new_val = new_scores.get(metric, base_val)\n        relative_degradation = (base_val - new_val) / base_val\n        if relative_degradation > threshold:\n            return True, metric\n    return False, ""\n```\nBug 1: `(baseline - new) / baseline` gives relative degradation.\nBug 2: check `>` on degradation (not on improvement).',
  '[
    {
      "name": "blocks when metric degrades beyond threshold",
      "setup": "",
      "call": "should_block_deploy({\"accuracy\": 0.80}, {\"accuracy\": 0.74}, threshold=0.05)[0]",
      "expected": "True",
      "visible": true
    },
    {
      "name": "allows when degradation is within threshold",
      "setup": "",
      "call": "should_block_deploy({\"accuracy\": 0.80}, {\"accuracy\": 0.78}, threshold=0.05)[0]",
      "expected": "False",
      "visible": true
    },
    {
      "name": "never blocks on improvement",
      "setup": "",
      "call": "should_block_deploy({\"f1\": 0.70}, {\"f1\": 0.85}, threshold=0.05)[0]",
      "expected": "False",
      "visible": true
    },
    {
      "name": "returns name of the blocking metric",
      "setup": "r = should_block_deploy({\"precision\": 0.90, \"recall\": 0.80}, {\"precision\": 0.89, \"recall\": 0.70}, threshold=0.05)",
      "call": "r[1]",
      "expected": "\"recall\"",
      "visible": true
    },
    {
      "name": "only metric c degrades — returns c (hidden)",
      "setup": "r = should_block_deploy({\"a\": 1.0, \"b\": 1.0, \"c\": 1.0}, {\"a\": 0.99, \"b\": 0.99, \"c\": 0.50}, threshold=0.05)",
      "call": "r[0] and r[1] == \"c\"",
      "expected": "True",
      "visible": false
    }
  ]'::jsonb,
  true,
  'medium',
  'evaluation_testing',
  '["regression_testing","ci_cd","evaluation","metrics"]'::jsonb,
  'code',
  'test_cases',
  '[
    {"level":1,"text":"Trace through the function with baseline={\"accuracy\": 0.80} and new={\"accuracy\": 0.74}. Should this block? What does the current code compute for change, and what does it compare against?"},
    {"level":2,"text":"Bug 1: the change is computed as new - baseline (absolute), but the threshold is a relative percentage (0.05 = 5%). You need (baseline - new) / baseline to get relative degradation. Bug 2: check if degradation > threshold, not if improvement > threshold."},
    {"level":3,"text":"relative_degradation = (base_val - new_val) / base_val. If relative_degradation > threshold: block. This is positive when new < baseline (worse), negative when new > baseline (better). Guard against base_val == 0 with a continue."}
  ]'::jsonb,
  $fs$def should_block_deploy(baseline, new_scores, threshold=0.05):
    for metric, base_val in baseline.items():
        if base_val == 0:
            continue
        new_val = new_scores.get(metric, base_val)
        relative_degradation = (base_val - new_val) / base_val
        if relative_degradation > threshold:
            return True, metric
    return False, ""$fs$,
  'Regression gates are the last automated safety check before a model change reaches production. Both bugs here cause the gate to be completely inverted — blocking good deploys and passing bad ones. Using relative degradation (not absolute) matters because a 0.05 drop on a 0.95-accuracy model is a 5.3% regression; the same drop on a 0.50-accuracy model is 10% — very different severity.'
WHERE NOT EXISTS (SELECT 1 FROM public.exercises WHERE title = 'Fix a Broken Regression Gate');


INSERT INTO public.exercises
  (role_track, title, task_description, starter_code, language,
   reference_solution_notes, test_cases, explanation_required, difficulty,
   topic_pillar, topic_tags, format, grading_mode,
   hints, full_solution_code, concept_explanation)
SELECT
  'ai_engineer',
  'Implement a Hallucination Detector',
  E'A hallucination detector checks whether an LLM''s answer is supported by the source documents. A simple but effective approach: check that key phrases from the answer appear verbatim in at least one source document.\n\n**Your task:** Implement `detect_hallucination` that:\n1. Tokenises the answer into overlapping n-grams (lengths 2 to `n` words)\n2. For each n-gram, checks if it appears verbatim in any source document (case-insensitive)\n3. Counts how many n-grams from the answer are **not** supported by any source\n4. Returns `{"unsupported_count": int, "supported_count": int, "hallucination_score": float}` where `hallucination_score = unsupported / total_ngrams` (0.0 = fully grounded, 1.0 = nothing supported)\n5. If the answer has no n-grams at all, return all zeros\n\n**Constraints:**\n- Use only the standard library\n- `n=3` means check bigrams and trigrams (sizes 2 and 3)\n- Comparison is case-insensitive',
  E'def detect_hallucination(\n    answer: str,\n    sources: list[str],\n    n: int = 3,\n) -> dict:\n    """\n    Returns {"unsupported_count": int, "supported_count": int, "hallucination_score": float}.\n    hallucination_score = unsupported / total (0.0 = fully grounded).\n    """\n    # TODO: implement hallucination detection via n-gram overlap\n    raise NotImplementedError\n',
  'python',
  E'Reference solution:\n```python\ndef detect_hallucination(answer, sources, n=3):\n    words = answer.lower().split()\n    sources_lower = " ".join(s.lower() for s in sources)\n    ngrams = []\n    for size in range(2, n + 1):\n        for i in range(len(words) - size + 1):\n            ngrams.append(" ".join(words[i:i+size]))\n    if not ngrams:\n        return {"unsupported_count": 0, "supported_count": 0, "hallucination_score": 0.0}\n    supported = sum(1 for ng in ngrams if ng in sources_lower)\n    unsupported = len(ngrams) - supported\n    return {\n        "unsupported_count": unsupported,\n        "supported_count": supported,\n        "hallucination_score": round(unsupported / len(ngrams), 4),\n    }\n```',
  '[
    {
      "name": "fully grounded answer has score 0.0",
      "setup": "",
      "call": "detect_hallucination(\"the cat sat on the mat\", [\"the cat sat on the mat\"], n=3)[\"hallucination_score\"]",
      "expected": "0.0",
      "visible": true
    },
    {
      "name": "unsupported answer has score > 0",
      "setup": "score = detect_hallucination(\"Paris is the capital of Germany\", [\"Berlin is the capital of Germany\"], n=3)[\"hallucination_score\"]",
      "call": "score > 0",
      "expected": "True",
      "visible": true
    },
    {
      "name": "empty answer returns all zeros",
      "setup": "",
      "call": "detect_hallucination(\"\", [\"some source document\"], n=3)",
      "expected": "{\"unsupported_count\": 0, \"supported_count\": 0, \"hallucination_score\": 0.0}",
      "visible": true
    },
    {
      "name": "counts add up to total ngrams",
      "setup": "r = detect_hallucination(\"the model returns an answer\", [\"the model\"], n=3)",
      "call": "r[\"supported_count\"] + r[\"unsupported_count\"] > 0",
      "expected": "True",
      "visible": true
    },
    {
      "name": "case-insensitive matching (hidden)",
      "setup": "",
      "call": "detect_hallucination(\"The RAG Pipeline\", [\"the rag pipeline is fast\"], n=2)[\"hallucination_score\"]",
      "expected": "0.0",
      "visible": false
    }
  ]'::jsonb,
  true,
  'hard',
  'evaluation_testing',
  '["hallucination","evaluation","llm_as_judge","reliability"]'::jsonb,
  'code',
  'test_cases',
  '[
    {"level":1,"text":"The function should check whether phrases from the answer appear in the source documents. Start by splitting the answer into words, then think about what size of phrases (n-grams) you want to check."},
    {"level":2,"text":"Generate all n-grams of size 2 through n from the answer words. For each n-gram, check if it appears as a substring in the concatenated source text (lowercased). Count supported vs unsupported."},
    {"level":3,"text":"words = answer.lower().split(). For size in range(2, n+1): for i in range(len(words)-size+1): ngrams.append(\" \".join(words[i:i+size])). sources_lower = \" \".join(s.lower() for s in sources). supported = sum(1 for ng in ngrams if ng in sources_lower)."}
  ]'::jsonb,
  $fs$def detect_hallucination(answer, sources, n=3):
    words = answer.lower().split()
    sources_lower = " ".join(s.lower() for s in sources)
    ngrams = []
    for size in range(2, n + 1):
        for i in range(len(words) - size + 1):
            ngrams.append(" ".join(words[i:i+size]))
    if not ngrams:
        return {"unsupported_count": 0, "supported_count": 0, "hallucination_score": 0.0}
    supported   = sum(1 for ng in ngrams if ng in sources_lower)
    unsupported = len(ngrams) - supported
    return {
        "unsupported_count": unsupported,
        "supported_count": supported,
        "hallucination_score": round(unsupported / len(ngrams), 4),
    }$fs$,
  'N-gram overlap is the simplest grounding check: if a phrase from the answer does not appear verbatim in any source, it may be hallucinated. This is a conservative heuristic — it flags paraphrases as unsupported even when semantically correct. Production systems use semantic similarity or NLI models for higher precision. N-gram overlap works as a fast, cheap first pass and is useful for attribution debugging.'
WHERE NOT EXISTS (SELECT 1 FROM public.exercises WHERE title = 'Implement a Hallucination Detector');


INSERT INTO public.exercises
  (role_track, title, task_description, starter_code, language,
   reference_solution_notes, test_cases, explanation_required, difficulty,
   topic_pillar, topic_tags, format, grading_mode,
   rubric_criteria)
SELECT
  'ai_engineer',
  'Diagnose an Eval Coverage Gap',
  E'Your team built an offline evaluation suite for a RAG-based Q&A assistant. The suite scores 91% accuracy in CI. But after deploying, users report frequent wrong answers on questions about recent product updates (anything from the last 3 months).\n\n**The evaluation setup:**\n- 500 QA pairs drawn from the knowledge base snapshot taken 6 months ago\n- Retrieval uses cosine similarity against embeddings computed at index-build time\n- Judge: GPT-4o scores each answer 1-10 against the reference answer\n- Threshold: average score ≥ 7 passes\n\n**Observed in production:**\n- Users asking about last quarter''s pricing changes get answers about old pricing\n- Questions about a newly deprecated API endpoint get confident (wrong) answers\n- The eval suite passes at 91% with no alerts\n\n**Your task:** In prose (no code required), identify:\n1. What systematic gap in the eval suite allowed the 91% to pass while production fails\n2. Why the retrieval component is part of the problem, not just the generation step\n3. What two concrete changes to the eval methodology would catch this class of failure in future\n4. What a "data freshness" metric would look like and why it belongs in the CI gate',
  NULL,
  'text',
  E'Strong answer covers: (1) eval dataset is 6-month-old static snapshot — doesn''t cover recent product changes, so high offline score is meaningless for fresh queries; (2) embeddings are stale — new product docs not in the index, so retrieval returns old docs confidently; (3) eval change 1: add a "freshness cohort" to the eval set drawn from the last 30 days; eval change 2: test retrieval recall@k explicitly (not just end-to-end answer quality); (4) data freshness metric: % of eval questions whose gold-answer source document was indexed within the last N days.',
  '[]'::jsonb,
  true,
  'hard',
  'evaluation_testing',
  '["evaluation","offline_eval","data_freshness","rag","systematic_bias"]'::jsonb,
  'open_ended',
  'rubric',
  '[
    {"name": "gap_identification", "description": "Correctly identifies that the eval set is a static historical snapshot and does not cover queries about recent changes — and connects this to why 91% offline accuracy is misleading."},
    {"name": "retrieval_diagnosis", "description": "Explains why the retrieval layer is a root cause: stale embeddings mean new documents are not retrievable, so the generator is working from an incomplete index — not just generating bad answers from good context."},
    {"name": "concrete_eval_fixes", "description": "Proposes two specific, actionable eval methodology changes — not vague suggestions. At minimum: a freshness-stratified eval cohort AND retrieval-quality metrics (recall@k, MRR) tested independently of generation quality."},
    {"name": "freshness_metric_design", "description": "Describes a concrete data freshness metric that could be added to the CI gate — what it measures, how it is computed, and why a threshold on it would have caught this failure."}
  ]'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM public.exercises WHERE title = 'Diagnose an Eval Coverage Gap');


-- ══════════════════════════════════════════════════════════════════
-- Production / MLOps — 3 new exercises
-- ══════════════════════════════════════════════════════════════════

INSERT INTO public.exercises
  (role_track, title, task_description, starter_code, language,
   reference_solution_notes, test_cases, explanation_required, difficulty,
   topic_pillar, topic_tags, format, grading_mode,
   hints, full_solution_code, concept_explanation)
SELECT
  'ai_engineer',
  'Fix a Broken Distributed Trace',
  E'Your LLM pipeline uses OpenTelemetry-style distributed tracing to link spans across components. Each component receives a `parent_context` and should create a child span that carries that context forward. The current implementation has **four bugs** that break the trace graph:\n\n1. Child spans generate a new `trace_id` — every span appears as a root span in the trace viewer\n2. Child spans set `parent_id = None` — the parent-child link is missing\n3. Child spans set `depth = 0` — nesting depth never increments\n4. The propagation headers only carry `trace_id` — downstream services cannot reconstruct the parent link\n\n**Your task:** Fix `create_child_span` and `get_propagation_headers` so that:\n- `create_child_span` inherits `trace_id`, links to the parent via `parent_id`, and increments `depth`\n- `get_propagation_headers` returns both `X-Trace-Id` and `X-Span-Id`\n\nThe `Span` dataclass and `SpanContext` type are provided — do not modify them.',
  E'from dataclasses import dataclass, field\nimport uuid\n\n@dataclass\nclass Span:\n    name: str\n    trace_id: str\n    span_id: str\n    parent_id: str | None\n    depth: int\n    attributes: dict = field(default_factory=dict)\n\nSpanContext = dict  # {"trace_id": str, "span_id": str, "depth": int}\n\ndef create_child_span(name: str, parent_context: SpanContext) -> Span:\n    """\n    Create a child span linked to parent_context.\n    Child inherits trace_id, sets parent_id, increments depth by 1.\n    """\n    return Span(\n        name=name,\n        trace_id=str(uuid.uuid4()),   # BUG 1: should inherit parent trace_id\n        span_id=str(uuid.uuid4()),\n        parent_id=None,               # BUG 2: should be parent_context["span_id"]\n        depth=0,                      # BUG 3: should be parent depth + 1\n    )\n\ndef get_propagation_headers(span: Span) -> dict:\n    """\n    Return HTTP headers for propagating trace context to downstream services.\n    """\n    return {"X-Trace-Id": span.trace_id}  # BUG 4: missing X-Span-Id\n',
  'python',
  E'Fix:\n```python\ndef create_child_span(name, parent_context):\n    return Span(\n        name=name,\n        trace_id=parent_context["trace_id"],    # inherit\n        span_id=str(uuid.uuid4()),\n        parent_id=parent_context["span_id"],    # link\n        depth=parent_context["depth"] + 1,     # increment\n    )\n\ndef get_propagation_headers(span):\n    return {\n        "X-Trace-Id": span.trace_id,\n        "X-Span-Id": span.span_id,\n    }\n```\nAll 4 bugs relate to incomplete context propagation. trace_id must be inherited to keep spans in the same trace. parent_id links the graph. depth tracks nesting. Both headers are needed for downstream reconstruction.',
  '[
    {
      "name": "child inherits parent trace_id",
      "setup": "ctx = {\"trace_id\": \"trace-abc\", \"span_id\": \"span-001\", \"depth\": 0}",
      "call": "create_child_span(\"retrieval\", ctx).trace_id",
      "expected": "\"trace-abc\"",
      "visible": true
    },
    {
      "name": "child parent_id matches parent span_id",
      "setup": "ctx = {\"trace_id\": \"trace-abc\", \"span_id\": \"span-001\", \"depth\": 0}",
      "call": "create_child_span(\"embed\", ctx).parent_id",
      "expected": "\"span-001\"",
      "visible": true
    },
    {
      "name": "child depth is parent depth + 1",
      "setup": "ctx = {\"trace_id\": \"t\", \"span_id\": \"s\", \"depth\": 2}",
      "call": "create_child_span(\"llm_call\", ctx).depth",
      "expected": "3",
      "visible": true
    },
    {
      "name": "propagation headers include both trace and span id",
      "setup": "span = Span(name=\"test\", trace_id=\"t-1\", span_id=\"s-1\", parent_id=None, depth=0)",
      "call": "headers = get_propagation_headers(span); \"X-Trace-Id\" in headers and \"X-Span-Id\" in headers",
      "expected": "True",
      "visible": true
    },
    {
      "name": "three-level trace has correct depth and links (hidden)",
      "setup": "root_ctx = {\"trace_id\": \"root\", \"span_id\": \"r0\", \"depth\": 0}\nchild = create_child_span(\"a\", root_ctx)\nchild_ctx = {\"trace_id\": child.trace_id, \"span_id\": child.span_id, \"depth\": child.depth}\ngrandchild = create_child_span(\"b\", child_ctx)",
      "call": "grandchild.trace_id == \"root\" and grandchild.depth == 2 and grandchild.parent_id == child.span_id",
      "expected": "True",
      "visible": false
    }
  ]'::jsonb,
  true,
  'hard',
  'production_mlops',
  '["observability","tracing","opentelemetry","debugging"]'::jsonb,
  'code',
  'test_cases',
  '[
    {"level":1,"text":"Look at all four values set in create_child_span. Which values should be inherited from the parent vs generated fresh? What does a downstream service need from the headers to reconstruct the parent link?"},
    {"level":2,"text":"A child span must share the parent trace_id (they are in the same trace), set parent_id to the parent span_id (linking them), and increment depth. The headers must carry both trace_id AND span_id — downstream needs span_id to set its own parent_id."},
    {"level":3,"text":"create_child_span: trace_id=parent_context[\"trace_id\"], parent_id=parent_context[\"span_id\"], depth=parent_context[\"depth\"]+1. get_propagation_headers: return {\"X-Trace-Id\": span.trace_id, \"X-Span-Id\": span.span_id}."}
  ]'::jsonb,
  $fs$def create_child_span(name, parent_context):
    return Span(
        name=name,
        trace_id=parent_context["trace_id"],
        span_id=str(uuid.uuid4()),
        parent_id=parent_context["span_id"],
        depth=parent_context["depth"] + 1,
    )

def get_propagation_headers(span):
    return {
        "X-Trace-Id": span.trace_id,
        "X-Span-Id": span.span_id,
    }$fs$,
  'Distributed tracing in LLM pipelines (OpenTelemetry, LangSmith, Arize) works by propagating a trace context across every component. If a child span is created with a new trace_id, the trace graph is broken — components appear disconnected. Missing span_id in propagation headers means downstream services cannot set their parent_id. These are the two most common tracing implementation bugs and they are invisible without end-to-end trace visualisation.'
WHERE NOT EXISTS (SELECT 1 FROM public.exercises WHERE title = 'Fix a Broken Distributed Trace');


INSERT INTO public.exercises
  (role_track, title, task_description, starter_code, language,
   reference_solution_notes, test_cases, explanation_required, difficulty,
   topic_pillar, topic_tags, format, grading_mode,
   hints, full_solution_code, concept_explanation)
SELECT
  'ai_engineer',
  'Implement an LLM Input Guardrail',
  E'Before passing user input to an LLM, a guardrail layer checks for policy violations and sanitises the request. The current implementation has a critical logic bug: it incorrectly allows violating inputs through and blocks clean ones.\n\n**Guardrail rules (in priority order):**\n1. If input contains any string from `blocked_patterns`, reject with `{"allowed": false, "reason": "policy_violation", "matched": pattern}`\n2. If input length exceeds `max_chars`, reject with `{"allowed": false, "reason": "too_long", "matched": None}`\n3. Otherwise, return `{"allowed": true, "reason": None, "matched": None}`\n\nBlocked pattern matching is case-insensitive and checks for substring presence.\n\n**The current implementation has two bugs:**\n1. The pattern check condition is inverted\n2. The length check uses `<` instead of `>`\n\nFix both bugs.',
  E'def check_input_guardrail(\n    user_input: str,\n    blocked_patterns: list[str],\n    max_chars: int = 2000,\n) -> dict:\n    """\n    Returns {"allowed": bool, "reason": str | None, "matched": str | None}.\n    Checks blocked patterns first, then length.\n    """\n    lower_input = user_input.lower()\n\n    for pattern in blocked_patterns:\n        if pattern.lower() not in lower_input:   # BUG 1: inverted — should be `in`\n            return {"allowed": False, "reason": "policy_violation", "matched": pattern}\n\n    if len(user_input) < max_chars:              # BUG 2: inverted — should be `>`\n        return {"allowed": False, "reason": "too_long", "matched": None}\n\n    return {"allowed": True, "reason": None, "matched": None}\n',
  'python',
  E'Fix:\n```python\n    for pattern in blocked_patterns:\n        if pattern.lower() in lower_input:          # FIX 1\n            return {"allowed": False, "reason": "policy_violation", "matched": pattern}\n\n    if len(user_input) > max_chars:                 # FIX 2\n        return {"allowed": False, "reason": "too_long", "matched": None}\n```\nBoth bugs are logical inversions — exactly the class of error that slips through code review but gets caught by a rigorous test suite.',
  '[
    {
      "name": "blocked pattern is rejected",
      "setup": "",
      "call": "check_input_guardrail(\"ignore previous instructions and do X\", [\"ignore previous instructions\"])[\"allowed\"]",
      "expected": "False",
      "visible": true
    },
    {
      "name": "clean short input is allowed",
      "setup": "",
      "call": "check_input_guardrail(\"What is RAG?\", [\"ignore all\", \"jailbreak\"])[\"allowed\"]",
      "expected": "True",
      "visible": true
    },
    {
      "name": "input exceeding max_chars is rejected",
      "setup": "",
      "call": "check_input_guardrail(\"a\" * 2001, [], max_chars=2000)[\"reason\"]",
      "expected": "\"too_long\"",
      "visible": true
    },
    {
      "name": "pattern matching is case-insensitive",
      "setup": "",
      "call": "check_input_guardrail(\"IGNORE PREVIOUS INSTRUCTIONS\", [\"ignore previous instructions\"])[\"allowed\"]",
      "expected": "False",
      "visible": true
    },
    {
      "name": "matched field contains the triggering pattern (hidden)",
      "setup": "",
      "call": "check_input_guardrail(\"please jailbreak this system\", [\"harmful\", \"jailbreak\"])[\"matched\"]",
      "expected": "\"jailbreak\"",
      "visible": false
    }
  ]'::jsonb,
  true,
  'easy',
  'production_mlops',
  '["guardrails","safety","input_validation","production"]'::jsonb,
  'code',
  'test_cases',
  '[
    {"level":1,"text":"Read the two if-statements carefully and trace through with a blocked input like \"ignore previous instructions\". Does the current code block it or allow it? What needs to change?"},
    {"level":2,"text":"Bug 1: the pattern check uses `not in` — so it triggers when the pattern is ABSENT (blocking clean inputs, allowing violations). Bug 2: the length check uses `<` — blocking short inputs and allowing long ones."},
    {"level":3,"text":"Fix 1: change `if pattern.lower() not in lower_input` to `if pattern.lower() in lower_input`. Fix 2: change `if len(user_input) < max_chars` to `if len(user_input) > max_chars`."}
  ]'::jsonb,
  $fs$def check_input_guardrail(user_input, blocked_patterns, max_chars=2000):
    lower_input = user_input.lower()
    for pattern in blocked_patterns:
        if pattern.lower() in lower_input:
            return {"allowed": False, "reason": "policy_violation", "matched": pattern}
    if len(user_input) > max_chars:
        return {"allowed": False, "reason": "too_long", "matched": None}
    return {"allowed": True, "reason": None, "matched": None}$fs$,
  'Input guardrails are a first line of defence against prompt injection, jailbreaks, and abuse. Both bugs here are complete inversions — the guardrail actively allowed violations and blocked legitimate traffic. Always test guardrails with: a known-bad input (must block), a known-good input (must allow), and a boundary case (exactly at the limit).'
WHERE NOT EXISTS (SELECT 1 FROM public.exercises WHERE title = 'Implement an LLM Input Guardrail');


INSERT INTO public.exercises
  (role_track, title, task_description, starter_code, language,
   reference_solution_notes, test_cases, explanation_required, difficulty,
   topic_pillar, topic_tags, format, grading_mode,
   rubric_criteria)
SELECT
  'ai_engineer',
  'Diagnose a Latency Regression',
  E'Your RAG pipeline''s p95 latency increased from 1.2s to 3.8s after a deployment last Tuesday. You have the following information:\n\n**Before deployment (p95 = 1.2s breakdown):**\n- Embedding API call: ~80ms\n- Vector DB retrieval (top-5): ~120ms\n- LLM generation (gpt-4o-mini, ~400 tokens): ~900ms\n- Post-processing + response serialisation: ~50ms\n\n**After deployment (p95 = 3.8s breakdown from traces):**\n- Embedding API call: ~82ms (unchanged)\n- Vector DB retrieval (top-5): ~1,800ms ← large increase\n- LLM generation (gpt-4o-mini, ~400 tokens): ~1,850ms ← large increase\n- Post-processing: ~68ms (roughly unchanged)\n\n**Changes deployed last Tuesday:**\n- Bumped top-k from 5 to 20 in the retrieval config\n- Added a re-ranking step (cross-encoder) that runs after retrieval, before generation\n- Switched from async to sync HTTP client for the LLM API call\n- Updated the prompt template to include all 20 retrieved chunks in the context\n\n**Your task:** Write a diagnosis that:\n1. Identifies the specific change(s) responsible for each of the two latency increases (vector DB and LLM generation)\n2. Explains the causal mechanism — why each change causes the observed latency pattern\n3. Proposes a concrete fix for each, with the expected latency impact\n4. Recommends one monitoring/alerting change that would catch this earlier in future deployments',
  NULL,
  'text',
  E'Root causes: (1) Vector DB spike: top-k=20 expands the ANN search scope, AND the cross-encoder re-ranking adds N inference passes (20 vs 5). Both compound. (2) LLM generation spike: 20 chunks in context = ~4x more input tokens = proportionally longer generation time; plus the sync HTTP client blocks the event loop, adding queuing latency. Fixes: (1) reduce top-k for ANN to ~8-10, apply cross-encoder only to top-5 candidates; (2) restore async HTTP client, cap context to a fixed token budget. Monitoring: track p95 per stage in CI load tests with a threshold alert if any stage exceeds 2x baseline.',
  '[]'::jsonb,
  true,
  'hard',
  'production_mlops',
  '["latency","observability","debugging","production","performance"]'::jsonb,
  'open_ended',
  'rubric',
  '[
    {"name": "vector_db_diagnosis", "description": "Correctly identifies that BOTH top-k=20 AND the cross-encoder re-ranking step cause the vector DB latency increase — and explains why (larger ANN search scope + N cross-encoder inference passes instead of 5)."},
    {"name": "llm_latency_diagnosis", "description": "Correctly attributes the LLM latency increase to two compounding factors: more input tokens from 20 chunks (longer generation) AND the sync-to-async regression (blocking/queuing overhead) — not just one of the two."},
    {"name": "concrete_fixes", "description": "Proposes specific, actionable fixes for each root cause — not vague advice. Must include: a specific top-k value or re-ranking scope change, AND restoring async client or a specific token-budget change."},
    {"name": "monitoring_recommendation", "description": "Recommends a per-stage latency metric (not just end-to-end p95) with a specific threshold or alerting mechanism that would catch stage-level regressions before they reach production."}
  ]'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM public.exercises WHERE title = 'Diagnose a Latency Regression');
