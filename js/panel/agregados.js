/* ==============================================================
   agregados.js
   Agregados con precio (extras que el cliente puede sumar a un plato).
   Se usa en: index.html (panel del restaurante)
   ============================================================== */

/* ===== AGREGADOS CON PRECIO ===== */
const scopeOf = a => a.product_id ? 'Solo en: ' + pname(a.product_id) : 'En todos los productos de: ' + a.category;
function renderAddons() {
  const list = data.addons || [];
  $('#al').innerHTML = list.length ? `<div class="lst">${list.map(a => `<div class="rw3${a.is_available ? '' : ' off'}"><div class="nm"><b>${esc(a.name)}</b><small>${esc(scopeOf(a))}</small></div><label class="pi">+$<input type="number" min="0" step="1" inputmode="numeric" value="${a.price}" data-aid="${a.id}" aria-label="Precio de ${esc(a.name)}"></label><input class="sw" type="checkbox" role="switch" ${a.is_available ? 'checked' : ''} data-aid="${a.id}" aria-label="Disponible: ${esc(a.name)}"><button class="del" data-del="product_addons" data-id="${a.id}" aria-label="Borrar ${esc(a.name)}" title="Borrar"><svg viewBox="0 0 24 24"><path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/></svg></button></div>`).join('')}</div>` : '<p class="empty">Aún no hay agregados. Crea el primero (queso extra, tocino, salsa…).</p>';
}
$('#al').addEventListener('change', async e => {
  const el = e.target, id = el.dataset.aid; if (!id) return;
  if (el.type === 'checkbox') { el.closest('.rw3').classList.toggle('off', !el.checked); await api.upd('product_addons', id, { is_available: el.checked }); toast(el.checked ? 'Agregado disponible' : 'Agregado desactivado'); }
  else { const v = Math.max(0, Math.round(Number(el.value) || 0)); el.value = v; await api.upd('product_addons', id, { price: v }); toast('Precio guardado · ' + clp(v)); }
  data = await api.load();
});
$('#al').addEventListener('keydown', e => { if (e.key === 'Enter' && e.target.type === 'number') e.target.blur(); });
const adForm = () => { const c = $('#a-scope').value === 'category'; $('#a-prod').hidden = c; $('#a-cat').hidden = !c; };
$('#a-scope').onchange = adForm;
$('#newad').onclick = () => {
  if (!data.products.length) return toast('Primero añade productos a la carta');
  $('#a-name').value = $('#a-price').value = ''; $('#a-scope').value = 'product'; adForm();
  $('#a-pid').innerHTML = data.products.map(p => `<option value="${esc(p.id)}">${esc(p.name)}</option>`).join('');
  $('#a-cid').innerHTML = [...new Set(data.products.map(p => p.category))].map(c => `<option>${esc(c)}</option>`).join('');
  $('#ad').showModal();
};
$('#a-cancel').onclick = () => $('#ad').close();
$('#a-save').onclick = async () => {
  const name = $('#a-name').value.trim(), raw = $('#a-price').value, price = Math.round(Number(raw)), cat = $('#a-scope').value === 'category';
  if (!name) return toast('Escribe el nombre del agregado');
  if (FILTRO.malo(name)) return toast(FILTRO.MSG);
  if (raw === '' || !(price >= 0)) return toast('Escribe el precio extra (0 si es gratis)');
  if (!await api.add('product_addons', { name, price, product_id: cat ? null : String($('#a-pid').value), category: cat ? $('#a-cid').value : null, is_available: true })) return;
  $('#ad').close(); toast('Agregado creado'); await refresh();
};
