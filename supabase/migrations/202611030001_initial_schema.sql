create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text check (
    display_name is null or char_length(trim(display_name)) between 1 and 32
  ),
  role text not null default 'seller' check (role in ('seller', 'admin')),
  created_at timestamptz not null default now()
);

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid not null references public.profiles (id),
  customer_name text not null check (
    char_length(trim(customer_name)) between 1 and 100
  ),
  address text check (address is null or char_length(address) <= 250),
  speculaaspoppen integer not null default 0,
  stroopwafels integer not null default 0,
  glutenvrij integer not null default 0,
  lactosevrij integer not null default 0,
  total_cents integer not null default 0 check (
    total_cents between 0 and 15000
  ),
  given boolean not null default false,
  cancelled boolean not null default false,
  created_at timestamptz not null default now(),
  constraint orders_product_count_limits check (
    speculaaspoppen between 0 and 20
    and stroopwafels between 0 and 20
    and glutenvrij between 0 and 20
    and lactosevrij between 0 and 20
    and speculaaspoppen + stroopwafels + glutenvrij + lactosevrij > 0
  )
);

create index orders_seller_id_idx on public.orders (seller_id);
create index orders_created_at_idx on public.orders (created_at desc);

create or replace function public.create_profile_for_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  insert into public.profiles (id) values (new.id);
  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.create_profile_for_new_user();

create or replace function public.is_commission_member()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.profiles
    where id = (select auth.uid())
      and role = 'admin'
  );
$$;

create or replace function public.calculate_order_total()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
declare
  regular_wafels integer;
  special_wafels integer;
begin
  if new.speculaaspoppen not between 0 and 20
    or new.stroopwafels not between 0 and 20
    or new.glutenvrij not between 0 and 20
    or new.lactosevrij not between 0 and 20
    or new.speculaaspoppen + new.stroopwafels + new.glutenvrij + new.lactosevrij = 0
  then
    raise exception 'Ongeldige aantallen: kies per product 0 t/m 20 en minimaal één product.';
  end if;

  regular_wafels :=
    (new.stroopwafels / 3) * 900
    + (new.stroopwafels % 3) * 330;
  special_wafels :=
    ((new.glutenvrij + new.lactosevrij) / 3) * 1250
    + ((new.glutenvrij + new.lactosevrij) % 3) * 460;
  new.total_cents :=
    new.speculaaspoppen * 700 + regular_wafels + special_wafels;

  if new.total_cents > 15000 then
    raise exception 'Het maximum per bestelling is € 150,00.';
  end if;

  new.customer_name := trim(new.customer_name);
  new.address := nullif(trim(new.address), '');
  if char_length(new.customer_name) not between 1 and 100 then
    raise exception 'Vul een geldige naam van de koper in.';
  end if;
  if new.address is not null and char_length(new.address) > 250 then
    raise exception 'Het adres is te lang.';
  end if;
  return new;
end;
$$;

create trigger calculate_order_total_before_write
before insert or update on public.orders
for each row execute procedure public.calculate_order_total();

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

create or replace function public.get_leaderboard()
returns table (display_name text, total_cents bigint)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select p.display_name, sum(o.total_cents)::bigint
  from public.orders as o
  join public.profiles as p on p.id = o.seller_id
  where not o.cancelled
    and p.display_name is not null
  group by p.display_name
  order by sum(o.total_cents) desc, p.display_name asc;
$$;

alter table public.profiles enable row level security;
alter table public.orders enable row level security;

create policy "Profiles are visible to their owner and commission"
on public.profiles for select to authenticated
using (id = (select auth.uid()) or (select public.is_commission_member()));

create policy "Profiles can set their own name once; commission can correct it"
on public.profiles for update to authenticated
using (
  (id = (select auth.uid()) and display_name is null)
  or (select public.is_commission_member())
)
with check (
  (id = (select auth.uid()) and display_name is not null)
  or (select public.is_commission_member())
);

create policy "Commission can read all orders"
on public.orders for select to authenticated
using ((select public.is_commission_member()));

create policy "Commission can update orders"
on public.orders for update to authenticated
using ((select public.is_commission_member()))
with check ((select public.is_commission_member()));

revoke all on public.profiles from anon, authenticated;
grant select on public.profiles to authenticated;
grant update (display_name) on public.profiles to authenticated;

revoke all on public.orders from anon, authenticated;
grant select on public.orders to authenticated;
grant update (
  customer_name,
  address,
  speculaaspoppen,
  stroopwafels,
  glutenvrij,
  lactosevrij,
  given,
  cancelled
) on public.orders to authenticated;

revoke all on function public.submit_order(text, text, integer, integer, integer, integer)
  from public, anon, authenticated;
grant execute on function public.submit_order(text, text, integer, integer, integer, integer)
  to authenticated;

revoke all on function public.get_leaderboard() from public, anon, authenticated;
grant execute on function public.get_leaderboard() to anon, authenticated;

revoke all on function public.is_commission_member() from public, anon, authenticated;
grant execute on function public.is_commission_member() to authenticated;
