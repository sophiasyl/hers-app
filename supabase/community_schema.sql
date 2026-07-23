-- Hers — your own community posts (so they can be found by date in history).
-- Paste into the Supabase SQL Editor. Per-user, RLS-protected.
create table if not exists public.community_posts (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users on delete cascade,
  body       text not null,
  phase      text,
  created_at timestamptz not null default now()
);

create index if not exists community_posts_user_created_idx
  on public.community_posts (user_id, created_at);

alter table public.community_posts enable row level security;

drop policy if exists "own community posts" on public.community_posts;
create policy "own community posts" on public.community_posts
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
