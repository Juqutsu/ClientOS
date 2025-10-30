create extension if not exists pgcrypto;
create extension if not exists pg_trgm;

-- Users table mirrors auth.users (subset for profile fields)
create table if not exists public.users (
  id uuid primary key,
  email text unique not null,
  full_name text,
  avatar_url text,
  avatar_storage_path text,
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
  role text default 'owner' check (role in ('owner','admin','member')),
  created_at timestamp with time zone default now(),
  unique (workspace_id, user_id)
);

create table if not exists public.workspace_audit_logs (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid references public.workspaces(id) on delete cascade,
  action text not null,
  actor_id uuid references public.users(id),
  target_id uuid references public.users(id),
  resource_type text,
  resource_id text,
  summary text,
  metadata jsonb default '{}'::jsonb,
  created_at timestamp with time zone default now()
);

create index if not exists workspace_audit_logs_workspace_idx on public.workspace_audit_logs (workspace_id, created_at desc);
create index if not exists workspace_audit_logs_resource_idx on public.workspace_audit_logs (workspace_id, resource_type, resource_id);

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
  description text,
  notes text,
  due_date date,
  updated_at timestamp with time zone default now(),
  created_at timestamp with time zone default now()
);

create table if not exists public.files (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references public.projects(id) on delete cascade,
  file_url text,
  storage_path text,
  file_name text,
  uploaded_by uuid references public.users(id),
  file_size bigint,
  mime_type text,
  scan_status text default 'pending' check (scan_status in ('pending','scanning','clean','flagged','failed')),
  scan_reference text,
  folder text,
  tags text[] default '{}',
  preview_url text,
  updated_at timestamp with time zone default now(),
  created_at timestamp with time zone default now()
);

create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid references public.workspaces(id) on delete cascade,
  stripe_customer_id text,
  stripe_subscription_id text,
  status text,
  plan text default 'starter',
  trial_started_at timestamp with time zone,
  trial_ends_at timestamp with time zone,
  entitlements jsonb default '{}'::jsonb,
  updated_at timestamp with time zone default now()
);

create index if not exists subscriptions_workspace_idx on public.subscriptions (workspace_id);
create index if not exists subscriptions_status_idx on public.subscriptions (status);

create table if not exists public.stripe_event_logs (
  id text primary key,
  type text not null,
  workspace_id uuid references public.workspaces(id) on delete cascade,
  status text default 'pending' check (status in ('pending','processed','error')),
  error_message text,
  payload jsonb,
  created_at timestamp with time zone default now(),
  processed_at timestamp with time zone
);

create index if not exists stripe_event_logs_workspace_idx on public.stripe_event_logs (workspace_id, created_at desc);

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

create policy users_workspace_select on public.users
  for select using (exists (
    select 1 from public.workspace_members wm
    where wm.user_id = auth.uid()
      and wm.workspace_id in (
        select workspace_id from public.workspace_members wm2
        where wm2.user_id = users.id
      )
  ));
create policy users_self_update on public.users
  for update using (auth.uid() = id);

-- Users: allow a user to insert their own row
create policy users_self_insert on public.users
  for insert with check (auth.uid() = id);

-- Workspace members: user can see own memberships
create policy wm_self_select on public.workspace_members
  for select using (auth.uid() = user_id);

create policy wm_workspace_select on public.workspace_members
  for select using (exists (
    select 1 from public.workspace_members wm
    where wm.workspace_id = workspace_members.workspace_id and wm.user_id = auth.uid()
  ));

-- Workspace members: allow creator to add themselves as owner for newly created workspace
create policy wm_creator_self_insert on public.workspace_members
  for insert with check (
    user_id = auth.uid() and exists (
      select 1 from public.workspaces w
      where w.id = workspace_members.workspace_id and w.created_by = auth.uid()
    )
  );

create policy wm_admin_update on public.workspace_members
  for update using (exists (
    select 1 from public.workspace_members wm
    where wm.workspace_id = workspace_members.workspace_id
      and wm.user_id = auth.uid()
      and wm.role in ('owner','admin')
  ))
  with check (role in ('owner','admin','member'));

create policy wm_admin_delete on public.workspace_members
  for delete using (exists (
    select 1 from public.workspace_members wm
    where wm.workspace_id = workspace_members.workspace_id
      and wm.user_id = auth.uid()
      and wm.role in ('owner','admin')
  ));

-- Workspaces: members can select
create policy ws_members_select on public.workspaces
  for select using (exists (
    select 1 from public.workspace_members wm
    where wm.workspace_id = workspaces.id and wm.user_id = auth.uid()
  ));

-- Workspaces: allow insert by the creator (self)
create policy ws_self_insert on public.workspaces
  for insert with check (created_by = auth.uid());

-- Workspaces: allow update by owners/admins
create policy ws_admins_update on public.workspaces
  for update using (exists (
    select 1 from public.workspace_members wm
    where wm.workspace_id = workspaces.id and wm.user_id = auth.uid() and wm.role in ('owner','admin')
  )) with check (exists (
    select 1 from public.workspace_members wm
    where wm.workspace_id = workspaces.id and wm.user_id = auth.uid() and wm.role in ('owner','admin')
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

alter table public.workspace_audit_logs enable row level security;

create policy wal_members_select on public.workspace_audit_logs
  for select using (exists (
    select 1 from public.workspace_members wm
    where wm.workspace_id = workspace_audit_logs.workspace_id
      and wm.user_id = auth.uid()
  ));

create policy wal_admin_insert on public.workspace_audit_logs
  for insert with check (exists (
    select 1 from public.workspace_members wm
    where wm.workspace_id = workspace_audit_logs.workspace_id
      and wm.user_id = auth.uid()
      and wm.role in ('owner','admin')
  ));

-- Tasks indexes for filtering/searching
create index if not exists tasks_project_status_idx on public.tasks (project_id, status);
create index if not exists tasks_project_due_idx on public.tasks (project_id, due_date);
create index if not exists tasks_project_created_idx on public.tasks (project_id, created_at desc);
create index if not exists tasks_search_idx on public.tasks using gin (
  to_tsvector('simple', coalesce(title, '') || ' ' || coalesce(description, '') || ' ' || coalesce(notes, ''))
);

-- Files indexes for filtering/searching
create index if not exists files_project_folder_idx on public.files (project_id, folder);
create index if not exists files_project_created_idx on public.files (project_id, created_at desc);
create index if not exists files_tags_idx on public.files using gin (tags);

-- Storage: create public bucket for project files
-- Note: This requires "Supabase Storage" SQL helpers to be available in your project
-- If not, run this via the SQL editor:
-- select storage.create_bucket('project-files', public => true);
-- Optionally create an avatars bucket (can be private with signed URLs)
-- select storage.create_bucket('avatars', public => true);
