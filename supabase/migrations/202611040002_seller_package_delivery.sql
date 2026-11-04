create or replace function public.set_seller_orders_given(
  p_seller_id uuid,
  p_given boolean
)
returns integer
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  updated_count integer;
begin
  if auth.uid() is null or not public.is_commission_member() then
    raise exception 'Alleen de commissie kan verkoperspakketten aftekenen.';
  end if;

  update public.orders
  set given = p_given
  where seller_id = p_seller_id
    and not cancelled;

  get diagnostics updated_count = row_count;
  return updated_count;
end;
$$;

revoke all on function public.set_seller_orders_given(uuid, boolean)
  from public, anon, authenticated;
grant execute on function public.set_seller_orders_given(uuid, boolean)
  to authenticated;
