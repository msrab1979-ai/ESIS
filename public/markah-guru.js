/* ==========================================================================
   MARKAH UJIAN KHAS — guru subjek isi markah kelasnya sendiri
   --------------------------------------------------------------------------
   Masalah yang diselesaikan: Rekod & Laporan dalam index.html terbuka kepada
   semua guru — sesiapa boleh pilih mana-mana kelas dan menulis atas markah
   orang lain. Untuk ujian khas (contoh MATRIK darjah 4), sekolah mahu guru
   SAINS 4 INTEL mengisi SAINS 4 INTEL sahaja.

   🔴 KUNCI SLOT = subjek + kelas. Satu slot satu tuan. Pendaftaran kedua
      untuk slot yang sama DITOLAK dengan nama tuannya dipaparkan — bukan
      ditolak secara senyap, kerana guru perlu tahu siapa hendak dihubungi.

   🔴 Doc id guruMarkah = nama DINORMALKAN. Keunikan nama dikuatkuasakan oleh
      Firestore sendiri (satu doc satu id), bukan oleh semakan yang boleh
      terlepas apabila dua guru mendaftar serentak.

   🔴 Markah ditulis ke `rekodMarkah` — koleksi YANG SAMA dipakai seluruh
      ESIS, dengan docId format sama. Jadi Analisa, Headcount, GPS, slip dan
      modul Anugerah membacanya tanpa satu baris kod baharu dan tanpa
      penyegerakan. Dua koleksi bermakna dua kebenaran.

   🔴 Peperiksaan dipilih automatik daripada examTypes yang bertanda
      guruTerhad:true. Guru tidak memilih peperiksaan — satu perkara kurang
      untuk tersilap.

   Peranan:
     guru      — satu subjek, beberapa kelas, boleh tulis
     pentadbir — kata laluan admin, semua kelas × semua subjek, BACA SAHAJA
   ========================================================================== */

const MG_ADMIN_PW = 'admin123sis';   /* sama dgn ADMIN_PASSWORD dlm index.html */
const MG_KOLEKSI  = 'guruMarkah';

let MG = {
  peranan : null,   /* 'guru' | 'pentadbir' */
  guru    : null,   /* doc guruMarkah bagi guru yang masuk */
  pep     : null,   /* examType guruTerhad yang dipakai */
  calYear : new Date().getFullYear(),
  murid   : [],     /* murid kelas semasa */
  markah  : {},     /* no_kp -> rekod sedia ada */
  baca    : false   /* mod baca sahaja */
};

const $ = id => document.getElementById(id);
function tunjuk(el, ya) { if (el) el.hidden = !ya; }

function papar(nama) {
  ['p-ralat', 'p-login', 'p-daftar', 'p-isi', 'p-pentadbir']
    .forEach(id => tunjuk($(id), id === nama));
}

function gagal(teks) {
  $('ralat-teks').innerHTML = teks;
  $('sari').textContent = '';
  papar('p-ralat');
}

/* --------------------------------------------------------------------------
   Normalisasi nama guru
   --------------------------------------------------------------------------
   Guru menaip namanya sendiri setiap kali masuk. Padanan tepat bermakna satu
   ruang tersasar atau "CIKGU ALI" vs "ALI" menjadi aduan kepada admin setiap
   hari. Jadi: huruf kecil, ruang dimampat, gelaran dilucutkan.
   -------------------------------------------------------------------------- */
const MG_GELARAN = /^(cikgu|cg|pn|puan|en|encik|tn|tuan|ustaz|ustazah|dr|hj|hjh|haji|hajjah)\.?\s+/;

function mgNormalNama(s) {
  let t = String(s || '').trim().toLowerCase().replace(/\s+/g, ' ');
  /* Lucut gelaran berulang: "pn hjh siti" → "siti" */
  let dulu;
  do { dulu = t; t = t.replace(MG_GELARAN, ''); } while (t !== dulu);
  return t.trim();
}

/* Doc id mesti selamat untuk Firestore: tiada '/', tiada kosong */
function mgIdNama(s) {
  const n = mgNormalNama(s).replace(/[^a-z0-9 ]/g, '').replace(/\s+/g, '-');
  return n || null;
}

function mgKunciSlot(subjek, kelas) {
  return String(subjek || '').trim().toUpperCase() + '||' +
         String(kelas || '').trim().toUpperCase();
}

/* ==========================================================================
   ANALISA GRED
   --------------------------------------------------------------------------
   🔴 TH keluar dari pengangka DAN penyebut — peraturan ESIS yang sama di
      seluruh sistem. Murid tidak hadir tidak diberi F dan tidak menjatuhkan
      GPS kelas; ia dilaporkan berasingan supaya guru nampak sebabnya.

   🔴 Gred 'Gagal'/'TIDAK SAH' = 0 mata tetapi KEKAL dalam penyebut, sama
      seperti jadual ESIS yang lain (lihat agGPS).

   `bil` ialah bilangan murid yang DINILAI (tidak termasuk TH), jadi
   peratus lulus dan GPS berkongsi penyebut yang sama.
   ========================================================================== */
const MG_GRED = ['A', 'B', 'C', 'D', 'E', 'F'];

function mgKiraGred(rekodSenarai) {
  const k = { A: 0, B: 0, C: 0, D: 0, E: 0, F: 0 };
  let th = 0, bil = 0, jumMarkah = 0, lulus = 0;

  (rekodSenarai || []).forEach(r => {
    if (agIsTH(r)) { th++; return; }
    const n = parseInt(r.markah);
    if (isNaN(n)) return;                       // rekod rosak — bukan TH, bukan markah
    const g = String(r.gred || agGredDariMarkah(n)).toUpperCase();
    bil++;
    jumMarkah += n;
    if (k.hasOwnProperty(g)) k[g]++;
    if (g !== 'F' && g !== 'GAGAL' && g !== 'TIDAK SAH') lulus++;
  });

  const mata = agMataMap();
  const skor = MG_GRED.reduce((j, g) => j + k[g] * (mata[g] || 0), 0);

  return {
    ...k, th, bil,
    gps    : bil ? Math.round((skor / bil) * 100) / 100 : null,
    purata : bil ? Math.round((jumMarkah / bil) * 10) / 10 : null,
    lulus,
    pLulus : bil ? Math.round((lulus / bil) * 100) : null
  };
}

/* Jalur gred berwarna — dipakai oleh panel guru dan pentadbir, supaya
   kedua-duanya membaca taburan yang sama rupa. */
function mgJalurGred(s) {
  if (!s.bil && !s.th) return '';
  const warna = { A: 'hadir', B: 'hadir', C: 'tunggu', D: 'amaran', E: 'amaran', F: 'absen' };
  const pil = MG_GRED
    .filter(g => s[g] > 0)
    .map(g => '<span class="pil ' + warna[g] + '">' + g + ' ' + s[g] + '</span>')
    .join(' ');
  return '<div class="gred-jalur">' + pil +
    (s.th ? ' <span class="pil tunggu">TH ' + s.th + '</span>' : '') +
    '<span class="gred-nota">' +
      (s.bil ? s.bil + ' dinilai · GPS <strong>' + (s.gps ?? '—') + '</strong>' +
               ' · purata ' + (s.purata ?? '—') +
               ' · lulus ' + (s.pLulus ?? '—') + '%'
             : 'tiada markah dinilai') +
    '</span></div>';
}

