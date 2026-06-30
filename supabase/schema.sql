-- =====================================================
-- LabGate v3 — Secure Schema with Supabase Auth
-- =====================================================

-- 1. Profiles (linked to Supabase Auth users)
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade primary key,
  username text unique not null,
  role text not null check (role in ('professor', 'student')),
  created_at timestamptz not null default now()
);

-- Enable RLS on profiles
alter table public.profiles enable row level security;

-- Grant access to authenticated users
grant select on public.profiles to authenticated;
grant insert on public.profiles to authenticated;

-- 2. Rooms
create table if not exists public.rooms (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now(),
  is_active boolean not null default true,
  created_by uuid references public.profiles(id) default auth.uid()
);

-- Enable RLS on rooms
alter table public.rooms enable row level security;

-- Grant access to authenticated users
grant select, insert, update on public.rooms to authenticated;

-- 3. Visitors
create table if not exists public.visitors (
  id uuid primary key default gen_random_uuid(),
  room_id uuid references public.rooms(id) on delete cascade not null,
  profile_id uuid references public.profiles(id) on delete set null default auth.uid(),
  name text not null, -- snapshot of username at time of scan
  scanned_at timestamptz not null default now()
);

-- Enable RLS on visitors
alter table public.visitors enable row level security;

-- Grant access to authenticated users
grant select, insert on public.visitors to authenticated;

-- 4. RLS Policies

-- Helper function to check if user is a professor (avoids recursion and works for manual users)
create or replace function public.is_professor()
returns boolean as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'professor'
  );
$$ language sql security definer;

-- Profiles: Users can read their own profile. Professors can read all profiles.
drop policy if exists "Users can view own profile" on public.profiles;
create policy "Users can view own profile" on public.profiles
  for select using (auth.uid() = id);

drop policy if exists "Professors can view all profiles" on public.profiles;
create policy "Professors can view all profiles" on public.profiles
  for select using (is_professor());

-- Rooms: Anyone authenticated can read active rooms. Professors can manage rooms.
drop policy if exists "Everyone can view active rooms" on public.rooms;
create policy "Everyone can view active rooms" on public.rooms
  for select using (is_active = true);

drop policy if exists "Professors can view own rooms" on public.rooms;
create policy "Professors can view own rooms" on public.rooms
  for select using (is_professor() and created_by = auth.uid());

drop policy if exists "Professors can insert rooms" on public.rooms;
create policy "Professors can insert rooms" on public.rooms
  for insert with check (is_professor());

drop policy if exists "Professors can update own rooms" on public.rooms;
create policy "Professors can update own rooms" on public.rooms
  for update using (is_professor() and created_by = auth.uid())
  with check (is_professor());

-- Visitors: Students can insert their own visit. Professors can see visits.
drop policy if exists "Students can insert visit" on public.visitors;
create policy "Students can insert visit" on public.visitors
  for insert with check (auth.uid() = profile_id);

drop policy if exists "Students can view own visits" on public.visitors;
create policy "Students can view own visits" on public.visitors
  for select using (auth.uid() = profile_id);

drop policy if exists "Professors can view visits" on public.visitors;
create policy "Professors can view visits" on public.visitors
  for select using (is_professor());

-- 5. Realtime
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'rooms'
  ) then
    alter publication supabase_realtime add table public.rooms;
  end if;
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'visitors'
  ) then
    alter publication supabase_realtime add table public.visitors;
  end if;
end $$;

-- 6. Auth Trigger for Profile Creation
-- This trigger automatically creates a profile entry when a new user signs up via Supabase Auth.
create or replace function public.handle_new_user()
returns trigger as $$
begin
  -- Skip if username or role are missing (e.g. user created manually in Dashboard)
  if (new.raw_user_meta_data->>'username') is null or (new.raw_user_meta_data->>'role') is null then
    return new;
  end if;
  insert into public.profiles (id, username, role)
  values (
    new.id,
    new.raw_user_meta_data->>'username',
    new.raw_user_meta_data->>'role'
  );
  return new;
end;
$$ language plpgsql security definer;

-- Trigger to call the function after a new user is created in auth.users
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
