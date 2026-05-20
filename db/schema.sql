-- =============================================================================
-- ConstructionPro — Database Schema (Supabase / Postgres 15+)
-- =============================================================================
--
-- Multi-tenant model:
--   organization → has many members (users with roles)
--                 → has many projects
--                      → has many reports (daily / hse / snagging / quick-log)
--                      → has many snags (with photos & assignment)
--                      → has many drawings (with folders)
--
-- Security:
--   Row-Level Security (RLS) is ENABLED on every business table. A user can
--   only see rows belonging to an organization where they are an active
--   member. Server-side functions (Edge Functions, the service role) bypass
--   RLS using the service key.
--
-- To apply:
--   1. Open the Supabase SQL Editor for your project.
--   2. Paste this file's contents.
--   3. Run.
--   (Or use `supabase db push` from the Supabase CLI if you adopt that flow.)
--
-- Versioning:
--   This is the v1 baseline schema. Future migrations live in
--   db/migrations/000N_*.sql and should be additive (avoid destructive DDL).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Extensions
-- -----------------------------------------------------------------------------
create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

-- -----------------------------------------------------------------------------
-- ENUMS
-- -----------------------------------------------------------------------------
do $$ begin
    create type member_role as enum ('owner', 'admin', 'pm', 'engineer', 'inspector', 'subcontractor', 'viewer');
exception when duplicate_object then null; end $$;

do $$ begin
    create type project_status as enum ('planning', 'active', 'completed', 'on-hold');
exception when duplicate_object then null; end $$;

do $$ begin
    create type report_type as enum ('daily', 'hse', 'snagging', 'quick-log');
exception when duplicate_object then null; end $$;

do $$ begin
    create type report_status as enum ('draft', 'submitted', 'approved');
exception when duplicate_object then null; end $$;

do $$ begin
    create type snag_severity as enum ('high', 'moderate', 'low');
exception when duplicate_object then null; end $$;

do $$ begin
    create type snag_status as enum ('pending', 'in_progress', 'completed', 'defect_remains');
exception when duplicate_object then null; end $$;

