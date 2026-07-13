-- Migration 010: 2 new exercises — build-from-scratch + open-ended optimization
-- Run in Supabase SQL Editor after 008 and 009

-- ─── Exercise 6: Build From Scratch — implement basic RAG retrieval ──────────
INSERT INTO public.exercises (role_track, title, task_description, starter_code, language, reference_solution_notes, test_cases, explanation_required, difficulty)
VALUES (
  'ai_engineer',
  'Build a BM25 Keyword Scorer',
  E'BM25 is the ranking function used by ElasticSearch and most hybrid RAG pipelines. It scores how relevant a document is to a query based on term frequency and inverse document frequency.\n\n**Your task:** Implement `bm25_score(query_terms, doc_terms, corpus_doc_counts, total_docs)` from scratch.\n\nFormula for each term t in the query:\n```\nIDF(t) = ln((N - df(t) + 0.5) / (df(t) + 0.5) + 1)\nTF(t) = (freq(t, d) * (k1 + 1)) / (freq(t, d) + k1 * (1 - b + b * |d| / avgdl))\nscore += IDF(t) * TF(t)\n```\n\nWhere:\n- `N` = total number of documents\n- `df(t)` = number of documents containing term t (`corpus_doc_counts[t]`)\n- `freq(t, d)` = count of term t in the document\n- `|d|` = length of document (number of terms)\n- `avgdl` = average document length across all docs = sum of all doc lengths / N\n- `k1 = 1.5`, `b = 0.75` (constants)\n\n**Assumptions:**\n- All inputs are lowercase, pre-tokenized lists of strings\n- `corpus_doc_counts` is a dict of `{term: count_of_docs_containing_term}`\n- `avgdl` is passed directly as a parameter (pre-computed)\n- Return 0.0 if query_terms or doc_terms is empty',
  E'import math\n\ndef bm25_score(\n    query_terms: list[str],\n    doc_terms: list[str],\n    corpus_doc_counts: dict[str, int],\n    total_docs: int,\n    avgdl: float,\n    k1: float = 1.5,\n    b: float = 0.75,\n) -> float:\n    """\n    Compute BM25 relevance score for a single document against a query.\n\n    Args:\n        query_terms: tokenized query (lowercase)\n        doc_terms: tokenized document (lowercase)\n        corpus_doc_counts: {term: num_docs_containing_term} across entire corpus\n        total_docs: total number of documents in corpus\n        avgdl: average document length (tokens) across corpus\n        k1, b: BM25 hyperparameters\n\n    Returns:\n        BM25 score (float)\n    """\n    # TODO: implement BM25 scoring\n    pass\n',
  'python',
  E'Implementation: (1) Handle empty input guard returning 0.0. (2) Build freq_map from doc_terms using Counter or manual dict. (3) For each unique query term: compute IDF = ln((N - df + 0.5) / (df + 0.5) + 1) where df = corpus_doc_counts.get(t, 0). (4) Compute TF = (freq * (k1+1)) / (freq + k1*(1-b+b*len(doc)/avgdl)). (5) Accumulate score. Key insight: IDF penalizes common terms across corpus (high df → low IDF), TF normalizes for document length (long docs don''t unfairly win). BM25 outperforms raw TF-IDF for document ranking because of this length normalization.',
  '[
    {
      "name": "empty query returns 0.0",
      "function": "bm25_score",
      "call": "bm25_score([], [\"the\", \"quick\", \"fox\"], {\"the\": 10}, 100, 8.0)",
      "expected": "0.0",
      "visible": true
    },
    {
      "name": "exact match scores higher than no match",
      "function": "bm25_score",
      "setup": "corpus = {\"python\": 5, \"java\": 3}; total = 50; avgdl = 10.0; score_match = bm25_score([\"python\"], [\"python\", \"is\", \"great\"], corpus, total, avgdl); score_no_match = bm25_score([\"python\"], [\"java\", \"is\", \"fast\"], corpus, total, avgdl)",
      "call": "bm25_score([\"python\"], [\"python\", \"is\", \"great\"], corpus, total, avgdl)",
      "check": "score_match > score_no_match",
      "visible": true
    },
    {
      "name": "rare term scores higher than common term",
      "function": "bm25_score",
      "setup": "corpus = {\"transformer\": 2, \"the\": 48}; total = 50; avgdl = 10.0; score_rare = bm25_score([\"transformer\"], [\"transformer\", \"model\"], corpus, total, avgdl); score_common = bm25_score([\"the\"], [\"the\", \"model\"], corpus, total, avgdl)",
      "call": "bm25_score([\"transformer\"], [\"transformer\", \"model\"], corpus, total, avgdl)",
      "check": "score_rare > score_common",
      "visible": true
    },
    {
      "name": "repeated term increases score but not linearly",
      "function": "bm25_score",
      "setup": "corpus = {\"rag\": 5}; total = 50; avgdl = 10.0; score_once = bm25_score([\"rag\"], [\"rag\"], corpus, total, avgdl); score_thrice = bm25_score([\"rag\"], [\"rag\", \"rag\", \"rag\"], corpus, total, avgdl)",
      "call": "bm25_score([\"rag\"], [\"rag\"], corpus, total, avgdl)",
      "check": "score_thrice > score_once and score_thrice < score_once * 3",
      "visible": false
    },
    {
      "name": "term not in doc contributes 0 to score",
      "function": "bm25_score",
      "call": "bm25_score([\"llm\"], [\"database\", \"index\", \"search\"], {\"llm\": 10, \"database\": 5}, 100, 8.0)",
      "check": "result == 0.0",
      "visible": false
    }
  ]'::jsonb,
  true,
  'hard'
);

