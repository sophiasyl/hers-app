-- Hers — Luna AI chat history (Phase 2b).
-- Paste this into the Supabase SQL Editor (Dashboard → SQL Editor → New query → Run).
-- Stores every message between the user and Luna so Luna can refer back to past
-- chats. Each visit starts a new chat (a new luna_chats row); messages belong to
-- a chat. Per-user and protected by Row Level Security.

-- One row per chat session (a fresh one is created each time the user opens Luna)
create table if not exists public.luna_chats (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users on delete cascade,
  title      text,
  created_at timestamptz not null default now()
);

-- Every message in every chat
create table if not exists public.luna_messages (
  id         uuid primary key default gen_random_uuid(),
  chat_id    uuid not null references public.luna_chats on delete cascade,
  user_id    uuid not null references auth.users on delete cascade,
  role       text not null check (role in ('user','assistant')),
  content    text not null,
  created_at timestamptz not null default now()
);

create index if not exists luna_messages_user_created_idx
  on public.luna_messages (user_id, created_at);
create index if not exists luna_messages_chat_idx
  on public.luna_messages (chat_id, created_at);

-- Row Level Security: each account only sees its own chats + messages
alter table public.luna_chats    enable row level security;
alter table public.luna_messages enable row level security;

drop policy if exists "own luna chats" on public.luna_chats;
create policy "own luna chats" on public.luna_chats
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "own luna messages" on public.luna_messages;
create policy "own luna messages" on public.luna_messages
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
