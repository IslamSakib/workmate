-- Adds a read-only client portal: a client gets their own auth.users login,
-- scoped to exactly their own client_id — not account-wide like
-- team_members/has_min_role. This is a deliberately separate, parallel
-- access path; it does not touch team_members, TeamRole, or any existing
-- policy from 0006/0007. Purely additive — safe to re-run (every statement
-- is idempotent) on a live project with real data.

create table if not exists client_portal_access (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references auth.users(id) on delete cascade,
  client_id uuid not null references clients(id) on delete cascade,
  member_id uuid references auth.users(id) on delete cascade,
  invited_email text not null,
  status text not null default 'invited',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (client_id, invited_email)
);

create index if not exists client_portal_access_account_id_idx on client_portal_access(account_id);
create index if not exists client_portal_access_client_id_idx on client_portal_access(client_id);
create index if not exists client_portal_access_member_id_idx on client_portal_access(member_id);

alter table client_portal_access enable row level security;

do $$
begin
  if not exists (select 1 from pg_trigger where tgname = 'trg_client_portal_access_updated_at') then
    create trigger trg_client_portal_access_updated_at before update on client_portal_access
      for each row execute function set_updated_at();
  end if;
end $$;

-- The account owner/Manager+ manage invites; the portal user can see their
-- own row (so the app can show "pending" state if ever needed).
drop policy if exists "client_portal_access_manage" on client_portal_access;
create policy "client_portal_access_manage" on client_portal_access
  for all using (has_min_role(account_id, 'manager')) with check (has_min_role(account_id, 'manager'));

drop policy if exists "client_portal_access_self_select" on client_portal_access;
create policy "client_portal_access_self_select" on client_portal_access
  for select using (auth.uid() = member_id);

create or replace function has_client_portal_access(target_client_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from client_portal_access
    where client_id = target_client_id
      and member_id = auth.uid()
      and status = 'active'
  );
$$;

-- Link an invited client to their portal access on signup, the same way
-- handle_new_user() already links invited team members (0006).
create or replace function handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, display_name) values (new.id, new.raw_user_meta_data->>'display_name');
  insert into public.settings (user_id) values (new.id);

  update public.team_members
  set member_id = new.id, status = 'active'
  where lower(invited_email) = lower(new.email) and status = 'invited';

  update public.client_portal_access
  set member_id = new.id, status = 'active'
  where lower(invited_email) = lower(new.email) and status = 'invited';

  return new;
end;
$$ language plpgsql security definer set search_path = public;

-- Additive, SELECT-only policies layered on top of the existing
-- owner/team policies (Postgres OR's multiple permissive policies
-- together for the same command, so this never loosens anything that
-- already exists — it only adds a new way IN for a client's own rows).
drop policy if exists "clients_portal_select" on clients;
create policy "clients_portal_select" on clients
  for select using (has_client_portal_access(id));

drop policy if exists "projects_portal_select" on projects;
create policy "projects_portal_select" on projects
  for select using (client_id is not null and has_client_portal_access(client_id));

drop policy if exists "tasks_portal_select" on tasks;
create policy "tasks_portal_select" on tasks
  for select using (client_id is not null and has_client_portal_access(client_id));

drop policy if exists "invoices_portal_select" on invoices;
create policy "invoices_portal_select" on invoices
  for select using (client_id is not null and has_client_portal_access(client_id));

drop policy if exists "invoice_items_portal_select" on invoice_items;
create policy "invoice_items_portal_select" on invoice_items
  for select using (
    exists (
      select 1 from invoices i
      where i.id = invoice_items.invoice_id
        and i.client_id is not null
        and has_client_portal_access(i.client_id)
    )
  );

-- Project-level deliverable sign-off. No UPDATE policy is granted to
-- clients on `projects` (it has far more sensitive columns like
-- hourly_rate) — the RPC below is the only door, and it only ever touches
-- these two columns.
alter table projects add column if not exists client_approval_status text
  check (client_approval_status in ('pending', 'approved'));
alter table projects add column if not exists client_approved_at timestamptz;

create or replace function approve_project_deliverable(target_project_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_client_id uuid;
begin
  select client_id into v_client_id from projects where id = target_project_id;

  if v_client_id is null or not has_client_portal_access(v_client_id) then
    raise exception 'Not authorized to approve this project';
  end if;

  update projects
  set client_approval_status = 'approved', client_approved_at = now()
  where id = target_project_id;
end;
$$;
