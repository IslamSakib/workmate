-- One-off data fix (NOT a migration). Run AFTER 0020_jobs_and_invoice_fix.sql, in the Supabase SQL editor.
-- Turns the "Ashad Chowdhury 40,000 monthly" template into a full-time job joined 1 Jul 2026,
-- paid in arrears (July pay on 1 Aug, Aug pay on 1 Sep, Sep pay on 1 Oct), with all three invoices paid.
--
-- 1) PREVIEW first: check this is the right template and see the invoices that will be replaced.
select r.id, r.amount, r.start_date, r.next_run_date, r.periods_generated, c.client_name
  from recurring_invoices r join clients c on c.id = r.client_id
 where c.client_name ilike 'Ashad Chowdhury%';
select i.invoice_number, i.issue_date, i.period_start, i.period_end, i.total, i.status
  from invoices i join recurring_invoices r on r.id = i.recurring_id join clients c on c.id = r.client_id
 where c.client_name ilike 'Ashad Chowdhury%' order by i.issue_date;

-- 2) FIX (all or nothing). The old invoices were generated in advance (31 Jul, 31 Aug, 30 Sep periods)
-- so they are deleted and regenerated on the correct arrears dates; old invoice numbers are not reused.
begin;

delete from invoices
 where recurring_id in (select r.id from recurring_invoices r join clients c on c.id = r.client_id
                         where c.client_name ilike 'Ashad Chowdhury%');

update recurring_invoices r set
  employment_type = 'full_time', billing_mode = 'fixed', frequency = 'monthly',
  start_date = date '2026-08-01', next_run_date = date '2026-08-01',
  periods_generated = 0, last_generated_invoice_id = null, due_days = 0, issue_as = 'sent',
  description = coalesce(r.description, 'Full-time salary'), active = true
 from clients c
 where c.id = r.client_id and c.client_name ilike 'Ashad Chowdhury%';

select generate_recurring_invoices();   -- creates the Aug, Sep and Oct paydays that have passed

insert into invoice_payments (invoice_id, amount, paid_date, method, notes)
select i.id, i.total, i.issue_date, 'Salary', 'Marked paid (backfill)'
  from invoices i join recurring_invoices r on r.id = i.recurring_id join clients c on c.id = r.client_id
 where c.client_name ilike 'Ashad Chowdhury%' and i.status <> 'paid';

commit;

-- 3) CHECK: three paid invoices (periods 1-31 Jul, 1-31 Aug, 1-30 Sep) and next payday 1 Nov 2026.
select i.invoice_number, i.issue_date, i.period_start, i.period_end, i.total, i.amount_paid, i.status
  from invoices i join recurring_invoices r on r.id = i.recurring_id join clients c on c.id = r.client_id
 where c.client_name ilike 'Ashad Chowdhury%' order by i.issue_date;
