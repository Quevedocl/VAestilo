/* ==============================================================
   carta.js
   Dibuja la carta: categorías y platos.
   Se usa en: carta.html (carta que ve el cliente)
   ============================================================== */

/* ===== carta ===== */
const ctl = p => {
  if (locked) return '';
  if (!p.is_available) return '<span class="ag">Agotado</span>';
  if (addonsFor(p).length) { const n = qtyOf(p.id); return `<button class="add" data-a="opt" aria-label="Elegir opciones de ${esc(p.name)}">+${n ? `<span class="cnt">${n}</span>` : ''}</button>`; }
  const l = cart.get(p.id + '|');
  return l
    ? `<div class="stp"><button data-a="dec" aria-label="Quitar uno de ${esc(p.name)}">−</button><b>${l.qty}</b><button data-a="inc" aria-label="Agregar uno de ${esc(p.name)}">+</button></div>`
    : `<button class="add" data-a="inc" aria-label="Agregar ${esc(p.name)}">+</button>`;
};

/* ===== carta organizada: grupos (comida / tragos y cervezas / sin alcohol) → categorías plegables + buscador ===== */
const GRP = [{ id: 'food', t: 'Comida' }, { id: 'alc', t: 'Tragos' }, { id: 'soft', t: 'Bebidas' }];
const SOFT_NOW = /sin alcohol|mocktail/, ALC_CAT = /cerveza|botellin|schop|vino|trago|coctel|cocktail|mojito|sour|spritz|sangria|licor|destilad|shot|espumante|cachaza|tequila|pisco|vodka|whisk|\bgin\b|\bron\b|alcohol/;
const SOFT_CAT = /\b(jugos?|bebidas?|limonadas?|gaseosas?|aguas?|cafes?|tes?|infusion(es)?|batidos?|smoothies?)\b/;
const ALC_WORDS = /\b(gin|ron|vodka|whisk(e)?y|tequila|pisco|cachaza|mezcal|cerveza|schop|vino|espumante|licor|bourbon|cognac|aperol|ramazzotti|mistral|campari|fernet|jagermeister|corona|heineken|kunstmann|austral|cortos?)\b/;
const RANK = {   // orden lógico dentro de cada grupo (lo no listado va al medio, por antigüedad y luego A-Z)
  food: [[/entrada|picoteo|tapas|compartir|aperitivo/, 0], [/ceviche/, 1], [/papas|frita/, 2], [/hambur|burger/, 3], [/sandwich|completo|churrasco|lomo/, 4], [/quesadilla|taco|wrap|empanada/, 5], [/pasta|plato|fondo|parrilla|carne|pollo|pescado|arroz/, 5.5], [/pizza/, 6], [/postre|helado|torta|dulce/, 9]],
  alc: [[/promo/, -1], [/autor/, 0], [/coctel|cocktail/, 1], [/sour/, 2], [/mojito/, 3], [/spritz/, 4], [/cerveza|schop/, 5], [/botellin/, 5.5], [/sangria/, 6], [/destilad/, 8], [/licor|shot/, 9]],
  soft: [[/jugo|bebida/, 0], [/mocktail/, 1]]
};
const rankOf = (g, c) => { const k = norm(c), r = RANK[g].find(x => x[0].test(k)); return r ? r[1] : 7; };
function groupOf(c, items) {
  const k = norm(c);
  if (SOFT_NOW.test(k)) return 'soft';
  if (ALC_CAT.test(k)) return 'alc';
  if (SOFT_CAT.test(k)) return 'soft';
  const bar = items.filter(p => p.station === 'bar');
  if (bar.length * 2 >= items.length) return items.filter(p => ALC_WORDS.test(norm(p.name + ' ' + (p.description || '')))).length >= items.length * .3 ? 'alc' : 'soft';
  return 'food';
}
function layout() {       // los "agregados extra" ya no se muestran como platos: aparecen al pedir el plato al que acompañan
  const by = new Map(); products.filter(p => !isExtra(p)).forEach(p => { if (!by.has(p.category)) by.set(p.category, []); by.get(p.category).push(p); });
  const out = { food: [], alc: [], soft: [] };
  by.forEach((items, c) => out[groupOf(c, items)].push({ c, items, t: Math.min(...items.map(p => +new Date(p.created_at || 0))) }));
  GRP.forEach(g => out[g.id].sort((a, b) => rankOf(g.id, a.c) - rankOf(g.id, b.c) || a.t - b.t || a.c.localeCompare(b.c, 'es', { numeric: true })));
  return out;
}
const rowHtml = p => `<article class="it${p.is_available ? '' : ' off'}" data-id="${esc(p.id)}">
      <div class="ph" data-open style="${p.image_url ? `background-image:url('${esc(p.image_url)}')` : ''}">${p.image_url ? '' : esc((p.name || '?')[0])}</div>
      <div class="nm" data-open role="button" tabindex="0"><b>${esc(p.name)}</b>${p.description ? `<div class="ds">${esc(p.description)}</div>` : ''}<span class="pr">${clp(p.price)}</span>${addonsFor(p).length ? '<span class="tag ex">+ extras</span>' : ''}${badge(p)}</div>
      <div class="ctl">${ctl(p)}</div></article>`;
