/* ==============================================================
   mis-pedidos.js
   Mis pedidos de esta mesa: seguimiento en vivo, cancelar y modificar.
   Se usa en: carta.html (carta que ve el cliente)
   ============================================================== */

/* ===== mis pedidos de esta mesa: seguimiento en vivo, cancelar y modificar ===== */
const MINE_KEY = () => 'carta-mios-' + TID;
let mine = new Set(), acct = [], acctSig = '', prevSt = new Map(), cancelAsk = null;
function loadMine() { try { mine = new Set((JSON.parse(localStorage.getItem(MINE_KEY())) || []).filter(x => x.s === pinned).map(x => x.p)); } catch (e) { mine = new Set(); } }
function rememberOrder(p) {
  mine.add(p);
  try { const a = (JSON.parse(localStorage.getItem(MINE_KEY())) || []).filter(x => x.s === pinned); a.push({ p, s: pinned, t: Date.now() }); localStorage.setItem(MINE_KEY(), JSON.stringify(a)); } catch (e) {}
}
const SVG = d => `<svg viewBox="0 0 24 24">${d}</svg>`;
const IC = {
  pending: SVG('<path d="M6 3h12v18l-3-2-3 2-3-2-3 2zM9 8h6M9 12h6"/>'),
  preparing: SVG('<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>'),
  ready: SVG('<circle cx="12" cy="12" r="9"/><path d="M8 12.5l2.7 2.7L16 9.5"/>'),
  table: SVG('<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="3.5"/>'),
};
const TXT = {
  pending: [IC.pending, 'Pedido recibido', 'Esperando que cocina lo tome'],
  preparing: [IC.preparing, 'Se está preparando', 'Ya está en cocina'],
  ready: [IC.ready, 'Tu pedido está listo', 'Un mesero lo lleva a tu mesa'],
};
const STEP = { pending: 1, preparing: 2, ready: 3 };

function notifyStatus(o) {
  const m = { preparing: 'Tu pedido empezó a prepararse', ready: 'Tu pedido está listo' }[o.status];
  if (!m) return; toast(m);
  try { if (navigator.vibrate) navigator.vibrate(o.status === 'ready' ? [120, 60, 120] : 60); } catch (e) {}
}
async function refreshAccount(force) {
  if (!sb || !TID || !pinned || locked) return;
  const { data, error } = await sb.rpc('table_account', { p_table: TID, p_session: pinned });
  if (error) return;                                       // sin red o falta la migración: no se muestra el seguimiento
  const list = data || [];
  for (const o of list) { const was = prevSt.get(o.public_id); if (was && was !== o.status && mine.has(o.public_id)) notifyStatus(o); }
  prevSt = new Map(list.map(o => [o.public_id, o.status]));
  const sig = JSON.stringify(list.map(o => [o.public_id, o.status, o.total, o.modified_at, o.paid_at]));
  const changed = sig !== acctSig; acct = list; acctSig = sig;
  if (changed || force) { renderTrack(); if ($('#ord').open) renderOrd(); if ($('#bill').open) renderBill(); }
}
let pollT;
function poll() { clearTimeout(pollT); pollT = setTimeout(async () => { if (!document.hidden) await refreshAccount(); poll(); }, (mine.size || acct.length) ? 6000 : 15000); }

function renderTrack() {
  const el = $('#track'), liveO = acct.filter(o => o.status !== 'cancelled');
  if (locked || !TID || !liveO.length) { el.hidden = true; return; }
  const act = liveO.filter(o => mine.has(o.public_id) && o.status !== 'completed');
  let ic, t, sub, st = 0, cls = '';
  if (act.length) {
    const o = act.reduce((a, b) => (STEP[a.status] || 0) <= (STEP[b.status] || 0) ? a : b);   // manda el más atrasado: se ve lo que falta
    [ic, t, sub] = TXT[o.status] || TXT.pending; st = STEP[o.status] || 1; if (o.status === 'ready' && act.every(x => x.status === 'ready')) cls = 'ready';
    if (act.length > 1) sub = act.length + ' pedidos · ' + sub;
  } else { ic = IC.table; t = 'Pedidos de tu mesa'; sub = liveO.length + (liveO.length === 1 ? ' pedido en cuenta' : ' pedidos en cuenta'); }
  $('#tkIc').innerHTML = ic; $('#tkT').textContent = t; $('#tkS').textContent = sub;
  $('#trackOpen').className = 'tkm ' + cls;
  [...$('#tkD').children].forEach((d, i) => { d.className = i < st ? 'on' : ''; if (i === st - 1 && st < 3) d.classList.add('cur'); });
  el.hidden = false;
}

