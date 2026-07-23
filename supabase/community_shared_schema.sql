-- Hers — Real shared community (Unity).
-- Turns community_posts into a shared feed and adds hugs, comments and reports.
-- Everyone signed in can READ; you can only write/delete your OWN rows.

-- 1) Evolve community_posts into a shared feed --------------------------------
alter table public.community_posts
  add column if not exists author_name text,
  add column if not exists anonymous  boolean not null default false,
  add column if not exists seed_hugs  int     not null default 0;

-- seed/system posts have no author account
alter table public.community_posts alter column user_id drop not null;

-- backfill display names for any existing personal posts
update public.community_posts p
  set author_name = coalesce(p.author_name, (select name from public.profiles pr where pr.id = p.user_id))
  where p.author_name is null and p.user_id is not null;

-- Replace the old own-only policy with granular read-all / write-own policies
drop policy if exists "own community posts"        on public.community_posts;
drop policy if exists "read community posts"        on public.community_posts;
drop policy if exists "insert own community post"   on public.community_posts;
drop policy if exists "delete own community post"   on public.community_posts;
create policy "read community posts"      on public.community_posts for select using (auth.uid() is not null);
create policy "insert own community post" on public.community_posts for insert with check (auth.uid() = user_id);
create policy "delete own community post" on public.community_posts for delete using (auth.uid() = user_id);

-- 2) Hugs (one per person per post) -------------------------------------------
create table if not exists public.community_hugs (
  post_id    uuid not null references public.community_posts on delete cascade,
  user_id    uuid not null references auth.users on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);
alter table public.community_hugs enable row level security;
drop policy if exists "read hugs"       on public.community_hugs;
drop policy if exists "insert own hug"   on public.community_hugs;
drop policy if exists "delete own hug"   on public.community_hugs;
create policy "read hugs"     on public.community_hugs for select using (auth.uid() is not null);
create policy "insert own hug" on public.community_hugs for insert with check (auth.uid() = user_id);
create policy "delete own hug" on public.community_hugs for delete using (auth.uid() = user_id);

-- 3) Comments -----------------------------------------------------------------
create table if not exists public.community_comments (
  id         uuid primary key default gen_random_uuid(),
  post_id    uuid not null references public.community_posts on delete cascade,
  user_id    uuid references auth.users on delete cascade,
  author_name text,
  anonymous  boolean not null default false,
  body       text not null,
  created_at timestamptz not null default now()
);
create index if not exists community_comments_post_idx on public.community_comments (post_id, created_at);
alter table public.community_comments enable row level security;
drop policy if exists "read comments"      on public.community_comments;
drop policy if exists "insert own comment"  on public.community_comments;
drop policy if exists "delete own comment"  on public.community_comments;
create policy "read comments"     on public.community_comments for select using (auth.uid() is not null);
create policy "insert own comment" on public.community_comments for insert with check (auth.uid() = user_id);
create policy "delete own comment" on public.community_comments for delete using (auth.uid() = user_id);

-- 4) Reports (flag a post for review; only the reporter sees their reports) ----
create table if not exists public.community_reports (
  post_id     uuid not null references public.community_posts on delete cascade,
  reporter_id uuid not null references auth.users on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (post_id, reporter_id)
);
alter table public.community_reports enable row level security;
drop policy if exists "insert own report" on public.community_reports;
drop policy if exists "read own report"    on public.community_reports;
create policy "insert own report" on public.community_reports for insert with check (auth.uid() = reporter_id);
create policy "read own report"    on public.community_reports for select using (auth.uid() = reporter_id);

-- 5) Realtime (live updates) --------------------------------------------------
do $$ begin alter publication supabase_realtime add table public.community_posts;    exception when duplicate_object then null; end $$;
do $$ begin alter publication supabase_realtime add table public.community_hugs;     exception when duplicate_object then null; end $$;
do $$ begin alter publication supabase_realtime add table public.community_comments; exception when duplicate_object then null; end $$;

-- 6) Seed starter content (idempotent via fixed ids) --------------------------
insert into public.community_posts (id, user_id, author_name, anonymous, phase, body, seed_hugs, created_at) values
  ('aaaaaaaa-0000-0000-0000-000000000001', null, 'Anonymous', true,  'Follicular', 'Finally realized my mid-cycle anxiety isn’t random — it’s the estrogen spike. Nature walks and switching to decaf helped so much today.', 42, now() - interval '2 hours'),
  ('aaaaaaaa-0000-0000-0000-000000000002', null, 'Maya_Flow', false, 'Follicular', 'If you’re feeling on edge, try magnesium glycinate tonight. It stabilized my jitters instantly. We got this!', 28, now() - interval '6 hours'),
  ('aaaaaaaa-0000-0000-0000-000000000003', null, 'Anonymous', true,  'Luteal',     'Tracked for three months and finally moved my big meetings to my follicular week. Game changer for my confidence.', 67, now() - interval '1 day'),
  ('aaaaaaaa-0000-0000-0000-000000000004', null, 'Anonymous', true,  'Menstrual',  'Cramps are brutal today. A heating pad and staying off my feet is the only thing helping. Sending strength to anyone in their first days 🩸', 51, now() - interval '3 hours'),
  ('aaaaaaaa-0000-0000-0000-000000000005', null, 'Jess_M',    false, 'Luteal',     'PMS insomnia was wrecking me until I started magnesium + no screens after 9pm. Falling asleep so much easier this week.', 33, now() - interval '20 hours')
on conflict (id) do nothing;

insert into public.community_comments (id, post_id, user_id, author_name, anonymous, body, created_at) values
  ('bbbbbbbb-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001', null, 'Maya_Flow', false, 'Yes! Decaf changed everything for me too 💚', now() - interval '1 hour'),
  ('bbbbbbbb-0000-0000-0000-000000000002', 'aaaaaaaa-0000-0000-0000-000000000004', null, 'Nina',      false, 'Heating pad + ibuprofen before it peaks is my combo. Feel better 💛', now() - interval '2 hours'),
  ('bbbbbbbb-0000-0000-0000-000000000003', 'aaaaaaaa-0000-0000-0000-000000000003', null, 'Priya_S',   false, 'So smart. Going to plan my week around my phases too.', now() - interval '18 hours')
on conflict (id) do nothing;
