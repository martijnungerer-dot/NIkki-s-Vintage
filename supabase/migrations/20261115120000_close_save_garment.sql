-- The website only saves through save_garment_with_private (photos "Alleen voor controle" and
-- the Gemini proposal). That function is security definer and keeps calling save_garment as its
-- owner, so staff no longer need (or get) direct access to the older function.
revoke all on function public.save_garment(uuid,jsonb,integer) from public,anon,authenticated;
