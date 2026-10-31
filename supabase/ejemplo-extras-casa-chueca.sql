-- Ejemplo (Casa Chueca): los "agregados extra" de la carta pasan de ser productos sueltos a opciones que aparecen
-- solo al pedir un plato de esa sección. Precios según la carta PDF 2026. Para otro local, cambia categorías, nombres y precios.
insert into product_addons (restaurant_id, name, price, category, is_available)
select r.restaurant_id, n.nombre, n.precio, n.categoria, true
from (select distinct restaurant_id from products where category in ('HAMBURGUESAS','PAPAS FRITAS')) r
cross join (values
  ('HAMBURGUESAS', 'EXTRA HAMBURGUESA', 2000),
  ('HAMBURGUESAS', 'EXTRA TOCINO', 2000),
  ('HAMBURGUESAS', 'VEGETALES EXTRA', 700),
  ('HAMBURGUESAS', 'CAMBIAR CARNE POR NOTBURGER (vegetal)', 1000),
  ('PAPAS FRITAS', 'VEGETALES', 1000),
  ('PAPAS FRITAS', 'PROTEÍNA', 3000),
  ('PAPAS FRITAS', 'SALSA CHEDDAR O BECHAMEL', 2500)) n(categoria, nombre, precio)
where not exists (select 1 from product_addons a where a.restaurant_id = r.restaurant_id and a.category = n.categoria and a.name = n.nombre);
delete from products where category in ('AGREGADOS EXTRA','CAMBIA TU CARNE','SALSAS');
