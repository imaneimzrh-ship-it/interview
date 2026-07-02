-- InterviewAI on sonneai.com — Database Schema
-- Paste this into: Supabase Dashboard → SQL Editor → Run

create extension if not exists "uuid-ossp";

-- ─── Profiles ──────────────────────────────────────────────────────────────────
create table public.profiles (
  id               uuid primary key references auth.users(id) on delete cascade,
  email            text not null,
  full_name        text,
  plan             text not null default 'free',   -- 'free' | 'pro'
  trial_used       int  not null default 0,         -- max 2 for free tier
  stripe_customer  text,
  stripe_sub_id    text,
  sub_status       text,
  created_at       timestamptz default now(),
  updated_at       timestamptz default now()
);

alter table public.profiles enable row level security;
create policy "own profile" on public.profiles for all using (auth.uid() = id);

-- auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'full_name', ''));
  return new;
end;
$$;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ─── Sessions ──────────────────────────────────────────────────────────────────
create table public.interview_sessions (
  id             uuid primary key default uuid_generate_v4(),
  user_id        uuid not null references public.profiles(id) on delete cascade,
  role           text not null,
  company        text not null default 'none',
  is_ai_role     boolean not null default false,
  status         text not null default 'active',   -- active | completed | abandoned
  q_total        int  not null default 10,
  q_current      int  not null default 1,
  score_overall  int,
  score_clarity  int,
  score_depth    int,
  score_structure int,
  score_examples int,
  score_technical int,
  ai_summary     text,
  ai_strengths   text[],
  ai_gaps        text[],
  ai_next        text,
  hire_decision  text,
  started_at     timestamptz default now(),
  completed_at   timestamptz,
  duration_secs  int
);

alter table public.interview_sessions enable row level security;
create policy "own sessions" on public.interview_sessions for all using (auth.uid() = user_id);

-- ─── Messages ──────────────────────────────────────────────────────────────────
create table public.interview_messages (
  id          uuid primary key default uuid_generate_v4(),
  session_id  uuid not null references public.interview_sessions(id) on delete cascade,
  user_id     uuid not null references public.profiles(id) on delete cascade,
  role        text not null check (role in ('user','assistant')),
  content     text not null,
  q_num       int,
  created_at  timestamptz default now()
);

alter table public.interview_messages enable row level security;
create policy "own messages" on public.interview_messages for all using (auth.uid() = user_id);

-- ─── Indexes ───────────────────────────────────────────────────────────────────
create index idx_sessions_user on public.interview_sessions(user_id, started_at desc);
create index idx_messages_session on public.interview_messages(session_id, created_at asc);
