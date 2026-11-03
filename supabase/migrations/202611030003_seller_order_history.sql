create or replace function public.get_my_sales_orders()
returns table (
  id uuid,
  created_at timestamptz,
  customer_name text,
  speculaaspoppen integer,
  stroopwafels integer,
  glutenvrij integer,
  lactosevrij integer,
  total_cents bigint,
  cancelled boolean
)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select
    o.id,
    o.created_at,
    o.customer_name,
    o.speculaaspoppen,
    o.stroopwafels,
    o.glutenvrij,
    o.lactosevrij,
    o.total_cents::bigint,
    o.cancelled
  from public.orders as o
  where o.seller_id = (select auth.uid())
  order by o.created_at desc;
$$;

revoke all on function public.get_my_sales_orders() from public, anon, authenticated;
grant execute on function public.get_my_sales_orders() to authenticated;
