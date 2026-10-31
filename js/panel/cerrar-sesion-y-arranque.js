/* ==============================================================
   cerrar-sesion-y-arranque.js
   Botón de cerrar sesión, registro del service worker y arranque (start()). Debe cargarse al FINAL.
   Se usa en: index.html (panel del restaurante)
   ============================================================== */

$('#logout').onclick = async () => {
  try { await Promise.race([sb.auth.signOut({ scope: 'local' }), new Promise(r => setTimeout(r, 2500))]); } catch (e) {}
  try { Object.keys(localStorage).filter(k => /^sb-.*-auth-token/.test(k)).forEach(k => localStorage.removeItem(k)); } catch (e) {}   // aunque falle la red, la sesión local se borra
  location.reload();
};
if ('serviceWorker' in navigator && location.protocol !== 'file:') navigator.serviceWorker.register('sw.js').catch(() => {});
start();
