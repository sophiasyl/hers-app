-- Companion (cat) state: an energy economy + care/growth system.
-- Energy is earned by logging (cycle, mood, symptoms, meds, diary), spent in a
-- little shop on food, then food is used to feed/care for the pet, which grows
-- it and unlocks accessories. One row per user, RLS-locked to the owner.
create table if not exists public.pet_state (
  user_id uuid primary key references auth.users(id) on delete cascade,
  energy int not null default 0,
  happiness int not null default 60,           -- 0..100, gently decays between visits
  xp int not null default 0,                   -- drives level + unlockables
  inventory jsonb not null default '{}'::jsonb, -- {"kibble":2,"can":1}
  unlocked jsonb not null default '[]'::jsonb,  -- ["bow","cap"] accessories earned
  awarded jsonb not null default '{}'::jsonb,   -- {"2026-09-24":["flow","mood"]} anti-double-earn ledger
  care_today jsonb not null default '{}'::jsonb,-- {"date":"...","pets":2,"plays":1} daily free-action caps
  last_care_at timestamptz,
  updated_at timestamptz not null default now()
);

alter table public.pet_state enable row level security;
drop policy if exists pet_state_select_own on public.pet_state;
drop policy if exists pet_state_insert_own on public.pet_state;
drop policy if exists pet_state_update_own on public.pet_state;
create policy pet_state_select_own on public.pet_state for select using (auth.uid() = user_id);
create policy pet_state_insert_own on public.pet_state for insert with check (auth.uid() = user_id);
create policy pet_state_update_own on public.pet_state for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