/* ==========================================================================
   MULA
   ========================================================================== */
(async function mula() {
  try {
    await Promise.all([agMuatGred(), agMuatMurid()]);
    MG.pep = await mgCariPeperiksaan();
  } catch (e) {
    return gagal('Gagal menghubungi pangkalan data: ' + agEsc(e.message));
  }

  if (!MG.pep) {
    return gagal(
      'Tiada peperiksaan khas dibuka buat masa ini.<br><br>' +
      'Admin perlu menanda <strong>🔒 Markah guru subjek sahaja</strong> pada satu ' +
      'jenis peperiksaan dalam <em>Panel Admin → Urus Jenis Peperiksaan</em>.'
    );
  }

  const darjahStr = (MG.pep.darjah || []).map(d => 'Darjah ' + d).join(', ');
  $('sari').textContent = MG.pep.nama + ' · ' + MG.calYear +
    (darjahStr ? ' · ' + darjahStr : '');
  $('login-sari').innerHTML =
    'Peperiksaan <strong>' + agEsc(MG.pep.nama) + '</strong> · ' + MG.calYear +
    (darjahStr ? '<br><span class="kecil">' + agEsc(darjahStr) + '</span>' : '');

  papar('p-login');
  $('l-nama').focus();
})();

/* --------------------------------------------------------------------------
   Cari peperiksaan guruTerhad tahun ini
   --------------------------------------------------------------------------
   Lebih satu? Ambil `order` tertinggi yang aktif — sama peraturan dengan
   agPepUntukDarjah: peperiksaan tidak aktif tidak pernah dipilih automatik.
   -------------------------------------------------------------------------- */
async function mgCariPeperiksaan() {
  const semua = await agJenisPeperiksaan(MG.calYear);
  const terhad = semua.filter(e => e.guruTerhad === true);
  if (!terhad.length) return null;
  const aktif = terhad.filter(e => e.aktif !== false);
  const guna = aktif.length ? aktif : terhad;
  return guna[guna.length - 1];   /* agJenisPeperiksaan sudah susun ikut order */
}

/* Semua peperiksaan guruTerhad — untuk dropdown pentadbir */
async function mgSemuaPeperiksaan() {
  const semua = await agJenisPeperiksaan(MG.calYear);
  return semua.filter(e => e.guruTerhad === true);
}

/* ==========================================================================
   PENDAFTARAN — baca & semak slot
   ========================================================================== */
