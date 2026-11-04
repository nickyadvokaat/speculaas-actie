alter table public.profiles
  add column paid_total_cents bigint not null default 0
  check (paid_total_cents >= 0);

create or replace function public.set_seller_paid(
  p_seller_id uuid,
  p_paid boolean
)
returns bigint
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  current_total bigint;
begin
  if auth.uid() is null or not public.is_commission_member() then
    raise exception 'Alleen de commissie kan Tikkie-betalingen aftekenen.';
  end if;

  if not exists (select 1 from public.profiles where id = p_seller_id) then
    raise exception 'Deze verkoper bestaat niet.';
  end if;

  select coalesce(sum(total_cents), 0)::bigint
  into current_total
  from public.orders
  where seller_id = p_seller_id
    and not cancelled;

  update public.profiles
  set paid_total_cents = case when p_paid then current_total else 0 end
  where id = p_seller_id;

  return case when p_paid then current_total else 0 end;
end;
$$;

revoke all on function public.set_seller_paid(uuid, boolean)
  from public, anon, authenticated;
grant execute on function public.set_seller_paid(uuid, boolean)
  to authenticated;

create or replace function public.submit_order(
  p_customer_name text,
  p_address text,
  p_speculaaspoppen integer,
  p_stroopwafels integer,
  p_glutenvrij integer,
  p_lactosevrij integer
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  new_order_id uuid;
  seller_name text;
begin
  if (now() at time zone 'Europe/Amsterdam')::date >= date '2026-11-12' then
    raise exception 'De besteltermijn is gesloten sinds 12 november 2026.';
  end if;

  if auth.uid() is null then
    raise exception 'Log in om een bestelling op te slaan.';
  end if;

  select display_name
  into seller_name
  from public.profiles
  where id = auth.uid();

  if seller_name is null then
    raise exception 'Kies eerst een verkopersnaam voor de ranglijst.';
  end if;

  insert into public.orders (
    seller_id,
    customer_name,
    address,
    speculaaspoppen,
    stroopwafels,
    glutenvrij,
    lactosevrij
  )
  values (
    auth.uid(),
    p_customer_name,
    p_address,
    p_speculaaspoppen,
    p_stroopwafels,
    p_glutenvrij,
    p_lactosevrij
  )
  returning id into new_order_id;

  return new_order_id;
end;
$$;
