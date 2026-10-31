/* ==============================================================
   estacion-y-llave.js
   Configuración, ayudas ($, esc), estación (cocina o barra, ?e=bar) y llave del enlace (?k=).
   Se usa en: cocina.html (pantalla de cocina y barra)
   ============================================================== */

const CFG = window.FOGON || {}, $ = s => document.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const QS = new URLSearchParams(location.search);
// ?k=<llave>&e=bar → pantalla de barra · ?k=<llave> → cocina.
// La estación se queda en la URL (?e=bar) y la llave se guarda POR ESTACIÓN, así cocina y barra no se pisan aunque estén en el mismo equipo.
const ST = QS.get('e') === 'bar' ? 'bar' : 'kitchen', SK = 'kepasa-cocina-' + ST;
let K = (QS.get('k') || '').trim();
if (K) { try { localStorage.setItem(SK, K); } catch (e) {} }
else { try { K = localStorage.getItem(SK) || (ST === 'kitchen' ? localStorage.getItem('kepasa-cocina') || '' : ''); } catch (e) {} }
if (QS.get('k')) history.replaceState(null, '', location.pathname + (ST === 'bar' ? '?e=bar' : ''));   // la llave no queda en la barra ni en el historial; la estación sí
const NAME = ST === 'bar' ? 'Barra' : 'Cocina';
