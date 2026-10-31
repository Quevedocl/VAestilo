/* Filtro de groserías de VAestilo — lo usan index.html (panel) y carta.html (clientes).
   Revisa nombres de platos, categorías, agregados, promociones, mesas, negocio y notas.
   Detecta trucos comunes: mayúsculas, tildes, letras repetidas (puuuta), números por letras (p1c0, m13rd4),
   puntos o guiones en medio (m.i.e.r.d.a) y letras separadas (p i c o).
   OJO: este filtro es una primera barrera en el navegador. La barrera real está en la base de datos
   (supabase/migracion-filtro-groserias.sql), que usa las MISMAS listas: si cambias algo aquí,
   regenera ese archivo con:  node tests/generar-filtro-sql.js
   Para permitir una palabra legítima o bloquear una nueva, edita SOLO las listas de abajo. */
(function (g) {
  'use strict';

  // Palabras que SIEMPRE se permiten (platos y palabras legítimas que empiezan o contienen una raíz bloqueada)
  const PERMITIDAS = ['putanesca', 'puttanesca', 'shitake', 'shiitake', 'carajillo', 'vergara', 'follaje', 'picoteo', 'picoteos',
    'computador', 'computadora', 'disputa', 'reputacion', 'chuchoca', 'chuchoca', 'tulipan', 'tulipanes', 'cocktail', 'cocktails'];

  // INICIO: se bloquea cualquier palabra que EMPIECE con la raíz (tula → tula, tulita, tulachi, tulazo…)
  const INICIO = [
    'puta', 'puto', 'putit', 'pute', 'tula', 'tulit', 'tulon', 'ojet', 'carajo', 'coñ', 'cojon', 'cojud', 'pendej', 'pelotud', 'bolud', 'gilipoll',
    'cabron', 'cagad', 'cagar', 'cagon', 'culia', 'culea', 'culiao', 'culo', 'culit', 'culon', 'chucha', 'chuchet', 'chuches',
    'pichul', 'pichon', 'imbecil', 'idiot', 'estupid', 'retrasad', 'mogolic', 'subnormal', 'sudaca',
    'weon', 'hueon', 'huevon', 'webon', 'aweon', 'huevad', 'weada', 'hueada', 'chingad', 'chingar', 'chingat', 'chinga',
    'follad', 'follar', 'mamaguevo', 'maricon', 'mariconad', 'ctm', 'csm', 'hdp', 'hijueput', 'hijoput', 'hijaput',
    'fuck', 'fck', 'bitch', 'asshole', 'bastard', 'motherfuck', 'nigg', 'puñet', 'mierd'
  ];

  // CONTIENE: se bloquea aunque la raíz venga en medio o pegada a otra palabra (5 letras o más)
  const CONTIENE = [
    'mierda', 'culiao', 'culiad', 'maricon', 'pendejo', 'gilipolla', 'weon', 'hueon', 'huevon', 'webon',
    'conchetumadre', 'conchetumare', 'conchesumare', 'conchadetumadre', 'conchadesumadre', 'putamadre', 'putamare',
    'reputamadre', 'hijodeputa', 'hijoputa', 'hijoeputa', 'hijaeputa', 'hijueputa', 'hijadeputa',
    'chingatumadre', 'mamaguevo', 'mamahuevo', 'pichula', 'chucha', 'carajo'
  ];

  // Familias (regex sobre una palabra normalizada) para palabras cortas o ambiguas que no se pueden bloquear por prefijo
  const FAMILIAS = [
    '^(w|hu)ea(s|ita|itas|zo)?$',          // weá, huevá
    '^verg(a|as|on|ona|ones|azo|ita)$',    // verga (no "Vergara")
    '^pij(a|as|ita|on|azo)$',              // pija (no "pijama")
    '^pot(o|os|ito|itos|azo)$',            // poto
    '^marac(o|a|os|as|azo)$',              // maraco
    '^maric(a|as|ita|ote)$',               // marica
    '^jot(o|os|ita)$',                     // joto
    '^ql(o|a|os|as|ao|iao)?$',             // ql, qlo
    '^pico(s)?$',                          // pico (ver excepción de "pico de gallo")
    '^shit(s|ty|head|hole)?$', '^dick(s|head|y)?$', '^cunt(s|y)?$', '^cock(s|sucker)?$', '^pus(y|ies)$',
    '^whore(s)?$', '^slut(s|ty)?$', '^fag(ot|ots)$'
  ];

  // Frases (sobre las palabras normalizadas separadas por un espacio)
  const FRASES = [
    '(^| )(concha|chucha) (de )?(tu|su|la) ?(madre|mare)( |$)'
  ];

  // "pico" se bloquea, salvo en "pico de gallo" (plato típico)
  const PICO_OK = ['de', 'gallo'];

  const LEET = { '0': 'o', '1': 'i', '3': 'e', '4': 'a', '5': 's', '7': 't', '@': 'a', '$': 's' };
  const colapsa = s => s.replace(/(.)\1+/g, '$1');

  const PER = new Set(PERMITIDAS.map(colapsa));
  const INI = INICIO.map(colapsa);
  const CON = CONTIENE.map(colapsa);
  const FAM = FAMILIAS.map(r => new RegExp(r));
  const FRA = FRASES.map(r => new RegExp(r));
  const OK0 = colapsa(PICO_OK[0]), OK1 = colapsa(PICO_OK[1]);   // ya colapsadas (gallo → galo), como las palabras que se comparan

  function normalizar(texto) {
    let s = String(texto == null ? '' : texto).toLowerCase().replace(/[\u200b-\u200f\u2060\ufeff\u00ad]/g, '');
    s = s.replace(/ñ/g, '\u0001').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\u0001/g, 'ñ');
    s = s.replace(/[013457@$]/g, c => LEET[c] || c);
    s = s.replace(/[.\-_*'`~^·]/g, '').replace(/[^a-zñ]/g, ' ');
    const toks = s.split(/\s+/).filter(Boolean), out = [];
    for (let i = 0; i < toks.length;) {             // une letras sueltas: "p i c o" → "pico"
      let j = i; while (j < toks.length && toks[j].length === 1) j++;
      if (j - i >= 3) { out.push(toks.slice(i, j).join('')); i = j; } else { out.push(toks[i]); i++; }
    }
    return out.map(colapsa);
  }

  function malo(texto) {
    const toks = normalizar(texto);
    if (!toks.length) return false;
    for (let i = 0; i < toks.length; i++) {
      const t = toks[i];
      if (PER.has(t)) continue;
      if (t === 'pico' || t === 'picos') { if (toks[i + 1] === OK0 && toks[i + 2] === OK1) continue; return true; }
      if (INI.some(r => t.startsWith(r)) || FAM.some(r => r.test(t))) return true;
      if (CON.some(f => t.includes(f))) return true;
    }
    const frase = toks.join(' ');
    return FRA.some(r => r.test(frase));
  }

  const MSG = 'Ese texto tiene palabras no permitidas. Usa un nombre apropiado.';
  /* revisa varios textos a la vez: devuelve true si alguno es inapropiado */
  const alguno = (...textos) => textos.some(malo);

  const F = { malo, alguno, normalizar, MSG, LISTAS: { PERMITIDAS, INICIO, CONTIENE, FAMILIAS, FRASES, PICO_OK } };
  if (typeof module !== 'undefined' && module.exports) module.exports = F; else g.FILTRO = F;
})(typeof window !== 'undefined' ? window : globalThis);
