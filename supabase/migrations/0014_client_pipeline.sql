-- Lightweight CRM pipeline on Clients — turns the flat client list into a
-- lead tracker without a separate CRM module. Purely additive; safe to
-- re-run. Existing clients default to 'won' (they're already working
-- relationships); new clients default to 'lead' at the application layer.

do $$
begin
  if not exists (select 1 from pg_type where typname = 'client_pipeline_stage') then
    create type client_pipeline_stage as enum ('lead', 'contacted', 'proposal_sent', 'won', 'lost');
  end if;
end $$;

alter table clients add column if not exists pipeline_stage client_pipeline_stage not null default 'won';
