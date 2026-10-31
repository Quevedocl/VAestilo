/* ==============================================================
   ingresos-del-dia.js
   Pestaña Ingresos: ventas del día, gráfico, ranking de productos.
   Se usa en: index.html (panel del restaurante)
   ============================================================== */

/* ===== INGRESOS DEL DÍA ===== */
const pad2 = n => String(n).padStart(2, '0');
const dayStr = d => d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate());
let revDay = dayStr(new Date()), REV = [], revT, curToday = revDay;
const oUnit = i => Number(i.price || 0) + (i.addons || []).reduce((a, x) => a + Number(x.price || 0), 0);
const oGross = o => (o.items || []).reduce((a, i) => a + oUnit(i) * Number(i.qty || 0), 0);
const oTotal = o => o.total != null ? Number(o.total) : oGross(o);
const compact = v => v >= 1e6 ? (v / 1e6).toFixed(1).replace('.0', '') + 'M' : v >= 1e3 ? Math.round(v / 1e3) + 'k' : String(Math.round(v));
async function loadRevenue() {
  if (!sb || !R) return;
  const [y, m, d] = revDay.split('-').map(Number), a = new Date(y, m - 1, d), b = new Date(y, m - 1, d + 1);
  const { data: rows, error } = await sb.from('orders').select('id,status,total,items,created_at,paid_at,table_name,table_number').eq('restaurant_id', R.id).gte('created_at', a.toISOString()).lt('created_at', b.toISOString()).order('created_at');
  if (error) { toast('No se pudieron cargar los ingresos'); return; }
  REV = rows || []; renderRevenue();
}
const scheduleRev = () => { clearTimeout(revT); revT = setTimeout(loadRevenue, 700); };
function revStats(rows) {
  const ok = rows.filter(o => o.status !== 'cancelled'), canc = rows.length - ok.length;
  let sales = 0, paid = 0, addv = 0; const hours = Array(24).fill(0), prod = new Map();
  for (const o of ok) {
    const t = oTotal(o), g = oGross(o), f = g > 0 ? t / g : 1;      // f reparte el descuento de promociones entre los ítems
    sales += t; if (o.status === 'completed' || o.paid_at) paid += t;
    hours[new Date(o.created_at).getHours()] += t;
    for (const i of o.items || []) {
      const q = Number(i.qty || 0); addv += (i.addons || []).reduce((a, x) => a + Number(x.price || 0), 0) * q * f;
      const m = prod.get(i.name) || { name: i.name, qty: 0, rev: 0 }; m.qty += q; m.rev += oUnit(i) * q * f; prod.set(i.name, m);
    }
  }
  const n = ok.length, S = Math.round(sales), P = Math.round(paid);
  return { sales: S, paid: P, open: S - P, n, avg: n ? Math.round(sales / n) : 0, addv: Math.round(addv), canc, hours, top: [...prod.values()].sort((a, b) => b.rev - a.rev).slice(0, 6) };
}
function renderRevenue() {
  const s = revStats(REV), isToday = revDay === dayStr(new Date());
  countTo($('#rvSales'), s.sales); countTo($('#rvPaid'), s.paid); countTo($('#rvOpen'), s.open);
  countTo($('#rvN'), s.n, v => String(v)); countTo($('#rvAvg'), s.avg); countTo($('#rvAdd'), s.addv);
  if (isToday) countTo($('#vtv'), s.sales);
  $('#rvTitle').textContent = (isToday ? 'Hoy · ' : '') + new Date(revDay + 'T12:00:00').toLocaleDateString('es-CL', { weekday: 'long', day: 'numeric', month: 'long' });
  const act = s.hours.map((v, h) => v > 0 ? h : -1).filter(h => h >= 0), lo = Math.min(10, ...act), hi = Math.max(22, ...act), mx = Math.max(1, ...s.hours);
  let bars = ''; for (let h = lo; h <= hi; h++) { const v = s.hours[h]; bars += `<div class="c" title="${pad2(h)}:00 · ${clp(Math.round(v))}"><div class="bw"><div class="bar" data-h="${Math.round(v / mx * 100)}">${v ? `<em>${compact(v)}</em>` : ''}</div></div><small>${h}</small></div>`; }
  $('#rvChart').innerHTML = bars;
  const tm = Math.max(1, ...s.top.map(t => t.rev));
  $('#rvTop').innerHTML = s.top.length ? s.top.map((t, i) => `<div class="t5" style="--i:${i}"><span><b>${esc(t.name)}</b> <small>×${t.qty}</small></span><b>${clp(Math.round(t.rev))}</b><div class="bb"><i data-w="${Math.round(t.rev / tm * 100)}"></i></div></div>`).join('') : '<p class="empty">Sin ventas este día</p>';
  const ok = REV.filter(o => o.status !== 'cancelled'), byT = new Map(); ok.forEach(o => { const k = tn(o), m = byT.get(k) || { n: 0, v: 0 }; m.n++; m.v += oTotal(o); byT.set(k, m); });
  const tl = [...byT.entries()].sort((a, b) => b[1].v - a[1].v).slice(0, 6), tmx = Math.max(1, ...tl.map(x => x[1].v));
  const SL = { pending: 'Recibido', preparing: 'Preparando', ready: 'Listo', completed: 'Pagado', cancelled: 'Cancelado' };
  $('#rvList').innerHTML = REV.length ? [...REV].reverse().slice(0, 30).map(o => { const d = new Date(o.created_at); return `<div class="ol${o.status === 'cancelled' ? ' x' : ''}"><time>${pad2(d.getHours())}:${pad2(d.getMinutes())}</time><b>${esc(tn(o))}</b><span class="pill ${esc(o.status)}">${SL[o.status] || esc(o.status)}</span><span>${clp(Math.round(oTotal(o)))}</span></div>`; }).join('') : '<p class="empty">Sin pedidos este día</p>';
  $('#rvTbl').innerHTML = tl.length ? `<div class="sdt">${tl.map(([n, m]) => `<div><div class="r1"><span>${esc(n)}</span><small>${m.n} ${m.n === 1 ? 'pedido' : 'pedidos'} · ${clp(Math.round(m.v))}</small></div><div class="bb"><i style="width:${Math.round(m.v / tmx * 100)}%"></i></div></div>`).join('')}</div>` : '<p class="empty">Sin ventas este día</p>';
  requestAnimationFrame(() => requestAnimationFrame(() => {
    $$('#rvChart .bar').forEach(b => b.style.height = b.dataset.h + '%'); $$('#rvTop .bb i').forEach(b => b.style.width = b.dataset.w + '%');
  }));
  $('#rvNote').textContent = (s.canc ? `${s.canc} pedido${s.canc === 1 ? '' : 's'} cancelado${s.canc === 1 ? '' : 's'} no cuenta${s.canc === 1 ? '' : 'n'} en los ingresos. ` : '') + 'Cobrado = pedidos ya pagados (aunque la mesa siga abierta) · Por cobrar = pedidos aún sin pagar.';
}
