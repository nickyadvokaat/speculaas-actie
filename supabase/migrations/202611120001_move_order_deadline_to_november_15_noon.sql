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
  if now() >= timestamptz '2026-11-15 12:00:00 Europe/Amsterdam' then
    raise exception 'De besteltermijn sluit op zondag 15 november 2026 om 12.00 uur.';
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
