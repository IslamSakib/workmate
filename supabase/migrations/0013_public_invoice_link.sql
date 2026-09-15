-- Shareable, read-only public invoice links — the "client portal" competitors
-- sell, without adding a second auth role or exposing the invoices table to
-- anonymous requests. Purely additive; safe to re-run.
--
-- Every invoice gets an unguessable public_token. The ONLY way to read
-- invoice data without being signed in is get_public_invoice(token): a
-- security-definer function that returns just the one matching invoice's
-- display fields, scoped by an exact token match done inside the function
-- body. There is no RLS policy granting anon SELECT on invoices/invoice_items
-- themselves, so a client can never list or enumerate other invoices even if
-- they inspect the anon key and query the tables directly.

alter table invoices add column if not exists public_token uuid not null default gen_random_uuid();
create unique index if not exists invoices_public_token_idx on invoices(public_token);

-- Optional global payment link (Stripe Payment Link / PayPal.me / etc.)
-- shown as "Pay now" on every public invoice page. No Stripe secret key or
-- webhook needed since this app has no backend to receive them.
alter table settings add column if not exists payment_url text;

create or replace function get_public_invoice(p_token uuid)
returns json
language sql
stable
security definer
set search_path = public
as $$
  select json_build_object(
    'invoice_number', i.invoice_number,
    'status', i.status,
    'issue_date', i.issue_date,
    'due_date', i.due_date,
    'total', i.total,
    'currency', i.currency,
    'amount_paid', i.amount_paid,
    'notes', i.notes,
    'client_name', c.client_name,
    'project_name', p.project_name,
    'payment_url', s.payment_url,
    'items', (
      select coalesce(
        json_agg(
          json_build_object(
            'task_name', ii.task_name,
            'task_date', ii.task_date,
            'duration_seconds', ii.duration_seconds,
            'rate', ii.rate,
            'amount', ii.amount
          )
          order by ii.task_date
        ),
        '[]'::json
      )
      from invoice_items ii
      where ii.invoice_id = i.id
    )
  )
  from invoices i
  left join clients c on c.id = i.client_id
  left join projects p on p.id = i.project_id
  left join settings s on s.user_id = i.user_id
  where i.public_token = p_token;
$$;

revoke all on function get_public_invoice(uuid) from public;
grant execute on function get_public_invoice(uuid) to anon, authenticated;
