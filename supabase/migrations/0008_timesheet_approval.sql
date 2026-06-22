-- Adds a timesheet approval workflow: Employee submits a task, Manager+
-- approves or rejects it, and only approved tasks are invoice-eligible
-- (listBillableTasks in the app filters on approval_status = 'approved').
-- Purely additive — existing rows default to 'approved' so solo/no-team
-- accounts see no behavior change. Safe to re-run (every statement is
-- idempotent) on a live project with real data.

alter table tasks add column if not exists approval_status text not null default 'approved'
  check (approval_status in ('draft', 'submitted', 'approved', 'rejected'));
alter table tasks add column if not exists submitted_at timestamptz;
alter table tasks add column if not exists approved_by uuid references auth.users(id);
alter table tasks add column if not exists approved_at timestamptz;
alter table tasks add column if not exists rejection_reason text;

-- New tasks created by an Employee start out needing approval; tasks
-- created by Manager+ (or the Owner) are auto-approved since they already
-- have authority to bill their own work.
create or replace function set_task_approval_default()
returns trigger as $$
begin
  if new.approval_status is null or new.approval_status = 'approved' then
    if has_min_role(new.user_id, 'manager') then
      new.approval_status := 'approved';
    else
      new.approval_status := 'submitted';
      new.submitted_at := now();
    end if;
  end if;
  return new;
end;
$$ language plpgsql security definer set search_path = public;

drop trigger if exists trg_tasks_approval_default on tasks;
create trigger trg_tasks_approval_default before insert on tasks
  for each row execute function set_task_approval_default();

-- An Employee cannot approve their own timesheet by editing the row
-- directly — approving requires a Manager+ session. Rejection/resubmission
-- have no such restriction since they don't grant invoice eligibility.
create or replace function prevent_self_approval()
returns trigger as $$
begin
  if new.approval_status = 'approved' and old.approval_status is distinct from 'approved'
     and not has_min_role(new.user_id, 'manager') then
    raise exception 'Only a manager or above can approve a timesheet';
  end if;
  return new;
end;
$$ language plpgsql security definer set search_path = public;

drop trigger if exists trg_tasks_prevent_self_approval on tasks;
create trigger trg_tasks_prevent_self_approval before update on tasks
  for each row execute function prevent_self_approval();
