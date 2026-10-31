/* ==============================================================
   configuracion-y-ayudas.js
   Lee la configuración de Supabase (config.js) y define funciones de ayuda.
   Se usa en: carta.html (carta que ve el cliente)
   ============================================================== */

/* ===== CONFIGURACIÓN: mismo proyecto Supabase que el panel (se edita en config.js) ===== */
const CFG = window.FOGON || { url: '', key: '' };
let NOMBRE = 'Carta', RID = null, TID = null, TIP_PCT = 10;
let pinned = null, locked = false;            // sesión de la mesa que este teléfono tiene asignada
const SES_TTL = 6 * 3600e3;                   // si este teléfono no visitó la mesa en 6 h, se considera una visita nueva
const MAX_QTY = 20;

const $ = s => document.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const clp = n => '$' + Number(n).toLocaleString('es-CL');
/* el aviso se muestra dentro del diálogo abierto (si no, un <dialog> lo taparía) */
let tt; const toast = m => {
  const t = $('#toast'), host = document.querySelector('dialog[open]') || document.body;
  if (t.parentNode !== host) host.appendChild(t);
  t.textContent = m; t.classList.add('on'); clearTimeout(tt); tt = setTimeout(() => t.classList.remove('on'), 2600);
};
function uuid() {
  if (crypto.randomUUID) return crypto.randomUUID();
  const b = crypto.getRandomValues(new Uint8Array(16)); b[6] = b[6] & 15 | 64; b[8] = b[8] & 63 | 128;
  const h = [...b].map(x => x.toString(16).padStart(2, '0'));
  return `${h.slice(0, 4).join('')}-${h.slice(4, 6).join('')}-${h.slice(6, 8).join('')}-${h.slice(8, 10).join('')}-${h.slice(10).join('')}`;
}
['#cart', '#prod', '#ord', '#bill', '#call', '#rec'].forEach(d => $(d).addEventListener('click', e => { if (e.target === $(d)) $(d).close(); }));
