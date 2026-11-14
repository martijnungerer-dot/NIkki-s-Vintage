-- Per garment: photos that are only for Nikki's own check (label, seams, damage, inside) and the
-- latest Gemini proposal, so we can later compare it with what Nikki saved. Staff only.
-- Internal photos are never in garments.data.images, so neither the catalogue policy nor the
-- storage policy garment_photo_read ever lets a visitor (anon) see them.
create table public.garment_private (
  id uuid primary key references public.garments(id) on delete cascade,
  internal_images jsonb not null default '[]'::jsonb,
  ai_suggestion jsonb,
  updated_at timestamptz not null default now(),
  constraint internal_images_array check (jsonb_typeof(internal_images)='array' and jsonb_array_length(internal_images)<=7),
  constraint ai_suggestion_object check (ai_suggestion is null or (jsonb_typeof(ai_suggestion)='object' and octet_length(ai_suggestion::text)<=32768))
);
alter table public.garment_private enable row level security;
revoke all on public.garment_private from public,anon,authenticated;
grant select on public.garment_private to authenticated;
create policy garment_private_staff on public.garment_private for select to authenticated
  using (exists(select 1 from public.staff where user_id=(select auth.uid())));

-- Internal photos: same path rule as public photos, no main flag, never also public, and at most
-- eight photos per garment in total (the limit of the photo analysis).
create function public.valid_internal_images(p_id uuid,p_public jsonb,p_internal jsonb) returns boolean language plpgsql immutable set search_path='' as $$
declare v jsonb; seen text[]:='{}';
begin
  if jsonb_typeof(p_internal)<>'array' or jsonb_array_length(p_internal)>7 then return false; end if;
  if jsonb_array_length(p_public)+jsonb_array_length(p_internal)>8 then return false; end if;
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

-- Saves the public product (via save_garment, which keeps every existing check and the sold
-- status) together with the internal photos. p_ai null keeps the earlier proposal, so an edit
-- without a new analysis never erases it.
create function public.save_garment_with_private(p_id uuid,p_data jsonb,p_version integer,p_internal jsonb,p_ai jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare result jsonb; img jsonb;
begin
  perform public.require_staff();
  if public.valid_internal_images(p_id,coalesce(p_data->'images','[]'::jsonb),p_internal) is not true then raise exception 'INVALID_PRODUCT' using errcode='22023'; end if;
  if p_ai is not null and (jsonb_typeof(p_ai)<>'object' or octet_length(p_ai::text)>32768) then raise exception 'INVALID_PRODUCT' using errcode='22023'; end if;
  for img in select jsonb_array_elements(p_internal) loop
    if not exists(select 1 from storage.objects where bucket_id='garment-photos' and name=img->>'path') then
      raise exception 'PHOTO_NOT_UPLOADED' using errcode='22023';
    end if;
  end loop;
  result:=public.save_garment(p_id,p_data,p_version);
  insert into public.garment_private(id,internal_images,ai_suggestion) values(p_id,p_internal,p_ai)
  on conflict(id) do update set internal_images=excluded.internal_images,
    ai_suggestion=coalesce(excluded.ai_suggestion,public.garment_private.ai_suggestion),updated_at=now();
  return result;
end; $$;
revoke all on function public.save_garment_with_private(uuid,jsonb,integer,jsonb,jsonb),public.valid_internal_images(uuid,jsonb,jsonb) from public,anon,authenticated;
grant execute on function public.save_garment_with_private(uuid,jsonb,integer,jsonb,jsonb) to authenticated;
