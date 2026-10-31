/* ==============================================================
   tiempos.js
   Cálculo del tiempo transcurrido y de su color (verde, amarillo, rojo).
   Se usa en: cocina.html (pantalla de cocina y barra)
   ============================================================== */

const mins = c => Math.max(0, Math.floor((Date.now() - new Date(c)) / 60000));
const dClass = o => o.status === 'cancelled' || o.status === 'ready' ? '' : (m => m >= 20 ? ' d-r' : m >= 10 ? ' d-y' : ' d-g')(mins(o.created_at));
const agoTxt = m => m < 1 ? 'Recién' : m < 60 ? m + ' min' : Math.floor(m / 60) + ' h ' + m % 60 + ' min';