let grp = '', q = '', openCats = new Set(), seeded = new Set();
function render() {
  const L = layout(), have = GRP.filter(g => L[g.id].length);
  if (!have.length) { $('#menu').innerHTML = '<p class="msg">La carta aún no tiene productos.</p>'; $('#chips').innerHTML = ''; $('#srch').hidden = true; return; }
  $('#srch').hidden = false;
  if (!grp || !have.some(g => g.id === grp)) grp = have[0].id;
  const term = norm(q).trim(), searching = term.length >= 2;
  $('#chips').innerHTML = have.length > 1 ? have.map(g => `<button data-g="${g.id}" class="${!searching && g.id === grp ? 'on' : ''}">${g.t}<small>${L[g.id].reduce((n, x) => n + x.items.length, 0)}</small></button>`).join('') : '';
  if (!seeded.has(grp)) { seeded.add(grp); L[grp].slice(0, L[grp].length <= 2 ? 2 : 1).forEach(x => openCats.add(x.c)); }   // se abre la primera categoría; el resto, plegado
  let secs;
  if (searching) { secs = []; GRP.forEach(g => L[g.id].forEach(x => { const m = x.items.filter(p => norm(p.name + ' ' + (p.description || '') + ' ' + p.category).includes(term)); if (m.length) secs.push({ c: x.c, items: m }); })); }
  else secs = L[grp];
  const sec = x => { const open = searching || openCats.has(x.c); return `<div class="cat${open ? ' open' : ''}" data-c="${esc(x.c)}"><button class="cat-h" type="button" aria-expanded="${open}"><span class="ct">${esc(x.c)}</span><span class="cn">${x.items.length}</span><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 9l6 6 6-6"/></svg></button><div class="cb"><div class="lst">${x.items.map(rowHtml).join('')}</div></div></div>`; };
  const nFound = secs.reduce((n, x) => n + x.items.length, 0);
  $('#menu').innerHTML = (searching ? `<p class="found">${nFound} ${nFound === 1 ? 'resultado' : 'resultados'} para “${esc(q.trim())}”</p>` : promoBox()) + (secs.length ? secs.map(sec).join('') : `<p class="msg">No encontramos “${esc(q.trim())}”.<br>Prueba con otra palabra.</p>`);
}

function refreshCtl(id) {
  const row = [...document.querySelectorAll('.it')].find(r => r.dataset.id === String(id)), p = find(id);
  if (row && p) row.querySelector('.ctl').innerHTML = ctl(p);
}

function bar() {
  const n = count();
  $('#bar').hidden = n === 0;
  $('#bn').textContent = n; $('#bt').textContent = clp(total());
  $('#bl').textContent = editing ? 'Guardar cambios' : 'Ver pedido';
}
function bump() { const b = $('#bar'); b.classList.remove('bump'); void b.offsetWidth; b.classList.add('bump'); }
function afterCart(id, up) { if (!cart.size) { recAsked = false; xtraAsked.clear(); } saveCart(); refreshCtl(id); bar(); if (up) bump(); if ($('#cart').open) renderCart(); }

function change(key, d) {
  if (locked) return;
  let l = cart.get(key);
  if (!l) {
    if (d <= 0) return;
    const id = key.split('|')[0], p = find(id); if (!p || !p.is_available) return;
    l = { key, id, name: p.name, price: Number(p.price), qty: 0, note: '', addons: [] };
  }
  if (editing && d < 0 && l.qty === 1 && cart.size === 1) { toast('Si ya no quieres nada, cancela el pedido.'); return; }
  l.qty = Math.min(MAX_QTY, l.qty + d);
  if (l.qty <= 0) cart.delete(key); else cart.set(key, l);
  afterCart(l.id, d > 0);
}
function addLine(p, ads, qty, note) {
  const key = keyOf(String(p.id), ads), ex = cart.get(key);
  if (ex) { ex.qty = Math.min(MAX_QTY, ex.qty + qty); if (note) ex.note = note; }
  else cart.set(key, { key, id: String(p.id), name: p.name, price: Number(p.price), qty: Math.min(MAX_QTY, qty), note: note || '', addons: ads });
  afterCart(p.id, true);
}

$('#menu').addEventListener('click', e => {
  const hd = e.target.closest('.cat-h'); if (hd) { const s = hd.closest('.cat'), on = s.classList.toggle('open'); on ? openCats.add(s.dataset.c) : openCats.delete(s.dataset.c); hd.setAttribute('aria-expanded', on); return; }
  const row = e.target.closest('.it'); if (!row) return; const id = row.dataset.id;
  const b = e.target.closest('[data-a]');
  if (b) { if (b.dataset.a === 'opt') openProd(id); else { const inc = b.dataset.a === 'inc', had = cart.has(id + '|'); change(id + '|', inc ? 1 : -1); if (inc && !had && cart.has(id + '|')) offerExtras(find(id)); } return; }
  if (e.target.closest('[data-open]')) openProd(id);
});
$('#menu').addEventListener('keydown', e => { if (e.key === 'Enter' && e.target.matches('.nm[data-open]')) openProd(e.target.closest('.it').dataset.id); });
$('#chips').addEventListener('click', e => {
  const b = e.target.closest('button'); if (!b) return;
  grp = b.dataset.g; q = ''; $('#q').value = ''; render();
  $('#menu').scrollIntoView({ behavior: 'smooth', block: 'start' });
  const on = document.querySelector('#chips button.on'); if (on) on.scrollIntoView({ inline: 'center', block: 'nearest' });
});
let qt; $('#q').addEventListener('input', e => { clearTimeout(qt); qt = setTimeout(() => { q = e.target.value; render(); }, 140); });
