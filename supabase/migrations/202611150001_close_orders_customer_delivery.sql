alter table public.orders
  add column if not exists delivered_to_customer boolean not null default false;

create or replace function public.get_my_order_delivery()
returns table (order_id uuid, package_given boolean, delivered_to_customer boolean)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select o.id, o.given, o.delivered_to_customer
  from public.orders o
  where o.seller_id = (select auth.uid());
$$;

revoke all on function public.get_my_order_delivery() from public, anon, authenticated;
grant execute on function public.get_my_order_delivery() to authenticated;

create or replace function public.set_my_order_delivered(p_order_id uuid, p_delivered boolean)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if auth.uid() is null then
    raise exception 'Log in om de uitdeelstatus bij te werken.';
  end if;
  if p_delivered is null then
    raise exception 'Kies een geldige uitdeelstatus.';
  end if;
  update public.orders
  set delivered_to_customer = p_delivered
  where id = p_order_id and seller_id = auth.uid() and not cancelled;
  if not found then
    raise exception 'Deze bestelling kan niet worden bijgewerkt.';
  end if;
end;
$$;

revoke all on function public.set_my_order_delivered(uuid, boolean) from public, anon, authenticated;
grant execute on function public.set_my_order_delivered(uuid, boolean) to authenticated;

revoke all on function public.submit_order(text, text, integer, integer, integer, integer)
  from public, anon, authenticated;
