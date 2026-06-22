-- Adds expense tracking, unlocking Profit / Profit Margin metrics. Purely
-- additive — no changes to any existing table. Safe to run once (or
-- repeatedly — every statement is idempotent) on a live project with real
-- data.

create table if not exists expenses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  client_id uuid references clients(id) on delete set null,
  project_id uuid references projects(id) on delete set null,
  category text not null,
  amount numeric(12, 2) not null default 0,
  currency currency_code not null default 'USD',
  date date not null default current_date,
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists expenses_user_id_idx on expenses(user_id);
create index if not exists expenses_client_id_idx on expenses(client_id);
create index if not exists expenses_project_id_idx on expenses(project_id);
create index if not exists expenses_date_idx on expenses(date);

alter table expenses enable row level security;

do $$
begin
  if not exists (select 1 from pg_trigger where tgname = 'trg_expenses_updated_at') then
    create trigger trg_expenses_updated_at before update on expenses
      for each row execute function set_updated_at();
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies where tablename = 'expenses' and policyname = 'expenses_owner'
  ) then
    create policy "expenses_owner" on expenses
      for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
  end if;
end $$;
