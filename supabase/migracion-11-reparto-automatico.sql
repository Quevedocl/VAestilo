-- VAestilo · migración 11 · reparto AUTOMÁTICO cocina/barra + reparación de Supabase
-- Ejecutar en SQL Editor (repetible) ANTES de subir los HTML nuevos. Arregla "no me deja añadir productos".

-- 0) Verificación: si faltan las migraciones anteriores, avisa claro en vez de fallar a medias.
do $$ begin
  if to_regclass('public.products') is null or to_regclass('public.orders') is null
     or to_regprocedure('public.is_owner(uuid)') is null or to_regprocedure('public.fogon_price_items(uuid,jsonb)') is null
     or to_regprocedure('public.join_table(uuid,uuid)') is null then
    raise exception 'Faltan migraciones anteriores: ejecuta primero las 1 a 8 del README (o schema.sql en un proyecto vacío).';
  end if;
end $$;

-- 1) Columnas de estación y recomendado (sin esto, añadir productos falla con "Could not find the 'station' column").
alter table products add column if not exists station text not null default 'kitchen';
alter table products drop constraint if exists products_station_chk;
alter table products add constraint products_station_chk check (station in ('kitchen', 'bar'));
alter table products add column if not exists recommended boolean not null default false;
alter table orders add column if not exists station_status jsonb not null default '{}'::jsonb;

create or replace function orders_station_sync() returns trigger language plpgsql set search_path = public as $$
begin
  if tg_op = 'INSERT' then new.station_status := '{}'::jsonb;
  elsif new.status is distinct from old.status and new.station_status is not distinct from old.station_status then new.station_status := '{}'::jsonb;
  end if;
  return new;
end $$;
drop trigger if exists orders_station_sync on orders;
create trigger orders_station_sync before insert or update on orders for each row execute function orders_station_sync();

-- 2) Acceso de cocina/barra (de la migración 9; por si tu proyecto no la tiene).
create table if not exists kitchen_access (restaurant_id uuid primary key references restaurants on delete cascade, key uuid not null unique default gen_random_uuid());
alter table kitchen_access enable row level security;
revoke all on kitchen_access from anon;
drop policy if exists ka_own on kitchen_access;
create policy ka_own on kitchen_access for all to authenticated using (is_owner(restaurant_id)) with check (is_owner(restaurant_id));
insert into kitchen_access (restaurant_id) select id from restaurants on conflict do nothing;
create or replace function restaurants_kitchen_row() returns trigger language plpgsql security definer set search_path = public as $$
begin insert into kitchen_access (restaurant_id) values (new.id) on conflict do nothing; return new; end $$;
drop trigger if exists restaurants_kitchen_row on restaurants;
create trigger restaurants_kitchen_row after insert on restaurants for each row execute function restaurants_kitchen_row();
create or replace function kitchen_info(p_key uuid) returns text language sql security definer stable set search_path = public as $$
  select r.name from kitchen_access k join restaurants r on r.id = k.restaurant_id where k.key = p_key and r.active
$$;
revoke all on function kitchen_info(uuid) from public;
grant execute on function kitchen_info(uuid) to anon, authenticated;

