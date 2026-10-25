/* ==========================================================================
   anugerah-kongsi.js — kod yang dikongsi oleh KESEMUA panel anugerah
   --------------------------------------------------------------------------
   Dimuatkan oleh: anugerah-admin.html · peserta.html · mc.html ·
                   hadiah.html · tayang.html

   🔴 SATU-SATUNYA tempat Firebase config ditulis. Jangan salin-tampal
      config ke mana-mana fail panel — kalau projek bertukar, ia kena
      bertukar di satu tempat sahaja.

   🔴 Koleksi `students` · `rekodMarkah` · `gred` · `examTypes` · `subjek`
      adalah BACA SAHAJA dari modul anugerah. Modul ini hanya menulis
      `anugerah_majlis` dan `anugerah_penerima`.
   ========================================================================== */

/* ---------- Firebase ---------- */
const AG_CONFIG = {
  apiKey: "AIzaSyA4izu2nFOByzV9YKVFHoL8Q2Q6aTnrIww",
  authDomain: "sistem-esis.firebaseapp.com",
  projectId: "sistem-esis",
  storageBucket: "sistem-esis.firebasestorage.app",
  messagingSenderId: "667946090987",
  appId: "1:667946090987:web:22c88159abb5ae44f559ae"
};

if (!firebase.apps.length) firebase.initializeApp(AG_CONFIG);
const agDb = firebase.firestore();

/* ---------- pemalar ---------- */
const AG_MATA_DEFAULT = { A: 6, B: 5, C: 4, D: 3, E: 2, F: 1 };
const AG_GRED_TH = 'TH';
/* Kata laluan lalai. JANGAN tunjuk nilai ini dalam placeholder atau nota
   pada halaman — admin & rakan yang diberitahu sahaja patut tahu.
   (Nota: fail ini masih boleh dibaca melalui View Source.) */
const AG_PW_LALAI = 'anugerah123';

const AG_DARJAH_WORD = ['', 'SATU', 'DUA', 'TIGA', 'EMPAT', 'LIMA', 'ENAM'];
const AG_WORD_DARJAH = { SATU: 1, DUA: 2, TIGA: 3, EMPAT: 4, LIMA: 5, ENAM: 6 };

function agDarjahWord(n) { return AG_DARJAH_WORD[Number(n)] || String(n || ''); }
function agWordDarjah(w) { return AG_WORD_DARJAH[String(w || '').toUpperCase()] || Number(w) || 0; }

/* ---------- TH ----------
   Sama peraturan dengan ESIS: TH bukan markah dan bukan gred gagal.
   Ia keluar dari pengangka DAN penyebut.                               */
function agIsTH(rekod) {
  if (rekod == null) return false;
  if (typeof rekod === 'object') return rekod.th === true || rekod.gred === AG_GRED_TH;
  return String(rekod) === AG_GRED_TH;
}
function agTanpaTH(senarai) { return (senarai || []).filter(m => !agIsTH(m)); }

/* ---------- gred & GPS ---------- */
let AG_GRED_CACHE = null;

async function agMuatGred(paksa) {
  if (AG_GRED_CACHE && !paksa) return AG_GRED_CACHE;
  const snap = await agDb.collection('gred').get();
  AG_GRED_CACHE = snap.docs.map(d => ({ gred: d.id, ...d.data() }));
  return AG_GRED_CACHE;
}

function agGredDariMarkah(markah) {
  if (agIsTH(markah)) return AG_GRED_TH;
  const n = parseInt(markah);
  if (isNaN(n) || n < 0 || n > 100) return 'TIDAK SAH';
  const g = (AG_GRED_CACHE || []).find(x =>
    n >= parseInt(x.markah_min) && n <= parseInt(x.markah_max));
  return g ? g.gred : 'Gagal';
}

function agMataMap() {
  const map = { ...AG_MATA_DEFAULT };
  (AG_GRED_CACHE || []).forEach(g => {
    const m = parseFloat(g.mata);
    if (!isNaN(m) && map.hasOwnProperty(g.gred)) map[g.gred] = m;
  });
  return map;
}

/* GPS satu murid merentas subjek. TH sudah dibuang sebelum masuk sini.
   Gred 'Gagal'/'TIDAK SAH' = 0 mata tetapi KEKAL dalam penyebut —
   sama seperti jadual ESIS yang lain.                                  */
function agGPS(senaraiGred) {
  const sah = agTanpaTH(senaraiGred);
  if (!sah.length) return null;
  const mata = agMataMap();
  const skor = sah.reduce((j, g) => j + (mata[String(g).toUpperCase()] || 0), 0);
  return Math.round((skor / sah.length) * 100) / 100;
}

/* ---------- murid ---------- */
let AG_MURID_CACHE = null;

async function agMuatMurid(paksa) {
  if (AG_MURID_CACHE && !paksa) return AG_MURID_CACHE;
  const snap = await agDb.collection('students').get();
  AG_MURID_CACHE = snap.docs
    .map(d => {
      const x = d.data();
      return {
        id: d.id,
        no_kp: String(x.no_kp || '').trim(),
        nama: String(x.nama || '').trim(),
        tahun: String(x.tahun || '').trim().toUpperCase(),
        kelas: String(x.kelas || '').trim().toUpperCase(),
        jantina: String(x.jantina || '').trim().toUpperCase(),
        /* 🔴 `agama` diperlukan oleh markah-guru.js apabila ia MENULIS rekod
           markah: rekod ESIS membawa medan ini dan tapisan agama dalam Analisa
           membacanya. Rekod tanpa `agama` terkeluar secara senyap dari tapisan
           itu. Nilai dikekalkan apa adanya — JANGAN default ke ISLAM (lihat
           normalizeAgama dalam index.html; murid HINDU/KRISTIAN sekolah ini
           pernah dipaparkan sebagai Islam kerana default begitu). */
        agama: String(x.agama || '').trim().toUpperCase()
      };
    })
    .filter(m => m.no_kp && m.nama);
  return AG_MURID_CACHE;
}

