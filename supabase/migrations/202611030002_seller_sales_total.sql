create or replace function public.get_my_sales_total()
returns bigint
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select coalesce(sum(total_cents), 0)::bigint
  from public.orders
  where seller_id = (select auth.uid())
    and not cancelled;
$$;

revoke all on function public.get_my_sales_total() from public, anon, authenticated;
grant execute on function public.get_my_sales_total() to authenticated;
