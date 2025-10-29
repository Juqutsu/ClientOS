-- Enable required extension for UUID generation
create extension if not exists pgcrypto;

-- Users table mirrors auth.users (subset for profile fields)
create table if not exists public.users (
  id uuid primary key,
  email text unique not null,
  full_name text,
  avatar_url text,
  created_at timestamp with time zone default now()
);

create table if not exists public.workspaces (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_by uuid references public.users(id),
  created_at timestamp with time zone default now()
);

create table if not exists public.workspace_members (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid references public.workspaces(id) on delete cascade,
  user_id uuid references public.users(id) on delete cascade,
  role text default 'owner'
);

create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid references public.workspaces(id) on delete cascade,
  name text,
  description text,
  client_name text,
  share_id text unique,
  created_at timestamp with time zone default now()
);

create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references public.projects(id) on delete cascade,
  title text,
  status text default 'todo',
  created_at timestamp with time zone default now()
);

create table if not exists public.files (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references public.projects(id) on delete cascade,
  file_url text,
  file_name text,
  uploaded_by uuid references public.users(id),
  created_at timestamp with time zone default now()
);

create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid references public.workspaces(id) on delete cascade,
  stripe_customer_id text,
  stripe_subscription_id text,
  status text,
  plan text default 'starter'
);

-- Row Level Security
alter table public.users enable row level security;
alter table public.workspaces enable row level security;
alter table public.workspace_members enable row level security;
alter table public.projects enable row level security;
alter table public.tasks enable row level security;
alter table public.files enable row level security;
alter table public.subscriptions enable row level security;

-- Users: user can view/update their own row
create policy users_self_select on public.users
  for select using (auth.uid() = id);
create policy users_self_update on public.users
  for update using (auth.uid() = id);

-- Workspace members: user can see own memberships
create policy wm_self_select on public.workspace_members
  for select using (auth.uid() = user_id);

-- Workspaces: members can select
create policy ws_members_select on public.workspaces
  for select using (exists (
    select 1 from public.workspace_members wm
    where wm.workspace_id = workspaces.id and wm.user_id = auth.uid()
  ));

-- Projects: members can select/insert/update/delete
create policy projects_members_select on public.projects
  for select using (exists (
    select 1 from public.workspace_members wm
    where wm.workspace_id = projects.workspace_id and wm.user_id = auth.uid()
  ));
create policy projects_members_modify on public.projects
  for all using (exists (
    select 1 from public.workspace_members wm
    where wm.workspace_id = projects.workspace_id and wm.user_id = auth.uid()
  ));

-- Tasks: members can select/modify
create policy tasks_members_all on public.tasks
  for all using (exists (
    select 1 from public.projects p
    join public.workspace_members wm on wm.workspace_id = p.workspace_id
    where p.id = tasks.project_id and wm.user_id = auth.uid()
  ));

-- Files: members can select/modify
create policy files_members_all on public.files
  for all using (exists (
    select 1 from public.projects p
    join public.workspace_members wm on wm.workspace_id = p.workspace_id
    where p.id = files.project_id and wm.user_id = auth.uid()
  ));

-- Subscriptions: members can select; modifications via service role only
create policy subs_members_select on public.subscriptions
  for select using (exists (
    select 1 from public.workspace_members wm
    where wm.workspace_id = subscriptions.workspace_id and wm.user_id = auth.uid()
  ));

-- Storage: create public bucket for project files
-- Note: This requires "Supabase Storage" SQL helpers to be available in your project
-- If not, run this via the SQL editor:
-- select storage.create_bucket('project-files', public => true);
-- Optionally create an avatars bucket (can be private with signed URLs)
-- select storage.create_bucket('avatars', public => true);
