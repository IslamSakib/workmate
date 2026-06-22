-- Adds an immutable audit trail (who changed what, when, old/new values) via
-- a generic Postgres trigger rather than application-level wrapping — every
-- mutation already goes straight from the browser to Supabase with no
-- backend to intercept it, so the trigger is the only place that can be
-- trusted to record what actually changed. Purely additive — no changes to
-- any existing table's columns. Safe to run once (or repeatedly — every
-- statement is idempotent) on a live project with real data.

create table if not exists audit_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  table_name text not null,
  record_id uuid,
  action text not null,
  old_values jsonb,
  new_values jsonb,
  created_at timestamptz not null default now()
);

create index if not exists audit_logs_user_id_idx on audit_logs(user_id);
create index if not exists audit_logs_table_name_idx on audit_logs(table_name);
create index if not exists audit_logs_created_at_idx on audit_logs(created_at desc);

alter table audit_logs enable row level security;

-- Intentionally no update/delete policy: once written, a log row is
-- immutable for every role including the account owner via the client API.
do $$
begin
  if not exists (
    select 1 from pg_policies where tablename = 'audit_logs' and policyname = 'audit_logs_select_own'
  ) then
    create policy "audit_logs_select_own" on audit_logs
      for select using (auth.uid() = user_id);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies where tablename = 'audit_logs' and policyname = 'audit_logs_insert_own'
  ) then
    create policy "audit_logs_insert_own" on audit_logs
      for insert with check (auth.uid() = user_id);
  end if;
end $$;

create or replace function log_audit_entry()
returns trigger as $$
declare
  v_user_id uuid;
  v_record_id uuid;
begin
  if tg_op = 'DELETE' then
    v_user_id := old.user_id;
    v_record_id := old.id;
  else
    v_user_id := new.user_id;
    v_record_id := new.id;
  end if;

  insert into audit_logs (user_id, table_name, record_id, action, old_values, new_values)
  values (
    v_user_id,
    tg_table_name,
    v_record_id,
    lower(tg_op),
    case when tg_op in ('UPDATE', 'DELETE') then to_jsonb(old) else null end,
    case when tg_op in ('INSERT', 'UPDATE') then to_jsonb(new) else null end
  );

  return coalesce(new, old);
end;
$$ language plpgsql security definer set search_path = public;

do $$
declare
  t text;
begin
  foreach t in array array['clients', 'projects', 'tasks', 'time_entries', 'invoices', 'retainers', 'expenses']
  loop
    if not exists (select 1 from pg_trigger where tgname = 'trg_audit_' || t) then
      execute format(
        'create trigger %I after insert or update or delete on %I for each row execute function log_audit_entry()',
        'trg_audit_' || t, t
      );
    end if;
  end loop;
end $$;
