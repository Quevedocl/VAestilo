/* ==============================================================
   promociones.js
   Promociones de la carta.
   Se usa en: index.html (panel del restaurante)
   ============================================================== */

/* ===== PROMOCIONES ===== */
const live = x => x.is_active && (!x.ends_on || x.ends_on >= new Date().toISOString().slice(0, 10));
const pname = id => (data.products.find(p => String(p.id) === String(id)) || {}).name || 'producto eliminado';
const promoDesc = x => x.type === 'nxm' ? `${x.buy_qty}x${x.pay_qty} en ${pname(x.product_id)}` : x.type === 'percent' ? `${x.value}% de descuento en ${pname(x.product_id)}` : x.type === 'price' ? `${pname(x.product_id)} a ${clp(x.value)}` : 'Aviso informativo';
function renderPromos() {
  $('#pl').innerHTML = data.promos.length ? `<div class="lst">${data.promos.map(x => `<div class="rw2"><div class="nm"><b>${esc(x.title)}</b><small>${esc(promoDesc(x))}${x.ends_on ? ' · hasta ' + esc(x.ends_on) : ''}${live(x) ? '' : ' · inactiva'}</small></div><input class="sw" type="checkbox" role="switch" ${x.is_active ? 'checked' : ''} data-id="${x.id}" aria-label="Activa"><button class="gh" data-del="promotions" data-id="${x.id}">Borrar</button></div>`).join('')}</div>` : '<p class="empty">Aún no hay promociones. Crea la primera (2x1, 3x2, % de descuento…).</p>';
}
const pform = () => { const t = $('#p-type').value; $('#p-prod').hidden = t === 'info'; $('#p-nxm').hidden = t !== 'nxm'; $('#p-val').hidden = !(t === 'percent' || t === 'price'); $('#p-vl').textContent = t === 'percent' ? 'Descuento (%)' : 'Precio promocional ($)'; };
$('#p-type').onchange = pform;
$('#newpromo').onclick = () => { $('#p-title').value = $('#p-end').value = $('#p-v').value = ''; $('#p-pid').innerHTML = data.products.map(p => `<option value="${esc(p.id)}">${esc(p.name)}</option>`).join(''); pform(); $('#pd').showModal(); };
$('#p-cancel').onclick = () => $('#pd').close();
$('#p-save').onclick = async () => {
  const t = $('#p-type').value, buy = +$('#p-buy').value, pay = +$('#p-pay').value, v = +$('#p-v').value, title = $('#p-title').value.trim();
  if (t !== 'info' && !$('#p-pid').value) return toast('Elige un producto');
  if (t === 'nxm' && !(buy > pay && pay >= 1)) return toast('"Lleva" debe ser mayor que "Paga"');
  if ((t === 'percent' || t === 'price') && !(v > 0 && (t === 'price' || v <= 100))) return toast('Revisa el valor');
  if (t === 'info' && !title) return toast('Escribe el aviso');
  if (FILTRO.malo(title)) return toast(FILTRO.MSG);
  const row = { type: t, product_id: t === 'info' ? null : $('#p-pid').value, buy_qty: t === 'nxm' ? buy : null, pay_qty: t === 'nxm' ? pay : null, value: t === 'percent' || t === 'price' ? v : null, ends_on: $('#p-end').value || null, is_active: true };
  row.title = title || promoDesc(row);
  if (!await api.add('promotions', row)) return;
  $('#pd').close(); toast('Promoción creada'); await refresh();
};
$('#pl').addEventListener('change', async e => { await api.upd('promotions', e.target.dataset.id, { is_active: e.target.checked }); await refresh(); });
