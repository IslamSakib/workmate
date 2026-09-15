-- Reverts the app to single-user (one freelancer, no teammates, no client
-- logins). Drops everything added by 0006 (team_members), 0007 (permission
-- matrix), 0008 (timesheet approval), 0010 (client portal), and the audit
-- log from 0005/0006 — all of it existed to support multiple people sharing
-- one account, which this app will never need. `created_by`/`user_id` stay
-- as-is (harmless, already always the same person for a solo account).
--
-- Destructive: drops tables/columns. Safe to re-run (every statement is
-- idempotent), but back up first if you have real team/client-portal/audit
-- data you want to keep before running this.

-- ---------------------------------------------------------------------------
-- 1. Drop triggers that depend on functions we're about to drop
-- ---------------------------------------------------------------------------
do $$
declare
  t text;
begin
  foreach t in array array['clients', 'projects', 'tasks', 'time_entries', 'invoices', 'retainers', 'expenses']
  loop
    execute format('drop trigger if exists %I on %I', 'trg_audit_' || t, t);
  end loop;
end $$;

drop trigger if exists trg_tasks_approval_default on tasks;
drop trigger if exists trg_tasks_prevent_self_approval on tasks;
drop trigger if exists trg_audit_recurring_invoices on recurring_invoices;

-- ---------------------------------------------------------------------------
-- 2. Simplify handle_new_user() back to just profile + settings
-- ---------------------------------------------------------------------------
create or replace function handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, display_name) values (new.id, new.raw_user_meta_data->>'display_name');
  insert into public.settings (user_id) values (new.id);
  return new;
end;
$$ language plpgsql security definer set search_path = public;

-- ---------------------------------------------------------------------------
-- 3. Revert every RLS policy to plain owner-only (auth.uid() = user_id)
-- ---------------------------------------------------------------------------
drop policy if exists "clients_select" on clients;
drop policy if exists "clients_insert" on clients;
drop policy if exists "clients_update" on clients;
drop policy if exists "clients_delete" on clients;
drop policy if exists "clients_portal_select" on clients;
drop policy if exists "clients_owner" on clients;
create policy "clients_owner" on clients
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "projects_select" on projects;
drop policy if exists "projects_insert" on projects;
drop policy if exists "projects_update" on projects;
drop policy if exists "projects_delete" on projects;
drop policy if exists "projects_portal_select" on projects;
drop policy if exists "projects_owner" on projects;
create policy "projects_owner" on projects
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "tasks_select" on tasks;
drop policy if exists "tasks_insert" on tasks;
drop policy if exists "tasks_update" on tasks;
drop policy if exists "tasks_delete" on tasks;
drop policy if exists "tasks_portal_select" on tasks;
drop policy if exists "tasks_owner" on tasks;
create policy "tasks_owner" on tasks
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "time_entries_select" on time_entries;
drop policy if exists "time_entries_insert" on time_entries;
drop policy if exists "time_entries_update" on time_entries;
drop policy if exists "time_entries_delete" on time_entries;
drop policy if exists "time_entries_owner" on time_entries;
create policy "time_entries_owner" on time_entries
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "invoices_portal_select" on invoices;
drop policy if exists "invoices_owner" on invoices;
create policy "invoices_owner" on invoices
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "invoice_items_portal_select" on invoice_items;
drop policy if exists "invoice_items_owner" on invoice_items;
create policy "invoice_items_owner" on invoice_items
  for all using (
    exists (select 1 from invoices i where i.id = invoice_items.invoice_id and i.user_id = auth.uid())
  )
  with check (
    exists (select 1 from invoices i where i.id = invoice_items.invoice_id and i.user_id = auth.uid())
  );

drop policy if exists "attachments_select" on attachments;
drop policy if exists "attachments_insert" on attachments;
drop policy if exists "attachments_update" on attachments;
drop policy if exists "attachments_delete" on attachments;
drop policy if exists "attachments_owner" on attachments;
create policy "attachments_owner" on attachments
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "retainers_owner" on retainers;
create policy "retainers_owner" on retainers
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "expenses_select" on expenses;
drop policy if exists "expenses_insert" on expenses;
drop policy if exists "expenses_update" on expenses;
drop policy if exists "expenses_delete" on expenses;
drop policy if exists "expenses_owner" on expenses;
create policy "expenses_owner" on expenses
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "invoice_payments_owner" on invoice_payments;
create policy "invoice_payments_owner" on invoice_payments
  for all using (
    exists (select 1 from invoices i where i.id = invoice_payments.invoice_id and i.user_id = auth.uid())
  )
  with check (
    exists (select 1 from invoices i where i.id = invoice_payments.invoice_id and i.user_id = auth.uid())
  );

drop policy if exists "recurring_invoices_owner" on recurring_invoices;
create policy "recurring_invoices_owner" on recurring_invoices
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- 4. Drop the multi-user/portal/audit tables (cascades their own policies,
--    triggers and indexes -- must happen before dropping the functions
--    below, since those tables' policies reference them)
-- ---------------------------------------------------------------------------
drop table if exists team_members cascade;
drop table if exists client_portal_access cascade;
drop table if exists audit_logs cascade;

-- ---------------------------------------------------------------------------
-- 5. Drop the now-unused functions
-- ---------------------------------------------------------------------------
drop function if exists log_audit_entry();
drop function if exists set_task_approval_default();
drop function if exists prevent_self_approval();
drop function if exists approve_project_deliverable(uuid);
drop function if exists has_client_portal_access(uuid);
drop function if exists has_min_role(uuid, team_role);
drop function if exists has_account_access(uuid);

drop type if exists team_role;

-- ---------------------------------------------------------------------------
-- 6. Drop the approval/client-approval columns
-- ---------------------------------------------------------------------------
alter table tasks drop column if exists approval_status;
alter table tasks drop column if exists submitted_at;
alter table tasks drop column if exists approved_by;
alter table tasks drop column if exists approved_at;
alter table tasks drop column if exists rejection_reason;

alter table projects drop column if exists client_approval_status;
alter table projects drop column if exists client_approved_at;
