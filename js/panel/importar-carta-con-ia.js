/* ==============================================================
   importar-carta-con-ia.js
   Importar carta con IA (Carta > Importar con IA): lee un PDF o fotos de la carta y los productos nuevos se revisan antes de guardarlos.
   Se usa en: index.html (panel del restaurante)
   ============================================================== */

/* ===== IMPORTAR CARTA CON IA (Carta > Importar con IA) =====
   Lee un PDF o fotos de la carta, las manda a la función scan-menu (Supabase) y muestra los productos para revisarlos
   antes de guardarlos. Solo AÑADE productos nuevos; no toca los existentes. */
(() => {
  const MAX_PAGES = 40, PER_CALL = 4, PER_TXT = 6, PARALLEL = 3, PDFJS = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/';
  const $d = $('#impdlg');
  const key = s => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();
  let rows = [], token = 0, busy = false, skipped = 0;
  const say = (id, m, err) => { const el = $(id); el.textContent = m || ''; el.classList.toggle('err', !!err); };
  const show = n => { $('#imp-s1').hidden = n !== 1; $('#imp-s2').hidden = n !== 2; };

  let pdfP;
  const pdfLib = () => pdfP || (pdfP = new Promise((ok, no) => {
    if (window.pdfjsLib) return ok(window.pdfjsLib);
    const s = document.createElement('script'); s.src = PDFJS + 'pdf.min.js';
    s.onload = () => { window.pdfjsLib.GlobalWorkerOptions.workerSrc = PDFJS + 'pdf.worker.min.js'; ok(window.pdfjsLib); };
    s.onerror = () => { pdfP = null; no(new Error('No se pudo cargar el lector de PDF. Prueba con fotos de la carta.')); };
    document.head.appendChild(s);
  }));

  function toB64(src, w, h) {                         // JPEG liviano (la función acepta hasta ~2,5 MB por imagen)
    for (const [max, q] of [[1800, .82], [1400, .75], [1000, .7]]) {
      const k = Math.min(1, max / Math.max(w, h)), c = document.createElement('canvas');
      c.width = Math.max(1, Math.round(w * k)); c.height = Math.max(1, Math.round(h * k));
      const x = c.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, c.width, c.height); x.drawImage(src, 0, 0, c.width, c.height);
      const b = c.toDataURL('image/jpeg', q).split(',')[1];
      if (b.length <= 2400000) return b;
    }
    throw new Error('Una de las páginas pesa demasiado. Prueba con una foto más liviana.');
  }
  // Texto de una página de PDF, ordenado por líneas; las columnas de una misma línea se separan con " | ".
  async function pageText(pg) {
    const tc = await pg.getTextContent(), rows = [];
    for (const it of tc.items) {
      if (!it.str || !it.str.trim()) continue;
      const x = it.transform[4], y = it.transform[5];
      let row = rows.find(r => Math.abs(r.y - y) < 3); if (!row) rows.push(row = { y, it: [] });
      row.it.push({ x, w: it.width || 0, s: it.str });
    }
    rows.sort((a, b) => b.y - a.y);
    return rows.map(r => {
      r.it.sort((a, b) => a.x - b.x);
      let line = '', end = null;
      for (const t of r.it) { if (end !== null) line += t.x - end > 14 ? '  |  ' : t.x - end > 1 ? ' ' : ''; line += t.s; end = t.x + t.w; }
      return line.replace(/[ \t]{2,}/g, ' ').trim();
    }).filter(Boolean).join('\n');
  }
  // ¿El texto sirve para leer la carta? (si es una foto/escaneo, o el texto viene roto, se usa la imagen como antes)
  function usableText(s) {
    if (s.length < 80 || (s.match(/\d+/g) || []).length < 2) return false;
    const good = (s.match(/[\p{L}\p{N}\s.,$:;()\-–—&'"%/+|*¡!¿?€#@]/gu) || []).length;
    return good / s.length >= .92;
  }
  async function pagesFrom(files) {
    const out = []; let cut = false;
    for (const f of files) {
      if (out.length >= MAX_PAGES) { cut = true; break; }
      if (f.type === 'application/pdf' || /\.pdf$/i.test(f.name)) {
        if (f.size > 40 * 1024 * 1024) throw new Error('El PDF es demasiado pesado (máx. 40 MB).');
        const lib = await pdfLib(), pdf = await lib.getDocument({ data: await f.arrayBuffer() }).promise;
        for (let i = 1; i <= pdf.numPages; i++) {
          if (out.length >= MAX_PAGES) { cut = true; break; }
          const pg = await pdf.getPage(i);
          let tx = ''; try { tx = await pageText(pg); } catch (e) {}
          if (usableText(tx)) { out.push({ t: 'text', v: tx.slice(0, 30000) }); continue; }     // PDF con texto: no hace falta dibujar la página
          const v0 = pg.getViewport({ scale: 1 });
          const v = pg.getViewport({ scale: Math.min(3, Math.max(.5, 1800 / Math.max(v0.width, v0.height))) });
          const c = document.createElement('canvas'); c.width = Math.round(v.width); c.height = Math.round(v.height);
          const x = c.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, c.width, c.height);
          await pg.render({ canvasContext: x, viewport: v }).promise;
          out.push({ t: 'img', v: toB64(c, c.width, c.height) });
        }
      } else if (/^image\//.test(f.type)) {
        if (f.size > 25 * 1024 * 1024) throw new Error('Una foto es demasiado pesada.');
        const b = await createImageBitmap(f); out.push({ t: 'img', v: toB64(b, b.width, b.height) });
      } else throw new Error('Formato no válido: usa PDF, JPG, PNG o WebP.');
    }
    return { pages: out, cut };
  }

  async function scan(ch) {
    const { data: d, error } = await sb.functions.invoke('scan-menu', { body: ch.t === 'text' ? { texts: ch.v } : { images: ch.v } });
    if (error) {
      let m = ''; try { m = (await error.context.json()).error || ''; } catch (e) {}
      if (/cupo/i.test(m)) throw new Error('Llegaste al límite diario de lecturas con IA (o tu cuenta no es de dueño). Inténtalo mañana.');
      if (/forbidden/i.test(m)) throw new Error('El servidor no autoriza este dominio: revisa ALLOWED_ORIGIN en la función scan-menu.');
      if (/no autorizado/i.test(m)) throw new Error('Tu sesión venció. Vuelve a ingresar e inténtalo otra vez.');
      throw new Error(m ? 'No se pudo leer la carta (' + m + ').' : 'No se pudo contactar la función scan-menu. ¿Está desplegada en Supabase?');
    }
    return (d && d.items) || [];
  }

  function count() {
    const n = $$('#imp-list .ik').filter(x => x.checked).length;
    $('#imp-save').textContent = n === 1 ? 'Añadir 1 producto' : `Añadir ${n} productos`; $('#imp-save').disabled = !n;
  }
  function paint(cut) {
    const zero = rows.filter(r => !r.price).length, dups = rows.filter(r => r.dup).length;
    $('#imp-sum').textContent = `La IA encontró ${rows.length} ${rows.length === 1 ? 'producto' : 'productos'}.` + (zero ? ` ${zero} sin precio (marcados en ámbar): revísalos.` : '') + (dups ? ` ${dups} ya están en tu carta y quedan sin marcar.` : '') + (cut ? ` Solo se leyeron las primeras ${MAX_PAGES} páginas.` : '') + (skipped ? ` ${skipped === 1 ? 'Un grupo de páginas no se pudo leer' : skipped + ' grupos de páginas no se pudieron leer'} (la IA estaba saturada): vuelve a intentarlo luego y se añadirán solo los productos que falten.` : '');
    $('#imp-cats').innerHTML = [...new Set([...data.products.map(p => p.category), ...rows.map(r => r.category)])].map(c => `<option value="${esc(c)}">`).join('');
    $('#imp-list').innerHTML = rows.map((r, i) => `<div class="imp-row${r.dup ? ' dup' : ''}" data-i="${i}">
      <input type="checkbox" class="ik" ${r.dup ? '' : 'checked'} aria-label="Incluir ${esc(r.name)}">
      <input class="in" type="text" maxlength="120" value="${esc(r.name)}" aria-label="Nombre">
      <input class="ic" type="text" list="imp-cats" maxlength="40" value="${esc(r.category)}" aria-label="Categoría">
      <input class="ip${r.price ? '' : ' zero'}" type="number" min="0" step="1" inputmode="numeric" value="${r.price}" aria-label="Precio">${r.dup ? '<small>Ya está en tu carta</small>' : ''}</div>`).join('');
    count(); say('#imp-st2', '');
  }

  async function run() {
    const files = [...$('#imp-file').files];
    if (!files.length) return say('#imp-st', 'Elige un PDF o las fotos de tu carta.', true);
    if (busy) return; busy = true; const my = ++token; $('#imp-go').disabled = true;
    try {
      say('#imp-st', 'Preparando las páginas…');
      const { pages, cut } = await pagesFrom(files); if (my !== token) return;
      if (!pages.length) throw new Error('No se encontraron páginas para leer.');
      // Los lotes de páginas se leen en paralelo (hasta PARALLEL a la vez) en vez de uno tras otro.
      const chunks = [];                                  // páginas seguidas del mismo tipo (texto o imagen) van juntas
      for (const p of pages) { const last = chunks[chunks.length - 1]; if (last && last.t === p.t && last.v.length < (p.t === 'text' ? PER_TXT : PER_CALL)) last.v.push(p.v); else chunks.push({ t: p.t, v: [p.v] }); }
      const results = new Array(chunks.length).fill(null), calls = chunks.length; let next = 0, done = 0, failed = false, firstErr = null; skipped = 0;
      const progress = () => say('#imp-st', `Leyendo la carta con IA${calls > 1 ? ` (${done} de ${calls})` : ''}… puede tardar un momento.`);
      const fatal = m => /límite diario|no autoriza|sesión venció|lector de PDF/i.test(m);
      progress();
      await Promise.all(Array.from({ length: Math.min(PARALLEL, calls) }, async () => {
        while (!failed && my === token && next < calls) {
          const n = next++;
          try {
            try { results[n] = await scan(chunks[n]); }
            catch (e) { if (fatal(e.message) || !/ia no disponible/i.test(e.message)) throw e; await new Promise(r => setTimeout(r, 2500)); results[n] = await scan(chunks[n]); }   // la IA estaba saturada: un reintento
          } catch (e) {
            if (fatal(e.message)) { failed = true; throw e; }
            skipped++; firstErr = firstErr || e;                 // un grupo falló: se siguen leyendo los demás
          }
          done++; if (my === token) progress();
        }
      }));
      if (my !== token) return;
      if (skipped === calls) throw firstErr;                     // no se pudo leer nada
      const found = results.filter(Boolean).flat();
      const seen = new Set(), have = new Set(data.products.map(p => key(p.category) + '|' + key(p.name)));
      rows = [];
      for (const it of found) {
        const name = String(it.name || '').trim().slice(0, 120), category = String(it.category || '').trim().slice(0, 40) || 'Carta', k = key(category) + '|' + key(name);
        if (!name || seen.has(k)) continue; seen.add(k);
        rows.push({ name, category, price: Math.max(0, Math.round(Number(it.price) || 0)), dup: have.has(k) });
      }
      if (!rows.length) throw new Error('No se encontraron productos. Prueba con una imagen más nítida o con otra página.');
      paint(cut); show(2);
    } catch (e) { if (my === token) say('#imp-st', e.message || 'No se pudo leer la carta.', true); }
    finally { if (my === token) { busy = false; $('#imp-go').disabled = false; } }
  }

  async function save() {
    const list = $$('#imp-list .imp-row').filter(el => el.querySelector('.ik').checked).map(el => ({ el, name: el.querySelector('.in').value.trim(), category: el.querySelector('.ic').value.trim(), price: Math.max(0, Math.round(Number(el.querySelector('.ip').value) || 0)) }));
    $$('#imp-list .imp-row.bad').forEach(x => x.classList.remove('bad'));
    if (!list.length) return;
    const miss = list.find(r => !r.name || !r.category);
    if (miss) { miss.el.classList.add('bad'); miss.el.scrollIntoView({ block: 'center' }); return say('#imp-st2', 'Hay productos sin nombre o sin categoría: complétalos o desmárcalos.', true); }
    const bad = list.find(r => FILTRO.alguno(r.name, r.category));
    if (bad) { bad.el.classList.add('bad'); bad.el.scrollIntoView({ block: 'center' }); return say('#imp-st2', FILTRO.MSG, true); }
    $('#imp-save').disabled = true; say('#imp-st2', 'Añadiendo productos…');
    const t0 = Date.now();   // cada producto lleva una hora levemente distinta: así la carta conserva el orden del documento
    const recs = list.map((r, i) => ({ restaurant_id: R.id, name: r.name, category: r.category, price: r.price, description: null, image_url: null, is_available: true, created_at: new Date(t0 + i * 5).toISOString() }));
    for (let i = 0; i < recs.length; i += 100) {
      const { error } = await sb.from('products').insert(recs.slice(i, i + 100));
      if (error) { await refresh(); renderMenu(true); count(); return say('#imp-st2', errMsg(error) + (i ? ` (ya se añadieron ${i} productos).` : ''), true); }
    }
    await refresh(); renderMenu(true); $d.close(); toast(recs.length === 1 ? 'Producto añadido' : `${recs.length} productos añadidos`);
  }

  $('#imp').onclick = () => { token++; busy = false; rows = []; $('#imp-file').value = ''; $('#imp-go').disabled = false; say('#imp-st', ''); show(1); $d.showModal(); };
  $('#imp-cancel').onclick = () => $d.close();
  $('#imp-go').onclick = run;
  $('#imp-back').onclick = () => { say('#imp-st', ''); show(1); };
  $('#imp-save').onclick = save;
  $('#imp-all').onclick = () => { const cs = $$('#imp-list .ik'), on = cs.some(x => !x.checked); cs.forEach(x => x.checked = on); count(); };
  $('#imp-list').addEventListener('change', e => { if (e.target.classList.contains('ik')) count(); });
  $('#imp-list').addEventListener('input', e => { if (e.target.classList.contains('ip')) e.target.classList.toggle('zero', !Number(e.target.value)); });
  $d.addEventListener('close', () => { token++; busy = false; });
})();
