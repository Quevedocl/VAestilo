/* ==============================================================
   cuenta-compartida.js
   Cuenta compartida / dividida y propina sugerida.
   Se usa en: carta.html (carta que ve el cliente)
   ============================================================== */

/* ===== cuenta compartida / dividida + propina sugerida ===== */
const uPrice = i => Number(i.price || 0) + (i.addons || []).reduce((a, x) => a + Number(x.price || 0), 0);
let bill = { mode: 'all', n: 2, claim: new Map(), tip: 10, custom: false };
function billData() {
  const all = acct.filter(o => o.status !== 'cancelled'), orders = all.filter(o => !o.paid_at), lines = []; let total = 0, gross = 0, mineTotal = 0, paidTotal = 0;
  all.filter(o => o.paid_at).forEach(o => { paidTotal += o.total != null ? Number(o.total) : (o.items || []).reduce((a, i) => a + uPrice(i) * Number(i.qty || 0), 0); });   // lo ya cobrado no entra en la cuenta
  orders.forEach(o => {
    const items = o.items || [], g = items.reduce((a, i) => a + uPrice(i) * Number(i.qty || 0), 0), t = o.total != null ? Number(o.total) : g, f = g > 0 ? t / g : 1, mn = mine.has(o.public_id);
    total += t; gross += g; if (mn) mineTotal += t;
    items.forEach((i, ix) => lines.push({ k: o.public_id + ':' + ix, name: i.name, ads: i.addons || [], qty: Number(i.qty || 0), gross: uPrice(i), net: uPrice(i) * f }));
  });
  return { orders, lines, total: Math.round(total), gross: Math.round(gross), mineTotal: Math.round(mineTotal), paidTotal: Math.round(paidTotal), nPaid: all.length - orders.length };
}
function calcBill(d) {
  let base;
  if (bill.mode === 'all' || bill.mode === 'equal') base = d.total;
  else if (bill.mode === 'mine') base = d.mineTotal;
  else base = Math.round(d.lines.reduce((a, l) => a + Math.min(bill.claim.get(l.k) || 0, l.qty) * l.net, 0));
  const tip = TIP_PCT > 0 ? Math.round(base * bill.tip / 100) : 0, grand = base + tip, n = Math.max(1, bill.n);
  return { base, tip, grand, n, per: bill.mode === 'equal' ? Math.ceil(grand / n) : grand };
}
function resHTML(d) {
  const c = calcBill(d), eq = bill.mode === 'equal';
  return `<div class="rr"><span>${bill.mode === 'all' ? 'Consumo de la mesa' : eq ? 'Consumo de la mesa' : 'Tu consumo'}</span><b>${clp(c.base)}</b></div>
    ${c.tip ? `<div class="rr"><span>Propina ${bill.tip}%</span><b>${clp(c.tip)}</b></div>` : ''}
    ${eq ? `<div class="rr"><span>Total mesa</span><b>${clp(c.grand)}</b></div><div class="big"><span>Cada uno (${c.n})</span><b>${clp(c.per)}</b></div>${c.per * c.n !== c.grand ? `<small>Redondeado hacia arriba: ${clp(c.per * c.n - c.grand)} de más quedan como propina.</small>` : ''}`
    : `<div class="big"><span>${bill.mode === 'all' ? 'Total a pagar' : 'Tu parte'}</span><b>${clp(c.grand)}</b></div>`}`;
}
function updateRes(d) {
  d = d || billData(); const el = $('#billRes'); if (el) el.innerHTML = resHTML(d);
  const c = calcBill(d); $('#billPay').textContent = c.per > 0 ? 'Avisar al mesero para pagar · ' + clp(c.per) : 'Avisar al mesero para pagar'; $('#billPay').disabled = c.per <= 0;
}
function renderBill() {
  const d = billData(), body = $('#billBody');
  if (!d.orders.length) { body.innerHTML = d.nPaid ? `<div class="bl"><div class="tt"><span>Ya pagado ✓</span><span>${clp(d.paidTotal)}</span></div></div><p class="empt">No tienes nada pendiente por pagar. Si piden algo más, aparecerá aquí.</p>` : '<p class="empt">Aún no hay pedidos en tu mesa.</p>'; $('#billFoot').hidden = true; return; }
  $('#billFoot').hidden = false;
  const grp = new Map();
  d.lines.forEach(l => { const k = l.name + '|' + l.ads.map(a => a.name).join(',') + '|' + l.gross, g = grp.get(k) || { ...l, qty: 0 }; g.qty += l.qty; grp.set(k, g); });
  const list = [...grp.values()].map(l => `<div><span>${l.qty}× ${esc(l.name)}${l.ads.length ? `<small>+ ${l.ads.map(a => esc(a.name)).join(', + ')}</small>` : ''}</span><span>${clp(l.gross * l.qty)}</span></div>`).join('');
  const disc = Math.max(0, d.gross - d.total);
  const modes = [['all', 'Toda la cuenta'], ['equal', 'Partes iguales'], ['mine', 'Solo lo mío'], ['items', 'Por producto']];
  let pnl = '';
  if (bill.mode === 'equal') pnl = `<div class="pnl"><div class="rw"><span><b>¿Entre cuántas personas?</b></span><div class="stp"><button data-n="-1" aria-label="Menos personas">−</button><b>${bill.n}</b><button data-n="1" aria-label="Más personas">+</button></div></div></div>`;
  else if (bill.mode === 'mine') pnl = `<div class="pnl"><p>${d.orders.some(o => mine.has(o.public_id)) ? 'Suma solo los pedidos que enviaste desde este celular.' : 'Aún no has enviado pedidos desde este celular.'}</p></div>`;
  else if (bill.mode === 'items') pnl = `<div class="pnl"><p style="margin-bottom:6px">Marca lo que consumiste tú. Cada persona elige lo suyo desde su celular y todos ven la misma cuenta.</p>${d.lines.map(l => { const n = Math.min(bill.claim.get(l.k) || 0, l.qty); return `<div class="clr"><div class="nm"><b>${esc(l.name)}</b><small>${l.ads.length ? '+ ' + l.ads.map(a => esc(a.name)).join(', + ') + ' · ' : ''}${clp(Math.round(l.net))} c/u</small></div><div class="stp"><button data-cd="${esc(l.k)}" aria-label="Quitar uno">−</button><b>${n}/${l.qty}</b><button data-ci="${esc(l.k)}" aria-label="Agregar uno">+</button></div></div>`; }).join('')}</div>`;
  const vals = [...new Set([0, TIP_PCT, TIP_PCT + 5, TIP_PCT + 10])];
  const tips = TIP_PCT > 0 ? `<h4>Propina sugerida</h4><div class="tips">${vals.map(v => `<button data-tip="${v}" class="${!bill.custom && bill.tip === v ? 'on' : ''}">${v ? v + '%' : 'Sin propina'}${v === TIP_PCT ? '<small>sugerida</small>' : ''}</button>`).join('')}<button data-tip="custom" class="${bill.custom ? 'on' : ''}">Otro</button></div><div id="tipRow" ${bill.custom ? '' : 'hidden'}><input id="tipIn" type="number" min="0" max="100" inputmode="numeric" value="${bill.tip}" aria-label="Porcentaje de propina"> <span>%</span></div>` : '';
  body.innerHTML = `<div class="bl">${list}${disc ? `<div class="ds2"><span>Descuentos y promociones</span><span>−${clp(disc)}</span></div>` : ''}<div class="tt"><span>${d.nPaid ? 'Saldo por pagar' : 'Consumo de la mesa'}</span><span>${clp(d.total)}</span></div></div>${d.nPaid ? `<p style="margin:8px 2px 0;color:var(--mu);font-size:13px">✓ Ya pagado antes: ${clp(d.paidTotal)} · no se vuelve a cobrar</p>` : ''}
    <h4>¿Cómo quieren pagar?</h4><div class="seg2" id="bmode">${modes.map(([m, l]) => `<button data-m="${m}" class="${bill.mode === m ? 'on' : ''}">${l}</button>`).join('')}</div>${pnl}${tips}<div class="res" id="billRes"></div>`;
  $('#billErr').hidden = true; updateRes(d);
}
function openBill() { recBillAsked = false; bill.tip = bill.custom ? bill.tip : TIP_PCT; renderBill(); $('#bill').showModal(); refreshAccount(true); }
$('#billOpen').onclick = openBill;
$('#billClose').onclick = () => $('#bill').close();
$('#billBody').addEventListener('click', e => {
  const m = e.target.closest('[data-m]'), n = e.target.closest('[data-n]'), t = e.target.closest('[data-tip]'), ci = e.target.closest('[data-ci]'), cd = e.target.closest('[data-cd]');
  if (m) { bill.mode = m.dataset.m; renderBill(); }
  else if (n) { bill.n = Math.max(2, Math.min(20, bill.n + Number(n.dataset.n))); renderBill(); }
  else if (t) { if (t.dataset.tip === 'custom') bill.custom = true; else { bill.custom = false; bill.tip = Number(t.dataset.tip); } renderBill(); if (bill.custom) $('#tipIn').focus(); }
  else if (ci || cd) {
    const k = (ci || cd).dataset.ci || (cd && cd.dataset.cd), l = billData().lines.find(x => x.k === k); if (!l) return;
    bill.claim.set(k, Math.max(0, Math.min(l.qty, (bill.claim.get(k) || 0) + (ci ? 1 : -1)))); renderBill();
  }
});
$('#billBody').addEventListener('input', e => { if (e.target.id !== 'tipIn') return; bill.tip = Math.max(0, Math.min(100, Math.round(Number(e.target.value) || 0))); updateRes(); });
$('#billPay').onclick = async () => {
  const d = billData(), c = calcBill(d), btn = $('#billPay'), er = $('#billErr'); er.hidden = true;
  if (!recBillAsked) {                            // "¿Desea agregar …?" antes de avisar al mesero para pagar
    const r = await askRec('bill'); if (r === 'cancel') return;
    if (r !== 'none') recBillAsked = true;
    if (r === 'added') { $('#bill').close(); renderCart(); $('#cart').showModal(); toast('Agregado a tu pedido. Envíalo para sumarlo a la cuenta.'); return; }
  }
  const how = { all: 'Pagan toda la cuenta', equal: `Cuenta dividida en ${c.n}`, mine: 'Pago solo mis pedidos', items: 'Pago por producto' }[bill.mode];
  const note = `${how}: ${bill.mode === 'equal' ? clp(c.per) + ' c/u' : clp(c.grand)}${c.tip ? ' (propina ' + bill.tip + '% incluida)' : ' (sin propina)'}`;
  btn.disabled = true; const old = btn.textContent; btn.textContent = 'Avisando…';
  const r = await postCall(mesa, 'pay', note);
  btn.disabled = false; btn.textContent = old;
  if (r.locked) return;
  if (r.err) { er.textContent = r.err; er.hidden = false; return; }
  toast(r.dup ? 'Ya avisamos: un mesero viene en camino.' : 'Mesero avisado: irá a tu mesa a cobrarte.');
};
