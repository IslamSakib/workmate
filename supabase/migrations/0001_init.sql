-- WorkMate initial schema
-- Run this in the Supabase SQL editor (or via `supabase db push`) on a fresh project.

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------
create type project_status as enum ('active', 'paused', 'completed', 'cancelled');
create type invoice_status as enum ('draft', 'sent', 'paid', 'overdue');
create type currency_code as enum ('USD', 'BDT', 'EUR', 'GBP', 'PHP');

-- ---------------------------------------------------------------------------
-- profiles (1:1 with auth.users)
-- ---------------------------------------------------------------------------
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  avatar_url text,
  default_currency currency_code not null default 'USD',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- clients
-- ---------------------------------------------------------------------------
create table clients (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  client_name text not null,
  company_name text,
  email text,
  phone text,
  currency currency_code not null default 'USD',
  country text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index clients_user_id_idx on clients(user_id);

-- ---------------------------------------------------------------------------
-- projects
-- ---------------------------------------------------------------------------
create table projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  client_id uuid references clients(id) on delete set null,
  project_name text not null,
  hourly_rate numeric(12, 2),
  fixed_price numeric(12, 2),
  currency currency_code not null default 'USD',
  status project_status not null default 'active',
  start_date date,
  due_date date,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index projects_user_id_idx on projects(user_id);
create index projects_client_id_idx on projects(client_id);

-- ---------------------------------------------------------------------------
-- tasks (manual time log entries)
-- ---------------------------------------------------------------------------
create table tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  project_id uuid references projects(id) on delete set null,
  client_id uuid references clients(id) on delete set null,
  task_name text not null,
  date date not null default current_date,
  start_time time,
  end_time time,
  duration_seconds integer not null default 0,
  billable boolean not null default true,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index tasks_user_id_idx on tasks(user_id);
create index tasks_project_id_idx on tasks(project_id);
create index tasks_date_idx on tasks(date);

-- ---------------------------------------------------------------------------
-- time_entries (live timer sessions)
-- ---------------------------------------------------------------------------
create table time_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  project_id uuid references projects(id) on delete set null,
  client_id uuid references clients(id) on delete set null,
  task_id uuid references tasks(id) on delete set null,
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  duration_seconds integer not null default 0,
  is_running boolean not null default true,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index time_entries_user_id_idx on time_entries(user_id);
create index time_entries_running_idx on time_entries(user_id, is_running);

-- ---------------------------------------------------------------------------
-- invoices
-- ---------------------------------------------------------------------------
create table invoices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  client_id uuid references clients(id) on delete set null,
  project_id uuid references projects(id) on delete set null,
  invoice_number text not null,
  total numeric(12, 2) not null default 0,
  currency currency_code not null default 'USD',
  status invoice_status not null default 'draft',
  issue_date date not null default current_date,
  due_date date,
  period_start date,
  period_end date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, invoice_number)
);

create index invoices_user_id_idx on invoices(user_id);
create index invoices_client_id_idx on invoices(client_id);

-- ---------------------------------------------------------------------------
-- invoice_items (one row per billed task, auto-derived — no manual line items)
-- ---------------------------------------------------------------------------
create table invoice_items (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references invoices(id) on delete cascade,
  task_id uuid references tasks(id) on delete set null,
  task_name text not null,
  task_date date not null,
  duration_seconds integer not null default 0,
  rate numeric(12, 2) not null default 0,
  amount numeric(12, 2) not null default 0,
  created_at timestamptz not null default now()
);

create index invoice_items_invoice_id_idx on invoice_items(invoice_id);

-- tasks.invoice_id links a task to the invoice it was billed on (added here
-- since it references invoices, which is defined after tasks above).
alter table tasks add column invoice_id uuid references invoices(id) on delete set null;
create index tasks_invoice_id_idx on tasks(invoice_id);

-- ---------------------------------------------------------------------------
-- attachments
-- ---------------------------------------------------------------------------
create table attachments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  owner_type text not null, -- 'invoice' | 'project' | 'client' | 'task'
  owner_id uuid not null,
  file_path text not null,
  file_name text not null,
  created_at timestamptz not null default now()
);

create index attachments_owner_idx on attachments(owner_type, owner_id);

-- ---------------------------------------------------------------------------
-- settings
-- ---------------------------------------------------------------------------
create table settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  default_currency currency_code not null default 'USD',
  date_format text not null default 'MM/dd/yyyy',
  theme text not null default 'system',
  invoice_prefix text not null default 'INV-',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- updated_at triggers
-- ---------------------------------------------------------------------------
create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger trg_profiles_updated_at before update on profiles for each row execute function set_updated_at();
create trigger trg_clients_updated_at before update on clients for each row execute function set_updated_at();
create trigger trg_projects_updated_at before update on projects for each row execute function set_updated_at();
create trigger trg_tasks_updated_at before update on tasks for each row execute function set_updated_at();
create trigger trg_time_entries_updated_at before update on time_entries for each row execute function set_updated_at();
create trigger trg_invoices_updated_at before update on invoices for each row execute function set_updated_at();
create trigger trg_settings_updated_at before update on settings for each row execute function set_updated_at();

-- ---------------------------------------------------------------------------
-- auto-create profile + settings row on signup
-- ---------------------------------------------------------------------------
create or replace function handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, display_name) values (new.id, new.raw_user_meta_data->>'display_name');
  insert into public.settings (user_id) values (new.id);
  return new;
end;
$$ language plpgsql security definer set search_path = public;

create trigger trg_on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
alter table profiles enable row level security;
alter table clients enable row level security;
alter table projects enable row level security;
alter table tasks enable row level security;
alter table time_entries enable row level security;
alter table invoices enable row level security;
alter table invoice_items enable row level security;
alter table attachments enable row level security;
alter table settings enable row level security;

create policy "profiles_self" on profiles
  for all using (auth.uid() = id) with check (auth.uid() = id);

create policy "clients_owner" on clients
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "projects_owner" on projects
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "tasks_owner" on tasks
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "time_entries_owner" on time_entries
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "invoices_owner" on invoices
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "invoice_items_owner" on invoice_items
  for all using (
    exists (select 1 from invoices i where i.id = invoice_items.invoice_id and i.user_id = auth.uid())
  )
  with check (
    exists (select 1 from invoices i where i.id = invoice_items.invoice_id and i.user_id = auth.uid())
  );

create policy "attachments_owner" on attachments
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "settings_owner" on settings
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- Storage: attachments bucket, user-scoped via folder prefix `${user_id}/...`
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('attachments', 'attachments', false)
on conflict (id) do nothing;

create policy "attachments_storage_owner_select" on storage.objects
  for select using (bucket_id = 'attachments' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "attachments_storage_owner_insert" on storage.objects
  for insert with check (bucket_id = 'attachments' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "attachments_storage_owner_update" on storage.objects
  for update using (bucket_id = 'attachments' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "attachments_storage_owner_delete" on storage.objects
  for delete using (bucket_id = 'attachments' and (storage.foldername(name))[1] = auth.uid()::text);
