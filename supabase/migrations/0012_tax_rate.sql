-- Adds a per-account tax set-aside rate, used to estimate how much of each
-- period's revenue to set aside for taxes (Dashboard/Insights widget).
-- Purely additive — safe to re-run.

alter table settings add column if not exists tax_rate_pct numeric not null default 0;
