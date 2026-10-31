/* ==============================================================
   estado.js
   Variables de estado del panel (pedido abierto, filtros, etc.).
   Se usa en: index.html (panel del restaurante)
   ============================================================== */

/* ===== ESTADO ===== */
let addonsWarned = false;
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
let data = { products: [], orders: [], promos: [], tables: [], calls: [], addons: [] }, view = 'orders', sf = '', mf = '', seen = null, soundOn = false, ctx, mq = '', mcat = '';
const map = new Map();
const LBL = { pending: ['Marcar en preparación', 'preparing'], preparing: ['Pedido listo', 'ready'], ready: ['Cobrar y cerrar mesa', 'completed'] };
const tn = o => o.table_name || 'Mesa ' + o.table_number;
const mins = iso => Math.floor((Date.now() - new Date(iso)) / 6e4);
