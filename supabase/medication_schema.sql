-- Hers — Medication logging (what medicine was taken each day, e.g. birth control).
-- Paste this into the Supabase SQL Editor (Dashboard → SQL Editor → New query → Run).
-- Per-user, one row per day, protected by Row Level Security.

create table if not exists public.medication_logs (
  user_id uuid not null references auth.users on delete cascade,
  date    date not null,
  meds    text[] not null default '{}',
  primary key (user_id, date)
);

alter table public.medication_logs enable row level security;

drop policy if exists "own medication" on public.medication_logs;
create policy "own medication" on public.medication_logs
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
