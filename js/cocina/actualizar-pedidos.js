/* ==============================================================
   actualizar-pedidos.js
   Consulta los pedidos cada pocos segundos y detecta pedidos nuevos o cambios.
   Se usa en: cocina.html (pantalla de cocina y barra)
   ============================================================== */

async function poll() {
  if (busy) return; busy = true;
  try {
    rows = await rpc('kitchen_orders', { p_key: K, p_station: ST });
    if (!rows.length && (await rpc('kitchen_info', { p_key: K })) == null) { location.reload(); return; }   // enlace desactivado
    fails = 0; $('#warn').hidden = true;
    const sig = new Map(rows.map(o => [o.id, o.status + '|' + o.modified_at + '|' + o.cancelled_at])); let ring = false;
    if (seen) rows.forEach(o => { const s = seen.get(o.id); if ((o.status === 'pending' && s === undefined) || (s !== undefined && s.split('|')[1] !== String(o.modified_at)) || (o.status === 'cancelled' && s !== undefined && !s.startsWith('cancelled'))) { ring = true; fresh.add(o.id); } });
    seen = sig; fresh.forEach(id => { const o = rows.find(x => x.id === id); if (!o || o.status !== 'pending' && o.status !== 'cancelled') fresh.delete(id); });
    render(); if (ring) beep();
  } catch (e) { if (++fails >= 2) $('#warn').hidden = false; } finally { busy = false; }
}
