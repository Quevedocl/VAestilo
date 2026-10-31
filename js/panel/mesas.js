/* ==============================================================
   mesas.js
   Pestaña Mesas: enlace directo y QR / NFC por mesa.
   Se usa en: index.html (panel del restaurante)
   ============================================================== */

/* ===== MESAS (enlace directo para QR / NFC) ===== */
const linkOf = t => new URL('carta.html?r=' + R.slug + '&t=' + t.id, location.href).href;
function tableStates() {
  const act = new Map(), calls = new Map();
  data.orders.forEach(o => { const k = mesaKey(tn(o)), e = act.get(k) || { n: 0, unpaid: 0, first: o.created_at }; e.n++; if (!o.paid_at) e.unpaid += oTotal(o); if (new Date(o.created_at) < new Date(e.first)) e.first = o.created_at; act.set(k, e); });
  (data.calls || []).forEach(c => { const k = mesaKey(c.table_name); if (!calls.has(k) || c.reason === 'pay') calls.set(k, c); });
  return data.tables.map(t => { const k = mesaKey(t.name), e = act.get(k) || null, c = calls.get(k) || null; return { t, e, c, st: c ? (c.reason === 'pay' ? 'pay' : 'call') : e ? 'busy' : 'free' }; });
}
const STL = { free: 'Libre', busy: 'Con pedidos', call: 'Llama al mesero', pay: 'Quiere pagar' };
function renderTables() {
  if (!data.tables.length) { $('#tl').innerHTML = emptyArt('table', 'Crea tu primera mesa', 'Cada mesa genera un enlace único para grabar en NFC o imprimir como QR. Escríbela arriba (Ej. Mesa 1) y presiona “Crear mesa”.'); return; }
  const st = tableStates(), cnt = k => st.filter(x => x.st === k).length, busy = st.length - cnt('free');
  const owe = st.reduce((a, x) => a + (x.e ? x.e.unpaid : 0), 0);
  $('#tl').innerHTML = `<div class="mstat"><div><span>Mesas</span><b>${st.length}</b></div><div><span>Ocupadas</span><b>${busy}</b></div><div><span>Libres</span><b>${cnt('free')}</b></div><div><span>Por cobrar</span><b>${clp(Math.round(owe))}</b></div></div>
  <div class="mgrid">${st.map(({ t, e, c, st: s }) => { const m = e ? mins(e.first) : 0;
    const body = c ? `<b>${esc((WHY[c.reason] || WHY.help)[0])}</b>${e ? ' · ' + e.n + (e.n === 1 ? ' pedido' : ' pedidos') : ''}` : e ? `<b>${e.n} ${e.n === 1 ? 'pedido activo' : 'pedidos activos'}</b> · ${e.unpaid ? clp(Math.round(e.unpaid)) + ' por cobrar' : 'todo pagado'}<br>desde hace ${m < 1 ? 'un momento' : m + ' min'}` : 'Sin pedidos activos. Lista para recibir clientes.';
    return `<article class="mc ${s}"><div class="mh"><b>${esc(t.name)}</b><span class="mbadge">${STL[s]}</span></div><div class="mb">${body}</div><div class="ml">${esc(linkOf(t))}</div>
    <div class="ma"><button class="gh" data-cp="${t.id}">Copiar enlace</button><button class="gh" data-qr="${t.id}">QR</button><button class="gh" data-free="${t.id}" title="Deja la mesa lista para un cliente nuevo: al escanear el QR podrá pedir">Liberar</button><button class="gh" data-del="dining_tables" data-id="${t.id}">Borrar</button></div></article>`; }).join('')}</div>`;
}
const mesaKey = x => String(x || '').toLowerCase().replace(/ñ/g, '\u0001').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\u0001/g, 'ñ').replace(/\s+/g, ' ').trim();   // "Mesa  5" = "mesa 5" = "MESA 5"
$('#tf').onsubmit = async e => { e.preventDefault(); const n = $('#tn').value.trim(); if (!n) return; if (FILTRO.malo(n)) return toast(FILTRO.MSG); if (data.tables.some(t => mesaKey(t.name) === mesaKey(n))) return toast('Ya existe una mesa con ese nombre.'); try { if (!await api.add('dining_tables', { name: n })) return; } catch (err) { return toast('No se pudo crear la mesa: ' + ((err && err.message) || err)); } $('#tn').value = ''; toast('Mesa creada'); await refresh(); };
$('#tl').addEventListener('click', async e => {
  const f = e.target.closest('[data-free]');
  if (f) { const t = data.tables.find(x => String(x.id) === f.dataset.free); if (t && confirm(`¿Liberar "${t.name}"?\n\nSe cierran sus pedidos abiertos y la mesa queda lista para un cliente nuevo: al escanear el QR (o recargar la página) podrá pedir, incluso desde un teléfono que ya estuvo en esta mesa.`) && await api.closeTable(t.id, t.name, true)) { toast('Mesa liberada: el próximo que escanee el QR puede pedir'); await refresh(); } return; }
  const b = e.target.closest('[data-cp],[data-qr]'); if (!b) return;
  const t = data.tables.find(x => String(x.id) === (b.dataset.cp || b.dataset.qr));
  if (b.dataset.cp) { try { await navigator.clipboard.writeText(linkOf(t)); toast('Enlace copiado'); } catch (_) { prompt('Copia el enlace:', linkOf(t)); } }
  else { $('#qrt').textContent = t.name; $('#qrb').innerHTML = ''; new QRCode($('#qrb'), { text: linkOf(t), width: 300, height: 300, correctLevel: QRCode.CorrectLevel.L }); $('#qrd').showModal(); }
});
$('#qrx').onclick = () => $('#qrd').close();
$('#qrdl').onclick = () => { const src = $('#qrb canvas'), m = 40, c = document.createElement('canvas'); c.width = src.width + m * 2; c.height = src.height + m * 2; const g = c.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height); g.drawImage(src, m, m);   // borde blanco: sin él muchos lectores no detectan el QR
  const a = document.createElement('a'); a.href = c.toDataURL('image/png'); a.download = 'qr-' + $('#qrt').textContent + '.png'; a.click(); };
$('main').addEventListener('click', async e => { const b = e.target.closest('[data-del]'); if (!b || !confirm('¿Borrar? Esta acción no se puede deshacer.')) return; await api.del(b.dataset.del, b.dataset.id); await refresh(); });
