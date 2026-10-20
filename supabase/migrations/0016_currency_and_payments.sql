-- 0016: reporting currency + exchange rates, advance/milestone invoices,
-- credit lines, and DB-enforced payment status. Additive and idempotent.
-- The proposals feature is gone from the app, so its anonymous RPCs are
-- dropped; the proposals table and its data are left untouched.

-- ---------------------------------------------------------------------------
-- Currency
-- ---------------------------------------------------------------------------
-- settings.default_currency is the base/reporting currency.
-- exchange_rates: { "USD": 120, "EUR": 130 } = units of default_currency per 1 unit.
alter table settings add column if not exists exchange_rates jsonb not null default '{}'::jsonb;
alter table settings add column if not exists rates_updated_at timestamptz;

-- Agreed rate for a project: 1 <project currency> = fx_rate <fx_base>.
alter table projects add column if not exists fx_rate numeric(14, 6);
alter table projects add column if not exists fx_base currency_code;
alter table invoices add column if not exists fx_rate numeric(14, 6);
alter table invoices add column if not exists fx_base currency_code;
alter table invoice_payments add column if not exists fx_rate numeric(14, 6);
alter table invoice_payments add column if not exists reference text;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'projects_fx_rate_positive') then
    alter table projects add constraint projects_fx_rate_positive check (fx_rate is null or fx_rate > 0);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'invoices_fx_rate_positive') then
    alter table invoices add constraint invoices_fx_rate_positive check (fx_rate is null or fx_rate > 0);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'invoice_payments_fx_rate_positive') then
    alter table invoice_payments add constraint invoice_payments_fx_rate_positive check (fx_rate is null or fx_rate > 0);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'invoice_payments_amount_positive') then
    alter table invoice_payments add constraint invoice_payments_amount_positive check (amount > 0) not valid;
  end if;
end $$;

-- Default currency for new accounts is BDT.
alter table settings alter column default_currency set default 'BDT';

-- ---------------------------------------------------------------------------
-- Invoice kinds: standard (task-derived), advance (deposit), milestone (any amount)
-- ---------------------------------------------------------------------------
alter table invoices add column if not exists kind text not null default 'standard';
alter table invoice_items add column if not exists kind text not null default 'task';
-- Credit lines on a final invoice point at the advance/milestone invoice they settle.
alter table invoice_items add column if not exists credit_invoice_id uuid references invoices(id) on delete restrict;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'invoices_kind_check') then
    alter table invoices add constraint invoices_kind_check check (kind in ('standard', 'advance', 'milestone'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'invoice_items_kind_check') then
    alter table invoice_items add constraint invoice_items_kind_check
      check (kind in ('task', 'flat_fee', 'amount', 'advance_credit'));
  end if;
end $$;

-- Flat-fee lines were previously identified only by task_id is null.
update invoice_items set kind = 'flat_fee' where task_id is null and kind = 'task' and amount >= 0;

create index if not exists invoice_items_credit_invoice_id_idx on invoice_items(credit_invoice_id);
create index if not exists invoices_user_status_idx on invoices(user_id, status);
create index if not exists invoices_project_id_idx on invoices(project_id);
create index if not exists tasks_client_id_idx on tasks(client_id);
create index if not exists invoice_items_task_id_idx on invoice_items(task_id);

-- ---------------------------------------------------------------------------
-- Payments: DB keeps amount_paid and status in sync (advance, partial, full).
-- ---------------------------------------------------------------------------
create or replace function guard_invoice_payment() returns trigger
language plpgsql as $$
declare
  paid numeric;
  inv_total numeric;
begin
  select coalesce(sum(amount), 0) into paid
    from invoice_payments
   where invoice_id = new.invoice_id and id is distinct from new.id;
  select total into inv_total from invoices where id = new.invoice_id;
  if inv_total is null then
    raise exception 'Invoice not found';
  end if;
  if paid + new.amount > inv_total then
    raise exception 'Payment exceeds the balance due (% remaining)', inv_total - paid;
  end if;
  return new;
end $$;

drop trigger if exists trg_guard_invoice_payment on invoice_payments;
create trigger trg_guard_invoice_payment before insert or update on invoice_payments
  for each row execute function guard_invoice_payment();

create or replace function sync_invoice_payment_status() returns trigger
language plpgsql as $$
declare
  inv uuid := coalesce(new.invoice_id, old.invoice_id);
  paid numeric;
  inv_total numeric;
  cur invoice_status;
begin
  select coalesce(sum(amount), 0) into paid from invoice_payments where invoice_id = inv;
  select total, status into inv_total, cur from invoices where id = inv;
  if not found then
    return null; -- invoice deleted (cascade)
  end if;
  update invoices
     set amount_paid = paid,
         status = case
           when inv_total > 0 and paid >= inv_total then 'paid'::invoice_status
           when paid > 0 then 'partial'::invoice_status
           when cur in ('paid', 'partial') then 'sent'::invoice_status
           else cur
         end
   where id = inv;
  return null;
end $$;

drop trigger if exists trg_sync_invoice_payment_status on invoice_payments;
create trigger trg_sync_invoice_payment_status after insert or update or delete on invoice_payments
  for each row execute function sync_invoice_payment_status();

-- ---------------------------------------------------------------------------
-- Invoice numbers: one atomic counter per account, using settings.invoice_prefix.
-- ---------------------------------------------------------------------------
alter table settings add column if not exists next_invoice_seq integer not null default 1;

create or replace function next_invoice_number() returns text
language plpgsql security invoker as $$
declare
  prefix text;
  seq integer;
begin
  update settings
     set next_invoice_seq = next_invoice_seq + 1
   where user_id = auth.uid()
  returning invoice_prefix, next_invoice_seq - 1 into prefix, seq;
  if seq is null then
    raise exception 'Settings row not found';
  end if;
  return prefix || lpad(seq::text, 4, '0');
end $$;

grant execute on function next_invoice_number() to authenticated;

-- ---------------------------------------------------------------------------
-- Proposals feature removed from the app: close the anonymous entry points.
-- ---------------------------------------------------------------------------
drop function if exists get_public_proposal(uuid);
drop function if exists accept_public_proposal(uuid, text);
