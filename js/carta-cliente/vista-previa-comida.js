/* ==============================================================
   vista-previa-comida.js
   Vista previa de la comida y agregados con precio.
   Se usa en: carta.html (carta que ve el cliente)
   ============================================================== */

/* ===== vista previa de la comida (+ agregados con precio) ===== */
let pv = null;
function openProd(id) {
  const p = find(id); if (!p) return;
  pv = { id: String(p.id), qty: 1, sel: new Set(), note: '' };
  const ads = addonsFor(p);
  $('#prodHero').style.backgroundImage = p.image_url ? `url('${String(p.image_url).replace(/'/g, '%27')}')` : '';
  $('#prodHero').innerHTML = `<button class="x" data-pclose aria-label="Cerrar">×</button>${p.image_url ? '' : esc((p.name || '?')[0])}`;
  $('#prodBody').innerHTML = `<h3>${esc(p.name)}</h3><div class="pp">${clp(p.price)}</div>${badge(p)}
    ${p.description ? `<p class="dsc">${esc(p.description)}</p>` : ''}
    ${ads.length ? `<h4>Agrega a tu plato (opcional)</h4>${ads.map(a => `<label class="adr"><input type="checkbox" data-ad="${esc(a.id)}"><span>${esc(a.name)}</span><b>+${clp(a.price)}</b></label>`).join('')}` : ''}
    ${!locked && p.is_available ? `<h4>¿Algún cambio? (opcional)</h4><input class="note" id="pvNote" maxlength="80" placeholder="Ej. sin cebolla, carne de soya…" aria-label="Nota para ${esc(p.name)}">` : ''}`;
  $('#prodFoot').innerHTML = locked ? '<div class="na">Escanea el QR de tu mesa para pedir</div>'
    : !p.is_available ? '<div class="na">Agotado por ahora</div>'
    : `<div class="stp"><button data-pq="-1" aria-label="Menos">−</button><b id="pvQ">1</b><button data-pq="1" aria-label="Más">+</button></div><button class="pri" id="pvAdd"></button>`;
  updPv(); $('#prodBody').scrollTop = 0; $('#prod').showModal();
}
function pvUnit() { const p = find(pv.id); return Number(p.price) + addonsFor(p).filter(a => pv.sel.has(String(a.id))).reduce((s, a) => s + Number(a.price), 0); }
function updPv() { if (!pv || !$('#pvAdd')) return; $('#pvQ').textContent = pv.qty; $('#pvAdd').textContent = 'Agregar · ' + clp(pvUnit() * pv.qty); }
$('#prod').addEventListener('click', e => {
  if (e.target.closest('[data-pclose]')) { $('#prod').close(); return; }
  const q = e.target.closest('[data-pq]'); if (q && pv) { pv.qty = Math.max(1, Math.min(MAX_QTY, pv.qty + Number(q.dataset.pq))); updPv(); return; }
  if (e.target.closest('#pvAdd') && pv) {
    const p = find(pv.id); if (!p || !p.is_available) { toast('Se agotó este plato.'); $('#prod').close(); return; }
    const ads = addonsFor(p).filter(a => pv.sel.has(String(a.id))).map(a => ({ id: a.id, name: a.name, price: Number(a.price) }));
    if (FILTRO.malo(pv.note)) { toast(FILTRO.MSG); return; }
    addLine(p, ads, pv.qty, pv.note.trim()); $('#prod').close(); toast('Agregado a tu pedido'); offerExtras(p);
  }
});
$('#prod').addEventListener('change', e => { const c = e.target.closest('[data-ad]'); if (!c || !pv) return; if (c.checked) pv.sel.add(c.dataset.ad); else pv.sel.delete(c.dataset.ad); updPv(); });
$('#prod').addEventListener('input', e => { if (e.target.id === 'pvNote' && pv) pv.note = e.target.value; });
