-- Pilot catalog, not checkout inventory. Only staff RPCs can change garments.
create table public.staff (
  user_id uuid primary key references auth.users(id) on delete cascade
);
alter table public.staff enable row level security;
revoke all on public.staff from anon,authenticated;
grant select on public.staff to authenticated,service_role;
create policy staff_self on public.staff for select to authenticated using (user_id=auth.uid());

create function public.require_staff() returns void language plpgsql security definer set search_path='' as $$
begin
  if not exists(select 1 from public.staff where user_id=auth.uid()) then
    raise exception 'STAFF_REQUIRED' using errcode='42501';
  end if;
end; $$;
revoke all on function public.require_staff() from public;
grant execute on function public.require_staff() to authenticated;

create function public.valid_garment(p_id uuid,d jsonb) returns boolean language plpgsql immutable set search_path='' as $$
declare k text; v jsonb; n integer;
begin
  if jsonb_typeof(d) <> 'object' or not (d ?& array['title','description','priceMinor','material','species','model','colour','length','fit','era','details','measurements','furClass','images']) then return false; end if;
  for k in select jsonb_object_keys(d) loop
    if not k=any(array['title','description','priceMinor','material','species','model','colour','length','fit','era','details','measurements','furClass','images']) then return false; end if;
  end loop;
  foreach k in array array['title','description','material','model','colour','length','fit','era','furClass'] loop
    if jsonb_typeof(d->k)<>'string' or length(d->>k)>(case when k='description' then 4000 else 200 end) then return false; end if;
  end loop;
  foreach k in array array['title','material','model','colour','length'] loop
    if length(btrim(d->>k))=0 then return false; end if;
  end loop;
  if d->>'furClass' not in ('Ja','Alleen kraag of rand','Nee') then return false; end if;
  if jsonb_typeof(d->'species') not in ('null','string') or length(d->>'species')>200 then return false; end if;
  if d->>'furClass'<>'Nee' and (jsonb_typeof(d->'species')<>'string' or length(btrim(d->>'species'))=0) then return false; end if;
  if jsonb_typeof(d->'priceMinor')<>'number' or (d->>'priceMinor')::numeric<>trunc((d->>'priceMinor')::numeric) or (d->>'priceMinor')::numeric not between 1 and 100000000 then return false; end if;
  if jsonb_typeof(d->'measurements')<>'array' or jsonb_array_length(d->'measurements')<>4 then return false; end if;
  n=0;
  for v in select jsonb_array_elements(d->'measurements') loop
    if jsonb_typeof(v)='null' then if n in (0,3) then return false; end if;
    elsif jsonb_typeof(v)<>'number' or v::text::numeric<=0 or v::text::numeric>300 then return false; end if;
    n=n+1;
  end loop;
  if jsonb_typeof(d->'details')<>'array' or jsonb_array_length(d->'details')>30 then return false; end if;
  for v in select jsonb_array_elements(d->'details') loop
    if jsonb_typeof(v)<>'string' or length(v #>> '{}')>200 then return false; end if;
  end loop;
  if jsonb_typeof(d->'images')<>'array' or jsonb_array_length(d->'images') not between 1 and 8 then return false; end if;
  n=0;
  for v in select jsonb_array_elements(d->'images') loop
    if jsonb_typeof(v)<>'object' or not(v ?& array['path','role','main']) then return false; end if;
    if (select count(*) from jsonb_object_keys(v))<>3 then return false; end if;
    if jsonb_typeof(v->'path')<>'string' or (v->>'path') !~ ('^'||p_id::text||'/[a-f0-9]{64}\.(jpg|png|webp)$') then return false; end if;
    if jsonb_typeof(v->'role')<>'string' or length(v->>'role')>40 or jsonb_typeof(v->'main')<>'boolean' then return false; end if;
    if (v->>'main')::boolean then n=n+1; end if;
  end loop;
  return n=1;
exception when others then return false;
end; $$;

create table public.garments (
  id uuid primary key,
  display_id bigint generated always as identity unique,
  data jsonb not null,
  status text not null default 'published' check(status in ('published','sold')),
  version integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint valid_product check (public.valid_garment(id,data) is true)
);
alter table public.garments enable row level security;
revoke all on public.garments from anon,authenticated;
grant select on public.garments to anon,authenticated;
create policy catalog_read on public.garments for select to anon,authenticated using(
  status='published' or exists(select 1 from public.staff where user_id=auth.uid())
);
-- Anon needs to evaluate the empty staff predicate, but never sees a staff row.
grant select on public.staff to anon;

create function public.save_garment(p_id uuid,p_data jsonb,p_version integer) returns jsonb language plpgsql security definer set search_path='' as $$
declare result public.garments; img jsonb;
begin
  perform public.require_staff();
  if public.valid_garment(p_id,p_data) is not true then raise exception 'INVALID_PRODUCT' using errcode='22023'; end if;
  for img in select jsonb_array_elements(p_data->'images') loop
    if not exists(select 1 from storage.objects where bucket_id='garment-photos' and name=img->>'path') then
      raise exception 'PHOTO_NOT_UPLOADED' using errcode='22023';
    end if;
  end loop;
  if p_version=0 then
    insert into public.garments(id,data) values(p_id,p_data) on conflict(id) do nothing returning * into result;
    if result.id is null then raise exception 'VERSION_CONFLICT' using errcode='40001'; end if;
  else
    update public.garments set data=p_data,version=version+1,updated_at=now()
    where id=p_id and version=p_version returning * into result;
    if result.id is null then raise exception 'VERSION_CONFLICT' using errcode='40001'; end if;
  end if;
  return to_jsonb(result);
end; $$;
create function public.mark_garment_sold(p_id uuid,p_version integer) returns jsonb language plpgsql security definer set search_path='' as $$
declare result public.garments;
begin
  perform public.require_staff();
  update public.garments set status='sold',version=version+1,updated_at=now()
  where id=p_id and version=p_version returning * into result;
  if result.id is null then raise exception 'VERSION_CONFLICT' using errcode='40001'; end if;
  return to_jsonb(result);
end; $$;
revoke all on function public.save_garment(uuid,jsonb,integer),public.mark_garment_sold(uuid,integer) from public;
grant execute on function public.save_garment(uuid,jsonb,integer),public.mark_garment_sold(uuid,integer) to authenticated;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('garment-photos','garment-photos',false,2097152,array['image/jpeg','image/png','image/webp']);
create policy garment_photo_upload on storage.objects for insert to authenticated with check (
  bucket_id='garment-photos' and exists(select 1 from public.staff where user_id=auth.uid())
  and name ~ '^[a-f0-9-]{36}/[a-f0-9]{64}\.(jpg|png|webp)$'
);
create policy garment_photo_read on storage.objects for select to anon,authenticated using(
  bucket_id='garment-photos' and (
    exists(select 1 from public.staff where user_id=auth.uid()) or
    exists(select 1 from public.garments g where g.status='published' and g.data->'images' @> jsonb_build_array(jsonb_build_object('path',name)))
  )
);
-- No browser overwrite/delete policy: old product photos remain valid on failed saves.

create table public.analysis_usage (
  day date not null,
  scope text not null,
  calls integer not null,
  primary key(day,scope)
);
alter table public.analysis_usage enable row level security;
create function public.consume_analysis(p_user uuid) returns void language plpgsql security definer set search_path='' as $$
declare n integer; today date=(now() at time zone 'UTC')::date;
begin
  if not exists(select 1 from public.staff where user_id=p_user) then raise exception 'STAFF_REQUIRED' using errcode='42501'; end if;
  insert into public.analysis_usage values(today,'global',1)
  on conflict(day,scope) do update set calls=public.analysis_usage.calls+1 where public.analysis_usage.calls<100
  returning calls into n;
  if n is null then raise exception 'RATE_LIMIT' using errcode='P0001'; end if;
  n=null;
  insert into public.analysis_usage values(today,p_user::text,1)
  on conflict(day,scope) do update set calls=public.analysis_usage.calls+1 where public.analysis_usage.calls<30
  returning calls into n;
  if n is null then raise exception 'RATE_LIMIT' using errcode='P0001'; end if;
end; $$;
revoke all on function public.consume_analysis(uuid) from public,anon,authenticated;
grant execute on function public.consume_analysis(uuid) to service_role;
