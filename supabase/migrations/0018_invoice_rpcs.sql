-- 0018: transactional invoice create/update. Idempotent.
-- Moves invoice writes out of the browser so a failure can never leave an
-- invoice without lines, a task billed twice, or a total that disagrees with
-- its lines. Totals are computed here from the stored rates, rounded per line.
-- Runs as the caller (security invoker), so RLS still scopes every row.

-- A paid advance can be credited against a final invoice only once.
create unique index if not exists invoice_items_one_credit_per_invoice_uidx
  on invoice_items(credit_invoice_id) where kind = 'advance_credit';

-- Writes the lines for an invoice and returns their sum.
-- p_items is an array of:
--   { "kind": "task",           "task_id": uuid }
--   { "kind": "flat_fee",       "name": text, "amount": number }
--   { "kind": "amount",         "name": text, "amount": number }   -- advance / milestone request
--   { "kind": "advance_credit", "credit_invoice_id": uuid }        -- less: advance already received
create or replace function write_invoice_items(p_invoice uuid, p_currency currency_code, p_items jsonb)
returns numeric
language plpgsql security invoker as $$
declare
  it jsonb;
  k text;
  tsk record;
  adv record;
  line numeric;
  total numeric := 0;
  linked integer;
begin
  for it in select * from jsonb_array_elements(coalesce(p_items, '[]'::jsonb))
  loop
    k := it ->> 'kind';
    if k = 'task' then
      select t.id, t.task_name, t.date, t.duration_seconds, t.billable, t.invoice_id,
             p.hourly_rate, p.currency as project_currency
        into tsk
        from tasks t left join projects p on p.id = t.project_id
       where t.id = (it ->> 'task_id')::uuid;
      if not found then raise exception 'Task not found'; end if;
      if not tsk.billable then raise exception 'Task "%" is not billable', tsk.task_name; end if;
      if tsk.project_currency is not null and tsk.project_currency <> p_currency then
        raise exception 'Task "%" is in %, but the invoice is in %', tsk.task_name, tsk.project_currency, p_currency;
      end if;
      line := round((tsk.duration_seconds / 3600.0) * coalesce(tsk.hourly_rate, 0), 2);
      insert into invoice_items (invoice_id, task_id, task_name, task_date, duration_seconds, rate, amount, kind)
      values (p_invoice, tsk.id, tsk.task_name, tsk.date, tsk.duration_seconds, coalesce(tsk.hourly_rate, 0), line, 'task');
      -- Guarded link: fails if another invoice grabbed the task first.
      update tasks set invoice_id = p_invoice where id = tsk.id and invoice_id is null;
      get diagnostics linked = row_count;
      if linked = 0 then raise exception 'Task "%" is already on another invoice', tsk.task_name; end if;
    elsif k in ('flat_fee', 'amount') then
      line := round((it ->> 'amount')::numeric, 2);
      if line is null or line <= 0 then raise exception 'Amount must be greater than 0'; end if;
      insert into invoice_items (invoice_id, task_id, task_name, task_date, duration_seconds, rate, amount, kind)
      values (p_invoice, null, coalesce(nullif(it ->> 'name', ''), 'Payment'), current_date, 0, 0, line, k);
    elsif k = 'advance_credit' then
      select i.id, i.invoice_number, i.currency, i.kind, i.amount_paid into adv
        from invoices i where i.id = (it ->> 'credit_invoice_id')::uuid;
      if not found then raise exception 'Advance invoice not found'; end if;
      if adv.kind not in ('advance', 'milestone') then raise exception 'Only advance or milestone invoices can be credited'; end if;
      if adv.currency <> p_currency then raise exception 'Advance % is in %, not %', adv.invoice_number, adv.currency, p_currency; end if;
      if adv.amount_paid <= 0 then raise exception 'Advance % has no payment received yet', adv.invoice_number; end if;
      line := -adv.amount_paid;
      insert into invoice_items (invoice_id, task_id, task_name, task_date, duration_seconds, rate, amount, kind, credit_invoice_id)
      values (p_invoice, null, 'Less: advance received (' || adv.invoice_number || ')', current_date, 0, 0, line, 'advance_credit', adv.id);
    else
      raise exception 'Unknown line kind %', k;
    end if;
    total := total + line;
  end loop;

  if total < 0 then raise exception 'Invoice total cannot be negative'; end if;
  return total;