const hhmm = iso => new Date(iso).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' });
const adsTxt = i => (i.addons || []).length ? `<small>+ ${i.addons.map(a => esc(a.name)).join(', + ')}</small>` : '';
function orderCard(o, n) {
  const isMine = mine.has(o.public_id), st = o.status, cx = st === 'cancelled', step = STEP[st] || 0;
  const items = (o.items || []).map(i => `<li><b>${esc(i.qty)}×</b><span>${esc(i.name)}${adsTxt(i)}${i.note ? `<small class="nn">“${esc(i.note)}”</small>` : ''}</span></li>`).join('');
  const steps = !cx && step ? `<div class="steps" role="img" aria-label="Estado: ${esc((TXT[st] || [])[1] || '')}">${['Recibido', 'Preparando', 'Listo'].map((l, i) => `<div class="${i < step ? 'done' : ''}${i === step - 1 && step < 3 ? ' cur' : ''}"><i>${i < step ? '✓' : ''}</i>${l}</div>`).join('')}</div>` : '';
  let acts = '';
  if (isMine && st === 'pending' && !o.paid_at) {
    acts = cancelAsk === o.public_id
      ? `<div class="oa"><div class="cfm"><span>¿Seguro que quieres cancelar este pedido?</span><button class="y" data-cyes="${o.public_id}">Sí, cancelar</button><button class="n" data-cno>No</button></div></div>`
      : `<div class="oa"><button class="go2" data-edit="${o.public_id}">Modificar</button><button class="dg" data-cancel="${o.public_id}">Cancelar pedido</button></div>`;
  } else if (isMine && (st === 'preparing' || st === 'ready')) {
    acts = `<p class="hint">Cocina ya lo está preparando, por eso no se puede cancelar ni modificar. Si necesitas un cambio, <button data-call>avisa a un mesero</button>.</p>`;
  }
  return `<div class="oc${isMine ? ' mine' : ''}${cx ? ' cx' : ''}"><div class="oh"><b>Pedido ${n}${isMine ? '<span class="chip me">Tuyo</span>' : '<span class="chip">De tu mesa</span>'}${o.modified_at && !cx ? '<span class="chip md">Modificado</span>' : ''}${cx ? '<span class="chip cx">Cancelado</span>' : ''}${o.paid_at && !cx ? '<span class="chip pd">Pagado</span>' : ''}</b><small>${hhmm(o.created_at)}</small></div>
    ${steps}<ul class="oi">${items}</ul><div class="ot"><span>Total del pedido</span><span>${clp(o.total || 0)}</span></div>${acts}</div>`;
}
function renderOrd() {
  const all = acct, mineL = all.filter(o => mine.has(o.public_id)), others = all.filter(o => !mine.has(o.public_id));
  const num = o => all.indexOf(o) + 1;
  $('#ordBody').innerHTML = !all.length ? '<p class="empt">Todavía no hay pedidos en tu mesa.</p>'
    : (mineL.length ? `<h4>Tus pedidos</h4>${mineL.map(o => orderCard(o, num(o))).join('')}` : '')
    + (others.length ? `<h4>Otros pedidos de la mesa</h4>${others.map(o => orderCard(o, num(o))).join('')}` : '');
}
function openOrd() { cancelAsk = null; renderOrd(); $('#ord').showModal(); refreshAccount(true); }
$('#trackOpen').onclick = openOrd;
$('#ordClose').onclick = () => $('#ord').close();
$('#ordBill').onclick = () => { $('#ord').close(); openBill(); };
$('#ordBody').addEventListener('click', async e => {
  const c = e.target.closest('[data-cancel],[data-cyes],[data-cno],[data-edit],[data-call]'); if (!c) return;
  if (c.dataset.cancel) { cancelAsk = c.dataset.cancel; renderOrd(); return; }
  if (c.hasAttribute('data-cno')) { cancelAsk = null; renderOrd(); return; }
  if (c.dataset.cyes) { c.disabled = true; await cancelOrder(c.dataset.cyes); return; }
  if (c.dataset.edit) { startEdit(c.dataset.edit); return; }
  if (c.hasAttribute('data-call')) { $('#ord').close(); $('#callBtn').click(); }
});
const ORD_MSG = {
  not_pending: 'Cocina ya empezó a prepararlo: no se puede cambiar. Avisa a un mesero si necesitas algo.',
  cancelled: 'Este pedido ya estaba cancelado.', not_found: 'No encontramos ese pedido.', invalid: 'Algo de tu pedido cambió (precio o disponibilidad). Revísalo y vuelve a intentar.',
};
async function cancelOrder(pid) {
  const { data: r, error } = await sb.rpc('cancel_order', { p_public: pid, p_session: pinned });
  cancelAsk = null;
  if (error) { toast('No se pudo cancelar. Revisa tu conexión.'); renderOrd(); return; }
  if (r === 'ok') toast('Pedido cancelado');
  else if (r === 'locked') { await checkSession(); return; }
  else toast(ORD_MSG[r] || 'No se pudo cancelar.');
  await refreshAccount(true);
}

