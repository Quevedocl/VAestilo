-- VAestilo · filtro de groserías en la base de datos
-- Ejecutar UNA vez en Supabase > SQL Editor (es seguro repetirla). Hazlo ANTES de subir los HTML nuevos.
-- ARCHIVO GENERADO por tests/generar-filtro-sql.js desde filtro.js: no lo edites a mano.
--
-- Por qué existe: el filtro del navegador (filtro.js) se puede saltar llamando a la API directamente.
-- Esta es la barrera real: rechaza con el error "texto_no_permitido" cualquier nombre de plato, categoría,
-- agregado, promoción, mesa o negocio, y las notas/mesa de pedidos y llamadas, que tengan groserías.
-- Solo revisa lo que se escribe o cambia: lo que ya existía no impide seguir usando el panel
-- (pausar un plato, cobrar, cerrar mesas, etc.).

create or replace function fogon_texto_prohibido(p text) returns boolean
language plpgsql immutable set search_path = public as $f$
declare
  t text; toks text[]; fin text[] := '{}'; tok text; c text; i int := 1; j int; n int; frase text;
  palabras text[] := array['ctm', 'ctmre', 'csm', 'hdp', 'ql', 'qlo', 'qlos', 'mierda', 'mierdas', 'coño', 'puñeta', 'carajo', 'cojones', 'cojon', 'cojudo', 'pendejo', 'pendeja', 'pendejos', 'pelotudo', 'pelotuda', 'boludo', 'boluda', 'gilipolas', 'gilipola', 'cabron', 'cabrona', 'cabrones', 'joto', 'maraco', 'maraca', 'verga', 'vergas', 'pija', 'pijas', 'poto', 'potos', 'ojete', 'tula', 'folar', 'folada', 'chingar', 'chinga', 'chingada', 'chingadera', 'chingatumadre', 'imbecil', 'imbeciles', 'idiota', 'idiotas', 'estupido', 'estupida', 'retrasado', 'retrasada', 'mogolico', 'mogolica', 'subnormal', 'sudaca', 'fuck', 'fucking', 'fucker', 'motherfucker', 'fck', 'shit', 'shity', 'bitch', 'bitches', 'ashole', 'dick', 'dicks', 'cunt', 'bastard', 'pusy', 'cock', 'whore', 'slut', 'niger', 'niga', 'fagot']::text[];
  familias text[] := array['^a?(w|hu|gu)e[bv]?on(a|es|as|ao|ado|ada|azo|cito|cita)?$', '^(w|hu)ea(s)?$', '^(w|hu)e[v]?ada(s)?$', '^cul(o|os|ia|iao|iaos|iado|iada|iados|iadas|iar|iando|ear|eo|eado|eada)$', '^put(a|as|o|os|ita|ito|itas|itos|ear|eo|eada|eado|ada|illa)$', '^chuch(a|as|e|esumare|etumare|esumadre|etumadre)$', '^cag(ada|adas|ado|ar|on|ones|ona)$', '^maric(on|ones|a|as|onada)$', '^pichul(a|as|ita|itas)$']::text[];
  fragmentos text[] := array['conchetumadre', 'conchetumare', 'conchesumare', 'conchadetumadre', 'conchadesumadre', 'hijodeputa', 'hijoputa', 'hijoeputa', 'hijaeputa', 'hijueputa', 'hijadeputa', 'putamadre', 'putamare', 'reputamadre', 'mierda', 'culiao', 'maricon', 'pendejo', 'gilipola', 'chingatumadre', 'mamaguevo', 'mamahuevo', 'aweonao']::text[];
  frases text[] := array['(^| )(concha|chucha) (de )?(tu|su|la) ?(madre|mare)( |$)']::text[];
  ok0 text := 'de'; ok1 text := 'galo';
