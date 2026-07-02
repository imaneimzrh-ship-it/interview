-- InterviewAI Database Schema
-- Run this in Supabase SQL Editor → New Query → Run

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ─── User profiles ────────────────────────────────────────────────────────────
create table public.profiles (
  id               uuid primary key references auth.users(id) on delete cascade,
  email            text,
  plan             text not null default 'free' check (plan in ('free', 'pro')),
  trial_sessions   int not null default 0,
  stripe_customer  text,
  stripe_sub_id    text,
  sub_status       text,
  created_at       timestamptz default now(),
  updated_at       timestamptz default now()
);

alter table public.profiles enable row level security;
create policy "Users view own profile"   on public.profiles for select using (auth.uid() = id);
create policy "Users update own profile" on public.profiles for update using (auth.uid() = id);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email) values (new.id, new.email);
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ─── Interview sessions ───────────────────────────────────────────────────────
create table public.interview_sessions (
  id              uuid primary key default uuid_generate_v4(),
  user_id         uuid not null references public.profiles(id) on delete cascade,
  role            text not null,
  company         text not null default 'anthropic',
  is_ai_role      boolean not null default false,
  status          text not null default 'active' check (status in ('active', 'completed', 'abandoned')),
  question_count  int not null default 0,
  max_questions   int not null default 10,
  started_at      timestamptz default now(),
  completed_at    timestamptz,
  duration_secs   int,
  -- Scores
  score_overall   int,
  score_clarity   int,
  score_depth     int,
  score_structure int,
  score_technical int,
  score_production int,
  -- Feedback
  ai_summary      text,
  ai_strengths    text[],
  ai_improvements text[],
  ai_next_steps   text,
  hire_decision   text,
  created_at      timestamptz default now()
);

alter table public.interview_sessions enable row level security;
create policy "Users manage own sessions" on public.interview_sessions
  for all using (auth.uid() = user_id);

create index idx_sessions_user on public.interview_sessions(user_id, created_at desc);

-- ─── Interview messages ───────────────────────────────────────────────────────
create table public.interview_messages (
  id          uuid primary key default uuid_generate_v4(),
  session_id  uuid not null references public.interview_sessions(id) on delete cascade,
  user_id     uuid not null references public.profiles(id) on delete cascade,
  role        text not null check (role in ('user', 'assistant')),
  content     text not null,
  question_n  int,
  created_at  timestamptz default now()
);

alter table public.interview_messages enable row level security;
create policy "Users manage own messages" on public.interview_messages
  for all using (auth.uid() = user_id);

create index idx_messages_session on public.interview_messages(session_id, created_at asc);
