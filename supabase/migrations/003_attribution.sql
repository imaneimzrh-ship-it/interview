-- Attribution: how users found Sonne AI
-- Run in Supabase Dashboard → SQL Editor

alter table public.profiles
  add column if not exists source text;  -- 'google' | 'linkedin' | 'reddit' | 'producthunt' | 'other'