/* ---------- markah satu tahun + satu peperiksaan ----------
   🔴 TIDAK menapis `examTypes.diterbit` (Terbit Keputusan dalam
      index.html). Modul Anugerah ialah panel ADMIN MAJLIS, bukan
      paparan guru: justru kerjanya memilih calon daripada keputusan
      yang BELUM diumumkan, supaya tiket dan giliran sudah siap pada
      hari majlis. Menapis di sini akan mengosongkan senarai calon
      setiap kali admin menutup keputusan — kegagalan senyap yang
      kelihatan seperti markah hilang.

      Borang guru (guru.html) tidak membaca fungsi ini; ia menulis
      penerima sahaja, jadi guru tetap tidak nampak markah. */
const AG_MARKAH_CACHE = {};

async function agMuatMarkah(calYear, peperiksaan, paksa) {
  const kunci = calYear + '||' + peperiksaan;
  if (AG_MARKAH_CACHE[kunci] && !paksa) return AG_MARKAH_CACHE[kunci];

  const snap = await agDb.collection('rekodMarkah')
    .where('cal_year', '==', Number(calYear))
    .where('JENIS PEPERIKSAAN', '==', peperiksaan)
    .get();

  AG_MARKAH_CACHE[kunci] = snap.docs.map(d => {
    const x = d.data();
    return {
      id: d.id,
      no_kp: String(x.no_kp || '').trim(),
      nama: String(x.nama || '').trim(),
      tahun: String(x.tahun || '').trim().toUpperCase(),
      kelas: String(x.kelas || '').trim().toUpperCase(),
      subjek: String(x.subjek || '').trim(),
      markah: x.markah,
      gred: x.gred,
      th: x.th === true
    };
  });
  return AG_MARKAH_CACHE[kunci];
}

/* ---------- jenis peperiksaan satu tahun ----------
   Dedup ikut nama huruf besar — BACA SAHAJA, tidak memadam apa-apa
   (sama peraturan dengan getExamTypesForYear dalam index.html).        */
async function agJenisPeperiksaan(calYear) {
  const snap = await agDb.collection('examTypes')
    .where('tahunKalendar', '==', Number(calYear)).get();

  let docs = snap.docs;
  if (snap.empty) {
    const semua = await agDb.collection('examTypes').get();
    docs = semua.docs.filter(d => {
      const t = d.data().tahunKalendar;
      return t === undefined || t === null;
    });
  }

  const nampak = new Set();
  return docs
    .map(d => ({ id: d.id, ...d.data() }))
    .filter(e => {
      const k = String(e.nama || '').trim().toUpperCase();
      if (!k || nampak.has(k)) return false;
      nampak.add(k);
      return true;
    })
    .sort((a, b) => (a.order || 0) - (b.order || 0));
}

/* ---------- muat turun CSV ----------
   BOM UTF-8 di hadapan: tanpanya Excel di Windows memaparkan nama
   Melayu bertanda diakritik sebagai sampah, dan guru menyangka fail
   itu rosak.                                                        */
