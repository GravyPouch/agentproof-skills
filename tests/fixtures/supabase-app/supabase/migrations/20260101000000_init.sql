-- Profiles: one row per user.
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "Profiles are readable by signed-in users" on public.profiles
  for select to authenticated
  using (true);

create policy "Users update own profile" on public.profiles
  for update to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

-- Notes: private notes for each user.
create table public.notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now()
);

create index notes_user_id_idx on public.notes (user_id);

-- Avatars bucket.
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true);

create policy "Anyone can upload avatars" on storage.objects
  for insert to public
  with check (bucket_id = 'avatars');

create policy "Anyone can replace avatars" on storage.objects
  for update to public
  using (bucket_id = 'avatars');
