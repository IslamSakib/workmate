-- Enforces the approved per-role permission matrix. Module 4 shipped
-- multi-user login deliberately blanket (every role could do everything the
-- Owner could) — this migration is the confirmed fast-follow that actually
-- restricts Manager/Employee access. Pure policy/function replacement, no
-- data-touching statements (simpler to review than 0006).
--
-- Matrix:
--   Clients/Projects/Attachments : Owner/Admin/Manager full,  Employee read-only
--   Tasks/Time Entries           : Owner/Admin/Manager full,  Employee full on own records only
--   Invoices/Retainers           : Owner/Admin/Manager full,  Employee no access
--   Expenses                     : Owner/Admin full, Manager read-only, Employee no access
--   Team (manage)                : Owner/Admin manage, Manager/Employee view only
--   Audit Logs                   : Owner/Admin/Manager full,  Employee no access
--     (not in the original spec, but audit diffs can contain invoice/expense
--     amounts, so excluding Employee from those tables must extend here too
--     or Audit Logs becomes a side-channel leak of the same data)

create or replace function has_min_role(target_user_id uuid, min_role team_role)
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
        and (case role when 'admin' then 3 when 'manager' then 2 when 'employee' then 1 end)
            >= (case min_role when 'admin' then 3 when 'manager' then 2 when 'employee' then 1 end)
    );
$$;

-- clients, projects, attachments: read for any team member, write for manager+
drop policy if exists "clients_owner" on clients;
drop policy if exists "clients_select" on clients;
drop policy if exists "clients_insert" on clients;
drop policy if exists "clients_update" on clients;
drop policy if exists "clients_delete" on clients;
create policy "clients_select" on clients for select using (has_account_access(user_id));
create policy "clients_insert" on clients for insert with check (has_min_role(user_id, 'manager'));
create policy "clients_update" on clients for update using (has_min_role(user_id, 'manager')) with check (has_min_role(user_id, 'manager'));
create policy "clients_delete" on clients for delete using (has_min_role(user_id, 'manager'));

drop policy if exists "projects_owner" on projects;
drop policy if exists "projects_select" on projects;
drop policy if exists "projects_insert" on projects;
drop policy if exists "projects_update" on projects;
drop policy if exists "projects_delete" on projects;
create policy "projects_select" on projects for select using (has_account_access(user_id));
create policy "projects_insert" on projects for insert with check (has_min_role(user_id, 'manager'));
create policy "projects_update" on projects for update using (has_min_role(user_id, 'manager')) with check (has_min_role(user_id, 'manager'));
create policy "projects_delete" on projects for delete using (has_min_role(user_id, 'manager'));

drop policy if exists "attachments_owner" on attachments;
drop policy if exists "attachments_select" on attachments;
drop policy if exists "attachments_insert" on attachments;
drop policy if exists "attachments_update" on attachments;
drop policy if exists "attachments_delete" on attachments;
create policy "attachments_select" on attachments for select using (has_account_access(user_id));
create policy "attachments_insert" on attachments for insert with check (has_min_role(user_id, 'manager'));
create policy "attachments_update" on attachments for update using (has_min_role(user_id, 'manager')) with check (has_min_role(user_id, 'manager'));
create policy "attachments_delete" on attachments for delete using (has_min_role(user_id, 'manager'));

-- tasks, time_entries: manager+ full access; employee only their own records
drop policy if exists "tasks_owner" on tasks;
drop policy if exists "tasks_select" on tasks;
drop policy if exists "tasks_insert" on tasks;
drop policy if exists "tasks_update" on tasks;
drop policy if exists "tasks_delete" on tasks;
create policy "tasks_select" on tasks for select using (
  has_min_role(user_id, 'manager') or (has_account_access(user_id) and created_by = auth.uid())
);
create policy "tasks_insert" on tasks for insert with check (
  has_min_role(user_id, 'manager') or (has_account_access(user_id) and created_by = auth.uid())
);
create policy "tasks_update" on tasks for update using (
  has_min_role(user_id, 'manager') or (has_account_access(user_id) and created_by = auth.uid())
) with check (
  has_min_role(user_id, 'manager') or (has_account_access(user_id) and created_by = auth.uid())
);
create policy "tasks_delete" on tasks for delete using (
  has_min_role(user_id, 'manager') or (has_account_access(user_id) and created_by = auth.uid())
);