-- 3) REPARTO AUTOMÁTICO: la base decide si un producto va a la barra (bebidas) o a cocina (comida).
--    Mira primero la categoría y, si no alcanza (categorías propias), el nombre. Lo dudoso va a cocina.
--    Funciona para TODO lo que se guarde: formulario, escaneo de carta con IA, ediciones.
create or replace function fogon_estacion(p_category text, p_name text) returns text
language plpgsql immutable set search_path = public as $f$
declare
  c text := ' ' || regexp_replace(translate(lower(coalesce(p_category, '')), 'áéíóúüñ', 'aeiouun'), '[^a-z0-9]+', ' ', 'g') || ' ';
  n text := ' ' || regexp_replace(translate(lower(coalesce(p_name, '')), 'áéíóúüñ', 'aeiouun'), '[^a-z0-9]+', ' ', 'g') || ' ';
  bar_cat  constant text := ' (bebida|bebidas|bebestible|bebestibles|jugo|jugos|batido|batidos|smoothie|smoothies|cafe|cafes|cafeteria|te|tes|infusion|infusiones|cerveza|cervezas|vino|vinos|coctel|cocteles|cocteleria|trago|tragos|licor|licores|alcohol|alcoholes|destilado|destilados|espumante|espumantes|gaseosa|gaseosas|refresco|refrescos|aguas|limonada|limonadas|mocktail|mocktails|barra|bar) ';
  food_cat constant text := ' (comida|comidas|entrada|entradas|plato|platos|fondo|postre|postres|helado|helados|ensalada|ensaladas|sopa|sopas|carne|carnes|pescado|pescados|marisco|mariscos|pasta|pastas|pizza|pizzas|hamburguesa|hamburguesas|sandwich|sandwiches|sushi|taco|tacos|mexicano|parrilla|rapida|vegetariano|vegetarianos|vegano|veganos|menu|infantil|acompanamiento|acompanamientos|desayuno|desayunos|brunch|almuerzo|almuerzos|cena|cenas|snack|snacks|tapas|compartir|picoteo|pollo|cerdo|arroz|wok|pasteleria|reposteria|panaderia|tortas|queques|sandwichs) ';
  bar_nom  constant text := ' (bebida|bebidas|jugo|jugos|nectar|batido|batidos|smoothie|malteada|limonada|limonadas|gaseosa|gaseosas|refresco|refrescos|soda|agua|aguas|mineral|tonica|ginger|energetica|energeticas|cafe|cafes|espresso|expreso|capuchino|capuccino|cappuccino|latte|moka|mocca|macchiato|cortado|te|tes|infusion|infusiones|chai|matcha|huesillo|cerveza|cervezas|schop|chela|chelas|ipa|lager|stout|pilsner|vino|vinos|espumante|champana|champagne|prosecco|trago|tragos|coctel|cocteles|cocktail|cocktails|licor|licores|pisco|piscola|ron|whisky|whiskey|vodka|gin|tequila|mojito|margarita|sour|spritz|aperol|negroni|caipirinha|caipirina|terremoto|michelada|mimosa|sangria) ';
  food_nom constant text := ' (torta|tortas|pastel|kuchen|pie|helado|helados|postre|ensalada|salsa|pollo|carne|lomo|pasta|pastas|sandwich|hamburguesa|pizza|sushi|roll|rolls|empanada|empanadas|tabla|plato|arroz|sopa|crema|brownie|cheesecake|tostada|pan|ceviche|filete|churrasco|completo|papas|queso|huevo|huevos|tarta|galleta|galletas|muffin|cupcake|waffle|panqueque|panqueques|crepe|crepes|pescado|salmon|camaron|camarones|chorizo|bife|costillar|costilla|ave|cerdo|vacuno) ';
  b boolean; f boolean;
begin
  b := c ~ bar_cat; f := c ~ food_cat;
  if b and not f then return 'bar'; end if;
  if f and not b then return 'kitchen'; end if;
  b := n ~ bar_nom; f := n ~ food_nom;
  if b and not f then return 'bar'; end if;
  if b and f and n ~ ('^' || bar_nom) then return 'bar'; end if;   -- "Café helado": empieza con bebida
  return 'kitchen';
end $f$;

create or replace function products_set_station() returns trigger language plpgsql set search_path = public as $f$
begin
  new.station := fogon_estacion(new.category, new.name);
  return new;
end $f$;
drop trigger if exists aa_products_station on products;
create trigger aa_products_station before insert or update on products for each row execute function products_set_station();

-- Ordena la carta que ya existe.
update products set station = fogon_estacion(category, name) where station is distinct from fogon_estacion(category, name);

-- 4) El pedido guarda de dónde sale cada ítem al momento de pedir (así borrar o editar un producto después no mueve pedidos viejos).
create or replace function fogon_price_items(p_rid uuid, p_items jsonb, out o_items jsonb, out o_total numeric)
language plpgsql security definer stable set search_path = public as $$
declare
  it jsonb; ad jsonb; prod record; adr record; grp record; promo record;
  qty int; unit numeric; sub numeric := 0; disc numeric := 0; d numeric;
  lines jsonb := '[]'::jsonb; ads jsonb; ad_ids text[]; note text; titles jsonb := '{}'::jsonb;
  today date := (now() at time zone 'America/Santiago')::date;
