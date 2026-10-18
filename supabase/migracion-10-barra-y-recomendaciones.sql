-- VAestilo · migración 10 · cocina y barra separadas + productos recomendados al pagar
-- Ejecutar en SQL Editor (repetible) ANTES de subir los HTML nuevos.

-- 1) Cada producto sabe dónde se prepara y si se recomienda al terminar el pedido.
alter table products add column if not exists station text not null default 'kitchen';
alter table products drop constraint if exists products_station_chk;
alter table products add constraint products_station_chk check (station in ('kitchen', 'bar'));
alter table products add column if not exists recommended boolean not null default false;

-- 2) Estado de preparación por estación (vacío = todas siguen el estado general del pedido).
alter table orders add column if not exists station_status jsonb not null default '{}'::jsonb;

-- Si el panel principal cambia el estado del pedido, las estaciones lo siguen; al crear un pedido parte vacío.
create or replace function orders_station_sync() returns trigger language plpgsql set search_path = public as $$
begin
  if tg_op = 'INSERT' then new.station_status := '{}'::jsonb;
  elsif new.status is distinct from old.status and new.station_status is not distinct from old.station_status then new.station_status := '{}'::jsonb;
  end if;
  return new;
end $$;
drop trigger if exists orders_station_sync on orders;
create trigger orders_station_sync before insert or update on orders for each row execute function orders_station_sync();

-- 3) Pantallas de cocina / barra: p_station = 'kitchen' | 'bar' (sin valor = todo, como antes).
--    Cada pantalla ve solo los ítems de su estación, SIN precios, y su propio estado de preparación.
drop function if exists kitchen_orders(uuid);
drop function if exists kitchen_set_status(uuid, uuid, text);

create or replace function kitchen_orders(p_key uuid, p_station text default null)
returns table (id uuid, table_name text, status text, created_at timestamptz, modified_at timestamptz, cancelled_at timestamptz, items jsonb)
language sql security definer stable set search_path = public as $$
  with b as (
    select o.id, coalesce(o.table_name, 'Mesa ' || o.table_number) as tname, o.status::text as st, o.station_status as ss,
      o.created_at, o.modified_at, o.cancelled_at,
      (select coalesce(jsonb_agg(jsonb_build_object('name', i->>'name', 'qty', i->'qty', 'note', i->>'note', 'promo', i->>'promo',
          'station', coalesce((select p.station from products p where p.restaurant_id = o.restaurant_id and p.id::text = i->>'id'), 'kitchen'),
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

  if p_station is null then   -- comportamiento anterior: cambia el estado general
    if (o.status::text, p_status) not in (('pending', 'preparing'), ('preparing', 'ready'), ('ready', 'preparing'), ('preparing', 'pending')) then return 'invalid'; end if;
    update orders set status = p_status where id = o.id;
    return 'ok';
  end if;

  if p_station not in ('kitchen', 'bar') then return 'invalid'; end if;
  select coalesce(array_agg(distinct coalesce(p.station, 'kitchen')), '{}') into stations
    from jsonb_array_elements(o.items::jsonb) i left join products p on p.restaurant_id = o.restaurant_id and p.id::text = i->>'id';
  if not (p_station = any (stations)) then return 'not_found'; end if;

  ss := coalesce(o.station_status, '{}'::jsonb);
  foreach s in array stations loop ss := ss || jsonb_build_object(s, coalesce(ss->>s, o.status::text)); end loop;   -- fija el estado actual de cada estación
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
