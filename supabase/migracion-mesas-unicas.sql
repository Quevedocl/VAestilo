-- VAestilo · no se pueden crear dos mesas con el mismo nombre en un local
-- Ejecutar UNA vez en Supabase > SQL Editor (es seguro repetirla). Hazlo ANTES de subir el index.html nuevo.
--
-- Compara sin importar mayúsculas, tildes ni espacios de más: "Mesa 5", "mesa  5" y "MESA 5" son la misma mesa.
-- Solo revisa mesas nuevas o renombradas: si ya tenías nombres repetidos de antes, no se tocan ni dan error.

create or replace function fogon_clave_mesa(p text) returns text language sql immutable set search_path = public as $f$
  select btrim(regexp_replace(translate(lower(coalesce(p, '')), 'áàäâãåéèëêíìïîóòöôõúùüûýç', 'aaaaaaeeeeiiiiooooouuuuyc'), '\s+', ' ', 'g'))
$f$;

create or replace function fogon_mesa_unica() returns trigger language plpgsql set search_path = public as $f$
begin
  if tg_op = 'UPDATE' and fogon_clave_mesa(new.name) = fogon_clave_mesa(old.name) then return new; end if;
  perform pg_advisory_xact_lock(hashtext(new.restaurant_id::text));       -- evita que dos pedidos simultáneos creen la misma mesa
  if exists (select 1 from dining_tables d where d.restaurant_id = new.restaurant_id and d.id is distinct from new.id
             and fogon_clave_mesa(d.name) = fogon_clave_mesa(new.name)) then
    raise exception 'mesa_duplicada' using errcode = 'P0001';
  end if;
  return new;
end $f$;

drop trigger if exists zz_mesa_unica on dining_tables;
create trigger zz_mesa_unica before insert or update of name on dining_tables for each row execute function fogon_mesa_unica();
