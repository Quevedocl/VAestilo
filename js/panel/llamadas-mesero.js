/* ==============================================================
   llamadas-mesero.js
   Llamadas al mesero (cobrar, ayuda, queja).
   Se usa en: index.html (panel del restaurante)
   ============================================================== */

/* ===== LLAMADAS AL MESERO ===== */
const WHY = { pay: ['Quiere pagar', 'pay'], complaint: ['Queja o problema', 'complaint'], help: ['Necesita algo', 'help'] };
let seenCalls = null;
function renderCalls() {
  const calls = data.calls || [], ids = new Set(calls.map(c => c.id));
  const cn = $('#ccnt'); cn.textContent = calls.length || ''; cn.dataset.v = calls.length;
  $('#cl').innerHTML = calls.map(c => { const w = WHY[c.reason] || WHY.help, m = mins(c.created_at);
    return `<article class="cc ${esc(c.reason)}"><div class="h"><b>${esc(c.table_name)}</b><small>${m < 1 ? 'Recién' : m + ' min'}</small></div><p class="why">${w[0]}</p>${c.note ? `<p class="nt2">“${esc(c.note)}”</p>` : ''}
    <div class="ac">${c.reason === 'pay' ? `<button class="pri" data-cclose="${c.id}">Cobrar y cerrar mesa</button><button class="gh" data-cpay="${c.id}">Cobrar y dejar abierta</button>` : ''}<button class="gh" data-cdone="${c.id}">Atendido</button></div></article>`; }).join('') || emptyArt('bell', 'Nadie está llamando', 'Cuando un cliente toque “Llamar al mesero” en su carta, el aviso aparece aquí con sonido.');
  if (seenCalls) { const fresh = calls.filter(c => !seenCalls.has(c.id)); if (fresh.length) alertCall(fresh); }
  seenCalls = ids;
}
function alertCall(list) {
  beep('call'); const b = $('#bn'), c = list[0];
  b.textContent = list.length > 1 ? `${list.length} llamadas al mesero` : `${c.table_name} · ${(WHY[c.reason] || WHY.help)[0].replace(/^\S+\s/, '')}`;
  b.classList.add('on'); clearTimeout(bt); bt = setTimeout(() => b.classList.remove('on'), 4500);
}
$('#cl').addEventListener('click', async e => {
  const d = e.target.closest('[data-cdone]'), x = e.target.closest('[data-cclose]'), p = e.target.closest('[data-cpay]'); if (!d && !x && !p) return;
  const c = data.calls.find(k => String(k.id) === (d || x || p).dataset[d ? 'cdone' : x ? 'cclose' : 'cpay']); if (!c) return;
  (d || x || p).disabled = true;
  if (d) await api.upd('waiter_calls', c.id, { status: 'done' });
  else if (p) { if (!(await chargeUI(c))) { p.disabled = false; return; } }
  else if (!(await closeTableUI(c.table_id, c.table_name))) { x.disabled = false; return; }
  await refresh();
});
setInterval(() => { if (data.calls && data.calls.length) renderCalls(); renderSide(); if (view === 'tables') renderTables(); }, 30000);
