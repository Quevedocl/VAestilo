/* ==============================================================
   qr.js
   Generador de códigos QR propio (sin librerías externas, sin internet).
   Dibuja cada punto con un tamaño ENTERO de píxeles y deja el borde blanco
   obligatorio de 4 módulos: así cualquier cámara lo lee desde una pantalla.
   Uso: const canvas = qrCanvas('https://...', 360);
   Se usa en: index.html (QR de cada mesa)
   ============================================================== */
(function () {
  const ECC_L = [-1, 7, 10, 15, 20, 26, 18, 20, 24, 30, 18, 20, 24, 26, 30, 22, 24, 28, 30, 28, 28];   // nivel L: bytes de corrección por bloque
  const BLK_L = [-1, 1, 1, 1, 1, 1, 2, 2, 2, 2, 4, 4, 4, 4, 4, 6, 6, 6, 6, 7, 8];                      // nivel L: cantidad de bloques
  const ECC_M = [-1, 10, 16, 26, 18, 24, 16, 18, 22, 22, 26, 30, 22, 22, 24, 24, 28, 28, 26, 26, 26];  // nivel M
  const BLK_M = [-1, 1, 1, 1, 2, 2, 4, 4, 4, 5, 5, 5, 8, 9, 9, 10, 10, 11, 13, 14, 16];
  const ECC_H = [-1, 17, 28, 22, 16, 22, 28, 26, 26, 24, 28, 24, 28, 22, 24, 24, 30, 28, 28, 26, 28];  // nivel H (30 %): aguanta un logo en el centro
  const BLK_H = [-1, 1, 1, 2, 4, 4, 4, 5, 6, 8, 8, 11, 11, 16, 16, 18, 16, 19, 21, 25, 25];
  const MAXV = 20;

  const rawModules = v => { let r = (16 * v + 128) * v + 64; if (v >= 2) { const a = Math.floor(v / 7) + 2; r -= (25 * a - 10) * a - 55; if (v >= 7) r -= 36; } return r; };
  const mul = (x, y) => { let z = 0; for (let i = 7; i >= 0; i--) { z = (z << 1) ^ ((z >>> 7) * 0x11D); z ^= ((y >>> i) & 1) * x; } return z; };
  function rsRemainder(data, deg) {
    const div = new Array(deg).fill(0); div[deg - 1] = 1; let root = 1;
    for (let i = 0; i < deg; i++) { for (let j = 0; j < deg; j++) { div[j] = mul(div[j], root); if (j + 1 < deg) div[j] ^= div[j + 1]; } root = mul(root, 2); }
    const res = new Array(deg).fill(0);
    for (const b of data) { const f = b ^ res.shift(); res.push(0); div.forEach((c, i) => { res[i] ^= mul(c, f); }); }
    return res;
  }
  const utf8 = s => Array.from(unescape(encodeURIComponent(s)), c => c.charCodeAt(0));

  function qrMatrix(text, level) {   // level: 'L', 'M' o 'H'
    const bytes = utf8(text), ECC = level === 'H' ? ECC_H : level === 'M' ? ECC_M : ECC_L, BLK = level === 'H' ? BLK_H : level === 'M' ? BLK_M : BLK_L;
    let ver = 0, cap = 0;
    for (let v = 1; v <= MAXV; v++) {
      cap = Math.floor(rawModules(v) / 8) - ECC[v] * BLK[v];
      if (4 + (v < 10 ? 8 : 16) + 8 * bytes.length <= cap * 8) { ver = v; break; }
    }
    if (!ver) throw new Error('El enlace es demasiado largo para el QR');
    // 1) datos
    const bits = [], put = (val, n) => { for (let i = n - 1; i >= 0; i--) bits.push((val >>> i) & 1); };
    put(4, 4); put(bytes.length, ver < 10 ? 8 : 16); bytes.forEach(b => put(b, 8));
    put(0, Math.min(4, cap * 8 - bits.length)); while (bits.length % 8) bits.push(0);
    const data = []; for (let i = 0; i < bits.length; i += 8) data.push(parseInt(bits.slice(i, i + 8).join(''), 2));
    for (let pad = 0xEC; data.length < cap; pad ^= 0xEC ^ 0x11) data.push(pad);
    // 2) corrección de errores e intercalado
    const nb = BLK[ver], eccLen = ECC[ver], raw = Math.floor(rawModules(ver) / 8), nShort = nb - raw % nb, shortLen = Math.floor(raw / nb);
    const blocks = []; let k = 0;
    for (let i = 0; i < nb; i++) {
      const dat = data.slice(k, k + shortLen - eccLen + (i < nShort ? 0 : 1)); k += dat.length;
      const ecc = rsRemainder(dat, eccLen); if (i < nShort) dat.push(0); blocks.push(dat.concat(ecc));
    }
    const all = [];
    for (let i = 0; i < blocks[0].length; i++) blocks.forEach((b, j) => { if (i !== shortLen - eccLen || j >= nShort) all.push(b[i]); });
    // 3) dibujo
    const size = ver * 4 + 17, mod = [], fn = [];
    for (let i = 0; i < size; i++) { mod.push(new Array(size).fill(false)); fn.push(new Array(size).fill(false)); }
    const set = (x, y, d) => { mod[y][x] = d; fn[y][x] = true; };
    for (let i = 0; i < size; i++) { set(6, i, i % 2 === 0); set(i, 6, i % 2 === 0); }
    const finder = (cx, cy) => { for (let dy = -4; dy <= 4; dy++) for (let dx = -4; dx <= 4; dx++) { const d = Math.max(Math.abs(dx), Math.abs(dy)), x = cx + dx, y = cy + dy; if (x >= 0 && x < size && y >= 0 && y < size) set(x, y, d !== 2 && d !== 4); } };
    finder(3, 3); finder(size - 4, 3); finder(3, size - 4);
    const na = ver === 1 ? 0 : Math.floor(ver / 7) + 2, pos = [];
    if (na) { const step = Math.ceil((ver * 4 + 4) / (na * 2 - 2)) * 2; pos.push(6); for (let p = size - 7; pos.length < na; p -= step) pos.splice(1, 0, p); }
    pos.forEach((px, i) => pos.forEach((py, j) => {
      if ((i === 0 && j === 0) || (i === 0 && j === na - 1) || (i === na - 1 && j === 0)) return;
      for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) set(px + dx, py + dy, Math.max(Math.abs(dx), Math.abs(dy)) !== 1);
    }));
    const bit = (n, i) => ((n >>> i) & 1) !== 0;
    const formatBits = mask => {
      const d = (({ L: 1, M: 0, H: 2 }[level]) << 3) | mask; let r = d; for (let i = 0; i < 10; i++) r = (r << 1) ^ ((r >>> 9) * 0x537);
      const b = ((d << 10) | r) ^ 0x5412;
      for (let i = 0; i <= 5; i++) set(8, i, bit(b, i)); set(8, 7, bit(b, 6)); set(8, 8, bit(b, 7)); set(7, 8, bit(b, 8));
      for (let i = 9; i < 15; i++) set(14 - i, 8, bit(b, i));
      for (let i = 0; i < 8; i++) set(size - 1 - i, 8, bit(b, i));
      for (let i = 8; i < 15; i++) set(8, size - 15 + i, bit(b, i));
      set(8, size - 8, true);
    };
    formatBits(0);
    if (ver >= 7) { let r = ver; for (let i = 0; i < 12; i++) r = (r << 1) ^ ((r >>> 11) * 0x1F25); const b = (ver << 12) | r; for (let i = 0; i < 18; i++) { const a = size - 11 + i % 3, c = Math.floor(i / 3); set(a, c, bit(b, i)); set(c, a, bit(b, i)); } }
    // colocar datos en zigzag
    let n = 0;
    for (let right = size - 1; right >= 1; right -= 2) {
      if (right === 6) right = 5;
      for (let vert = 0; vert < size; vert++) for (let j = 0; j < 2; j++) {
        const x = right - j, up = ((right + 1) & 2) === 0, y = up ? size - 1 - vert : vert;
        if (!fn[y][x] && n < all.length * 8) { mod[y][x] = ((all[n >>> 3] >>> (7 - (n & 7))) & 1) !== 0; n++; }
      }
    }
    // 4) máscara: se prueba cada una y se queda con la de menor penalización
    const M = [(x, y) => (x + y) % 2 === 0, (x, y) => y % 2 === 0, (x, y) => x % 3 === 0, (x, y) => (x + y) % 3 === 0, (x, y) => (Math.floor(x / 3) + Math.floor(y / 2)) % 2 === 0, (x, y) => x * y % 2 + x * y % 3 === 0, (x, y) => (x * y % 2 + x * y % 3) % 2 === 0, (x, y) => ((x + y) % 2 + x * y % 3) % 2 === 0];
    const toggle = m => { for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) if (!fn[y][x] && M[m](x, y)) mod[y][x] = !mod[y][x]; };
    const penalty = () => {
      let p = 0, dark = 0;
      for (let t = 0; t < 2; t++) for (let a = 0; a < size; a++) {
        let run = 1;
        for (let b = 1; b < size; b++) { const c = t ? mod[b][a] : mod[a][b], q = t ? mod[b - 1][a] : mod[a][b - 1]; if (c === q) { run++; if (run === 5) p += 3; else if (run > 5) p++; } else run = 1; }
      }
      for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
        if (mod[y][x]) dark++;
        if (x + 1 < size && y + 1 < size && mod[y][x] === mod[y][x + 1] && mod[y][x] === mod[y + 1][x] && mod[y][x] === mod[y + 1][x + 1]) p += 3;
      }
      return p + Math.floor(Math.abs(dark * 20 - size * size * 10) / (size * size)) * 10;
    };
    let best = 0, bestP = Infinity;
    for (let m = 0; m < 8; m++) { toggle(m); formatBits(m); const p = penalty(); if (p < bestP) { best = m; bestP = p; } toggle(m); }
    toggle(best); formatBits(best);
    return { size, mod };
  }

  // Devuelve un <canvas> con el QR, borde blanco de 4 módulos y puntos de tamaño entero (nada de medios píxeles).
  // Con logo (por ejemplo 'Q&V') usa corrección H y tapa solo ~el 20 % del ancho: el lector reconstruye lo tapado.
  function qrCanvas(text, px, logo) {
    const q = qrMatrix(text, logo ? 'H' : 'M'), total = q.size + 8, s = Math.max(2, Math.floor((px || 320) / total));
    const c = document.createElement('canvas'); c.width = c.height = total * s;
    const g = c.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height); g.fillStyle = '#000';
    for (let y = 0; y < q.size; y++) for (let x = 0; x < q.size; x++) if (q.mod[y][x]) g.fillRect((x + 4) * s, (y + 4) * s, s, s);
    if (logo) {
      let m = Math.round(q.size * 0.2); if (m % 2 === 0) m++;            // lado del recuadro en módulos (impar, centrado)
      const side = m * s, o = Math.floor((c.width - side) / 2), r = side * 0.18;
      g.fillStyle = '#fff'; g.beginPath(); g.roundRect ? g.roundRect(o, o, side, side, r) : g.rect(o, o, side, side); g.fill();
      const pad = Math.max(s, side * 0.07), ix = o + pad, iw = side - pad * 2;
      g.fillStyle = '#065F46'; g.beginPath(); g.roundRect ? g.roundRect(ix, ix, iw, iw, r * .7) : g.rect(ix, ix, iw, iw); g.fill();
      g.fillStyle = '#fff'; g.textAlign = 'center'; g.textBaseline = 'middle';
      let fs = iw * 0.5; g.font = '800 ' + fs + 'px -apple-system,"Segoe UI",Arial,sans-serif';
      while (g.measureText(logo).width > iw * 0.86 && fs > 6) { fs -= 1; g.font = '800 ' + fs + 'px -apple-system,"Segoe UI",Arial,sans-serif'; }
      g.fillText(logo, c.width / 2, c.height / 2 + fs * 0.04);
    }
    return c;
  }
  window.qrCanvas = qrCanvas; window.qrMatrix = qrMatrix;
})();
