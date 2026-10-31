/* ==============================================================
   sonido-y-pantalla-activa.js
   Pitido de aviso y mantener la pantalla encendida.
   Se usa en: cocina.html (pantalla de cocina y barra)
   ============================================================== */

function beep() {
  if (!ac) return; const notes = ST === 'bar' ? [660, 988, 1320] : [880, 1175, 880];
  try { notes.forEach((f, i) => { const o = ac.createOscillator(), g = ac.createGain(); o.frequency.value = f; o.connect(g); g.connect(ac.destination); const t = ac.currentTime + i * .22; g.gain.setValueAtTime(.35, t); g.gain.exponentialRampToValueAtTime(.001, t + .2); o.start(t); o.stop(t + .21); }); } catch (e) {}
}
async function keepAwake() { try { if (navigator.wakeLock && !document.hidden) { wl = await navigator.wakeLock.request('screen'); wl.onrelease = () => { $('#pw').className = 'pill'; $('#pw').textContent = 'Pantalla: se puede apagar'; }; $('#pw').className = 'pill ok'; $('#pw').textContent = 'Pantalla activa'; return; } } catch (e) {} $('#pw').textContent = 'Mantén la pantalla encendida'; }