begin
  if p_rid is null or p_items is null or jsonb_typeof(p_items) <> 'array'
     or jsonb_array_length(p_items) = 0 or jsonb_array_length(p_items) > 60 then
    raise exception 'pedido_invalido';
  end if;

  for it in select value from jsonb_array_elements(p_items) loop
    if jsonb_typeof(it) <> 'object' or coalesce(it->>'qty', '') !~ '^[0-9]{1,3}$' or coalesce(it->>'id', '') = '' then
      raise exception 'pedido_invalido';
    end if;
    qty := (it->>'qty')::int;
    if qty < 1 or qty > 20 then raise exception 'pedido_invalido'; end if;

    select p.* into prod from products p where p.restaurant_id = p_rid and p.id::text = it->>'id';
    if not found or prod.is_available is not true then raise exception 'pedido_invalido'; end if;

    unit := prod.price; ads := '[]'::jsonb; ad_ids := '{}';
    if jsonb_typeof(it->'addons') = 'array' then
      if jsonb_array_length(it->'addons') > 10 then raise exception 'pedido_invalido'; end if;
      for ad in select value from jsonb_array_elements(it->'addons') loop
        select a.* into adr from product_addons a
          where a.restaurant_id = p_rid and a.id::text = ad->>'id' and a.is_available
            and ((a.product_id is not null and a.product_id = prod.id::text) or (a.product_id is null and a.category = prod.category));
        if not found or adr.id::text = any (ad_ids) then raise exception 'pedido_invalido'; end if;
        ad_ids := ad_ids || adr.id::text;
        unit := unit + adr.price;
        ads := ads || jsonb_build_array(jsonb_build_object('id', adr.id, 'name', adr.name, 'price', adr.price));
      end loop;
    end if;

    note := nullif(left(btrim(coalesce(it->>'note', '')), 80), '');
    sub := sub + unit * qty;
    lines := lines || jsonb_build_array(jsonb_strip_nulls(jsonb_build_object(
      'id', prod.id::text, 'name', prod.name, 'station', prod.station, 'qty', qty, 'price', prod.price,
      'note', note, 'addons', case when jsonb_array_length(ads) > 0 then ads end)));
  end loop;

  for grp in
    select l.id, sum(l.qty)::int as q, max(l.price) as pr
    from jsonb_to_recordset(lines) as l(id text, qty int, price numeric) group by l.id
  loop
    select x.* into promo from promotions x
      where x.restaurant_id = p_rid and x.is_active and x.type <> 'info' and x.product_id = grp.id
        and (x.ends_on is null or x.ends_on >= today)
      order by x.created_at limit 1;
    if not found then continue; end if;
    d := 0;
    if promo.type = 'nxm' and coalesce(promo.buy_qty, 0) > 0 and coalesce(promo.pay_qty, 0) >= 0 then
      d := floor(grp.q::numeric / promo.buy_qty) * greatest(promo.buy_qty - promo.pay_qty, 0) * grp.pr;
    elsif promo.type = 'percent' then
      d := round(grp.q * grp.pr * least(greatest(coalesce(promo.value, 0), 0), 100) / 100);
    elsif promo.type = 'price' then
      d := greatest(0, grp.pr - coalesce(promo.value, grp.pr)) * grp.q;
    end if;
    if d > 0 then disc := disc + d; titles := titles || jsonb_build_object(grp.id, promo.title); end if;
  end loop;

  if titles <> '{}'::jsonb then
    select jsonb_agg(case when titles ? (l.v->>'id') then l.v || jsonb_build_object('promo', titles->>(l.v->>'id')) else l.v end order by l.ord)
      into lines from jsonb_array_elements(lines) with ordinality as l(v, ord);
  end if;

  o_items := lines;
  o_total := greatest(sub - disc, 0);
end $$;
revoke all on function fogon_price_items(uuid, jsonb) from public, anon, authenticated;

-- 5) Pantallas de cocina y barra: cada una ve solo lo suyo, sin precios.
drop function if exists kitchen_orders(uuid);
drop function if exists kitchen_orders(uuid, text);
drop function if exists kitchen_set_status(uuid, uuid, text);
drop function if exists kitchen_set_status(uuid, uuid, text, text);

