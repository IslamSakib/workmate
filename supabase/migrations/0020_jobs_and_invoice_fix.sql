-- 0020: (a) fix "column reference total is ambiguous" in the invoice RPCs,
-- (b) jobs: full-time / part-time employment paid in arrears. Idempotent.

-- ---------------------------------------------------------------- (a) invoice RPCs
-- The plpgsql variable `total` clashed with the invoices.total column. Renamed to inv_total.
create or replace function write_invoice_items(p_invoice uuid, p_currency currency_code, p_items jsonb)
returns numeric
language plpgsql security invoker as $$
declare
  it jsonb;
  k text;
  tsk record;
  adv record;
  line numeric;
  inv_total numeric := 0;
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
    inv_total := inv_total + line;
  end loop;

  if inv_total < 0 then raise exception 'Invoice total cannot be negative'; end if;
  return inv_total;
end $$;

create or replace function create_invoice(p jsonb) returns invoices
language plpgsql security invoker as $$
declare
  inv invoices;
  proj projects;
  cur currency_code := (p ->> 'currency')::currency_code;
  inv_total numeric;
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

  inv_total := write_invoice_items(inv.id, cur, p -> 'items');
  update invoices set total = inv_total where id = inv.id returning * into inv;
  return inv;
end $$;

create or replace function update_invoice(p_id uuid, p jsonb) returns invoices
language plpgsql security invoker as $$
declare
  inv invoices;
  cur currency_code := (p ->> 'currency')::currency_code;
  inv_total numeric;
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

  inv_total := write_invoice_items(p_id, cur, p -> 'items');
  update invoices set total = inv_total where id = p_id returning * into inv;
  return inv;
end $$;

grant execute on function create_invoice(jsonb) to authenticated;
grant execute on function update_invoice(uuid, jsonb) to authenticated;
grant execute on function write_invoice_items(uuid, currency_code, jsonb) to authenticated;

-- ---------------------------------------------------------------- (b) jobs
-- employment_type null = ordinary client billing (unchanged behaviour).
-- For a job, pay is in arrears: the invoice issued on next_run_date covers the
-- period BEFORE it (join 1 Jul -> start_date 1 Aug -> first invoice = 1-31 Jul).
-- ends_on on a job is the last working day; the final period containing it is still paid.
alter table recurring_invoices add column if not exists employment_type text;
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'recurring_employment_type_check') then
    alter table recurring_invoices add constraint recurring_employment_type_check
      check (employment_type is null or employment_type in ('full_time', 'part_time'));
  end if;
end $$;

