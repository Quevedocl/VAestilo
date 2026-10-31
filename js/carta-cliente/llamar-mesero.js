/* ==============================================================
   llamar-mesero.js
   Llamar al mesero (cobrar / queja / otra cosa).
   Se usa en: carta.html (carta que ve el cliente)
   ============================================================== */

/* ===== llamar al mesero (cobrar / queja / otra cosa) ===== */
async function postCall(t, rsn, note) {                    // { dup } | { locked } | { err }
  if (!sb || !RID) return { err: 'Sin conexión. Levanta la mano para llamar a un mesero.' };
  const st = await checkSession();
  if (st === 'locked') return { locked: true };
  if (st === 'gone') return { err: 'Esta mesa ya no está activa. Pide un QR actualizado.' };
  const { error } = await sb.from('waiter_calls').insert({ restaurant_id: RID, table_id: TID, table_name: t, reason: rsn, note, status: 'open', session_id: pinned });
  const dup = !!error && error.code === '23505';           // ya había un aviso abierto igual: el mesero ya viene
  if (error && !dup) {
    if (error.code === '42501' && await checkSession() === 'locked') return { locked: true };
    if (/texto_no_permitido/.test(error.message || '')) return { err: FILTRO.MSG };
    return { err: 'No pudimos avisar. Revisa tu conexión o levanta la mano.' };
  }
  return { dup };
}
let reason = 'pay';
function pickReason(r) {
  reason = r;
  document.querySelectorAll('#opts .opt').forEach(b => b.classList.toggle('on', b.dataset.r === r));
  $('#callNote').hidden = r === 'pay';
  $('#callNote').placeholder = r === 'complaint' ? 'Cuéntanos qué pasó (opcional)' : 'Dinos qué necesitas (opcional)';
}
$('#opts').addEventListener('click', e => { const b = e.target.closest('.opt'); if (b) pickReason(b.dataset.r); });
$('#callBtn').onclick = () => {
  $('#callErr').textContent = ''; $('#callNote').value = ''; pickReason('pay');
  $('#callForm').hidden = false; $('#callOk').hidden = true;
  $('#callMz').hidden = !!mesa; if (!mesa && !$('#callMesa').value) $('#callMesa').value = lastMesa;
  $('#call').showModal();
};
$('#callClose').onclick = $('#callOkB').onclick = () => $('#call').close();
$('#callSend').onclick = async () => {
  const err = m => { $('#callErr').textContent = m; }; err('');
  const t = mesa || $('#callMesa').value.trim();
  if (!t) { err('Escribe tu mesa.'); $('#callMesa').focus(); return; }
  if (FILTRO.alguno(t, $('#callNote').value)) { err(FILTRO.MSG); return; }
  const btn = $('#callSend'); btn.disabled = true; btn.textContent = 'Avisando…';
  const r = await postCall(t, reason, reason === 'pay' ? null : ($('#callNote').value.trim() || null));
  btn.disabled = false; btn.textContent = 'Avisar al mesero';
  if (r.locked) return;
  if (r.err) { err(r.err); return; }
  lastMesa = t;
  $('#callOkT').textContent = r.dup ? 'Ya avisamos' : 'Mesero avisado';
  $('#callOkP').textContent = r.dup ? 'Un mesero ya viene en camino a tu mesa.' : (reason === 'pay' ? 'Un mesero irá a tu mesa a cobrarte.' : 'Un mesero irá a tu mesa en un momento.');
  $('#callForm').hidden = true; $('#callOk').hidden = false;
};
