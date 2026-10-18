-- Prueba del reparto automático cocina/barra. Ejecutar en una base de PRUEBA con migracion-11 aplicada:
--   psql -f supabase/tests/estacion-automatica.sql   (no deja nada guardado)
do $t$
declare r record; fallos text := '';
begin
  for r in select * from (values
    ('Bebida', 'Coca-Cola 350 ml', 'bar'),
    ('Bebidas', 'Agua mineral', 'bar'),
    ('Alcohol', 'Pisco sour', 'bar'),
    ('Café y té', 'Capuchino', 'bar'),
    ('Té e infusiones', 'Té verde', 'bar'),
    ('Jugos y batidos', 'Jugo de frambuesa', 'bar'),
    ('Cervezas', 'Escudo', 'bar'),
    ('Vinos', 'Copa carmenere', 'bar'),
    ('Cócteles', 'Mojito', 'bar'),
    ('Tragos y licores', 'Whisky', 'bar'),
    ('Cafetería', 'Latte', 'bar'),
    ('Bebidas', 'Mote con huesillo', 'bar'),
    ('Comida', 'Hamburguesa clásica', 'kitchen'),
    ('Postre', 'Helado de vainilla', 'kitchen'),
    ('Postres', 'Torta de café', 'kitchen'),
    ('Entradas', 'Empanada de pino', 'kitchen'),
    ('Desayunos', 'Café con tostadas', 'kitchen'),
    ('Menú infantil', 'Jugo + nuggets', 'kitchen'),
    ('Platos de fondo', 'Pollo al vino', 'kitchen'),
    ('Pizzas', 'Pizza margarita', 'kitchen'),
    ('Sushi', 'Roll California', 'kitchen'),
    ('Pastas', 'Fetuccini al pesto', 'kitchen'),
    ('Parrilla', 'Lomo vetado', 'kitchen'),
    ('Helados', 'Copa de helado', 'kitchen'),
    ('Especiales', 'Jugo natural de naranja', 'bar'),
    ('Especiales', 'Café helado', 'bar'),
    ('Especiales', 'Pisco sour de maracuyá', 'bar'),
    ('Especiales', 'Cerveza artesanal IPA', 'bar'),
    ('Del chef', 'Arroz blanco con pollo', 'kitchen'),
    ('Del chef', 'Salsa de vino tinto', 'kitchen'),
    ('Promos', 'Piscola', 'bar'),
    ('Promos', 'Completo italiano', 'kitchen'),
    ('Promos', 'Sándwich de ave', 'kitchen'),
    ('Cafetería y pastelería', 'Capuchino', 'bar'),
    ('Cafetería y pastelería', 'Kuchen de nuez', 'kitchen'),
    ('', '', 'kitchen'),
    (null, null, 'kitchen')
  ) as v(cat, nom, esperado) loop
    if fogon_estacion(r.cat, r.nom) <> r.esperado then
      fallos := fallos || format(E'\n  [%s] %s -> dio %s, esperaba %s', r.cat, r.nom, fogon_estacion(r.cat, r.nom), r.esperado);
    end if;
  end loop;
  if fallos <> '' then raise exception 'reparto incorrecto:%', fallos; end if;
  raise notice 'reparto automático: OK';
end $t$;
