/* VAestilo · generador mínimo de archivos Excel (.xlsx) sin librerías externas.
   VAXLSX.blob({ sheets: [{ name, widths: [..], rows: [[celda, ...] | { h, cells: [...] }], freeze: nFilas, filter: 'A4:G20', merges: ['A1:G1'] }] }) → Blob
   celda = { v: texto|número, s: nombre de estilo, f: fórmula opcional } o null (vacía). */
(function () {
  const ST = ['def', 'title', 'sub', 'head', 'txt', 'money', 'int', 'txtz', 'moneyz', 'intz', 'lab', 'kmoney', 'kint', 'ktxt', 'tot', 'totmoney', 'ctr', 'ctrz', 'sec', 'totint'];
  const sid = n => Math.max(0, ST.indexOf(n));
  const esc = s => String(s).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const colL = i => { let s = ''; for (i++; i > 0; i = Math.floor((i - 1) / 26)) s = String.fromCharCode(65 + (i - 1) % 26) + s; return s; };
  const bd = (c = 'D9DDD7') => `<left style="thin"><color rgb="FF${c}"/></left><right style="thin"><color rgb="FF${c}"/></right><top style="thin"><color rgb="FF${c}"/></top><bottom style="thin"><color rgb="FF${c}"/></bottom><diagonal/>`;
  const xf = (fmt, font, fill, border, al) => `<xf numFmtId="${fmt}" fontId="${font}" fillId="${fill}" borderId="${border}" xfId="0"${fmt ? ' applyNumberFormat="1"' : ''} applyFont="1" applyFill="1" applyBorder="1"${al ? ' applyAlignment="1"><alignment ' + al + '/></xf>' : '/>'}`;
  const L = 'horizontal="left" vertical="center" wrapText="1"', R = 'horizontal="right" vertical="center"', C = 'horizontal="center" vertical="center"';
  const STYLES = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
<numFmts count="2"><numFmt numFmtId="164" formatCode="&quot;$&quot;#,##0"/><numFmt numFmtId="165" formatCode="#,##0"/></numFmts>
<fonts count="6"><font><sz val="11"/><color rgb="FF2A322D"/><name val="Calibri"/><family val="2"/></font><font><b/><sz val="11"/><color rgb="FF2A322D"/><name val="Calibri"/><family val="2"/></font><font><b/><sz val="18"/><color rgb="FF3F5C50"/><name val="Calibri"/><family val="2"/></font><font><b/><sz val="11"/><color rgb="FFFFFFFF"/><name val="Calibri"/><family val="2"/></font><font><i/><sz val="10"/><color rgb="FF7A857E"/><name val="Calibri"/><family val="2"/></font><font><b/><sz val="12"/><color rgb="FF3F5C50"/><name val="Calibri"/><family val="2"/></font></fonts>
<fills count="6"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FF4E7162"/><bgColor indexed="64"/></patternFill></fill><fill><patternFill patternType="solid"><fgColor rgb="FFF4F7F5"/><bgColor indexed="64"/></patternFill></fill><fill><patternFill patternType="solid"><fgColor rgb="FFEDF2EE"/><bgColor indexed="64"/></patternFill></fill><fill><patternFill patternType="solid"><fgColor rgb="FFDCE7E0"/><bgColor indexed="64"/></patternFill></fill></fills>
<borders count="4"><border><left/><right/><top/><bottom/><diagonal/></border><border>${bd()}</border><border><left/><right/><top/><bottom style="medium"><color rgb="FF4E7162"/></bottom><diagonal/></border><border><left style="thin"><color rgb="FFD9DDD7"/></left><right style="thin"><color rgb="FFD9DDD7"/></right><top style="medium"><color rgb="FF4E7162"/></top><bottom style="thin"><color rgb="FFD9DDD7"/></bottom><diagonal/></border></borders>
<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
<cellXfs count="${ST.length}">${[
    xf(0, 0, 0, 0), xf(0, 2, 0, 0, 'vertical="center"'), xf(0, 4, 0, 0), xf(0, 3, 2, 1, C + ' wrapText="1"'),
    xf(0, 0, 0, 1, L), xf(164, 0, 0, 1, R), xf(165, 0, 0, 1, R),
    xf(0, 0, 3, 1, L), xf(164, 0, 3, 1, R), xf(165, 0, 3, 1, R),
    xf(0, 1, 4, 1, L), xf(164, 1, 0, 1, R), xf(165, 1, 0, 1, R), xf(0, 1, 0, 1, R),
    xf(0, 1, 5, 3, L), xf(164, 1, 5, 3, R), xf(0, 0, 0, 1, C), xf(0, 0, 3, 1, C), xf(0, 5, 0, 2, 'vertical="center"'), xf(165, 1, 5, 3, R)
  ].join('')}</cellXfs>
<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>`;

  function sheetXml(sh) {
    const rows = sh.rows.map((r, ri) => {
      const cells = Array.isArray(r) ? r : r.cells, h = Array.isArray(r) ? 0 : r.h;
      const cx = cells.map((c, ci) => {
        if (!c) return '';
        const ref = colL(ci) + (ri + 1), s = sid(c.s), v = c.v;
        if (c.f) return `<c r="${ref}" s="${s}"><f>${esc(c.f)}</f><v>${Number(v) || 0}</v></c>`;
        if (typeof v === 'number' && isFinite(v)) return `<c r="${ref}" s="${s}"><v>${v}</v></c>`;
        if (v == null || v === '') return `<c r="${ref}" s="${s}"/>`;
        return `<c r="${ref}" s="${s}" t="inlineStr"><is><t xml:space="preserve">${esc(v)}</t></is></c>`;
      }).join('');
      return `<row r="${ri + 1}"${h ? ` ht="${h}" customHeight="1"` : ''}>${cx}</row>`;
    }).join('');
    const nc = Math.max(1, ...sh.rows.map(r => (Array.isArray(r) ? r : r.cells).length));
    const pane = sh.freeze ? `<pane ySplit="${sh.freeze}" topLeftCell="A${sh.freeze + 1}" activePane="bottomLeft" state="frozen"/><selection pane="bottomLeft" activeCell="A${sh.freeze + 1}" sqref="A${sh.freeze + 1}"/>` : '';
    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetPr><pageSetUpPr fitToPage="1"/></sheetPr><dimension ref="A1:${colL(nc - 1)}${sh.rows.length}"/><sheetViews><sheetView showGridLines="0" workbookViewId="0"${sh.first ? ' tabSelected="1"' : ''}>${pane}</sheetView></sheetViews><sheetFormatPr defaultRowHeight="18"/><cols>${(sh.widths || []).map((w, i) => `<col min="${i + 1}" max="${i + 1}" width="${w}" customWidth="1"/>`).join('')}</cols><sheetData>${rows}</sheetData>${sh.filter ? `<autoFilter ref="${sh.filter}"/>` : ''}${sh.merges && sh.merges.length ? `<mergeCells count="${sh.merges.length}">${sh.merges.map(m => `<mergeCell ref="${m}"/>`).join('')}</mergeCells>` : ''}<pageMargins left="0.5" right="0.5" top="0.6" bottom="0.6" header="0.3" footer="0.3"/><pageSetup paperSize="9" orientation="${sh.landscape ? 'landscape' : 'portrait'}" fitToWidth="1" fitToHeight="0"/><headerFooter><oddFooter>&amp;L&amp;8VAestilo&amp;C&amp;8Página &amp;P de &amp;N&amp;R&amp;8&amp;D</oddFooter></headerFooter></worksheet>`;
  }

  const CRC = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
  const crc32 = b => { let c = 0xFFFFFFFF; for (let i = 0; i < b.length; i++) c = CRC[(c ^ b[i]) & 255] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; };
  const u16 = n => [n & 255, (n >> 8) & 255], u32 = n => [n & 255, (n >> 8) & 255, (n >> 16) & 255, (n >>> 24) & 255];
  function zip(files) {                                  // ZIP sin compresión (método 0): válido para .xlsx
    const enc = new TextEncoder(), d = new Date(), dt = u16(((d.getFullYear() - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate()), tm = u16((d.getHours() << 11) | (d.getMinutes() << 5) | (d.getSeconds() >> 1));
    const parts = [], cen = []; let off = 0;
    for (const f of files) {
      const nm = enc.encode(f.name), data = enc.encode(f.text), crc = crc32(data);
      const lh = new Uint8Array([0x50, 0x4b, 3, 4, ...u16(20), ...u16(0x0800), ...u16(0), ...tm, ...dt, ...u32(crc), ...u32(data.length), ...u32(data.length), ...u16(nm.length), ...u16(0)]);
      cen.push(new Uint8Array([0x50, 0x4b, 1, 2, ...u16(20), ...u16(20), ...u16(0x0800), ...u16(0), ...tm, ...dt, ...u32(crc), ...u32(data.length), ...u32(data.length), ...u16(nm.length), ...u16(0), ...u16(0), ...u16(0), ...u16(0), ...u32(0), ...u32(off)]), nm);
      parts.push(lh, nm, data); off += lh.length + nm.length + data.length;
    }
    const cs = cen.reduce((a, b) => a + b.length, 0);
    return [...parts, ...cen, new Uint8Array([0x50, 0x4b, 5, 6, 0, 0, 0, 0, ...u16(files.length), ...u16(files.length), ...u32(cs), ...u32(off), 0, 0])];
  }

  function blob(wb) {
    const sh = wb.sheets.map((s, i) => ({ ...s, first: i === 0 })), N = sh.length;
    const names = sh.map(s => esc(String(s.name).replace(/[\[\]\*\?\/\\:]/g, ' ').slice(0, 31)));
    const dn = sh.map((s, i) => s.filter ? `<definedName name="_xlnm._FilterDatabase" localSheetId="${i}" hidden="1">'${names[i]}'!${s.filter.replace(/([A-Z]+)(\d+)/g, '$$$1$$$2')}</definedName>` : '').join('');
    const files = [
      { name: '[Content_Types].xml', text: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>${sh.map((_, i) => `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join('')}<Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/></Types>` },
      { name: '_rels/.rels', text: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/></Relationships>` },
      { name: 'docProps/core.xml', text: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"><dc:title>${esc(wb.title || 'Reporte')}</dc:title><dc:creator>VAestilo</dc:creator><dcterms:created xsi:type="dcterms:W3CDTF">${new Date().toISOString().replace(/\.\d+Z$/, 'Z')}</dcterms:created></cp:coreProperties>` },
      { name: 'xl/workbook.xml', text: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><bookViews><workbookView xWindow="0" yWindow="0" windowWidth="24000" windowHeight="12000"/></bookViews><sheets>${names.map((n, i) => `<sheet name="${n}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`).join('')}</sheets>${dn ? `<definedNames>${dn}</definedNames>` : ''}</workbook>` },
      { name: 'xl/_rels/workbook.xml.rels', text: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${sh.map((_, i) => `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`).join('')}<Relationship Id="rId${N + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>` },
      { name: 'xl/styles.xml', text: STYLES },
      ...sh.map((s, i) => ({ name: `xl/worksheets/sheet${i + 1}.xml`, text: sheetXml(s) }))
    ];
    return new Blob(zip(files), { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  }
  (typeof window !== 'undefined' ? window : globalThis).VAXLSX = { blob, colL };
})();
