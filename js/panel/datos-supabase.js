/* ==============================================================
   datos-supabase.js
   Capa de datos: todas las lecturas y escrituras a Supabase (pedidos, carta, mesas, llamadas).
   Se usa en: index.html (panel del restaurante)
   ============================================================== */

/* ===== CAPA DE DATOS ===== */
const sb = CFG.url && window.supabase ? supabase.createClient(CFG.url, CFG.key, { auth: { lock: async (n, t, fn) => await fn() } }) : null;   // sin candado entre pestañas: evita que las llamadas con sesión queden colgadas
let R = null; // restaurante de la sesión
const api = {
  async load() {
    const q = n => sb.from(n).select('*').eq('restaurant_id', R.id);
    const [p, o, pr, t, w, ad] = await Promise.all([q('products').order('category').order('name'), q('orders').not('status', 'in', '(completed,cancelled)').order('created_at'), q('promotions').order('created_at'), q('dining_tables').order('created_at'), q('waiter_calls').eq('status', 'open').order('created_at'), q('product_addons').order('created_at')]);
    if ([p, o, pr, t, w].some(x => x.error)) toast('No se pudieron cargar los datos');
    if (ad.error && !addonsWarned) { addonsWarned = true; toast('Falta ejecutar supabase/migracion-mejoras.sql en Supabase'); }
    return { products: p.data || [], orders: o.data || [], promos: pr.data || [], tables: t.data || [], calls: w.data || [], addons: ad.data || [] };
  },
  async setProduct(id, patch) { const { error } = await sb.from('products').update(patch).eq('id', id); if (error) { toast(errMsg(error)); return false; } return true; },
  async uploadImg(file) {
    let blob; try { blob = await prepPhoto(file); } catch (e) { toast(e.message || 'No se pudo leer la foto'); return null; }
    const path = R.id + '/' + Date.now() + '-' + Math.random().toString(36).slice(2, 8) + '.webp';
    const up = await sb.storage.from('products').upload(path, blob, { contentType: 'image/webp', cacheControl: '31536000' });
    if (up.error) { toast('No se pudo subir la foto: ' + up.error.message); return null; }
    return sb.storage.from('products').getPublicUrl(path).data.publicUrl;
  },
  async dropImg(url) {                                           // borra la foto del almacenamiento (solo de la carpeta de este restaurante)
    const m = String(url || '').split('/products/')[1], path = m && decodeURIComponent(m);
    if (path && path.startsWith(R.id + '/')) await sb.storage.from('products').remove([path]);
  },
  async addProduct(p, file) {
    if (file) { const u = await api.uploadImg(file); if (u) p.image_url = u; }
    const { error } = await sb.from('products').insert({ ...p, restaurant_id: R.id });
    if (error) { toast(errMsg(error)); return false; } return true;
  },
  async editProduct(id, patch, file) {
    const old = (data.products.find(x => String(x.id) === String(id)) || {}).image_url;
    if (file) { const u = await api.uploadImg(file); if (u) patch.image_url = u; }
    const { error } = await sb.from('products').update(patch).eq('id', id);
    if (error) { toast(errMsg(error)); return false; }
    if (patch.image_url && old && old !== patch.image_url) api.dropImg(old);
    return true;
  },
  async add(table, row) { const { error } = await sb.from(table).insert({ ...row, restaurant_id: R.id }); if (error) { toast(errMsg(error)); return false; } return true; },
  async upd(table, id, patch) { const { error } = await sb.from(table).update(patch).eq('id', id); if (error) toast(errMsg(error)); return !error; },
  async del(table, id) { const { error } = await sb.from(table).delete().eq('id', id); if (error) toast(errMsg(error)); return !error; },
  async setStatus(id, status) { const { error } = await sb.from('orders').update({ status }).eq('id', id).neq('status', 'cancelled'); if (error) toast(errMsg(error)); return !error; },
  /* cierra la mesa: completa sus pedidos, atiende sus llamadas y cambia su sesión (el cliente anterior ya no puede pedir) */
  async chargeTable(tid, name, upto, callId) { const { error } = await sb.rpc('charge_table', { p_restaurant: R.id, p_table: tid || null, p_table_name: name, p_upto: upto, p_call: callId || null }); if (error) { toast('No se pudo registrar el cobro: ' + error.message); return false; } return true; },
  async closeTable(tid, name, release = false) { const { error } = await sb.rpc('close_table', { p_restaurant: R.id, p_table: tid || null, p_table_name: name, p_release: release }); if (error) { toast('No se pudo cerrar la mesa: ' + error.message); return false; } return true; },
  watch(cb) { let c = sb.channel('VAestilo'); ['orders', 'products', 'promotions', 'dining_tables', 'waiter_calls', 'product_addons'].forEach(t => c = c.on('postgres_changes', { event: '*', schema: 'public', table: t, filter: 'restaurant_id=eq.' + R.id }, p => { try { orderEvent(p); } catch (e) {} cb(); })); c.subscribe(); }
};