create or replace function kitchen_orders(p_key uuid, p_station text default null)
returns table (id uuid, table_name text, status text, created_at timestamptz, modified_at timestamptz, cancelled_at timestamptz, items jsonb)
language sql security definer stable set search_path = public as $$
  with b as (
    select o.id, coalesce(o.table_name, 'Mesa ' || o.table_number) as tname, o.status::text as st, o.station_status as ss,
      o.created_at, o.modified_at, o.cancelled_at,
      (select coalesce(jsonb_agg(jsonb_build_object('name', i->>'name', 'qty', i->'qty', 'note', i->>'note', 'promo', i->>'promo',
          'station', coalesce(i->>'station', (select p.station from products p where p.restaurant_id = o.restaurant_id and p.id::text = i->>'id'), 'kitchen'),
          'addons', (select coalesce(jsonb_agg(a->>'name'), '[]'::jsonb) from jsonb_array_elements(coalesce(i->'addons', '[]'::jsonb)) a))), '[]'::jsonb)
         from jsonb_array_elements(o.items::jsonb) i) as its
    from kitchen_access k join restaurants r on r.id = k.restaurant_id join orders o on o.restaurant_id = r.id
    where k.key = p_key and r.active
      and (o.created_at > now() - interval '12 hours' or o.cancelled_at > now() - interval '10 minutes')
  ), c as (
    select b.id, b.tname, b.created_at, b.modified_at, b.cancelled_at,
      case when p_station is null or b.st not in ('pending', 'preparing', 'ready') then b.st else coalesce(b.ss->>p_station, b.st) end as est,
      (select coalesce(jsonb_agg(x), '[]'::jsonb) from jsonb_array_elements(b.its) x where p_station is null or x->>'station' = p_station) as its
    from b
  )
  select c.id, c.tname, c.est, c.created_at, c.modified_at, c.cancelled_at, c.its
  from c
  where jsonb_array_length(c.its) > 0 and (
       (c.est in ('pending', 'preparing') and c.created_at > now() - interval '12 hours')
    or (c.est = 'ready' and c.created_at > now() - interval '2 hours')
    or (c.est = 'cancelled' and c.cancelled_at > now() - interval '10 minutes'))
  order by c.created_at
$$;

create or replace function kitchen_set_status(p_key uuid, p_order uuid, p_status text, p_station text default null) returns text
language plpgsql security definer set search_path = public as $$
declare o record; stations text[]; ss jsonb; cur text; s text; overall text; n_ready int := 0; n_pend int := 0;
begin
  select x.* into o from orders x join kitchen_access k on k.restaurant_id = x.restaurant_id join restaurants r on r.id = x.restaurant_id
    where k.key = p_key and r.active and x.id = p_order for update of x;
  if not found then return 'not_found'; end if;
  if o.status::text in ('completed', 'cancelled') then return 'closed'; end if;

  if p_station is null then
    if (o.status::text, p_status) not in (('pending', 'preparing'), ('preparing', 'ready'), ('ready', 'preparing'), ('preparing', 'pending')) then return 'invalid'; end if;
    update orders set status = p_status where id = o.id;
    return 'ok';
  end if;

  if p_station not in ('kitchen', 'bar') then return 'invalid'; end if;
  select coalesce(array_agg(distinct coalesce(i->>'station', p.station, 'kitchen')), '{}') into stations
    from jsonb_array_elements(o.items::jsonb) i left join products p on p.restaurant_id = o.restaurant_id and p.id::text = i->>'id';
  if not (p_station = any (stations)) then return 'not_found'; end if;

  ss := coalesce(o.station_status, '{}'::jsonb);
  foreach s in array stations loop ss := ss || jsonb_build_object(s, coalesce(ss->>s, o.status::text)); end loop;
  cur := ss->>p_station;
  if (cur, p_status) not in (('pending', 'preparing'), ('preparing', 'ready'), ('ready', 'preparing'), ('preparing', 'pending')) then return 'invalid'; end if;
  ss := ss || jsonb_build_object(p_station, p_status);

  foreach s in array stations loop
    if ss->>s = 'ready' then n_ready := n_ready + 1; elsif ss->>s = 'pending' then n_pend := n_pend + 1; end if;
  end loop;
  overall := case when n_ready = cardinality(stations) then 'ready' when n_pend = cardinality(stations) then 'pending' else 'preparing' end;
  update orders set station_status = ss, status = overall where id = o.id;
  return 'ok';
end $$;

revoke all on function kitchen_orders(uuid, text), kitchen_set_status(uuid, uuid, text, text) from public;
grant execute on function kitchen_orders(uuid, text), kitchen_set_status(uuid, uuid, text, text) to anon, authenticated;

-- 6) Tiempo real para productos (el panel se actualiza solo al añadir/editar).
do $$ declare t text; begin foreach t in array array['orders','products','promotions','dining_tables','waiter_calls','product_addons'] loop
  begin execute format('alter publication supabase_realtime add table %I', t); exception when others then null; end;
end loop; end $$;
