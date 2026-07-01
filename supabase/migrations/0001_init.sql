-- ============================================================================
-- MUT Attendance — initial schema
-- Run via: supabase db push   (or paste into Supabase SQL editor)
-- ============================================================================

-- ---------- users ----------
-- Mirrors auth.users (Supabase Auth) with our app-specific profile fields.
create table if not exists public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in ('lecturer', 'student')),
  full_name text not null,
  email text not null,
  reg_no text,            -- students only
  staff_no text,           -- lecturers only
  department text,
  courses text[] not null default '{}',  -- course codes
  created_at timestamptz not null default now()
);

-- ---------- sessions ----------
create table if not exists public.sessions (
  id uuid primary key default gen_random_uuid(),
  course_code text not null,
  course_name text,
  lecturer_id uuid not null references public.users(id),
  lecturer_name text,
  status text not null default 'active' check (status in ('active', 'ended')),
  lat double precision not null,
  lng double precision not null,
  accuracy double precision,
  wifi_bssid text,
  radius_meters integer not null default 20,
  token text not null,
  token_issued_at timestamptz not null default now(),
  started_at timestamptz not null default now(),
  expires_at timestamptz not null,
  device_ids_used text[] not null default '{}'
);

create index if not exists idx_sessions_lecturer on public.sessions(lecturer_id, started_at desc);
create index if not exists idx_sessions_status on public.sessions(status);

-- ---------- attendance ----------
create table if not exists public.attendance (
  id text primary key,  -- composite: {session_id}_{student_id}, enforced in Edge Function
  session_id uuid not null references public.sessions(id),
  student_id uuid not null references public.users(id),
  student_name text,
  reg_no text,
  course_code text,
  device_id text not null,
  student_lat double precision not null,
  student_lng double precision not null,
  student_accuracy double precision,
  distance_meters double precision not null,
  verified_by text not null check (verified_by in ('gps', 'wifi')),
  marked_at timestamptz not null default now()
);

create index if not exists idx_attendance_session on public.attendance(session_id, marked_at desc);

-- ============================================================================
-- Row Level Security
-- ============================================================================
alter table public.users enable row level security;
alter table public.sessions enable row level security;
alter table public.attendance enable row level security;

-- users: a person can read/update only their own row
create policy "users_select_own" on public.users
  for select using (auth.uid() = id);

create policy "users_insert_own" on public.users
  for insert with check (auth.uid() = id);

create policy "users_update_own" on public.users
  for update using (auth.uid() = id);

-- sessions: any signed-in user can read; only the owning lecturer can write
create policy "sessions_select_all" on public.sessions
  for select using (auth.role() = 'authenticated');

create policy "sessions_insert_own" on public.sessions
  for insert with check (
    lecturer_id = auth.uid()
    and exists (select 1 from public.users u where u.id = auth.uid() and u.role = 'lecturer')
  );

create policy "sessions_update_own" on public.sessions
  for update using (lecturer_id = auth.uid());

-- attendance: students see their own records, lecturers see all.
-- NO direct insert policy for regular users — only the service-role key
-- (used inside Edge Functions) can write here. This is the same idea as
-- the Firebase version: all writes go through verified server-side code.
create policy "attendance_select_own_or_lecturer" on public.attendance
  for select using (
    student_id = auth.uid()
    or exists (select 1 from public.users u where u.id = auth.uid() and u.role = 'lecturer')
  );

-- ============================================================================
-- Realtime — let the lecturer's screen subscribe to live attendance updates
-- ============================================================================
alter publication supabase_realtime add table public.attendance;
alter publication supabase_realtime add table public.sessions;
