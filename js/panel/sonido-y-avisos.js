/* ==============================================================
   sonido-y-avisos.js
   Sonidos de alerta (pedido nuevo, llamada, cancelado) y avisos en pantalla.
   Se usa en: index.html (panel del restaurante)
   ============================================================== */

/* ===== SONIDO Y AVISOS ===== */
/* El navegador solo deja sonar audio después de que alguien toca la pantalla una vez: por eso se "desbloquea" con el primer toque */
function audio() { try { ctx = ctx || new (window.AudioContext || window.webkitAudioContext)(); if (ctx.state === 'suspended') ctx.resume(); } catch (e) {} return ctx; }
const SND_ON = '<path d="M4 9v6h4l5 4V5L8 9zM16 9a4 4 0 010 6"/>', SND_OFF = '<path d="M4 9v6h4l5 4V5L8 9zM17 9l4 6M21 9l-4 6"/>';
const sndNeeds = () => soundOn && (!ctx || ctx.state !== 'running');     // activado, pero el navegador aún no deja sonar
function syncSnd() {
  const b = $('#snd'), need = sndNeeds();
  b.setAttribute('aria-pressed', soundOn && !need); b.classList.toggle('need', need);
  b.querySelector('svg').innerHTML = soundOn ? SND_ON : SND_OFF;
  const t = !soundOn ? 'Sonido desactivado · toca para activar' : need ? 'Toca para activar el sonido de los avisos' : 'Sonido activado · toca para silenciar';
  b.title = t; b.setAttribute('aria-label', t);
}
let sndFx = null;
function sndChain(c) {      // eco suave (como una sala pequeña) para que las notas suenen redondas y no secas
  if (sndFx && sndFx.c === c) return sndFx.i;
  const i = c.createGain(), d = c.createDelay(), fb = c.createGain(), lp = c.createBiquadFilter(), w = c.createGain();
  d.delayTime.value = .19; fb.gain.value = .3; lp.type = 'lowpass'; lp.frequency.value = 2200; w.gain.value = .32;
  i.connect(c.destination); i.connect(d); d.connect(lp); lp.connect(fb); fb.connect(d); lp.connect(w); w.connect(c.destination);
  sndFx = { c, i }; return i;
}
function tones(seq, vol = .7) {                       // seq: [[frecuencia, inicio, duración], …] · notas suaves tipo marimba/cristal: ataque tenue, pocos armónicos y cola con eco
  const c = audio(); if (!c) return; const t0 = c.currentTime + .02, out = sndChain(c);
  const PARC = [[1, 1, 1], [2, .2, .55], [3, .06, .3]];   // [múltiplo de frecuencia, volumen, fracción de la duración]
  const total = PARC.reduce((a, p) => a + p[1], 0);
  seq.forEach(([f, at, d, v2 = 1]) => PARC.forEach(([m, v, k]) => {
    const o = c.createOscillator(), g = c.createGain(), dur = d * k, pk = vol * v2 * v / total;
    o.type = 'sine'; o.frequency.value = f * m;
    g.gain.setValueAtTime(0.0001, t0 + at); g.gain.exponentialRampToValueAtTime(pk, t0 + at + .02); g.gain.exponentialRampToValueAtTime(.0005, t0 + at + dur);
    o.connect(g).connect(out); o.start(t0 + at); o.stop(t0 + at + dur + .05);
  }));
}
/* sonidos suaves y agradables (más graves y sin timbres agudos):
   pedido nuevo = arpegio ascendente do-mi-sol (una vez completo y un eco más bajito) · llamada al mesero = "din-don" amable dos veces
   pedido cancelado = dos notas que bajan con calma · pedido modificado = dos toques suaves */
function beep(kind) {
  if (!soundOn) return;
  if (kind === 'call') tones([[784, 0, .9], [587, .38, 1.1], [784, 1.5, .9, .8], [587, 1.88, 1.2, .8]]);
  else if (kind === 'cancel') tones([[659, 0, .8], [523, .3, 1.2]]);
  else if (kind === 'mod') tones([[880, 0, .6], [1047, .2, .9]]);
  else tones([[523, 0, .9], [659, .16, .9], [784, .32, 1.3], [523, 1.6, .9, .55], [659, 1.76, .9, .55], [784, 1.92, 1.3, .55]]);
  setTimeout(syncSnd, 300);
}
try { soundOn = localStorage.getItem('cmd-sound') !== '0'; } catch (e) { soundOn = true; }   // activado por defecto; se recuerda la elección
['pointerdown', 'keydown', 'touchstart'].forEach(ev => addEventListener(ev, () => { if (soundOn) { audio(); syncSnd(); } }, { passive: true }));
$('#snd').onclick = () => { if (sndNeeds()) { audio(); beep(); setTimeout(syncSnd, 200); toast('Sonido activado'); return; } soundOn = !soundOn; try { localStorage.setItem('cmd-sound', soundOn ? '1' : '0'); } catch (e) {} syncSnd(); toast(soundOn ? 'Sonido activado' : 'Sonido desactivado'); if (soundOn) beep(); };
syncSnd();
let bt;
function alertInfo(msg, kind) {
  beep(kind); const b = $('#bn'); b.textContent = msg;
  b.classList.add('on'); clearTimeout(bt); bt = setTimeout(() => b.classList.remove('on'), 4500);
}
/* el cliente canceló o modificó su pedido desde el celular */
function orderEvent(p) {
  if (!p || p.table !== 'orders' || p.eventType !== 'UPDATE') return;
  const n = p.new || {}; if (!n.id) return;
  if (n.status === 'cancelled') { alertInfo(`Pedido cancelado por el cliente · ${tn(n)}`, 'cancel'); return; }
  const el = map.get(n.id);
  if (el && n.modified_at && n.modified_at !== el._mod) alertInfo(`Pedido modificado · ${tn(n)}`, 'mod');
}
function alertNew(list) {
  beep(); const b = $('#bn');
  b.textContent = list.length > 1 ? `${list.length} pedidos nuevos` : `Nuevo pedido · ${tn(list[0])}`;
  b.classList.add('on'); clearTimeout(bt); bt = setTimeout(() => b.classList.remove('on'), 3500);
}