-- -----------------------------------------------------------------------------
-- profiles — 1:1 with auth.users, exposes editable display info
-- -----------------------------------------------------------------------------
create table if not exists public.profiles (
    id uuid primary key references auth.users(id) on delete cascade,
    display_name text not null default '',
    avatar_url text,
    locale text not null default 'en',
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- organizations — top-level tenant
-- -----------------------------------------------------------------------------
create table if not exists public.organizations (
    id uuid primary key default uuid_generate_v4(),
    name text not null,
    slug text not null unique,
    created_by uuid not null references auth.users(id) on delete restrict,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- organization_members — user ↔ org with role
-- -----------------------------------------------------------------------------
create table if not exists public.organization_members (
    organization_id uuid not null references public.organizations(id) on delete cascade,
    user_id uuid not null references auth.users(id) on delete cascade,
    role member_role not null default 'engineer',
    invited_by uuid references auth.users(id),
    invited_at timestamptz default now(),
    accepted_at timestamptz,
    primary key (organization_id, user_id)
);

create index if not exists organization_members_user_idx
    on public.organization_members(user_id);

-- -----------------------------------------------------------------------------
-- Helper: is_org_member(org, user)
-- Used by every RLS policy to keep them short and consistent.
-- SECURITY DEFINER so it doesn't itself need RLS exemptions.
-- -----------------------------------------------------------------------------
create or replace function public.is_org_member(_org_id uuid, _user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
    select exists (
        select 1
        from public.organization_members
        where organization_id = _org_id
          and user_id = _user_id
    );
$$;

-- -----------------------------------------------------------------------------
-- projects
-- -----------------------------------------------------------------------------
create table if not exists public.projects (
    id uuid primary key default uuid_generate_v4(),
    organization_id uuid not null references public.organizations(id) on delete cascade,
    name text not null,
    location text not null default '',
    client text not null default '',
    description text,
    contract_value numeric(14,2),
    start_date date,
    end_date date,
    project_manager text,
    status project_status not null default 'planning',
    photo_url text,
    created_by uuid not null references auth.users(id) on delete restrict,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create index if not exists projects_org_idx on public.projects(organization_id);
create index if not exists projects_status_idx on public.projects(organization_id, status);

-- -----------------------------------------------------------------------------
-- reports (daily / hse / snagging / quick-log)
-- template_data is jsonb instead of stringified JSON.
-- -----------------------------------------------------------------------------
create table if not exists public.reports (
    id uuid primary key default uuid_generate_v4(),
    organization_id uuid not null references public.organizations(id) on delete cascade,
    project_id uuid not null references public.projects(id) on delete cascade,
    type report_type not null,
    report_date date not null default current_date,
    author text not null default '',
    author_user_id uuid references auth.users(id) on delete set null,
    template_data jsonb not null default '{}'::jsonb,
    status report_status not null default 'draft',
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create index if not exists reports_project_idx on public.reports(project_id);
create index if not exists reports_org_type_idx on public.reports(organization_id, type);
create index if not exists reports_date_idx on public.reports(project_id, report_date desc);

-- -----------------------------------------------------------------------------
-- snags — first-class entity (was previously nested in snagging report JSON)
-- -----------------------------------------------------------------------------
create table if not exists public.snags (
    id uuid primary key default uuid_generate_v4(),
    organization_id uuid not null references public.organizations(id) on delete cascade,
    project_id uuid not null references public.projects(id) on delete cascade,
    report_id uuid references public.reports(id) on delete set null,
    system text,
    asset_name text,
    location text,
    level text,
    room text,
    issue text not null default '',
    recommendation text,
    severity snag_severity not null default 'moderate',
    contractor text,
    target_date date,
    status snag_status not null default 'pending',
    reinspection_notes text,
    photo_url text,
    assigned_to uuid references auth.users(id) on delete set null,
    created_by uuid not null references auth.users(id) on delete restrict,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create index if not exists snags_project_idx on public.snags(project_id);
create index if not exists snags_status_idx on public.snags(project_id, status);
create index if not exists snags_assignee_idx on public.snags(assigned_to);

-- -----------------------------------------------------------------------------
-- drawing_folders + drawings
-- File contents live in Supabase Storage; only the storage path is stored.
-- -----------------------------------------------------------------------------
create table if not exists public.drawing_folders (
    id uuid primary key default uuid_generate_v4(),
    organization_id uuid not null references public.organizations(id) on delete cascade,
    project_id uuid not null references public.projects(id) on delete cascade,
    parent_id uuid references public.drawing_folders(id) on delete cascade,
    name text not null,
    created_by uuid not null references auth.users(id) on delete restrict,
    created_at timestamptz not null default now()
);

create index if not exists drawing_folders_project_idx
    on public.drawing_folders(project_id);

create table if not exists public.drawings (
    id uuid primary key default uuid_generate_v4(),
    organization_id uuid not null references public.organizations(id) on delete cascade,
    project_id uuid not null references public.projects(id) on delete cascade,
    folder_id uuid references public.drawing_folders(id) on delete set null,
    name text not null,
    file_type text not null check (file_type in ('pdf', 'image', 'cad', 'word', 'excel', 'other')),
    storage_path text not null,  -- e.g. orgs/<org>/projects/<proj>/drawings/<file>
    size_bytes bigint not null default 0,
    author text not null default '',
    author_user_id uuid references auth.users(id) on delete set null,
    uploaded_at timestamptz not null default now()
);

create index if not exists drawings_project_idx on public.drawings(project_id);
create index if not exists drawings_folder_idx on public.drawings(folder_id);

-- -----------------------------------------------------------------------------
-- updated_at trigger — fires on every row update of any table that has it
-- -----------------------------------------------------------------------------
create or replace function public.tg_set_updated_at()
returns trigger
language plpgsql
as $$
begin
    new.updated_at = now();
    return new;
end;
$$;

do $$
declare t text;
begin
    foreach t in array array['profiles','organizations','projects','reports','snags']
    loop
        execute format(
            'drop trigger if exists set_updated_at on public.%I; ' ||
            'create trigger set_updated_at before update on public.%I ' ||
            'for each row execute function public.tg_set_updated_at();',
            t, t
        );
    end loop;
end $$;

-- -----------------------------------------------------------------------------
-- Bootstrap: when a new auth.users row appears, create a matching profile
-- -----------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
    insert into public.profiles (id, display_name)
    values (new.id, coalesce(new.raw_user_meta_data->>'display_name', ''))
    on conflict (id) do nothing;
    return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
    after insert on auth.users
    for each row execute function public.handle_new_user();

-- =============================================================================
-- ROW LEVEL SECURITY
-- =============================================================================
alter table public.profiles            enable row level security;
alter table public.organizations       enable row level security;
alter table public.organization_members enable row level security;
alter table public.projects            enable row level security;
alter table public.reports             enable row level security;
alter table public.snags               enable row level security;
alter table public.drawing_folders     enable row level security;
alter table public.drawings            enable row level security;

-- ---- profiles ---------------------------------------------------------------
drop policy if exists "profiles_select_self_or_orgmate" on public.profiles;
create policy "profiles_select_self_or_orgmate" on public.profiles
    for select using (
        id = auth.uid()
        or exists (
            select 1
            from public.organization_members m1
            join public.organization_members m2 on m1.organization_id = m2.organization_id
            where m1.user_id = auth.uid() and m2.user_id = profiles.id
        )
    );

drop policy if exists "profiles_update_self" on public.profiles;
create policy "profiles_update_self" on public.profiles
    for update using (id = auth.uid()) with check (id = auth.uid());

-- ---- organizations ----------------------------------------------------------
drop policy if exists "orgs_select_member" on public.organizations;
create policy "orgs_select_member" on public.organizations
    for select using (public.is_org_member(id, auth.uid()));

drop policy if exists "orgs_insert_self" on public.organizations;
create policy "orgs_insert_self" on public.organizations
    for insert with check (created_by = auth.uid());

drop policy if exists "orgs_update_admin" on public.organizations;
create policy "orgs_update_admin" on public.organizations
    for update using (
        exists (
            select 1 from public.organization_members
            where organization_id = organizations.id
              and user_id = auth.uid()
              and role in ('owner', 'admin')
        )
    );

-- ---- organization_members ---------------------------------------------------
drop policy if exists "om_select_member" on public.organization_members;
create policy "om_select_member" on public.organization_members
    for select using (public.is_org_member(organization_id, auth.uid()));

drop policy if exists "om_insert_admin" on public.organization_members;
create policy "om_insert_admin" on public.organization_members
    for insert with check (
        -- Either this is the very first member (owner self-insert)
        invited_by = auth.uid()
        or exists (
            select 1 from public.organization_members om
            where om.organization_id = organization_members.organization_id
              and om.user_id = auth.uid()
              and om.role in ('owner', 'admin')
        )
    );

drop policy if exists "om_update_admin" on public.organization_members;
create policy "om_update_admin" on public.organization_members
    for update using (
        exists (
            select 1 from public.organization_members om
            where om.organization_id = organization_members.organization_id
              and om.user_id = auth.uid()
              and om.role in ('owner', 'admin')
        )
    );

drop policy if exists "om_delete_admin" on public.organization_members;
create policy "om_delete_admin" on public.organization_members
    for delete using (
        exists (
            select 1 from public.organization_members om
            where om.organization_id = organization_members.organization_id
              and om.user_id = auth.uid()
              and om.role in ('owner', 'admin')
        )
    );

-- ---- A reusable pattern for the rest: any member can CRUD within their org --
-- For tighter control later, swap the using/with-check clauses for role-aware
-- variants (e.g. only PM/admin can DELETE projects).
-- -----------------------------------------------------------------------------

-- Macro-like block: same policy shape for projects, reports, snags, folders, drawings.
do $$
declare t text;
begin
    foreach t in array array['projects','reports','snags','drawing_folders','drawings']
    loop
        execute format($p$
            drop policy if exists "%1$s_select_member" on public.%1$s;
            create policy "%1$s_select_member" on public.%1$s
                for select using (public.is_org_member(organization_id, auth.uid()));

            drop policy if exists "%1$s_insert_member" on public.%1$s;
            create policy "%1$s_insert_member" on public.%1$s
                for insert with check (public.is_org_member(organization_id, auth.uid()));

            drop policy if exists "%1$s_update_member" on public.%1$s;
            create policy "%1$s_update_member" on public.%1$s
                for update using (public.is_org_member(organization_id, auth.uid()))
                with check (public.is_org_member(organization_id, auth.uid()));

            drop policy if exists "%1$s_delete_member" on public.%1$s;
            create policy "%1$s_delete_member" on public.%1$s
                for delete using (public.is_org_member(organization_id, auth.uid()));
        $p$, t);
    end loop;
end $$;

-- =============================================================================
-- DONE. After running this, also create a Storage bucket called
-- "constructionpro" with the policy:
--   "only authenticated org members can read/write paths starting with
--    orgs/<their org id>/"
-- See docs/BACKEND_SETUP.md for the recommended Storage bucket setup.
-- =============================================================================
