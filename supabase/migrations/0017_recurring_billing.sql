-- 0017: server-side recurring billing ("until I stop it").
-- Replaces the lazy browser-driven generator. Idempotent and additive.
--
-- A template bills either a fixed amount per period (e.g. a monthly retainer
-- or part-time salary) or the billable tasks logged in the previous period.
-- It keeps running until the template is paused/deleted or its optional
-- ends_on date passes. Run dates are computed from the start date and the
-- number of periods generated, so "31st" never drifts to the 28th.

alter table recurring_invoices add column if not exists billing_mode text not null default 'fixed';
alter table recurring_invoices add column if not exists amount numeric(12, 2);
alter table recurring_invoices add column if not exists description text;
alter table recurring_invoices add column if not exists start_date date;
alter table recurring_invoices add column if not exists periods_generated integer not null default 0;
alter table recurring_invoices add column if not exists due_days integer not null default 7;
alter table recurring_invoices add column if not exists issue_as text not null default 'sent';
alter table recurring_invoices add column if not exists ends_on date;

-- Existing task-derived templates keep working as 'tasks' mode.
update recurring_invoices set billing_mode = 'tasks' where amount is null and billing_mode = 'fixed';
update recurring_invoices set start_date = next_run_date where start_date is null;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'recurring_billing_mode_check') then
    alter table recurring_invoices add constraint recurring_billing_mode_check check (billing_mode in ('fixed', 'tasks'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'recurring_issue_as_check') then
    alter table recurring_invoices add constraint recurring_issue_as_check check (issue_as in ('draft', 'sent'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'recurring_fixed_amount_check') then
    alter table recurring_invoices add constraint recurring_fixed_amount_check
      check (billing_mode <> 'fixed' or amount > 0) not valid;
  end if;
end $$;

alter table invoices add column if not exists recurring_id uuid references recurring_invoices(id) on delete set null;
-- One invoice per template per period: makes generation idempotent.
create unique index if not exists invoices_recurring_period_uidx
  on invoices(recurring_id, period_start) where recurring_id is not null;
create index if not exists recurring_invoices_due_idx on recurring_invoices(active, next_run_date);

-- Atomic per-account invoice numbering that also works without a session (pg_cron).
create or replace function next_invoice_number_for(p_user uuid) returns text
language plpgsql security definer set search_path = public as $$
declare
  prefix text;
  seq integer;
begin
  update settings
     set next_invoice_seq = next_invoice_seq + 1
   where user_id = p_user
  returning invoice_prefix, next_invoice_seq - 1 into prefix, seq;
  if seq is null then
    raise exception 'Settings row not found';
  end if;
  return prefix || lpad(seq::text, 4, '0');
end $$;
revoke all on function next_invoice_number_for(uuid) from public, anon, authenticated;

create or replace function next_invoice_number() returns text
language sql security invoker as $$ select next_invoice_number_for(auth.uid()) $$;

create or replace function recurring_step(freq text) returns interval
language sql immutable as $$
  select case freq when 'weekly' then interval '7 days'
                   when 'quarterly' then interval '3 months'
                   else interval '1 month' end
$$;

-- Generates every invoice that is due. Called by the app on load (own account only)
-- and by pg_cron daily (all accounts). Returns the number of invoices created.
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
begin
  for t in
    select * from recurring_invoices
     where active
       and next_run_date <= current_date
       and (ends_on is null or next_run_date <= ends_on)
       and (caller is null or user_id = caller)
     for update skip locked
  loop
    step := recurring_step(t.frequency);
    guard := 0;
    -- Catch up every missed period (cap protects against a bad start date).
    while t.next_run_date <= current_date
      and (t.ends_on is null or t.next_run_date <= t.ends_on)
      and guard < 36
    loop
      guard := guard + 1;
      run_date := t.next_run_date;
      if t.billing_mode = 'fixed' then
        p_start := run_date;
        p_end := (run_date + step - interval '1 day')::date;
      else
        p_start := (run_date - step)::date;
        p_end := run_date - 1;
      end if;

      inv_id := null;
      inv_total := 0;
      proj := null;
      if t.project_id is not null then
        select * into proj from projects where id = t.project_id;
      end if;

      if t.billing_mode = 'fixed' then
        inv_total := t.amount;
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
              coalesce(nullif(t.description, ''), 'Recurring service') || ' (' ||
                to_char(p_start, 'DD Mon YYYY') || ' - ' || to_char(p_end, 'DD Mon YYYY') || ')',
              run_date, 0, 0, t.amount, 'amount'
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

    -- Past its end date: switch off so it shows as Ended.
    if t.ends_on is not null and t.next_run_date > t.ends_on then
      update recurring_invoices set active = false where id = t.id;
    end if;
  end loop;
  return made;
end $$;

revoke all on function generate_recurring_invoices() from public, anon;
grant execute on function generate_recurring_invoices() to authenticated;

-- Daily run at 02:00 UTC when pg_cron is enabled (Supabase: Database > Extensions > pg_cron).
-- The app also calls generate_recurring_invoices() on every load, so billing still
-- happens without pg_cron; the cron job only makes it independent of opening the app.
do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.unschedule(jobid) from cron.job where jobname = 'workmate-recurring-invoices';
    perform cron.schedule('workmate-recurring-invoices', '0 2 * * *', 'select public.generate_recurring_invoices()');
  end if;
end $$;
