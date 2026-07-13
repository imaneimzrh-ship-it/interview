-- 014_practice_hub.sql
-- Adds topic pillars, rubric grading, user weak-topic tracking, and data-driven mock panel loops.

-- ── 1. exercises: new columns ─────────────────────────────────────────────────
ALTER TABLE exercises ADD COLUMN IF NOT EXISTS topic_pillar TEXT NOT NULL DEFAULT 'rag';
ALTER TABLE exercises ADD COLUMN IF NOT EXISTS topic_tags   JSONB NOT NULL DEFAULT '[]';
ALTER TABLE exercises ADD COLUMN IF NOT EXISTS format       TEXT NOT NULL DEFAULT 'code';
  -- 'code' | 'sql' | 'prompt_design' | 'open_ended'
ALTER TABLE exercises ADD COLUMN IF NOT EXISTS is_module_intro BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE exercises ADD COLUMN IF NOT EXISTS grading_mode TEXT NOT NULL DEFAULT 'test_cases';
  -- 'test_cases' (E2B) | 'rubric' (Claude structured grading, no sandbox)
ALTER TABLE exercises ADD COLUMN IF NOT EXISTS rubric_criteria JSONB;

-- ── 2. Back-fill format from language ─────────────────────────────────────────
UPDATE exercises SET format = 'sql'          WHERE language = 'sql';
UPDATE exercises SET format = 'prompt_design', grading_mode = 'rubric' WHERE language = 'text';
-- python stays 'code' / 'test_cases' (default)

-- ── 3. Back-fill topic_pillar for existing exercises ──────────────────────────
UPDATE exercises SET topic_pillar = 'rag' WHERE title IN (
  'Fix the Broken RAG Retrieval Pipeline',
  'Prompt Engineering Rewrite',
  'Chunking Strategy Fix',
  'Build a BM25 Keyword Scorer',
  'Optimize a Slow RAG Pipeline'
);
UPDATE exercises SET topic_pillar = 'production_mlops' WHERE title IN (
  'Token Cost Optimization',
  'SQL Debugging: User Events Join',
  'Implement Retry with Exponential Backoff',
  'Parse Structured LLM Output',
  'Manage Context Window Overflow'
);

-- ── 4. Back-fill topic_tags for existing exercises ────────────────────────────
UPDATE exercises SET topic_tags = '["retrieval","embeddings","cosine_similarity"]'::jsonb
  WHERE title = 'Fix the Broken RAG Retrieval Pipeline';
UPDATE exercises SET topic_tags = '["prompting","system_prompts","instruction_design"]'::jsonb
  WHERE title = 'Prompt Engineering Rewrite';
UPDATE exercises SET topic_tags = '["chunking","indexing","text_splitting"]'::jsonb
  WHERE title = 'Chunking Strategy Fix';
UPDATE exercises SET topic_tags = '["search","bm25","hybrid_rag"]'::jsonb
  WHERE title = 'Build a BM25 Keyword Scorer';
UPDATE exercises SET topic_tags = '["rag","performance","embeddings"]'::jsonb
  WHERE title = 'Optimize a Slow RAG Pipeline';
UPDATE exercises SET topic_tags = '["cost_optimization","token_budget","batching"]'::jsonb
  WHERE title = 'Token Cost Optimization';
UPDATE exercises SET topic_tags = '["sql","data_engineering","analytics"]'::jsonb
  WHERE title = 'SQL Debugging: User Events Join';
UPDATE exercises SET topic_tags = '["api_reliability","error_handling","retries"]'::jsonb
  WHERE title = 'Implement Retry with Exponential Backoff';
UPDATE exercises SET topic_tags = '["structured_output","json_parsing","reliability"]'::jsonb
  WHERE title = 'Parse Structured LLM Output';
UPDATE exercises SET topic_tags = '["context_window","token_budget","memory"]'::jsonb
  WHERE title = 'Manage Context Window Overflow';

-- ── 5. user_topic_performance (weak-topic adaptive selection) ─────────────────
CREATE TABLE IF NOT EXISTS user_topic_performance (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  topic_pillar    TEXT NOT NULL,
  topic_tag       TEXT,
  avg_score       NUMERIC(4,2),
  attempts_count  INTEGER NOT NULL DEFAULT 0,
  last_updated    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, topic_pillar, topic_tag)
);

ALTER TABLE user_topic_performance ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'user_topic_performance'
      AND policyname = 'Users can read their own topic performance'
  ) THEN
    CREATE POLICY "Users can read their own topic performance"
      ON user_topic_performance FOR SELECT
      USING (auth.uid() = user_id);
  END IF;
END $$;

-- Service role writes (from API routes)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'user_topic_performance'
      AND policyname = 'Service role can write topic performance'
  ) THEN
    CREATE POLICY "Service role can write topic performance"
      ON user_topic_performance FOR ALL
      USING (true) WITH CHECK (true);
  END IF;
END $$;

-- ── 6. mock_panel_loops (data-driven loop definitions) ────────────────────────
CREATE TABLE IF NOT EXISTS mock_panel_loops (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug                TEXT UNIQUE NOT NULL,
  title               TEXT NOT NULL,
  description         TEXT NOT NULL,
  rounds              JSONB NOT NULL,
  estimated_minutes   INTEGER NOT NULL,
  tier                TEXT NOT NULL DEFAULT 'pro',
  is_active           BOOLEAN NOT NULL DEFAULT true,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── 7. Seed mock_panel_loops ──────────────────────────────────────────────────
INSERT INTO mock_panel_loops (slug, title, description, rounds, estimated_minutes, tier) VALUES
(
  'ai_llm_engineer_full_loop',
  'AI / LLM Engineer Full Loop',
  'Complete 4-round interview loop covering RAG system design, technical coding, production ops, and a behavioral close. Mirrors the format used at Anthropic, Cohere, and similar AI-native companies.',
  '["rag_system_design","technical_coding","production_mlops","behavioral"]'::jsonb,
  60,
  'pro'
),
(
  'ai_automation_engineer_loop',
  'AI Automation Engineer Loop',
  'Focus on agent orchestration, tool creation, failure handling, and multi-agent systems. Targeted at roles that build production AI pipelines and automation workflows.',
  '["agent_orchestration","technical_coding","evaluation_testing","behavioral"]'::jsonb,
  55,
  'pro'
),
(
  'applied_ai_mlops_loop',
  'Applied AI / MLOps Engineer Loop',
  'Evaluation strategy, observability, deployment, and regression gate design. For engineers owning model quality and reliability in production.',
  '["evaluation_testing","production_mlops","technical_coding","behavioral"]'::jsonb,
  50,
  'pro'
)
ON CONFLICT (slug) DO NOTHING;
