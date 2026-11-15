-- What a piece was actually sold for, and when. Staff only: visitors never see sale prices.
-- Later this history feeds the price proposal in Nieuw stuk ("vergelijkbare stukken gingen voor …").
create table public.garment_sales (
  id uuid primary key references public.garments(id) on delete cascade,
  sold_price_minor integer not null check (sold_price_minor between 0 and 100000000),
  sold_at timestamptz not null default now()
);
alter table public.garment_sales enable row level security;
revoke all on public.garment_sales from public,anon,authenticated;
grant select on public.garment_sales to authenticated;
create policy garment_sales_staff on public.garment_sales for select to authenticated
  using (exists(select 1 from public.staff where user_id=(select auth.uid())));

-- Marks a piece as sold (via mark_garment_sold, which keeps the staff and version checks) and
-- records the sale price in the same transaction. Sold stays sold: there is no way back.
create function public.mark_garment_sold_with_price(p_id uuid,p_version integer,p_price_minor integer) returns jsonb language plpgsql security definer set search_path='' as $$
declare result jsonb;
begin
  perform public.require_staff();
  if p_price_minor is null or p_price_minor not between 0 and 100000000 then raise exception 'INVALID_PRICE' using errcode='22023'; end if;
  if exists(select 1 from public.garments where id=p_id and status='sold') then raise exception 'VERSION_CONFLICT' using errcode='40001'; end if;
  result:=public.mark_garment_sold(p_id,p_version);
  insert into public.garment_sales(id,sold_price_minor) values(p_id,p_price_minor);
  return result;
end; $$;
revoke all on function public.mark_garment_sold_with_price(uuid,integer,integer) from public,anon,authenticated;
grant execute on function public.mark_garment_sold_with_price(uuid,integer,integer) to authenticated;
