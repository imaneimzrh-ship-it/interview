-- CV Diagnostic tables
-- Run in Supabase Dashboard → SQL Editor

-- ─── CVs ──────────────────────────────────────────────────────────────────────
create table if not exists public.cvs (
  id          uuid primary key default uuid_generate_v4(),
  user_id     uuid not null references public.profiles(id) on delete cascade,
  text        text not null,
  created_at  timestamptz default now(),
  updated_at  timestamptz default now(),
  -- one current CV per user
  constraint cvs_user_unique unique (user_id)
);

alter table public.cvs enable row level security;
create policy "own cv" on public.cvs for all using (auth.uid() = user_id);

-- ─── CV Reports ───────────────────────────────────────────────────────────────
create table if not exists public.cv_reports (
  id               uuid primary key default uuid_generate_v4(),
  user_id          uuid references public.profiles(id) on delete cascade,  -- nullable for anon
  overall          int not null,
  signals          jsonb not null default '[]',
  strengths        jsonb not null default '[]',
  gap              text,
  flags            jsonb not null default '[]',
  recommend_module text,
  recommend_why    text,
  created_at       timestamptz default now()
);

alter table public.cv_reports enable row level security;
create policy "own cv_reports" on public.cv_reports for all using (auth.uid() = user_id);

create index idx_cv_reports_user on public.cv_reports(user_id, created_at desc);