function agMuatTurunCSV(baris, namaFail) {
  const teks = baris.map(r => r.map(sel => {
    const t = sel == null ? '' : String(sel);
    return /[",\n]/.test(t) ? '"' + t.replace(/"/g, '""') + '"' : t;
  }).join(',')).join('\r\n');

  const blob = new Blob(['﻿' + teks], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = namaFail || 'data.csv';
  document.body.appendChild(a); a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/* ---------- senarai kelas ikut darjah (dari students) ---------- */
async function agKelasIkutDarjah() {
  const murid = await agMuatMurid();
  const peta = {};
  murid.forEach(m => {
    if (!m.tahun || !m.kelas) return;
    (peta[m.tahun] = peta[m.tahun] || new Set()).add(m.kelas);
  });
  Object.keys(peta).forEach(t => { peta[t] = Array.from(peta[t]).sort(); });
  return peta;
}

/* ---------- senarai subjek ---------- */
async function agSenaraiSubjek() {
  const snap = await agDb.collection('subjek').get();
  const nama = snap.docs
    .map(d => String(d.data().nama_penuh || d.data().nama || d.id).trim())
    .filter(Boolean);
  return Array.from(new Set(nama)).sort();
}

/* ==========================================================================
   SUBJEK TERAS — tetapan admin, per darjah
   --------------------------------------------------------------------------
   settings/anugerahSubjek = { SATU:[nama_penuh...], DUA:[...], ... }

   🔴 Senarai KOSONG atau tiada = SEMUA subjek dikira. Majlis yang dibina
      sebelum tetapan ini wujud kekal berkelakuan sama — jangan tukar
      makna "kosong" kepada "tiada subjek".

   🔴 Berasingan dari settings/subjekUtama milik Headcount/Murid Terbaik
      dalam index.html. Dua tujuan berbeza: menukar subjek untuk majlis
      anugerah tidak patut mengalih sasaran Headcount tanpa admin sedar.
   ========================================================================== */
let AG_TERAS_CACHE = null;

async function agMuatSubjekTeras(paksa) {
  if (AG_TERAS_CACHE && !paksa) return AG_TERAS_CACHE;
  let data = {};
  try {
    const d = await agDb.collection('settings').doc('anugerahSubjek').get();
    if (d.exists) data = d.data() || {};
  } catch (e) { /* tiada tetapan = semua subjek; bukan ralat */ }

  const peta = {};
  AG_DARJAH_WORD.slice(1).forEach(w => {
    const senarai = Array.isArray(data[w]) ? data[w] : [];
    peta[w] = senarai.map(x => String(x).trim().toUpperCase()).filter(Boolean);
  });
  AG_TERAS_CACHE = peta;
  return peta;
}

async function agSimpanSubjekTeras(peta) {
  const bersih = {};
  AG_DARJAH_WORD.slice(1).forEach(w => {
    const senarai = Array.isArray(peta[w]) ? peta[w] : [];
    bersih[w] = senarai.map(x => String(x).trim()).filter(Boolean);
  });
  /* 🔴 BUKAN merge. Senarai kosong bermakna "semua subjek", dan dengan
     merge:true Firestore mengabaikan medan array kosong — pilihan lama
     kekal secara senyap, jadi admin yang menanggalkan setiap tanda dan
     menekan Simpan melihat tetapannya tidak berubah. Dokumen ini kecil
     dan sentiasa ditulis penuh (keenam-enam darjah), jadi menulis
     ganti adalah selamat. */
  await agDb.collection('settings').doc('anugerahSubjek').set(bersih);
  AG_TERAS_CACHE = null;
  return bersih;
}

/* subjek dalam examTypes bagi satu darjah — sumber checklist Tetapan.
   examTypes.darjah menyimpan NOMBOR ([4,5,6]), bukan perkataan. */
async function agSubjekUntukDarjah(calYear, peperiksaan) {
  let senarai = await agJenisPeperiksaan(calYear);
  if (peperiksaan) {
    const mahu = String(peperiksaan).trim().toUpperCase();
    senarai = senarai.filter(e => String(e.nama || '').trim().toUpperCase() === mahu);
  }
  const peta = {};
  AG_DARJAH_WORD.slice(1).forEach(w => { peta[w] = new Set(); });

  let adaSekatan = false;
  senarai.forEach(e => {
    const subjek = Array.isArray(e.subjek) ? e.subjek.filter(Boolean) : [];
    if (!subjek.length) return;              // [] = semua subjek
    const darjah = Array.isArray(e.darjah) ? e.darjah : [];
    const word = darjah.length
      ? darjah.map(d => agDarjahWord(d) || String(d).toUpperCase())
      : AG_DARJAH_WORD.slice(1);
    word.forEach(w => {
      if (!peta[w]) return;
      adaSekatan = true;
      subjek.forEach(n => peta[w].add(String(n).trim()));
    });
  });

  /* Darjah tanpa sekatan (atau examTypes tidak menetapkan subjek sama
     sekali) jatuh balik ke senarai subjek penuh — lebih baik checklist
     panjang daripada checklist kosong yang nampak rosak. */
  const penuh = await agSenaraiSubjek();
  const hasil = {};
  AG_DARJAH_WORD.slice(1).forEach(w => {
    hasil[w] = peta[w].size ? Array.from(peta[w]).sort() : penuh.slice();
  });
  return { peta: hasil, adaSekatan };
}

/* ==========================================================================
   KIRAAN CALON — inti modul ini
   --------------------------------------------------------------------------
   Satu fungsi, empat asas ranking. Dipakai oleh admin (cadang calon) sahaja;
   panel petugas tidak pernah mengira.
   ========================================================================== */

/**
 * @param {object} o
 *   calYear      tahun kalendar
 *   peperiksaan  nama jenis peperiksaan
 *   asas         'gps' | 'jumlah' | 'purata' | 'subjek'
 *   subjek       nama subjek (wajib bila asas==='subjek')
 *   skopJenis    'darjah' | 'kelas' | 'sekolah'
 *   skopNilai    darjah word (EMPAT) atau kelas (4 INTEL) ikut skopJenis
 *   ambil        berapa orang teratas
 * @returns {Promise<{senarai:Array, jumMurid:number, tiadaMarkah:number}>}
 */
async function agKiraCalon(o) {
  await agMuatGred();
  const murid = await agMuatMurid();
  /* `peperiksaan` boleh jadi satu nama ATAU beberapa nama (anugerah
     terbaik subjek yang memuratakan UASA + UPSA). Setiap rekod ditanda
     dengan peperiksaan asalnya supaya lajur per-peperiksaan boleh
     dipaparkan — purata yang tidak boleh disemak tidak berguna. */
  const senaraiPep = Array.isArray(o.peperiksaan) ? o.peperiksaan.filter(Boolean)
                                                  : [o.peperiksaan];
  const markah = [];
  for (const nama of senaraiPep) {
    /* `paksa` melangkau cache ingatan — guru masih memasukkan markah,
       jadi admin perlu jalan untuk menarik yang terbaru tanpa memuat
       semula seluruh halaman. */
    const satu = await agMuatMarkah(o.calYear, nama, o.paksa);
    satu.forEach(r => markah.push(Object.assign({}, r, { _pep: nama })));
  }
  const teras = await agMuatSubjekTeras();

  /* --- tapis skop --- */
  let kolam = murid;
  if (o.skopJenis === 'darjah') {
    kolam = murid.filter(m => m.tahun === String(o.skopNilai || '').toUpperCase());
  } else if (o.skopJenis === 'kelas') {
    /* 🔴 Nama kelas BERULANG merentas darjah — sekolah ini mempunyai
       "INTEL" di keenam-enam darjah, 187 murid semuanya. Memadankan
       nama kelas sahaja menjadikan "terbaik dalam kelas" satu ranking
       enam darjah. `skopDarjah` menyempitkannya; tanpa ia, perangai
       lama dikekalkan supaya dokumen lama tidak berubah makna. */
    const nk = String(o.skopNilai || '').toUpperCase();
    const nd = String(o.skopDarjah || '').toUpperCase();
    kolam = murid.filter(m => m.kelas === nk && (!nd || m.tahun === nd));
  } else if (o.skopJenis === 'tahap') {
    /* Tahap 1 = darjah 1–3, Tahap 2 = darjah 4–6. Satu senarai merentas
       ketiga-tiga darjah, bukan tiga senarai berasingan. */
    const t = Number(o.skopNilai) === 2 ? [4, 5, 6] : [1, 2, 3];
    kolam = murid.filter(m => t.includes(agWordDarjah(m.tahun)));
  }

  /* --- kumpul markah ikut no_kp (BUKAN nama — nama berubah bila ejaan
         dibetulkan, no_kp stabil) --- */
  const ikutKP = {};
  markah.forEach(r => {
    if (!r.no_kp) return;
    (ikutKP[r.no_kp] = ikutKP[r.no_kp] || []).push(r);
  });

  const hasil = [];
  let tiadaMarkah = 0;
  let tiadaTeras = 0;          // ada markah, tetapi tiada satu pun subjek teras
  let takLengkap = 0;          // kurang daripada senarai teras darjah itu
  const terasDipakai = new Set();

  kolam.forEach(m => {
    let rekod = ikutKP[m.no_kp] || [];

    /* --- tapis ikut subjek teras darjah murid ---
       Senarai kosong = semua subjek (tetapan belum dibuat). Tapisan ini
       digunakan untuk asas gps/jumlah/purata sahaja; asas 'subjek'
       mencari satu subjek yang dinamakan, jadi ia dibiarkan utuh. */
    const senarai = (teras[String(m.tahun || '').toUpperCase()] || []);
    if (senarai.length && o.asas !== 'subjek') {
      senarai.forEach(x => terasDipakai.add(x));
      const sebelum = rekod.length;
      rekod = rekod.filter(r => senarai.includes(String(r.subjek || '').trim().toUpperCase()));
      if (sebelum && !rekod.length) { tiadaTeras++; return; }
    }

    if (o.asas === 'subjek') {
      /* Nama subjek boleh BEBERAPA — "Pendidikan Islam dan Moral" ialah
         satu anugerah di mana murid Islam dinilai atas Pendidikan Islam
         dan murid bukan Islam atas Moral, bersaing dalam ranking yang
         sama. Murid mengambil salah satu, tidak pernah kedua-duanya. */
      const mahu = (Array.isArray(o.subjek) ? o.subjek : [o.subjek])
        .map(x => String(x || '').trim().toUpperCase()).filter(Boolean);
      const padan = rekod.filter(x => mahu.includes(String(x.subjek).toUpperCase()));

      /* Satu markah bagi setiap peperiksaan; purata merentasinya.
         Purata MARKAH, bukan purata gred — dua murid gred A boleh
         berbeza enam markah, dan itulah yang memisahkan mereka. */
      const ikutPep = {};
      padan.forEach(r => {
        if (agIsTH(r)) return;
        const v = parseInt(r.markah);
        if (isNaN(v)) return;
        const kunci = r._pep || senaraiPep[0];
        if (ikutPep[kunci] == null) ikutPep[kunci] = v;
      });

      const adaPep = senaraiPep.filter(x => ikutPep[x] != null);
      if (!adaPep.length) { tiadaMarkah++; return; }

      const jum = adaPep.reduce((a, x) => a + ikutPep[x], 0);
      const purata = Math.round((jum / adaPep.length) * 100) / 100;
      const kurangPep = adaPep.length < senaraiPep.length;
      if (kurangPep) takLengkap++;

      hasil.push({
        no_kp: m.no_kp, nama: m.nama, tahun: m.tahun, kelas: m.kelas,
        nilai: purata, gps: null, jumlah: jum, bilSubjek: adaPep.length,
        perluSubjek: 0,
        markahPep: ikutPep,                 // lajur per-peperiksaan
        perluPep: senaraiPep.length, adaPep: adaPep.length, kurang: kurangPep,
        gredRingkas: agGredDariMarkah(purata),
        bilA: agGredDariMarkah(purata) === 'A' ? 1 : 0
      });
      return;
    }

    /* asas gps / jumlah / purata — TH dibuang dahulu, bukan dikira 0 */
    let sah = rekod.filter(r => !agIsTH(r) && !isNaN(parseInt(r.markah)));
    if (!sah.length) { tiadaMarkah++; return; }

    /* 🔴 BEBERAPA PEPERIKSAAN: satu baris per SUBJEK, bukan per rekod.
       Tanpa ini, rekod semua peperiksaan ditimbun jadi satu kolam dan
       setiap subjek dikira sekali bagi setiap peperiksaan — tiga kesan,
       semuanya senyap:
         · GPS condong ke arah subjek yang lebih banyak peperiksaan
           (UASA+MATRIK: 4 subjek → 8 rekod, GPS 4.88 bukan 5.00)
         · `jumlah` berganda (580 bukan 290), jadi pemecah seri salah
         · `kurang` tidak pernah dicetuskan — murid dengan 2 daripada 4
           subjek teras × 2 peperiksaan = 4 rekod dan dilaporkan LENGKAP,
           jadi amaran "2/4" yang admin bergantung padanya tidak muncul.
       Purata MARKAH per subjek dahulu (sama peraturan dengan cabang
       `asas:'subjek'` di atas), kemudian gred dikira atas purata itu. */
    if (senaraiPep.length > 1) {
      const ikutSubjek = {};
      sah.forEach(r => {
        const s = String(r.subjek || '').trim().toUpperCase();
        const pep = r._pep || senaraiPep[0];
        const simpan = (ikutSubjek[s] = ikutSubjek[s] || { subjek: r.subjek, pep: {} });
        /* Rekod pendua dalam peperiksaan yang sama: yang PERTAMA menang —
           sama peraturan dengan cabang asas:'subjek'. */
        if (simpan.pep[pep] == null) simpan.pep[pep] = parseInt(r.markah);
      });
      sah = Object.keys(ikutSubjek).map(s => {
        const x = ikutSubjek[s];
        const nilaiPep = Object.keys(x.pep).map(k => x.pep[k]);
        const purataSub = nilaiPep.reduce((a, b) => a + b, 0) / nilaiPep.length;
        return {
          subjek: x.subjek,
          markah: Math.round(purataSub * 100) / 100,
          gred: null,                  /* dikira semula daripada purata */
          markahPep: x.pep,
          adaPep: nilaiPep.length
        };
      });
    }

    /* Murid yang kurang satu subjek teras TETAP dikira — keputusan
       sekolah, bukan kod. Ia ditanda supaya admin nampak 3/4 sebelum
       menandakan calon. */
    const perluSubjek = (o.asas === 'subjek') ? 0 : (senarai.length || 0);
    const kurang = perluSubjek && sah.length < perluSubjek;
    if (kurang) takLengkap++;

    const gredList = sah.map(r => r.gred || agGredDariMarkah(r.markah));
    /* parseFloat, bukan parseInt: purata merentas beberapa peperiksaan
       boleh jadi 72.5, dan parseInt membuangnya menjadi 72 — pada 13
       subjek itu sudah cukup untuk menukar kedudukan dua murid. Markah
       satu peperiksaan ialah integer, jadi nilainya tidak berubah. */
    const jumlah = Math.round(
      sah.reduce((j, r) => j + parseFloat(r.markah), 0) * 100) / 100;
    const gps = agGPS(gredList);
    const bilA = gredList.filter(g => String(g).toUpperCase() === 'A').length;

    let nilai;
    if (o.asas === 'jumlah') nilai = jumlah;
    else if (o.asas === 'purata') nilai = Math.round((jumlah / sah.length) * 100) / 100;
    else nilai = gps;

    hasil.push({
      no_kp: m.no_kp, nama: m.nama, tahun: m.tahun, kelas: m.kelas,
      nilai, gps, jumlah, bilSubjek: sah.length,
      perluSubjek, kurang,
      gredRingkas: agRingkasGred(gredList), bilA
    });
  });

  /* --- isih: nilai turun, kemudian cadangan pemecah seri ---
     🔴 Pemecah seri DIPAPAR, tidak memutuskan. Isihan ini hanya
        meletakkan calon yang seri bersebelahan supaya admin nampak;
        `seri:true` ditanda dan admin yang tick. Memilih antara dua
        murid GPS sama itu dasar sekolah, bukan keputusan kod.        */
  hasil.sort((a, b) =>
    (b.nilai - a.nilai) ||
    (b.jumlah - a.jumlah) ||
    (b.bilA - a.bilA) ||
    a.nama.localeCompare(b.nama, 'ms')
  );

  /* tanda seri pada nilai utama sahaja */
  hasil.forEach((h, i) => {
    const sebelum = hasil[i - 1], selepas = hasil[i + 1];
    h.seri = !!((sebelum && sebelum.nilai === h.nilai) ||
                (selepas && selepas.nilai === h.nilai));
  });

  const ambil = Math.max(0, parseInt(o.ambil) || 0);
  hasil.forEach((h, i) => { h.kedudukan = i + 1; h.dalamTop = i < ambil; });

  return {
    senarai: hasil, jumMurid: kolam.length, tiadaMarkah,
    tiadaTeras, takLengkap,
    senaraiPep,
    subjekTeras: Array.from(terasDipakai).sort()
  };
}

/* Nama peperiksaan penuh ("UJIAN AKHIR SEMESTER (UASA)") memecahkan
   lebar jadual bila ia menjadi tajuk lajur. Guna singkatan dalam
   kurungan bila ada, kerana itulah yang guru sebut. */
function agSingkatPep(nama) {
  const t = String(nama || '').trim();
  const m = t.match(/\(([^)]{2,12})\)\s*$/);
  if (m) return m[1].toUpperCase();
  return t.length > 14 ? t.slice(0, 13).trim() + '…' : t;
}

/* "6A 1B" dari senarai gred */
function agRingkasGred(gredList) {
  const kira = {};
  (gredList || []).forEach(g => {
    const k = String(g || '').toUpperCase();
    if (!/^[A-F]$/.test(k)) return;
    kira[k] = (kira[k] || 0) + 1;
  });
  return ['A', 'B', 'C', 'D', 'E', 'F']
    .filter(g => kira[g]).map(g => kira[g] + g).join(' ') || '—';
}

/* ==========================================================================
   AKSES PETUGAS — kod rahsia dalam URL, bukan akaun
   --------------------------------------------------------------------------
   🔴 Setiap peranan ada kod SENDIRI. Satu kod tidak boleh membuka panel
      peranan lain — dan ini dikuatkuasakan dengan menyemak kod terhadap
      medan yang BETUL, bukan sekadar menyembunyikan menu.
   ========================================================================== */
const AG_PERANAN_MEDAN = {
  peserta: 'kodPeserta',
  mc: 'kodMC',
  hadiah: 'kodHadiah',
  tayang: 'kodTayang'
};

function agKodDariURL() {
  return new URLSearchParams(location.search).get('kod') || '';
}

/**
 * Cari majlis yang kodnya padan dengan peranan ini.
 * @returns {Promise<{majlis:object}|null>}
 */
async function agBukaDenganKod(peranan) {
  const kod = agKodDariURL().trim();
  const medan = AG_PERANAN_MEDAN[peranan];
  if (!kod || !medan) return null;

  const snap = await agDb.collection('anugerah_majlis')
    .where('modPetugas.' + medan, '==', kod).get();

  if (snap.empty) return null;
  return { majlis: { id: snap.docs[0].id, ...snap.docs[0].data() } };
}

function agKodBaru(n) {
  const huruf = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
  let s = '';
  for (let i = 0; i < (n || 6); i++) s += huruf[Math.floor(Math.random() * huruf.length)];
  return s;
}


/* ==========================================================================
   BORANG SERAHAN GURU
   --------------------------------------------------------------------------
   MAJLIS.borangGuru = { <anugerahId>: {kod, pw, nama, dibuka, masa} }

   🔴 Dua lapisan: kod dalam URL menentukan anugerah MANA, kata laluan
      membuktikan siapa. Pautan boleh tersebar dalam grup WhatsApp —
      kata laluan ialah lapisan yang masih berdiri selepas itu.
   ========================================================================== */
/* 🔴 Kunci borang ada TIGA bentuk, semuanya dalam SATU peta
   `borangGuru` — bukan struktur selari, supaya status/hantar/buang
   hanya ada satu laluan kod:

     anugerahId              — seluruh anugerah
     anugerahId::subId       — satu sub
     anugerahId::@DARJAH     — semua sub berskop kelas dalam darjah itu

   🔴 Awalan `@` membezakan darjah daripada sub. Id sub dijana sebagai
   `sub_<base36>` dan tidak pernah bermula dengan `@`, jadi tiada
   pertembungan. agKunciBorang/agKunciDarjah/agPecahKunci ialah
   satu-satunya tempat format ini diketahui; jangan bina kunci dengan
   tangan di tempat lain. */
function agKunciBorang(anugerahId, subId) {
  return subId ? anugerahId + '::' + subId : anugerahId;
}

function agKunciDarjah(anugerahId, darjah) {
  return anugerahId + '::@' + String(darjah || '').toUpperCase();
}

function agPecahKunci(kunci) {
  const i = String(kunci || '').indexOf('::');
  if (i < 0) return { anugerahId: kunci, subId: null, darjah: null };
  const ekor = kunci.slice(i + 2);
  return ekor.charAt(0) === '@'
    ? { anugerahId: kunci.slice(0, i), subId: null, darjah: ekor.slice(1) }
    : { anugerahId: kunci.slice(0, i), subId: ekor, darjah: null };
}

async function agBukaBorangGuru(kod) {
  const k = String(kod || '').trim();
  if (!k) return null;

  /* Firestore tidak boleh menanya kunci peta yang tidak diketahui, jadi
     padanan dibuat di sini. Bilangan majlis kecil (satu setahun). */
  const snap = await agDb.collection('anugerah_majlis').get();
  for (const d of snap.docs) {
    const m = { id: d.id, ...d.data() };
    const peta = m.borangGuru || {};
    const kunci = Object.keys(peta).find(x => peta[x] && peta[x].kod === k);
    if (!kunci) continue;
    const { anugerahId, subId, darjah } = agPecahKunci(kunci);
    const anugerah = (m.anugerah || []).find(a => a.id === anugerahId);
    if (!anugerah) continue;          // anugerah dibuang, borang yatim

    /* Borang aras-sub: sub mesti masih wujud, jika tidak borang itu
       yatim juga — lebih baik guru nampak "pautan tidak sah" daripada
       satu borang kosong yang dia isi untuk sub yang sudah dibuang. */
    let sub = null;
    if (subId) {
      sub = (anugerah.sub || []).find(x => x.id === subId);
      if (!sub) continue;
    }

    /* Borang aras-darjah: satu borang meliputi setiap sub berskop kelas
       dalam darjah itu. Sama seperti sub, ia yatim bila tiada satu pun
       sub tinggal. */
    let subDarjah = null;
    if (darjah) {
      subDarjah = (anugerah.sub || []).filter(x =>
        String(x.skopDarjah || '').toUpperCase() === darjah);
      if (!subDarjah.length) continue;
    }
    return { majlis: m, anugerah, sub, darjah, subDarjah, kunci, borang: peta[kunci] };
  }
  return null;
}

/* Tanda borang sudah dibuka — admin perlu tahu sama ada guru sudah
   menyentuhnya. Sebelum majlis, itulah perbezaan antara menunggu
   dengan tenang dan mengejar seseorang. */
/* Guru menandakan kerjanya SIAP. Murid sudah berada dalam majlis sejak
   dia menekan Simpan — ini menandakan senarai itu muktamad, supaya admin
   tahu perbezaan antara "belum siap" dan "sudah siap, jangan tunggu". */
async function agHantarBorang(majlisId, kunci, bil) {
  const masa = new Date().toLocaleString('ms-MY', {
    day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit'
  });
  await agDb.collection('anugerah_majlis').doc(majlisId).update({
    ['borangGuru.' + kunci + '.dihantar']: true,
    ['borangGuru.' + kunci + '.masaHantar']: masa,
    ['borangGuru.' + kunci + '.bilHantar']: Number(bil) || 0
  });
  return masa;
}

/* 🔴 ADMIN SAHAJA. Borang yang dihantar ialah senarai MUKTAMAD —
   guru tidak boleh membukanya semula sendiri. Admin menekan ini apabila
   guru memintanya, supaya tiada senarai berubah diam-diam selepas admin
   menganggapnya siap dan mula menyusun giliran.
   `bilHantar` dikekalkan: ia merekodkan berapa yang dihantar dahulu. */
async function agResetBorang(majlisId, kunci) {
  await agDb.collection('anugerah_majlis').doc(majlisId).update({
    ['borangGuru.' + kunci + '.dihantar']: false,
    ['borangGuru.' + kunci + '.dibukaSemula']: true,
    ['borangGuru.' + kunci + '.masaReset']: new Date().toLocaleString('ms-MY', {
      day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit'
    })
  });
}

async function agTandaBorangDibuka(majlisId, kunci) {
  try {
    const masa = new Date().toLocaleString('ms-MY', {
      day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit'
    });
    await agDb.collection('anugerah_majlis').doc(majlisId).update({
      ['borangGuru.' + kunci + '.dibuka']: true,
      ['borangGuru.' + kunci + '.masa']: masa
    });
  } catch (e) { /* bukan sebab untuk menghalang guru bekerja */ }
}

/* ==========================================================================
   PENERIMA
   ========================================================================== */

/* Doc id penerima = majlisId__noKP. Satu doc satu murid; semua anugerah
   yang dia menang duduk dalam `anugerah[]`, dan setiap satu dapat satu
   entri dalam `giliran[]`.                                              */
function agIdPenerima(majlisId, noKP) {
  return majlisId + '__' + String(noKP).replace(/[^\w-]/g, '');
}

async function agMuatPenerima(majlisId) {
  const snap = await agDb.collection('anugerah_penerima')
    .where('majlisId', '==', majlisId).get();
  return snap.docs.map(d => ({ docId: d.id, ...d.data() }));
}

/* ---------- ikatan giliran ----------
   🔴 Satu-satunya tempat entri giliran[] dibentuk. Kedua-dua laluan tulis
      (beri nombor baharu · jana semula) memanggil fungsi ini, supaya medan
      yang ditambah kemudian tidak gugur senyap di salah satu laluan.   */
function agEntriGiliran(o) {
  return {
    anugerahId: o.anugerahId,
    anugerah: o.anugerah,
    subId: o.subId,
    sub: o.sub,
    hadiah: o.hadiah || '',
    no: o.no,
    hadir: o.hadir === undefined ? null : o.hadir,
    mc: o.mc === undefined ? null : o.mc
  };
}

/* ==========================================================================
   CARIAN NAMA
   --------------------------------------------------------------------------
   🔴 Nama Melayu panjang: "MUHAMMAD DANIAL ASYRAF BIN MOHD KHAIRUNIZAM".
      Guru mengingati nama pertama dan nama bapa, jarang urutan tepat dengan
      BIN/BINTI di tengah. Padanan substring mentah memulangkan SIFAR untuk
      "danial khairunizam" — disahkan pada 1,134 murid sebenar.

   Peraturan: setiap token mesti hadir, urutan tidak penting. Taip lebih
   banyak perkataan = lebih sempit, yang merupakan apa yang orang jangka.

   🔴 Digit dicari pada no_kp, BUKAN pada nama. Ambang 4 digit supaya
      nama yang mengandungi nombor tidak menarik masuk seluruh sekolah.
      Kedua-dua '140102-11-0011' dan '140102110011' padan.
   ========================================================================== */
function agPecahCarian(q) {
  const mentah = String(q == null ? '' : q).trim();
  const digit = mentah.replace(/\D/g, '');
  return {
    kosong: !mentah,
    token: mentah.toUpperCase().split(/\s+/).filter(Boolean),
    digit: digit.length >= 4 ? digit : ''
  };
}

/* Padanan satu rekod. `c` daripada agPecahCarian — dihurai SEKALI oleh
   pemanggil, bukan sekali bagi setiap seribu murid dalam gelung. */
function agPadanCarian(c, nama, noKP) {
  if (c.kosong) return true;
  if (c.digit && String(noKP || '').replace(/\D/g, '').includes(c.digit)) return true;
  if (!c.token.length) return false;
  const n = String(nama || '').toUpperCase();
  return c.token.every(t => n.includes(t));
}

/* Butang \ud83d\udc41 pada medan kata laluan. CSS (.pw-baris/.b-mata) sudah
   berada dalam anugerah-kongsi.css \u2014 fungsi ini menyusulnya ke sini supaya
   panel admin dan borang guru berkongsi satu salinan, bukan dua yang
   boleh menyimpang. */
function pasangMata(butangId, inputId) {
  const b = document.getElementById(butangId), i = document.getElementById(inputId);
  if (!b || !i) return;
  b.addEventListener('click', () => {
    const tunjukkan = i.type === 'password';
    i.type = tunjukkan ? 'text' : 'password';
    b.textContent = tunjukkan ? '\ud83d\ude48' : '\ud83d\udc41';
    b.setAttribute('aria-label', tunjukkan ? 'Sembunyi kata laluan' : 'Tunjuk kata laluan');
    i.focus();
  });
}

/* ==========================================================================
   PEPERIKSAAN MENGIKUT DARJAH
   --------------------------------------------------------------------------
   🔴 Satu majlis boleh memakai DUA nama peperiksaan: sekolah ini menduduki
      "UJIAN AKHIR SEMESTER (UASA)" bagi darjah 4-6 dan "PENTAKSIRAN AKHIR
      TAHUN" bagi darjah 1-3. Satu medan `MAJLIS.peperiksaan` tidak dapat
      membawa kedua-duanya — kesannya 21 sub darjah 1-3 cuba mengira UASA
      yang muridnya tidak pernah duduki, dan senarai calon keluar kosong.

   🔴 `examTypes` SUDAH menyimpan `darjah[]` (contoh UASA = [4,5,6]), jadi
      admin tidak perlu memberitahu sistem apa yang ia sudah tahu.
      agPepUntukDarjah() membaca medan itu; `MAJLIS.pepDarjah` hanya
      menyimpan pilihan admin apabila dia MENIMPA tekaan itu.

   Keutamaan penuh (tertinggi menang):
     sub.peperiksaan > anugerah.peperiksaan
       > MAJLIS.pepDarjah[darjah] > examTypes.darjah > MAJLIS.peperiksaan
   ========================================================================== */

/* Cache per-tahun: agJenisPeperiksaan() ialah satu pertanyaan Firestore
   dan ini dipanggil sekali bagi setiap sub semasa melukis pokok. */
const AG_PEP_DARJAH_CACHE = {};

async function agPetaPepDarjah(calYear) {
  const kunci = String(calYear);
  if (AG_PEP_DARJAH_CACHE[kunci]) return AG_PEP_DARJAH_CACHE[kunci];
  const senarai = await agJenisPeperiksaan(calYear);
  const peta = {};                       // nombor darjah -> [nama, ...]
  senarai.forEach(e => {
    if (e.aktif === false) return;       // peperiksaan ditutup bukan calon
    (e.darjah || []).forEach(d => {
      const n = Number(d);
      if (!n) return;
      (peta[n] = peta[n] || []).push(e.nama);
    });
  });
  AG_PEP_DARJAH_CACHE[kunci] = peta;
  return peta;
}

/* Nama peperiksaan bagi satu darjah, atau '' bila tidak dapat ditentukan.
   `darjah` menerima perkataan (SATU..ENAM) atau nombor. */
async function agPepUntukDarjah(majlis, darjah) {
  const n = agWordDarjah(darjah);
  if (!n) return (majlis && majlis.peperiksaan) || '';

  /* Pilihan admin mengatasi tekaan automatik. */
  const timpa = majlis && majlis.pepDarjah && majlis.pepDarjah[n];
  if (timpa) return timpa;

  try {
    const peta = await agPetaPepDarjah((majlis && majlis.calYear) || new Date().getFullYear());
    const calon = peta[n] || [];
    if (!calon.length) return (majlis && majlis.peperiksaan) || '';
    /* Peperiksaan majlis diutamakan apabila ia sendiri meliputi darjah
       ini — admin memilihnya dengan sengaja. */
    if (majlis && majlis.peperiksaan && calon.indexOf(majlis.peperiksaan) >= 0) {
      return majlis.peperiksaan;
    }
    /* Jika tidak, yang terakhir mengikut `order` — peperiksaan akhir
       tahun ialah yang biasanya menentukan anugerah. */
    return calon[calon.length - 1];
  } catch (e) {
    return (majlis && majlis.peperiksaan) || '';
  }
}

/* Nama subjek bagi satu sub, untuk mengumpul paparan.
   🔴 `subjek` ialah string ATAU array ("Pendidikan Islam dan Moral"
      menyimpan dua). Array digabung supaya kedua-dua subjek itu kekal
      satu kumpulan dan tidak pecah kepada dua tajuk. */
function agSubjekSub(sub) {
  if (!sub) return '';
  const x = sub.subjek;
  if (!x) return '';
  return (Array.isArray(x) ? x.join(' / ') : String(x)).toUpperCase();
}

/* Darjah bagi satu sub-anugerah, daripada skopnya. Memulangkan 0 bila
   skop itu bukan satu darjah tunggal (sekolah / tahap). */
function agDarjahSub(sub) {
  if (!sub) return 0;
  if (sub.skopDarjah) return agWordDarjah(sub.skopDarjah);
  if (sub.skopJenis === 'darjah') return agWordDarjah(sub.skopNilai);
  return 0;
}

/* ---------- papar ---------- */
function agEsc(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g,
    c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

/* 🔴 Cetakan papar DARJAH + KELAS, bukan kelas sahaja — "5 CELERON" dan
      "6 CELERON" dua kelas berbeza. */
function agDarjahKelas(tahun, kelas) {
  const d = agWordDarjah(tahun);
  const k = String(kelas || '').trim();
  if (!k) return d ? String(d) : '';
  if (!d) return k;
  return new RegExp('^' + d + '\\b').test(k) ? k : d + ' ' + k;
}

/* Had nama ditentukan oleh TIKET (4 sehelai A4 ≈ 93mm ≈ 24 aksara),
   bukan oleh slaid yang boleh terima ~59. Ukur ruang paling SEMPIT. */
function agPendekNama(nama, had) {
  const n = String(nama || '').trim();
  const h = had || 24;
  return n.length <= h ? n : n.slice(0, h - 1).trimEnd() + '…';
}

function agToast(mesej, jenis) {
  let bekas = document.getElementById('ag-toast');
  if (!bekas) {
    bekas = document.createElement('div');
    bekas.id = 'ag-toast';
    bekas.style.cssText =
      'position:fixed;left:50%;bottom:22px;transform:translateX(-50%);z-index:9999;' +
      'display:flex;flex-direction:column;gap:8px;align-items:center;pointer-events:none';
    document.body.appendChild(bekas);
  }
  const t = document.createElement('div');
  const warna = jenis === 'ralat' ? '#9B2C2C' : (jenis === 'ok' ? '#2F6B4F' : '#16233A');
  t.style.cssText =
    'background:' + warna + ';color:#F7F4ED;padding:10px 17px;border-radius:9px;' +
    'font:600 13.5px/1.4 "Public Sans",system-ui,sans-serif;box-shadow:0 6px 22px rgba(0,0,0,.25);' +
    'max-width:min(520px,90vw);text-align:center';
  t.textContent = mesej;
  bekas.appendChild(t);
  setTimeout(() => t.remove(), 3600);
}
