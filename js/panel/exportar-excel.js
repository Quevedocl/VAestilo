/* ==============================================================
   exportar-excel.js
   Exportar los ingresos a un archivo Excel (.xlsx) con hojas Resumen, Pedidos y Detalle.
   Se usa en: index.html (panel del restaurante)
   ============================================================== */

/* ===== EXPORTAR A EXCEL (.xlsx con formato: Resumen, Pedidos y Detalle) ===== */
const XL_ST = { pending: 'Recibido', preparing: 'Preparando', ready: 'Listo', completed: 'Pagado', cancelled: 'Cancelado' };
function buildReport() {
  const S = (v, s) => ({ v, s }), z = (b, i) => b + (i % 2 ? 'z' : '');
  const s = revStats(REV), ok = REV.filter(o => o.status !== 'cancelled');
  const fecha = new Date(revDay + 'T12:00:00').toLocaleDateString('es-CL', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  const now = new Date(), gen = `${pad2(now.getDate())}-${pad2(now.getMonth() + 1)}-${now.getFullYear()} ${pad2(now.getHours())}:${pad2(now.getMinutes())}`;
  const head = (name, cols, W) => [{ h: 32, cells: [S('Reporte de ventas · ' + name, 'title')] }, [S(`${R.name} · ${fecha}`, 'sub')], [S('Generado el ' + gen, 'sub')], []];
  const pay = o => o.status === 'cancelled' ? '—' : (o.status === 'completed' || o.paid_at ? 'Pagado' : 'Por cobrar');
  const lines = o => (o.items || []).map(i => `${i.qty}× ${i.name}${(i.addons || []).length ? ' (+ ' + i.addons.map(a => a.name).join(', + ') + ')' : ''}${i.note ? ' [' + i.note + ']' : ''}`);

  /* --- Resumen --- */
  const r1 = head('Resumen'); r1[0].cells = [S('Reporte de ventas', 'title')];
  const sec = (t, n) => ({ h: 22, cells: Array.from({ length: n }, (_, i) => S(i ? '' : t, 'sec')) });
  const kpi = [['Ventas totales', s.sales, 'kmoney'], ['Cobrado (ya pagado)', s.paid, 'kmoney'], ['Por cobrar', s.open, 'kmoney'], ['Pedidos (sin cancelados)', s.n, 'kint'], ['Ticket promedio', s.avg, 'kmoney'], ['Ingresos por agregados', s.addv, 'kmoney'], ['Pedidos cancelados', s.canc, 'kint']];
  r1.push(sec('Resumen del día', 2), ...kpi.map(k => [S(k[0], 'lab'), S(k[1], k[2])]), []);
  const table = (title, cols, data, n = 4) => {                        // título, encabezado, filas con cebra y fila de total con fórmulas
    r1.push(sec(title, n), cols.map(c => S(c.h, 'head')));
    const first = r1.length + 1;
    data.forEach((row, i) => r1.push(row.map((v, j) => S(v, cols[j].t === 'txt' ? z('txt', i) : z(cols[j].t, i)))));
    if (data.length) { const last = r1.length; r1.push(cols.map((c, j) => j === 0 ? S('Total', 'tot') : c.sum ? { v: data.reduce((a, r) => a + r[j], 0), s: c.t === 'money' ? 'totmoney' : 'totint', f: `SUM(${VAXLSX.colL(j)}${first}:${VAXLSX.colL(j)}${last})` } : S('', 'tot'))); }
    else r1.push([S('Sin datos este día', 'sub')]);
    r1.push([]);
  };
  const hrs = s.hours.map((v, h) => [pad2(h) + ':00 – ' + pad2(h) + ':59', Math.round(v)]).filter(r => r[1] > 0);
  table('Ventas por hora', [{ h: 'Hora', t: 'txt' }, { h: 'Ventas', t: 'money', sum: 1 }], hrs, 2);
  const prod = new Map();
  for (const o of ok) { const t = oTotal(o), g = oGross(o), f = g > 0 ? t / g : 1; for (const i of o.items || []) { const q = Number(i.qty || 0), m = prod.get(i.name) || [i.name, 0, 0]; m[1] += q; m[2] += oUnit(i) * q * f; prod.set(i.name, m); } }
  table('Productos vendidos', [{ h: 'Producto', t: 'txt' }, { h: 'Cantidad', t: 'int', sum: 1 }, { h: 'Ingresos', t: 'money', sum: 1 }], [...prod.values()].sort((a, b) => b[2] - a[2]).map(m => [m[0], m[1], Math.round(m[2])]), 3);
  const byT = new Map(); ok.forEach(o => { const k = tn(o), m = byT.get(k) || [k, 0, 0]; m[1]++; m[2] += oTotal(o); byT.set(k, m); });
  table('Ventas por mesa', [{ h: 'Mesa', t: 'txt' }, { h: 'Pedidos', t: 'int', sum: 1 }, { h: 'Ventas', t: 'money', sum: 1 }], [...byT.values()].sort((a, b) => b[2] - a[2]).map(m => [m[0], m[1], Math.round(m[2])]), 3);
  r1.push([S('Cobrado = pedidos ya pagados (aunque la mesa siga abierta) · Por cobrar = pedidos aún sin pagar. Los cancelados no cuentan en los ingresos.', 'sub')]);

  /* --- Pedidos (uno por fila) --- */
  const r2 = head('Pedidos'), n0 = r2.length + 1;
  r2.push({ h: 26, cells: ['Fecha', 'Hora', 'Mesa', 'Estado', 'Pago', 'Ítems', 'Detalle del pedido', 'Total'].map(h => S(h, 'head')) });
  REV.forEach((o, i) => {
    const d = new Date(o.created_at), ls = lines(o), cnt = (o.items || []).reduce((a, x) => a + Number(x.qty || 0), 0), wrap = ls.reduce((a, l) => a + Math.max(1, Math.ceil(l.length / 58)), 0);
    r2.push({ h: Math.max(20, 15 * Math.max(1, wrap) + 6), cells: [S(`${pad2(d.getDate())}-${pad2(d.getMonth() + 1)}-${d.getFullYear()}`, z('ctr', i)), S(pad2(d.getHours()) + ':' + pad2(d.getMinutes()), z('ctr', i)), S(tn(o), z('txt', i)), S(XL_ST[o.status] || o.status, z('ctr', i)), S(pay(o), z('ctr', i)), S(cnt, z('int', i)), S(ls.join('\n'), z('txt', i)), S(Math.round(oTotal(o)), z('money', i))] });
  });
  const n1 = r2.length, tt = ok.reduce((a, o) => a + Math.round(oTotal(o)), 0), ti = ok.reduce((a, o) => a + (o.items || []).reduce((x, i) => x + Number(i.qty || 0), 0), 0);
  r2.push({ h: 24, cells: [S('TOTAL', 'tot'), S('', 'tot'), S('', 'tot'), S('sin cancelados', 'tot'), S('', 'tot'), { v: ti, s: 'totint', f: `SUMIF(D${n0 + 1}:D${n1},"<>Cancelado",F${n0 + 1}:F${n1})` }, S('', 'tot'), { v: tt, s: 'totmoney', f: `SUMIF(D${n0 + 1}:D${n1},"<>Cancelado",H${n0 + 1}:H${n1})` }] });

  /* --- Detalle (una fila por producto) --- */
  const r3 = head('Detalle por producto'); r3[1] = [S(`${R.name} · ${fecha}`, 'sub')]; r3[2] = [S('Subtotales a precio de carta, antes de descuentos por promoción (el total real de cada pedido está en la hoja Pedidos).', 'sub')];
  const m0 = r3.length + 1;
  r3.push({ h: 26, cells: ['Hora', 'Mesa', 'Estado', 'Producto', 'Agregados', 'Cant.', 'Precio unit.', 'Subtotal', 'Nota', 'Promoción'].map(h => S(h, 'head')) });
  let k = 0;
  REV.forEach(o => { const d = new Date(o.created_at); (o.items || []).forEach(i => { const q = Number(i.qty || 0), u = oUnit(i); r3.push([S(pad2(d.getHours()) + ':' + pad2(d.getMinutes()), z('ctr', k)), S(tn(o), z('txt', k)), S(XL_ST[o.status] || o.status, z('ctr', k)), S(i.name, z('txt', k)), S((i.addons || []).map(a => '+ ' + a.name).join(', '), z('txt', k)), S(q, z('int', k)), S(Math.round(u), z('money', k)), S(Math.round(u * q), z('money', k)), S(i.note || '', z('txt', k)), S(i.promo || '', z('txt', k))]); k++; }); });
  const m1 = r3.length;
  let sq = 0, sm = 0; REV.forEach(o => { if (o.status !== 'cancelled') (o.items || []).forEach(i => { sq += Number(i.qty || 0); sm += Math.round(oUnit(i) * Number(i.qty || 0)); }); });
  if (k) r3.push({ h: 24, cells: [S('TOTAL', 'tot'), S('', 'tot'), S('sin cancelados', 'tot'), S('', 'tot'), S('', 'tot'), { v: sq, s: 'totint', f: `SUMIF(C${m0 + 1}:C${m1},"<>Cancelado",F${m0 + 1}:F${m1})` }, S('', 'tot'), { v: sm, s: 'totmoney', f: `SUMIF(C${m0 + 1}:C${m1},"<>Cancelado",H${m0 + 1}:H${m1})` }, S('', 'tot'), S('', 'tot')] });

  return { title: 'Reporte de ventas ' + revDay, sheets: [
    { name: 'Resumen', widths: [34, 18, 18, 18], rows: r1, merges: ['A1:D1'] },
    { name: 'Pedidos', widths: [12, 8, 16, 13, 13, 8, 62, 15], rows: r2, merges: ['A1:H1'], freeze: n0, filter: `A${n0}:H${n1}`, landscape: true },
    { name: 'Detalle', widths: [8, 16, 13, 30, 28, 8, 14, 14, 26, 24], rows: r3, merges: ['A1:J1'], freeze: m0, filter: k ? `A${m0}:J${m1}` : undefined, landscape: true }
  ] };
}
$('#rvCsv').onclick = () => {
  if (!REV.length) { toast('No hay pedidos este día'); return; }
  if (!window.VAXLSX) { toast('No se pudo preparar el Excel. Recarga la página.'); return; }
  try {
    const a = document.createElement('a'); a.href = URL.createObjectURL(VAXLSX.blob(buildReport())); a.download = `VAestilo-ventas-${revDay}.xlsx`;
    document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 1000); toast('Excel descargado');
  } catch (e) { toast('No se pudo crear el Excel'); }
};
function setDay(v) { revDay = v; $('#rvDay').value = v; loadRevenue(); }
const shiftDay = n => { const [y, m, d] = revDay.split('-').map(Number); const t = dayStr(new Date(y, m - 1, d + n)); if (t <= dayStr(new Date())) setDay(t); };
$('#rvDay').onchange = e => { if (e.target.value) setDay(e.target.value); };
$('#rvPrev').onclick = () => shiftDay(-1); $('#rvNext').onclick = () => shiftDay(1); $('#rvToday').onclick = () => setDay(dayStr(new Date()));
setInterval(() => { const t = dayStr(new Date()); if (t !== curToday) { if (revDay === curToday) revDay = t; curToday = t; if (R) loadRevenue(); } }, 30000);   // cambio de día con el panel abierto
