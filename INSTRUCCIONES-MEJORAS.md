# Mejoras implementadas — orden de instalación

1. **Supabase > SQL Editor**: ejecuta `supabase/migracion-mejoras.sql` (es repetible). Hazlo ANTES de subir los HTML.
2. **Supabase > Authentication > Emails > Templates > Confirm signup**: pega `supabase/email-template-confirmar-registro.html`
   (debe contener `{{ .Token }}`; sin eso llegaría el link en vez del código).
   Opcional: Authentication > Providers > Email → largo y vencimiento del código (OTP).
3. Sube `index.html` y `carta.html`.

## Web (index.html)
- **Ingresos**: pestaña nueva (ventas, cobrado, por cobrar, pedidos, ticket promedio, agregados, ventas por hora, más vendidos, selector de día) + "Ventas hoy" en Pedidos. Los pedidos cancelados no cuentan.
- **Agregados**: pestaña nueva. Se crean por producto o por categoría, con precio; se activan/desactivan y editan inline.
- **Producto**: ahora tiene descripción y botón de editar (lápiz).
- **Configuración**: propina sugerida (0 = sin sugerencia, 10% por defecto).
- **Registro con código**: ya no usa link; verifica con código, con reenvío (60 s). Si alguien se registró y nunca verificó, al ingresar se le envía un código nuevo.
- **Animaciones**: contadores animados, barras, esqueleto de carga, ondas en botones, confeti al cobrar mesa, progreso en tickets, avisos de pedido modificado/cancelado (con sonido), fondo animado en el login. Respeta "reducir movimiento".

## Móvil (carta.html)
- **Cómo va mi pedido**: franja con estado en vivo (recibido → preparando → listo), aviso y vibración al cambiar.
- **Cancelar / modificar**: solo mientras está "Recibido". Modificar lo devuelve al carrito; cocina ve la marca "Modificado".
- **Cuenta dividida o compartida**: toda la mesa ve la misma cuenta; se puede dividir en partes iguales, solo lo mío o por producto. El botón avisa al mesero con el monto en la nota.
- **Vista previa**: toca un plato → foto grande, descripción, agregados y nota.
- **Propina sugerida**: en la cuenta (0%, sugerida, +5, +10, otro %).

## Cobro parcial (mesa abierta)
1. **Supabase > SQL Editor**: ejecuta `supabase/migracion-cobro-parcial.sql` ANTES de subir los HTML.
2. En el panel, la llamada "Quiere pagar" tiene dos botones: **Cobrar y cerrar mesa** (como antes) y **Cobrar y dejar abierta**.
   El segundo marca como pagado lo pedido hasta ese aviso; si el cliente sigue pidiendo, su próxima cuenta solo suma lo nuevo y muestra "Ya pagado antes".
3. Los tickets cobrados muestran la etiqueta **Pagado**; en Ingresos, "Cobrado" incluye lo pagado aunque la mesa siga abierta.

## Abierto ahora / Local cerrado
1. **Supabase > SQL Editor**: ejecuta `supabase/migracion-local-abierto.sql` ANTES de subir los HTML.
2. En el panel, el indicador de arriba (antes "En vivo") es ahora un botón: **Abierto ahora** / **Local cerrado**. Al cerrar, la carta del cliente muestra un aviso y no deja hacer pedidos nuevos; las mesas abiertas pueden seguir llamando al mesero y viendo su cuenta.

## Filtro de groserías (nombres y notas)
1. **Supabase > SQL Editor**: ejecuta `supabase/migracion-filtro-groserias.sql` ANTES de subir los HTML (es repetible).
2. Sube `filtro.js` junto a `index.html`, `carta.html` y `sw.js` (el panel y la carta lo cargan).
- **Qué revisa**: nombre del negocio, platos (nombre, categoría y descripción), agregados, promociones, mesas, y del lado del cliente la mesa, las notas de cocina y el detalle al llamar al mesero.
- **Qué detecta**: la palabra y todas sus variantes (tula → tulita, tulachi, tulazo…), con mayúsculas, tildes, letras repetidas (`puuuta`), números por letras (`p1c0`), símbolos en medio (`m.i.e.r.d.a`) y letras separadas (`p i c o`). Español (incluido Chile) e inglés.
- **Dos barreras**: el navegador avisa al instante (con el mismo aviso de siempre, la interfaz no cambia) y la base de datos rechaza el texto aunque alguien intente saltarse la página. Lo ya guardado antes no estorba: solo se revisa lo que se escribe o se cambia.
- **"pico"** se bloquea, pero **"pico de gallo"** está permitido.
- **Agregar o quitar palabras**: edita las listas de arriba de `filtro.js` (INICIO = bloquea todo lo que empiece así; CONTIENE = bloquea si aparece en cualquier parte; PERMITIDAS = excepciones, como "shitake" o "carajillo"), corre `node tests/generar-filtro-sql.js` y vuelve a ejecutar el SQL generado. Prueba con `node tests/filtro.js`.

## Mesas sin nombre repetido, boleta de cocina y sonidos
1. **Supabase > SQL Editor**: ejecuta `supabase/migracion-mesas-unicas.sql` (es repetible). Hazlo ANTES de subir `index.html`.
2. Sube `index.html`.
- **Mesas**: no se puede crear (ni renombrar) una mesa con el mismo nombre que otra del local. Compara sin importar mayúsculas, tildes ni espacios de más ("Mesa 5" = "mesa  5"). Las mesas repetidas que ya existían no se tocan.
- **Boleta de cocina** (botón de imprimir de cada pedido): nuevo diseño para impresora de 80 mm con el nombre del local, mesa en recuadro grande, fecha/hora y código del pedido, cantidades destacadas, agregados y notas, aviso "PEDIDO MODIFICADO" y total de ítems.Muestra el precio de cada línea, el subtotal, el descuento de promociones (si hubo) y el TOTAL.
- **Sonidos de alerta**: ahora suenan como campana de cocina. Pedido nuevo = arpegio ascendente; llamada al mesero = "din-don" agudo repetido tres veces; cancelado = tres notas que bajan; modificado = dos toques rápidos. Se ajustan en la función `beep` de `index.html`.

## Boleta que se ajusta sola
La boleta impresa cambia de tamaño según cuántos productos trae: **1 producto** = letra grande y el total abajo del todo; **2–3** = algo más grande; **4–9** = tamaño normal; **10–16** y **17 o más** = cada vez más compacta para que no salga larguísima. El total siempre queda al final. Los tamaños están en las clases `pk-xl`, `pk-l`, `pk-s` y `pk-xs` del bloque `@media print` de `index.html` (`--min` es el alto mínimo en mm de las boletas cortas).
