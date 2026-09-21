-- Atomically ingest an idempotent usage event and charge its customer key.
-- Apply after 0002_invoice_runs.sql. The service role invokes this function;
-- public/authenticated roles must not execute it directly.
create or replace function ingest_usage_event(
  p_id text,
  p_project_id text,
  p_api_key text,
  p_tool_name text,
  p_amount_usd numeric,
  p_tokens integer,
  p_timestamp timestamptz
) returns text
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  k customer_keys%rowtype;
begin
  if p_amount_usd <= 0 or p_amount_usd > 10000 then
    raise exception 'invalid usage amount';
  end if;

  -- Serialize all charges for a key so concurrent requests cannot overspend.
  select * into k from customer_keys where api_key = p_api_key for update;
  if not found then return 'unknown_key'; end if;
  if k.project_id <> p_project_id then return 'wrong_project'; end if;
  if k.revoked_at is not null then return 'revoked'; end if;
  if exists (select 1 from usage_events where id = p_id) then return 'duplicate'; end if;
  if k.monthly_budget_usd is not null and
     k.consumed_this_month_usd + p_amount_usd > k.monthly_budget_usd then
    return 'budget_exceeded';
  end if;

  insert into usage_events(id, project_id, api_key, tool_name, amount_usd, tokens, timestamp)
  values (p_id, p_project_id, p_api_key, p_tool_name, p_amount_usd, p_tokens, p_timestamp);
  update customer_keys
     set consumed_this_month_usd = consumed_this_month_usd + p_amount_usd
   where api_key = p_api_key;
  return 'recorded';
end;
$$;

revoke all on function ingest_usage_event(text,text,text,text,numeric,integer,timestamptz)
  from public, anon, authenticated;
grant execute on function ingest_usage_event(text,text,text,text,numeric,integer,timestamptz)
  to service_role;
