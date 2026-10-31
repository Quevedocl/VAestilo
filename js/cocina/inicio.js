/* ==============================================================
   inicio.js
   Arranque: valida el enlace, botón "Iniciar turno" e init(). Debe cargarse al FINAL.
   Se usa en: cocina.html (pantalla de cocina y barra)
   ============================================================== */

async function init() {
  $('#gh').textContent = NAME; $('#est').textContent = NAME;
  if (!CFG.url || !UUID.test(K)) { $('#gname').textContent = 'Enlace de ' + NAME.toLowerCase() + ' inválido'; $('#gmsg').textContent = 'Pide al encargado el enlace desde Configuración > Pantalla de cocina y barra.'; return; }
  let name = null; try { name = await rpc('kitchen_info', { p_key: K }); } catch (e) { $('#gname').textContent = 'Sin conexión'; $('#gmsg').textContent = 'Revisa el internet y recarga.'; return; }
  if (!name) { $('#gname').textContent = 'Enlace desactivado'; $('#gmsg').textContent = 'Este enlace ya no sirve. Pide uno nuevo al encargado.'; return; }
  $('#rn').textContent = name; document.title = name + ' · ' + NAME; $('#gname').textContent = name; $('#gmsg').textContent = 'Al iniciar se activa el sonido de pedidos nuevos y se mantiene la pantalla encendida.'; $('#go').hidden = false;
}
$('#go').onclick = () => {
  try { ac = new (window.AudioContext || window.webkitAudioContext)(); ac.resume(); } catch (e) {}
  $('#ps').className = ac ? 'pill ok' : 'pill'; $('#ps').textContent = ac ? 'Sonido activo' : 'Sin sonido';
  started = true; keepAwake(); $('#gate').hidden = true; poll(); setInterval(poll, 4000); setInterval(render, 20000);
};
document.addEventListener('visibilitychange', () => { if (!document.hidden && started) { keepAwake(); if (ac) ac.resume(); poll(); } });
init();
