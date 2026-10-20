-- 0021: creating an invoice failed with "permission denied for function next_invoice_number_for".
-- 0017 revoked that function from signed-in users but next_invoice_number() (security invoker) calls it.
-- Run next_invoice_number() with owner rights instead; it still only ever touches auth.uid()'s own counter. Idempotent.
create or replace function next_invoice_number() returns text
language sql security definer set search_path = public as $$
  select next_invoice_number_for(auth.uid())
$$;
revoke all on function next_invoice_number() from public, anon;
grant execute on function next_invoice_number() to authenticated;
