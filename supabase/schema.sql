-- Hers — Supabase schema (Phase 2: cloud accounts + sync)
-- Paste this into the Supabase SQL Editor (Dashboard → SQL Editor → New query → Run).
-- Auth (users, passwords, sessions) is handled by Supabase Auth (auth.users).
-- Every table below is per-user and protected by Row Level Security so each
-- account can only read/write its own data.

-- 1) Profile (one row per user) ------------------------------------------------
create table if not exists public.profiles (
  id                uuid primary key references auth.users on delete cascade,
  name              text,
  pet_key           text,
  pet_name          text,
  onboarded         boolean not null default false,
  cycle_length      int     not null default 28,
  period_length     int     not null default 5,
  last_period_start date,
  updated_at        timestamptz not null default now()
);

-- 2) Flow logs (period tracking) ----------------------------------------------
create table if not exists public.flow_logs (
  user_id uuid not null references auth.users on delete cascade,
  date    date not null,
  level   text not null check (level in ('spotting','light','medium','heavy')),
  primary key (user_id, date)
);

-- 3) Wellness logs (mood + symptoms per day) ----------------------------------
create table if not exists public.wellness_logs (
  user_id  uuid not null references auth.users on delete cascade,
  date     date not null,
  mood     text,
  symptoms text[] not null default '{}',
  primary key (user_id, date)
);

-- 4) Journal entries -----------------------------------------------------------
create table if not exists public.journal_entries (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users on delete cascade,
  body       text not null,
  mood       text,
  tags       text[] not null default '{}',
  source     text not null default 'manual',
  title      text,
  created_at timestamptz not null default now()
);

-- Row Level Security -----------------------------------------------------------
alter table public.profiles       enable row level security;
alter table public.flow_logs      enable row level security;
alter table public.wellness_logs  enable row level security;
alter table public.journal_entries enable row level security;

-- Profiles: a user owns the row whose id = their uid
drop policy if exists "own profile" on public.profiles;
create policy "own profile" on public.profiles
  for all using (auth.uid() = id) with check (auth.uid() = id);

-- The three data tables: owned via user_id
drop policy if exists "own flow" on public.flow_logs;
create policy "own flow" on public.flow_logs
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "own wellness" on public.wellness_logs;
create policy "own wellness" on public.wellness_logs
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "own journal" on public.journal_entries;
create policy "own journal" on public.journal_entries
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Auto-create an empty profile row when a new user signs up --------------------
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id) values (new.id) on conflict do nothing;
  return new;
end; $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
