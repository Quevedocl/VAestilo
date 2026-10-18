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

  // Palabras exactas (se comparan ya sin tildes, en minúscula y con letras repetidas colapsadas)
  const PALABRAS = [
    'ctm', 'ctmre', 'csm', 'hdp', 'ql', 'qlo', 'qlos',
    'mierda', 'mierdas', 'coño', 'puñeta', 'carajo', 'cojones', 'cojon', 'cojudo',
    'pendejo', 'pendeja', 'pendejos', 'pelotudo', 'pelotuda', 'boludo', 'boluda',
    'gilipollas', 'gilipolla', 'cabron', 'cabrona', 'cabrones', 'joto', 'maraco', 'maraca',
    'verga', 'vergas', 'pija', 'pijas', 'poto', 'potos', 'ojete', 'tula',
    'follar', 'follada', 'chingar', 'chinga', 'chingada', 'chingadera', 'chingatumadre',
    'imbecil', 'imbeciles', 'idiota', 'idiotas', 'estupido', 'estupida', 'retrasado', 'retrasada',
    'mogolico', 'mogolica', 'subnormal', 'sudaca',
    'fuck', 'fucking', 'fucker', 'motherfucker', 'fck', 'shit', 'shitty', 'bitch', 'bitches',
    'asshole', 'dick', 'dicks', 'cunt', 'bastard', 'pussy', 'cock', 'whore', 'slut',
    'nigger', 'nigga', 'faggot'
  ];

  // Familias de palabras (expresiones regulares sobre una palabra ya normalizada)
  const FAMILIAS = [
    '^a?(w|hu|gu)e[bv]?on(a|es|as|ao|ado|ada|azo|cito|cita)?$',          // weón, huevón, aweonao…
    '^(w|hu)ea(s)?$', '^(w|hu)e[v]?ada(s)?$',                              // weá, huevada
    '^cul(o|os|ia|iao|iaos|iado|iada|iados|iadas|iar|iando|ear|eo|eado|eada)$', // culo, culiao…
    '^put(a|as|o|os|ita|ito|itas|itos|ear|eo|eada|eado|ada|illa)$',        // puta, putear…
    '^chuch(a|as|e|esumare|etumare|esumadre|etumadre)$',                   // chucha
    '^cag(ada|adas|ado|ar|on|ones|ona)$',                                  // cagada
    '^maric(on|ones|a|as|onada)$',                                         // maricón
    '^pichul(a|as|ita|itas)$'                                              // pichula
  ];

  // Fragmentos graves: se bloquean aunque vengan pegados a otra palabra (6 letras o más)
  const FRAGMENTOS = [
    'conchetumadre', 'conchetumare', 'conchesumare', 'conchadetumadre', 'conchadesumadre',
    'hijodeputa', 'hijoputa', 'hijoeputa', 'hijaeputa', 'hijueputa', 'hijadeputa', 'putamadre', 'putamare', 'reputamadre',
    'mierda', 'culiao', 'maricon', 'pendejo', 'gilipolla', 'chingatumadre', 'mamaguevo', 'mamahuevo', 'aweonao'
  ];

  // Frases (sobre las palabras normalizadas separadas por un espacio)
  const FRASES = [
    '(^| )(concha|chucha) (de )?(tu|su|la) ?(madre|mare)( |$)'
  ];

  // "pico" se bloquea, salvo en "pico de gallo" (plato típico)
  const PICO_OK = ['de', 'gallo'];

  const LEET = { '0': 'o', '1': 'i', '3': 'e', '4': 'a', '5': 's', '7': 't', '@': 'a', '$': 's' };
  const colapsa = s => s.replace(/(.)\1+/g, '$1');

  const SET = new Set(PALABRAS.map(colapsa));
  const FAM = FAMILIAS.map(r => new RegExp(r));
  const FRA = FRASES.map(r => new RegExp(r));
  const FRG = FRAGMENTOS.map(colapsa);
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
      if (t === 'pico') { if (toks[i + 1] === OK0 && toks[i + 2] === OK1) continue; return true; }
      if (SET.has(t) || FAM.some(r => r.test(t))) return true;
      if (t.length >= 6 && FRG.some(f => t.includes(f))) return true;
    }
    const frase = toks.join(' ');
    return FRA.some(r => r.test(frase));
  }

  const MSG = 'Ese texto tiene palabras no permitidas. Usa un nombre apropiado.';
  /* revisa varios textos a la vez: devuelve true si alguno es inapropiado */
  const alguno = (...textos) => textos.some(malo);

  const F = { malo, alguno, normalizar, MSG, LISTAS: { PALABRAS, FAMILIAS, FRAGMENTOS, FRASES, PICO_OK } };
  if (typeof module !== 'undefined' && module.exports) module.exports = F; else g.FILTRO = F;
})(typeof window !== 'undefined' ? window : globalThis);
