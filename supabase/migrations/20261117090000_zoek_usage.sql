-- Daily limits for the public conversational search function.
-- Visitors have no login. The server identifies a client only by an HMAC of day and IP address,
-- so no IP address is stored and the value changes every day.
create table public.zoek_usage (
  day date not null,
  scope text not null,
  calls integer not null,
  primary key(day,scope)
);
alter table public.zoek_usage enable row level security;
revoke all on public.zoek_usage from public,anon,authenticated;
create function public.consume_zoek(p_client text) returns void language plpgsql security definer set search_path='' as $$
declare n integer; today date=(now() at time zone 'UTC')::date;
begin
  if p_client is null or p_client !~ '^[a-f0-9]{32}$' then raise exception 'BAD_CLIENT' using errcode='22023'; end if;
  insert into public.zoek_usage values(today,'global',1)
  on conflict(day,scope) do update set calls=public.zoek_usage.calls+1 where public.zoek_usage.calls<2000
  returning calls into n;
  if n is null then raise exception 'RATE_LIMIT' using errcode='P0001'; end if;
  n=null;
  insert into public.zoek_usage values(today,p_client,1)
  on conflict(day,scope) do update set calls=public.zoek_usage.calls+1 where public.zoek_usage.calls<40
  returning calls into n;
  if n is null then raise exception 'RATE_LIMIT' using errcode='P0001'; end if;
end; $$;
revoke all on function public.consume_zoek(text) from public,anon,authenticated;
grant execute on function public.consume_zoek(text) to service_role;
