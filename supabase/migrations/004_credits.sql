-- Migration 004: Credit Ledger System
-- Run in Supabase Dashboard → SQL Editor

-- ─── Credits ledger ──────────────────────────────────────────────────────────
create table if not exists public.credits_ledger (
  id           uuid primary key default uuid_generate_v4(),
  user_id      uuid not null references public.profiles(id) on delete cascade,
  delta        integer not null,
  reason       text not null check (reason in ('signup_bonus','purchase','subscription_refill','consumption')),
  reference_id text,       -- session_id for consumption (idempotency key)
  expires_at   timestamptz,
  created_at   timestamptz default now()
);

alter table public.credits_ledger enable row level security;
-- Users can only read their own ledger; writes go through service role or SECURITY DEFINER functions
create policy "own ledger read" on public.credits_ledger
  for select using (auth.uid() = user_id);

create index if not exists idx_credits_user     on public.credits_ledger(user_id, created_at desc);
create index if not exists idx_credits_reference on public.credits_ledger(reference_id)
  where reference_id is not null;

-- ─── CV score usage (one free score per email, ever) ─────────────────────────
create table if not exists public.cv_score_usage (
  user_id  uuid primary key references public.profiles(id) on delete cascade,
  email    text not null,
  used_at  timestamptz default now()
);

alter table public.cv_score_usage enable row level security;
create policy "own cv usage read"   on public.cv_score_usage for select using (auth.uid() = user_id);
create policy "own cv usage insert" on public.cv_score_usage for insert with check (auth.uid() = user_id);

create unique index if not exists idx_cv_score_email on public.cv_score_usage(email);

-- ─── Session columns for credit-aware sessions ───────────────────────────────
alter table public.interview_sessions
  add column if not exists session_type    text    not null default 'full',
  add column if not exists max_sub_skills  integer not null default 4;

-- ─── Atomic charge function (advisory lock prevents double-spending) ─────────
create or replace function public.charge_credits(
  p_user_id    uuid,
  p_amount     integer,
  p_reference  text
) returns void
language plpgsql security definer as $$
declare
  v_balance integer;
begin
  -- Per-user advisory lock for the duration of this transaction
  perform pg_advisory_xact_lock(
    ('x' || substr(md5(p_user_id::text), 1, 15))::bit(60)::bigint
  );

  -- Idempotency: if this reference_id already has a debit, this is a retry
  if exists (
    select 1 from public.credits_ledger
    where reference_id = p_reference and delta < 0
  ) then
    return;
  end if;

  -- Compute non-expired balance
  select coalesce(sum(delta), 0) into v_balance
  from public.credits_ledger
  where user_id = p_user_id
    and (expires_at is null or expires_at > now());

  if v_balance < p_amount then
    raise exception 'insufficient_credits';
  end if;

  insert into public.credits_ledger (user_id, delta, reason, reference_id)
  values (p_user_id, -p_amount, 'consumption', p_reference);
end;
$$;

-- ─── Grant signup bonus on new user registration ─────────────────────────────
-- Update the existing trigger function to also credit 1 free session
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (id, email, full_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', '')
  );

  -- 1 credit covers one short session; expires in 14 days
  insert into public.credits_ledger (user_id, delta, reason, expires_at)
  values (new.id, 1, 'signup_bonus', now() + interval '14 days');

  return new;
end;
$$;
-- trigger already exists (on_auth_user_created) — updating the function is enough

-- ─── Grant 1 credit to all existing users who have zero balance ───────────────
-- (one-time backfill so existing accounts aren't locked out)
insert into public.credits_ledger (user_id, delta, reason, expires_at)
select
  p.id,
  2,   -- 2 credits: covers one full session, generous for existing users
  'signup_bonus',
  now() + interval '30 days'
from public.profiles p
where not exists (
  select 1 from public.credits_ledger cl where cl.user_id = p.id
);
