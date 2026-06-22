-- Adds monthly retainer support. Purely additive — no changes to any
-- existing table. Safe to run once (or repeatedly — every statement is
-- idempotent) on a live project with real data.
--
-- Retainer usage (used/remaining/overage hours) is computed in the
-- application from existing `tasks` rows for the retainer's client during
-- the current calendar month — it is intentionally NOT tracked via a
-- `retainer_id` column on `tasks`, so this feature works immediately for
-- existing historical data with no backfill.

create table if not exists retainers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  client_id uuid not null references clients(id) on delete cascade,
  monthly_fee numeric(12, 2) not null default 0,
  included_hours numeric(8, 2) not null default 0,
  overage_rate numeric(12, 2) not null default 0,
  currency currency_code not null default 'USD',
  next_billing_date date not null default current_date,
  active boolean not null default true,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists retainers_user_id_idx on retainers(user_id);
create index if not exists retainers_client_id_idx on retainers(client_id);

alter table retainers enable row level security;

do $$
begin
  if not exists (select 1 from pg_trigger where tgname = 'trg_retainers_updated_at') then
    create trigger trg_retainers_updated_at before update on retainers
      for each row execute function set_updated_at();
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies where tablename = 'retainers' and policyname = 'retainers_owner'
  ) then
    create policy "retainers_owner" on retainers
      for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
  end if;
end $$;
