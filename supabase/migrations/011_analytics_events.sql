-- Migration 011: analytics_events table for funnel tracking
-- Run in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS public.analytics_events (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_name  TEXT NOT NULL,
  properties  JSONB NOT NULL DEFAULT '{}',
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- Index for funnel queries by event name and time
CREATE INDEX IF NOT EXISTS idx_analytics_event_name ON public.analytics_events(event_name);
CREATE INDEX IF NOT EXISTS idx_analytics_created_at ON public.analytics_events(created_at DESC);

-- Service role inserts; no user reads (internal analytics only)
ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role can insert analytics" ON public.analytics_events
  FOR INSERT TO service_role WITH CHECK (true);
CREATE POLICY "Service role can read analytics" ON public.analytics_events
  FOR SELECT TO service_role USING (true);
