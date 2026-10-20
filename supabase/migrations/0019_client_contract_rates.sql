-- 0019: contract exchange rates per client (and per recurring job). Idempotent, additive.
-- Rate precedence when an invoice is issued: project agreed rate, then the recurring
-- template's rate, then the client's contract rate, then (at reporting time) the
-- Settings rate table. A rate only applies when its currency matches the invoice's.

alter table clients add column if not exists fx_rate numeric(14, 6);
alter table clients add column if not exists fx_base currency_code;
alter table recurring_invoices add column if not exists fx_rate numeric(14, 6);
alter table recurring_invoices add column if not exists fx_base currency_code;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'clients_fx_rate_positive') then
    alter table clients add constraint clients_fx_rate_positive check (fx_rate is null or fx_rate > 0);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'recurring_fx_rate_positive') then
    alter table recurring_invoices add constraint recurring_fx_rate_positive check (fx_rate is null or fx_rate > 0);
  end if;
end $$;

-- Fills the snapshot on every new invoice (manual, advance or generated) so create_invoice
-- and generate_recurring_invoices need no changes and history never shifts later.
create or replace function fill_invoice_fx() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  r record;
begin
  if new.fx_rate is not null then
    return new;
  end if;

  select fx_rate, fx_base into r from projects
   where id = new.project_id and currency = new.currency and fx_rate is not null;
  if found then
    new.fx_rate := r.fx_rate; new.fx_base := r.fx_base; return new;
  end if;

  if new.recurring_id is not null then
    select fx_rate, fx_base into r from recurring_invoices
     where id = new.recurring_id and currency = new.currency and fx_rate is not null;
    if found then
      new.fx_rate := r.fx_rate; new.fx_base := r.fx_base; return new;
    end if;
  end if;

  select fx_rate, fx_base into r from clients
   where id = new.client_id and currency = new.currency and fx_rate is not null;
  if found then
    new.fx_rate := r.fx_rate; new.fx_base := r.fx_base;
  end if;
  return new;
end $$;

drop trigger if exists trg_fill_invoice_fx on invoices;
create trigger trg_fill_invoice_fx before insert on invoices
  for each row execute function fill_invoice_fx();
