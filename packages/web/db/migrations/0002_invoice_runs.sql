-- 0002_invoice_runs: idempotency table for the aggregate-invoices cron.
-- Safe to run on an existing database; uses IF NOT EXISTS throughout.

create table if not exists invoice_runs (
  project_id        text not null references projects(id) on delete cascade,
  customer_id       text not null references customers(id) on delete cascade,
  month_key         text not null,
  stripe_invoice_id text not null,
  total_usd         numeric(12,4) not null,
  call_count        integer not null,
  created_at        timestamptz not null default now(),
  primary key (project_id, customer_id, month_key)
);

create index if not exists invoice_runs_project_idx on invoice_runs(project_id);

alter table invoice_runs enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
     where schemaname = 'public'
       and tablename  = 'invoice_runs'
       and policyname = 'owner reads own invoice runs'
  ) then
    create policy "owner reads own invoice runs"
      on invoice_runs for select
      using (project_id in (select id from projects where owner_id = auth.uid()::text));
  end if;
end$$;