end $$;

create or replace function create_invoice(p jsonb) returns invoices
language plpgsql security invoker as $$
declare
  inv invoices;
  proj projects;
  cur currency_code := (p ->> 'currency')::currency_code;
  total numeric;
  uid uuid := auth.uid();
begin
  if uid is null then raise exception 'Not authenticated'; end if;
  if nullif(p ->> 'project_id', '') is not null then
    select * into proj from projects where id = (p ->> 'project_id')::uuid;
  end if;

  insert into invoices (
    user_id, created_by, client_id, project_id, invoice_number, total, currency, status, kind,
    issue_date, due_date, period_start, period_end, notes, fx_rate, fx_base
  ) values (
    uid, uid,
    nullif(p ->> 'client_id', '')::uuid,
    nullif(p ->> 'project_id', '')::uuid,
    coalesce(nullif(p ->> 'invoice_number', ''), next_invoice_number()),
    0, cur,
    coalesce(nullif(p ->> 'status', ''), 'draft')::invoice_status,
    coalesce(nullif(p ->> 'kind', ''), 'standard'),
    coalesce(nullif(p ->> 'issue_date', '')::date, current_date),
    nullif(p ->> 'due_date', '')::date,
    nullif(p ->> 'period_start', '')::date,
    nullif(p ->> 'period_end', '')::date,
    nullif(p ->> 'notes', ''),
    coalesce(nullif(p ->> 'fx_rate', '')::numeric, case when proj.currency = cur then proj.fx_rate end),
    coalesce(nullif(p ->> 'fx_base', '')::currency_code, case when proj.currency = cur then proj.fx_base end)
  ) returning * into inv;

  total := write_invoice_items(inv.id, cur, p -> 'items');
  update invoices set total = total where id = inv.id returning * into inv;
  return inv;
end $$;

create or replace function update_invoice(p_id uuid, p jsonb) returns invoices
language plpgsql security invoker as $$
declare
  inv invoices;
  cur currency_code := (p ->> 'currency')::currency_code;
  total numeric;
begin
  select * into inv from invoices where id = p_id for update;
  if not found then raise exception 'Invoice not found'; end if;
  if exists (select 1 from invoice_payments where invoice_id = p_id) then
    raise exception 'This invoice has payments recorded and can no longer be edited. Delete the payments first.';
  end if;

  update tasks set invoice_id = null where invoice_id = p_id;
  delete from invoice_items where invoice_id = p_id;

  update invoices set
    client_id = nullif(p ->> 'client_id', '')::uuid,
    project_id = nullif(p ->> 'project_id', '')::uuid,
    invoice_number = coalesce(nullif(p ->> 'invoice_number', ''), invoice_number),
    currency = cur,
    status = coalesce(nullif(p ->> 'status', ''), status::text)::invoice_status,
    issue_date = coalesce(nullif(p ->> 'issue_date', '')::date, issue_date),
    due_date = nullif(p ->> 'due_date', '')::date,
    period_start = nullif(p ->> 'period_start', '')::date,
    period_end = nullif(p ->> 'period_end', '')::date,
    notes = nullif(p ->> 'notes', '')
  where id = p_id;

  total := write_invoice_items(p_id, cur, p -> 'items');
  update invoices set total = total where id = p_id returning * into inv;
  return inv;
end $$;

grant execute on function create_invoice(jsonb) to authenticated;
grant execute on function update_invoice(uuid, jsonb) to authenticated;
grant execute on function write_invoice_items(uuid, currency_code, jsonb) to authenticated;
