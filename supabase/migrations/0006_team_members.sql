-- Adds multi-user team access: a teammate gets their own auth.users login,
-- joined to the account owner's data via a new team_members table and a
-- role tag (admin/manager/employee). v1 is deliberately blanket — every
-- role can read/write everything the owner could, exactly like today; no
-- per-role data restrictions exist yet (that is an explicit, separate
-- fast-follow once exact rules are confirmed).
--
-- NOTE: unlike migrations 0003-0005, this one contains real data-touching
-- UPDATE statements (the created_by backfill below), not just additive DDL.
-- Each is idempotent (guarded by `where created_by is null`) and only fills
-- a brand-new nullable column — it never overwrites existing data.

create type team_role as enum ('admin', 'manager', 'employee');

create table if not exists team_members (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references auth.users(id) on delete cascade,
  member_id uuid references auth.users(id) on delete cascade,
  invited_email text not null,
  role team_role not null default 'employee',
  status text not null default 'invited',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (account_id, invited_email)
);

create index if not exists team_members_account_id_idx on team_members(account_id);
create index if not exists team_members_member_id_idx on team_members(member_id);

alter table team_members enable row level security;

do $$
begin
  if not exists (select 1 from pg_trigger where tgname = 'trg_team_members_updated_at') then
    create trigger trg_team_members_updated_at before update on team_members
      for each row execute function set_updated_at();
  end if;
end $$;

-- Both sides of the relationship can see it; only the account owner manages
-- it in v1 (Admin-level team management needs role-rank checks, deferred).
drop policy if exists "team_members_select" on team_members;
create policy "team_members_select" on team_members
  for select using (auth.uid() = account_id or auth.uid() = member_id);

drop policy if exists "team_members_owner_manage" on team_members;
create policy "team_members_owner_manage" on team_members
  for all using (auth.uid() = account_id) with check (auth.uid() = account_id);

-- Reusable check: does the calling user have access to this account's data
-- (either they ARE the account, or they're an active team member of it)?
create or replace function has_account_access(target_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select target_user_id = auth.uid()
    or exists (
      select 1 from team_members
      where account_id = target_user_id
        and member_id = auth.uid()
        and status = 'active'
    );
$$;

-- Swap every business-table policy from "is the owner" to "has account
-- access" (owner OR active team member). Drop+create is itself idempotent.
drop policy if exists "clients_owner" on clients;
create policy "clients_owner" on clients
  for all using (has_account_access(user_id)) with check (has_account_access(user_id));

drop policy if exists "projects_owner" on projects;
create policy "projects_owner" on projects
  for all using (has_account_access(user_id)) with check (has_account_access(user_id));

drop policy if exists "tasks_owner" on tasks;
create policy "tasks_owner" on tasks
  for all using (has_account_access(user_id)) with check (has_account_access(user_id));

drop policy if exists "time_entries_owner" on time_entries;
create policy "time_entries_owner" on time_entries
  for all using (has_account_access(user_id)) with check (has_account_access(user_id));

drop policy if exists "invoices_owner" on invoices;
create policy "invoices_owner" on invoices
  for all using (has_account_access(user_id)) with check (has_account_access(user_id));

drop policy if exists "attachments_owner" on attachments;
create policy "attachments_owner" on attachments
  for all using (has_account_access(user_id)) with check (has_account_access(user_id));

drop policy if exists "retainers_owner" on retainers;
create policy "retainers_owner" on retainers
  for all using (has_account_access(user_id)) with check (has_account_access(user_id));

drop policy if exists "expenses_owner" on expenses;
create policy "expenses_owner" on expenses
  for all using (has_account_access(user_id)) with check (has_account_access(user_id));

drop policy if exists "invoice_items_owner" on invoice_items;
create policy "invoice_items_owner" on invoice_items
  for all using (
    exists (select 1 from invoices i where i.id = invoice_items.invoice_id and has_account_access(i.user_id))
  )
  with check (
    exists (select 1 from invoices i where i.id = invoice_items.invoice_id and has_account_access(i.user_id))
  );

-- created_by: tracks WHO actually performed the action, distinct from
-- user_id (the account/owner). Additive, nullable; backfilled for existing
-- rows since today's creator IS the owner.
alter table clients add column if not exists created_by uuid references auth.users(id);
alter table projects add column if not exists created_by uuid references auth.users(id);
alter table tasks add column if not exists created_by uuid references auth.users(id);
alter table time_entries add column if not exists created_by uuid references auth.users(id);
alter table invoices add column if not exists created_by uuid references auth.users(id);
alter table retainers add column if not exists created_by uuid references auth.users(id);
alter table expenses add column if not exists created_by uuid references auth.users(id);

update clients set created_by = user_id where created_by is null;
update projects set created_by = user_id where created_by is null;
update tasks set created_by = user_id where created_by is null;
update time_entries set created_by = user_id where created_by is null;
update invoices set created_by = user_id where created_by is null;
update retainers set created_by = user_id where created_by is null;
update expenses set created_by = user_id where created_by is null;

-- audit_logs.actor_id: today the trigger records the row's OWNER as
-- user_id, not who actually pulled the trigger — fine for a single-owner
-- account, misleading once team members exist. Add the real actor.
alter table audit_logs add column if not exists actor_id uuid references auth.users(id);

create or replace function log_audit_entry()
returns trigger as $$
declare
  v_user_id uuid;
  v_record_id uuid;
begin
  if tg_op = 'DELETE' then
    v_user_id := old.user_id;
    v_record_id := old.id;
  else
    v_user_id := new.user_id;
    v_record_id := new.id;
  end if;

  insert into audit_logs (user_id, actor_id, table_name, record_id, action, old_values, new_values)
  values (
    v_user_id,
    auth.uid(),
    tg_table_name,
    v_record_id,
    lower(tg_op),
    case when tg_op in ('UPDATE', 'DELETE') then to_jsonb(old) else null end,
    case when tg_op in ('INSERT', 'UPDATE') then to_jsonb(new) else null end
  );

  return coalesce(new, old);
end;
$$ language plpgsql security definer set search_path = public;

-- Link an invited teammate to their team on signup, instead of leaving them
-- as an unrelated standalone account. Existing profile/settings creation is
-- unchanged and harmless even for team members (those rows are just unused
-- for them; queries against business tables go through has_account_access).
create or replace function handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, display_name) values (new.id, new.raw_user_meta_data->>'display_name');
  insert into public.settings (user_id) values (new.id);

  update public.team_members
  set member_id = new.id, status = 'active'
  where lower(invited_email) = lower(new.email) and status = 'invited';

  return new;
end;
$$ language plpgsql security definer set search_path = public;
