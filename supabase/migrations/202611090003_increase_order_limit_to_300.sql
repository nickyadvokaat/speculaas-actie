alter table public.orders
  drop constraint if exists orders_total_cents_check;

alter table public.orders
  add constraint orders_total_cents_check
  check (total_cents between 0 and 30000);

create or replace function public.calculate_order_total()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
declare
  regular_wafels integer;
  special_wafels integer;
begin
  if new.speculaaspoppen not between 0 and 50
    or new.stroopwafels not between 0 and 50
    or new.glutenvrij not between 0 and 50
    or new.lactosevrij not between 0 and 50
    or new.speculaaspoppen + new.stroopwafels + new.glutenvrij + new.lactosevrij = 0
  then
    raise exception 'Ongeldige aantallen: kies per product 0 t/m 50 en minimaal één product.';
  end if;

  regular_wafels :=
    (new.stroopwafels / 3) * 900
    + (new.stroopwafels % 3) * 330;
  special_wafels :=
    ((new.glutenvrij + new.lactosevrij) / 3) * 1250
    + ((new.glutenvrij + new.lactosevrij) % 3) * 460;
  new.total_cents :=
    new.speculaaspoppen * 700 + regular_wafels + special_wafels;

  if new.total_cents > 30000 then
    raise exception 'Het maximum per bestelling is € 300,00.';
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
