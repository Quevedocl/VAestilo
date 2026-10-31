/* ==============================================================
   datos-en-vivo.js
   Datos en vivo (Supabase Realtime) y arranque de la carta con init(). Debe cargarse al FINAL.
   Se usa en: carta.html (carta que ve el cliente)
   ============================================================== */

/* ===== datos en vivo ===== */
let lastGone = [];
async function load() {
  if (!sb) { $('#menu').innerHTML = '<p class="msg">No se pudo conectar. Avisa a un mesero.</p>'; return; }
  if (!RID) return;
  const [pr, pm, ad] = await Promise.all([sb.from('products').select('*').eq('restaurant_id', RID).order('category').order('name'), sb.from('promotions').select('*').eq('restaurant_id', RID), sb.from('product_addons').select('*').eq('restaurant_id', RID)]);
  const { data, error } = pr; promos = pm.data || [];
  if (!ad.error) { addons = ad.data || []; addonsOk = true; } else addonsOk = false;   // sin la migración: la carta funciona igual, sin agregados
  if (error) {
    if (!products.length) $('#menu').innerHTML = '<p class="msg">No pudimos cargar la carta.<br><button class="gh" onclick="load()">Reintentar</button></p>';
    return;
  }
  products = data || [];
  const gone = prune(); lastGone = lastGone.concat(gone);
  render(); bar();
  if (gone.length) { toast('Se agotó: ' + gone.join(', ')); if ($('#cart').open) renderCart(); }
}

let sesState = 'ok', CLOSED = false;
function setClosed(v) { CLOSED = v; document.body.classList.toggle('closed', v); $('#closedbar').hidden = !v; if (v) { try { $('#cart').close(); $('#prod').close(); } catch (e) {} } }
async function checkOpen() { if (!sb || !RID) return; const { data } = await sb.from('restaurants').select('open_now').eq('id', RID).maybeSingle(); if (data && 'open_now' in data) setClosed(data.open_now === false); }
setInterval(() => { if (!document.hidden) checkOpen(); }, 20000);
async function init() {
  const bad = m => { $('#menu').innerHTML = `<p class="msg">${m}</p>`; };
  if (!sb || !SLUG) return bad('Enlace inválido. Escanea de nuevo el QR de tu mesa.');
  const { data: r } = await sb.from('restaurants').select('id,name,logo_url,active,open_now,tip_pct').eq('slug', SLUG).maybeSingle();
  if (!r) return bad('No encontramos este restaurante. Avisa a un mesero.');
  if (r.active === false) return bad('Este local no está disponible por ahora.');
  RID = r.id; NOMBRE = r.name; setClosed(r.open_now === false); CART_KEY += '-' + RID;
  TIP_PCT = r.tip_pct == null ? 10 : Number(r.tip_pct); bill.tip = TIP_PCT;
  if (r.logo_url) { const im = $('#logo'); im.src = r.logo_url; im.hidden = false; im.onerror = () => { im.hidden = true; }; }
  if (TID_Q) {
    const { data: tr, error: te } = await sb.rpc('join_table', { p_restaurant: RID, p_table: TID_Q }); const t = Array.isArray(tr) ? tr[0] : tr;
    if (te) return bad('No pudimos verificar tu mesa. Revisa tu conexión e inténtalo otra vez.');
    if (!t) return bad('Esta mesa ya no está activa. Pide a un mesero un QR actualizado.');
    TID = t.id; mesa = t.name; $('#mesaTag').textContent = t.name; CART_KEY += '-' + TID;
    sesState = pinSession(t.session_id, t.released_sid);
    if (sesState === 'nueva') { try { localStorage.removeItem(CART_KEY); } catch (e) {} }   // visita nueva: sin restos de un pedido anterior
    loadMine();
  }
  $('#callBtn').hidden = !TID;
  $('#ttl').textContent = NOMBRE; $('#heroT').textContent = NOMBRE; document.title = NOMBRE + ' · Haz tu pedido';
  // el nombre grande vive en la portada; arriba solo aparece cuando la portada sale de pantalla
  try { if ('IntersectionObserver' in window) { document.body.classList.add('io'); new IntersectionObserver(e => document.body.classList.toggle('scrolled', !e[0].isIntersecting)).observe($('#hero0')); } } catch (e) {}
  loadCart();
  if (!TID) lockUp('<b>Escanea el QR de tu mesa</b><br>Así sabemos en qué mesa estás. Desde este enlace solo puedes ver la carta.');
  else if (sesState === 'cerrada') lockUp();
  await load();
  if (TID && !locked) { await refreshAccount(true); poll(); }
  const f = 'restaurant_id=eq.' + RID;
  sb.channel('carta').on('postgres_changes', { event: '*', schema: 'public', table: 'products', filter: f }, () => load()).on('postgres_changes', { event: '*', schema: 'public', table: 'promotions', filter: f }, () => load()).on('postgres_changes', { event: '*', schema: 'public', table: 'product_addons', filter: f }, () => load())
    .subscribe();
  /* la mesa ya no es legible por tiempo real (su sesión es privada): se consulta cada 15 s por RPC */
  if (TID) setInterval(() => { if (!document.hidden) checkSession().then(st => { if (st === 'gone') location.reload(); }); }, 15000);
}
init();
document.addEventListener('visibilitychange', () => { if (!document.hidden) { checkSession(); load(); refreshAccount(); } });
