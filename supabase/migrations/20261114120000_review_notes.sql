-- Review notes (temporary): remarks testers leave while using the pilot app. See app/review-kit/README.md.
-- Only staff can add or read notes; nobody can change or delete them through the API.
-- Remove when the app is finished: drop function public.add_review_note(text,text,jsonb); drop table public.review_notes;
create table public.review_notes (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  author uuid not null,
  kind text not null check (kind in ('opmerking','aanpassing','vraag')),
  body text not null check (char_length(body) between 1 and 4000),
  context jsonb not null default '{}'::jsonb
    check (jsonb_typeof(context)='object' and octet_length(context::text)<=8192)
);
alter table public.review_notes enable row level security;
revoke all on public.review_notes from public,anon,authenticated;
grant select on public.review_notes to authenticated;
create policy review_notes_staff_read on public.review_notes for select to authenticated
  using (exists(select 1 from public.staff where user_id=(select auth.uid())));

create function public.add_review_note(p_kind text,p_body text,p_context jsonb) returns bigint
language plpgsql security definer set search_path='' as $$
declare n bigint;
begin
  perform public.require_staff();
  if (select count(*) from public.review_notes where author=auth.uid() and created_at>now()-interval '1 day')>=500 then
    raise exception 'RATE_LIMIT' using errcode='P0001';
  end if;
  insert into public.review_notes(author,kind,body,context)
    values(auth.uid(),p_kind,p_body,coalesce(p_context,'{}'::jsonb)) returning id into n;
  return n;
end; $$;
revoke all on function public.add_review_note(text,text,jsonb) from public,anon;
grant execute on function public.add_review_note(text,text,jsonb) to authenticated;
