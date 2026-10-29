/* ==========================================================================
   anugerah-sijil.js — tab 🎓 Sijil dalam anugerah-admin.html
   --------------------------------------------------------------------------
   Dimuatkan SELEPAS skrip utama anugerah-admin.html; ia memakai global
   panel itu (MAJLIS, PENERIMA, $, bukaModal, tutupModal, simpanMajlis,
   susunanAnugerah) dan anugerah-kongsi.js.

   MAJLIS.sijil = {
     templat:   [{ id, nama, gambarUrl, orientasi:'L'|'P', medan:[...] }],
     lalai:     templatId,
     peta:      { anugerahId: templatId, 'anugerahId::subId': templatId },
     pentadbir: [{ nama, jawatan, ttdUrl } × 3],
     siri:      { awalan, digit, akhiran }   // format {no_siri}
   }
   medan = { id, jenis:'teks'|'gambar', x, y, w   (mm, penjuru kiri-atas)
             teks  : ayat bebas + {kod}  ·  font, pt, bold, italic, warna,
                     jajar, huruf:'asal'|'besar'|'tajuk', balut, sembunyiKosong
             gambar: sumber:'ttd1'|'ttd2'|'ttd3'|'url', url }

   🔴 SATU SIJIL SATU ANUGERAH (bukan satu seorang murid seperti tiket).
      Murid yang menang 3 anugerah mendapat 3 sijil.

   🔴 SATU PELUKIS untuk editor DAN cetakan (sjHalaman / sjIsiHalaman).
      Halaman dilukis dalam unit mm sebenar; editor hanya mengecilkannya
      dengan transform:scale. Jadi apa yang admin seret ialah apa yang
      keluar dari pencetak — tiada dua kiraan kedudukan untuk tersasar.

   🔴 Cetakan melalui dialog cetak pelayar (tetingkap baharu), bukan
      jsPDF: font Google (tulisan tangan untuk nama) terpakai tanpa
      membenam fail TTF, dan <img> dari Storage tidak perlukan CORS.

   🔴 `sijil` ditulis dengan update({sijil}) — BUKAN set(merge). Merge
      menggabung peta secara mendalam, jadi kunci `peta` yang dibuang
      admin akan hidup semula di Firestore.
   ========================================================================== */

const SJ_PX_MM = 96 / 25.4;
const SJ_SAIZ = { L: [297, 210], P: [210, 297] };
const SJ_PT_MIN = 8;

const SJ_FON = [
  ['Public Sans', 'sans-serif'],
  ['Times New Roman', 'Times, serif'],
  ['Cinzel', 'serif'],
  ['Playfair Display', 'serif'],
  ['EB Garamond', 'serif'],
  ['Fraunces', 'serif'],
  ['Montserrat', 'sans-serif'],
  ['Great Vibes', 'cursive'],
  ['Pinyon Script', 'cursive'],
  ['Alex Brush', 'cursive'],
  ['Dancing Script', 'cursive']
];
const SJ_FON_URL = 'https://fonts.googleapis.com/css2' +
  '?family=Public+Sans:ital,wght@0,400;0,700;1,400;1,700' +
  '&family=Cinzel:wght@400;700' +
  '&family=Playfair+Display:ital,wght@0,400;0,700;1,400;1,700' +
  '&family=EB+Garamond:ital,wght@0,400;0,700;1,400;1,700' +
  '&family=Fraunces:ital,wght@0,400;0,700;1,400;1,700' +
  '&family=Montserrat:ital,wght@0,400;0,700;1,400;1,700' +
  '&family=Great+Vibes&family=Pinyon+Script&family=Alex+Brush' +
  '&family=Dancing+Script:wght@400;700&display=swap';

/* Kod {…} yang admin boleh letak dalam teks. Nilai ketiga = contoh untuk
   pratonton bila majlis belum ada penerima. */
const SJ_KOD = [
  ['nama', 'Nama', 'MUHAMMAD DANIAL ASYRAF BIN MOHD KHAIRUNIZAM'],
  ['no_kp', 'No. KP', '140102-11-0011'],
  ['darjah', 'Darjah', '4'],
  ['kelas', 'Kelas', 'INTEL'],
  ['darjah_kelas', 'Darjah + kelas', '4 INTEL'],
  ['anugerah', 'Anugerah', 'ANUGERAH TERBAIK MATA PELAJARAN'],
  ['sub', 'Sub-anugerah', 'SAINS — TAHUN 4'],
  ['nilai', 'Nilai (markah/GPS)', '92.5'],
  ['giliran', 'No. giliran', '12'],
  ['no_siri', 'No. siri sijil', '012'],
  ['majlis', 'Nama majlis', 'MAJLIS ANUGERAH KECEMERLANGAN 2026'],
  ['tarikh', 'Tarikh majlis', '12 November 2026'],
  ['sekolah', 'Sekolah', 'SK SULTAN ISMAIL'],
  ['tahun', 'Tahun', '2026'],
  ['p1_nama', 'Pentadbir 1 — nama', ''],
  ['p1_jawatan', 'Pentadbir 1 — jawatan', ''],
  ['p2_nama', 'Pentadbir 2 — nama', ''],
  ['p2_jawatan', 'Pentadbir 2 — jawatan', ''],
  ['p3_nama', 'Pentadbir 3 — nama', ''],
  ['p3_jawatan', 'Pentadbir 3 — jawatan', '']
];

/* CSS halaman — dipakai dalam editor DAN tetingkap cetak. */
const SJ_CSS =
  '.sj-hal{position:relative;overflow:hidden;background:#fff;color:#000}' +
  '.sj-hal.L{width:297mm;height:210mm}.sj-hal.P{width:210mm;height:297mm}' +
  '.sj-latar{position:absolute;left:0;top:0;width:100%;height:100%;object-fit:fill;display:block}' +
  '.sj-el{position:absolute;box-sizing:border-box}' +
  '.sj-t{white-space:nowrap;line-height:1.2}' +
  '.sj-t>span{display:inline-block;white-space:nowrap}' +
  '.sj-t.balut{white-space:normal}.sj-t.balut>span{display:inline;white-space:normal}' +
  '.sj-g img{width:100%;height:auto;display:block}';

let SJ_DRAF = null;        // salinan templat yang sedang diubah
let SJ_DRAF_MAJLIS = null; // majlis pemilik draf
let SJ_PILIH = null;       // id medan dipilih
let SJ_SEJARAH = [];       // untuk ↶ Buat asal
let SJ_UBAH = false;
let SJ_CONTOH = null;      // pilihan pratonton: 'kod' | 'contoh' | indeks sijil
let SJ_SKALA = 1;
let SJ_SERET = null;
const SJ_PETA_BUKA = new Set();

/* ==========================================================================
   DATA
   ========================================================================== */
function sjSj() {
  const sj = MAJLIS.sijil = MAJLIS.sijil || {};
  if (!Array.isArray(sj.templat)) sj.templat = [];
  if (!sj.peta || typeof sj.peta !== 'object') sj.peta = {};
  if (!Array.isArray(sj.pentadbir)) sj.pentadbir = [];
  while (sj.pentadbir.length < 3) sj.pentadbir.push({ nama: '', jawatan: '', ttdUrl: '' });
  if (!sj.siri || typeof sj.siri !== 'object') sj.siri = { awalan: '', digit: 3, akhiran: '' };
  if (!sj.templat.some(t => t.id === sj.lalai)) sj.lalai = sj.templat[0] ? sj.templat[0].id : '';
  return sj;
}

async function sjTulis() {
  const data = JSON.parse(JSON.stringify(sjSj()));
  try {
    await agDb.collection('anugerah_majlis').doc(MAJLIS.id).update({ sijil: data });
  } catch (e) {
    /* Majlis baharu yang belum pernah disimpan — tulis keseluruhannya. */
    if (e && e.code === 'not-found') await simpanMajlis();
    else throw e;
  }
}

