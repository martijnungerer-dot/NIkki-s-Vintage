-- Feedback Nikki, 19 November 2026: more photos per piece and an optional brand.
-- * At most sixteen photos per garment in total (boutique photos plus photos only for checking);
--   before: eight. Existing rows stay valid, nothing is rewritten.
-- * Optional public field brand (null or text up to 200 characters). Older clients without brand keep working.
-- The rest of valid_garment is unchanged (copied from 20261104193047_catalog.sql).
create or replace function public.valid_garment(p_id uuid,d jsonb) returns boolean language plpgsql immutable set search_path='' as $$
declare k text; v jsonb; n integer;
begin
  if jsonb_typeof(d) <> 'object' or not (d ?& array['title','description','priceMinor','material','species','model','colour','length','fit','era','details','measurements','furClass','images']) then return false; end if;
  for k in select jsonb_object_keys(d) loop
    if not k=any(array['title','description','priceMinor','material','species','model','colour','length','fit','era','details','measurements','furClass','images','brand']) then return false; end if;
  end loop;
  foreach k in array array['title','description','material','model','colour','length','fit','era','furClass'] loop
    if jsonb_typeof(d->k)<>'string' or length(d->>k)>(case when k='description' then 4000 else 200 end) then return false; end if;
  end loop;
  foreach k in array array['title','material','model','colour','length'] loop
    if length(btrim(d->>k))=0 then return false; end if;
  end loop;
  if d->>'furClass' not in ('Ja','Alleen kraag of rand','Nee') then return false; end if;
  -- Brand (Nikki, from the label): optional, null or a short text; never filled in by Gemini alone.
  if d ? 'brand' and (jsonb_typeof(d->'brand') not in ('null','string') or length(d->>'brand')>200) then return false; end if;
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
  if jsonb_typeof(d->'images')<>'array' or jsonb_array_length(d->'images') not between 1 and 16 then return false; end if;
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

alter table public.garment_private drop constraint internal_images_array;
alter table public.garment_private add constraint internal_images_array
  check (jsonb_typeof(internal_images)='array' and jsonb_array_length(internal_images)<=15);

create or replace function public.valid_internal_images(p_id uuid,p_public jsonb,p_internal jsonb) returns boolean language plpgsql immutable set search_path='' as $$
declare v jsonb; seen text[]:='{}';
begin
  if jsonb_typeof(p_internal)<>'array' or jsonb_array_length(p_internal)>15 then return false; end if;
  if jsonb_array_length(p_public)+jsonb_array_length(p_internal)>16 then return false; end if;
  for v in select jsonb_array_elements(p_internal) loop
    if jsonb_typeof(v)<>'object' or not(v ?& array['path','role']) or (select count(*) from jsonb_object_keys(v))<>2 then return false; end if;
    if jsonb_typeof(v->'path')<>'string' or (v->>'path') !~ ('^'||p_id::text||'/[a-f0-9]{64}\.(jpg|png|webp)$') then return false; end if;
    if jsonb_typeof(v->'role')<>'string' or length(v->>'role')>40 then return false; end if;
    if (v->>'path')=any(seen) or p_public @> jsonb_build_array(jsonb_build_object('path',v->>'path')) then return false; end if;
    seen:=seen||(v->>'path');
  end loop;
  return true;
exception when others then return false;
end; $$;
revoke all on function public.valid_internal_images(uuid,jsonb,jsonb) from public,anon,authenticated;
