/* ==============================================================
   verificacion-de-correo.js
   Código de 6 dígitos para verificar el correo al registrarse y recuperar la contraseña.
   Se usa en: index.html (panel del restaurante)
   ============================================================== */

/* ===== código de 6 dígitos: verificar correo al registrarse y recuperar contraseña ===== */
let vmode = 'signup', vmail = '', vtimer = null, vleft = 0;
function cooldown(sec) {
  clearInterval(vtimer); vleft = sec; const b = $('#vre');
  const draw = () => { b.disabled = vleft > 0; b.textContent = vleft > 0 ? `Reenviar código (${vleft}s)` : 'Reenviar código'; };
  draw(); vtimer = setInterval(() => { vleft--; draw(); if (vleft <= 0) clearInterval(vtimer); }, 1000);
}
function showVerify(mode, email) {
  vmode = mode; vmail = email;
  $('#lf').hidden = true; $('#vf').hidden = false;
  $('#vh').textContent = mode === 'recovery' ? 'Nueva contraseña' : 'Verifica tu correo';
  $('#vs').textContent = 'Escribe el código que enviamos a ' + email;
  $('#vpBox').hidden = mode !== 'recovery'; $('#vp').required = mode === 'recovery';
  $('#vsub').textContent = mode === 'recovery' ? 'Cambiar contraseña' : 'Verificar';
  $('#vc').value = ''; $('#vp').value = ''; $('#verr').textContent = '';
  cooldown(60); $('#vc').focus();
}
function hideVerify() { clearInterval(vtimer); $('#vf').hidden = true; $('#lf').hidden = false; }
$('#vc').oninput = e => { e.target.value = e.target.value.replace(/\D/g, ''); };
$('#vback').onclick = hideVerify;
$('#vre').onclick = async () => {
  const err = $('#verr'); err.textContent = '';
  const { error } = vmode === 'recovery' ? await sb.auth.resetPasswordForEmail(vmail) : await sb.auth.resend({ type: 'signup', email: vmail });
  if (error) { err.textContent = authMsg(error); return; }
  toast('Te enviamos un código nuevo'); cooldown(60);
};
$('#goForgot').onclick = async () => {
  const err = $('#lerr'), email = $('#le').value.trim(); err.textContent = '';
  if (!email) { err.textContent = 'Escribe tu correo arriba y vuelve a tocar "¿Olvidaste tu contraseña?".'; $('#le').focus(); return; }
  const b = $('#goForgot'); b.disabled = true;
  try {
    const { error } = await sb.auth.resetPasswordForEmail(email);
    if (error) { err.textContent = authMsg(error); return; }
    showVerify('recovery', email);
  } finally { b.disabled = false; }
};
$('#vf').onsubmit = async e => {
  e.preventDefault(); const err = $('#verr'); err.textContent = '';
  const token = $('#vc').value.trim(), pw = $('#vp').value, btn = $('#vsub');
  if (token.length < 6) { err.textContent = 'Escribe el código completo.'; $('#vc').focus(); return; }
  if (vmode === 'recovery' && pw.length < 6) { err.textContent = 'La contraseña debe tener al menos 6 caracteres.'; $('#vp').focus(); return; }
  btn.disabled = true;
  try {
    const { error } = await sb.auth.verifyOtp({ email: vmail, token, type: vmode === 'recovery' ? 'recovery' : 'signup' });
    if (error) { err.textContent = 'Código incorrecto o vencido. Pide uno nuevo con "Reenviar código".'; return; }
    if (vmode === 'recovery') {
      const u = await sb.auth.updateUser({ password: pw });
      if (u.error) { err.textContent = authMsg(u.error); return; }
      toast('Contraseña actualizada');
    } else confetti();
    hideVerify(); $('#login').hidden = true; start();
  } finally { btn.disabled = false; }
};
