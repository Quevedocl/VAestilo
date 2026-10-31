/* ==============================================================
   panel-lateral-y-resumen.js
   Panel lateral del turno (Hoy / Mesas / Llamadas), estados vacíos y resumen de la carta.
   Se usa en: index.html (panel del restaurante)
   ============================================================== */

/* ===== PANEL LATERAL DEL TURNO, ESTADOS VACÍOS Y RESUMEN DE CARTA ===== */
const ART = {
  bell: '<svg viewBox="0 0 120 120"><circle cx="60" cy="60" r="54" fill="#EDF2EE"/><path d="M60 28a20 20 0 00-20 20v14l-6 10h52l-6-10V48a20 20 0 00-20-20z" fill="#fff" stroke="#4E7162" stroke-width="3" stroke-linejoin="round"/><path d="M52 78a8 8 0 0016 0" fill="none" stroke="#4E7162" stroke-width="3" stroke-linecap="round"/><circle cx="60" cy="25" r="3" fill="#4E7162"/><circle cx="92" cy="34" r="5" fill="#DCE7E0"/><circle cx="26" cy="86" r="4" fill="#DCE7E0"/></svg>',
  orders: '<svg viewBox="0 0 120 120"><circle cx="60" cy="60" r="54" fill="#EDF2EE"/><rect x="34" y="26" width="52" height="68" rx="8" fill="#fff" stroke="#4E7162" stroke-width="3"/><path d="M45 46h30M45 58h30M45 70h18" stroke="#4E7162" stroke-width="3" stroke-linecap="round"/><circle cx="82" cy="82" r="14" fill="#4E7162"/><path d="M75 82l5 5 9-10" fill="none" stroke="#fff" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"/><circle cx="96" cy="30" r="5" fill="#DCE7E0"/><circle cx="22" cy="78" r="4" fill="#DCE7E0"/></svg>',
  table: '<svg viewBox="0 0 120 120"><circle cx="60" cy="60" r="54" fill="#EDF2EE"/><rect x="28" y="50" width="64" height="9" rx="4.5" fill="#fff" stroke="#4E7162" stroke-width="3"/><path d="M40 59v28M80 59v28" stroke="#4E7162" stroke-width="3" stroke-linecap="round"/><rect x="48" y="26" width="24" height="24" rx="3" fill="#fff" stroke="#4E7162" stroke-width="3"/><path d="M53 31h6v6h-6zM61 31h6v6h-6zM53 39h6v6h-6zM63 41h4v4h-4z" fill="#4E7162"/></svg>'
};
const emptyArt = (k, t, p, btn) => `<div class="oempty">${ART[k]}<h3>${esc(t)}</h3><p>${esc(p)}</p>${btn || ''}</div>`;
function orderEmpty() {
  const E = $('#oEmpty'); if (!E) return;
  const vis = [...map.values()].some(el => !el.hidden && !el.classList.contains('leave'));
  E.hidden = vis; if (vis) return;
  E.innerHTML = data.orders.length ? `${ART.orders}<h3>No hay pedidos en esta vista</h3><p>Cambia el filtro de arriba para ver el resto de los pedidos activos.</p>`
    : `${ART.orders}<h3>Todo tranquilo por ahora</h3><p>Cuando un cliente escanee el QR de su mesa y pida, el pedido aparece aquí al instante, con aviso sonoro.</p><button class="pri" type="button" data-go2="tables">${data.tables.length ? 'Ver QR y enlaces de mesas' : 'Crear mi primera mesa'}</button>`;
}
$('#oEmpty').addEventListener('click', e => { const b = e.target.closest('[data-go2]'); if (b) go(b.dataset.go2); });
let TODAY = [], todayT;
const scheduleToday = () => { clearTimeout(todayT); todayT = setTimeout(loadToday, 500); };
async function loadToday() {
  if (!sb || !R) return;
  const a = new Date(); a.setHours(0, 0, 0, 0); const b = new Date(a); b.setDate(b.getDate() + 1);
  const { data: rows, error } = await sb.from('orders').select('id,status,total,items,created_at,paid_at,table_name,table_number').eq('restaurant_id', R.id).gte('created_at', a.toISOString()).lt('created_at', b.toISOString()).order('created_at');
  if (!error) { TODAY = rows || []; renderSide(); }
}
function renderSide() {
  const el = $('#side'); if (!el || !R) return;
  const s = revStats(TODAY), st = tableStates(), calls = data.calls || [];
  const steps = [
    ['Crea tu carta', 'Añade tus platos con foto y precio.', data.products.length > 0, 'menu', 'Ir a Carta'],
    ['Crea tus mesas', 'Cada mesa tiene su QR o enlace NFC.', data.tables.length > 0, 'tables', 'Ir a Mesas'],
    ['Sube tu logo', 'Aparece arriba en la carta del cliente.', !!R.logo_url, 'settings', 'Ir a Configuración']
  ], pend = steps.filter(x => !x[2]);
  const first = pend[0];
  let h = '';
  if (pend.length) h += `<div class="sd start"><h4>Primeros pasos <small>${steps.length - pend.length}/${steps.length}</small></h4><ul class="chk">${steps.map(x => `<li class="${x[2] ? 'ok' : ''}"><span class="o"></span><div><b>${x[0]}</b>${x[2] ? '' : `<small>${x[1]}</small>`}${x === first ? `<br><button type="button" data-go2="${x[3]}">${x[4]}</button>` : ''}</div></li>`).join('')}</ul></div>`;
  h += `<div class="sd"><h4>Hoy</h4><div class="sdk"><div class="w"><span>Ventas del día</span><b>${clp(s.sales)}</b></div><div><span>Pedidos</span><b>${s.n}</b></div><div><span>Ticket promedio</span><b>${clp(s.avg)}</b></div><div><span>Cobrado</span><b>${clp(s.paid)}</b></div><div><span>Por cobrar</span><b>${clp(s.open)}</b></div></div></div>`;
  if (st.length) { const busy = st.filter(x => x.st !== 'free').length;
    h += `<div class="sd"><h4>Mesas · ${busy} de ${st.length} ocupadas <button type="button" data-go2="tables">Ver todas</button></h4><div class="mchips">${st.slice(0, 24).map(x => `<span class="mch ${x.st}" title="${STL[x.st]}">${esc(x.t.name)}</span>`).join('')}${st.length > 24 ? `<span class="mch free">+${st.length - 24}</span>` : ''}</div></div>`; }
  h += `<div class="sd"><h4>Llamadas al mesero <button type="button" data-go2="calls">Abrir</button></h4>${calls.length ? `<div class="sdl">${calls.slice(0, 4).map(c => { const w = WHY[c.reason] || WHY.help, m = mins(c.created_at); return `<div class="it"><b>${esc(c.table_name)}</b><i class="${esc(c.reason)}">${w[0]}</i><small>${m < 1 ? 'Recién' : m + ' min'}</small></div>`; }).join('')}</div>` : '<p class="mut">Nadie está llamando. Todo en orden ✓</p>'}</div>`;
  if (s.top.length) { const tm = Math.max(1, ...s.top.map(t => t.qty)); h += `<div class="sd"><h4>Lo más pedido hoy <button type="button" data-go2="revenue">Ingresos</button></h4><div class="sdt">${s.top.slice(0, 4).map(t => `<div><div class="r1"><span>${esc(t.name)}</span><small>×${t.qty}</small></div><div class="bb"><i style="width:${Math.round(t.qty / tm * 100)}%"></i></div></div>`).join('')}</div></div>`; }
  el.innerHTML = h;
}
$('#side').addEventListener('click', e => { const b = e.target.closest('[data-go2]'); if (b) go(b.dataset.go2); });
function menuStats(on, cats) {
  const off = data.products.length - on, pr = (data.promos || []).filter(x => x.is_active).length, ad = (data.addons || []).filter(x => x.is_available).length;
  $('#cstat').innerHTML = `<div><span>Productos</span><b>${data.products.length}</b></div><div><span>Categorías</span><b>${cats.length}</b></div><div class="${off ? 'alert' : ''}"><span>Agotados</span><b>${off}</b></div><div><span>Promociones activas</span><b>${pr}</b></div><div><span>Agregados activos</span><b>${ad}</b></div>`;
}
