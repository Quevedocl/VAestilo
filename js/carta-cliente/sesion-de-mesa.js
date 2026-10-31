/* ==============================================================
   sesion-de-mesa.js
   Sesión de la mesa: al cobrar o cerrar la mesa, este teléfono deja de poder pedir.
   Se usa en: carta.html (carta que ve el cliente)
   ============================================================== */

/* ===== sesión de la mesa: al cobrar/cerrar la mesa, este teléfono deja de poder pedir ===== */
const sesKey = () => 'carta-sesion-' + TID;
/* fija en este teléfono la sesión vigente de la mesa. Devuelve 'ok', 'nueva' (visita nueva) o 'cerrada' */
function pinSession(cur, released) {
  let s = null; try { s = JSON.parse(localStorage.getItem(sesKey())); } catch (e) {}
  let r = 'nueva';
  if (s && s.sid) {
    if (s.sid === cur) r = 'ok';
    else if (cur !== released && Date.now() - s.ts <= SES_TTL) { pinned = s.sid; return 'cerrada'; }   // tenía la sesión anterior, ya cerrada (si el mesero liberó la mesa, cur === released y se entra como visita nueva)
  }
  pinned = cur;
  try { localStorage.setItem(sesKey(), JSON.stringify({ sid: cur, ts: Date.now() })); } catch (e) {}
  return r;
}
function lockUp(html) {
  if (locked) return;
  if (html) $('#lockbar').innerHTML = html;
  locked = true; document.body.classList.add('locked'); $('#lockbar').hidden = false;
  editing = null; $('#editbar').hidden = true; $('#track').hidden = true;
  cart.clear(); try { localStorage.removeItem(CART_KEY); } catch (e) {}
  ['#cart', '#call', '#prod', '#ord', '#bill', '#rec'].forEach(d => { try { $(d).close(); } catch (e) {} });
  render(); bar();
}
/* 'ok' | 'locked' | 'gone' — consulta la sesión vigente de la mesa */
async function checkSession() {
  if (!TID) return 'ok';
  if (locked) return 'locked';
  const { data: dr, error } = await sb.rpc('join_table', { p_restaurant: RID, p_table: TID }); const data = Array.isArray(dr) ? dr[0] : dr;
  if (error) return 'ok';                                  // sin red: lo decide el servidor al enviar
  if (!data) return 'gone';
  if (data.session_id !== pinned) { lockUp(); return 'locked'; }
  try { localStorage.setItem(sesKey(), JSON.stringify({ sid: pinned, ts: Date.now() })); } catch (e) {}
  return 'ok';
}
