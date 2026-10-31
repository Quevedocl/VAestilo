/* ==============================================================
   dibujar-pedidos.js
   Dibuja los tickets de pedido y los filtros.
   Se usa en: cocina.html (pantalla de cocina y barra)
   ============================================================== */

function ticket(o) {
  const n = (o.items || []).reduce((a, i) => a + Number(i.qty || 0), 0), cx = o.status === 'cancelled';
  const li = (o.items || []).map(i => `<li><b>${esc(i.qty)}×</b><span>${esc(i.name)}</span>${(i.addons || []).map(a => `<span class="nt ad">+ ${esc(a)}</span>`).join('')}${i.promo ? `<span class="nt">${esc(i.promo)}</span>` : ''}${i.note ? `<span class="nt">${esc(i.note)}</span>` : ''}</li>`).join('');
  const act = { pending: `<button class="go" data-id="${o.id}" data-to="preparing">Marcar en preparación</button>`, preparing: `<button class="go" data-id="${o.id}" data-to="ready">Pedido listo</button><button class="back" data-id="${o.id}" data-to="pending">↩ Volver a nuevos</button>`, ready: `<button class="back" data-id="${o.id}" data-to="preparing">↩ Volver a preparando</button>`, cancelled: `<button class="go" data-x="${o.id}">Entendido</button>` }[o.status] || '';
  const cls = `tk ${o.status}${dClass(o)}${(o.items || []).length >= 8 ? ' big' : ''}${openSet.has(o.id) ? ' open' : ''}${fresh.has(o.id) ? ' fresh' : !shown.has(o.id) ? ' enter' : ''}`;
  return `<article class="${cls}" data-id="${o.id}"><div class="hd"><div><b class="mn">${esc(o.table_name)}</b><small>${n} ${n === 1 ? 'ítem' : 'ítems'}${o.status === 'ready' && !openSet.has(o.id) ? ' · toca para ver' : ''}${cx ? '<span class="canb">CANCELADO · no preparar</span>' : o.modified_at ? '<span class="modb">Modificado</span>' : ''}</small></div>${cx ? '' : `<div class="rt"><span class="lt">Atrasado</span><span class="ago">${agoTxt(mins(o.created_at))}</span></div>`}</div><ul>${li}</ul>${act}</article>`;
}
function visible() { return rows.filter(o => !(o.status === 'cancelled' && dismissed.has(o.id))); }
function render() {
  const all = visible(), c = { '': all.length, pending: 0, preparing: 0, ready: 0 }; all.forEach(o => { if (c[o.status] !== undefined) c[o.status]++; });
  document.querySelectorAll('#seg button').forEach(b => b.querySelector('b').textContent = c[b.dataset.f]);
  const nums = [...new Set(all.map(o => o.table_name))].sort((a, b) => a.localeCompare(b, 'es', { numeric: true })); if (mf && !nums.includes(mf)) mf = '';
  const opts = '<option value="">Todas las mesas</option>' + nums.map(n => `<option value="${esc(n)}"${n === mf ? ' selected' : ''}>${esc(n)}</option>`).join('');
  if ($('#mesa').innerHTML !== opts) $('#mesa').innerHTML = opts;
  const list = all.filter(o => (!sf || o.status === sf || (sf === 'pending' && o.status === 'cancelled')) && (!mf || o.table_name === mf));
  const rk = { cancelled: 0, pending: 1, preparing: 2, ready: 3 };
  list.sort((a, b) => (rk[a.status] ?? 9) - (rk[b.status] ?? 9) || new Date(a.created_at) - new Date(b.created_at));
  // Resumen: cuántas unidades de cada producto hay por preparar (nuevos + en preparación), sin importar el filtro
  const tot = new Map(); all.forEach(o => { if (o.status === 'pending' || o.status === 'preparing') (o.items || []).forEach(i => tot.set(i.name, (tot.get(i.name) || 0) + Number(i.qty || 0))); });
  const top = [...tot].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'es'));
  const sh = top.length && all.filter(o => o.status === 'pending' || o.status === 'preparing').length > 1 ? `<i>Por preparar</i>${top.map(([nm, q]) => `<span><b>${q}×</b> ${esc(nm)}</span>`).join('')}<em>${top.length > 6 ? 'ver todo ▾' : ''}</em>` : '';
  if (sh !== lastSum) { $('#sum').innerHTML = sh; $('#sum').hidden = !sh; lastSum = sh; }
  const html = list.length ? list.map(ticket).join('') : `<p class="empty">${all.length ? 'No hay pedidos en esta vista' : 'Todo tranquilo por ahora · ' + NAME}</p>`;
  if (html !== lastHtml) { $('#grid').innerHTML = html; lastHtml = html; }
  list.forEach(o => shown.add(o.id));
}
