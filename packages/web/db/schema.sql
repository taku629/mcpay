-- MCPay schema (Postgres / Supabase).
-- Apply once on a fresh database. Migrations for incremental changes go in
-- db/migrations/.

-- =====================================================================
-- 1. Authors (extends Supabase auth.users via 1:1 sidecar)
-- =====================================================================
create table if not exists authors (
  id               text primary key,                -- supabase auth.users.id
  email            text not null,
  stripe_account_id text,                           -- Stripe Connect Express account
  created_at       timestamptz not null default now()
);

-- =====================================================================
-- 2. Projects (one per MCP server)
-- =====================================================================
create table if not exists projects (
  id                text primary key,               -- "prj_..."
  owner_id          text not null references authors(id) on delete cascade,
  name              text not null,
  api_secret        text not null,                  -- shown once at creation; consider hashing in prod
  stripe_account_id text,                           -- denormalised from authors for routing
  created_at        timestamptz not null default now()
);

create index if not exists projects_owner_idx on projects(owner_id);

-- =====================================================================
-- 3. Pricing rules (versioned per project + tool)
-- =====================================================================
create table if not exists pricing_rules (
  project_id           text not null references projects(id) on delete cascade,
  tool_name            text not null,
  type                 text not null check (type in ('free','per_call','per_token','monthly_unlimited')),
  amount_usd           numeric(12,6),
  amount_usd_per_1k    numeric(12,6),
  amount_usd_per_month numeric(12,2),
  effective_from       timestamptz not null default now(),
  primary key (project_id, tool_name, effective_from)
);

-- =====================================================================
-- 4. Customers (paying end-users of an MCP server)
-- =====================================================================
create table if not exists customers (
  id                 text primary key,              -- "cust_..."
  email              text,
  stripe_customer_id text,
  created_at         timestamptz not null default now()
);

-- =====================================================================
-- 5. Customer API keys (one customer can have keys to many projects)
-- =====================================================================
create table if not exists customer_keys (
  api_key                  text primary key,        -- "mcpay_live_..."
  project_id               text not null references projects(id) on delete cascade,
  customer_id              text not null references customers(id) on delete cascade,
  monthly_budget_usd       numeric(12,2),
  consumed_this_month_usd  numeric(12,4) not null default 0,
  created_at               timestamptz not null default now(),
  revoked_at               timestamptz
);

create index if not exists customer_keys_project_idx on customer_keys(project_id);
create index if not exists customer_keys_customer_idx on customer_keys(customer_id);

-- =====================================================================
-- 6. Usage events (the meter)
-- =====================================================================
create table if not exists usage_events (
  id          text primary key,
  project_id  text not null references projects(id) on delete cascade,
  api_key     text not null references customer_keys(api_key) on delete cascade,
  tool_name   text not null,
  amount_usd  numeric(12,6) not null,
  tokens      integer,
  timestamp   timestamptz not null default now()
);

create index if not exists usage_events_project_ts_idx on usage_events(project_id, timestamp desc);
create index if not exists usage_events_api_key_idx    on usage_events(api_key);

-- =====================================================================
-- 7. Helper RPC: atomically bump a customer's monthly consumption
-- =====================================================================
create or replace function increment_customer_consumption(
  p_api_key   text,
  p_amount_usd numeric
) returns void
language plpgsql
as $$
begin
  update customer_keys
     set consumed_this_month_usd = consumed_this_month_usd + p_amount_usd
   where api_key = p_api_key;
end;
$$;

-- =====================================================================
-- 8. RLS — authors only see their own data. The service role bypasses RLS.
-- =====================================================================
alter table authors        enable row level security;
alter table projects       enable row level security;
alter table pricing_rules  enable row level security;
alter table customer_keys  enable row level security;
alter table usage_events   enable row level security;

create policy "author reads self"
  on authors for select
  using (id = auth.uid()::text);

create policy "owner reads own projects"
  on projects for select
  using (owner_id = auth.uid()::text);

create policy "owner reads own pricing"
  on pricing_rules for select
  using (project_id in (select id from projects where owner_id = auth.uid()::text));

create policy "owner reads own keys"
  on customer_keys for select
  using (project_id in (select id from projects where owner_id = auth.uid()::text));

create policy "owner reads own usage"
  on usage_events for select
  using (project_id in (select id from projects where owner_id = auth.uid()::text));
