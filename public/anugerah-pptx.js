/* ==========================================================================
   PENJANA PPTX — slaid majlis anugerah
   --------------------------------------------------------------------------
   🔴 PPTX ialah fail ZIP berisi XML (OOXML). Tiada perpustakaan PowerPoint
      diperlukan — hanya JSZip, yang sudah dipakai di tempat lain dalam
      ESIS. Fail yang dihasilkan dibuka dalam PowerPoint, Keynote, Google
      Slides dan LibreOffice.

   🔴 Saiz slaid 13.333" x 7.5" (16:9). EMU ialah unit OOXML:
      1 inci = 914400 EMU. Nombor besar dalam fail ini semuanya EMU.

   🔴 Teks MESTI dilepaskan untuk XML. Nama murid membawa "&" dan
      kadangkala "<" daripada import — satu aksara tidak dilepaskan
      merosakkan keseluruhan fail, dan PowerPoint menolaknya dengan
      mesej "perlu dibaiki" tanpa menyatakan sebabnya.
   ========================================================================== */

const PX_EMU = 914400;
const PX_W = 13.333, PX_H = 7.5;

function pxEsc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&apos;');
}

/* Satu kotak teks. `o` dalam INCI; ditukar ke EMU di sini supaya
   pemanggil tidak perlu memikirkan unit. */
function pxKotak(id, o) {
  const baris = (o.baris || []).map(b =>
    '<a:p><a:pPr algn="' + (b.algn || o.algn || 'ctr') + '"/>' +
    '<a:r><a:rPr lang="ms-MY" sz="' + (b.sz || o.sz || 2400) + '"' +
      (b.b ? ' b="1"' : '') + (b.i ? ' i="1"' : '') +
      ' spc="' + (b.spc || 0) + '" dirty="0">' +
      '<a:solidFill><a:srgbClr val="' + (b.warna || o.warna || '16233A') + '"/></a:solidFill>' +
      '<a:latin typeface="' + (b.font || o.font || 'Calibri') + '"/>' +
    '</a:rPr><a:t>' + pxEsc(b.teks) + '</a:t></a:r></a:p>').join('');

  return '<p:sp><p:nvSpPr><p:cNvPr id="' + id + '" name="tx' + id + '"/>' +
    '<p:cNvSpPr txBox="1"/><p:nvPr/></p:nvSpPr>' +
    '<p:spPr><a:xfrm><a:off x="' + Math.round(o.x * PX_EMU) + '" y="' +
      Math.round(o.y * PX_EMU) + '"/><a:ext cx="' + Math.round(o.w * PX_EMU) +
      '" cy="' + Math.round(o.h * PX_EMU) + '"/></a:xfrm>' +
    '<a:prstGeom prst="rect"><a:avLst/></a:prstGeom></p:spPr>' +
    '<p:txBody><a:bodyPr wrap="square" anchor="' + (o.anchor || 'ctr') +
      '"><a:normAutofit/></a:bodyPr><a:lstStyle/>' + baris + '</p:txBody></p:sp>';
}

/* Segi empat warna penuh — dipakai sebagai latar slaid. */
function pxLatar(id, warna) {
  return '<p:sp><p:nvSpPr><p:cNvPr id="' + id + '" name="bg"/>' +
    '<p:cNvSpPr/><p:nvPr/></p:nvSpPr><p:spPr>' +
    '<a:xfrm><a:off x="0" y="0"/><a:ext cx="' + Math.round(PX_W * PX_EMU) +
      '" cy="' + Math.round(PX_H * PX_EMU) + '"/></a:xfrm>' +
    '<a:prstGeom prst="rect"><a:avLst/></a:prstGeom>' +
    '<a:solidFill><a:srgbClr val="' + warna + '"/></a:solidFill>' +
    '<a:ln><a:noFill/></a:ln></p:spPr><p:txBody><a:bodyPr/><a:lstStyle/>' +
    '<a:p><a:endParaRPr lang="ms-MY"/></a:p></p:txBody></p:sp>';
}

