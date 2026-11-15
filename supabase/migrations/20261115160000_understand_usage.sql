-- Daily limit for understanding Nikki's free sentences in Nieuw stuk (function begrijp).
-- Text only and short, so more calls than the photo analysis: 300 per staff member and 600 in
-- total per day. Same counter table as the photo analysis, with its own scopes; the analysis limit
-- (consume_analysis) is not touched. Only the server (service_role) may call it.
create function public.consume_understanding(p_user uuid) returns void language plpgsql security definer set search_path='' as $$
declare n integer; today date=(now() at time zone 'UTC')::date;
begin
  if not exists(select 1 from public.staff where user_id=p_user) then raise exception 'STAFF_REQUIRED' using errcode='42501'; end if;
  insert into public.analysis_usage values(today,'begrijp:global',1)
  on conflict(day,scope) do update set calls=public.analysis_usage.calls+1 where public.analysis_usage.calls<600
  returning calls into n;
  if n is null then raise exception 'RATE_LIMIT' using errcode='P0001'; end if;
  n=null;
  insert into public.analysis_usage values(today,'begrijp:'||p_user::text,1)
  on conflict(day,scope) do update set calls=public.analysis_usage.calls+1 where public.analysis_usage.calls<300
  returning calls into n;
  if n is null then raise exception 'RATE_LIMIT' using errcode='P0001'; end if;
end; $$;
revoke all on function public.consume_understanding(uuid) from public,anon,authenticated;
grant execute on function public.consume_understanding(uuid) to service_role;
