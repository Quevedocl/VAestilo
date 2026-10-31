/* ==============================================================
   cobrar-sin-cerrar.js
   Cobro parcial: marca como pagado lo pedido hasta ahora y la mesa sigue abierta.
   Se usa en: index.html (panel del restaurante)
   ============================================================== */

/* ===== COBRAR SIN CERRAR: marca como pagado lo pedido hasta el aviso del cliente; la mesa sigue abierta y la próxima cuenta solo suma lo nuevo ===== */
async function chargeUI(c) {
  const upto = new Date(c.created_at).getTime();
  const due = data.orders.filter(o => !o.paid_at && o.status !== 'cancelled' && new Date(o.created_at).getTime() <= upto && ((c.table_id && o.table_id === c.table_id) || (!o.table_id && tn(o) === c.table_name)));
  const amt = due.reduce((a, o) => a + oTotal(o), 0);
  if (!(await api.chargeTable(c.table_id, c.table_name, c.created_at, c.id))) return false;
  toast(due.length ? `Cobrado ${clp(Math.round(amt))} · la mesa sigue abierta` : 'Nada pendiente de cobro en esa mesa'); return true;
}