drop policy if exists "time_entries_owner" on time_entries;
drop policy if exists "time_entries_select" on time_entries;
drop policy if exists "time_entries_insert" on time_entries;
drop policy if exists "time_entries_update" on time_entries;
drop policy if exists "time_entries_delete" on time_entries;
create policy "time_entries_select" on time_entries for select using (
  has_min_role(user_id, 'manager') or (has_account_access(user_id) and created_by = auth.uid())
);
create policy "time_entries_insert" on time_entries for insert with check (
  has_min_role(user_id, 'manager') or (has_account_access(user_id) and created_by = auth.uid())
);
create policy "time_entries_update" on time_entries for update using (
  has_min_role(user_id, 'manager') or (has_account_access(user_id) and created_by = auth.uid())
) with check (
  has_min_role(user_id, 'manager') or (has_account_access(user_id) and created_by = auth.uid())
);
create policy "time_entries_delete" on time_entries for delete using (
  has_min_role(user_id, 'manager') or (has_account_access(user_id) and created_by = auth.uid())
);

-- invoices, retainers: manager+ full access; employee no access at all
drop policy if exists "invoices_owner" on invoices;
create policy "invoices_owner" on invoices
  for all using (has_min_role(user_id, 'manager')) with check (has_min_role(user_id, 'manager'));

drop policy if exists "retainers_owner" on retainers;
create policy "retainers_owner" on retainers
  for all using (has_min_role(user_id, 'manager')) with check (has_min_role(user_id, 'manager'));

drop policy if exists "invoice_items_owner" on invoice_items;
create policy "invoice_items_owner" on invoice_items
  for all using (
    exists (select 1 from invoices i where i.id = invoice_items.invoice_id and has_min_role(i.user_id, 'manager'))
  )
  with check (
    exists (select 1 from invoices i where i.id = invoice_items.invoice_id and has_min_role(i.user_id, 'manager'))
  );

-- expenses: manager+ read, admin+ write, employee no access
drop policy if exists "expenses_owner" on expenses;
drop policy if exists "expenses_select" on expenses;
drop policy if exists "expenses_insert" on expenses;
drop policy if exists "expenses_update" on expenses;
drop policy if exists "expenses_delete" on expenses;
create policy "expenses_select" on expenses for select using (has_min_role(user_id, 'manager'));
create policy "expenses_insert" on expenses for insert with check (has_min_role(user_id, 'admin'));
create policy "expenses_update" on expenses for update using (has_min_role(user_id, 'admin')) with check (has_min_role(user_id, 'admin'));
create policy "expenses_delete" on expenses for delete using (has_min_role(user_id, 'admin'));

-- team_members: any active member can view the whole list; admin+ manage
drop policy if exists "team_members_select" on team_members;
drop policy if exists "team_members_owner_manage" on team_members;
drop policy if exists "team_members_manage" on team_members;
create policy "team_members_select" on team_members
  for select using (has_account_access(account_id) or auth.uid() = member_id);
create policy "team_members_manage" on team_members
  for all using (has_min_role(account_id, 'admin')) with check (has_min_role(account_id, 'admin'));

-- audit_logs: manager+ only — diffs can contain invoice/expense amounts, so
-- Employee exclusion from those tables must extend here too.
drop policy if exists "audit_logs_select_own" on audit_logs;
create policy "audit_logs_select" on audit_logs
  for select using (has_min_role(user_id, 'manager'));
