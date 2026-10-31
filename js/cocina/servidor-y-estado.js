/* ==============================================================
   servidor-y-estado.js
   Llamadas al servidor (rpc a Supabase) y variables de estado de la pantalla.
   Se usa en: cocina.html (pantalla de cocina y barra)
   ============================================================== */

async function rpc(fn, args) {
  const r = await fetch(CFG.url + '/rest/v1/rpc/' + fn, { method: 'POST', headers: { apikey: CFG.key, Authorization: 'Bearer ' + CFG.key, 'content-type': 'application/json' }, body: JSON.stringify(args) });
  if (!r.ok) throw new Error(r.status); return r.json();
}
let started = false, ac = null, wl = null, rows = [], seen = null, fresh = new Set(), dismissed = new Set(), shown = new Set(), fails = 0, busy = false, sf = '', mf = '', lastHtml = '', lastSum = '', openSet = new Set();
