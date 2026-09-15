-- Proposals: a lightweight pre-project pitch that closes the
-- "proposal -> project -> invoice" loop, matching what every competing
-- all-in-one freelancer tool leads with. Purely additive.
--
-- Follows the exact same security pattern as 0013_public_invoice_link.sql:
-- no RLS policy grants anonymous access to the proposals table itself.
-- The only way to read or accept a proposal while signed out is through
-- security-definer functions scoped by an exact public_token match, each
-- doing one narrow, specific thing (never a general-purpose update/select).

do $$
begin
  if not exists (select 1 from pg_type where typname = 'proposal_status') then
    create type proposal_status as enum ('draft', 'sent', 'accepted', 'declined');
  end if;
end $$;

create table if not exists proposals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  created_by uuid references auth.users(id),
  client_id uuid not null references clients(id) on delete cascade,
  project_name text not null,
  description text,
  amount numeric(12, 2) not null default 0,
  currency currency_code not null default 'USD',
  status proposal_status not null default 'draft',
  valid_until date,
  public_token uuid not null default gen_random_uuid(),
  accepted_at timestamptz,
  accepted_name text,
  created_project_id uuid references projects(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists proposals_client_id_idx on proposals(client_id);
create unique index if not exists proposals_public_token_idx on proposals(public_token);

create trigger trg_proposals_updated_at
  before update on proposals for each row execute function set_updated_at();

alter table proposals enable row level security;

drop policy if exists "proposals_owner" on proposals;
create policy "proposals_owner" on proposals
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create or replace function get_public_proposal(p_token uuid)
returns json
language sql
stable
security definer
set search_path = public
as $$
  select json_build_object(
    'project_name', p.project_name,
    'description', p.description,
    'amount', p.amount,
    'currency', p.currency,
    'status', p.status,
    'valid_until', p.valid_until,
    'accepted_at', p.accepted_at,
    'client_name', c.client_name
  )
  from proposals p
  join clients c on c.id = p.client_id
  where p.public_token = p_token;
$$;

-- Accepts a proposal by token — the only write this app allows an
-- anonymous caller to perform. Scoped to exactly one row (via the
-- unguessable token) and exactly one transition ('sent' -> 'accepted'):
-- already-accepted, already-declined, draft (never sent), and expired
-- proposals are all left untouched, so this can never be used to
-- resurrect, re-decline, or otherwise mutate a proposal outside that one
-- intended path.
create or replace function accept_public_proposal(p_token uuid, p_accepted_name text)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_updated proposals;
begin
  update proposals
  set status = 'accepted', accepted_at = now(), accepted_name = p_accepted_name
  where public_token = p_token
    and status = 'sent'
    and (valid_until is null or valid_until >= current_date)
  returning * into v_updated;

  if v_updated.id is null then
    return json_build_object('success', false);
  end if;

  return json_build_object('success', true);
end;
$$;

revoke all on function get_public_proposal(uuid) from public;
revoke all on function accept_public_proposal(uuid, text) from public;
grant execute on function get_public_proposal(uuid) to anon, authenticated;
grant execute on function accept_public_proposal(uuid, text) to anon, authenticated;