-- Salary / amount history: a raise applies to periods starting on or after effective_from.
create table if not exists recurring_amount_changes (
  id uuid primary key default gen_random_uuid(),
  recurring_id uuid not null references recurring_invoices(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  effective_from date not null,
  amount numeric(12, 2) not null check (amount > 0),
  created_at timestamptz not null default now(),
  unique (recurring_id, effective_from)
);
alter table recurring_amount_changes enable row level security;
drop policy if exists "recurring_amount_changes_owner" on recurring_amount_changes;
create policy "recurring_amount_changes_owner" on recurring_amount_changes
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create or replace function generate_recurring_invoices() returns integer
language plpgsql security definer set search_path = public as $$
declare
  caller uuid := auth.uid();
  t recurring_invoices%rowtype;
  step interval;
  run_date date;
  p_start date;
  p_end date;
  inv_id uuid;
  inv_total numeric(12, 2);
  proj projects%rowtype;
  made integer := 0;
  guard integer;
  arrears boolean;
  inv_amount numeric(12, 2);
begin
  for t in
    select * from recurring_invoices r
     where r.active
       and r.next_run_date <= current_date
       and (r.ends_on is null
            or (case when r.employment_type is null then r.next_run_date
                     else (r.next_run_date - recurring_step(r.frequency))::date end) <= r.ends_on)
       and (caller is null or r.user_id = caller)
     for update skip locked
  loop
    step := recurring_step(t.frequency);
    arrears := t.billing_mode = 'tasks' or t.employment_type is not null;
    guard := 0;
    while t.next_run_date <= current_date
      and (t.ends_on is null
           or (case when t.employment_type is null then t.next_run_date
                    else (t.next_run_date - step)::date end) <= t.ends_on)
      and guard < 36
    loop
      guard := guard + 1;
      run_date := t.next_run_date;
      if arrears then
        p_start := (run_date - step)::date;
        p_end := run_date - 1;
      else
        p_start := run_date;
        p_end := (run_date + step - interval '1 day')::date;
      end if;

      inv_id := null;
      inv_total := 0;
      proj := null;
      if t.project_id is not null then
        select * into proj from projects where id = t.project_id;
      end if;

      -- Salary raises: latest change effective on or before the period start, else the base amount.
      select coalesce((select c.amount from recurring_amount_changes c
                        where c.recurring_id = t.id and c.effective_from <= p_start
                        order by c.effective_from desc limit 1), t.amount)
        into inv_amount;
      if t.billing_mode = 'fixed' then
        inv_total := inv_amount;
      else
        select coalesce(sum(round((k.duration_seconds / 3600.0) * coalesce(p.hourly_rate, 0), 2)), 0)
          into inv_total
          from tasks k
          left join projects p on p.id = k.project_id
         where k.user_id = t.user_id and k.billable and k.invoice_id is null
           and k.date between p_start and p_end
           and (t.client_id is null or k.client_id = t.client_id)
           and (t.project_id is null or k.project_id = t.project_id);
      end if;

      if inv_total > 0 then
        insert into invoices (
          user_id, created_by, client_id, project_id, invoice_number, total, currency, status,
          issue_date, due_date, period_start, period_end, notes, recurring_id, kind, fx_rate, fx_base
        ) values (
          t.user_id, t.user_id, t.client_id, t.project_id, next_invoice_number_for(t.user_id), inv_total,
          t.currency, t.issue_as::invoice_status, run_date, run_date + t.due_days, p_start, p_end,
          t.notes, t.id, 'standard',
          case when proj.currency = t.currency then proj.fx_rate end,
          case when proj.currency = t.currency then proj.fx_base end
        )
        on conflict (recurring_id, period_start) where recurring_id is not null do nothing
        returning id into inv_id;

        if inv_id is not null then
          if t.billing_mode = 'fixed' then
            insert into invoice_items (invoice_id, task_id, task_name, task_date, duration_seconds, rate, amount, kind)
            values (
              inv_id, null,
              coalesce(nullif(t.description, ''), case t.employment_type
                  when 'full_time' then 'Full-time salary'
                  when 'part_time' then 'Part-time salary'
                  else 'Recurring service' end) || ' (' ||
                to_char(p_start, 'DD Mon YYYY') || ' - ' || to_char(p_end, 'DD Mon YYYY') || ')',
              run_date, 0, 0, inv_amount, 'amount'
            );
          else
            insert into invoice_items (invoice_id, task_id, task_name, task_date, duration_seconds, rate, amount, kind)
            select inv_id, k.id, k.task_name, k.date, k.duration_seconds, coalesce(p.hourly_rate, 0),
                   round((k.duration_seconds / 3600.0) * coalesce(p.hourly_rate, 0), 2), 'task'
              from tasks k left join projects p on p.id = k.project_id
             where k.user_id = t.user_id and k.billable and k.invoice_id is null
               and k.date between p_start and p_end
               and (t.client_id is null or k.client_id = t.client_id)
               and (t.project_id is null or k.project_id = t.project_id);
            update tasks set invoice_id = inv_id
             where id in (select task_id from invoice_items where invoice_id = inv_id and task_id is not null);
          end if;
          made := made + 1;
        end if;
      end if;

      t.periods_generated := t.periods_generated + 1;
      t.next_run_date := (t.start_date + t.periods_generated * step)::date;
      update recurring_invoices
         set periods_generated = t.periods_generated,
             next_run_date = t.next_run_date,
             last_generated_invoice_id = coalesce(inv_id, last_generated_invoice_id)
       where id = t.id;
    end loop;

    if t.ends_on is not null
       and (case when t.employment_type is null then t.next_run_date
                 else (t.next_run_date - step)::date end) > t.ends_on then
      update recurring_invoices set active = false where id = t.id;
    end if;
  end loop;
  return made;
end $$;

revoke all on function generate_recurring_invoices() from public, anon;
grant execute on function generate_recurring_invoices() to authenticated;
