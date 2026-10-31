/* ==============================================================
   pedidos.js
   Pestaña Pedidos: dibujar tickets, cambiar estados, imprimir comanda.
   Se usa en: index.html (panel del restaurante)
   ============================================================== */

/* ===== PEDIDOS ===== */
const sigOf = o => JSON.stringify(o.items) + '|' + (o.modified_at || '') + '|' + (o.paid_at || '') + '|' + JSON.stringify(o.station_status || {}) + '|' + o.status;
const stOfItem = i => { if (i.station === 'bar' || i.station === 'kitchen') return i.station; const p = (data.products || []).find(x => String(x.id) === String(i.id)); return p && p.station === 'bar' ? 'bar' : 'kitchen'; };
const STN = { pending: 'Nuevo', preparing: 'Preparando', ready: 'Listo' };
function stationChips(o) {                       // si el pedido lleva cocina y barra, muestra cómo va cada una
  const set = [...new Set((o.items || []).map(stOfItem))]; if (set.length < 2 || !STN[o.status]) return '';
  const ss = o.station_status || {};
  return `<div class="stc">${['kitchen', 'bar'].map(k => { const st = ss[k] || o.status; return `<span class="sc-${st}"><i></i>${k === 'bar' ? 'Barra' : 'Cocina'} · ${STN[st] || st}</span>`; }).join('')}</div>`;
}
function ticketHTML(o) {
  const n = (o.items || []).reduce((a, i) => a + Number(i.qty || 0), 0);
  return `<div class="hd"><div><b class="mn">${esc(tn(o))}</b><small>${n} ${n === 1 ? 'ítem' : 'ítems'}${o.modified_at ? '<span class="modb">Modificado</span>' : ''}${o.paid_at ? '<span class="paidb">Pagado</span>' : ''}</small></div><div class="rt"><span class="lt">Atrasado</span><span class="ago"></span></div><button class="prn" type="button" data-print title="Imprimir comanda" aria-label="Imprimir comanda"><svg viewBox="0 0 24 24"><path d="M7 8V3h10v5M7 17H5a1 1 0 01-1-1v-6a1 1 0 011-1h14a1 1 0 011 1v6a1 1 0 01-1 1h-2M7 14h10v7H7z"/></svg></button></div>${stationChips(o)}
  <ul>${(o.items || []).map(i => `<li><b>${esc(i.qty)}×</b><span>${esc(i.name)}</span>${(i.addons || []).map(a => `<span class="nt ad">+ ${esc(a.name)}</span>`).join('')}${i.promo ? `<span class="nt">${esc(i.promo)}</span>` : ''}${i.note ? `<span class="nt">${esc(i.note)}</span>` : ''}</li>`).join('')}</ul><button class="go"></button>`;
}
function renderOrders() {
  const g0 = $('#grid'); if (g0.hasAttribute('data-loading')) { g0.removeAttribute('data-loading'); g0.querySelectorAll('.sk').forEach(x => x.remove()); }
  const ids = new Set(data.orders.map(o => o.id)), fresh = [];
  [...data.orders].sort((a, b) => new Date(a.created_at) - new Date(b.created_at)).forEach((o, i) => {
    let el = map.get(o.id);
    if (!el) {
      el = document.createElement('article'); el.className = 'tk'; el.dataset.id = o.id; el.innerHTML = ticketHTML(o); map.set(o.id, el); $('#grid').appendChild(el);
      el._sg = sigOf(o); if (!seen) el.style.animationDelay = Math.min(i, 8) * 45 + 'ms';
      if (seen && o.status === 'pending') { fresh.push(o); el.classList.add('nuevo'); }
    } else if (el.dataset.st && el.dataset.st !== o.status) { el.classList.remove('nuevo', 'moved'); void el.offsetWidth; el.classList.add('moved'); }
    const sg = sigOf(o);
    if (el._sg !== sg) { el._sg = sg; el.innerHTML = ticketHTML(o); el.classList.remove('flash'); void el.offsetWidth; el.classList.add('flash'); }   // el cliente modificó el pedido
    el._mod = o.modified_at || '';
    el.classList.remove('pending', 'preparing', 'ready'); el.classList.add(o.status);
    el.dataset.st = o.status; el._t = o.created_at;
    const g = el.querySelector('.go'); g.textContent = o.status === 'ready' && o.paid_at ? 'Cerrar mesa' : LBL[o.status][0]; g.dataset.to = LBL[o.status][1]; g.disabled = false;
    el.style.order = i; el.hidden = (sf && o.status !== sf) || (mf && tn(o) !== mf);
  });
  for (const [id, el] of map) if (!ids.has(id)) { el.classList.add('leave'); setTimeout(() => el.remove(), 300); map.delete(id); }
  seen = ids; tick(); counts(); mesas(); orderEmpty();
  if (fresh.length) alertNew(fresh);
}
function tick() {
  for (const el of map.values()) {
    const m = mins(el._t);
    el.querySelector('.ago').textContent = m < 1 ? 'Recién' : m + ' min';
    const open = el.dataset.st !== 'ready'; el.classList.toggle('late', open && m >= 20);
    el.classList.remove('d-g', 'd-y', 'd-r'); if (open) el.classList.add(m >= 20 ? 'd-r' : m >= 10 ? 'd-y' : 'd-g');   // demora: verde < 10 min, amarillo 10-19, rojo 20 o más
  }
}
function counts() {
  const c = { '': data.orders.length, pending: 0, preparing: 0, ready: 0 }; data.orders.forEach(o => c[o.status]++);
  $$('#seg button').forEach(b => b.querySelector('b').textContent = c[b.dataset.f]);
  const cn = $('#cnt'), pv = cn.dataset.v; cn.textContent = c.pending || ''; cn.dataset.v = c.pending;
  if (String(pv) !== String(c.pending) && c.pending) { cn.classList.remove('bump'); void cn.offsetWidth; cn.classList.add('bump'); }
}
function mesas() {
  const nums = [...new Set(data.orders.map(tn))].sort((a, b) => a.localeCompare(b, 'es', { numeric: true }));
  if (mf && !nums.includes(mf)) mf = '';
  $('#mesa').innerHTML = '<option value="">Todas las mesas</option>' + nums.map(n => `<option value="${esc(n)}"${n === mf ? ' selected' : ''}>${esc(n)}</option>`).join('');
}
$('#mesa').onchange = e => { mf = e.target.value; renderOrders(); };
$('#seg').onclick = e => { const b = e.target.closest('button'); if (!b) return; sf = b.dataset.f; $$('#seg button').forEach(x => x.classList.toggle('on', x === b)); renderOrders(); };
function printTicket(o) {                         // boleta del pedido: detalle para cocina con precios y total
  const hora = new Date(o.created_at).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' });
  const fecha = new Date(o.created_at).toLocaleDateString('es-CL', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const n = (o.items || []).reduce((a, i) => a + Number(i.qty || 0), 0);
  const items = (o.items || []).map(i => {
    const q = Number(i.qty || 0), adds = (i.addons || []).map(a => `<small>+ ${esc(a.name)}${Number(a.price) > 0 ? `<b>${clp(a.price)}</b>` : ''}</small>`).join('');
    const unit = q > 1 ? `<small class="pk-u">${esc(q)} × ${clp(i.price || 0)}</small>` : '';
    return `<div class="pk-it"><span class="pk-q">${esc(i.qty)}×</span><span class="pk-n">${esc(i.name)}${unit}${adds}${i.promo ? `<small>${esc(i.promo)}</small>` : ''}${i.note ? `<small class="pk-note">» ${esc(i.note)}</small>` : ''}</span><span class="pk-p">${clp(oUnit(i) * q)}</span></div>`;
  }).join('');
  const gross = oGross(o), total = oTotal(o), desc = Math.round(gross - total);
  const sums = (desc > 0 ? `<div class="pk-sum"><span>Subtotal</span><span>${clp(gross)}</span></div><div class="pk-sum"><span>Descuento promociones</span><span>−${clp(desc)}</span></div>` : '') + `<div class="pk-tot"><span>TOTAL</span><span>${clp(total)}</span></div>`;
  const lines = (o.items || []).length, rows = (o.items || []).reduce((a, i) => a + 1 + (i.addons || []).length + (i.promo ? 1 : 0) + (i.note ? 1 : 0), 0);
  let tier = lines <= 1 ? 'pk-xl' : lines <= 3 ? 'pk-l' : lines <= 9 ? '' : lines <= 16 ? 'pk-s' : 'pk-xs';
  if (tier === 'pk-xl' && rows > 7) tier = 'pk-l';          // un solo producto pero con muchos agregados/notas: no se agranda tanto
  $('#printArea').innerHTML = `<div class="pk-sheet ${tier}"><div class="pk-biz">${esc(R ? R.name : '')}</div><div class="pk-mesa">${esc(tn(o))}</div><div class="pk-meta"><span>${esc(fecha)} · ${esc(hora)}</span><span>#${esc(String(o.id).slice(-4).toUpperCase())}</span></div>${o.modified_at ? '<div class="pk-mod">PEDIDO MODIFICADO</div>' : ''}<hr class="pk-sep"><div class="pk-items">${items}</div><div class="pk-bottom">${sums}<div class="pk-ft">${n} ${n === 1 ? 'ítem' : 'ítems'}</div></div></div>`;
  window.print();
}
$('#grid').addEventListener('click', async e => {
  const pb = e.target.closest('[data-print]');
  if (pb) { const o = data.orders.find(x => String(x.id) === pb.closest('.tk').dataset.id); if (o) printTicket(o); return; }
  const b = e.target.closest('.go'); if (!b) return; b.disabled = true;
  const id = b.closest('.tk').dataset.id;
  if (b.dataset.to === 'completed') {
    const o = data.orders.find(x => String(x.id) === id); if (!o) { b.disabled = false; return; }
    if (!(await closeTableUI(o.table_id, tn(o)))) { b.disabled = false; return; }
  } else await api.setStatus(pid(id), b.dataset.to);
  await refresh();
});
