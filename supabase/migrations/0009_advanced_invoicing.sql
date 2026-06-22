-- Adds advanced invoicing: scheduled invoices, recurring invoice templates,
-- partial payments, invoice notes, and reminder tracking. Purely additive —
-- no changes to existing columns besides the invoice_status enum gaining two
-- new values. Safe to re-run (every statement is idempotent) on a live
-- project with real data.

-- ALTER TYPE ... ADD VALUE cannot run in the same transaction that uses the
-- new value, so these are standalone statements guarded by a pg_enum check
-- rather than IF NOT EXISTS (which ADD VALUE doesn't support pre-PG12).
do $$
begin
  if not exists (select 1 from pg_enum where enumlabel = 'scheduled' and enumtypid = 'invoice_status'::regtype) then
    alter type invoice_status add value 'scheduled';
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_enum where enumlabel = 'partial' and enumtypid = 'invoice_status'::regtype) then
    alter type invoice_status add value 'partial';
  end if;
end $$;

alter table invoices add column if not exists notes text;
alter table invoices add column if not exists scheduled_date date;
alter table invoices add column if not exists last_reminder_sent_at timestamptz;
alter table invoices add column if not exists reminder_count integer not null default 0;
alter table invoices add column if not exists amount_paid numeric(12, 2) not null default 0;

-- ---------------------------------------------------------------------------
-- invoice_payments (partial payments against an invoice)
-- ---------------------------------------------------------------------------
create table if not exists invoice_payments (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references invoices(id) on delete cascade,
  amount numeric(12, 2) not null,
  paid_date date not null default current_date,
  method text,
  notes text,
  created_at timestamptz not null default now()
);

create index if not exists invoice_payments_invoice_id_idx on invoice_payments(invoice_id);

alter table invoice_payments enable row level security;

drop policy if exists "invoice_payments_owner" on invoice_payments;
create policy "invoice_payments_owner" on invoice_payments
  for all using (
    exists (select 1 from invoices i where i.id = invoice_payments.invoice_id and has_min_role(i.user_id, 'manager'))
  )
  with check (
    exists (select 1 from invoices i where i.id = invoice_payments.invoice_id and has_min_role(i.user_id, 'manager'))
  );

-- ---------------------------------------------------------------------------
-- recurring_invoices (templates that lazily generate invoices on app load)
-- ---------------------------------------------------------------------------
create table if not exists recurring_invoices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  created_by uuid references auth.users(id),
  client_id uuid references clients(id) on delete set null,
  project_id uuid references projects(id) on delete set null,
  currency currency_code not null default 'USD',
  frequency text not null check (frequency in ('weekly', 'monthly', 'quarterly')),
  next_run_date date not null default current_date,
  active boolean not null default true,
  last_generated_invoice_id uuid references invoices(id) on delete set null,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists recurring_invoices_user_id_idx on recurring_invoices(user_id);
create index if not exists recurring_invoices_client_id_idx on recurring_invoices(client_id);

alter table recurring_invoices enable row level security;

do $$
begin
  if not exists (select 1 from pg_trigger where tgname = 'trg_recurring_invoices_updated_at') then
    create trigger trg_recurring_invoices_updated_at before update on recurring_invoices
      for each row execute function set_updated_at();
  end if;
end $$;

drop policy if exists "recurring_invoices_owner" on recurring_invoices;
create policy "recurring_invoices_owner" on recurring_invoices
  for all using (has_min_role(user_id, 'manager')) with check (has_min_role(user_id, 'manager'));

-- Extend the audit trail to recurring_invoices using the same generic
-- trigger function every other business table already uses. invoice_payments
-- has no user_id column (same as invoice_items, which is excluded for the
-- same reason) so it's intentionally left out of this loop.
do $$
begin
  if not exists (select 1 from pg_trigger where tgname = 'trg_audit_recurring_invoices') then
    create trigger trg_audit_recurring_invoices after insert or update or delete on recurring_invoices
      for each row execute function log_audit_entry();
  end if;
end $$;
