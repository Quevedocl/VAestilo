/* ==============================================================
   mesas.js
   Pestaña Mesas: enlace directo y QR / NFC por mesa.
   Se usa en: index.html (panel del restaurante)
   ============================================================== */

/* ===== MESAS (enlace directo para QR / NFC) ===== */
// Si el panel se abre desde un archivo o desde localhost, el celular no puede entrar: en js/compartido/config.js se puede poner  site: 'https://tu-dominio.com/'  para que los QR siempre apunten a la página publicada.
const siteSaved = () => { try { return localStorage.getItem('va-site') || ''; } catch (_) { return ''; } };
const isLocal = u => /^(file:|http:\/\/(localhost|127\.|192\.168\.|10\.))/.test(u);
// Adaptable: si el panel está en internet (GitHub, tu hosting, tu dominio) el QR usa SIEMPRE la dirección actual, así que al cambiar de hosting no hay que tocar nada.
// Solo cuando se abre desde un archivo o localhost se usa la dirección guardada (o la de config.js) para que el celular pueda entrar.
const siteBase = () => isLocal(location.href) ? ((window.FOGON && window.FOGON.site) || siteSaved() || location.href) : location.href;
const localBase = () => isLocal(siteBase());
function askSite() {   // abierto desde un archivo o localhost el QR no sirve en el celular: se pide la dirección pública una sola vez
  const v = (prompt('Este panel está abierto desde tu computador, y el celular no puede abrir ese enlace.\n\nEscribe la dirección donde está publicada tu página (empieza con https://), por ejemplo:\nhttps://usuario.github.io/VAestilo/', siteSaved()) || '').trim();
  if (!/^https:\/\/[^\s]+$/.test(v)) return false;
  try { localStorage.setItem('va-site', v.endsWith('/') ? v : v + '/'); } catch (_) {}
  return true;
}
const linkOf = t => new URL('carta.html?r=' + R.slug + '&t=' + t.id, siteBase()).href;
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
  if (b.dataset.cp) { if (localBase()) askSite(); try { await navigator.clipboard.writeText(linkOf(t)); toast('Enlace copiado'); } catch (_) { prompt('Copia el enlace:', linkOf(t)); } }
  else { if (localBase()) askSite(); $('#qrt').textContent = t.name; $('#qrb').innerHTML = ''; $('#qrb').appendChild(qrCanvas(linkOf(t), 360, 'Q&V'));
    const u = linkOf(t), mala = localBase(); $('#qrl').textContent = u + '  ·  QR v5 con logo'; $('#qrw').hidden = !mala; $('#qrd').showModal(); }
});
$('#qrx').onclick = () => $('#qrd').close();
$('#qrdl').onclick = () => { const a = document.createElement('a'); a.href = $('#qrb canvas').toDataURL('image/png'); a.download = 'qr-' + $('#qrt').textContent + '.png'; a.click(); };
$('main').addEventListener('click', async e => { const b = e.target.closest('[data-del]'); if (!b || !confirm('¿Borrar? Esta acción no se puede deshacer.')) return; await api.del(b.dataset.del, b.dataset.id); await refresh(); });
