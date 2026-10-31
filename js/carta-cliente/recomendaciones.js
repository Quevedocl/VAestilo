/* ==============================================================
   recomendaciones.js
   Recomendaciones automáticas al pagar.
   Se usa en: carta.html (carta que ve el cliente)
   ============================================================== */

/* ===== recomendaciones automáticas =====
   · Al pedir un plato: si el local cargó sus extras como productos (categoría "Agregados extra"), se le ofrece al cliente el extra que va con ese plato.
   · Antes de pagar: se sugiere algo más barato que lo que ya pidió (siempre se respetan los productos marcados como "Recomendar al pagar"). */
const norm = s => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
const isExtra = p => /agregad|extra|adicional|complement/.test(norm(p.category));
const DISH = /hamburg|burger|sandwich|churrasc|lomito|completo|barros|chorrillana|pizza|tabla|wrap|pasta|ensalada|bowl|plato|pollo|carne|salmon|pescado|empanada|nacho|papa|frita|alita|taco|arroz|parrilla/;
const EX_RULES = [                     // qué extra acompaña a qué plato (se compara por nombre, sin tildes)
  { ex: /hamburg|burger|tocino|bacon|queso|cheese|huevo|palta|cebolla|carne|pollo/, dish: /hamburg|burger|sandwich|churrasc|lomito|completo|barros|chorrillana|wrap/ },
  { ex: /salsa|aderezo|mayo|ketchup|mostaza|alioli|guacamole|pebre|aji/, dish: /hamburg|burger|papa|frita|pizza|sandwich|nacho|empanada|alita|tabla|completo|wrap|taco/ },
  { ex: /proteina/, dish: /ensalada|bowl|pasta|arroz|plato|wrap|pizza/ },
  { ex: /vegetal|verdura|champi|aceituna|pimenton/, dish: /hamburg|burger|ensalada|bowl|pizza|sandwich|wrap|pasta|completo/ }
];
function extrasFor(p) {
  if (isExtra(p) || p.station === 'bar' || addonsFor(p).length) return [];
  const t = norm(p.name + ' ' + p.category);
  return products.filter(x => {
    if (!isExtra(x) || !x.is_available || !(Number(x.price) > 0) || x.station === 'bar') return false;
    const r = EX_RULES.find(r => r.ex.test(norm(x.name)));
    return r ? r.dish.test(t) : DISH.test(t);
  });
}
function recList(ctx) {
  const inCart = new Set([...cart.values()].map(l => String(l.id))), names = new Set(), prices = [];
  [...cart.values()].forEach(l => { names.add(norm(l.name)); prices.push(unit(l)); });
  if (ctx === 'bill') billData().lines.forEach(l => { names.add(norm(l.name)); prices.push(l.gross); });
  const taken = p => inCart.has(String(p.id)) || names.has(norm(p.name));
  const base = products.filter(p => p.is_available && !taken(p));
  const marked = base.filter(p => p.recommended);
  if (ctx !== 'bill') return marked.slice(0, 3);
  if (marked.length >= 3) return marked.slice(0, 3);
  const avg = prices.length ? prices.reduce((a, b) => a + b, 0) / prices.length : 0;
  const catsDone = new Set(products.filter(taken).map(p => p.category));
  const cand = base.filter(p => !p.recommended && !isExtra(p) && Number(p.price) > 0);
  let pool = cand.filter(p => !avg || Number(p.price) < avg * .85);      // claramente más barato que lo que ya pidió
  if (pool.length < 2) pool = cand.filter(p => !avg || Number(p.price) < avg);
  if (!pool.length) pool = [...cand].sort((a, b) => a.price - b.price).slice(0, 6);
  const score = p => (p.station === 'bar' ? 0 : 2) + (catsDone.has(p.category) ? 0 : 1);   // comida primero, y de una categoría nueva
  pool.sort((a, b) => score(b) - score(a) || Math.abs(a.price - avg * .5) - Math.abs(b.price - avg * .5));
  return marked.concat(pool).slice(0, 3);
}
const xtraAsked = new Set();
async function offerExtras(p) {
  if (!p || locked || CLOSED || editing || recState || xtraAsked.has(String(p.id))) return;
  const list = extrasFor(p).slice(0, 4); if (!list.length) return;
  xtraAsked.add(String(p.id));
  await askRec('extra', { list, para: p, title: `¿Quieres agregar algo extra a tu ${p.name}?`, cap: 'Extras que van muy bien con este plato:' });
}
let recState = null, recAsked = false, recBillAsked = false;
/* 'none' (no hay nada que recomendar) | 'skip' (no, gracias) | 'added' (agregó algo) | 'cancel' (cerró la ventana) */
function askRec(ctx, opt) {
  if (locked || CLOSED) return Promise.resolve('none');
  const list = (opt && opt.list) || recList(ctx); if (!list.length) return Promise.resolve('none');
  return new Promise(res => {
    recState = { res, how: '', added: new Set(), ctx, para: opt && opt.para };
    $('#recT').textContent = opt && opt.title ? opt.title : list.length === 1 ? `¿Desea agregar ${list[0].name}?` : '¿Desea agregar algo más?';
    $('#recBody').innerHTML = `<p class="rcap">${opt && opt.cap ? opt.cap : ctx === 'bill' ? 'Antes de pagar, te recomendamos:' : 'Te recomendamos para acompañar tu pedido:'}</p><div class="lst">${list.map(p => `<article class="it" data-rid="${esc(p.id)}">
      <div class="ph" style="${p.image_url ? `background-image:url('${esc(p.image_url)}')` : ''}">${p.image_url ? '' : esc((p.name || '?')[0])}</div>
      <div class="nm"><b>${esc(p.name)}</b>${p.description ? `<div class="ds">${esc(p.description)}</div>` : ''}<span class="pr">${clp(p.price)}</span></div>
      <div class="ctl"><button class="rb" type="button" data-rec="${esc(p.id)}">Agregar</button></div></article>`).join('')}</div>`;
    updRec(); $('#recBody').scrollTop = 0; $('#rec').showModal();
  });
}
function updRec() { if (recState) $('#recNo').textContent = recState.ctx === 'extra' ? (recState.added.size ? 'Listo' : 'No, gracias') : recState.added.size ? 'Listo · revisar mi pedido' : recState.ctx === 'bill' ? 'No, gracias · avisar para pagar' : 'No, gracias · enviar pedido'; }
$('#rec').addEventListener('close', () => { if (!recState) return; const r = recState; recState = null; r.res(r.how || 'cancel'); });
$('#recClose').onclick = () => $('#rec').close();
$('#recNo').onclick = () => { if (!recState) return; recState.how = recState.added.size ? 'added' : 'skip'; $('#rec').close(); };
$('#recBody').addEventListener('click', e => {
  const b = e.target.closest('[data-rec]'); if (!b || !recState) return; const p = find(b.dataset.rec); if (!p) return;
  if (recState.added.has(String(p.id))) { recState.added.delete(String(p.id)); change(keyOf(String(p.id), []), -1); b.classList.remove('on'); b.textContent = 'Agregar'; }
  else if (p.is_available) { recState.added.add(String(p.id)); addLine(p, [], 1, recState.ctx === 'extra' && recState.para ? ('Para: ' + recState.para.name).slice(0, 80) : ''); b.classList.add('on'); b.textContent = '✓ Agregado'; }
  updRec();
});
