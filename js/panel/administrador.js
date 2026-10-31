/* ==============================================================
   administrador.js
   Pestaña Admin: ver todos los negocios, suspender, dar de alta.
   Se usa en: index.html (panel del restaurante)
   ============================================================== */

/* ===== ADMINISTRADOR: todos los negocios ===== */
let isAdmin = false, adminRows = [], mail = '';
const ago = iso => { if (!iso) return 'Sin pedidos'; const m = mins(iso); return m < 1 ? 'hace instantes' : m < 60 ? `hace ${m} min` : m < 1440 ? `hace ${Math.floor(m / 60)} h` : new Date(iso).toLocaleDateString('es-CL', { day: 'numeric', month: 'short' }); };
async function loadAdmin() {
  const { data: d, error } = await sb.rpc('admin_overview');
  if (error) { toast('No se pudo cargar el panel de administrador'); return; }
  adminRows = d || []; renderAdmin();
}
function renderAdmin() {
  const all = adminRows, q = $('#aq').value.trim().toLowerCase();
  const rows = all.filter(r => !q || (r.name || '').toLowerCase().includes(q) || (r.owner_email || '').toLowerCase().includes(q) || (r.slug || '').includes(q));
  const sum = k => all.reduce((a, r) => a + Number(r[k] || 0), 0), act = all.filter(r => r.active).length;
  $('#akp').innerHTML = [[all.length, 'Negocios'], [act, 'Activos'], [all.length - act, 'Suspendidos'], [sum('orders_today'), 'Pedidos hoy'], [sum('orders_total'), 'Pedidos totales']].map(([n, l]) => `<div><b>${n}</b><span>${l}</span></div>`).join('');
  $('#alist').innerHTML = rows.length ? rows.map(r => `<div class="ar"><div class="av">${avatar(r.name, r.logo_url)}</div>
    <div class="nm"><b>${esc(r.name)}</b><span class="bd${r.active ? '' : ' off'}">${r.active ? 'Activo' : 'Suspendido'}</span><small>${esc(r.owner_email || 'sin correo')}</small>
      <div class="mt"><span><b>${r.tables_count}</b> mesas</span><span><b>${r.products_count}</b> productos</span><span><b>${r.orders_today}</b> pedidos hoy</span><span><b>${r.orders_total}</b> en total</span>${r.open_calls ? `<span style="color:var(--red)"><b>${r.open_calls}</b> llamadas abiertas</span>` : ''}<span>Último pedido: ${esc(ago(r.last_order_at))}</span><span>Creado ${new Date(r.created_at).toLocaleDateString('es-CL', { day: 'numeric', month: 'short', year: 'numeric' })}</span></div></div>
    <div class="ac2"><a class="gh" href="carta.html?r=${encodeURIComponent(r.slug)}" target="_blank" rel="noopener">Ver carta</a><button class="gh" data-act="${r.id}" data-to="${r.active ? 0 : 1}">${r.active ? 'Suspender' : 'Reactivar'}</button></div></div>`).join('') : '<p class="empty">No hay negocios que coincidan.</p>';
}
$('#aq').oninput = renderAdmin; $('#arf').onclick = loadAdmin;
$('#alist').addEventListener('click', async e => {
  const b = e.target.closest('[data-act]'); if (!b) return;
  const r = adminRows.find(x => x.id === b.dataset.act), on = b.dataset.to === '1'; if (!r) return;
  if (!on && !confirm(`¿Suspender "${r.name}"?\n\nSus clientes ya no podrán hacer pedidos ni llamar al mesero hasta que lo reactives.`)) return;
  b.disabled = true;
  const { error } = await sb.rpc('admin_set_active', { p_id: r.id, p_active: on });
  if (error) toast('No se pudo cambiar el estado: ' + error.message); else toast(on ? 'Negocio reactivado' : 'Negocio suspendido');
  await loadAdmin();
});
setInterval(() => { if (view === 'admin' && !document.hidden) loadAdmin(); }, 60000);
async function refresh() {
  data = await api.load(); renderOrders(); renderCalls(); menuMeta(); renderPromos(); renderTables(); renderSide(); scheduleToday();
  if (!(document.activeElement && document.activeElement.closest('#al'))) renderAddons();
  if (view === 'revenue' || revDay === dayStr(new Date())) scheduleRev();
  if (view === 'menu' && !(document.activeElement && document.activeElement.closest('#pg'))) renderMenu();
}
const clk = () => $('#clk').textContent = new Date().toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' });
function hello() { const d = new Date(), h = d.getHours(), n = ($('.brand .t') || {}).textContent || '', g = h < 12 ? 'Buenos días' : h < 20 ? 'Buenas tardes' : 'Buenas noches';
  $('#hDay').textContent = d.toLocaleDateString('es-CL', { weekday: 'long', day: 'numeric', month: 'long' }); $('#hName').innerHTML = g + (n && n !== 'VAestilo' && n !== 'Administrador' ? ', <em>' + esc(n) + '</em>' : '') ; }
hello(); setInterval(hello, 30000);
clk(); setInterval(clk, 10000); setInterval(tick, 10000);
function renderOpen() {
  const b = $('#mode'); if (!b) return;
  if (!sb) { b.hidden = false; b.textContent = 'Modo demo'; b.className = 'opn'; b.disabled = true; return; }
  if (!R) { b.hidden = true; return; }
  const has = 'open_now' in R, open = R.open_now !== false;
  b.hidden = false; b.className = 'opn ' + (open ? 'on' : 'off'); b.textContent = open ? 'Abierto ahora' : 'Local cerrado'; b.disabled = !has;
  b.title = !has ? 'Falta ejecutar migracion-local-abierto.sql en Supabase' : open ? 'Toca para cerrar el local: los clientes dejan de poder hacer pedidos nuevos' : 'Toca para abrir el local y volver a recibir pedidos';
}
$('#mode').onclick = async () => {
  if (!sb || !R || !('open_now' in R)) return;
  const next = R.open_now === false;
  if (!next && !confirm('¿Cerrar el local?\n\nLos clientes no podrán hacer pedidos nuevos. Las mesas que ya están abiertas siguen pudiendo llamar al mesero y pedir la cuenta.')) return;
  const b = $('#mode'); b.disabled = true;
  const { error } = await sb.from('restaurants').update({ open_now: next }).eq('id', R.id);
  if (error) toast('No se pudo cambiar el estado del local: ' + error.message);
  else { R = { ...R, open_now: next }; toast(next ? 'Local abierto: ya puedes recibir pedidos' : 'Local cerrado: no se reciben pedidos nuevos'); }
  renderOpen();
};
renderOpen();