function pxSlaid(isi) {
  return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<p:sld xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" ' +
    'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" ' +
    'xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">' +
    '<p:cSld><p:spTree><p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/>' +
    '</p:nvGrpSpPr><p:grpSpPr/>' + isi + '</p:spTree></p:cSld>' +
    '<p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr></p:sld>';
}

/* --------------------------------------------------------------------------
   Slaid tajuk + satu slaid bagi setiap SUB-ANUGERAH.
   🔴 Satu slaid satu sub, bukan satu slaid satu murid — sama seperti
      tayang.html. Memecah ikut murid memberi hadirin slaid yang hampir
      serupa berkali-kali.
   -------------------------------------------------------------------------- */
function pxBinaSlaid(majlis, slaid, pilihan) {
  const o = pilihan || {};
  const tinta = o.tinta || '16233A';
  const emas = o.emas || '8A6A1F';
  const latar = o.latar || 'FBFAF7';
  const keluar = [];

  /* Slaid tajuk */
  keluar.push(pxSlaid(
    pxLatar(2, latar) +
    pxKotak(3, { x: 1, y: 2.4, w: 11.333, h: 1.1, sz: 1400, spc: 300,
      warna: emas, baris: [{ teks: (majlis.sekolah || '').toUpperCase(), b: true }] }) +
    pxKotak(4, { x: 1, y: 3.1, w: 11.333, h: 1.6, sz: 4000, warna: tinta,
      baris: [{ teks: majlis.nama || 'Majlis Anugerah', b: true }] }) +
    pxKotak(5, { x: 1, y: 4.8, w: 11.333, h: 0.8, sz: 1800, warna: tinta,
      baris: [{ teks: majlis.tarikh || '', i: true }] })));

  slaid.forEach((s, i) => {
    const orang = s.orang || [];
    /* Nama dibahagi dua lajur apabila ramai, supaya saiz teks tidak
       perlu dikecilkan sehingga tidak terbaca dari belakang dewan. */
    const banyak = orang.length > 6;
    const baris = [];
    orang.forEach(p => {
      const sz = banyak ? 1600 : (orang.length > 3 ? 2000 : 2400);
      baris.push({
        teks: (p.no != null ? p.no + '.  ' : '') + p.nama +
              (p.kelas ? '   (' + agDarjahKelas(p.tahun, p.kelas) + ')' : ''),
        sz, algn: 'ctr'
      });
      /* gaya GABUNG: anugerah lain yang diterima serentak */
      if (p.lain && p.lain.length) baris.push({
        teks: 'turut menerima: ' + p.lain.join(' · '),
        sz: Math.round(sz * 0.6), i: true, warna: emas, algn: 'ctr'
      });
    });

    keluar.push(pxSlaid(
      pxLatar(2, latar) +
      pxKotak(3, { x: 0.8, y: 0.5, w: 11.733, h: 0.7, sz: 1300, spc: 260,
        warna: emas, baris: [{ teks: (s.anugerah || '').toUpperCase(), b: true }] }) +
      pxKotak(4, { x: 0.8, y: 1.2, w: 11.733, h: 1.3, sz: 3200, warna: tinta,
        baris: [{ teks: s.sub || '', b: true }] }) +
      pxKotak(5, { x: 0.8, y: 2.6, w: 11.733, h: 4.2, warna: tinta,
        anchor: 't', baris: baris.length ? baris
          : [{ teks: '(tiada penerima)', i: true, sz: 1800 }] }) +
      pxKotak(6, { x: 0.8, y: 6.9, w: 11.733, h: 0.4, sz: 1000, warna: emas,
        algn: 'r', baris: [{ teks: (i + 1) + ' / ' + slaid.length }] })));
  });

  return keluar;
}

/* --------------------------------------------------------------------------
   Fail sokongan OOXML. Minimum yang PowerPoint terima.
   -------------------------------------------------------------------------- */
