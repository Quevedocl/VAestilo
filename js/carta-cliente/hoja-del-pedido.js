/* ==============================================================
   hoja-del-pedido.js
   Hoja (ventana deslizante) del pedido.
   Se usa en: carta.html (carta que ve el cliente)
   ============================================================== */

/* ===== hoja del pedido ===== */
function renderCart() {
  const lines = [...cart.values()];
  if (!lines.length) { $('#cart').close(); return; }
  $('#ct').textContent = editing ? 'Modificar pedido' : 'Tu pedido';
  $('#lines').innerHTML = lines.map(l => `<li data-k="${esc(l.key)}">
    <div class="l1"><div class="nm"><b>${esc(l.name)}</b>${l.addons.length ? `<small class="ads">+ ${l.addons.map(a => esc(a.name) + ' (' + clp(a.price) + ')').join(', + ')}</small>` : ''}<small>${clp(unit(l) * l.qty)}</small></div>
    <div class="stp"><button data-a="dec" aria-label="Quitar uno de ${esc(l.name)}">−</button><b>${l.qty}</b><button data-a="inc" aria-label="Agregar uno de ${esc(l.name)}">+</button></div></div>
    <input class="note" maxlength="80" placeholder="Nota (ej. sin cebolla)" value="${esc(l.note)}" aria-label="Nota para ${esc(l.name)}"></li>`).join('');
  const dm = discounts();
  $('#sm').innerHTML = [...dm.values()].map(x => `<div><span>${esc(x.title)}</span><span>−${clp(x.d)}</span></div>`).join('');
  $('#tot').textContent = clp(total());
  $('#send').textContent = (editing ? 'Guardar cambios · ' : 'Enviar pedido · ') + clp(total());
  $('#mz').hidden = !!mesa;
  if (!mesa && !$('#mesaIn').value) $('#mesaIn').value = lastMesa;
}
$('#open').onclick = () => { $('#err').textContent = ''; renderCart(); $('#cart').showModal(); };
$('#close').onclick = () => $('#cart').close();
$('#lines').addEventListener('click', e => {
  const b = e.target.closest('[data-a]'); if (!b) return;
  change(b.closest('li').dataset.k, b.dataset.a === 'inc' ? 1 : -1);
});
$('#lines').addEventListener('input', e => {
  if (!e.target.classList.contains('note')) return;
  const l = cart.get(e.target.closest('li').dataset.k); if (l) { l.note = e.target.value; saveCart(); }
});
