/* ==============================================================
   eventos.js
   Clics: filtros, selector de mesa y botones de los pedidos.
   Se usa en: cocina.html (pantalla de cocina y barra)
   ============================================================== */

$('#seg').onclick = e => { const b = e.target.closest('button'); if (!b) return; sf = b.dataset.f; document.querySelectorAll('#seg button').forEach(x => x.classList.toggle('on', x === b)); render(); };
$('#mesa').onchange = e => { mf = e.target.value; render(); };
$('#sum').onclick = () => $('#sum').classList.toggle('open');
$('#grid').addEventListener('click', async e => {
  const hd = e.target.closest('.tk.ready .hd'); if (hd && !e.target.closest('button')) { const id = hd.closest('.tk').dataset.id; openSet.has(id) ? openSet.delete(id) : openSet.add(id); lastHtml = ''; render(); return; }
  const b = e.target.closest('button'); if (!b) return;
  if (b.dataset.x) { dismissed.add(b.dataset.x); render(); return; }
  b.disabled = true;
  try { const r = await rpc('kitchen_set_status', { p_key: K, p_order: b.dataset.id, p_status: b.dataset.to, p_station: ST }); if (r !== 'ok') alert(r === 'closed' ? 'Ese pedido ya se cerró o se canceló.' : 'No se pudo cambiar el estado.'); } catch (x) { alert('Sin conexión: no se guardó el cambio.'); }
  busy = false; poll();
});