function sjIdBaru(awalan) {
  return awalan + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

/* Keutamaan: sub > anugerah > lalai majlis (corak sama seperti peperiksaan). */
function sjTemplatUntuk(anId, subId) {
  const sj = sjSj();
  const id = sj.peta[anId + '::' + subId] || sj.peta[anId] || sj.lalai;
  return sj.templat.find(t => t.id === id) || null;
}

function sjFormatKP(kp) {
  const d = String(kp || '').replace(/\D/g, '');
  return d.length === 12 ? d.slice(0, 6) + '-' + d.slice(6, 8) + '-' + d.slice(8) : String(kp || '');
}

/* Data bagi SATU sijil (satu murid × satu anugerah). */
function sjData(it) {
  const { p, x, a, s } = it;
  const luar = agAdalahLuar(p);
  const pt = sjSj().pentadbir;
  const g = (p.giliran || []).find(e => e.subId === x.subId);
  const d = {
    nama: p.nama || '',
    no_kp: luar ? '' : sjFormatKP(p.no_kp),
    darjah: luar ? '' : String(agWordDarjah(p.tahun) || ''),
    kelas: luar ? '' : String(p.kelas || ''),
    darjah_kelas: luar ? '' : agDarjahKelas(p.tahun, p.kelas),
    anugerah: x.anugerah || (a && a.nama) || '',
    sub: x.sub || (s && s.nama) || '',
    nilai: x.nilai == null ? '' : String(x.nilai),
    giliran: g && g.no != null ? String(g.no) : '',
    no_siri: '',
    majlis: MAJLIS.nama || '',
    tarikh: MAJLIS.tarikh || '',
    sekolah: MAJLIS.sekolah || '',
    tahun: String(MAJLIS.calYear || '')
  };
  sjIsiPentadbir(d, pt);
  d.no_siri = sjNoSiri(d.giliran, d);
  return d;
}

/* 🔴 No. siri = nombor GILIRAN anugerah itu, diformat. Bukan nombor
   kedua yang dijana sendiri — satu nombor sahaja supaya sijil sentiasa
   sepadan dengan tiket. Tiada giliran → kosong → item disembunyikan.
   Awalan/akhiran boleh membawa kod lain, contohnya {tahun}. */
function sjNoSiri(giliran, data, siri) {
  const g = String(giliran == null ? '' : giliran).trim();
  if (!g) return '';
  const f = siri || sjSj().siri;
  const digit = Math.max(0, Math.min(6, Number(f.digit) || 0));
  const no = /^\d+$/.test(g) && digit ? g.padStart(digit, '0') : g;
  const luar = Object.assign({}, data, { no_siri: '' });
  return sjGanti(f.awalan, luar).teks + no + sjGanti(f.akhiran, luar).teks;
}

function sjIsiPentadbir(d, pt) {
  [0, 1, 2].forEach(i => {
    d['p' + (i + 1) + '_nama'] = (pt[i] && pt[i].nama) || '';
    d['p' + (i + 1) + '_jawatan'] = (pt[i] && pt[i].jawatan) || '';
  });
  return d;
}

function sjDataContoh() {
  const d = {};
  SJ_KOD.forEach(([k, , c]) => { d[k] = c; });
  if (MAJLIS.nama) d.majlis = MAJLIS.nama;
  if (MAJLIS.tarikh) d.tarikh = MAJLIS.tarikh;
  if (MAJLIS.sekolah) d.sekolah = MAJLIS.sekolah;
  if (MAJLIS.calYear) d.tahun = String(MAJLIS.calYear);
  sjIsiPentadbir(d, sjSj().pentadbir);
  d.no_siri = sjNoSiri(d.giliran, d);
  return d;
}

/* Semua sijil majlis, dalam turutan naik pentas (nombor giliran bila ada). */
function sjSemuaSijil() {
  if (!MAJLIS) return [];
  return agBinaTurutan(MAJLIS, PENERIMA).map(({ p, a, s }, i) => {
    const x = (p.anugerah || []).find(e => e.subId === s.id) ||
              { anugerahId: a.id, anugerah: a.nama, subId: s.id, sub: s.nama };
    const g = (p.giliran || []).find(e => e.subId === s.id);
    return {
      p, a, s, x, i,
      no: g && g.no != null && g.no !== '' ? Number(g.no) : null,
      templat: sjTemplatUntuk(a.id, s.id)
    };
  }).sort((u, v) => {
    const nu = u.no == null ? Infinity : u.no, nv = v.no == null ? Infinity : v.no;
    return nu !== nv ? (nu < nv ? -1 : 1) : u.i - v.i;
  });
}

/* ==========================================================================
   PELUKIS HALAMAN — satu untuk editor dan cetakan
   ========================================================================== */
function sjFonCss(nama) {
  const f = SJ_FON.find(x => x[0] === nama) || SJ_FON[0];
  return '"' + f[0] + '", ' + f[1];
}
function sjWarna(w) { return /^#[0-9a-f]{6}$/i.test(String(w || '')) ? w : '#000000'; }
function sjNum(v, lalai) { const n = Number(v); return isFinite(n) ? n : lalai; }

function sjGanti(teks, data) {
  const s = String(teks || '');
  if (!data) return { teks: s, kosong: false };
  let kosong = false;
  const hasil = s.replace(/\{([a-z0-9_]+)\}/gi, (penuh, k) => {
    const kunci = k.toLowerCase();
    if (!(kunci in data)) return penuh;   // kod salah eja kekal kelihatan
    const v = String(data[kunci] == null ? '' : data[kunci]).trim();
    if (!v) kosong = true;
    return v;
  });
  return { teks: hasil, kosong };
}

const SJ_KECIL_KEKAL = new Set(['bin', 'binti', 'bt', 'bte', 'a/l', 'a/p', 'dan', '@']);
function sjTajuk(s) {
  return String(s).toLowerCase().split(/(\s+)/).map((w, i) => {
    if (!w || /^\s+$/.test(w)) return w;
    if (i > 0 && SJ_KECIL_KEKAL.has(w)) return w;
    return w.replace(/(^|[-'(])([a-zÀ-ɏ])/g, (m, a, b) => a + b.toUpperCase());
  }).join('');
}
function sjHuruf(s, huruf) {
  if (huruf === 'besar') return String(s).toLocaleUpperCase('ms');
  if (huruf === 'tajuk') return sjTajuk(s);
  return String(s);
}

function sjSrcGambar(m) {
  if (m.sumber === 'url') return m.url || '';
  const i = { ttd1: 0, ttd2: 1, ttd3: 2 }[m.sumber];
  const pt = sjSj().pentadbir[i];
  return (pt && pt.ttdUrl) || '';
}
function sjLabelGambar(m) {
  if (m.sumber === 'url') return 'Gambar';
  const n = String(m.sumber || '').replace('ttd', '');
  return 'Tandatangan P' + n;
}

function sjHtmlMedan(m, data, editor) {
  const pilih = editor && m.id === SJ_PILIH;
  const asas = 'left:' + sjNum(m.x, 0) + 'mm;top:' + sjNum(m.y, 0) + 'mm;width:' + sjNum(m.w, 50) + 'mm;';
  const atr = editor ? ' data-id="' + agEsc(m.id) + '"' : '';
  const pegang = pilih ? '<i class="sj-pegang" data-pegang="1" title="Seret untuk ubah lebar"></i>' : '';

  if (m.jenis === 'gambar') {
    const src = sjSrcGambar(m);
    if (!src) {
      if (!editor) return '';
      return '<div class="sj-el sj-g kosong' + (pilih ? ' pilih' : '') + '"' + atr +
        ' style="' + asas + 'height:' + (sjNum(m.w, 40) * 0.4) + 'mm"><span>' +
        agEsc(sjLabelGambar(m)) + '<br>(belum dimuat naik)</span>' + pegang + '</div>';
    }
    return '<div class="sj-el sj-g' + (pilih ? ' pilih' : '') + '"' + atr + ' style="' + asas + '">' +
      '<img src="' + agEsc(src) + '" alt="" draggable="false">' + pegang + '</div>';
  }

  const r = sjGanti(m.teks, data);
  const sembunyi = r.kosong && m.sembunyiKosong !== false;
  if (sembunyi && !editor) return '';
  const pt = sjNum(m.pt, 14);
  const gaya = asas +
    'font-family:' + sjFonCss(m.font) + ';font-size:' + pt + 'pt;' +
    'font-weight:' + (m.bold ? 700 : 400) + ';font-style:' + (m.italic ? 'italic' : 'normal') + ';' +
    'color:' + sjWarna(m.warna) + ';text-align:' + (['left', 'right'].includes(m.jajar) ? m.jajar : 'center');
  /* Dalam editor, medan yang akan disembunyikan masih dilukis (pudar,
     memaparkan kodnya) supaya admin tetap boleh memegang dan menyeretnya. */
  const teks = sembunyi ? m.teks : sjHuruf(r.teks, m.huruf);
  const kelas = 'sj-el sj-t' + (m.balut ? ' balut' : '') + (pilih ? ' pilih' : '') + (sembunyi ? ' kosong' : '');
  return '<div class="' + kelas + '"' + atr + ' data-pt="' + pt + '"' + (m.balut ? '' : ' data-muat="1"') +
    ' style="' + gaya + '"><span>' + (agEsc(teks) || '&nbsp;') + '</span>' + pegang + '</div>';
}

function sjIsiHalaman(t, data, editor) {
  return (t.gambarUrl ? '<img class="sj-latar" src="' + agEsc(t.gambarUrl) + '" alt="" draggable="false">' : '') +
    (t.medan || []).map(m => sjHtmlMedan(m, data, editor)).join('');
}
function sjOrientasi(t) { return t && t.orientasi === 'P' ? 'P' : 'L'; }
function sjHalaman(t, data) {
  return '<div class="sj-hal ' + sjOrientasi(t) + '">' + sjIsiHalaman(t, data, false) + '</div>';
}

/* 🔴 Auto-kecil font — teks tidak dibaluti, jadi yang terlalu panjang
   akan terkeluar dari kotaknya (dan dari kertas) tanpa amaran. Pengajaran
   yang sama dengan _slipTeksMuat dalam slip ESIS: kecilkan 0.25pt setiap
   langkah, berhenti pada 8pt. Diukur dalam unit susun atur (tidak terjejas
   oleh transform:scale editor). */
function sjMuatkanSatu(el) {
  const span = el.querySelector('span');
  if (!span) return;
  const asal = Number(el.dataset.pt) || 14;
  const min = Math.min(SJ_PT_MIN, asal);
  let pt = asal, n = 0;
  el.style.fontSize = pt + 'pt';
  while (span.offsetWidth > el.clientWidth + 0.5 && pt > min && n++ < 400) {
    pt = Math.max(min, pt - 0.25);
    el.style.fontSize = pt + 'pt';
  }
  el.dataset.ptPakai = pt;
}
function sjMuatkan(akar) {
  akar.querySelectorAll('.sj-t[data-muat]').forEach(sjMuatkanSatu);
}

/* Fon dimuat apabila dipakai; ukuran sebelum fon tiba memberi lebar fon
   ganti. Muatkan dahulu, kemudian ukur. */
function sjFonDipakai(templatList) {
  const set = new Set();
  templatList.forEach(t => (t.medan || []).forEach(m => {
    if (m.jenis !== 'gambar') set.add((m.italic ? 'italic ' : '') + (m.bold ? '700 ' : '400 ') + '20px "' + (m.font || 'Public Sans') + '"');
  }));
  return Array.from(set);
}
async function sjTungguFon(doc, templatList) {
  if (!doc.fonts || !doc.fonts.load) return;
  try {
    await Promise.race([
      Promise.all(sjFonDipakai(templatList).map(f => doc.fonts.load(f))),
      new Promise(ok => setTimeout(ok, 6000))
    ]);
  } catch (e) { /* fon gagal → fon ganti; ukuran tetap dibuat */ }
}

function sjPastiGaya() {
  if (!document.getElementById('sj-fon')) {
    const l = document.createElement('link');
    l.id = 'sj-fon'; l.rel = 'stylesheet'; l.href = SJ_FON_URL;
    document.head.appendChild(l);
  }
  if (!document.getElementById('sj-css')) {
    const s = document.createElement('style');
    s.id = 'sj-css'; s.textContent = SJ_CSS;
    document.head.appendChild(s);
  }
}

/* ==========================================================================
   MUAT NAIK GAMBAR — Storage `public/sijil/`
   ========================================================================== */
async function sjStorage() {
  if (!firebase.storage) {
    await new Promise((ok, gagal) => {
      const s = document.createElement('script');
      s.src = 'https://www.gstatic.com/firebasejs/9.23.0/firebase-storage-compat.js';
      s.onload = ok;
      s.onerror = () => gagal(new Error('Gagal memuat Firebase Storage'));
      document.head.appendChild(s);
    });
  }
  return firebase.storage();
}

/* Gambar dikecilkan dalam pelayar sebelum dimuat naik. Template A4
   300dpi dari Canva boleh melebihi had 5MB storage.rules; 3508px ialah
   A4 pada 300dpi — tiada butiran hilang semasa dicetak.
   Templat → JPEG (latar putih). Tandatangan/cop → PNG (kekal telus). */
async function sjKecilkan(file, maxPx, jenis) {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise((ok, gagal) => {
      const i = new Image();
      i.onload = () => ok(i);
      i.onerror = () => gagal(new Error('Fail ini bukan gambar yang boleh dibaca'));
      i.src = url;
    });
    const k = Math.min(1, maxPx / Math.max(img.naturalWidth, img.naturalHeight));
    const c = document.createElement('canvas');
    c.width = Math.round(img.naturalWidth * k);
    c.height = Math.round(img.naturalHeight * k);
    const ctx = c.getContext('2d');
    if (jenis === 'image/jpeg') { ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, c.width, c.height); }
    ctx.drawImage(img, 0, 0, c.width, c.height);
    const blob = await new Promise(ok => c.toBlob(ok, jenis, 0.9));
    if (!blob) throw new Error('Gagal memproses gambar');
    return { blob, w: c.width, h: c.height };
  } finally {
    URL.revokeObjectURL(url);
  }
}

async function sjMuatNaik(file, peranan) {
  if (!file || !/^image\//.test(file.type)) throw new Error('Sila pilih fail gambar (PNG/JPG)');
  const templat = peranan === 'templat';
  const jenis = templat ? 'image/jpeg' : 'image/png';
  const { blob, w, h } = await sjKecilkan(file, templat ? 3508 : 1200, jenis);
  if (blob.size > 5 * 1024 * 1024) throw new Error('Gambar masih melebihi 5MB selepas dikecilkan');
  const st = await sjStorage();
  const laluan = 'public/sijil/' + MAJLIS.id + '_' + peranan + '_' + Date.now() + (templat ? '.jpg' : '.png');
  const ref = st.ref().child(laluan);
  await ref.put(blob, { contentType: jenis });
  return { url: await ref.getDownloadURL(), w, h };
}

/* Buka pemilih fail, pulangkan File (atau null). */
function sjPilihFail() {
  return new Promise(ok => {
    const i = document.createElement('input');
    i.type = 'file'; i.accept = 'image/png,image/jpeg';
    i.onchange = () => ok(i.files && i.files[0] ? i.files[0] : null);
    i.click();
  });
}

/* ==========================================================================
   INIT TAB
   ========================================================================== */
function sjInit() {
  if (!MAJLIS) return;
  sjPastiGaya();
  sjSj();
  if (SJ_DRAF && SJ_DRAF_MAJLIS !== MAJLIS.id) sjTutupEditor(true);
  sjLukisTemplat();
  sjLukisPentadbir();
  sjLukisSiri();
  sjLukisPeta();
  sjIsiTapisCetak();
  sjLukisCetak();
  if (SJ_DRAF) sjLukisEditor();
}

/* ---------- Kad 1: senarai templat ---------- */
function sjKiraGuna() {
  const kira = {};
  sjSemuaSijil().forEach(it => { if (it.templat) kira[it.templat.id] = (kira[it.templat.id] || 0) + 1; });
  return kira;
}

function sjLukisTemplat() {
  const bekas = $('sj-templat');
  const sj = sjSj();
  if (!sj.templat.length) {
    bekas.innerHTML = '<div class="kosong">Belum ada templat. Tekan <strong>➕ Templat baharu</strong> dan pilih ' +
      'gambar sijil kosong (contohnya PNG/JPG yang dieksport dari Canva, saiz A4).</div>';
    return;
  }
  const guna = sjKiraGuna();
  bekas.innerHTML = '<div class="sj-templat-grid">' + sj.templat.map(t => {
    const lalai = t.id === sj.lalai;
    return '<div class="sj-tp">' +
      (t.gambarUrl ? '<img src="' + agEsc(t.gambarUrl) + '" alt="">' : '<div class="sj-tp-kosong">Tiada gambar</div>') +
      '<div class="isi">' +
        '<strong>' + agEsc(t.nama || 'Templat') + '</strong>' +
        '<span class="hint" style="margin:0">' + (sjOrientasi(t) === 'L' ? 'Melintang' : 'Menegak') + ' · ' +
          (t.medan || []).length + ' item · ' + (guna[t.id] || 0) + ' sijil</span>' +
        (lalai ? '<span class="pil emas" style="align-self:flex-start">⭐ Lalai</span>' : '') +
        '<div class="tindakan">' +
          '<button class="btn emas kecil" data-sj-ubah="' + agEsc(t.id) + '">✏️ Ubah</button>' +
          (lalai ? '' : '<button class="btn sunyi kecil" data-sj-lalai="' + agEsc(t.id) + '">⭐ Jadikan lalai</button>') +
          '<button class="btn sunyi kecil" data-sj-pendua="' + agEsc(t.id) + '" title="Pendua">⧉</button>' +
          '<button class="btn sunyi kecil" data-sj-buang="' + agEsc(t.id) + '" title="Buang">🗑</button>' +
        '</div>' +
      '</div></div>';
  }).join('') + '</div>';
}

$('sj-templat').addEventListener('click', async e => {
  const b = e.target.closest('button');
  if (!b) return;
  const sj = sjSj();
  if (b.dataset.sjUbah) return sjBukaEditor(b.dataset.sjUbah);

  if (b.dataset.sjLalai) {
    const lama = sj.lalai;
    sj.lalai = b.dataset.sjLalai;
    try { await sjTulis(); agToast('Templat lalai ditukar', 'ok'); }
    catch (er) { sj.lalai = lama; agToast('Gagal menyimpan: ' + er.message, 'ralat'); }
    sjLukisSemuaKecualiEditor();
    return;
  }

  if (b.dataset.sjPendua) {
    const asal = sj.templat.find(t => t.id === b.dataset.sjPendua);
    if (!asal) return;
    const baru = JSON.parse(JSON.stringify(asal));
    baru.id = sjIdBaru('sj_');
    baru.nama = (asal.nama || 'Templat') + ' (salinan)';
    sj.templat.push(baru);
    try { await sjTulis(); agToast('Templat dipenduakan', 'ok'); }
    catch (er) { sj.templat.pop(); agToast('Gagal menyimpan: ' + er.message, 'ralat'); }
    sjLukisSemuaKecualiEditor();
    return;
  }

  if (b.dataset.sjBuang) {
    const id = b.dataset.sjBuang;
    const t = sj.templat.find(x => x.id === id);
    const guna = sjKiraGuna()[id] || 0;
    if (!confirm('Buang templat "' + (t && t.nama) + '"?\n\n' +
      (guna ? guna + ' sijil sedang memakainya — ia akan bertukar ke templat lalai.\n' : '') +
      'Penerima dan anugerah tidak disentuh.')) return;
    const salinan = JSON.parse(JSON.stringify(sj));
    sj.templat = sj.templat.filter(x => x.id !== id);
    Object.keys(sj.peta).forEach(k => { if (sj.peta[k] === id) delete sj.peta[k]; });
    sjSj();
    try { await sjTulis(); agToast('Templat dibuang', 'ok'); if (SJ_DRAF && SJ_DRAF.id === id) sjTutupEditor(true); }
    catch (er) { MAJLIS.sijil = salinan; agToast('Gagal membuang: ' + er.message, 'ralat'); }
    sjLukisSemuaKecualiEditor();
  }
});

$('sj-b-baru').addEventListener('click', async () => {
  if (!MAJLIS) return;
  const fail = await sjPilihFail();
  if (!fail) return;
  const b = $('sj-b-baru');
  b.disabled = true; b.textContent = 'Memuat naik…';
  try {
    const { url, w, h } = await sjMuatNaik(fail, 'templat');
    const o = w >= h ? 'L' : 'P';
    sjAmaranNisbah(w, h, o);
    const sj = sjSj();
    const t = {
      id: sjIdBaru('sj_'),
      nama: 'Templat ' + (sj.templat.length + 1),
      gambarUrl: url, orientasi: o,
      medan: sjMedanAwal(o)
    };
    sj.templat.push(t);
    sjSj();
    await sjTulis();
    agToast('Templat dimuat naik — susun item dalam editor di bawah', 'ok');
    sjLukisSemuaKecualiEditor();
    sjBukaEditor(t.id);
  } catch (er) {
    console.error(er);
    agToast('Gagal: ' + er.message, 'ralat');
  } finally {
    b.disabled = false; b.textContent = '➕ Templat baharu';
  }
});

/* Gambar yang bukan nisbah A4 akan diregang untuk memenuhi halaman. */
function sjAmaranNisbah(w, h, o) {
  const [W, H] = SJ_SAIZ[o];
  const beza = Math.abs((w / h) / (W / H) - 1);
  if (beza > 0.03) agToast('Nisbah gambar bukan A4 — ia akan diregang memenuhi halaman. Eksport sebagai A4 untuk hasil tepat.', 'ralat');
}

$('sj-b-salin').addEventListener('click', () => {
  const lain = SENARAI_MAJLIS.filter(m => m.id !== MAJLIS.id && m.sijil && (m.sijil.templat || []).length);
  if (!lain.length) { agToast('Tiada majlis lain yang ada templat sijil'); return; }
  const lapis = bukaModal(
    '<div class="kad-kepala"><h3>Salin templat dari majlis lain</h3>' +
      '<button class="b-tutup" id="sj-mx" aria-label="Tutup">×</button></div>' +
    '<div class="kad-isi">' + lain.map(m =>
      '<div class="sj-peta-baris"><span class="nm">' + agEsc(m.nama || m.id) +
        ' <span class="hint" style="margin:0">· ' + m.sijil.templat.length + ' templat</span></span>' +
        '<button class="btn emas kecil" data-sj-dari="' + agEsc(m.id) + '">📥 Salin</button></div>').join('') +
      '<p class="hint">Templat disalin sebagai salinan baharu — majlis asal tidak berubah. ' +
      'Pentadbir disalin hanya jika majlis ini belum mengisinya.</p></div>');
  $('sj-mx').onclick = tutupModal;
  lapis.onclick = async e => {
    const b = e.target.closest('button[data-sj-dari]');
    if (!b) return;
    const dari = SENARAI_MAJLIS.find(m => m.id === b.dataset.sjDari);
    const sj = sjSj();
    const salinan = JSON.parse(JSON.stringify(sj));
    JSON.parse(JSON.stringify(dari.sijil.templat)).forEach(t => {
      t.id = sjIdBaru('sj_');
      sj.templat.push(t);
    });
    const kosongPt = sj.pentadbir.every(x => !x.nama && !x.jawatan && !x.ttdUrl);
    if (kosongPt && Array.isArray(dari.sijil.pentadbir)) sj.pentadbir = JSON.parse(JSON.stringify(dari.sijil.pentadbir));
    sjSj();
    try { await sjTulis(); agToast(dari.sijil.templat.length + ' templat disalin', 'ok'); tutupModal(); }
    catch (er) { MAJLIS.sijil = salinan; agToast('Gagal menyalin: ' + er.message, 'ralat'); }
    sjLukisSemuaKecualiEditor();
  };
});

function sjLukisSemuaKecualiEditor() {
  sjLukisTemplat();
  sjLukisPentadbir();
  sjLukisSiri();
  sjLukisPeta();
  sjIsiTapisCetak();
  sjLukisCetak();
}

/* Susun atur permulaan — titik mula, bukan reka bentuk akhir. */
function sjMedanAwal(o) {
  const [W, H] = SJ_SAIZ[o];
  const w = Math.round(W * 0.8), x = (W - w) / 2;
  const y0 = Math.round(H * 0.42);
  return [
    sjTeksBaru('{nama}', { x, w, y: y0, pt: 26, font: 'Cinzel', bold: true, huruf: 'besar' }, o),
    sjTeksBaru('{darjah_kelas}', { x, w, y: y0 + 14, pt: 14 }, o),
    sjTeksBaru('{sub}', { x, w, y: y0 + 26, pt: 17, bold: true }, o)
  ].concat(sjBlokPentadbir(1, o, W / 2 - 40, H - 52));
}

function sjTeksBaru(teks, o, orientasi) {
  const [W, H] = SJ_SAIZ[orientasi || 'L'];
  const w = o.w || Math.round(W * 0.6);
  return Object.assign({
    id: sjIdBaru('m_'), jenis: 'teks', teks,
    x: (W - w) / 2, y: Math.round(H * 0.45), w,
    font: 'Public Sans', pt: 16, bold: false, italic: false,
    warna: '#16233A', jajar: 'center', huruf: 'asal', balut: false, sembunyiKosong: true
  }, o);
}

/* Tandatangan + nama + jawatan, sebagai tiga item biasa — admin boleh
   mengalih setiap satu sendiri selepas ini. */
function sjBlokPentadbir(n, orientasi, x, y) {
  return [
    { id: sjIdBaru('m_'), jenis: 'gambar', sumber: 'ttd' + n, x: x + 17.5, y, w: 45 },
    sjTeksBaru('{p' + n + '_nama}', { x, y: y + 22, w: 80, pt: 11, bold: true, huruf: 'besar' }, orientasi),
    sjTeksBaru('{p' + n + '_jawatan}', { x, y: y + 27.5, w: 80, pt: 10 }, orientasi)
  ];
}

/* ---------- Kad: pentadbir ---------- */
function sjLukisPentadbir() {
  const pt = sjSj().pentadbir;
  $('sj-pentadbir').innerHTML = '<div class="sj-pt-grid">' + pt.map((x, i) =>
    '<div class="sj-pt">' +
      '<strong>Pentadbir ' + (i + 1) + '</strong>' +
      '<div class="medan" style="width:100%"><label>Nama</label>' +
        '<input type="text" data-pt-i="' + i + '" data-pt-k="nama" value="' + agEsc(x.nama) + '" placeholder="Contoh: Hj. Ahmad bin Ali"></div>' +
      '<div class="medan" style="width:100%"><label>Jawatan</label>' +
        '<input type="text" data-pt-i="' + i + '" data-pt-k="jawatan" value="' + agEsc(x.jawatan) + '" placeholder="Contoh: Guru Besar"></div>' +
      '<label class="hint" style="margin:0">Tandatangan</label>' +
      '<div class="sj-ttd">' + (x.ttdUrl ? '<img src="' + agEsc(x.ttdUrl) + '" alt="">' : 'Tiada') + '</div>' +
      '<div class="baris-input">' +
        '<button class="btn sunyi kecil" data-pt-naik="' + i + '">📤 Muat naik</button>' +
        (x.ttdUrl ? '<button class="btn sunyi kecil" data-pt-buang="' + i + '">✕ Buang</button>' : '') +
      '</div>' +
    '</div>').join('') + '</div>';
}

$('sj-pentadbir').addEventListener('input', e => {
  const el = e.target.closest('[data-pt-i]');
  if (!el) return;
  sjSj().pentadbir[Number(el.dataset.ptI)][el.dataset.ptK] = el.value;
  $('sj-pt-status').textContent = 'Belum disimpan';
  if (SJ_DRAF) sjLukisKanvas();
});

$('sj-pentadbir').addEventListener('click', async e => {
  const b = e.target.closest('button');
  if (!b) return;
  const pt = sjSj().pentadbir;
  if (b.dataset.ptNaik != null) {
    const i = Number(b.dataset.ptNaik);
    const fail = await sjPilihFail();
    if (!fail) return;
    b.disabled = true; b.textContent = 'Memuat naik…';
    const lama = pt[i].ttdUrl;
    try {
      pt[i].ttdUrl = (await sjMuatNaik(fail, 'ttd' + (i + 1))).url;
      await sjTulis();
      $('sj-pt-status').textContent = '';
      agToast('Tandatangan disimpan', 'ok');
    } catch (er) {
      pt[i].ttdUrl = lama;
      agToast('Gagal: ' + er.message, 'ralat');
    }
    sjLukisPentadbir();
    if (SJ_DRAF) sjLukisKanvas();
  }
  if (b.dataset.ptBuang != null) {
    const i = Number(b.dataset.ptBuang);
    if (!confirm('Buang tandatangan Pentadbir ' + (i + 1) + '?')) return;
    const lama = pt[i].ttdUrl;
    pt[i].ttdUrl = '';
    try { await sjTulis(); agToast('Tandatangan dibuang', 'ok'); }
    catch (er) { pt[i].ttdUrl = lama; agToast('Gagal: ' + er.message, 'ralat'); }
    sjLukisPentadbir();
    if (SJ_DRAF) sjLukisKanvas();
  }
});

$('sj-pt-simpan').addEventListener('click', async () => {
  try {
    await sjTulis();
    $('sj-pt-status').textContent = '';
    agToast('Pentadbir disimpan', 'ok');
  } catch (er) { agToast('Gagal menyimpan: ' + er.message, 'ralat'); }
});

/* 🔴 Tetapan slip ESIS disimpan dalam localStorage PELAYAR (slipTemplateSettings),
   bukan Firestore — jadi ia hanya ada di komputer tempat admin menyimpannya.
   Butang ini menyalin masuk sekali; selepas Simpan, sijil berdiri sendiri. */
$('sj-pt-esis').addEventListener('click', () => {
  let slip = null;
  try { slip = JSON.parse(localStorage.getItem('slipTemplateSettings') || 'null'); } catch (e) { slip = null; }
  if (!slip || !(slip.namaGuruBesar || slip.jawatan || slip.tandatanganGB)) {
    agToast('Tetapan slip ESIS tiada dalam pelayar ini. Ia disimpan dalam pelayar, bukan pangkalan data — isi atau muat naik di sini.', 'ralat');
    return;
  }
  const p = sjSj().pentadbir[0];
  if ((p.nama || p.jawatan || p.ttdUrl) && !confirm('Ganti Pentadbir 1 dengan data dari slip ESIS?')) return;
  p.nama = slip.namaGuruBesar || '';
  p.jawatan = slip.jawatan || '';
  p.ttdUrl = slip.tandatanganGB || '';
  sjLukisPentadbir();
  $('sj-pt-status').textContent = 'Belum disimpan — tekan 💾 Simpan';
  agToast('Disalin dari slip ESIS — tekan 💾 Simpan untuk sahkan');
  if (SJ_DRAF) sjLukisKanvas();
});

/* ==========================================================================
   EDITOR
   ========================================================================== */
function sjBukaEditor(id) {
  if (SJ_DRAF && SJ_UBAH && SJ_DRAF.id !== id &&
      !confirm('Templat "' + SJ_DRAF.nama + '" ada perubahan belum disimpan. Buang perubahan itu?')) return;
  const t = sjSj().templat.find(x => x.id === id);
  if (!t) return;
  SJ_DRAF = JSON.parse(JSON.stringify(t));
  SJ_DRAF.medan = SJ_DRAF.medan || [];
  SJ_DRAF_MAJLIS = MAJLIS.id;
  SJ_PILIH = null;
  SJ_SEJARAH = [];
  SJ_UBAH = false;
  sjLukisEditor();
  $('sj-kad-editor').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function sjTutupEditor(paksa) {
  if (!paksa && SJ_UBAH && !confirm('Ada perubahan belum disimpan. Tutup juga?')) return;
  SJ_DRAF = null; SJ_DRAF_MAJLIS = null; SJ_PILIH = null; SJ_SEJARAH = []; SJ_UBAH = false;
  tunjuk($('sj-kad-editor'), false);
}

function sjTanda() {
  const el = $('sj-e-status');
  if (el) el.textContent = SJ_UBAH ? '● Belum disimpan' : '';
  const u = $('sj-e-undo');
  if (u) u.disabled = !SJ_SEJARAH.length;
}

function sjSejarah() {
  SJ_SEJARAH.push(JSON.stringify(SJ_DRAF.medan));
  if (SJ_SEJARAH.length > 80) SJ_SEJARAH.shift();
}
function sjBuatAsal() {
  if (!SJ_SEJARAH.length) return;
  SJ_DRAF.medan = JSON.parse(SJ_SEJARAH.pop());
  if (!SJ_DRAF.medan.some(m => m.id === SJ_PILIH)) SJ_PILIH = null;
  SJ_UBAH = true;
  sjLukisKanvas(); sjLukisSifat(); sjTanda();
}

function sjMedan(id) { return SJ_DRAF && SJ_DRAF.medan.find(m => m.id === id); }

function sjLukisEditor() {
  tunjuk($('sj-kad-editor'), true);
  $('sj-e-nama').value = SJ_DRAF.nama || '';
  /* Pratonton: lalai = murid dengan nama paling panjang — kes paling
     sukar untuk muat, jadi admin melihatnya dahulu. */
  const semua = sjSemuaSijil();
  const s = $('sj-e-contoh');
  let terpanjang = -1;
  semua.forEach((it, i) => {
    if (terpanjang < 0 || String(it.p.nama || '').length > String(semua[terpanjang].p.nama || '').length) terpanjang = i;
  });
  s.innerHTML =
    '<option value="kod">Tunjuk kod {nama}</option>' +
    '<option value="contoh">Data contoh</option>' +
    semua.map((it, i) => '<option value="' + i + '">' + (i === terpanjang ? '⟷ ' : '') +
      agEsc(it.p.nama) + ' — ' + agEsc(it.x.sub || it.s.nama) + '</option>').join('');
  if (SJ_CONTOH == null || (SJ_CONTOH !== 'kod' && SJ_CONTOH !== 'contoh' && !semua[SJ_CONTOH])) {
    SJ_CONTOH = terpanjang >= 0 ? String(terpanjang) : 'contoh';
  }
  s.value = SJ_CONTOH;
  sjLukisKanvas();
  sjLukisSifat();
  sjTanda();
}

function sjDataPratonton() {
  if (SJ_CONTOH === 'kod') return null;
  if (SJ_CONTOH === 'contoh') return sjDataContoh();
  const it = sjSemuaSijil()[Number(SJ_CONTOH)];
  return it ? sjData(it) : sjDataContoh();
}

function sjLukisKanvas() {
  const bekas = $('sj-kanvas');
  if (!SJ_DRAF || !bekas) return;
  const o = sjOrientasi(SJ_DRAF);
  const [W, H] = SJ_SAIZ[o];
  const lebar = Math.max(320, bekas.clientWidth - 26);
  SJ_SKALA = lebar / (W * SJ_PX_MM);
  bekas.innerHTML =
    '<div class="sj-skala" style="width:' + lebar + 'px;height:' + (H * SJ_PX_MM * SJ_SKALA) + 'px">' +
      '<div class="sj-hal ' + o + '" id="sj-hal" style="transform:scale(' + SJ_SKALA + ')">' +
        sjIsiHalaman(SJ_DRAF, sjDataPratonton(), true) +
        '<div class="sj-pandu" id="sj-pandu" style="left:' + (W / 2) + 'mm" hidden></div>' +
      '</div></div>';
  sjMuatkan(bekas);
  sjTungguFon(document, [SJ_DRAF]).then(() => {
    if ($('sj-hal')) { sjMuatkan($('sj-kanvas')); sjNotaKecil(); }
  });
}

/* ---------- seret & ubah lebar ---------- */
$('sj-kanvas').addEventListener('pointerdown', e => {
  if (!SJ_DRAF || e.button !== 0) return;
  const el = e.target.closest('.sj-el[data-id]');
  if (!el) {
    if (e.target.closest('#sj-hal') && SJ_PILIH) { SJ_PILIH = null; sjLukisKanvas(); sjLukisSifat(); }
    return;
  }
  e.preventDefault();
  const m = sjMedan(el.dataset.id);
  if (!m) return;
  const lebar = !!e.target.closest('[data-pegang]');
  if (SJ_PILIH !== m.id) { SJ_PILIH = m.id; sjLukisKanvas(); sjLukisSifat(); }
  sjSejarah();
  SJ_SERET = {
    m, lebar, gerak: false,
    px0: e.clientX, py0: e.clientY, x0: sjNum(m.x, 0), y0: sjNum(m.y, 0), w0: sjNum(m.w, 50),
    el: $('sj-hal').querySelector('[data-id="' + CSS.escape(m.id) + '"]')
  };
});

const sjBundar = v => Math.round(v * 2) / 2;

document.addEventListener('pointermove', e => {
  const S = SJ_SERET;
  if (!S || !S.el) return;
  if (!S.gerak && Math.abs(e.clientX - S.px0) + Math.abs(e.clientY - S.py0) < 3) return;
  S.gerak = true;
  const k = SJ_SKALA * SJ_PX_MM;
  const dx = (e.clientX - S.px0) / k, dy = (e.clientY - S.py0) / k;
  const [W, H] = SJ_SAIZ[sjOrientasi(SJ_DRAF)];
  const m = S.m;
  const pandu = $('sj-pandu');

  if (S.lebar) {
    m.w = Math.min(W, Math.max(5, sjBundar(S.w0 + dx)));
    S.el.style.width = m.w + 'mm';
    if (S.el.classList.contains('sj-g') && S.el.classList.contains('kosong')) S.el.style.height = (m.w * 0.4) + 'mm';
    if (S.el.dataset.muat) sjMuatkanSatu(S.el);
  } else {
    let x = sjBundar(S.x0 + dx), y = sjBundar(S.y0 + dy);
    /* Lekat ke tengah halaman — nama dan tajuk hampir sentiasa di tengah.
       Tahan Alt untuk meletak bebas. */
    let lekat = false;
    if (!e.altKey && Math.abs(x + m.w / 2 - W / 2) < 1.5) { x = sjBundar(W / 2 - m.w / 2); lekat = true; }
    x = Math.min(W - 5, Math.max(5 - m.w, x));
    y = Math.min(H - 3, Math.max(-5, y));
    m.x = x; m.y = y;
    S.el.style.left = x + 'mm';
    S.el.style.top = y + 'mm';
    if (pandu) pandu.hidden = !lekat;
  }
  sjKemasXY();
});

document.addEventListener('pointerup', () => {
  const S = SJ_SERET;
  if (!S) return;
  SJ_SERET = null;
  const pandu = $('sj-pandu');
  if (pandu) pandu.hidden = true;
  if (!S.gerak) { SJ_SEJARAH.pop(); return; }
  SJ_UBAH = true;
  sjTanda();
  sjLukisSifat();
});

function sjKemasXY() {
  const m = sjMedan(SJ_PILIH);
  if (!m) return;
  ['x', 'y', 'w'].forEach(k => {
    const i = document.querySelector('#sj-sifat [data-p="' + k + '"]');
    if (i && document.activeElement !== i) i.value = m[k];
  });
}

/* ---------- papan kekunci ---------- */
document.addEventListener('keydown', e => {
  if (!SJ_DRAF || $('p-sijil').hidden || $('bekas-modal').innerHTML) return;
  const t = e.target;
  if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable)) return;
  const mod = e.metaKey || e.ctrlKey;
  if (mod && e.key.toLowerCase() === 'z') { e.preventDefault(); sjBuatAsal(); return; }
  const m = sjMedan(SJ_PILIH);
  if (!m) return;
  if (mod && e.key.toLowerCase() === 'd') { e.preventDefault(); sjPendua(); return; }
  if (e.key === 'Delete' || e.key === 'Backspace') { e.preventDefault(); sjBuangMedan(); return; }
  if (e.key === 'Escape') { SJ_PILIH = null; sjLukisKanvas(); sjLukisSifat(); return; }
  const langkah = e.shiftKey ? 5 : 0.5;
  const d = { ArrowLeft: [-langkah, 0], ArrowRight: [langkah, 0], ArrowUp: [0, -langkah], ArrowDown: [0, langkah] }[e.key];
  if (!d) return;
  e.preventDefault();
  sjSejarah();
  m.x = sjBundar(sjNum(m.x, 0) + d[0]);
  m.y = sjBundar(sjNum(m.y, 0) + d[1]);
  SJ_UBAH = true;
  sjLukisKanvas(); sjKemasXY(); sjTanda();
});

let SJ_RESIZE = null;
window.addEventListener('resize', () => {
  clearTimeout(SJ_RESIZE);
  SJ_RESIZE = setTimeout(() => { if (SJ_DRAF && !$('p-sijil').hidden) sjLukisKanvas(); }, 150);
});
window.addEventListener('beforeunload', e => {
  if (SJ_DRAF && SJ_UBAH) { e.preventDefault(); e.returnValue = ''; }
});

/* ---------- tindakan bar alat ---------- */
function sjTambah(senarai) {
  sjSejarah();
  senarai.forEach(m => SJ_DRAF.medan.push(m));
  SJ_PILIH = senarai[0].id;
  SJ_UBAH = true;
  sjLukisKanvas(); sjLukisSifat(); sjTanda();
}

function sjPendua() {
  const m = sjMedan(SJ_PILIH);
  if (!m) return;
  const b = JSON.parse(JSON.stringify(m));
  b.id = sjIdBaru('m_');
  b.x = sjNum(b.x, 0) + 4; b.y = sjNum(b.y, 0) + 4;
  sjTambah([b]);
}

function sjBuangMedan() {
  const m = sjMedan(SJ_PILIH);
  if (!m) return;
  sjSejarah();
  SJ_DRAF.medan = SJ_DRAF.medan.filter(x => x.id !== m.id);
  SJ_PILIH = null;
  SJ_UBAH = true;
  sjLukisKanvas(); sjLukisSifat(); sjTanda();
}

$('sj-e-alat').addEventListener('click', async e => {
  const b = e.target.closest('button');
  if (!b || !SJ_DRAF) return;
  const o = sjOrientasi(SJ_DRAF);
  const [W, H] = SJ_SAIZ[o];

  if (b.id === 'sj-e-teks') sjTambah([sjTeksBaru('Teks baharu', {}, o)]);

  if (b.id === 'sj-e-gambar') {
    const fail = await sjPilihFail();
    if (!fail) return;
    b.disabled = true;
    try {
      const { url } = await sjMuatNaik(fail, 'gambar');
      sjTambah([{ id: sjIdBaru('m_'), jenis: 'gambar', sumber: 'url', url, x: W / 2 - 15, y: H / 2 - 15, w: 30 }]);
    } catch (er) { agToast('Gagal: ' + er.message, 'ralat'); }
    b.disabled = false;
  }

  if (b.id === 'sj-e-undo') sjBuatAsal();
  if (b.id === 'sj-e-simpan') sjSimpanDraf();
  if (b.id === 'sj-e-tutup') sjTutupEditor();

  if (b.id === 'sj-e-latar') {
    const fail = await sjPilihFail();
    if (!fail) return;
    b.disabled = true; b.textContent = 'Memuat naik…';
    try {
      const { url, w, h } = await sjMuatNaik(fail, 'templat');
      const oBaru = w >= h ? 'L' : 'P';
      sjAmaranNisbah(w, h, oBaru);
      if (oBaru !== o) agToast('Orientasi bertukar — semak kedudukan setiap item');
      SJ_DRAF.gambarUrl = url;
      SJ_DRAF.orientasi = oBaru;
      SJ_UBAH = true;
      sjLukisKanvas(); sjTanda();
    } catch (er) { agToast('Gagal: ' + er.message, 'ralat'); }
    b.disabled = false; b.textContent = '🖼 Tukar gambar';
  }
});

$('sj-e-alat').addEventListener('change', e => {
  if (!SJ_DRAF) return;
  const o = sjOrientasi(SJ_DRAF);
  const [W, H] = SJ_SAIZ[o];
  if (e.target.id === 'sj-e-kod' && e.target.value) {
    sjTambah([sjTeksBaru('{' + e.target.value + '}', {}, o)]);
    e.target.value = '';
  }
  if (e.target.id === 'sj-e-blok' && e.target.value) {
    sjTambah(sjBlokPentadbir(Number(e.target.value), o, W / 2 - 40, H - 52));
    e.target.value = '';
  }
  if (e.target.id === 'sj-e-contoh') {
    SJ_CONTOH = e.target.value;
    sjLukisKanvas(); sjLukisSifat();
  }
});

$('sj-e-nama').addEventListener('input', () => { SJ_UBAH = true; sjTanda(); });

async function sjSimpanDraf() {
  const sj = sjSj();
  SJ_DRAF.nama = $('sj-e-nama').value.trim() || 'Templat';
  const salin = JSON.parse(JSON.stringify(SJ_DRAF));
  const i = sj.templat.findIndex(t => t.id === salin.id);
  const lama = i >= 0 ? sj.templat[i] : null;
  if (i >= 0) sj.templat[i] = salin; else sj.templat.push(salin);
  const b = $('sj-e-simpan');
  b.disabled = true;
  try {
    await sjTulis();
    SJ_UBAH = false;
    agToast('Templat disimpan', 'ok');
  } catch (er) {
    if (i >= 0) sj.templat[i] = lama; else sj.templat.pop();
    agToast('Gagal menyimpan: ' + er.message, 'ralat');
  }
  b.disabled = false;
  sjTanda();
  sjLukisSemuaKecualiEditor();
}

/* ---------- panel sifat ---------- */
function sjLabelMedan(m) {
  if (m.jenis === 'gambar') return '🖼 ' + sjLabelGambar(m);
  return '𝐓 ' + (String(m.teks || '').slice(0, 40) || '(kosong)');
}

function sjLukisSifat() {
  const bekas = $('sj-sifat');
  const m = sjMedan(SJ_PILIH);
  if (!m) {
    bekas.innerHTML =
      '<p class="eyebrow" style="margin:0">Item dalam sijil</p>' +
      (SJ_DRAF.medan.length
        ? '<div class="sj-senarai-el">' + SJ_DRAF.medan.map(x =>
            '<button data-sj-pilih="' + agEsc(x.id) + '">' + agEsc(sjLabelMedan(x)) + '</button>').join('') + '</div>'
        : '<p class="hint">Tiada item lagi. Tambah dari bar alat di atas.</p>') +
      '<p class="hint" style="margin:0"><strong>Klik</strong> item untuk memilih, <strong>seret</strong> untuk alih, ' +
      'pemegang emas di kanan untuk ubah lebar.<br>Anak panah = 0.5mm · Shift = 5mm · Del = buang · ' +
      'Ctrl/⌘+Z = buat asal · Ctrl/⌘+D = pendua · Alt semasa seret = tanpa lekat tengah.</p>';
    return;
  }

  const xyw =
    '<div class="sj-tiga">' +
      '<div><label>X (mm)</label><input type="number" step="0.5" data-p="x" value="' + m.x + '"></div>' +
      '<div><label>Y (mm)</label><input type="number" step="0.5" data-p="y" value="' + m.y + '"></div>' +
      '<div><label>Lebar (mm)</label><input type="number" step="0.5" min="5" data-p="w" value="' + m.w + '"></div>' +
    '</div>';
  const tindakan =
    '<div class="baris-input">' +
      '<button class="btn sunyi kecil" data-sj-aksi="tengah">⇔ Tengahkan</button>' +
      '<button class="btn sunyi kecil" data-sj-aksi="pendua">⧉ Pendua</button>' +
      '<button class="btn sunyi kecil" data-sj-aksi="buang">🗑 Buang</button>' +
      '<button class="btn sunyi kecil" data-sj-aksi="nyahpilih">✓ Siap</button>' +
    '</div>';

  if (m.jenis === 'gambar') {
    bekas.innerHTML =
      '<p class="eyebrow" style="margin:0">Gambar</p>' +
      '<div><label>Sumber</label><select data-p="sumber">' +
        [['ttd1', 'Tandatangan Pentadbir 1'], ['ttd2', 'Tandatangan Pentadbir 2'], ['ttd3', 'Tandatangan Pentadbir 3'], ['url', 'Gambar sendiri (cop / logo)']]
          .map(([v, l]) => '<option value="' + v + '"' + (m.sumber === v ? ' selected' : '') + '>' + l + '</option>').join('') +
      '</select></div>' +
      (m.sumber === 'url'
        ? '<button class="btn sunyi kecil" data-sj-aksi="ganti-gambar">🔁 Tukar gambar</button>'
        : '<p class="hint" style="margin:0">Tandatangan dimuat naik dalam kad <strong>Pentadbir</strong> di bawah — semua templat berkongsi tandatangan yang sama.</p>') +
      xyw + tindakan;
    return;
  }

  const fonOpt = SJ_FON.map(([f]) => '<option value="' + agEsc(f) + '"' + ((m.font || 'Public Sans') === f ? ' selected' : '') +
    ' style="font-family:' + agEsc(sjFonCss(f)) + '">' + agEsc(f) + '</option>').join('');
  const tog = (p, label, gaya) => '<button type="button" data-sj-tog="' + p + '" class="' + (m[p] ? 'on' : '') + '" style="' + gaya + '">' + label + '</button>';
  const jajar = (v, label) => '<button type="button" data-sj-jajar="' + v + '" class="' + ((m.jajar || 'center') === v ? 'on' : '') + '">' + label + '</button>';

  bekas.innerHTML =
    '<p class="eyebrow" style="margin:0">Teks</p>' +
    '<div><label>Isi</label><textarea rows="2" data-p="teks">' + agEsc(m.teks) + '</textarea></div>' +
    '<div><label>Masukkan data</label><div class="sj-cip">' +
      SJ_KOD.map(([k, l]) => '<button type="button" data-sj-kod="' + k + '" title="' + agEsc(l) + '">' + agEsc(k) + '</button>').join('') +
    '</div></div>' +
    '<div class="sj-dua">' +
      '<div><label>Font</label><select data-p="font">' + fonOpt + '</select></div>' +
      '<div><label>Saiz (pt)</label><input type="number" step="0.5" min="4" data-p="pt" value="' + m.pt + '"></div>' +
    '</div>' +
    '<div class="sj-dua">' +
      '<div><label>Gaya</label><div class="sj-tog">' + tog('bold', 'B', 'font-weight:700') + tog('italic', 'I', 'font-style:italic') + '</div></div>' +
      '<div><label>Warna</label><input type="color" data-p="warna" value="' + agEsc(sjWarna(m.warna)) + '"></div>' +
    '</div>' +
    '<div><label>Jajaran</label><div class="sj-tog">' + jajar('left', '⟸ Kiri') + jajar('center', 'Tengah') + jajar('right', 'Kanan ⟹') + '</div></div>' +
    '<div><label>Huruf</label><select data-p="huruf">' +
      [['asal', 'Ikut data'], ['besar', 'HURUF BESAR'], ['tajuk', 'Huruf Tajuk (Muhammad bin Ali)']]
        .map(([v, l]) => '<option value="' + v + '"' + ((m.huruf || 'asal') === v ? ' selected' : '') + '>' + l + '</option>').join('') +
    '</select></div>' +
    xyw +
    '<label class="sj-cek"><input type="checkbox" data-p="balut"' + (m.balut ? ' checked' : '') + '> Balut ke baris baharu (tiada auto-kecil)</label>' +
    '<label class="sj-cek"><input type="checkbox" data-p="sembunyiKosong"' + (m.sembunyiKosong !== false ? ' checked' : '') + '> Sembunyi bila data kosong (contoh: kelas bagi bukan murid)</label>' +
    '<div id="sj-nota-kecil"></div>' +
    tindakan;
  sjNotaKecil();
}

/* Beritahu admin bila font dikecilkan untuk penerima yang dipratonton. */
function sjNotaKecil() {
  const nota = $('sj-nota-kecil');
  const m = sjMedan(SJ_PILIH);
  if (!nota || !m || m.jenis === 'gambar') return;
  const el = $('sj-hal') && $('sj-hal').querySelector('[data-id="' + CSS.escape(m.id) + '"]');
  const pakai = el && Number(el.dataset.ptPakai);
  if (pakai && pakai < Number(m.pt)) {
    const habis = pakai <= SJ_PT_MIN;
    nota.innerHTML = '<div class="nota ' + (habis ? 'ralat' : 'amaran') + '" style="margin:0;padding:7px 10px;font-size:12px">' +
      '<span class="sym">!</span><div>' + (habis
        ? 'Teks masih terlalu panjang pada saiz minimum ' + SJ_PT_MIN + 'pt — <strong>besarkan lebar</strong> atau tanda Balut.'
        : 'Untuk penerima ini font dikecilkan automatik ke <strong>' + pakai + 'pt</strong> supaya muat.') + '</div></div>';
  } else nota.innerHTML = '';
}

/* Snapshot sejarah sekali bagi setiap sesi menaip dalam satu kotak. */
$('sj-sifat').addEventListener('focusin', e => {
  if (e.target.matches('[data-p]')) sjSejarah();
});

$('sj-sifat').addEventListener('input', e => sjTerapSifat(e.target));
$('sj-sifat').addEventListener('change', e => {
  sjTerapSifat(e.target);
  if (e.target.dataset.p === 'sumber') sjLukisSifat();
});

function sjTerapSifat(el) {
  const p = el.dataset && el.dataset.p;
  const m = sjMedan(SJ_PILIH);
  if (!p || !m) return;
  let v;
  if (el.type === 'checkbox') v = el.checked;
  else if (el.type === 'number') { v = Number(el.value); if (!isFinite(v) || el.value === '') return; }
  else v = el.value;
  if (p === 'pt') v = Math.max(4, v);
  if (p === 'w') v = Math.max(5, v);
  if (m[p] === v) return;
  m[p] = v;
  SJ_UBAH = true;
  sjLukisKanvas(); sjTanda();
}

$('sj-sifat').addEventListener('click', async e => {
  const b = e.target.closest('button');
  if (!b) return;
  if (b.dataset.sjPilih) { SJ_PILIH = b.dataset.sjPilih; sjLukisKanvas(); sjLukisSifat(); return; }
  const m = sjMedan(SJ_PILIH);
  if (!m) return;

  if (b.dataset.sjKod) {
    const ta = $('sj-sifat').querySelector('textarea[data-p="teks"]');
    sjSejarah();
    const kod = '{' + b.dataset.sjKod + '}';
    const a = ta.selectionStart != null ? ta.selectionStart : ta.value.length;
    const z = ta.selectionEnd != null ? ta.selectionEnd : a;
    ta.value = ta.value.slice(0, a) + kod + ta.value.slice(z);
    m.teks = ta.value;
    SJ_UBAH = true;
    sjLukisKanvas(); sjTanda();
    ta.focus();
    ta.setSelectionRange(a + kod.length, a + kod.length);
    return;
  }
  if (b.dataset.sjTog) {
    sjSejarah();
    m[b.dataset.sjTog] = !m[b.dataset.sjTog];
    SJ_UBAH = true;
    sjLukisKanvas(); sjLukisSifat(); sjTanda();
    return;
  }
  if (b.dataset.sjJajar) {
    sjSejarah();
    m.jajar = b.dataset.sjJajar;
    SJ_UBAH = true;
    sjLukisKanvas(); sjLukisSifat(); sjTanda();
    return;
  }
  const aksi = b.dataset.sjAksi;
  if (aksi === 'buang') sjBuangMedan();
  if (aksi === 'pendua') sjPendua();
  if (aksi === 'nyahpilih') { SJ_PILIH = null; sjLukisKanvas(); sjLukisSifat(); }
  if (aksi === 'tengah') {
    sjSejarah();
    const [W] = SJ_SAIZ[sjOrientasi(SJ_DRAF)];
    m.x = sjBundar(W / 2 - sjNum(m.w, 50) / 2);
    SJ_UBAH = true;
    sjLukisKanvas(); sjLukisSifat(); sjTanda();
  }
  if (aksi === 'ganti-gambar') {
    const fail = await sjPilihFail();
    if (!fail) return;
    b.disabled = true;
    try {
      const { url } = await sjMuatNaik(fail, 'gambar');
      sjSejarah();
      m.url = url;
      SJ_UBAH = true;
      sjLukisKanvas(); sjTanda();
    } catch (er) { agToast('Gagal: ' + er.message, 'ralat'); }
    b.disabled = false;
  }
});

/* ==========================================================================
   PETA TEMPLAT IKUT ANUGERAH
   ========================================================================== */
function sjLukisPeta() {
  const bekas = $('sj-peta');
  const sj = sjSj();
  const kad = $('sj-kad-peta');
  if (sj.templat.length < 2) {
    tunjuk(kad, sj.templat.length > 0);
    bekas.innerHTML = '<p class="hint" style="margin:0">Semua sijil memakai templat <strong>' +
      agEsc((sj.templat[0] || {}).nama || '') + '</strong>. Tambah templat kedua untuk menetapkan templat berbeza ikut anugerah.</p>';
    return;
  }
  tunjuk(kad, true);
  const lalai = sj.templat.find(t => t.id === sj.lalai);
  const opsyen = (pilih, kosongLabel) => '<option value="">' + agEsc(kosongLabel) + '</option>' +
    sj.templat.map(t => '<option value="' + agEsc(t.id) + '"' + (pilih === t.id ? ' selected' : '') + '>' + agEsc(t.nama) + '</option>').join('');

  const senarai = susunanAnugerah();
  if (!senarai.length) { bekas.innerHTML = '<p class="hint">Belum ada anugerah.</p>'; return; }

  bekas.innerHTML = senarai.map(a => {
    const subs = a.sub || [];
    const pilihAn = sj.peta[a.id] || '';
    const namaAn = (sj.templat.find(t => t.id === pilihAn) || lalai || {}).nama || '';
    const bilSendiri = subs.filter(s => sj.peta[a.id + '::' + s.id]).length;
    return '<div class="sj-peta-an">' +
      '<div class="sj-peta-baris"><span class="nm">' + agEsc(a.nama) + '</span>' +
        '<select data-sj-peta="' + agEsc(a.id) + '">' + opsyen(pilihAn, '— ikut lalai (' + ((lalai || {}).nama || '') + ') —') + '</select></div>' +
      (subs.length > 1
        ? '<details data-sj-buka="' + agEsc(a.id) + '"' + (SJ_PETA_BUKA.has(a.id) ? ' open' : '') + '>' +
            '<summary>' + subs.length + ' sub' + (bilSendiri ? ' · ' + bilSendiri + ' ada templat sendiri' : '') + '</summary>' +
            subs.map(s => '<div class="sj-peta-baris sub"><span class="nm">' + agEsc(s.nama) + '</span>' +
              '<select data-sj-peta="' + agEsc(a.id + '::' + s.id) + '">' +
                opsyen(sj.peta[a.id + '::' + s.id] || '', '— ikut anugerah (' + namaAn + ') —') + '</select></div>').join('') +
          '</details>'
        : '') +
    '</div>';
  }).join('');
}

$('sj-peta').addEventListener('toggle', e => {
  const d = e.target.closest && e.target.closest('details[data-sj-buka]');
  if (!d) return;
  if (d.open) SJ_PETA_BUKA.add(d.dataset.sjBuka); else SJ_PETA_BUKA.delete(d.dataset.sjBuka);
}, true);

$('sj-peta').addEventListener('change', async e => {
  const s = e.target.closest('select[data-sj-peta]');
  if (!s) return;
  const sj = sjSj();
  const k = s.dataset.sjPeta;
  const lama = sj.peta[k];
  if (s.value) sj.peta[k] = s.value; else delete sj.peta[k];
  try {
    await sjTulis();
    agToast('Templat ditetapkan', 'ok');
  } catch (er) {
    if (lama) sj.peta[k] = lama; else delete sj.peta[k];
    agToast('Gagal menyimpan: ' + er.message, 'ralat');
  }
  sjLukisPeta();
  sjLukisTemplat();
  sjLukisCetak();
});

/* ==========================================================================
   CETAK
   ========================================================================== */
function sjIsiTapisCetak() {
  const sAn = $('sj-c-anugerah');
  const kini = sAn.value;
  sAn.innerHTML = '<option value="">— semua anugerah —</option>' +
    susunanAnugerah().map(a => '<option value="' + agEsc(a.id) + '">' + agEsc(a.nama) + '</option>').join('');
  sAn.value = Array.from(sAn.options).some(o => o.value === kini) ? kini : '';

  const sD = $('sj-c-darjah');
  const kiniD = sD.value;
  const ada = new Set(PENERIMA.filter(p => !agAdalahLuar(p)).map(p => String(p.tahun || '').toUpperCase()).filter(Boolean));
  const adaLuar = PENERIMA.some(agAdalahLuar);
  sD.innerHTML = '<option value="">— semua —</option>' +
    AG_DARJAH_KATA.filter(d => ada.has(d)).map(d => '<option value="' + d + '">Darjah ' + agWordDarjah(d) + '</option>').join('') +
    (adaLuar ? '<option value="__luar">Bukan murid</option>' : '');
  sD.value = Array.from(sD.options).some(o => o.value === kiniD) ? kiniD : '';
  sjIsiKelasCetak();
}

/* Nilai option = DARJAH|KELAS — nama kelas berulang merentas darjah. */
function sjIsiKelasCetak() {
  const sK = $('sj-c-kelas');
  const kini = sK.value;
  const d = $('sj-c-darjah').value;
  const peta = new Map();
  PENERIMA.filter(p => !agAdalahLuar(p))
    .filter(p => !d || String(p.tahun || '').toUpperCase() === d)
    .forEach(p => {
      const k = String(p.tahun || '').toUpperCase() + '|' + String(p.kelas || '').toUpperCase();
      if (!peta.has(k)) peta.set(k, { k, label: agDarjahKelas(p.tahun, p.kelas), n: agWordDarjah(p.tahun) });
    });
  const senarai = Array.from(peta.values()).sort((a, b) => a.n - b.n || a.label.localeCompare(b.label, 'ms'));
  sK.innerHTML = '<option value="">— semua —</option>' +
    senarai.map(x => '<option value="' + agEsc(x.k) + '">' + agEsc(x.label) + '</option>').join('');
  sK.value = senarai.some(x => x.k === kini) ? kini : '';
  sK.disabled = d === '__luar';
}

function sjTapisCetak() {
  const an = $('sj-c-anugerah').value;
  const d = $('sj-c-darjah').value;
  const k = $('sj-c-kelas').value;
  const cari = agPecahCarian($('sj-c-cari').value);
  let senarai = sjSemuaSijil()
    .filter(it => !an || it.a.id === an)
    .filter(it => !d || (d === '__luar' ? agAdalahLuar(it.p) : String(it.p.tahun || '').toUpperCase() === d))
    .filter(it => !k || (String(it.p.tahun || '').toUpperCase() + '|' + String(it.p.kelas || '').toUpperCase()) === k)
    .filter(it => agPadanCarian(cari, it.p.nama, it.p.no_kp));
  /* Ikut kelas: untuk diedar oleh guru kelas, bukan diserah di pentas. */
  if ($('sj-c-susun').value === 'kelas') {
    senarai = senarai.slice().sort((u, v) =>
      (agWordDarjah(u.p.tahun) || 99) - (agWordDarjah(v.p.tahun) || 99) ||
      String(u.p.kelas || '').localeCompare(String(v.p.kelas || ''), 'ms') ||
      String(u.p.nama || '').localeCompare(String(v.p.nama || ''), 'ms'));
  }
  return senarai;
}

let SJ_BARIS = [];
function sjLukisCetak() {
  const bekas = $('sj-cetak');
  const sj = sjSj();
  if (!sj.templat.length) {
    bekas.innerHTML = '<p class="hint">Muat naik templat dahulu.</p>';
    $('sj-c-kira').textContent = '';
    return;
  }
  SJ_BARIS = sjTapisCetak();
  const tanpa = SJ_BARIS.filter(it => !it.templat).length;
  const murid = new Set(SJ_BARIS.map(it => it.p.no_kp)).size;
  $('sj-c-kira').innerHTML = '<strong>' + SJ_BARIS.length + '</strong> sijil · ' + murid + ' penerima' +
    (tanpa ? ' · <span style="color:var(--absen)">' + tanpa + ' tiada templat (tidak dicetak)</span>' : '');
  $('sj-c-cetak').textContent = '🖨 Cetak ' + (SJ_BARIS.length - tanpa) + ' sijil';
  $('sj-c-cetak').disabled = !(SJ_BARIS.length - tanpa);

  if (!SJ_BARIS.length) {
    bekas.innerHTML = '<p class="hint">' + (PENERIMA.length
      ? 'Tiada sijil padan dengan tapisan ini.'
      : 'Tiada penerima lagi — pilih murid dalam tab 🏆 Jenis Anugerah dahulu.') + '</p>';
    return;
  }
  bekas.innerHTML = '<div class="gulung" style="max-height:520px;overflow-y:auto"><table><thead><tr>' +
    '<th class="num">Giliran</th><th>Nama</th><th>Kelas</th><th>Anugerah</th><th>Templat</th><th></th>' +
    '</tr></thead><tbody>' + SJ_BARIS.map((it, i) =>
      '<tr><td class="num">' + (it.no == null ? '—' : it.no) + '</td>' +
      '<td class="nama-murid">' + agEsc(it.p.nama) + '</td>' +
      '<td>' + agEsc(agKelasPenerima(it.p)) + '</td>' +
      '<td>' + agEsc(it.x.sub || it.s.nama) + (it.x.sub && it.x.sub !== it.x.anugerah
        ? '<div class="hint" style="margin:0">' + agEsc(it.x.anugerah) + '</div>' : '') + '</td>' +
      '<td>' + (it.templat ? agEsc(it.templat.nama) : '<span class="pil absen">Tiada</span>') + '</td>' +
      '<td style="white-space:nowrap">' + (it.templat
        ? '<button class="btn sunyi kecil" data-sj-lihat="' + i + '" title="Pratonton">👁</button> ' +
          '<button class="btn sunyi kecil" data-sj-satu="' + i + '" title="Cetak sijil ini">🖨</button>'
        : '') + '</td></tr>').join('') +
    '</tbody></table></div>';
}

['sj-c-anugerah', 'sj-c-kelas', 'sj-c-susun'].forEach(id => $(id).addEventListener('change', sjLukisCetak));
$('sj-c-darjah').addEventListener('change', () => { sjIsiKelasCetak(); sjLukisCetak(); });
$('sj-c-cari').addEventListener('input', sjLukisCetak);
$('sj-c-kosong').addEventListener('click', () => {
  ['sj-c-anugerah', 'sj-c-darjah', 'sj-c-cari'].forEach(id => { $(id).value = ''; });
  sjIsiKelasCetak();
  $('sj-c-kelas').value = '';
  sjLukisCetak();
});
$('sj-c-cetak').addEventListener('click', () => sjCetak(SJ_BARIS));

$('sj-cetak').addEventListener('click', e => {
  const b = e.target.closest('button');
  if (!b) return;
  if (b.dataset.sjSatu != null) sjCetak([SJ_BARIS[Number(b.dataset.sjSatu)]]);
  if (b.dataset.sjLihat != null) sjPratonton(SJ_BARIS[Number(b.dataset.sjLihat)]);
});

function sjPratonton(it) {
  if (!it || !it.templat) return;
  const o = sjOrientasi(it.templat);
  const [W, H] = SJ_SAIZ[o];
  const lebar = Math.min(940, window.innerWidth - 80);
  const k = lebar / (W * SJ_PX_MM);
  bukaModal(
    '<div class="kad-kepala"><h3>' + agEsc(it.p.nama) + '</h3>' +
      '<span class="sub">' + agEsc(it.x.sub || it.s.nama) + ' · ' + agEsc(it.templat.nama) + '</span>' +
      '<button class="b-tutup" id="sj-px" aria-label="Tutup">×</button></div>' +
    '<div class="kad-isi" style="display:flex;justify-content:center">' +
      '<div class="sj-skala" id="sj-pratonton" style="width:' + lebar + 'px;height:' + (H * SJ_PX_MM * k) + 'px">' +
        '<div class="sj-hal ' + o + '" style="transform:scale(' + k + ')">' + sjIsiHalaman(it.templat, sjData(it), false) + '</div>' +
      '</div></div>', 'luas');
  $('sj-px').onclick = tutupModal;
  const akar = $('sj-pratonton');
  sjMuatkan(akar);
  sjTungguFon(document, [it.templat]).then(() => { if (akar.isConnected) sjMuatkan(akar); });
}

/* 🔴 Cetak dalam tetingkap baharu dengan @page margin 0 — @page panel
   utama (A4, 8mm untuk tiket/kad) akan menolak sijil ke tepi.
   Halaman bernama (L/P) membolehkan templat melintang dan menegak dalam
   satu cetakan. Tinggi dikurangkan 0.4mm: tinggi tepat 210mm kadangkala
   dibundarkan oleh pemandu pencetak dan menghasilkan halaman kosong
   selepas setiap sijil. */
async function sjCetak(senarai) {
  const boleh = (senarai || []).filter(it => it && it.templat);
  if (!boleh.length) { agToast('Tiada sijil untuk dicetak', 'ralat'); return; }
  const w = window.open('', '_blank');
  if (!w) { agToast('Benarkan pop-up untuk mencetak', 'ralat'); return; }

  const pertama = sjOrientasi(boleh[0].templat) === 'P' ? 'portrait' : 'landscape';
  const templatList = Array.from(new Set(boleh.map(it => it.templat)));
  w.document.write(
    '<!doctype html><html lang="ms"><head><meta charset="utf-8">' +
    '<title>Sijil — ' + agEsc(MAJLIS.nama || '') + ' (' + boleh.length + ')</title>' +
    '<link rel="stylesheet" href="' + SJ_FON_URL + '">' +
    '<style>' + SJ_CSS +
      '@page{size:A4 ' + pertama + ';margin:0}' +
      '@page L{size:A4 landscape;margin:0}@page P{size:A4 portrait;margin:0}' +
      'html,body{margin:0;padding:0}' +
      '.sj-hal{break-after:page;page-break-after:always}.sj-hal:last-child{break-after:auto;page-break-after:auto}' +
      '.sj-hal.L{page:L;height:209.6mm}.sj-hal.P{page:P;height:296.6mm}' +
      '.sj-tunggu{font:600 15px system-ui,sans-serif;padding:30px;text-align:center}' +
      '@media screen{body{background:#5C6475}.sj-hal{margin:14px auto;box-shadow:0 4px 18px rgba(0,0,0,.35)}' +
        '.sj-tunggu{color:#fff}}' +
      '@media print{.sj-tunggu{display:none}}' +
    '</style></head><body>' +
    '<div class="sj-tunggu" id="sj-tunggu">Menyediakan ' + boleh.length + ' sijil… dialog cetak akan terbuka sendiri.</div>' +
    boleh.map(it => sjHalaman(it.templat, sjData(it))).join('') +
    '</body></html>');
  w.document.close();

  const doc = w.document;
  /* Tunggu stylesheet fon, gambar, dan fon itu sendiri — ukuran auto-kecil
     yang dibuat sebelum fon tiba memakai lebar fon ganti. */
  const link = doc.querySelector('link[rel=stylesheet]');
  if (link && !link.sheet) {
    await Promise.race([new Promise(ok => { link.onload = link.onerror = ok; }), new Promise(ok => setTimeout(ok, 5000))]);
  }
  await Promise.race([
    Promise.all(Array.from(doc.images).map(i => i.complete ? null : new Promise(ok => { i.onload = i.onerror = ok; }))),
    new Promise(ok => setTimeout(ok, 20000))
  ]);
  await sjTungguFon(doc, templatList);
  sjMuatkan(doc);
  const rosak = Array.from(doc.images).filter(i => !i.naturalWidth).length;
  const t = doc.getElementById('sj-tunggu');
  if (t) t.remove();
  if (rosak) agToast(rosak + ' gambar gagal dimuat — semak sambungan sebelum mencetak', 'ralat');
  w.focus();
  w.print();
}

/* Dropdown "Medan data" dalam bar alat — dari SJ_KOD, satu sumber. */
$('sj-e-kod').innerHTML = '<option value="">➕ Medan data…</option>' +
  SJ_KOD.map(([k, l]) => '<option value="' + k + '">' + agEsc(l) + '  {' + k + '}</option>').join('');

/* ---------- Kad: format No. Siri ---------- */
function sjLukisSiri() {
  const f = sjSj().siri;
  $('sj-siri-awalan').value = f.awalan || '';
  $('sj-siri-akhiran').value = f.akhiran || '';
  $('sj-siri-digit').value = String(Number(f.digit) || 0);
  sjContohSiri();
}

function sjBacaSiri() {
  return {
    awalan: $('sj-siri-awalan').value,
    digit: Number($('sj-siri-digit').value) || 0,
    akhiran: $('sj-siri-akhiran').value
  };
}

function sjContohSiri() {
  const f = sjBacaSiri();
  const d = sjDataContoh();
  $('sj-siri-contoh').innerHTML = 'Contoh: giliran 7 → <strong>' + agEsc(sjNoSiri('7', d, f)) +
    '</strong> · giliran 112 → <strong>' + agEsc(sjNoSiri('112', d, f)) + '</strong>';
}

$('sj-siri').addEventListener('input', () => {
  sjContohSiri();
  $('sj-siri-status').textContent = 'Belum disimpan';
});
$('sj-siri').addEventListener('change', sjContohSiri);

$('sj-siri-simpan').addEventListener('click', async () => {
  const sj = sjSj();
  const lama = sj.siri;
  sj.siri = sjBacaSiri();
  try {
    await sjTulis();
    $('sj-siri-status').textContent = '';
    agToast('Format No. Siri disimpan', 'ok');
    if (SJ_DRAF) sjLukisKanvas();
  } catch (er) {
    sj.siri = lama;
    agToast('Gagal menyimpan: ' + er.message, 'ralat');
  }
});