async function mgSemuaGuru() {
  const snap = await agDb.collection(MG_KOLEKSI)
    .where('calYear', '==', Number(MG.calYear)).get();
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

/* Peta kunci slot → nama guru pemilik */
async function mgPetaSlot() {
  const guru = await mgSemuaGuru();
  const peta = {};
  guru.forEach(g => {
    (g.kelas || []).forEach(k => {
      peta[mgKunciSlot(g.subjek, k)] = g.nama || g.id;
    });
  });
  return peta;
}

/* ==========================================================================
   LOGIN
   ========================================================================== */
pasangMata('b-mata-login', 'l-pw');
pasangMata('b-mata-daftar', 'd-pw');

$('b-masuk').addEventListener('click', masuk);
$('l-pw').addEventListener('keydown', e => { if (e.key === 'Enter') masuk(); });
$('l-nama').addEventListener('keydown', e => { if (e.key === 'Enter') $('l-pw').focus(); });

$('b-ke-daftar').addEventListener('click', bukaDaftar);
$('b-ke-login').addEventListener('click', () => { ralatLogin(''); papar('p-login'); $('l-nama').focus(); });
$('b-keluar').addEventListener('click', () => location.reload());
$('b-pt-keluar').addEventListener('click', () => location.reload());

function ralatLogin(teks) {
  const el = $('login-ralat');
  if (!teks) return tunjuk(el, false);
  el.querySelector('div').innerHTML = teks;
  tunjuk(el, true);
}

async function masuk() {
  const nama = $('l-nama').value.trim();
  const pw   = $('l-pw').value;
  ralatLogin('');

  if (!pw) { ralatLogin('Sila masukkan kata laluan.'); $('l-pw').focus(); return; }

  /* Pentadbir: nama kosong + kata laluan admin.
     Disemak DAHULU supaya admin tidak tersekat kalau ada guru bernama sama
     dengan apa-apa yang dia taip. */
  if (!nama && pw === MG_ADMIN_PW) return masukPentadbir();

  if (!nama) {
    ralatLogin('Sila masukkan nama anda. <span class="kecil">(Pentadbir: biar kosong + kata laluan admin.)</span>');
    $('l-nama').focus();
    return;
  }

  const id = mgIdNama(nama);
  if (!id) { ralatLogin('Nama tidak sah.'); return; }

  let doc;
  try {
    doc = await agDb.collection(MG_KOLEKSI).doc(id).get();
  } catch (e) {
    ralatLogin('Gagal menghubungi pangkalan data: ' + agEsc(e.message));
    return;
  }

  /* Kata laluan admin + nama guru → pentadbir juga (admin menyemak sesuatu) */
  if (!doc.exists) {
    if (pw === MG_ADMIN_PW) return masukPentadbir();
    ralatLogin('Nama <strong>' + agEsc(nama) + '</strong> belum berdaftar. ' +
               'Tekan <em>Daftar baharu</em> di bawah.');
    return;
  }

  const g = { id: doc.id, ...doc.data() };
  if (String(g.pw || '') !== pw) {
    if (pw === MG_ADMIN_PW) return masukPentadbir();
    ralatLogin('Kata laluan salah.');
    $('l-pw').select();
    return;
  }

  MG.peranan = 'guru';
  MG.guru = g;
  $('cap-peranan').textContent = 'Guru Subjek';

  /* Tandakan sudah dibuka — admin nampak siapa belum mula */
  agDb.collection(MG_KOLEKSI).doc(g.id).update({
    dibuka: firebase.firestore.FieldValue.serverTimestamp()
  }).catch(() => {});

  await bukaPanelGuru();
}

/* ==========================================================================
   DAFTAR
   ========================================================================== */
let MG_SLOT = {};       /* kunci slot → nama tuan */
let MG_KELAS_PETA = {}; /* darjah → [kelas] */

function ralatDaftar(teks) {
  const el = $('daftar-ralat');
  tunjuk($('daftar-ok'), false);
  if (!teks) return tunjuk(el, false);
  el.querySelector('div').innerHTML = teks;
  tunjuk(el, true);
}

async function bukaDaftar() {
  papar('p-daftar');
  ralatDaftar('');
  tunjuk($('daftar-ok'), false);

  $('d-nama').value = $('l-nama').value.trim();
  $('d-pw').value = '';

  /* Subjek: hadkan kepada subjek yang terlibat dalam peperiksaan ini.
     examTypes.subjek kosong = SEMUA subjek (peraturan sedia ada ESIS). */
  const semuaSubjek = await agSenaraiSubjek();
  const terlibat = Array.isArray(MG.pep.subjek) && MG.pep.subjek.length
    ? MG.pep.subjek : semuaSubjek;

  const sSel = $('d-subjek');
  sSel.innerHTML = '<option value="">— pilih —</option>' +
    terlibat.map(s => '<option value="' + agEsc(s) + '">' + agEsc(s) + '</option>').join('');

  /* Darjah: hanya darjah peperiksaan ini (examTypes.darjah simpan NOMBOR) */
  const darjahNo = (MG.pep.darjah || []).map(Number).filter(Boolean).sort((a, b) => a - b);
  const dSel = $('d-darjah');
  dSel.innerHTML = (darjahNo.length ? darjahNo : [1, 2, 3, 4, 5, 6])
    .map(n => '<option value="' + agDarjahWord(n) + '">Darjah ' + n + '</option>').join('');

  [MG_SLOT, MG_KELAS_PETA] = await Promise.all([mgPetaSlot(), agKelasIkutDarjah()]);

  lukisKelasPilih();
  $('d-nama').focus();
}

$('d-subjek').addEventListener('change', lukisKelasPilih);
$('d-darjah').addEventListener('change', lukisKelasPilih);

function lukisKelasPilih() {
  const subjek = $('d-subjek').value;
  const darjah = $('d-darjah').value;
  const grid = $('d-kelas-grid');
  $('d-kelas-kira').textContent = '';

  if (!subjek) {
    grid.innerHTML = '<p class="hint" style="margin:0">Pilih subjek dahulu.</p>';
    return;
  }

  const kelas = MG_KELAS_PETA[darjah] || [];
  if (!kelas.length) {
    grid.innerHTML = '<p class="hint" style="margin:0">Tiada kelas dijumpai untuk darjah ini.</p>';
    return;
  }

  let bilBebas = 0;
  grid.innerHTML = kelas.map(k => {
    const tuan = MG_SLOT[mgKunciSlot(subjek, k)];
    if (!tuan) bilBebas++;
    return '<label class="kelas-pilih' + (tuan ? ' bertuan' : '') + '">' +
      '<input type="checkbox" class="d-kelas" value="' + agEsc(k) + '"' +
        (tuan ? ' disabled' : '') + '>' +
      '<span><strong>' + agEsc(k) + '</strong>' +
        (tuan ? '<span class="kelas-tuan">sudah diambil — ' + agEsc(tuan) + '</span>' : '') +
      '</span></label>';
  }).join('');

  $('d-kelas-kira').textContent = bilBebas + ' daripada ' + kelas.length + ' kelas masih bebas';
}

$('b-daftar').addEventListener('click', daftar);

async function daftar() {
  ralatDaftar('');

  const nama   = $('d-nama').value.trim();
  const pw     = $('d-pw').value;
  const subjek = $('d-subjek').value;
  const darjah = $('d-darjah').value;
  const kelas  = Array.from(document.querySelectorAll('.d-kelas:checked')).map(cb => cb.value);

  if (!nama)            return ralatDaftar('Sila masukkan nama anda.');
  if (pw.length < 4)    return ralatDaftar('Kata laluan mesti sekurang-kurangnya 4 aksara.');
  if (!subjek)          return ralatDaftar('Sila pilih subjek anda.');
  if (!kelas.length)    return ralatDaftar('Sila tandakan sekurang-kurangnya satu kelas.');

  const id = mgIdNama(nama);
  if (!id) return ralatDaftar('Nama mesti mengandungi sekurang-kurangnya satu huruf atau nombor.');

  $('b-daftar').disabled = true;

  try {
    /* Nama unik — dikuatkuasakan oleh doc id */
    const ada = await agDb.collection(MG_KOLEKSI).doc(id).get();
    if (ada.exists) {
      const a = ada.data();
      return ralatDaftar(
        'Nama <strong>' + agEsc(nama) + '</strong> sudah berdaftar (' +
        agEsc(a.subjek || '') + ').<br>' +
        'Kalau itu anda, tekan <em>Sudah daftar? Masuk</em>. ' +
        'Kalau nama anda sama dengan guru lain, tambah nama keluarga supaya berbeza.'
      );
    }

    /* Semak slot SEKALI LAGI pada masa simpan — senarai di skrin mungkin
       sudah lapuk kalau guru lain mendaftar sementara borang ini terbuka. */
    const slotKini = await mgPetaSlot();
    const bentrok = kelas.filter(k => slotKini[mgKunciSlot(subjek, k)]);
    if (bentrok.length) {
      MG_SLOT = slotKini;
      lukisKelasPilih();
      return ralatDaftar(
        bentrok.map(k => '<strong>' + agEsc(subjek) + ' ' + agEsc(k) + '</strong> sudah diambil oleh ' +
          agEsc(slotKini[mgKunciSlot(subjek, k)])).join('<br>') +
        '<br><br>Minta admin membuang pendaftaran itu dahulu, atau tandakan kelas lain.'
      );
    }

    await agDb.collection(MG_KOLEKSI).doc(id).set({
      nama    : nama.toUpperCase(),
      pw      : pw,
      subjek  : subjek,
      darjah  : darjah,
      kelas   : kelas,
      calYear : Number(MG.calYear),
      daftar  : firebase.firestore.FieldValue.serverTimestamp(),
      /* Mendaftar MEMBAWA guru terus masuk, jadi `dibuka` mesti ditulis di
         sini juga — bukan hanya dalam masuk(). Tanpanya admin membaca
         "belum log masuk" bagi guru yang sudah menyimpan markah. */
      dibuka  : firebase.firestore.FieldValue.serverTimestamp()
    });

    const ok = $('daftar-ok');
    ok.querySelector('div').innerHTML =
      'Berjaya didaftarkan — <strong>' + agEsc(subjek) + '</strong> · ' +
      agEsc(kelas.join(', ')) + '.<br>Sedang memasukkan anda…';
    tunjuk($('daftar-ralat'), false);
    tunjuk(ok, true);

    MG.peranan = 'guru';
    MG.guru = { id, nama: nama.toUpperCase(), pw, subjek, darjah, kelas, calYear: Number(MG.calYear) };
    $('cap-peranan').textContent = 'Guru Subjek';

    setTimeout(bukaPanelGuru, 900);
  } catch (e) {
    ralatDaftar('Gagal menyimpan: ' + agEsc(e.message));
  } finally {
    $('b-daftar').disabled = false;
  }
}

/* ==========================================================================
   PANEL GURU
   ========================================================================== */
async function bukaPanelGuru() {
  papar('p-isi');

  const g = MG.guru;
  $('tajuk').textContent = MG.pep.nama + ' — ' + g.subjek;
  $('sari').textContent = (g.nama || '') + ' · ' + MG.calYear;
  $('i-pil-subjek').textContent = '📘 ' + g.subjek;
  $('i-pil-pep').textContent = '📝 ' + MG.pep.nama;

  /* Mod baca: admin menutup peperiksaan (aktif:false) */
  MG.baca = MG.pep.aktif === false;

  const sel = $('i-kelas');
  sel.innerHTML = (g.kelas || [])
    .map(k => '<option value="' + agEsc(k) + '">' + agEsc(k) + '</option>').join('');
  sel.disabled = (g.kelas || []).length <= 1;

  sel.onchange = muatKelas;
  await muatKelas();
}

async function muatKelas() {
  const kelas = $('i-kelas').value;
  const g = MG.guru;
  $('i-jadual').innerHTML = '<p class="hint" style="padding:16px">Memuatkan senarai murid…</p>';
  tunjuk($('i-simpan-bar'), false);
  $('i-status').textContent = '';

  const semua = await agMuatMurid();
  MG.murid = semua
    .filter(m => m.tahun === String(g.darjah || '').toUpperCase() &&
                 m.kelas === String(kelas || '').toUpperCase())
    .sort((a, b) => a.nama.localeCompare(b.nama, 'ms'));

  /* Markah sedia ada — paksa segar supaya guru nampak apa yang betul-betul
     tersimpan, bukan salinan cache dari sesi sebelum ini. */
  const rekod = await agMuatMarkah(MG.calYear, MG.pep.nama, true);
  MG.markah = {};
  rekod.filter(r => r.subjek === g.subjek).forEach(r => { MG.markah[r.no_kp] = r; });

  lukisAmaran();
  lukisJadual();
}

function lukisAmaran() {
  const el = $('i-amaran');
  if (MG.baca) {
    el.innerHTML = '<div class="nota amaran" style="margin:14px 16px 0">' +
      '<span class="sym">🔒</span><div><strong>Mod baca sahaja.</strong> ' +
      'Peperiksaan ini sudah dikunci oleh admin. Anda boleh melihat markah ' +
      'tetapi tidak boleh mengubahnya.</div></div>';
    return;
  }
  if (!MG.murid.length) {
    el.innerHTML = '<div class="nota ralat" style="margin:14px 16px 0">' +
      '<span class="sym">✕</span><div>Tiada murid dijumpai untuk kelas ini. ' +
      'Semak senarai murid dalam <em>Guru Kelas</em> di ESIS.</div></div>';
    return;
  }
  el.innerHTML = '';
}

function lukisJadual() {
  if (!MG.murid.length) {
    $('i-jadual').innerHTML = '';
    return;
  }

  const mati = MG.baca ? ' disabled' : '';
  let isi = 0, th = 0;

  const baris = MG.murid.map((m, i) => {
    const r = MG.markah[m.no_kp];
    const adaTH = r ? agIsTH(r) : false;
    const nilai = (r && !adaTH && r.markah != null) ? r.markah : '';
    if (adaTH) th++; else if (nilai !== '') isi++;

    return '<tr' + (adaTH ? ' class="baris-th"' : '') + ' data-kp="' + agEsc(m.no_kp) + '">' +
      '<td class="num">' + (i + 1) + '</td>' +
      '<td class="nama-murid">' + agEsc(m.nama) + '</td>' +
      '<td class="kecil">' + agEsc(m.no_kp) + '</td>' +
      '<td style="text-align:center">' +
        '<input type="number" class="kotak-markah mg-markah" min="0" max="100" ' +
          'inputmode="numeric" value="' + nilai + '"' + mati + '>' +
      '</td>' +
      '<td class="gred-sel mg-gred">' + (adaTH ? 'TH' : (nilai !== '' ? agGredDariMarkah(nilai) : '—')) + '</td>' +
      '<td class="sel-th">' +
        '<input type="checkbox" class="mg-th"' + (adaTH ? ' checked' : '') + mati + '>' +
      '</td>' +
    '</tr>';
  }).join('');

  $('i-jadual').innerHTML =
    '<table class="senarai">' +
      '<thead><tr>' +
        '<th style="width:42px">#</th>' +
        '<th class="lajur-teks">Nama</th>' +
        '<th style="width:130px">No. KP</th>' +
        '<th style="width:96px; text-align:center">Markah</th>' +
        '<th style="width:62px; text-align:center">Gred</th>' +
        '<th style="width:54px; text-align:center" title="Tidak Hadir">TH</th>' +
      '</tr></thead>' +
      '<tbody>' + baris + '</tbody>' +
    '</table>';

  pasangBaris();
  tunjuk($('i-simpan-bar'), !MG.baca);
  $('i-status').innerHTML = MG.murid.length + ' murid · ' +
    '<strong>' + isi + '</strong> ada markah' + (th ? ' · ' + th + ' TH' : '') +
    ' · <strong>' + (MG.murid.length - isi - th) + '</strong> belum diisi';

  lukisAnalisaGuru();
}

/* --------------------------------------------------------------------------
   Analisa gred kelas guru
   --------------------------------------------------------------------------
   Dikira daripada MG.markah (apa yang TERSIMPAN), bukan daripada kotak di
   skrin — supaya nombor ini sentiasa bermaksud "keputusan yang sudah
   disimpan", bukan draf separuh taip yang berubah pada setiap ketukan.
   -------------------------------------------------------------------------- */
function lukisAnalisaGuru() {
  const kad = $('i-analisa-kad');
  if (!kad) return;

  const rekod = MG.murid.map(m => MG.markah[m.no_kp]).filter(Boolean);
  if (!rekod.length) { tunjuk(kad, false); return; }

  const s = mgKiraGred(rekod);
  const belum = MG.murid.length - rekod.length;

  $('i-analisa-tajuk').textContent =
    'Analisa Gred — ' + MG.guru.subjek + ' · ' + $('i-kelas').value;

  const sel = (label, nilai, kelasNama) =>
    '<div class="gred-sel-kira g-' + kelasNama + (nilai ? '' : ' kosong') + '">' +
      '<b>' + nilai + '</b><span>' + label + '</span></div>';

  $('i-analisa').innerHTML =
    '<div class="gred-kira">' +
      MG_GRED.map(g => sel(g, s[g], g)).join('') +
      sel('TH', s.th, 'TH') +
    '</div>' +
    '<div class="kpi-grid">' +
      kpi('Dinilai', s.bil, MG.murid.length + ' murid dalam kelas') +
      kpi('GPS', s.gps ?? '—', 'gred purata subjek') +
      kpi('Purata markah', s.purata ?? '—', '') +
      kpi('Lulus', (s.pLulus ?? '—') + '%', s.lulus + ' dari ' + s.bil + ' murid',
          s.pLulus != null && s.pLulus < 50 ? 'bahaya' : 'ok') +
    '</div>' +
    (s.th ? '<p class="hint" style="margin:11px 0 0">' +
       '<strong>' + s.th + ' murid TH</strong> dikecualikan sepenuhnya — ' +
       'tidak diberi gred F dan tidak menjatuhkan GPS kelas.</p>' : '') +
    (belum > 0 ? '<p class="hint" style="margin:7px 0 0">' +
       '<strong>' + belum + ' murid belum diisi</strong> — angka di atas akan berubah ' +
       'apabila markah mereka dimasukkan.</p>' : '');

  tunjuk(kad, true);
}

/* Gred hidup semasa menaip + TH mematikan kotak markah */
function pasangBaris() {
  document.querySelectorAll('#i-jadual tbody tr').forEach(tr => {
    const inp = tr.querySelector('.mg-markah');
    const chk = tr.querySelector('.mg-th');
    const gr  = tr.querySelector('.mg-gred');

    function kemas() {
      if (chk.checked) {
        tr.classList.add('baris-th');
        inp.value = '';
        inp.disabled = true;
        gr.textContent = 'TH';
        return;
      }
      tr.classList.remove('baris-th');
      inp.disabled = MG.baca;
      const v = inp.value.trim();
      gr.textContent = v === '' ? '—' : agGredDariMarkah(v);
    }

    inp.addEventListener('input', kemas);
    chk.addEventListener('change', kemas);
    kemas();
  });
}

/* ==========================================================================
   SIMPAN
   --------------------------------------------------------------------------
   Peraturan sama dengan simpanEditMarkah dalam index.html — jangan berbeza,
   kerana kedua-duanya menulis ke koleksi yang sama:
     · sel kosong DILANGKAU (tiada rekod ditulis — boleh diisi lain kali)
     · TH ditulis sebagai {markah:null, gred:'TH', th:true}
     · markah 0 DITERIMA (0 ialah markah sah, dan ia pernah hilang kerana
       `mark.markah || ''` menganggap 0 sebagai palsu)
   ========================================================================== */
$('b-simpan').addEventListener('click', simpan);

async function simpan() {
  if (MG.baca) return;

  const g = MG.guru;
  const kelas = $('i-kelas').value;
  const btn = $('b-simpan');
  const st = $('i-status');

  const tulis = [];
  let tidakSah = 0;

  document.querySelectorAll('#i-jadual tbody tr').forEach(tr => {
    const kp  = tr.getAttribute('data-kp');
    const inp = tr.querySelector('.mg-markah');
    const th  = tr.querySelector('.mg-th').checked;
    const murid = MG.murid.find(m => m.no_kp === kp);
    if (!murid) return;

    if (th) {
      tulis.push({ murid, markah: null, gred: 'TH', th: true });
      return;
    }

    const v = inp.value.trim();
    if (v === '') return;                      /* kosong — langkau */

    const n = parseInt(v, 10);
    if (isNaN(n) || n < 0 || n > 100) {         /* 0 sah, 0..100 sahaja */
      tidakSah++;
      inp.classList.add('kosong');
      return;
    }
    inp.classList.remove('kosong');
    tulis.push({ murid, markah: n, gred: agGredDariMarkah(n), th: false });
  });

  if (tidakSah) {
    st.innerHTML = '<span style="color:var(--absen)">' + tidakSah +
      ' markah di luar julat 0–100 — sila betulkan kotak merah.</span>';
    return;
  }
  if (!tulis.length) {
    st.innerHTML = '<span style="color:var(--amaran)">Tiada markah untuk disimpan.</span>';
    return;
  }

  btn.disabled = true;
  st.textContent = 'Menyimpan ' + tulis.length + ' rekod…';

  try {
    /* Firestore hadkan 500 operasi satu batch — kelas tidak sebesar itu,
       tetapi pecahkan tetap supaya ia tidak pecah kalau sekolah besar. */
    const SAIZ = 400;
    for (let i = 0; i < tulis.length; i += SAIZ) {
      const batch = agDb.batch();
      tulis.slice(i, i + SAIZ).forEach(t => {
        const m = t.murid;
        const docId = m.no_kp + '_' + g.subjek + '_' + g.darjah + '_' +
                      MG.pep.nama + '_' + MG.calYear;
        batch.set(agDb.collection('rekodMarkah').doc(docId), {
          no_kp  : m.no_kp,
          nama   : m.nama,
          tahun  : String(g.darjah || '').toUpperCase(),
          kelas  : String(kelas || '').toUpperCase(),
          subjek : g.subjek,
          jantina: m.jantina || '',
          agama  : m.agama || '',
          'JENIS PEPERIKSAAN': MG.pep.nama,
          markah : t.markah,
          gred   : t.gred,
          th     : t.th,
          cal_year: Number(MG.calYear),
          sumber : 'guru',
          guru   : g.nama || g.id,
          timestamp: firebase.firestore.FieldValue.serverTimestamp()
        }, { merge: true });
      });
      await batch.commit();
    }

    agDb.collection(MG_KOLEKSI).doc(g.id).update({
      akhir: firebase.firestore.FieldValue.serverTimestamp()
    }).catch(() => {});

    st.innerHTML = '<span style="color:var(--hadir)">✓ ' + tulis.length +
      ' rekod disimpan.</span>';

    await muatKelas();   /* baca balik supaya guru nampak apa yang tersimpan */
  } catch (e) {
    // Kuota Firestore habis menolak TULISAN juga, bukan bacaan sahaja.
    // Guru perlu tahu markahnya TIDAK tersimpan dan jangan tutup tab —
    // mesej generik membuatkan dia menyangka ralat kecil dan beredar.
    const kuota = String(e.code || '').toLowerCase() === 'resource-exhausted' ||
                  /resource_exhausted|quota exceeded/i.test(String(e.message || ''));
    st.innerHTML = kuota
      ? '<span style="color:var(--absen)"><strong>MARKAH TIDAK TERSIMPAN</strong> — kuota pangkalan data habis. ' +
        'Jangan tutup halaman ini. Maklumkan pentadbir, kemudian tekan Simpan semula.</span>'
      : '<span style="color:var(--absen)">Gagal menyimpan: ' + agEsc(e.message) + '</span>';
  } finally {
    btn.disabled = false;
  }
}

/* ==========================================================================
   PANEL PENTADBIR — baca sahaja, semua kelas × semua subjek
   --------------------------------------------------------------------------
   Soalan yang panel ini jawab: "siapa belum isi?" Tanpanya pentadbir perlu
   membuka setiap kelas satu-satu untuk mengetahuinya.
   ========================================================================== */
let PT = { pep: null, guru: [], markah: [], baris: [], pilih: null };

async function masukPentadbir() {
  MG.peranan = 'pentadbir';
  MG.baca = true;
  $('cap-peranan').textContent = 'Pentadbir — baca sahaja';
  papar('p-pentadbir');

  const senarai = await mgSemuaPeperiksaan();
  const sel = $('pt-pep');
  sel.innerHTML = senarai.map(e =>
    '<option value="' + agEsc(e.id) + '"' + (e.id === MG.pep.id ? ' selected' : '') + '>' +
    agEsc(e.nama) + (e.aktif === false ? ' (dikunci)' : '') + '</option>').join('');
  sel.onchange = () => { PT.pilih = null; muatPentadbir(); };

  ['pt-darjah', 'pt-subjek'].forEach(id => {
    $(id).onchange = () => { PT.pilih = null; lukisPentadbir(); };
  });
  $('b-pt-segar').onclick = () => muatPentadbir(true);
  $('b-pt-csv').onclick = ptCSV;
  $('b-pt-subjek-csv').onclick = ptSubjekCSV;

  await muatPentadbir();
}

async function muatPentadbir(paksa) {
  $('pt-jadual').innerHTML = '<p class="hint" style="padding:16px">Memuatkan…</p>';
  $('pt-kpi').innerHTML = '';

  const semua = await mgSemuaPeperiksaan();
  PT.pep = semua.find(e => e.id === $('pt-pep').value) || semua[0];
  if (!PT.pep) {
    $('pt-jadual').innerHTML = '<p class="hint" style="padding:16px">Tiada peperiksaan khas.</p>';
    return;
  }

  $('tajuk').textContent = PT.pep.nama;
  $('sari').textContent = 'Pentadbir · ' + MG.calYear;

  const [guru, markah, murid] = await Promise.all([
    mgSemuaGuru(),
    agMuatMarkah(MG.calYear, PT.pep.nama, !!paksa),
    agMuatMurid()
  ]);
  PT.guru = guru;
  PT.markah = markah;

  /* Baris = setiap slot yang SEPATUTNYA diisi: subjek terlibat × kelas darjah
     peperiksaan ini. Slot tanpa guru berdaftar juga muncul — itu justru
     maklumat yang pentadbir cari. */
  const subjekTerlibat = Array.isArray(PT.pep.subjek) && PT.pep.subjek.length
    ? PT.pep.subjek : await agSenaraiSubjek();
  const darjahNo = (PT.pep.darjah || []).map(Number).filter(Boolean).sort((a, b) => a - b);
  const kelasPeta = await agKelasIkutDarjah();

  const petaGuru = {};
  guru.forEach(g => (g.kelas || []).forEach(k => {
    petaGuru[mgKunciSlot(g.subjek, k)] = g;
  }));

  PT.baris = [];
  darjahNo.forEach(dn => {
    const word = agDarjahWord(dn);
    (kelasPeta[word] || []).forEach(kelas => {
      const bilMurid = murid.filter(m => m.tahun === word && m.kelas === kelas).length;
      subjekTerlibat.forEach(subjek => {
        const rek = markah.filter(r => r.subjek === subjek &&
                                       r.tahun === word && r.kelas === kelas);
        const th = rek.filter(r => agIsTH(r)).length;
        const adaMarkah = rek.length - th;
        const g = petaGuru[mgKunciSlot(subjek, kelas)];
        PT.baris.push({
          darjah: dn, word, kelas, subjek,
          guru: g ? (g.nama || g.id) : null,
          bilMurid, adaMarkah, th, jumRekod: rek.length,
          gred: mgKiraGred(rek)
        });
      });
    });
  });

  /* Dropdown tapisan */
  const dSel = $('pt-darjah'), sSel = $('pt-subjek');
  const dLama = dSel.value, sLama = sSel.value;
  dSel.innerHTML = '<option value="">Semua darjah</option>' +
    darjahNo.map(n => '<option value="' + n + '">Darjah ' + n + '</option>').join('');
  sSel.innerHTML = '<option value="">Semua subjek</option>' +
    subjekTerlibat.map(s => '<option value="' + agEsc(s) + '">' + agEsc(s) + '</option>').join('');
  dSel.value = dLama; sSel.value = sLama;

  lukisPentadbir();
}

function ptTapis() {
  const d = $('pt-darjah').value, s = $('pt-subjek').value;
  return PT.baris.filter(b =>
    (!d || String(b.darjah) === d) && (!s || b.subjek === s));
}

function lukisPentadbir() {
  const baris = ptTapis();

  /* KPI dikira atas baris DIPAPAR — pentadbir menapis untuk melihat satu
     darjah, dan nombor yang tidak berubah ketika itu mengelirukan. */
  const jumSlot  = baris.length;
  const siap     = baris.filter(b => b.bilMurid > 0 && b.jumRekod >= b.bilMurid).length;
  const mula     = baris.filter(b => b.jumRekod > 0 && b.jumRekod < b.bilMurid).length;
  const kosong   = baris.filter(b => b.jumRekod === 0).length;
  const tiadaGuru = baris.filter(b => !b.guru).length;

  $('pt-kpi').innerHTML =
    kpi('Slot markah', jumSlot, 'subjek × kelas') +
    kpi('Lengkap', siap, jumSlot ? Math.round(siap / jumSlot * 100) + '%' : '—', 'ok') +
    kpi('Separa', mula, 'sudah mula') +
    kpi('Belum ada markah', kosong, tiadaGuru ? tiadaGuru + ' tiada guru berdaftar' : '', kosong ? 'bahaya' : '');

  if (!baris.length) {
    $('pt-jadual').innerHTML = '<p class="hint" style="padding:16px">Tiada slot untuk tapisan ini.</p>';
    return;
  }

  /* Belum siap di atas — itu yang perlu ditindak */
  const susun = baris.slice().sort((a, b) => {
    const pa = a.jumRekod === 0 ? 0 : (a.jumRekod < a.bilMurid ? 1 : 2);
    const pb = b.jumRekod === 0 ? 0 : (b.jumRekod < b.bilMurid ? 1 : 2);
    if (pa !== pb) return pa - pb;
    if (a.darjah !== b.darjah) return a.darjah - b.darjah;
    if (a.kelas !== b.kelas) return a.kelas.localeCompare(b.kelas);
    return a.subjek.localeCompare(b.subjek);
  });

  $('pt-jadual').innerHTML =
    '<table class="senarai"><thead><tr>' +
      '<th style="width:42px">#</th>' +
      '<th style="width:76px">Darjah</th>' +
      '<th style="width:120px">Kelas</th>' +
      '<th class="lajur-teks">Subjek</th>' +
      '<th class="lajur-teks-kecil">Guru</th>' +
      '<th style="width:110px; text-align:center">Diisi</th>' +
      MG_GRED.map(g => '<th style="width:38px; text-align:center">' + g + '</th>').join('') +
      '<th style="width:40px; text-align:center" title="Tidak Hadir — dikecualikan dari GPS">TH</th>' +
      '<th style="width:58px; text-align:center" title="Gred Purata Subjek">GPS</th>' +
      '<th style="width:58px; text-align:center">Lulus</th>' +
      '<th style="width:110px; text-align:center">Status</th>' +
    '</tr></thead><tbody>' +
    susun.map((b, i) => {
      const lengkap = b.bilMurid > 0 && b.jumRekod >= b.bilMurid;
      const status = b.jumRekod === 0
        ? '<span class="pil absen">Belum</span>'
        : (lengkap ? '<span class="pil hadir">Lengkap</span>'
                   : '<span class="pil amaran">Separa</span>');
      const kunci = b.word + '|' + b.kelas + '|' + b.subjek;
      return '<tr style="cursor:pointer" data-kunci="' + agEsc(kunci) + '" class="pt-baris">' +
        '<td class="num">' + (i + 1) + '</td>' +
        '<td>D' + b.darjah + '</td>' +
        '<td><strong>' + agEsc(b.kelas) + '</strong></td>' +
        '<td>' + agEsc(b.subjek) + '</td>' +
        '<td>' + (b.guru
          ? agEsc(b.guru)
          : '<span style="color:var(--absen)">— tiada guru berdaftar</span>') + '</td>' +
        '<td style="text-align:center; font-variant-numeric:tabular-nums">' +
          b.jumRekod + ' / ' + b.bilMurid + '</td>' +
        // Sifar dikelabukan supaya mata menangkap gred yang BENAR-BENAR ada.
        MG_GRED.map(g => '<td style="text-align:center; font-variant-numeric:tabular-nums"' +
          (b.gred[g] ? '' : ' class="sifar"') + '>' + b.gred[g] + '</td>').join('') +
        '<td style="text-align:center; font-variant-numeric:tabular-nums"' +
          (b.gred.th ? '' : ' class="sifar"') + '>' + b.gred.th + '</td>' +
        '<td style="text-align:center; font-weight:700; font-variant-numeric:tabular-nums">' +
          (b.gred.gps ?? '—') + '</td>' +
        '<td style="text-align:center; font-variant-numeric:tabular-nums' +
          (b.gred.pLulus != null && b.gred.pLulus < 50 ? '; color:var(--absen); font-weight:700' : '') +
          '">' + (b.gred.pLulus != null ? b.gred.pLulus + '%' : '—') + '</td>' +
        '<td style="text-align:center">' + status + '</td>' +
      '</tr>';
    }).join('') + '</tbody></table>';

  /* Satu pendengar pada jadual, bukan satu per baris — jadual dilukis semula
     pada setiap tapisan dan pendengar per-baris akan berhimpun. */
  $('pt-jadual').querySelector('table').addEventListener('click', e => {
    const tr = e.target.closest('tr.pt-baris');
    if (!tr) return;
    PT.pilih = tr.getAttribute('data-kunci');
    lukisMarkahPentadbir();
  });

  lukisAnalisaSubjek();

  if (PT.pilih) lukisMarkahPentadbir();
}

/* ==========================================================================
   ANALISA MENGIKUT SUBJEK — kelas dihimpunkan
   --------------------------------------------------------------------------
   Jadual status di atas ialah satu baris per SLOT (subjek × kelas): ia
   menjawab "siapa belum isi?". Pentadbir juga perlu "subjek mana lemah?",
   dan itu tidak dapat dibaca daripada tiga puluh baris berselerak.

   Rekod mentah dihimpunkan semula, BUKAN kiraan per-kelas dicampur: GPS
   purata-bagi-purata memberi nombor yang salah apabila saiz kelas berbeza
   (kelas 12 murid menyumbang sama berat dengan kelas 34). `mgKiraGred` ialah
   satu-satunya enjin kiraan, sama dengan jadual status dan panel guru.

   Mengikut tapisan darjah/subjek yang sama — nombor yang tidak berubah
   ketika pentadbir menapis mengelirukan (peraturan sama dengan KPI).
   ========================================================================== */
function ptSubjekStat() {
  const d = $('pt-darjah').value, s = $('pt-subjek').value;

  /* Kumpul REKOD, bukan statistik — lihat nota di atas. */
  const kolam = {};
  PT.baris.forEach(b => {
    if (d && String(b.darjah) !== d) return;
    if (s && b.subjek !== s) return;
    const e = kolam[b.subjek] || (kolam[b.subjek] = {
      subjek: b.subjek, rekod: [], bilMurid: 0, slot: 0, slotKosong: 0
    });
    e.bilMurid += b.bilMurid;
    e.slot++;
    if (b.jumRekod === 0) e.slotKosong++;
  });

  PT.markah.forEach(r => {
    const e = kolam[r.subjek];
    if (!e) return;                                    // subjek luar tapisan
    const dn = agWordDarjah(r.tahun);
    if (d && String(dn) !== d) return;
    e.rekod.push(r);
  });

  return Object.keys(kolam).sort((a, b) => a.localeCompare(b, 'ms'))
    .map(k => {
      const e = kolam[k];
      return { ...e, gred: mgKiraGred(e.rekod), jumRekod: e.rekod.length };
    });
}

function lukisAnalisaSubjek() {
  const stat = ptSubjekStat();
  const bekas = $('pt-analisa-subjek');
  if (!bekas) return;

  if (!stat.length) {
    bekas.innerHTML = '<p class="hint" style="padding:16px">Tiada subjek untuk tapisan ini.</p>';
    return;
  }

  /* TOTAL GPS = jumlah skor semua subjek ÷ jumlah rekod dinilai — bukan
     purata lajur GPS, atas sebab yang sama dengan nota di atas. */
  const mata = agMataMap();
  let skorSemua = 0, bilSemua = 0, thSemua = 0;
  stat.forEach(x => {
    MG_GRED.forEach(g => { skorSemua += x.gred[g] * (mata[g] || 0); });
    bilSemua += x.gred.bil;
    thSemua  += x.gred.th;
  });
  const totalGps = bilSemua ? Math.round((skorSemua / bilSemua) * 100) / 100 : null;

  const pct = (n, j) => j ? (n / j * 100).toFixed(1) + '%' : '—';

  bekas.innerHTML =
    '<table class="senarai"><thead><tr>' +
      '<th style="width:42px">#</th>' +
      '<th class="lajur-teks">Subjek</th>' +
      MG_GRED.map(g =>
        '<th style="width:40px; text-align:center">' + g + '</th>' +
        '<th style="width:54px; text-align:center">% ' + g + '</th>').join('') +
      '<th style="width:40px; text-align:center" title="Tidak Hadir — dikecualikan dari GPS">TH</th>' +
      '<th style="width:66px; text-align:center" title="Murid dinilai (TH dikecualikan)">Dinilai</th>' +
      '<th style="width:58px; text-align:center" title="Gred Purata Subjek">GPS</th>' +
      '<th style="width:62px; text-align:center">Purata</th>' +
      '<th style="width:58px; text-align:center">Lulus</th>' +
    '</tr></thead><tbody>' +
    stat.map((x, i) => {
      const s = x.gred;
      return '<tr>' +
        '<td class="num">' + (i + 1) + '</td>' +
        '<td><strong>' + agEsc(x.subjek) + '</strong>' +
          (x.slotKosong
            ? '<br><span class="kecil" style="color:var(--absen)">' + x.slotKosong +
              ' dari ' + x.slot + ' kelas belum diisi</span>'
            : '') + '</td>' +
        MG_GRED.map(g =>
          '<td style="text-align:center; font-variant-numeric:tabular-nums"' +
            (s[g] ? '' : ' class="sifar"') + '>' + s[g] + '</td>' +
          '<td style="text-align:center; font-variant-numeric:tabular-nums"' +
            (s[g] ? ' class="kecil"' : ' class="sifar kecil"') + '>' +
            pct(s[g], s.bil) + '</td>').join('') +
        '<td style="text-align:center; font-variant-numeric:tabular-nums"' +
          (s.th ? '' : ' class="sifar"') + '>' + s.th + '</td>' +
        '<td style="text-align:center; font-variant-numeric:tabular-nums">' +
          s.bil + ' / ' + x.bilMurid + '</td>' +
        '<td style="text-align:center; font-weight:700; font-variant-numeric:tabular-nums">' +
          (s.gps ?? '—') + '</td>' +
        '<td style="text-align:center; font-variant-numeric:tabular-nums">' +
          (s.purata ?? '—') + '</td>' +
        '<td style="text-align:center; font-variant-numeric:tabular-nums' +
          (s.pLulus != null && s.pLulus < 50 ? '; color:var(--absen); font-weight:700' : '') +
          '">' + (s.pLulus != null ? s.pLulus + '%' : '—') + '</td>' +
      '</tr>';
    }).join('') +
    '</tbody><tfoot><tr style="border-top:2px solid var(--garis)">' +
      '<td></td><td><strong>TOTAL GPS</strong></td>' +
      '<td colspan="' + (MG_GRED.length * 2) + '" class="kecil" style="text-align:right">' +
        'jumlah dinilai →</td>' +
      '<td style="text-align:center; font-variant-numeric:tabular-nums">' + thSemua + '</td>' +
      '<td style="text-align:center; font-weight:700; font-variant-numeric:tabular-nums">' +
        bilSemua + '</td>' +
      '<td style="text-align:center; font-weight:700; font-variant-numeric:tabular-nums">' +
        (totalGps ?? '—') + '</td>' +
      '<td></td><td></td>' +
    '</tr></tfoot></table>';

  /* Nota: subjek yang kelasnya belum diisi memberi GPS atas sebahagian
     murid sahaja. Tanpa ini pentadbir membaca 5.20 sebagai keputusan
     subjek itu sedangkan ia keputusan satu kelas daripada enam. */
  const belum = stat.filter(x => x.slotKosong).length;
  if (belum) {
    bekas.innerHTML +=
      '<p class="hint" style="padding:12px 16px; margin:0">' +
      '<strong>' + belum + ' subjek</strong> masih ada kelas yang belum diisi — ' +
      'GPS dan peratusnya dikira atas murid yang sudah ada markah sahaja.</p>';
  }
}

function ptSubjekCSV() {
  const stat = ptSubjekStat();
  if (!stat.length) return;

  const kepala = ['SUBJEK'];
  MG_GRED.forEach(g => kepala.push(g, '% ' + g));
  kepala.push('TH', 'DINILAI', 'JUMLAH MURID', 'GPS', 'PURATA', '% LULUS',
              'KELAS BELUM DIISI', 'JUMLAH KELAS');

  const data = [kepala];
  stat.forEach(x => {
    const s = x.gred;
    const bar = [x.subjek];
    MG_GRED.forEach(g => bar.push(s[g], s.bil ? (s[g] / s.bil * 100).toFixed(1) : ''));
    bar.push(s.th, s.bil, x.bilMurid, s.gps ?? '', s.purata ?? '', s.pLulus ?? '',
             x.slotKosong, x.slot);
    data.push(bar);
  });

  agMuatTurunCSV(data,
    'analisa-subjek-' + (PT.pep ? PT.pep.nama : '') + '-' + MG.calYear + '.csv');
}

function kpi(label, nilai, nota, kelas) {
  return '<div class="kpi' + (kelas ? ' ' + kelas : '') + '">' +
    '<span class="eyebrow">' + agEsc(label) + '</span>' +
    '<strong>' + nilai + '</strong>' +
    (nota ? '<span class="sub">' + agEsc(nota) + '</span>' : '') +
    '</div>';
}

async function lukisMarkahPentadbir() {
  if (!PT.pilih) return;
  const [word, kelas, subjek] = PT.pilih.split('|');

  $('pt-markah-tajuk').textContent = subjek + ' — ' + kelas +
    ' (Darjah ' + agWordDarjah(word) + ')';

  const murid = (await agMuatMurid())
    .filter(m => m.tahun === word && m.kelas === kelas)
    .sort((a, b) => a.nama.localeCompare(b.nama, 'ms'));

  const peta = {};
  PT.markah.filter(r => r.subjek === subjek && r.tahun === word && r.kelas === kelas)
    .forEach(r => { peta[r.no_kp] = r; });

  if (!murid.length) {
    $('pt-markah').innerHTML = '<p class="hint" style="padding:16px">Tiada murid dalam kelas ini.</p>';
    return;
  }

  $('pt-markah').innerHTML =
    '<table class="senarai"><thead><tr>' +
      '<th style="width:42px">#</th>' +
      '<th class="lajur-teks">Nama</th>' +
      '<th style="width:130px">No. KP</th>' +
      '<th style="width:90px; text-align:center">Markah</th>' +
      '<th style="width:70px; text-align:center">Gred</th>' +
    '</tr></thead><tbody>' +
    murid.map((m, i) => {
      const r = peta[m.no_kp];
      const th = r ? agIsTH(r) : false;
      const markah = !r ? '<span style="color:var(--absen)">—</span>'
        : (th ? '<span class="pil absen">TH</span>' : r.markah);
      const gred = !r ? '—' : (th ? 'TH' : (r.gred || agGredDariMarkah(r.markah)));
      return '<tr>' +
        '<td class="num">' + (i + 1) + '</td>' +
        '<td class="nama-murid">' + agEsc(m.nama) + '</td>' +
        '<td class="kecil">' + agEsc(m.no_kp) + '</td>' +
        '<td style="text-align:center; font-variant-numeric:tabular-nums">' + markah + '</td>' +
        '<td style="text-align:center; font-weight:700">' + agEsc(gred) + '</td>' +
      '</tr>';
    }).join('') + '</tbody></table>' +
    // Ringkasan gred kelas ini — sama kiraan dengan lajur dalam senarai di
    // atas, supaya dua skrin tidak boleh memberi nombor berbeza.
    '<div style="padding:14px 16px; border-top:1px solid var(--garis-halus)">' +
      mgJalurGred(mgKiraGred(Object.keys(peta).map(k => peta[k]))) +
    '</div>';
}

function ptCSV() {
  const baris = ptTapis();
  if (!baris.length) return;
  // Lajur gred disertakan — guru besar membuka CSV ini untuk membandingkan
  // kelas, dan tanpa gred ia hanya memberitahu berapa yang sudah diisi.
  const data = [['DARJAH', 'KELAS', 'SUBJEK', 'GURU', 'DIISI', 'JUMLAH MURID',
                 'A', 'B', 'C', 'D', 'E', 'F', 'TH', 'DINILAI', 'GPS',
                 'PURATA', '% LULUS', 'STATUS']];
  baris.forEach(b => {
    const lengkap = b.bilMurid > 0 && b.jumRekod >= b.bilMurid;
    const s = b.gred || mgKiraGred([]);
    data.push([
      'D' + b.darjah, b.kelas, b.subjek, b.guru || 'TIADA GURU',
      b.jumRekod, b.bilMurid,
      s.A, s.B, s.C, s.D, s.E, s.F, s.th, s.bil,
      s.gps ?? '', s.purata ?? '', s.pLulus ?? '',
      b.jumRekod === 0 ? 'BELUM' : (lengkap ? 'LENGKAP' : 'SEPARA')
    ]);
  });
  agMuatTurunCSV(data, 'status-markah-' + (PT.pep ? PT.pep.nama : '') + '-' + MG.calYear + '.csv');
}

/* ==========================================================================
   CSV + PDF — panel guru (kelasnya sendiri)
   ========================================================================== */
function guruCSV() {
  const kelas = $('i-kelas').value;
  const rekod = MG.murid.map(m => MG.markah[m.no_kp]).filter(Boolean);
  const s = mgKiraGred(rekod);

  const data = [['BIL', 'NAMA', 'NO. KP', 'MARKAH', 'GRED']];
  MG.murid.forEach((m, i) => {
    const r = MG.markah[m.no_kp];
    const th = r ? agIsTH(r) : false;
    data.push([
      i + 1, m.nama, m.no_kp,
      !r ? '' : (th ? 'TH' : r.markah),
      !r ? '' : (th ? 'TH' : (r.gred || agGredDariMarkah(r.markah)))
    ]);
  });
  data.push([]);
  data.push(['RINGKASAN GRED']);
  data.push(['A', 'B', 'C', 'D', 'E', 'F', 'TH', 'DINILAI', 'GPS', 'PURATA', '% LULUS']);
  data.push([s.A, s.B, s.C, s.D, s.E, s.F, s.th, s.bil,
             s.gps ?? '', s.purata ?? '', s.pLulus ?? '']);

  agMuatTurunCSV(data,
    'markah-' + MG.pep.nama + '-' + MG.guru.subjek + '-' + kelas + '.csv');
}

/* PDF melalui dialog cetak pelayar — tiada pustaka dimuat, dan guru
   menyimpan sebagai PDF dari dialog yang sama. `@media print` dalam
   markah-guru.html menyembunyikan segala yang bukan kandungan ini. */
function guruPDF() {
  document.body.classList.add('cetak-guru');
  const tajuk = document.title;
  document.title = MG.pep.nama + ' — ' + MG.guru.subjek + ' ' + $('i-kelas').value;
  const pulih = () => {
    document.body.classList.remove('cetak-guru');
    document.title = tajuk;
    window.removeEventListener('afterprint', pulih);
  };
  window.addEventListener('afterprint', pulih);
  window.print();
  // Sesetengah pelayar tidak membangkitkan afterprint — jaring keselamatan
  setTimeout(() => { if (document.body.classList.contains('cetak-guru')) pulih(); }, 1500);
}

$('b-guru-csv').addEventListener('click', guruCSV);
$('b-guru-pdf').addEventListener('click', guruPDF);