/* modificar: el pedido vuelve al carrito; al guardar, cocina ve la marca "Modificado" */
function startEdit(pid) {
  const o = acct.find(x => x.public_id === pid);
  if (!o || o.status !== 'pending') { toast('Este pedido ya no se puede modificar.'); refreshAccount(true); return; }
  const stash = cart, next = new Map(), dropped = [];
  for (const i of o.items || []) {
    const p = find(i.id); if (!p || !p.is_available) { dropped.push(i.name); continue; }
    const ads = (i.addons || []).map(a => ({ id: a.id, name: a.name, price: Number(a.price) })), key = keyOf(String(p.id), ads), ex = next.get(key), q = Math.min(MAX_QTY, Number(i.qty) || 1);
    if (ex) ex.qty = Math.min(MAX_QTY, ex.qty + q); else next.set(key, { key, id: String(p.id), name: p.name, price: Number(p.price), qty: q, note: i.note || '', addons: ads });
  }
  if (!next.size) { toast('Los productos de este pedido ya no están disponibles.'); return; }
  editing = { pid, stash }; cart = next; prune();
  $('#editbar').hidden = false; $('#ord').close(); render(); bar();
  renderCart(); if (!cart.size) return exitEdit(); $('#err').textContent = dropped.length ? 'Ya no está disponible: ' + dropped.join(', ') + '.' : ''; $('#cart').showModal();
}
function exitEdit() {
  if (!editing) return; cart = editing.stash; editing = null; $('#editbar').hidden = true;
  prune(); saveCart(); render(); bar();
}
$('#editExit').onclick = () => { exitEdit(); $('#cart').close(); toast('Cambios descartados'); };
async function saveEdit(items, tot, btn) {
  const { data: r, error } = await sb.rpc('modify_order', { p_public: editing.pid, p_session: pinned, p_items: items, p_total: tot });
  btn.disabled = false; btn.textContent = 'Guardar cambios · ' + clp(total());
  if (error) { fail('No se pudo guardar. Revisa tu conexión e inténtalo otra vez.'); return; }
  if (r === 'locked') { await checkSession(); return; }
  exitEdit(); $('#cart').close();
  if (r === 'ok') {
    $('#doneH').textContent = 'Pedido actualizado'; $('#doneTxt').textContent = 'Cocina ya ve los cambios de tu pedido.';
    $('#doneTrack').hidden = false; $('#done').hidden = false;
  } else toast(ORD_MSG[r] || 'No se pudo guardar el cambio.');
  refreshAccount(true);
}
