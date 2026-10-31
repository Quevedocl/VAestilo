/* ==============================================================
   sesion.js
   Inicio de sesión y registro: cada restaurante entra con su correo y contraseña.
   Se usa en: index.html (panel del restaurante)
   ============================================================== */

/* ===== SESIÓN: cada restaurante entra con su correo y contraseña ===== */
let started = false, signup = false;
async function start() {
  if (started) return;
  if (!sb) { toast('Sin conexión'); return; }
  $('#logout').hidden = false;                           // el botón de salir siempre disponible, aunque la sesión tarde en cargar
  let d; try { ({ data: d } = await Promise.race([sb.auth.getSession(), new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), 8000))])); }
  catch (e) { try { Object.keys(localStorage).filter(k => /^sb-.*-auth-token/.test(k)).forEach(k => localStorage.removeItem(k)); } catch (e2) {} d = { session: null }; }   // sesión trabada: se descarta y se pide entrar de nuevo
  if (!d.session) { $('#logout').hidden = true; $('#login').hidden = false; return; }
  const u = d.session.user; mail = u.email || '';
  try { const { data: a } = await sb.rpc('is_admin'); isAdmin = a === true; } catch (e) {}
  let { data: r } = await sb.from('restaurants').select('*').eq('owner_id', u.id).maybeSingle();
  if (!r && isAdmin) {                                   // cuenta solo de administrador: sin local propio
    $$('nav button').forEach(b => b.hidden = b.dataset.v !== 'admin'); $('#cfg').hidden = true; $('#logout').hidden = false;
    $('.brand .t').textContent = 'Administrador'; { const m = $('#mode'); m.hidden = false; m.textContent = 'Administrador'; m.className = 'opn'; m.disabled = true; } started = true; go('admin'); return;
  }
  if (!r) {
    let name = (u.user_metadata && u.user_metadata.restaurant_name) || 'Mi restaurante'; if (FILTRO.malo(name)) name = 'Mi restaurante';
    const slug = (name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'resto') + '-' + Math.random().toString(36).slice(2, 6);
    ({ data: r } = await sb.from('restaurants').insert({ name, slug, owner_id: u.id }).select().single());
  }
  if (!r) { toast('No se pudo crear el restaurante'); return; }
  R = r; setBrand(); $('#logout').hidden = false; $('#cfg').hidden = false; if (isAdmin) $('nav [data-v=admin]').hidden = false;
  started = true; api.watch(refresh); refresh();
}
const authMsg = e => { const m = (e && e.message) || '';
  if (/already registered|already been registered/i.test(m)) return 'Este correo ya está registrado. Inicia sesión.';
  if (/at least|weak/i.test(m)) return 'La contraseña debe tener al menos 6 caracteres.';
  if (/rate limit|too many|seconds/i.test(m)) return 'Demasiados intentos. Espera un momento y vuelve a intentar.';
  if (/invalid.*email|unable to validate/i.test(m)) return 'Revisa que el correo esté bien escrito.';
  return m || 'No se pudo completar. Inténtalo otra vez.'; };
$('#sw').onclick = () => { signup = !signup; $('#rn').hidden = !signup; $('#lr').required = signup; $('#lsub').textContent = signup ? 'Crear cuenta' : 'Ingresar'; $('#sw').textContent = signup ? 'Ya tengo cuenta' : 'Crear cuenta nueva'; $('#lp').autocomplete = signup ? 'new-password' : 'current-password'; $('#goForgot').hidden = signup; $('#lerr').textContent = ''; };
$('#lf').onsubmit = async e => {
  e.preventDefault(); const err = $('#lerr'); err.textContent = '';
  const email = $('#le').value.trim(), password = $('#lp').value, btn = $('#lsub'); btn.disabled = true;
  try {
    if (signup) {
      if (FILTRO.malo($('#lr').value)) { err.textContent = FILTRO.MSG; return; }
      const { data: d, error } = await sb.auth.signUp({ email, password, options: { data: { restaurant_name: $('#lr').value.trim() } } });
      if (error) { err.textContent = authMsg(error); return; }
      if (d.user && Array.isArray(d.user.identities) && d.user.identities.length === 0) { err.textContent = 'Este correo ya está registrado. Inicia sesión.'; return; }
      if (!d.session) { $('#lp').value = ''; showVerify('signup', email); return; }   // el proyecto exige verificar el correo: se pide el código
      $('#lp').value = ''; $('#login').hidden = true; confetti(); start(); return;
    }
    const { error } = await sb.auth.signInWithPassword({ email, password });
    if (error) {
      if (error.code === 'email_not_confirmed' || /not confirmed/i.test(error.message || '')) {   // se registró pero nunca verificó: se le envía un código nuevo
        const r = await sb.auth.resend({ type: 'signup', email });
        if (r.error) { err.textContent = authMsg(r.error); return; }
        $('#lp').value = ''; showVerify('signup', email); return;
      }
      err.textContent = 'Correo o contraseña incorrectos.'; return;
    }
    $('#lp').value = ''; $('#login').hidden = true; start();
  } finally { btn.disabled = false; }
};
