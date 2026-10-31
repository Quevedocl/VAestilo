-- migracion-12 · Reparto cocina/barra más completo (se puede ejecutar más de una vez).
-- Reconoce categorías en inglés y por tipo de trago (cocktails, gin, ron, vodka, whiskey, tequila, pisco, botellin, sour, spritz, mojitos, sangría…)
-- para que las bebidas lleguen a la barra y no a la cocina.
create or replace function fogon_estacion(p_category text, p_name text) returns text
language plpgsql immutable set search_path = public as $f$
declare
  c text := ' ' || regexp_replace(translate(lower(coalesce(p_category, '')), 'áéíóúüñ', 'aeiouun'), '[^a-z0-9]+', ' ', 'g') || ' ';
  n text := ' ' || regexp_replace(translate(lower(coalesce(p_name, '')), 'áéíóúüñ', 'aeiouun'), '[^a-z0-9]+', ' ', 'g') || ' ';
  bar_cat  constant text := ' (bebida|bebidas|bebestible|bebestibles|jugo|jugos|batido|batidos|smoothie|smoothies|cafe|cafes|cafeteria|te|tes|infusion|infusiones|cerveza|cervezas|botellin|botellines|schop|schops|vino|vinos|coctel|cocteles|cocteleria|cocktail|cocktails|trago|tragos|licor|licores|shot|shots|alcohol|alcoholes|destilado|destilados|espumante|espumantes|gaseosa|gaseosas|refresco|refrescos|aguas|limonada|limonadas|mocktail|mocktails|mojito|mojitos|spritz|sour|sours|sangria|sangrias|gin|ron|vodka|whisky|whiskey|tequila|pisco|cachaza|barra|bar) ';
  food_cat constant text := ' (comida|comidas|entrada|entradas|plato|platos|fondo|postre|postres|helado|helados|ensalada|ensaladas|sopa|sopas|carne|carnes|pescado|pescados|marisco|mariscos|pasta|pastas|pizza|pizzas|hamburguesa|hamburguesas|sandwich|sandwiches|sushi|taco|tacos|mexicano|parrilla|rapida|vegetariano|vegetarianos|vegano|veganos|menu|infantil|acompanamiento|acompanamientos|desayuno|desayunos|brunch|almuerzo|almuerzos|cena|cenas|snack|snacks|tapas|compartir|picoteo|pollo|cerdo|arroz|wok|pasteleria|reposteria|panaderia|tortas|queques|sandwichs|papas|quesadilla|quesadillas|ceviche|ceviches) ';
  bar_nom  constant text := ' (bebida|bebidas|jugo|jugos|nectar|batido|batidos|smoothie|malteada|limonada|limonadas|gaseosa|gaseosas|refresco|refrescos|soda|agua|aguas|mineral|tonica|ginger|energetica|energeticas|cafe|cafes|espresso|expreso|capuchino|capuccino|cappuccino|latte|moka|mocca|macchiato|cortado|te|tes|infusion|infusiones|chai|matcha|huesillo|cerveza|cervezas|schop|chela|chelas|ipa|lager|stout|pilsner|vino|vinos|espumante|champana|champagne|prosecco|trago|tragos|coctel|cocteles|cocktail|cocktails|licor|licores|pisco|piscola|ron|whisky|whiskey|vodka|gin|tequila|mojito|margarita|sour|spritz|aperol|negroni|caipirinha|caipirina|caipiroska|terremoto|michelada|mimosa|sangria|daiquiri|colada|cosmopolitan|martini|collins|mule|bramble|carajillo|ramazzotti|botellin) ';
  food_nom constant text := ' (torta|tortas|pastel|kuchen|pie|helado|helados|postre|ensalada|salsa|pollo|carne|lomo|pasta|pastas|sandwich|hamburguesa|pizza|sushi|roll|rolls|empanada|empanadas|tabla|plato|arroz|sopa|crema|brownie|cheesecake|tostada|pan|ceviche|filete|churrasco|completo|papas|queso|huevo|huevos|tarta|galleta|galletas|muffin|cupcake|waffle|panqueque|panqueques|crepe|crepes|pescado|salmon|camaron|camarones|chorizo|bife|costillar|costilla|ave|cerdo|vacuno) ';
  b boolean; f boolean;
begin
  b := c ~ bar_cat; f := c ~ food_cat;
  if b and not f then return 'bar'; end if;
  if f and not b then return 'kitchen'; end if;
  b := n ~ bar_nom; f := n ~ food_nom;
  if b and not f then return 'bar'; end if;
  if b and f and n ~ ('^' || bar_nom) then return 'bar'; end if;
  return 'kitchen';
end $f$;

-- Corrige lo que ya estaba guardado (el trigger solo recalcula al editar un producto).
update products set station = fogon_estacion(category, name) where station is distinct from fogon_estacion(category, name);
