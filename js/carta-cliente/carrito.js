/* ==============================================================
   carrito.js
   Carrito de compras (se recuerda si recargan la página).
   Se usa en: carta.html (carta que ve el cliente)
   ============================================================== */

/* ===== carrito (se recuerda si recargan la página) ===== */
function saveCart() { if (editing) return; try { localStorage.setItem(CART_KEY, JSON.stringify([...cart.values()])); } catch (e) {} }
function loadCart() {
  try {
    (JSON.parse(localStorage.getItem(CART_KEY)) || []).forEach(l => {
      l.addons = Array.isArray(l.addons) ? l.addons : []; l.id = String(l.id); l.key = keyOf(l.id, l.addons); l.note = l.note || '';
      cart.set(l.key, l);
    });
  } catch (e) {}
}
const count = () => [...cart.values()].reduce((a, l) => a + l.qty, 0);
const qtyOf = id => [...cart.values()].filter(l => l.id === String(id)).reduce((a, l) => a + l.qty, 0);
const live = x => x.is_active && (!x.ends_on || x.ends_on >= new Date().toISOString().slice(0, 10));
const promoFor = id => promos.find(x => live(x) && x.type !== 'info' && String(x.product_id) === String(id));
/* descuentos por producto (la promo mira la cantidad total del producto, aunque esté en varias líneas con distintos agregados) */
function discounts() {
  const g = new Map(), out = new Map();
  for (const l of cart.values()) { const o = g.get(l.id) || { qty: 0, price: l.price }; o.qty += l.qty; g.set(l.id, o); }
  for (const [id, o] of g) {
    const x = promoFor(id); if (!x) continue; let d = 0;
    if (x.type === 'nxm') d = Math.floor(o.qty / x.buy_qty) * (x.buy_qty - x.pay_qty) * o.price;
    else if (x.type === 'percent') d = Math.round(o.qty * o.price * x.value / 100);
    else if (x.type === 'price') d = Math.max(0, o.price - x.value) * o.qty;
    if (d > 0) out.set(id, { d, title: x.title });
  }
  return out;
}
const total = () => [...cart.values()].reduce((a, l) => a + unit(l) * l.qty, 0) - [...discounts().values()].reduce((a, x) => a + x.d, 0);
const badge = p => { const x = promoFor(p.id); return x ? `<span class="tag">${esc(x.title)}</span>` : ''; };
const promoBox = () => { const l = promos.filter(live); return l.length ? `<div class="promos"><h2 class="ph2">Promociones</h2><div class="lst">${l.map(x => `<div class="pm">${esc(x.title)}</div>`).join('')}</div></div>` : ''; };

/* quita del pedido lo que ya no existe o se agotó, y actualiza precios; devuelve los nombres quitados */
function prune() {
  const gone = [], next = new Map();
  for (const l of cart.values()) {
    const p = find(l.id);
    if (!p || !p.is_available) { gone.push(l.name); continue; }
    if (addonsOk) {
      const avail = new Map(addonsFor(p).map(a => [String(a.id), a])), ads = [];
      for (const a of l.addons) { const cur = avail.get(String(a.id)); if (cur) ads.push({ id: cur.id, name: cur.name, price: Number(cur.price) }); else gone.push(a.name + ' (' + l.name + ')'); }
      l.addons = ads;
    }
    l.price = Number(p.price); l.name = p.name; l.key = keyOf(l.id, l.addons);
    const ex = next.get(l.key); if (ex) ex.qty = Math.min(MAX_QTY, ex.qty + l.qty); else next.set(l.key, l);
  }
  cart = next;
  if (gone.length) saveCart();
  return gone;
}
