/* ==============================================================
   cerrar-mesa.js
   Cerrar mesa (cobrada): completa sus pedidos y deja el QR listo para el próximo cliente.
   Se usa en: index.html (panel del restaurante)
   ============================================================== */

/* ===== CERRAR MESA (cobrada): completa todos sus pedidos y deja el QR listo para el próximo cliente ===== */
async function closeTableUI(tid, name) {
  const open = data.orders.filter(o => (tid ? o.table_id === tid : false) || (!o.table_id && tn(o) === name));
  const busy = open.filter(o => o.status !== 'ready').length;
  if (busy && !confirm(`La mesa "${name}" tiene ${busy} pedido${busy === 1 ? '' : 's'} sin terminar.\n\nSi cierras la mesa se completan todos y el cliente ya no podrá pedir. ¿Cerrar igual?`)) return false;
  if (!(await api.closeTable(tid, name))) return false;
  toast('Mesa cerrada y cobrada'); confetti(); return true;
}