-- ─── Exercise 7: Open-Ended Optimization — latency reduction ────────────────
INSERT INTO public.exercises (role_track, title, task_description, starter_code, language, reference_solution_notes, test_cases, explanation_required, difficulty)
VALUES (
  'ai_engineer',
  'Optimize a Slow RAG Pipeline',
  E'The pipeline below processes 100 documents through a RAG system. It runs correctly but is **very slow**. A profiling run shows:\n- `embed_text()` takes ~200ms per call (simulated network call to an embedding API)\n- The pipeline calls `embed_text()` 200 times per run (once for each doc + once for each query match)\n- Total runtime: ~40 seconds\n\n**Your task:** Refactor `build_index_and_search` to reduce the number of `embed_text()` calls as much as possible without changing the function''s output.\n\nTarget: ≤ 105 total embed calls for 100 docs + 5 queries (embed each doc once, each query once — no double-embedding anything).\n\n**Rules:**\n- Do not modify `embed_text()`, `cosine_sim()`, or the function signature\n- The output (list of top-1 doc text per query) must remain identical\n- Explain what you changed and why in the explanation box',
  E'# Simulated API — do not modify\nembed_call_count = [0]\ndef embed_text(text: str) -> list[float]:\n    import hashlib, math\n    embed_call_count[0] += 1\n    h = int(hashlib.md5(text.encode()).hexdigest(), 16)\n    return [(h >> i & 0xFF) / 255.0 for i in range(8)]\n\ndef cosine_sim(a: list[float], b: list[float]) -> float:\n    import math\n    dot = sum(x*y for x,y in zip(a,b))\n    na = math.sqrt(sum(x*x for x in a))\n    nb = math.sqrt(sum(x*x for x in b))\n    return dot/(na*nb) if na and nb else 0.0\n\n\ndef build_index_and_search(\n    docs: list[str],\n    queries: list[str],\n) -> list[str]:\n    """\n    For each query, return the text of the most similar document.\n    \"\"\"\n    results = []\n    for query in queries:\n        query_emb = embed_text(query)\n        best_score = -1.0\n        best_doc = ""\n        for doc in docs:\n            # BUG: re-embeds every doc for every query\n            doc_emb = embed_text(doc)\n            score = cosine_sim(query_emb, doc_emb)\n            if score > best_score:\n                best_score = score\n                best_doc = doc\n        results.append(best_doc)\n    return results\n',
  'python',
  E'Optimal fix: pre-compute all doc embeddings once before the query loop: `doc_embeddings = [(doc, embed_text(doc)) for doc in docs]`. Then for each query, only call `embed_text(query)` once. Total calls = len(docs) + len(queries) = 105 for this test. The key insight is separating the indexing phase (embed all docs once, store results) from the query phase (embed query, cosine-scan against cached embeddings). This is exactly what vector databases do — FAISS, Qdrant, Pinecone all pre-compute and store embeddings at index time.',
  '[
    {
      "name": "output is correct (returns best-matching doc per query)",
      "function": "build_index_and_search",
      "setup": "docs = [\"python programming\", \"machine learning\", \"database design\"]; queries = [\"coding in python\"]",
      "call": "build_index_and_search(docs, queries)",
      "expected": "[\"python programming\"]",
      "visible": true
    },
    {
      "name": "embed calls ≤ 105 for 100 docs + 5 queries",
      "function": "build_index_and_search",
      "setup": "import hashlib; embed_call_count[0] = 0; docs = [f\"document about topic {i}\" for i in range(100)]; queries = [f\"query {i}\" for i in range(5)]",
      "call": "build_index_and_search(docs, queries)",
      "check": "embed_call_count[0] <= 105",
      "visible": true
    },
    {
      "name": "embed calls ≤ n_docs + n_queries (no re-embedding)",
      "function": "build_index_and_search",
      "setup": "embed_call_count[0] = 0; docs = [\"alpha\", \"beta\", \"gamma\"]; queries = [\"alpha query\", \"gamma query\"]",
      "call": "build_index_and_search(docs, queries)",
      "check": "embed_call_count[0] <= 5",
      "visible": false
    },
    {
      "name": "returns list of same length as queries",
      "function": "build_index_and_search",
      "setup": "docs = [\"rag system\", \"llm agents\", \"vector db\"]; queries = [\"retrieve docs\", \"build agents\", \"store vectors\"]",
      "call": "build_index_and_search(docs, queries)",
      "check": "len(result) == 3",
      "visible": true
    },
    {
      "name": "empty queries returns empty list",
      "function": "build_index_and_search",
      "call": "build_index_and_search([\"some doc\"], [])",
      "expected": "[]",
      "visible": false
    }
  ]'::jsonb,
  true,
  'medium'
);
