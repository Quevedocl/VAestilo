/* ==============================================================
   enviar-pedido.js
   Enviar el pedido al panel del restaurante (o guardar cambios de un pedido).
   Se usa en: carta.html (carta que ve el cliente)
   ============================================================== */

/* ===== enviar pedido al panel (o guardar los cambios de un pedido) ===== */
const fail = m => { $('#err').textContent = m; };
$('#send').onclick = async () => {
  fail('');
  const t = mesa || $('#mesaIn').value.trim();
  if (!t) { fail('Escribe tu mesa.'); $('#mesaIn').focus(); return; }
  if (FILTRO.malo(t)) { fail(FILTRO.MSG); $('#mesaIn').focus(); return; }
  if ([...cart.values()].some(l => FILTRO.malo(l.note))) { fail('Alguna nota de tu pedido tiene palabras no permitidas. Corrígela para enviar.'); return; }
  if (!sb) { fail('Sin conexión con el restaurante. Avisa a un mesero.'); return; }
  if (!editing && !recAsked) {                    // "¿Desea agregar …?" antes de enviar
    const r = await askRec('send'); if (r === 'cancel') return;
    if (r !== 'none') recAsked = true;
    if (r === 'added') { renderCart(); toast('Agregado a tu pedido. Revísalo y envíalo.'); return; }
  }

  await load();                                  // revisa disponibilidad justo antes de enviar
  const gone = lastGone; lastGone = [];
  if (gone.length) { renderCart(); fail('Se agotó: ' + gone.join(', ') + '. Lo quitamos de tu pedido.'); return; }
  if (!cart.size) { $('#cart').close(); return; }
  const st = await checkSession();
  if (st === 'locked') return;
  if (st === 'gone') { fail('Esta mesa ya no está activa. Pide a un mesero un QR actualizado.'); return; }

  const btn = $('#send'); btn.disabled = true; btn.textContent = editing ? 'Guardando…' : 'Enviando…';
  const dm = discounts(), tot = total();
  const items = [...cart.values()].map(l => ({ id: l.id, name: l.name, qty: l.qty, price: l.price, note: l.note.trim() || undefined, addons: l.addons.length ? l.addons.map(a => ({ id: a.id, name: a.name, price: a.price })) : undefined, promo: dm.has(l.id) ? dm.get(l.id).title : undefined }));
  if (editing) { await saveEdit(items, tot, btn); return; }

  const pub = uuid();
  const { error } = await sb.from('orders').insert({ restaurant_id: RID, table_id: TID, table_name: t, items, total: tot, status: 'pending', session_id: pinned, public_id: pub });
  btn.disabled = false;
  if (error) {
    btn.textContent = 'Enviar pedido · ' + clp(total());
    if (error.code === '42501' && await checkSession() === 'locked') return;   // la mesa se cerró justo ahora
    if (error.code === '42501') { await checkOpen(); if (CLOSED) { fail('El local acaba de cerrar y ya no recibe pedidos nuevos.'); return; } }
    if (/demasiados_pedidos/.test(error.message || '')) { fail('Enviaste muchos pedidos seguidos. Espera unos minutos o avisa a un mesero.'); return; }
    if (/texto_no_permitido/.test(error.message || '')) { fail(FILTRO.MSG); return; }
    if (/pedido_invalido/.test(error.message || '')) { await load(); lastGone = []; renderCart(); fail('Algo de tu pedido cambió (precio o disponibilidad). Revísalo y vuelve a enviar.'); return; }
    fail('No se pudo enviar el pedido. Revisa tu conexión e inténtalo otra vez.'); return;
  }

  lastMesa = t; rememberOrder(pub);
  cart.clear(); saveCart(); recAsked = false; xtraAsked.clear(); $('#cart').close();
  render(); bar();
  $('#doneH').textContent = 'Pedido enviado';
  $('#doneTxt').textContent = `Lo recibimos en cocina para la mesa ${t}. Puedes seguirlo en vivo y, mientras no empiece a prepararse, modificarlo o cancelarlo.`;
  $('#doneTrack').hidden = false; $('#done').hidden = false;
  refreshAccount(true);
};
$('#again').onclick = () => { $('#done').hidden = true; window.scrollTo({ top: 0 }); };
$('#doneTrack').onclick = () => { $('#done').hidden = true; openOrd(); };
