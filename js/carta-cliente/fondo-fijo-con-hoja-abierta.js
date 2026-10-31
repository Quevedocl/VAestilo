/* ==============================================================
   fondo-fijo-con-hoja-abierta.js
   El fondo no se mueve mientras hay una hoja abierta.
   Se usa en: carta.html (carta que ve el cliente)
   ============================================================== */

/* ===== el fondo no se mueve mientras hay una hoja abierta ===== */
(function () {
  let y = 0, on = false;
  const sync = () => {
    const want = !!document.querySelector('dialog[open]'), de = document.documentElement;
    if (want && !on) { y = window.scrollY; de.classList.add('lk'); on = true; }
    else if (!want && on) { de.classList.remove('lk'); on = false; window.scrollTo({ top: y, behavior: 'instant' }); }
  };
  new MutationObserver(sync).observe(document.body, { subtree: true, attributes: true, attributeFilter: ['open'] });
  document.addEventListener('touchmove', e => {                     // iPhone: bloquea el arrastre salvo dentro de una lista que sí se desplaza
    const d = document.querySelector('dialog[open]'); if (!d) return;
    for (let el = e.target; el && el.nodeType === 1; el = el.parentNode) {
      if (el.scrollHeight > el.clientHeight + 1 && /(auto|scroll)/.test(getComputedStyle(el).overflowY)) return;
      if (el === d) break;
    }
    e.preventDefault();
  }, { passive: false });
})();

const sb = window.supabase && CFG.url ? supabase.createClient(CFG.url, CFG.key) : null;
let CART_KEY = 'carta-pedido-v1';

/* mesa: viene del QR (?mesa=5); si no, se la pedimos al enviar */
const QS = new URLSearchParams(location.search), SLUG = (QS.get('r') || '').trim(), TID_Q = (QS.get('t') || '').trim();
let mesa = '', lastMesa = '', promos = [];

let products = [], addons = [], addonsOk = true, cart = new Map(), editing = null;
const find = id => products.find(p => String(p.id) === String(id));
const addonsFor = p => addons.filter(a => a.is_available && (a.product_id ? String(a.product_id) === String(p.id) : a.category === p.category));
const keyOf = (id, ads) => id + '|' + ads.map(a => a.id).sort().join(',');
const unit = l => l.price + l.addons.reduce((a, x) => a + x.price, 0);