function pxRujukanSlaid(n) {
  let r = '';
  for (let i = 1; i <= n; i++) {
    r += '<Relationship Id="rId' + (i + 1) + '" Type="http://schemas.openxmlformats.org/' +
      'officeDocument/2006/relationships/slide" Target="slides/slide' + i + '.xml"/>';
  }
  return r;
}

function pxSenaraiSlaid(n) {
  let r = '';
  for (let i = 1; i <= n; i++) r += '<p:sldId id="' + (255 + i) + '" r:id="rId' + (i + 1) + '"/>';
  return r;
}

async function agMuatTurunPPTX(majlis, slaid, namaFail) {
  if (typeof JSZip === 'undefined') {
    await new Promise((ya, tidak) => {
      const s = document.createElement('script');
      s.src = 'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js';
      s.onload = ya; s.onerror = () => tidak(new Error('Gagal memuat JSZip'));
      document.head.appendChild(s);
    });
  }

  const xml = pxBinaSlaid(majlis, slaid);
  const n = xml.length;
  const zip = new JSZip();

  zip.file('[Content_Types].xml',
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
    '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
    '<Default Extension="xml" ContentType="application/xml"/>' +
    '<Override PartName="/ppt/presentation.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.presentation.main+xml"/>' +
    '<Override PartName="/ppt/slideMasters/slideMaster1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slideMaster+xml"/>' +
    '<Override PartName="/ppt/slideLayouts/slideLayout1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slideLayout+xml"/>' +
    '<Override PartName="/ppt/theme/theme1.xml" ContentType="application/vnd.openxmlformats-officedocument.theme+xml"/>' +
    Array.from({ length: n }, (_, i) =>
      '<Override PartName="/ppt/slides/slide' + (i + 1) + '.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slide+xml"/>').join('') +
    '</Types>');

  zip.folder('_rels').file('.rels',
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
    '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="ppt/presentation.xml"/>' +
    '</Relationships>');

  zip.file('ppt/presentation.xml',
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<p:presentation xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" ' +
    'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" ' +
    'xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">' +
    '<p:sldMasterIdLst><p:sldMasterId id="2147483648" r:id="rId1"/></p:sldMasterIdLst>' +
    '<p:sldIdLst>' + pxSenaraiSlaid(n) + '</p:sldIdLst>' +
    '<p:sldSz cx="' + Math.round(PX_W * PX_EMU) + '" cy="' + Math.round(PX_H * PX_EMU) + '"/>' +
    '<p:notesSz cx="' + Math.round(PX_H * PX_EMU) + '" cy="' + Math.round(PX_W * PX_EMU) + '"/>' +
    '</p:presentation>');

  zip.file('ppt/_rels/presentation.xml.rels',
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
    '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideMaster" Target="slideMasters/slideMaster1.xml"/>' +
    pxRujukanSlaid(n) +
    '<Relationship Id="rId' + (n + 2) + '" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/theme" Target="theme/theme1.xml"/>' +
    '</Relationships>');

  xml.forEach((x, i) => {
    zip.file('ppt/slides/slide' + (i + 1) + '.xml', x);
    zip.file('ppt/slides/_rels/slide' + (i + 1) + '.xml.rels',
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
      '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideLayout" Target="../slideLayouts/slideLayout1.xml"/>' +
      '</Relationships>');
  });

  const kosongSp = '<p:spTree><p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/>' +
    '<p:nvPr/></p:nvGrpSpPr><p:grpSpPr/></p:spTree>';

  zip.file('ppt/slideMasters/slideMaster1.xml',
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<p:sldMaster xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" ' +
    'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" ' +
    'xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">' +
    '<p:cSld>' + kosongSp + '</p:cSld>' +
    '<p:clrMap bg1="lt1" tx1="dk1" bg2="lt2" tx2="dk2" accent1="accent1" accent2="accent2" ' +
    'accent3="accent3" accent4="accent4" accent5="accent5" accent6="accent6" hlink="hlink" ' +
    'folHlink="folHlink"/>' +
    '<p:sldLayoutIdLst><p:sldLayoutId id="2147483649" r:id="rId1"/></p:sldLayoutIdLst>' +
    '</p:sldMaster>');

  zip.file('ppt/slideMasters/_rels/slideMaster1.xml.rels',
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
    '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideLayout" Target="../slideLayouts/slideLayout1.xml"/>' +
    '<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/theme" Target="../theme/theme1.xml"/>' +
    '</Relationships>');

  zip.file('ppt/slideLayouts/slideLayout1.xml',
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<p:sldLayout xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" ' +
    'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" ' +
    'xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main" type="blank">' +
    '<p:cSld name="Kosong">' + kosongSp + '</p:cSld>' +
    '<p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr></p:sldLayout>');

  zip.file('ppt/slideLayouts/_rels/slideLayout1.xml.rels',
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
    '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideMaster" Target="../slideMasters/slideMaster1.xml"/>' +
    '</Relationships>');

  /* Tema minimum: PowerPoint menolak fail tanpa satu. */
  const fon = '<a:fontScheme name="Office"><a:majorFont><a:latin typeface="Calibri Light"/>' +
    '<a:ea typeface=""/><a:cs typeface=""/></a:majorFont><a:minorFont>' +
    '<a:latin typeface="Calibri"/><a:ea typeface=""/><a:cs typeface=""/></a:minorFont></a:fontScheme>';
  const kesan = '<a:fmtScheme name="Office"><a:fillStyleLst><a:solidFill><a:schemeClr val="phClr"/>' +
    '</a:solidFill><a:solidFill><a:schemeClr val="phClr"/></a:solidFill><a:solidFill>' +
    '<a:schemeClr val="phClr"/></a:solidFill></a:fillStyleLst><a:lnStyleLst>' +
    '<a:ln w="6350"><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:ln>' +
    '<a:ln w="12700"><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:ln>' +
    '<a:ln w="19050"><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:ln></a:lnStyleLst>' +
    '<a:effectStyleLst><a:effectStyle><a:effectLst/></a:effectStyle><a:effectStyle>' +
    '<a:effectLst/></a:effectStyle><a:effectStyle><a:effectLst/></a:effectStyle></a:effectStyleLst>' +
    '<a:bgFillStyleLst><a:solidFill><a:schemeClr val="phClr"/></a:solidFill><a:solidFill>' +
    '<a:schemeClr val="phClr"/></a:solidFill><a:solidFill><a:schemeClr val="phClr"/>' +
    '</a:solidFill></a:bgFillStyleLst></a:fmtScheme>';

  zip.file('ppt/theme/theme1.xml',
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<a:theme xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" name="ESIS">' +
    '<a:themeElements><a:clrScheme name="ESIS">' +
    '<a:dk1><a:sysClr val="windowText" lastClr="000000"/></a:dk1>' +
    '<a:lt1><a:sysClr val="window" lastClr="FFFFFF"/></a:lt1>' +
    '<a:dk2><a:srgbClr val="16233A"/></a:dk2><a:lt2><a:srgbClr val="FBFAF7"/></a:lt2>' +
    '<a:accent1><a:srgbClr val="8A6A1F"/></a:accent1><a:accent2><a:srgbClr val="16233A"/></a:accent2>' +
    '<a:accent3><a:srgbClr val="6B7280"/></a:accent3><a:accent4><a:srgbClr val="D8D2C4"/></a:accent4>' +
    '<a:accent5><a:srgbClr val="8A6A1F"/></a:accent5><a:accent6><a:srgbClr val="16233A"/></a:accent6>' +
    '<a:hlink><a:srgbClr val="8A6A1F"/></a:hlink><a:folHlink><a:srgbClr val="6B7280"/></a:folHlink>' +
    '</a:clrScheme>' + fon + kesan + '</a:themeElements>' +
    '<a:objectDefaults/><a:extraClrSchemeLst/></a:theme>');

  const blob = await zip.generateAsync({ type: 'blob',
    mimeType: 'application/vnd.openxmlformats-officedocument.presentationml.presentation' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = (namaFail || 'slaid-majlis') + '.pptx';
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 4000);
  return n;
}
