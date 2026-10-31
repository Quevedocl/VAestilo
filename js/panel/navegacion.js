/* ==============================================================
   navegacion.js
   Navegación entre pestañas y la función start() que arranca el panel.
   Se usa en: index.html (panel del restaurante)
   ============================================================== */

/* ===== NAVEGACIÓN Y ARRANQUE ===== */
const VORDER = ['orders', 'calls', 'menu', 'promos', 'addons', 'tables', 'revenue', 'settings', 'admin']; let lastView = 'orders';
function animateView(v, prev) {      // animación suave al cambiar de pestaña (se omite si el sistema pide menos movimiento)
  const el = document.getElementById(v); if (!el || reduced) return;
  [...el.children].forEach((c, i) => c.style.setProperty('--i', Math.min(i, 7)));
  $$('main > .view.vin').forEach(x => x.classList.remove('vin')); void el.offsetWidth; el.classList.add('vin');   // la clase se queda hasta el próximo cambio para que no se repita la animación antigua
}
const navEl = document.querySelector('header nav'), pill = document.createElement('i'); pill.id = 'navpill'; navEl.prepend(pill);
function placePill() {      // coloca la píldora bajo la pestaña activa (si no hay ninguna activa, se oculta)
  const on = navEl.querySelector('button.on:not([hidden])');
  if (!on || !on.offsetWidth) { pill.classList.remove('ready'); navEl.classList.remove('hp'); return; }
  pill.style.width = on.offsetWidth + 'px'; pill.style.transform = 'translateX(' + on.offsetLeft + 'px)';
  navEl.classList.add('hp'); if (!pill.classList.contains('ready')) requestAnimationFrame(() => requestAnimationFrame(() => pill.classList.add('ready')));
}
addEventListener('resize', placePill); addEventListener('load', placePill); if (window.ResizeObserver) new ResizeObserver(placePill).observe(navEl);
function go(v) {
  const prevView = lastView; lastView = v;
  view = v;
  const nv = (v === 'addons' || v === 'promos') ? 'menu' : v;
  $$('nav button').forEach(x => x.classList.toggle('on', x.dataset.v === nv)); $('#cfg').classList.toggle('on', v === 'settings');
  $('#subnav').hidden = nv !== 'menu'; $$('#subnav [data-go]').forEach(x => { const on = x.dataset.go === v; x.classList.toggle('on', on); x.setAttribute('aria-selected', on); });
  $$('main > .view').forEach(x => x.hidden = x.id !== v);
  if (prevView && prevView !== v) animateView(v, prevView);
  placePill();
  if (v === 'menu') { menuMeta(); renderMenu(true); }
  if (v === 'settings') cfgFill();
  if (v === 'admin') loadAdmin();
  if (v === 'addons') renderAddons();
  if (v === 'revenue') { $('#rvDay').value = revDay; $('#rvDay').max = dayStr(new Date()); loadRevenue(); }
}
$$('nav button').forEach(b => b.onclick = () => go(b.dataset.v));
$$('#subnav [data-go]').forEach(b => b.onclick = () => go(b.dataset.go));
$('#cfg').onclick = () => go('settings');
