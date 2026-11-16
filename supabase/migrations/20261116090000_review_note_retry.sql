-- Review notes: safe retries. The app gives each note a fixed client id, so sending the same note twice
-- (after a lost answer, or from two tabs) stores it once. Old clients without a client id keep working.
-- Not applied to production by this file's existence: roll out this migration first, then the frontend.
alter table public.review_notes add column client_id uuid;
alter table public.review_notes add constraint review_notes_author_client_id_key unique (author, client_id);

create or replace function public.add_review_note(p_kind text,p_body text,p_context jsonb) returns bigint
language plpgsql security definer set search_path='' as $$
declare
  n bigint; me uuid; ctx jsonb; cid uuid; existing public.review_notes%rowtype;
begin
  perform public.require_staff();
  me := auth.uid();
  ctx := coalesce(p_context,'{}'::jsonb);
  if jsonb_typeof(ctx) = 'object' and (ctx->>'clientId') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
    cid := (ctx->>'clientId')::uuid;
  end if;
  -- One lock per author: serialises retries and the daily quota for that author only.
  perform pg_advisory_xact_lock(hashtextextended('review_note:' || me::text, 0));
  if cid is not null then
    select * into existing from public.review_notes where author = me and client_id = cid;
    if found then
      if existing.kind = p_kind and existing.body = p_body and existing.context = ctx then
        return existing.id;
      end if;
      raise exception 'REVIEW_NOTE_CONFLICT' using errcode = 'P0001';
    end if;
  end if;
  if (select count(*) from public.review_notes where author = me and created_at > now() - interval '1 day') >= 500 then
    raise exception 'RATE_LIMIT' using errcode = 'P0001';
  end if;
  insert into public.review_notes(author,kind,body,context,client_id)
    values(me,p_kind,p_body,ctx,cid) returning id into n;
  return n;
end; $$;
revoke all on function public.add_review_note(text,text,jsonb) from public,anon;
grant execute on function public.add_review_note(text,text,jsonb) to authenticated;
