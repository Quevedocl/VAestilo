/* ==============================================================
   efectos-visuales.js
   Efectos visuales: ondas al tocar, confeti, animación de números.
   Se usa en: index.html (panel del restaurante)
   ============================================================== */

/* ===== EFECTOS VISUALES ===== */
function countTo(el, to, fmt = clp, ms = 800) {            // número que "corre" hasta su valor nuevo
  if (!el) return; const from = Number(el.dataset.v || 0); el.dataset.v = to;
  if (reduced || from === to) { el.textContent = fmt(to); return; }
  cancelAnimationFrame(el._raf); const t0 = performance.now();
  const step = t => { const k = Math.min(1, (t - t0) / ms), e = 1 - Math.pow(1 - k, 3); el.textContent = fmt(Math.round(from + (to - from) * e)); if (k < 1) el._raf = requestAnimationFrame(step); };
  el._raf = requestAnimationFrame(step);
}
function confetti(x = innerWidth / 2, y = 90) {
  if (reduced) return; const cols = ['#9DB8A8', '#C9D9CF', '#E3C98B', '#9FB6CF', '#D8B4B0'];
  for (let i = 0; i < 26; i++) {
    const c = document.createElement('i'), a = Math.random() * Math.PI * 2, d = 90 + Math.random() * 170; c.className = 'cf';
    c.style.cssText = `left:${x}px;top:${y}px;background:${cols[i % cols.length]};--dx:${Math.cos(a) * d}px;--dy:${Math.sin(a) * d + 120}px;--r:${Math.random() * 720 - 360}deg`;
    document.body.appendChild(c); setTimeout(() => c.remove(), 1400);
  }
}
document.addEventListener('pointerdown', e => {            // onda al tocar un botón
  const b = e.target.closest('.pri,.gh,.go,.seg button'); if (!b || b.disabled || reduced) return;
  const r = b.getBoundingClientRect(), s = Math.max(r.width, r.height) * 2, i = document.createElement('span');
  i.className = 'rip'; i.style.cssText = `width:${s}px;height:${s}px;left:${e.clientX - r.left - s / 2}px;top:${e.clientY - r.top - s / 2}px`;
  b.appendChild(i); setTimeout(() => i.remove(), 650);
});
