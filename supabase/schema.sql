-- Run this entire file in Supabase Dashboard > SQL Editor.
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default 'Student',
  subjects text[] not null default '{}',
  discoverable boolean not null default false,
  created_at timestamptz not null default now()
);
alter table public.profiles add column if not exists subjects text[] not null default '{}';
alter table public.profiles add column if not exists discoverable boolean not null default false;
create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 160),
  course text not null default 'Personal',
  due_at timestamptz,
  completed boolean not null default false,
  created_at timestamptz not null default now()
);
create table if not exists public.study_groups (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 100),
  course text not null default 'Open study',
  description text not null default '',
  created_at timestamptz not null default now()
);
create table if not exists public.group_members (
  group_id uuid not null references public.study_groups(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (group_id, user_id)
);
create table if not exists public.shared_notes (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 160),
  course text not null default 'General',
  description text not null default '',
  file_path text,
  created_at timestamptz not null default now()
);
alter table public.shared_notes add column if not exists file_path text;
create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references auth.users(id) on delete cascade,
  target_user_id uuid references auth.users(id) on delete set null,
  target_note_id uuid references public.shared_notes(id) on delete set null,
  reason text not null check (char_length(reason) between 5 and 1000),
  status text not null default 'open' check (status in ('open', 'reviewing', 'closed')),
  created_at timestamptz not null default now(),
  check (target_user_id is not null or target_note_id is not null)
);

alter table public.profiles enable row level security;
alter table public.tasks enable row level security;
alter table public.study_groups enable row level security;
alter table public.group_members enable row level security;
alter table public.shared_notes enable row level security;
alter table public.reports enable row level security;

drop policy if exists "Profiles are visible to signed-in students" on public.profiles;
drop policy if exists "Only opted-in student profiles are visible" on public.profiles;
create policy "Only opted-in student profiles are visible" on public.profiles for select to authenticated using (discoverable or id = (select auth.uid()));
drop policy if exists "Students insert their own profile" on public.profiles;
create policy "Students insert their own profile" on public.profiles for insert to authenticated with check (id = (select auth.uid()));
drop policy if exists "Students update their own profile" on public.profiles;
create policy "Students update their own profile" on public.profiles for update to authenticated using (id = (select auth.uid())) with check (id = (select auth.uid()));
drop policy if exists "Students manage their own tasks" on public.tasks;
create policy "Students manage their own tasks" on public.tasks for all to authenticated using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));
drop policy if exists "Signed-in students can see study groups" on public.study_groups;
create policy "Signed-in students can see study groups" on public.study_groups for select to authenticated using (true);
drop policy if exists "Students create their own groups" on public.study_groups;
create policy "Students create their own groups" on public.study_groups for insert to authenticated with check (owner_id = (select auth.uid()));
drop policy if exists "Group owners can update their groups" on public.study_groups;
create policy "Group owners can update their groups" on public.study_groups for update to authenticated using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));
drop policy if exists "Group owners can delete their groups" on public.study_groups;
create policy "Group owners can delete their groups" on public.study_groups for delete to authenticated using (owner_id = (select auth.uid()));
drop policy if exists "Students see memberships" on public.group_members;
create policy "Students see memberships" on public.group_members for select to authenticated using (true);
drop policy if exists "Students join groups as themselves" on public.group_members;
create policy "Students join groups as themselves" on public.group_members for insert to authenticated with check (user_id = (select auth.uid()));
drop policy if exists "Students leave groups as themselves" on public.group_members;
create policy "Students leave groups as themselves" on public.group_members for delete to authenticated using (user_id = (select auth.uid()));
drop policy if exists "Signed-in students can browse notes" on public.shared_notes;
create policy "Signed-in students can browse notes" on public.shared_notes for select to authenticated using (true);
drop policy if exists "Students share notes as themselves" on public.shared_notes;
create policy "Students share notes as themselves" on public.shared_notes for insert to authenticated with check (owner_id = (select auth.uid()));
drop policy if exists "Students edit their own notes" on public.shared_notes;
create policy "Students edit their own notes" on public.shared_notes for update to authenticated using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));
drop policy if exists "Students remove their own notes" on public.shared_notes;
create policy "Students remove their own notes" on public.shared_notes for delete to authenticated using (owner_id = (select auth.uid()));

-- Notes are private to signed-in students. File paths are scoped to the uploading user's id.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('notes', 'notes', false, 10485760, array['application/pdf', 'image/png', 'image/jpeg'])
on conflict (id) do update set public = false, file_size_limit = 10485760, allowed_mime_types = array['application/pdf', 'image/png', 'image/jpeg'];
drop policy if exists "Signed-in students can read note files" on storage.objects;
create policy "Signed-in students can read note files" on storage.objects for select to authenticated using (bucket_id = 'notes');
drop policy if exists "Students upload files to their own note folder" on storage.objects;
create policy "Students upload files to their own note folder" on storage.objects for insert to authenticated with check (bucket_id = 'notes' and (storage.foldername(name))[1] = (select auth.uid())::text);
drop policy if exists "Students delete their own note files" on storage.objects;
create policy "Students delete their own note files" on storage.objects for delete to authenticated using (bucket_id = 'notes' and (storage.foldername(name))[1] = (select auth.uid())::text);
drop policy if exists "Students can submit reports" on public.reports;
create policy "Students can submit reports" on public.reports for insert to authenticated with check (reporter_id = (select auth.uid()));
drop policy if exists "Students can view their own reports" on public.reports;
create policy "Students can view their own reports" on public.reports for select to authenticated using (reporter_id = (select auth.uid()));

create index if not exists tasks_owner_due_idx on public.tasks(owner_id, due_at);
create index if not exists groups_course_idx on public.study_groups(course);
create index if not exists notes_course_created_idx on public.shared_notes(course, created_at desc);
create index if not exists reports_status_created_idx on public.reports(status, created_at);
