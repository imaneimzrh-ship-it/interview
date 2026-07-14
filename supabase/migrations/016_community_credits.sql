-- 016_community_credits.sql
-- Adds user_plans (credit/plan system) and community database tables.

-- ── 1. user_plans ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS user_plans (
  user_id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  plan             TEXT NOT NULL DEFAULT 'free',
  credits_remaining INTEGER NOT NULL DEFAULT 3,
  credits_total    INTEGER NOT NULL DEFAULT 3,
  renews_monthly   BOOLEAN NOT NULL DEFAULT false,
  last_reset_at    TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at       TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE user_plans ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='user_plans' AND policyname='Users read own plan') THEN
    CREATE POLICY "Users read own plan" ON user_plans FOR SELECT USING (auth.uid() = user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='user_plans' AND policyname='Service role manages plans') THEN
    CREATE POLICY "Service role manages plans" ON user_plans FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

-- ── 2. credit_transactions ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS credit_transactions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action_type   TEXT NOT NULL,   -- 'cv_diagnostic' | 'practice_exercise' | 'mock_panel_session'
  credits_used  INTEGER NOT NULL,
  balance_after INTEGER NOT NULL,
  created_at    TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE credit_transactions ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='credit_transactions' AND policyname='Users read own transactions') THEN
    CREATE POLICY "Users read own transactions" ON credit_transactions FOR SELECT USING (auth.uid() = user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='credit_transactions' AND policyname='Service role manages transactions') THEN
    CREATE POLICY "Service role manages transactions" ON credit_transactions FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

-- ── 3. Trigger: create user_plans on signup ──────────────────────────────────
CREATE OR REPLACE FUNCTION public.handle_new_user_plan()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.user_plans (user_id, plan, credits_remaining, credits_total, renews_monthly)
  VALUES (NEW.id, 'free', 3, 3, false)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created_plan ON auth.users;
CREATE TRIGGER on_auth_user_created_plan
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_plan();

-- ── 4. Backfill existing users ───────────────────────────────────────────────
INSERT INTO user_plans (user_id, plan, credits_remaining, credits_total, renews_monthly)
SELECT
  u.id,
  COALESCE(p.plan, 'free'),
  CASE WHEN COALESCE(p.plan, 'free') = 'pro' THEN 50 ELSE 3 END,
  CASE WHEN COALESCE(p.plan, 'free') = 'pro' THEN 50 ELSE 3 END,
  CASE WHEN COALESCE(p.plan, 'free') = 'pro' THEN true ELSE false END
FROM auth.users u
LEFT JOIN public.profiles p ON p.id = u.id
ON CONFLICT (user_id) DO NOTHING;

-- ── 5. Community database: interview_reports ──────────────────────────────────
CREATE TABLE IF NOT EXISTS interview_reports (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submitted_by   UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  question_text  TEXT NOT NULL,
  cluster        TEXT NOT NULL,   -- rag | agent_orchestration | evaluation_testing | production_mlops
  round          TEXT NOT NULL,   -- screening | technical | system_design | behavioral | deep_dive
  role_track     TEXT,
  company_name   TEXT,
  year           INTEGER,
  outcome        TEXT,            -- got_offer | rejected | no_update
  status         TEXT NOT NULL DEFAULT 'pending_review', -- pending_review | approved | rejected
  upvote_count   INTEGER NOT NULL DEFAULT 0,
  quality_score  NUMERIC(2,1),
  seeded         BOOLEAN NOT NULL DEFAULT false,
  created_at     TIMESTAMP WITH TIME ZONE DEFAULT now(),
  approved_at    TIMESTAMP WITH TIME ZONE
);

ALTER TABLE interview_reports ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='interview_reports' AND policyname='Public read approved reports') THEN
    CREATE POLICY "Public read approved reports" ON interview_reports FOR SELECT USING (status = 'approved' OR submitted_by = auth.uid());
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='interview_reports' AND policyname='Auth users insert reports') THEN
    CREATE POLICY "Auth users insert reports" ON interview_reports FOR INSERT WITH CHECK (auth.uid() = submitted_by);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='interview_reports' AND policyname='Service role manages reports') THEN
    CREATE POLICY "Service role manages reports" ON interview_reports FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

-- ── 6. report_upvotes ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS report_upvotes (
  report_id  UUID REFERENCES interview_reports(id) ON DELETE CASCADE,
  user_id    UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  PRIMARY KEY (report_id, user_id)
);

