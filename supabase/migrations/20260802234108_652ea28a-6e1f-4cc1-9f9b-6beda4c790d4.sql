-- Authenticated, tenant-isolated persistence for the CRM.
-- The application stores its existing typed domain objects as individual JSONB
-- records so the current UI can become database-backed without duplicating
-- business state across pages.

create schema if not exists private;

create table if not exists public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.workspaces (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 2 and 120),
  slug text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.workspace_members (
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('owner', 'front_desk', 'therapist')),
  status text not null default 'active' check (status in ('active', 'disabled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (workspace_id, user_id)
);

create table if not exists public.crm_records (
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  entity_type text not null check (
    entity_type in (
      'activity',
      'appointments',
      'audit_log',
      'automations',
      'business',
      'campaigns',
      'clients',
      'conversations',
      'leads',
      'locations',
      'message_templates',
      'notifications',
      'reviews',
      'services',
      'tasks',
      'team',
      'therapists'
    )
  ),
  entity_id text not null check (char_length(entity_id) between 1 and 160),
  location_id text,
  payload jsonb not null check (jsonb_typeof(payload) = 'object'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id),
  primary key (workspace_id, entity_type, entity_id)
);

create index if not exists crm_records_workspace_type_idx
  on public.crm_records (workspace_id, entity_type);

create index if not exists crm_records_workspace_location_idx
  on public.crm_records (workspace_id, location_id)
  where location_id is not null;

create or replace function private.set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function private.set_updated_at();

drop trigger if exists workspaces_set_updated_at on public.workspaces;
create trigger workspaces_set_updated_at
before update on public.workspaces
for each row execute function private.set_updated_at();

drop trigger if exists workspace_members_set_updated_at on public.workspace_members;
create trigger workspace_members_set_updated_at
before update on public.workspace_members
for each row execute function private.set_updated_at();

drop trigger if exists crm_records_set_updated_at on public.crm_records;
create trigger crm_records_set_updated_at
before update on public.crm_records
for each row execute function private.set_updated_at();

create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (user_id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', ''))
  on conflict (user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function private.handle_new_user();

create or replace function private.is_workspace_member(target_workspace_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select (select auth.uid()) is not null
    and exists (
      select 1
      from public.workspace_members member
      where member.workspace_id = target_workspace_id
        and member.user_id = (select auth.uid())
        and member.status = 'active'
    );
$$;

create or replace function private.has_workspace_role(
  target_workspace_id uuid,
  allowed_roles text[]
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select (select auth.uid()) is not null
    and exists (
      select 1
      from public.workspace_members member
      where member.workspace_id = target_workspace_id
        and member.user_id = (select auth.uid())
        and member.status = 'active'
        and member.role = any(allowed_roles)
    );
$$;

revoke all on function private.is_workspace_member(uuid) from public;
revoke all on function private.has_workspace_role(uuid, text[]) from public;
grant execute on function private.is_workspace_member(uuid) to authenticated;
grant execute on function private.has_workspace_role(uuid, text[]) to authenticated;
grant usage on schema private to authenticated;

alter table public.profiles enable row level security;
alter table public.workspaces enable row level security;
alter table public.workspace_members enable row level security;
alter table public.crm_records enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own"
on public.profiles for select
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
on public.profiles for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists "workspaces_select_member_or_creator" on public.workspaces;
create policy "workspaces_select_member_or_creator"
on public.workspaces for select
to authenticated
using (
  created_by = (select auth.uid())
  or (select private.is_workspace_member(id))
);

drop policy if exists "workspaces_insert_creator" on public.workspaces;
create policy "workspaces_insert_creator"
on public.workspaces for insert
to authenticated
with check (created_by = (select auth.uid()));

drop policy if exists "workspaces_update_owner" on public.workspaces;
create policy "workspaces_update_owner"
on public.workspaces for update
to authenticated
using ((select private.has_workspace_role(id, array['owner']::text[])))
with check ((select private.has_workspace_role(id, array['owner']::text[])));

drop policy if exists "workspace_members_select_member" on public.workspace_members;
create policy "workspace_members_select_member"
on public.workspace_members for select
to authenticated
using ((select private.is_workspace_member(workspace_id)));

drop policy if exists "workspace_members_insert_creator_or_owner" on public.workspace_members;
create policy "workspace_members_insert_creator_or_owner"
on public.workspace_members for insert
to authenticated
with check (
  (
    user_id = (select auth.uid())
    and exists (
      select 1
      from public.workspaces workspace
      where workspace.id = workspace_id
        and workspace.created_by = (select auth.uid())
    )
  )
  or (select private.has_workspace_role(workspace_id, array['owner']::text[]))
);

drop policy if exists "workspace_members_update_owner" on public.workspace_members;
create policy "workspace_members_update_owner"
on public.workspace_members for update
to authenticated
using ((select private.has_workspace_role(workspace_id, array['owner']::text[])))
with check ((select private.has_workspace_role(workspace_id, array['owner']::text[])));

drop policy if exists "workspace_members_delete_owner" on public.workspace_members;
create policy "workspace_members_delete_owner"
on public.workspace_members for delete
to authenticated
using (
  user_id <> (select auth.uid())
  and (select private.has_workspace_role(workspace_id, array['owner']::text[]))
);

drop policy if exists "crm_records_select_member" on public.crm_records;
create policy "crm_records_select_member"
on public.crm_records for select
to authenticated
using ((select private.is_workspace_member(workspace_id)));

drop policy if exists "crm_records_insert_staff" on public.crm_records;
create policy "crm_records_insert_staff"
on public.crm_records for insert
to authenticated
with check (
  updated_by = (select auth.uid())
  and (
    select private.has_workspace_role(
      workspace_id,
      array['owner', 'front_desk']::text[]
    )
  )
);

drop policy if exists "crm_records_update_staff" on public.crm_records;
create policy "crm_records_update_staff"
on public.crm_records for update
to authenticated
using (
  (
    select private.has_workspace_role(
      workspace_id,
      array['owner', 'front_desk']::text[]
    )
  )
)
with check (
  updated_by = (select auth.uid())
  and (
    select private.has_workspace_role(
      workspace_id,
      array['owner', 'front_desk']::text[]
    )
  )
);

drop policy if exists "crm_records_delete_owner" on public.crm_records;
create policy "crm_records_delete_owner"
on public.crm_records for delete
to authenticated
using ((select private.has_workspace_role(workspace_id, array['owner']::text[])));

revoke all on table public.profiles from anon;
revoke all on table public.workspaces from anon;
revoke all on table public.workspace_members from anon;
revoke all on table public.crm_records from anon;

grant select, update on table public.profiles to authenticated;
grant select, insert, update on table public.workspaces to authenticated;
grant select, insert, update, delete on table public.workspace_members to authenticated;
grant select, insert, update, delete on table public.crm_records to authenticated;

grant usage on schema public to authenticated;

grant select, insert, update, delete on table public.profiles to service_role;
grant select, insert, update, delete on table public.workspaces to service_role;
grant select, insert, update, delete on table public.workspace_members to service_role;
grant select, insert, update, delete on table public.crm_records to service_role;

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'crm_records'
  ) then
    alter publication supabase_realtime add table public.crm_records;
  end if;
end
$$;