/* ==============================================================
   configuracion-negocio.js
   Pestaña Configuración: nombre del negocio, logo, enlaces de cocina y barra.
   Se usa en: index.html (panel del restaurante)
   ============================================================== */

/* ===== CONFIGURACIÓN: nombre y logo ===== */
const initials = n => (String(n || '').trim().split(/\s+/).slice(0, 2).map(w => w[0]).join('') || '?').toUpperCase();
const avatar = (name, url) => url ? `\x3Cimg src="${esc(url)}" alt="">` : `<span>${esc(initials(name))}</span>`;
let pend = null;                                  // logo elegido sin guardar: {blob, url} | 'remove'
function setBrand() {
  const mk = $('.brand .mk');
  if (R && R.logo_url) { mk.innerHTML = `\x3Cimg src="${esc(R.logo_url)}" alt="">`; mk.classList.add('has'); mk.style.display = ''; }
  else { mk.textContent = ''; mk.classList.remove('has'); mk.style.display = 'none'; }   // sin logo del restaurante no se muestra nada (el de VAestilo queda solo como icono de la pestaña)
  $('.brand .t').textContent = R ? R.name : 'VAestilo'; hello();
  $('#susp').hidden = !(R && R.active === false); renderOpen();
}
function cfgPrev() {
  const name = $('#cfgName').value.trim() || (R && R.name) || '', url = pend === 'remove' ? null : pend ? pend.url : R && R.logo_url;
  $('#cfgAv').innerHTML = $('#pvAv').innerHTML = avatar(name, url); $('#pvName').textContent = name;
  $('#lgDel').hidden = !url;
}
function cfgFill() { loadKitchen(); pend = null; $('#cfgTipBox').hidden = !(R && 'tip_pct' in R); $('#cfgTip').value = R && R.tip_pct != null ? String(R.tip_pct) : '10'; $('#cfgName').value = R ? R.name : ''; $('#accMail').textContent = mail; cfgPrev(); }
$('#cfgName').oninput = cfgPrev;
$('#lgUp').onclick = () => $('#lgFile').click();
$('#lgDel').onclick = () => { pend = 'remove'; cfgPrev(); };
$('#cfgReset').onclick = cfgFill;
$('#logout2').onclick = () => $('#logout').click();
async function prepPhoto(file) {                   // la foto del plato se reduce a máx. 1280 px y se guarda como WebP liviano
  if (!/^image\//.test(file.type)) throw new Error('Elige una imagen (JPG, PNG o WebP).');
  if (file.size > 25 * 1024 * 1024) throw new Error('La foto es demasiado pesada.');
  const bmp = await createImageBitmap(file), k = Math.min(1, 1280 / Math.max(bmp.width, bmp.height));
  const c = document.createElement('canvas'); c.width = Math.max(1, Math.round(bmp.width * k)); c.height = Math.max(1, Math.round(bmp.height * k));
  c.getContext('2d').drawImage(bmp, 0, 0, c.width, c.height);
  const blob = await new Promise(r => c.toBlob(r, 'image/webp', .85));
  if (!blob || blob.size > 5 * 1024 * 1024) throw new Error('No se pudo procesar la foto.');
  return blob;
}
async function prepLogo(file) {                    // reduce a máx. 512 px para que cargue rápido en el celular del cliente
  if (!/^image\/(png|jpe?g|webp)$/.test(file.type)) throw new Error('Usa una imagen PNG, JPG o WebP.');
  if (file.size > 12 * 1024 * 1024) throw new Error('La imagen es demasiado pesada.');
  const bmp = await createImageBitmap(file), k = Math.min(1, 512 / Math.max(bmp.width, bmp.height));
  const c = document.createElement('canvas'); c.width = Math.max(1, Math.round(bmp.width * k)); c.height = Math.max(1, Math.round(bmp.height * k));
  c.getContext('2d').drawImage(bmp, 0, 0, c.width, c.height);
  const blob = await new Promise(r => c.toBlob(r, 'image/webp', .9));
  if (!blob || blob.size > 2 * 1024 * 1024) throw new Error('No se pudo procesar la imagen.');
  return blob;
}
$('#lgFile').onchange = async e => {
  const f = e.target.files[0]; e.target.value = ''; if (!f) return;
  try { const blob = await prepLogo(f); if (pend && pend.url) URL.revokeObjectURL(pend.url); pend = { blob, url: URL.createObjectURL(blob) }; cfgPrev(); }
  catch (err) { toast(err.message || 'No se pudo leer la imagen'); }
};
async function loadKitchen() {
  if (!R) return;
  let { data: k } = await sb.from('kitchen_access').select('key').eq('restaurant_id', R.id).maybeSingle();
  if (!k) ({ data: k } = await sb.from('kitchen_access').insert({ restaurant_id: R.id }).select('key').maybeSingle());
  $('#kLink').value = k ? new URL('cocina.html?k=' + k.key, location.href).href : ''; $('#bLink').value = k ? new URL('cocina.html?k=' + k.key + '&e=bar', location.href).href : '';
}
const copyLink = id => async () => { const v = $(id).value; if (!v) return; try { await navigator.clipboard.writeText(v); toast('Enlace copiado'); } catch (e) { $(id).select(); toast('Selecciona y copia el enlace'); } };
$('#kCopy').onclick = copyLink('#kLink'); $('#bCopy').onclick = copyLink('#bLink');
$('#kNew').onclick = async () => { if (!R || !confirm('¿Generar enlaces nuevos?\n\nLos de las tablets de cocina y barra dejarán de funcionar y tendrás que abrir los nuevos allí.')) return; const { error } = await sb.from('kitchen_access').update({ key: crypto.randomUUID() }).eq('restaurant_id', R.id); if (error) { toast('No se pudo generar el enlace'); return; } await loadKitchen(); toast('Enlaces nuevos generados'); };
$('#cfgSave').onclick = async () => {
  const name = $('#cfgName').value.trim();
  if (name.length < 2) return toast('Escribe el nombre del negocio');
  if (FILTRO.malo(name)) return toast(FILTRO.MSG);
  const btn = $('#cfgSave'); btn.disabled = true; btn.textContent = 'Guardando…';
  const old = R.logo_url || null; let logo_url = old;
  try {
    if (pend === 'remove') logo_url = null;
    else if (pend) {
      const ext = pend.blob.type === 'image/png' ? 'png' : 'webp', path = `${R.id}/logo-${Date.now()}.${ext}`;
      const up = await sb.storage.from('logos').upload(path, pend.blob, { contentType: pend.blob.type, cacheControl: '3600' });
      if (up.error) throw up.error;
      logo_url = sb.storage.from('logos').getPublicUrl(path).data.publicUrl;
    }
    const patch = { name, logo_url }; if ('tip_pct' in R) patch.tip_pct = Number($('#cfgTip').value);
    const { error } = await sb.from('restaurants').update(patch).eq('id', R.id);
    if (error) throw error;
    if (old && old !== logo_url) { const m = old.split('/logos/')[1]; if (m) sb.storage.from('logos').remove([decodeURIComponent(m)]); }
    R = { ...R, ...patch }; setBrand(); cfgFill(); toast('Cambios guardados');
  } catch (err) { toast(errMsg(err)); }
  btn.disabled = false; btn.textContent = 'Guardar cambios';
};