ALTER TABLE report_upvotes ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='report_upvotes' AND policyname='Auth users manage own upvotes') THEN
    CREATE POLICY "Auth users manage own upvotes" ON report_upvotes FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='report_upvotes' AND policyname='Service role manages upvotes') THEN
    CREATE POLICY "Service role manages upvotes" ON report_upvotes FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

-- ── 7. report_comments ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS report_comments (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id  UUID REFERENCES interview_reports(id) ON DELETE CASCADE,
  user_id    UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  body       TEXT NOT NULL,
  status     TEXT NOT NULL DEFAULT 'visible',  -- visible | flagged | removed
  like_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE report_comments ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='report_comments' AND policyname='Public read visible comments') THEN
    CREATE POLICY "Public read visible comments" ON report_comments FOR SELECT USING (status = 'visible');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='report_comments' AND policyname='Auth users insert comments') THEN
    CREATE POLICY "Auth users insert comments" ON report_comments FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='report_comments' AND policyname='Service role manages comments') THEN
    CREATE POLICY "Service role manages comments" ON report_comments FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

-- ── 8. comment_likes ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS comment_likes (
  comment_id UUID REFERENCES report_comments(id) ON DELETE CASCADE,
  user_id    UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  PRIMARY KEY (comment_id, user_id)
);

ALTER TABLE comment_likes ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='comment_likes' AND policyname='Auth users manage own likes') THEN
    CREATE POLICY "Auth users manage own likes" ON comment_likes FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='comment_likes' AND policyname='Service role manages likes') THEN
    CREATE POLICY "Service role manages likes" ON comment_likes FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

-- ── 9. report_flags ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS report_flags (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id  UUID REFERENCES interview_reports(id) ON DELETE CASCADE,
  flagged_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  reason     TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE report_flags ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='report_flags' AND policyname='Auth users insert report flags') THEN
    CREATE POLICY "Auth users insert report flags" ON report_flags FOR INSERT WITH CHECK (auth.uid() = flagged_by);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='report_flags' AND policyname='Service role manages report flags') THEN
    CREATE POLICY "Service role manages report flags" ON report_flags FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

-- ── 10. comment_flags ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS comment_flags (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  comment_id UUID REFERENCES report_comments(id) ON DELETE CASCADE,
  flagged_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  reason     TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE comment_flags ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='comment_flags' AND policyname='Auth users insert comment flags') THEN
    CREATE POLICY "Auth users insert comment flags" ON comment_flags FOR INSERT WITH CHECK (auth.uid() = flagged_by);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='comment_flags' AND policyname='Service role manages comment flags') THEN
    CREATE POLICY "Service role manages comment flags" ON comment_flags FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

-- ── 11. Seed approved community reports ──────────────────────────────────────
INSERT INTO interview_reports (question_text, cluster, round, role_track, company_name, year, outcome, status, upvote_count, seeded)
SELECT q.question_text, q.cluster, q.round, q.role_track, q.company_name, q.year, q.outcome, 'approved', q.upvote_count, true
FROM (VALUES
  ('We use a flat FAISS index today. At what point does switching to HNSW become worth it, and what do you trade off when you make that switch?', 'rag', 'system_design', 'AI Engineer', NULL::TEXT, 2025, 'got_offer', 12),
  ('Your agent is stuck in a tool-call loop — how do you detect it, break out of it, and prevent it in future runs?', 'agent_orchestration', 'system_design', 'LLM Engineer', NULL::TEXT, 2025, 'no_update', 9),
  ('You''re seeing 15% hallucination rate in prod. How do you build an eval harness to triage root cause without labeled data?', 'evaluation_testing', 'technical', 'Applied AI Engineer', NULL::TEXT, 2026, 'rejected', 7),
  ('How would you reduce inference cost by 40% on a latency-sensitive RAG endpoint without degrading quality?', 'production_mlops', 'system_design', 'MLOps Engineer', NULL::TEXT, 2025, 'got_offer', 11),
  ('Walk me through how you would design a chunking strategy for a corpus of 10,000 mixed-length PDFs — financial reports, two pages to 200 pages.', 'rag', 'technical', 'AI Engineer', NULL::TEXT, 2026, 'got_offer', 8),
  ('How do you validate a new LLM-as-judge prompt before deploying it in production evals?', 'evaluation_testing', 'technical', 'LLM Engineer', NULL::TEXT, 2026, 'no_update', 6)
) AS q(question_text, cluster, round, role_track, company_name, year, outcome, upvote_count)
WHERE NOT EXISTS (SELECT 1 FROM interview_reports WHERE seeded = true LIMIT 1);
