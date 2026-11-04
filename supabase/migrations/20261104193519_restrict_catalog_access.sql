-- Supabase can grant EXECUTE directly to anon, independently of PUBLIC.
-- Keep writes behind the authenticated RPCs and their existing staff checks.
revoke all on function public.require_staff(),
  public.save_garment(uuid,jsonb,integer),
  public.mark_garment_sold(uuid,integer) from public,anon;
grant execute on function public.require_staff(),
  public.save_garment(uuid,jsonb,integer),
  public.mark_garment_sold(uuid,integer) to authenticated;
revoke all on public.analysis_usage from anon,authenticated;

-- Evaluate the request user once per statement, without changing access rules.
alter policy staff_self on public.staff using (user_id=(select auth.uid()));
alter policy catalog_read on public.garments using (
  status='published' or exists(select 1 from public.staff where user_id=(select auth.uid()))
);
alter policy garment_photo_upload on storage.objects with check (
  bucket_id='garment-photos' and exists(select 1 from public.staff where user_id=(select auth.uid()))
  and name ~ '^[a-f0-9-]{36}/[a-f0-9]{64}\.(jpg|png|webp)$'
);
alter policy garment_photo_read on storage.objects using (
  bucket_id='garment-photos' and (
    exists(select 1 from public.staff where user_id=(select auth.uid())) or
    exists(select 1 from public.garments g where g.status='published' and g.data->'images' @> jsonb_build_array(jsonb_build_object('path',name)))
  )
);
