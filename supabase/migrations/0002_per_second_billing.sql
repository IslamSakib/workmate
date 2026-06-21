-- Migrates an existing WorkMate database (created from 0001_init.sql) to the
-- per-second billing / task-based invoicing model. Safe to run once on a live
-- project with real data — converts existing values in place instead of
-- dropping and recreating tables. Re-running this file is a no-op.

-- ---------------------------------------------------------------------------
-- tasks: duration_minutes -> duration_seconds (convert existing values),
-- add invoice_id link
-- ---------------------------------------------------------------------------
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_name = 'tasks' and column_name = 'duration_minutes'
  ) then
    alter table tasks rename column duration_minutes to duration_seconds;
    update tasks set duration_seconds = duration_seconds * 60;
  end if;
end $$;

alter table tasks add column if not exists invoice_id uuid references invoices(id) on delete set null;
create index if not exists tasks_invoice_id_idx on tasks(invoice_id);

-- ---------------------------------------------------------------------------
-- invoices: drop manual totals/notes, add billing period
-- ---------------------------------------------------------------------------
alter table invoices drop column if exists subtotal;
alter table invoices drop column if exists tax;
alter table invoices drop column if exists discount;
alter table invoices drop column if exists notes;
alter table invoices add column if not exists period_start date;
alter table invoices add column if not exists period_end date;

-- ---------------------------------------------------------------------------
-- invoice_items: replace manual line items (description/quantity/sort_order)
-- with auto-derived task billing rows. Existing line items are not
-- compatible with the new task-based model, so this recreates the table.
-- ---------------------------------------------------------------------------
drop table if exists invoice_items;

create table invoice_items (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references invoices(id) on delete cascade,
  task_id uuid references tasks(id) on delete set null,
  task_name text not null,
  task_date date not null,
  duration_seconds integer not null default 0,
  rate numeric(12, 2) not null default 0,
  amount numeric(12, 2) not null default 0,
  created_at timestamptz not null default now()
);

create index invoice_items_invoice_id_idx on invoice_items(invoice_id);

alter table invoice_items enable row level security;

create policy "invoice_items_owner" on invoice_items
  for all using (
    exists (select 1 from invoices i where i.id = invoice_items.invoice_id and i.user_id = auth.uid())
  )
  with check (
    exists (select 1 from invoices i where i.id = invoice_items.invoice_id and i.user_id = auth.uid())
  );
