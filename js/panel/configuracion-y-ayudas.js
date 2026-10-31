/* ==============================================================
   configuracion-y-ayudas.js
   Lee la configuración de Supabase (config.js) y define funciones de ayuda: $, $$, esc (escapar HTML), clp (precio en pesos).
   Se usa en: index.html (panel del restaurante)
   ============================================================== */

/* ===== CONFIGURACIÓN: la URL y la clave pública de Supabase se editan en config.js (la seguridad la dan las políticas RLS y el login del personal) ===== */
const CFG = window.FOGON || { url: '', key: '' };

const $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)];
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const clp = n => '$' + Number(n).toLocaleString('es-CL');
const pid = v => isNaN(v) ? v : Number(v);
const errMsg = e => /column .*(station|recommended)|(station|recommended).*(schema cache|column)/i.test((e && e.message) || '') ? 'Falta ejecutar supabase/migracion-11-reparto-automatico.sql en Supabase (SQL Editor).' : /row-level security|permission denied|JWT|not authenticated/i.test((e && e.message) || '') ? 'Tu sesión venció o no tiene permiso. Cierra sesión, vuelve a entrar e inténtalo de nuevo.' : /mesa_duplicada/.test((e && e.message) || '') ? 'Ya existe una mesa con ese nombre.' : /texto_no_permitido/.test((e && e.message) || '') ? FILTRO.MSG : 'No se pudo guardar: ' + ((e && e.message) || e);
let tt; const toast = m => { const t = $('#toast'), host = document.querySelector('dialog[open]') || document.body; if (t.parentNode !== host) host.appendChild(t); t.textContent = m; t.classList.add('on'); clearTimeout(tt); tt = setTimeout(() => t.classList.remove('on'), 1800); };