begin
  if p is null or btrim(p) = '' then return false; end if;
  t := lower(p);
  t := regexp_replace(t, '[\u200b-\u200f\u2060\ufeff\u00ad]', '', 'g');
  t := translate(t, 'áàäâãåéèëêíìïîóòöôõúùüûýç', 'aaaaaaeeeeiiiiooooouuuuyc');
  t := translate(t, '013457@$', 'oieastas');                       -- números y símbolos por letras (p1c0, m13rd4)
  t := regexp_replace(t, '[.\-_*''`~^·]', '', 'g');                -- m.i.e.r.d.a → mierda
  t := regexp_replace(t, '[^a-zñ]', ' ', 'g');
  t := btrim(t);
  if t = '' then return false; end if;
  toks := regexp_split_to_array(t, '\s+');
  n := coalesce(array_length(toks, 1), 0);
  while i <= n loop                                                 -- une letras sueltas: "p i c o" → "pico"
    j := i; while j <= n and length(toks[j]) = 1 loop j := j + 1; end loop;
    if j - i >= 3 then fin := fin || array_to_string(toks[i:j-1], ''); i := j;
    else fin := fin || toks[i]; i := i + 1; end if;
  end loop;
  n := coalesce(array_length(fin, 1), 0);
  for i in 1..n loop fin[i] := regexp_replace(fin[i], '(.)\1+', '\1', 'g'); end loop;   -- puuuta → puta
  for i in 1..n loop
    tok := fin[i];
    if tok = 'pico' then
      if i + 2 <= n and fin[i + 1] = ok0 and fin[i + 2] = ok1 then continue; end if;   -- "pico de gallo" se permite
      return true;
    end if;
    if tok = any (palabras) then return true; end if;
    foreach c in array familias loop if tok ~ c then return true; end if; end loop;
    if length(tok) >= 6 then foreach c in array fragmentos loop if position(c in tok) > 0 then return true; end if; end loop; end if;
  end loop;
  frase := array_to_string(fin, ' ');
  foreach c in array frases loop if frase ~ c then return true; end if; end loop;
  return false;
end $f$;

-- Rechaza las columnas de texto indicadas (argumentos del trigger) si traen groserías.
-- En UPDATE solo mira las que cambiaron.
create or replace function fogon_filtrar_columnas() returns trigger language plpgsql set search_path = public as $f$
declare col text; nuevo jsonb := to_jsonb(new); viejo jsonb := case when tg_op = 'UPDATE' then to_jsonb(old) else '{}'::jsonb end;
begin
  foreach col in array tg_argv loop
    if (nuevo ->> col) is distinct from (viejo ->> col) and fogon_texto_prohibido(nuevo ->> col) then
      raise exception 'texto_no_permitido' using errcode = 'P0001';
    end if;
  end loop;
  return new;
end $f$;

-- Pedidos: mesa y notas de cada ítem
create or replace function fogon_filtrar_pedido() returns trigger language plpgsql set search_path = public as $f$
declare it jsonb;
begin
  if tg_op = 'INSERT' or new.table_name is distinct from old.table_name then
    if fogon_texto_prohibido(new.table_name) then raise exception 'texto_no_permitido' using errcode = 'P0001'; end if;
  end if;
  if (tg_op = 'INSERT' or new.items is distinct from old.items) and jsonb_typeof(new.items) = 'array' then
    for it in select * from jsonb_array_elements(new.items) loop
      if fogon_texto_prohibido(it ->> 'note') then raise exception 'texto_no_permitido' using errcode = 'P0001'; end if;
    end loop;
  end if;
  return new;
end $f$;

drop trigger if exists zz_filtro_pedido on orders;
create trigger zz_filtro_pedido before insert or update on orders for each row execute function fogon_filtrar_pedido();

drop trigger if exists zz_filtro on products;
create trigger zz_filtro before insert or update on products for each row execute function fogon_filtrar_columnas('name', 'category', 'description');
drop trigger if exists zz_filtro on product_addons;
create trigger zz_filtro before insert or update on product_addons for each row execute function fogon_filtrar_columnas('name');
drop trigger if exists zz_filtro on promotions;
create trigger zz_filtro before insert or update on promotions for each row execute function fogon_filtrar_columnas('title');
drop trigger if exists zz_filtro on dining_tables;
create trigger zz_filtro before insert or update on dining_tables for each row execute function fogon_filtrar_columnas('name');
drop trigger if exists zz_filtro on restaurants;
create trigger zz_filtro before insert or update on restaurants for each row execute function fogon_filtrar_columnas('name');
drop trigger if exists zz_filtro on waiter_calls;
create trigger zz_filtro before insert or update on waiter_calls for each row execute function fogon_filtrar_columnas('table_name', 'note');
