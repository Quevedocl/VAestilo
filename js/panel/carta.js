/* ==============================================================
   carta.js
   Pestaña Carta: productos, categorías, precios, disponibilidad y borrar la carta completa.
   Se usa en: index.html (panel del restaurante)
   ============================================================== */

/* ===== CARTA ===== */
function menuMeta() {
  $('#delAll').hidden = !data.products.length;
  const on = data.products.filter(p => p.is_available).length;
  $('#stt').textContent = `${on} disponibles · ${data.products.length - on} agotados`;
  const cats = [...new Set(data.products.map(p => p.category))];
  fillCats(); menuStats(on, cats);
  $('#chips').innerHTML = ['', ...cats].map(c => `<button data-c="${esc(c)}" class="${c === mcat ? 'on' : ''}">${c ? esc(c) : 'Todo'}</button>`).join('');
}
const addonCount = p => (data.addons || []).filter(a => a.product_id ? String(a.product_id) === String(p.id) : a.category === p.category).length;
function renderMenu(stagger) {
  const pg = $('#pg'), q = mq.toLowerCase(), cats = [...new Set(data.products.map(p => p.category))];
  if (stagger) { pg.classList.add('stag'); setTimeout(() => pg.classList.remove('stag'), 1000); }
  let i = 0;
  pg.innerHTML = cats.filter(c => !mcat || c === mcat).map(c => {
    const rows = data.products.filter(p => p.category === c && (!q || p.name.toLowerCase().includes(q)));
    return rows.length ? `<h3>${esc(c)}</h3><div class="lst">${rows.map(p => `<div class="rw${p.is_available ? '' : ' off'}" style="--i:${i++}">
      <div class="ph" style="${p.image_url ? `background-image:url('${esc(p.image_url)}')` : ''}">${p.image_url ? '' : esc(p.name[0])}</div>
      <div class="nm"><b>${esc(p.name)}</b><small>${esc(p.category)}${addonCount(p) ? ' · ' + addonCount(p) + (addonCount(p) === 1 ? ' agregado' : ' agregados') : ''}${p.station ? (p.station === 'bar' ? ' · Barra' : ' · Cocina') : ''}${p.recommended ? ' · ★ Recomendado' : ''}</small></div>
      <label class="pi">$<input type="number" min="0" step="1" inputmode="numeric" value="${p.price}" data-id="${p.id}" aria-label="Precio de ${esc(p.name)}"></label>
      <span class="st">${p.is_available ? 'Disponible' : 'Agotado'}</span>
      <input class="sw" type="checkbox" role="switch" ${p.is_available ? 'checked' : ''} data-id="${p.id}" aria-label="Disponible: ${esc(p.name)}"><button class="del ed" data-editp="${p.id}" aria-label="Editar ${esc(p.name)}" title="Editar"><svg viewBox="0 0 24 24"><path d="M4 20h4L19 9l-4-4L4 16zM13 7l4 4"/></svg></button><button class="del" data-delp="${p.id}" aria-label="Borrar ${esc(p.name)}" title="Borrar"><svg viewBox="0 0 24 24"><path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/></svg></button></div>`).join('')}</div>` : '';
  }).join('') || `<p style="text-align:center;color:var(--mu);padding:60px 0">${data.products.length ? 'No hay productos que coincidan.' : 'Aún no hay productos. Añade el primero con el botón de arriba.'}</p>`;
}
$('#pg').addEventListener('change', async e => {
  const el = e.target, id = pid(el.dataset.id), row = el.closest('.rw'); if (id === undefined) return;
  if (el.type === 'checkbox') { row.classList.toggle('off', !el.checked); row.querySelector('.st').textContent = el.checked ? 'Disponible' : 'Agotado'; if (await api.setProduct(id, { is_available: el.checked })) toast(el.checked ? 'Plato disponible' : 'Plato marcado como agotado'); }
  else { const v = Math.max(0, Math.round(Number(el.value) || 0)); el.value = v; if (await api.setProduct(id, { price: v })) { row.classList.remove('saved'); void row.offsetWidth; row.classList.add('saved'); toast('Precio guardado · ' + clp(v)); } }
  data = await api.load(); menuMeta();
});
$('#pg').addEventListener('keydown', e => { if (e.key === 'Enter' && e.target.type === 'number') e.target.blur(); });
$('#pg').addEventListener('click', async e => {
  const ed = e.target.closest('[data-editp]'); if (ed) { editProduct(ed.dataset.editp); return; }
  const b = e.target.closest('[data-delp]'); if (!b) return;
  const p = data.products.find(x => String(x.id) === b.dataset.delp); if (!p) return;
  if (!confirm(`¿Borrar "${p.name}" de la carta?\n\nSe elimina para siempre. Si solo se acabó por hoy, usa el interruptor de Disponible.`)) return;
  await sb.from('promotions').delete().eq('restaurant_id', R.id).eq('product_id', String(p.id));
  await sb.from('product_addons').delete().eq('restaurant_id', R.id).eq('product_id', String(p.id));
  if (!await api.del('products', p.id)) return; if (p.image_url) api.dropImg(p.image_url); toast('Producto borrado'); await refresh(); renderMenu();
});
/* Borrar la carta completa (para volver a subirla sin borrar plato por plato) */
$('#delAll').onclick = async () => {
  const n = data.products.length; if (!n) return;
  if (!confirm(`¿Borrar TODA la carta (${n} ${n === 1 ? 'producto' : 'productos'})?\n\nSe eliminan también sus fotos y las promociones y agregados asociados a cada producto. No se puede deshacer.\n\nSi solo quieres actualizarla, cancela y usa "Importar con IA": no duplica lo que ya existe.`)) return;
  const t = prompt('Para confirmar, escribe BORRAR'); if (t === null) return;
  if (t.trim().toUpperCase() !== 'BORRAR') { toast('No se borró nada: había que escribir BORRAR'); return; }
  const btn = $('#delAll'); btn.disabled = true;
  try {
    const paths = data.products.map(p => { const m = String(p.image_url || '').split('/products/')[1]; return m && decodeURIComponent(m); }).filter(x => x && x.startsWith(R.id + '/'));
    await sb.from('promotions').delete().eq('restaurant_id', R.id).not('product_id', 'is', null);
    await sb.from('product_addons').delete().eq('restaurant_id', R.id).not('product_id', 'is', null);
    const { error } = await sb.from('products').delete().eq('restaurant_id', R.id);
    if (error) { toast(errMsg(error)); await refresh(); renderMenu(true); return; }
    for (let i = 0; i < paths.length; i += 100) { try { await sb.storage.from('products').remove(paths.slice(i, i + 100)); } catch (e) {} }
    mq = ''; mcat = ''; $('#q').value = '';
    await refresh(); renderMenu(true); toast('Carta borrada: ya puedes subir la nueva');
  } finally { btn.disabled = false; }
};
$('#q').oninput = e => { mq = e.target.value; renderMenu(); };
$('#chips').onclick = e => { const b = e.target.closest('button'); if (!b) return; mcat = b.dataset.c; menuMeta(); renderMenu(true); };
const GEN = ['Comida', 'Bebida', 'Alcohol', 'Postre', 'Entradas', 'Desayuno', 'Café y té', 'Menú infantil'];
function fillCats() {
  const el = $('#f-cat'), cur = el.value, own = [...new Set(data.products.map(p => p.category))].filter(c => !GEN.includes(c));
  const o = a => a.map(c => `<option>${esc(c)}</option>`).join('');
  el.innerHTML = `<option value="" disabled selected>Elige una categoría</option><optgroup label="Principales">${o(GEN)}</optgroup>${own.length ? `<optgroup label="Tus categorías">${o(own)}</optgroup>` : ''}<optgroup label="Más categorías">${o(SUGG.filter(c => !GEN.includes(c) && !own.includes(c)))}</optgroup><option value="__new">+ Otra categoría…</option>`;
  if (cur) el.value = cur;
}
$('#f-cat').onchange = e => { const n = e.target.value === '__new'; $('#f-cat2').hidden = !n; $('#f-cat2').required = n; if (n) $('#f-cat2').focus(); };
let editPid = null;
$('#add').onclick = () => { editPid = null; $('#f-title').textContent = 'Nuevo producto'; $('#f-imgl').textContent = 'Foto (opcional)'; $('#frm').reset(); fillCats(); $('#f-cat2').hidden = true; $('#f-cat2').required = false; $('#dlg').showModal(); };
function editProduct(id) {
  const p = data.products.find(x => String(x.id) === String(id)); if (!p) return;
  editPid = p.id; $('#f-title').textContent = 'Editar producto'; $('#f-imgl').textContent = 'Foto nueva (déjala vacía para mantener la actual)';
  $('#frm').reset(); fillCats();
  $('#f-name').value = p.name; $('#f-price').value = p.price; $('#f-desc').value = p.description || ''; $('#f-rec').checked = !!p.recommended;
  const sel = $('#f-cat');
  if ([...sel.options].some(o => o.value === p.category)) { sel.value = p.category; $('#f-cat2').hidden = true; $('#f-cat2').required = false; }
  else { sel.value = '__new'; $('#f-cat2').hidden = false; $('#f-cat2').required = true; $('#f-cat2').value = p.category; }
  $('#dlg').showModal();
}
$('#cancel').onclick = () => $('#dlg').close();
$('#frm').addEventListener('submit', async e => {
  const row = { name: $('#f-name').value.trim(), category: ($('#f-cat').value === '__new' ? $('#f-cat2').value : $('#f-cat').value).trim(), price: Number($('#f-price').value), description: $('#f-desc').value.trim() || null };
  if ($('#f-rec').checked || editPid != null) row.recommended = $('#f-rec').checked;   // en productos nuevos solo se manda si se marcó
  if (FILTRO.alguno(row.name, row.category, row.description)) { e.preventDefault(); toast(FILTRO.MSG); return; }   // el formulario queda abierto para corregir
  const file = $('#f-img').files[0];
  if (editPid != null) { if (await api.editProduct(editPid, row, file)) toast('Producto actualizado'); }
  else if (await api.addProduct({ ...row, is_available: true, image_url: null }, file)) toast('Producto añadido');
  await refresh(); renderMenu(true);
});
