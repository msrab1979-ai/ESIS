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
 * @returns {Promise<{senarai:Array, jumMurid:number, tiadaMarkah:number,
 *                    tanpaMarkah:Array}>}
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
  /* Murid dalam skop yang TIADA markah untuk dikira. Dipulangkan supaya
     senarai pilihan boleh memaparkan SEMUA murid skop — yang tiada markah
     diletak di bawah, tidak diranking, tetapi masih boleh ditanda. */
  const tanpaMarkah = [];
  const muridTanpa = m => ({ no_kp: m.no_kp, nama: m.nama, tahun: m.tahun,
                             kelas: m.kelas, tiadaMarkah: true });
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
      if (sebelum && !rekod.length) { tiadaTeras++; tanpaMarkah.push(muridTanpa(m)); return; }
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
      if (!adaPep.length) { tiadaMarkah++; tanpaMarkah.push(muridTanpa(m)); return; }

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
    if (!sah.length) { tiadaMarkah++; tanpaMarkah.push(muridTanpa(m)); return; }

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
    tanpaMarkah: tanpaMarkah.sort((a, b) =>
      String(a.nama).localeCompare(String(b.nama), 'ms')),
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
  tayang: 'kodTayang',
  guruKelas: 'kodGuruKelas'
};

/* 🏫 Guru Kelas — senarai ditutup oleh admin? `g.tutup` (per kelas)
   menang; tiada medan → lalai majlis `guruKelasTutup` (ditetapkan oleh
   butang Buka/Tutup semua). Lalai DIBUKA. */
function agGuruKelasTutup(majlis, g) {
  if (g && typeof g.tutup === 'boolean') return g.tutup;
  return !!(majlis && majlis.guruKelasTutup);
}

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

/* 🔒 TUTUP borang (single atau bundle). Berbeza daripada BATAL: pautan
   masih hidup dan guru masih boleh MELIHAT senarainya, tetapi tidak boleh
   menambah, membuang atau menghantar. Satu `update` untuk semua kunci —
   satu dokumen majlis, jadi bundle sama ada berjaya semua atau tiada. */
async function agTutupBorang(majlisId, kunciList, tutup) {
  if (!kunciList.length) return;
  const masa = new Date().toLocaleString('ms-MY', {
    day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit'
  });
  const data = {};
  kunciList.forEach(k => {
    data['borangGuru.' + k + '.ditutup'] = !!tutup;
    data['borangGuru.' + k + '.masaTutup'] = tutup ? masa : '';
  });
  await agDb.collection('anugerah_majlis').doc(majlisId).update(data);
  return masa;
}

/* Status borang TERKINI dari Firestore — guru mungkin membuka halaman
   sebelum admin menutupnya. null = borang sudah dibatalkan. */
async function agStatusBorang(majlisId, kunci) {
  const d = await agDb.collection('anugerah_majlis').doc(majlisId).get();
  const peta = (d.exists && d.data().borangGuru) || {};
  return peta[kunci] || null;
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
    mc: o.mc === undefined ? null : o.mc,
    /* `ikut` hanya wujud dalam gaya GABUNG — lihat agRancangNombor. Entri
       gaya Asal/Bebas tidak membawanya langsung, supaya data mereka
       kekal sama tepat dengan sebelum gaya giliran wujud. */
    ...(o.ikut ? { ikut: o.ikut } : {})
  };
}

/* ==========================================================================
   GAYA GILIRAN — tiga pilihan admin (tab 🎟️ Giliran & Tiket)
   --------------------------------------------------------------------------
   A 'asal'   — anugerah ikut `urutan` → sub ikut array a.sub. LALAI.
   B 'bebas'  — satu senarai rata `MAJLIS.susunanPentas` (subId[]); sub dari
                anugerah berbeza boleh diselang-seli.
   C 'gabung' — murid naik SEKALI di tempat anugerah pertamanya dan terima
                semua anugerahnya serentak. Susunan ikut A atau B
                (`gabungAsas`). Anugerah dalam `gabungKecuali` naik sendiri.

   🔴 Tiada medan / nilai tidak dikenali = 'asal'. Majlis sedia ada mesti
      berkelakuan sama tepat seperti sebelum ciri ini wujud.

   🔴 Gaya GABUNG: semua entri giliran seorang murid yang digabung
      BERKONGSI nombor `no`. Entri utama (anugerah pertamanya dalam
      susunan) tiada `ikut`; entri lain membawa `ikut: <subId utama>`.
      Entri tetap satu per anugerah — meja hadiah masih mengira hadiah
      satu per satu.
   ========================================================================== */
const AG_GAYA = ['asal', 'bebas', 'gabung'];

function agGaya(majlis) {
  const g = majlis && majlis.gayaGiliran;
  return AG_GAYA.indexOf(g) >= 0 ? g : 'asal';
}

/* Adakah susunan rata (B) yang dipakai? */
function agPakaiBebas(majlis) {
  const g = agGaya(majlis);
  return g === 'bebas' || (g === 'gabung' && majlis.gabungAsas === 'bebas');
}

/* Susunan sub ikut gaya → [{a, s}].
   🔴 Sub yang belum ada dalam `susunanPentas` (ditambah selepas admin
      menyusun) DISAMBUNG DI HUJUNG, bukan hilang — sub yang hilang
      bermakna murid tidak pernah mendapat nombor. Id yang sudah tiada
      dilangkau. */
/* 🎤 Naik pentas. LALAI YA — anugerah/sub lama tiada medan ini dan mesti
   kekal dalam giliran seperti dahulu. `a.pentas === false` = seluruh
   anugerah tidak naik pentas; `s.pentas` (true/false) MENIMPA anugerah,
   tiada = ikut anugerah.
   Anugerah tidak naik pentas KEKAL dalam Jenis Anugerah & Semak Penerima,
   tetapi tiada giliran, tiket, MC, peserta, hadiah, tayang, sijil atau
   kad jemputan (keputusan pengguna 30 Okt 2026). */
function agNaikPentas(a, s) {
  if (s && typeof s.pentas === 'boolean') return s.pentas;
  return !(a && a.pentas === false);
}

/* Ada sekurang-kurangnya satu sub naik pentas (anugerah tanpa sub ikut
   tetapannya sendiri). */
function agAnugerahNaikPentas(a) {
  const sub = (a && a.sub) || [];
  return sub.length ? sub.some(s => agNaikPentas(a, s)) : agNaikPentas(a, null);
}

/* Set subId yang naik pentas — untuk menapis penerima / entri giliran. */
function agSubPentas(majlis) {
  const set = new Set();
  ((majlis && majlis.anugerah) || []).forEach(a =>
    (a.sub || []).forEach(s => { if (agNaikPentas(a, s)) set.add(s.id); }));
  return set;
}

/* 📋 PAPAR N TERATAS — berapa calon ranking dipapar dalam borang guru
   (✨ Cadang) DAN modal admin 👤 Pilih Murid. Satu nombor, dua skrin.
   Berasingan daripada `ambil` (berapa ditanda "Cadang").
   Tiada / 0 = SEMUA murid skop (kelakuan sedia ada, termasuk murid tiada
   markah di bawah). Bila ditetapkan: murid luar top N DAN murid tiada
   markah disorok. Seri pada nilai kedudukan ke-N ikut sekali. */
function agPaparTop(a, s) {
  /* Sub menimpa anugerah (master). Sub 0 = SEMUA walaupun master ada
     nombor; sub tiada medan = ikut master. */
  const adaSub = s && s.paparTop != null && s.paparTop !== '';
  const n = parseInt(adaSub ? s.paparTop : (a && a.paparTop), 10);
  return n > 0 ? n : 0;
}

function agTapisTop(senarai, n) {
  const l = senarai || [];
  if (!(n > 0) || l.length <= n) return l.slice();
  const batas = l[n - 1].nilai;
  return l.filter((h, i) => i < n || (batas != null && h.nilai === batas));
}

/* 🤫 Anugerah RAHSIA — tidak dicetak pada TIKET murid (kejutan, contoh
   Tokoh Murid). Kekal dalam giliran, MC, peserta, hadiah, slaid, sijil
   dan kad jemputan (kad tidak menyebut anugerah). Lalai TIDAK rahsia
   (tiada medan). `s.rahsia` (boolean) menimpa `a.rahsia`. */
function agRahsia(a, s) {
  if (s && typeof s.rahsia === 'boolean') return s.rahsia;
  return !!(a && a.rahsia === true);
}

function agSubRahsia(majlis) {
  const set = new Set();
  ((majlis && majlis.anugerah) || []).forEach(a =>
    (a.sub || []).forEach(s => { if (agRahsia(a, s)) set.add(s.id); }));
  return set;
}

/* 🙈 SOROK DARI PETUGAS — untuk latihan: anugerah yang tidak mahu
   dipapar lagi kepada petugas. Lalai PAPAR (tiada medan). `s.sorokPetugas`
   (boolean) menimpa `a.sorokPetugas`.
   Disorok dari: Peserta, MC, Hadiah, Tayang, Guru Kelas, Skrip MC PDF,
   Senarai Hadiah PDF/Word/Excel. KEKAL dalam panel admin.
   🔴 Nombor giliran TIDAK disentuh — ini tapisan paparan sahaja, jadi
      tiket yang sudah dicetak kekal sah dan tiada Jana Semula.
   Murid yang ada anugerah lain kekal, di bawah anugerah itu sahaja.
   Gaya C: bila sub utama disorok, entri utama turut ditapis keluar, jadi
   pengikutnya berdiri sendiri melalui agIkutSah (nombor sama). */
function agSorokPetugas(a, s) {
  if (s && typeof s.sorokPetugas === 'boolean') return s.sorokPetugas;
  return !!(a && a.sorokPetugas === true);
}

function agSubSorok(majlis) {
  const set = new Set();
  ((majlis && majlis.anugerah) || []).forEach(a =>
    (a.sub || []).forEach(s => { if (agSorokPetugas(a, s)) set.add(s.id); }));
  return set;
}

/* Salinan majlis tanpa sub/anugerah disorok — untuk panel petugas. */
function agMajlisPetugas(majlis) {
  if (!majlis) return majlis;
  /* Anugerah tanpa sub tidak boleh memegang penerima (penerima pada
     subId), jadi anugerah yang tinggal 0 sub dibuang terus. */
  const anugerah = (majlis.anugerah || [])
    .map(a => ({ ...a, sub: (a.sub || []).filter(s => !agSorokPetugas(a, s)) }))
    .filter(a => a.sub.length);
  /* `_penuh` = asal, supaya agMuatPetugas masih boleh menapis bila
     bacaan majlis segar gagal. */
  return { ...majlis, anugerah, _penuh: majlis._penuh || majlis };
}

/* Penerima tanpa entri anugerah[]/giliran[] yang disorok. Murid tanpa
   apa-apa anugerah tinggal → dibuang. */
function agTapisPenerimaPetugas(majlis, penerima) {
  const sorok = agSubSorok(majlis);
  if (!sorok.size) return penerima || [];
  const keluar = [];
  (penerima || []).forEach(p => {
    const anugerah = (p.anugerah || []).filter(x => !sorok.has(x.subId));
    if (!anugerah.length) return;
    keluar.push({ ...p, anugerah,
      giliran: (p.giliran || []).filter(g => !sorok.has(g.subId)) });
  });
  return keluar;
}

/* Muat untuk panel petugas: dokumen majlis SEGAR (supaya 🙈 admin sampai
   pada 🔄 / muat berkala tanpa muat semula halaman) + penerima ditapis.
   Bacaan majlis gagal → guna majlis lama, bukan berhenti. */
async function agMuatPetugas(majlis) {
  const [dm, penerima] = await Promise.all([
    agDb.collection('anugerah_majlis').doc(majlis.id).get().catch(() => null),
    agMuatPenerima(majlis.id)
  ]);
  const penuh = (dm && dm.exists) ? { id: dm.id, ...dm.data() } : (majlis._penuh || majlis);
  return { majlis: agMajlisPetugas(penuh), penuh,
           penerima: agTapisPenerimaPetugas(penuh, penerima) };
}

/* 🔴 Pemantau langsung MC/Hadiah (4 Nov 2026) — ganti muat berkala 90s.
   onSnapshot membaca senarai penuh SEKALI; selepas itu Firestore hanya
   menghantar (dan mengebil) doc yang berubah. Tanda ✕ pengurus peserta
   sampai dalam 1–2s, dan lebih jimat daripada membaca semua penerima
   setiap 90s. `panggil(r)` menerima bentuk sama dengan agMuatPetugas.
   Dilambatkan 400ms supaya batch (Jana Semula, reset) = satu panggilan.
   Gagal (kuota / indeks / rangkaian) → jatuh balik ke muat berkala 90s
   dengan `panggil(null)` — panel membaca sendiri. Pulang Promise yang
   selesai selepas panggilan pertama. */
function agPantauPetugas(majlis, panggil) {
  return new Promise(selesai => {
    let dm = null, pen = null, adaDm = false, adaPen = false;
    let tunda = null, pertama = true, jatuh = false;
    const henti = [];
    const hantar = async r => {
      try { await panggil(r); }
      finally { if (pertama) { pertama = false; selesai(); } }
    };
    const jadual = () => {
      if (!adaDm || !adaPen) return;
      clearTimeout(tunda);
      tunda = setTimeout(() => {
        const penuh = dm || majlis._penuh || majlis;
        hantar({ majlis: agMajlisPetugas(penuh), penuh,
                 penerima: agTapisPenerimaPetugas(penuh, pen) });
      }, pertama ? 0 : 400);
    };
    const gagal = err => {
      if (jatuh) return;
      jatuh = true;
      console.warn('Pemantau gagal — guna muat berkala 90s:', err);
      henti.forEach(f => f());
      clearTimeout(tunda);
      hantar(null);
      setInterval(() => hantar(null), 90000);
    };
    henti.push(agDb.collection('anugerah_majlis').doc(majlis.id).onSnapshot(d => {
      dm = d.exists ? { id: d.id, ...d.data() } : null;
      adaDm = true; jadual();
    }, gagal));
    henti.push(agDb.collection('anugerah_penerima').where('majlisId', '==', majlis.id)
      .onSnapshot(snap => {
        pen = snap.docs.map(d => ({ docId: d.id, ...d.data() }));
        adaPen = true; jadual();
      }, gagal));
  });
}

/* Murid yang memegang sekurang-kurangnya satu anugerah naik pentas. */
function agPenerimaPentas(p, subPentas) {
  return (p.anugerah || []).some(x => subPentas.has(x.subId));
}

function agSusunanSub(majlis) {
  const asal = [];
  ((majlis && majlis.anugerah) || []).slice()
    .sort((a, b) => (a.urutan || 0) - (b.urutan || 0))
    .forEach(a => (a.sub || []).forEach(s => {
      if (agNaikPentas(a, s)) asal.push({ a, s });
    }));
  if (!agPakaiBebas(majlis)) return asal;

  const ikutId = {};
  asal.forEach(x => { ikutId[x.s.id] = x; });
  const keluar = [];
  const sudah = new Set();
  (Array.isArray(majlis.susunanPentas) ? majlis.susunanPentas : []).forEach(id => {
    const x = ikutId[id];
    if (x && !sudah.has(id)) { keluar.push(x); sudah.add(id); }
  });
  asal.forEach(x => { if (!sudah.has(x.s.id)) keluar.push(x); });
  return keluar;
}

/* Sub yang belum diletak admin dalam susunan bebas — untuk amaran. */
function agSubBelumDisusun(majlis) {
  if (!agPakaiBebas(majlis)) return [];
  const ada = new Set(Array.isArray(majlis.susunanPentas) ? majlis.susunanPentas : []);
  return agSusunanSub(majlis).filter(x => !ada.has(x.s.id));
}

/* Turutan naik pentas → [{p, a, s}]: susunan sub, murid ikut nama —
   ATAU ikut kedudukan bagi anugerah `susunMurid:'kedudukan'` bila
   `kedudukan` ({subId: {no_kp: n}}, daripada agKiraKedudukanMajlis)
   diberi. Tanpanya kelakuan sama tepat seperti dahulu. */
function agBinaTurutan(majlis, penerima, kedudukan) {
  const turutan = [];
  agSusunanSub(majlis).forEach(({ a, s }) => {
    agSusunMuridDalamSub(a, s,
      penerima.filter(p => (p.anugerah || []).some(x => x.subId === s.id)),
      kedudukan
    ).forEach(p => turutan.push({ p, a, s }));
  });
  return agGabungDahulu(majlis, turutan);
}

/* 🎁 PALING BANYAK DAHULU (`a.gabungDahulu`, per anugerah, gaya C sahaja).
   Butang pada baris anugerah dalam Susunan Naik Pentas: Biasa / Paling
   banyak dahulu. Keputusan pengguna 31 Okt 2026:
   - Susunan sub KEKAL ikut Susunan Naik Pentas admin; darjah ikut sub
     pertama darjah itu dalam susunan tersebut (agDarjahSub).
   - Dalam setiap DARJAH, murid yang memegang ≥2 entri dalam anugerah
     DIGABUNG (bukan gabungKecuali, naik pentas) naik dahulu — paling banyak
     dahulu, seri ikut nama — kemudian sub biasa darjah itu.
   - Hanya murid yang anugerah gabung PERTAMAnya ialah anugerah ini; yang
     sudah naik di anugerah lebih awal kekal pengikut di tempatnya.
   🔴 Hanya MENYUSUN SEMULA entri anugerah itu dalam slot yang sama dalam
      turutan — tiada entri ditambah/dibuang, anugerah lain tidak bergerak,
      dan agRancangNombor memberi nombor/`ikut` seperti biasa.
   Tiada `gabungDahulu` = turutan dipulang sama tepat. */
function agBilGabung(majlis, turutan) {
  const kecuali = new Set(majlis.gabungKecuali || []);
  const bil = {}, pertama = {};
  turutan.forEach(({ p, a }) => {
    if (kecuali.has(a.id)) return;
    bil[p.docId] = (bil[p.docId] || 0) + 1;
    if (!pertama[p.docId]) pertama[p.docId] = a.id;
  });
  return { bil, pertama, kecuali };
}

function agGabungDahulu(majlis, turutan) {
  if (agGaya(majlis) !== 'gabung') return turutan;
  const sasaran = ((majlis && majlis.anugerah) || []).filter(a => a.gabungDahulu === true);
  if (!sasaran.length) return turutan;
  const { bil, pertama, kecuali } = agBilGabung(majlis, turutan);
  const keluar = turutan.slice();
  sasaran.forEach(a => {
    if (kecuali.has(a.id)) return;
    const slot = [];
    turutan.forEach((x, i) => { if (x.a.id === a.id) slot.push(i); });
    if (!slot.length) return;
    const entri = slot.map(i => turutan[i]);
    /* urutan darjah = sub pertama darjah itu dalam Susunan Naik Pentas,
       termasuk sub yang belum ada murid (BM T4 kosong tetap meletakkan
       Darjah 4 di depan). */
    const susunDj = [], ikutDj = {};
    agSusunanSub(majlis).forEach(({ a: x, s }) => {
      if (x.id !== a.id) return;
      const d = agDarjahSub(s);
      if (!ikutDj[d]) { ikutDj[d] = []; susunDj.push(d); }
    });
    entri.forEach(x => {
      const d = agDarjahSub(x.s);
      if (!ikutDj[d]) { ikutDj[d] = []; susunDj.push(d); }
      ikutDj[d].push(x);
    });
    const baru = [];
    susunDj.forEach(d => {
      const kump = ikutDj[d];
      const bintang = [];
      kump.forEach((x, k) => {
        const id = x.p.docId;
        if (bil[id] >= 2 && pertama[id] === a.id && !bintang.some(b => b.p.docId === id))
          bintang.push({ p: x.p, bil: bil[id], k });
      });
      /* paling banyak dahulu → kemudian ikut KATEGORI PERTAMA murid itu
         dalam Susunan Naik Pentas (BM → BI → MT…) → nama. Tanpa langkah
         kedua (ikut nama sahaja) bintang berselang BI, BM, BM, MT, BI, MT
         (5 Nov 2026, pengguna: "giliran berterabur"). `k` = kedudukan
         entri pertama murid itu dalam darjah ini = kategori pertamanya. */
      bintang.sort((x, y) => y.bil - x.bil || x.k - y.k ||
        String(x.p.nama).localeCompare(String(y.p.nama), 'ms'));
      const ambil = new Set();
      bintang.forEach(b => kump.forEach((x, k) => {
        if (!ambil.has(k) && x.p.docId === b.p.docId) { ambil.add(k); baru.push(x); }
      }));
      kump.forEach((x, k) => { if (!ambil.has(k)) baru.push(x); });
    });
    slot.forEach((i, k) => { keluar[i] = baru[k]; });
  });
  return keluar;
}

/* 🎁 Kumpulan PAPARAN bagi satu giliran utama (5 Nov 2026).
   Anugerah 🎁 Paling banyak dahulu menaikkan murid pelbagai kategori
   DAHULU dalam darjahnya, tetapi gilirannya berlabel kategori PERTAMA dia
   — jadi bila panel mengumpul ikut sub, blok BM/BI/MT muncul, hilang dan
   muncul semula (BM T5 = 157, 158, 162). Murid itu kini dikumpul di bawah
   tajuk sendiri "🎁 TAHUN 5 · 3 SUBJEK", satu blok per bilangan.
   🔴 PAPARAN sahaja: subId, nombor dan tulisan (hadir/mc) tidak berubah.
   → null (baris biasa, kumpul ikut sub) atau { id, nama }. */
function agKumpulGiliran(majlis, gil, g) {
  if (!g || agGaya(majlis) !== 'gabung') return null;
  const a = ((majlis && majlis.anugerah) || []).find(x => x.id === g.anugerahId);
  if (!a || a.gabungDahulu !== true) return null;
  if ((majlis.gabungKecuali || []).includes(a.id)) return null;
  const ikut = agPengikutGiliran(gil, g);
  if (!ikut.length) return null;
  const bil = ikut.length + 1;
  const dj = agDarjahSub((a.sub || []).find(s => s.id === g.subId));
  const samaAn = ikut.every(x => x.anugerahId === g.anugerahId);
  const jenis = !samaAn ? 'ANUGERAH' : a.asas === 'subjek' ? 'SUBJEK' : 'KATEGORI';
  return { id: 'gabung:' + a.id + ':' + dj + ':' + bil,
           nama: '\ud83c\udf81 ' + (dj ? 'TAHUN ' + dj + ' \u00b7 ' : '') + bil + ' ' + jenis };
}

/* Teks kategori bagi baris dalam blok 🎁: "TAHUN 5: BAHASA MELAYU + SAINS". */
function agTeksKumpulBaris(b) {
  return agTajukSubHadiah({ anugerah: b.anugerah, sub: b.sub, gabung: b.lain || b.gabung || [] });
}

/* 🔴 SATU-SATUNYA tempat yang memutuskan susunan murid dalam satu sub.
      Giliran (gaya A/B/C), senarai pokok dan modal Pilih Murid semuanya
      memanggil ini — dua peraturan bermakna dua susunan berbeza.
   Susun sendiri → s.susunanMurid; ikut kedudukan → rank; lain → nama. */
function agSusunMuridDalamSub(a, s, senarai, kedudukan) {
  if (agIkutManual(a)) return agSusunManual(senarai, s && s.susunanMurid);
  if (agIkutKelas(a)) return agSusunIkutKelas(senarai);
  return agSusunMuridSub(senarai,
    kedudukan && agIkutKedudukan(a) ? kedudukan[s.id] : null);
}

/* IKUT KELAS — permintaan pengguna 1 Nov 2026, HANYA tiga anugerah ini:
   KEHADIRAN PENUH & SAHSIAH TERPUJI (sub Darjah 1–6), KECEMERLANGAN UPKK. Murid naik ikut
   susunan kelas sekolah, kemudian nama. Tiada butang/medan — dipadan
   pada nama anugerah. Susun sendiri (`manual`) / ikut kedudukan menang. */
const AG_SUSUN_KELAS = ['CELERON', 'RYZEN', 'INTEL', 'PENTIUM', 'HIGEN', 'PIXEL', 'BYTECH'];

function agIkutKelas(a) {
  if (!a || (a.susunMurid && a.susunMurid !== 'nama')) return false;
  const n = String(a.nama || '').toUpperCase();
  return n.includes('KEHADIRAN PENUH') || n.includes('SAHSIAH TERPUJI') ||
    n.includes('KECEMERLANGAN UPKK');
}

function agSusunIkutKelas(senarai) {
  const r = p => {
    const k = String(p.kelas || '').toUpperCase();
    const i = AG_SUSUN_KELAS.findIndex(x => k.includes(x));
    return i < 0 ? Infinity : i;
  };
  return senarai.slice().sort((x, y) => {
    const rx = r(x), ry = r(y);
    if (rx !== ry) return rx < ry ? -1 : 1;
    return String(x.nama).localeCompare(String(y.nama), 'ms');
  });
}

/* Anugerah yang susunan muridnya disusun sendiri oleh admin. Terpakai
   kepada SEMUA sumber, termasuk manual (tiada ranking). */
function agIkutManual(a) {
  return !!a && a.susunMurid === 'manual';
}

/* Susun ikut `susunan` ([no_kp], disimpan pada sub). Murid yang TIADA
   dalam susunan (ditambah selepas admin menyusun, contohnya melalui
   borang guru) diletak DI BAWAH ikut nama — tidak pernah hilang.
   no_kp dalam susunan yang bukan lagi penerima diabaikan. */
function agSusunManual(senarai, susunan) {
  const idx = new Map();
  (Array.isArray(susunan) ? susunan : []).forEach((kp, i) => {
    if (!idx.has(kp)) idx.set(kp, i);
  });
  const r = p => idx.has(p.no_kp) ? idx.get(p.no_kp) : Infinity;
  return senarai.slice().sort((x, y) => {
    const rx = r(x), ry = r(y);
    if (rx !== ry) return rx < ry ? -1 : 1;
    return String(x.nama).localeCompare(String(y.nama), 'ms');
  });
}

/* Penerima sub yang belum diletak dalam susunan sendiri — untuk amaran. */
function agBelumDisusun(s, senarai) {
  const ada = new Set(Array.isArray(s && s.susunanMurid) ? s.susunanMurid : []);
  return senarai.filter(p => !ada.has(p.no_kp));
}

/* Susun murid dalam SATU sub. `rank` = {no_kp: kedudukan} atau kosong.
   🔴 Rank dikira atas SEMUA murid skop, tetapi hanya yang DIPILIH naik
      pentas — jadi rank 2, 5, 9 menjadi giliran pertama, kedua, ketiga
      dalam sub itu. Seri / tiada rank (tambah manual, tiada markah) →
      ikut nama; yang tiada rank sentiasa di bawah. */
function agSusunMuridSub(senarai, rank) {
  const r = p => {
    const n = rank ? rank[p.no_kp] : null;
    return typeof n === 'number' ? n : Infinity;
  };
  return senarai.slice().sort((x, y) => {
    const rx = r(x), ry = r(y);
    if (rx !== ry) return rx < ry ? -1 : 1;
    return String(x.nama).localeCompare(String(y.nama), 'ms');
  });
}

/* Anugerah yang giliran muridnya ikut kedudukan. Manual tiada ranking. */
function agIkutKedudukan(a) {
  return !!a && a.susunMurid === 'kedudukan' && a.sumber !== 'manual';
}

/* Kira kedudukan TERKINI bagi setiap sub yang berpenerima dalam anugerah
   `susunMurid:'kedudukan'`. Dipanggil sebelum menomborkan giliran.
   Pulang { peta: {subId: {no_kp: n}}, gagal: [nama sub] }.

   🔴 Dikira semula dari markah setiap kali, BUKAN dibaca dari entri
      penerima: murid yang ditambah guru melalui borang tidak membawa
      rank langsung, dan markah boleh dibetulkan selepas calon dipilih.
   🔴 Markah ditarik SEKALI bagi setiap peperiksaan (paksa), kemudian
      setiap sub membaca cache — 38 kelas ialah 2 bacaan, bukan 38.
   🔴 Peperiksaan dipilih sama seperti modal Pilih Murid:
      sub > anugerah > ikut darjah > majlis. */
async function agKiraKedudukanMajlis(majlis, penerima) {
  const peta = {}, gagal = [];
  const ada = new Set();
  (penerima || []).forEach(p => (p.anugerah || []).forEach(x => ada.add(x.subId)));

  const kerja = [];
  for (const a of ((majlis && majlis.anugerah) || [])) {
    if (!agIkutKedudukan(a)) continue;
    for (const s of (a.sub || [])) {
      if (!ada.has(s.id)) continue;
      const pep = s.peperiksaan || a.peperiksaan ||
        await agPepUntukDarjah(majlis, agDarjahSub(s)) || majlis.peperiksaan;
      kerja.push({ a, s, pep });
    }
  }
  if (!kerja.length) return { peta, gagal };

  const pepUnik = new Set();
  kerja.forEach(k => (Array.isArray(k.pep) ? k.pep : [k.pep])
    .forEach(x => { if (x) pepUnik.add(x); }));
  for (const nama of pepUnik) await agMuatMarkah(majlis.calYear, nama, true);

  for (const { a, s, pep } of kerja) {
    if (!pep) { gagal.push(s.nama || a.nama); continue; }
    try {
      const h = await agKiraCalon({
        calYear: majlis.calYear, peperiksaan: pep,
        asas: s.asas || a.asas || 'gps',
        subjek: s.subjek || a.subjek,
        skopJenis: s.skopJenis, skopNilai: s.skopNilai, skopDarjah: s.skopDarjah,
        ambil: s.ambil || 1
      });
      const m = {};
      h.senarai.forEach(x => { m[x.no_kp] = x.kedudukan; });
      peta[s.id] = m;
    } catch (e) {
      gagal.push(s.nama || a.nama);
    }
  }
  return { peta, gagal };
}

/* Kedudukan diandaikan daripada nombor giliran SEDIA ADA — untuk semakan
   "nombor tidak padan" yang tidak patut membaca markah. Susunan murid
   yang sudah dinomborkan dalam sub ikut-kedudukan dianggap betul. */
function agKedudukanDariNombor(majlis, penerima) {
  const peta = {};
  ((majlis && majlis.anugerah) || []).forEach(a => {
    if (!agIkutKedudukan(a)) return;
    (a.sub || []).forEach(s => {
      const m = {};
      (penerima || []).forEach(p => {
        const g = (p.giliran || []).find(x => x.subId === s.id);
        if (g && typeof g.no === 'number') m[p.no_kp] = g.no;
      });
      peta[s.id] = m;
    });
  });
  return peta;
}

/* 🔴 Entri ini ikut entri utama yang MASIH WUJUD dengan nombor sama?
      Selepas admin membuang sub utama, `ikut` menunjuk kepada entri yang
      sudah tiada — entri itu mesti kembali berdiri sendiri, jika tidak
      anugerahnya hilang dari MC dan tayangan. */
function agIkutSah(gil, g) {
  if (!g || !g.ikut) return false;
  return (gil || []).some(x => x !== g && x.subId === g.ikut && !x.ikut && x.no === g.no);
}

/* Entri utama bagi g (dirinya sendiri jika ia bukan pengikut). */
function agUtamaGiliran(gil, g) {
  if (!agIkutSah(gil, g)) return g;
  return gil.find(x => x.subId === g.ikut && !x.ikut && x.no === g.no) || g;
}

/* Entri yang ikut entri utama u (tidak termasuk u). */
function agPengikutGiliran(gil, u) {
  return (gil || []).filter(g => g !== u && g.ikut === u.subId && agIkutSah(gil, g));
}

/* Berapa kali murid naik pentas = entri yang bukan pengikut. */
/* 🧹 Admin baru RESET tanda? Benar bila senarai lama ada tanda MC/hadir
   dan senarai segar langsung tiada (bagi medan itu). Panel petugas
   memakai ini untuk TERUS melukis semula — tanpanya ✓ "sudah diambil"
   kekal di skrin petugas selepas admin reset (MC tidak pun menyalakan
   butang merah kerana cap jarinya tidak membawa `mc`). */
function agAdaResetTanda(lama, baru) {
  const ada = (arr, f) => (arr || []).some(f);
  const mc = b => b.mc === true, hd = b => b.hadir === true || b.hadir === false;
  return (ada(lama, mc) && !ada(baru, mc)) || (ada(lama, hd) && !ada(baru, hd));
}

/* 🎁 1/3 — giliran ke berapa bagi murid ini (Peserta/MC/Hadiah). */
function agPilKe(ke, jum) {
  return '<span class="pil emas" title="Ke-' + ke + ' daripada ' + jum +
    ' untuk murid ini">\ud83c\udf81 ' + ke + '/' + jum + (ke === jum ? ' (akhir)' : '') + '</span>';
}

/* Teks cetakan: "🎁 1/3 · seterusnya: No. 45, No. 78" ('' bila sekali sahaja).
   Perlu b.ke / b.jum / b.lepas — lihat agTandaKe. */
function agTeksKe(b) {
  if (!(b.jum > 1)) return '';
  return '\ud83c\udf81 ' + b.ke + '/' + b.jum + (b.ke === b.jum ? ' (akhir)' : '') +
    (b.lepas.length ? ' \u00b7 seterusnya: ' + b.lepas.map(n => 'No. ' + n).join(', ') : '');
}
/* Nama PENUH satu giliran: "ANUGERAH TERBAIK DALAM KELAS — 5 CELERON (DLP)".
   "#93 5 CELERON (DLP)" sahaja tidak memberitahu anugerah mana (pengguna, 4 Nov). */
function agNamaGiliran(g) {
  const an = String(g.anugerah || '').trim(), s = String(g.sub || '').trim();
  const A = an.toUpperCase(), S = s.toUpperCase(), nA = A.replace(/^ANUGERAH\s+/, '');
  if (!s || S === A || S === nA) return an || s;
  if (!an || S.startsWith(A)) return s;
  if (S.startsWith(nA + ' — ')) return an + s.slice(nA.length);
  return an + ' — ' + s;
}

/* SEMUA giliran murid (bukan pengikut gabung), ikut nombor — termasuk yang
   sudah selesai. [{no, nama, ikut[], mc, hadir}] */
function agSemuaGiliran(gil) {
  gil = (gil || []).filter(g => g.no != null);
  return gil.filter(g => !agIkutSah(gil, g)).sort((a, b) => a.no - b.no).map(g => ({
    no: g.no, nama: agNamaGiliran(g), ikut: agPengikutGiliran(gil, g).map(x =>   // anugerah sama → nama sub sahaja
      x.anugerah === g.anugerah && x.sub ? x.sub : agNamaGiliran(x)),
    mc: g.mc === true, hadir: g.hadir
  }));
}

/* Teks cetakan, satu entri per giliran. TANPA status — kertas ditanda
   dengan pen (pengguna, 4 Nov). */
function agTeksSemuaGiliran(semua, noIni) {
  return (semua || []).map(x => '#' + x.no + ' ' + x.nama +
    (x.ikut.length ? ' (+ ' + x.ikut.join(' · ') + ')' : '') + (x.no === noIni ? ' ◀ ini' : ''));
}

/* Isi b.ke/b.jum/b.lepas bagi baris yang SUDAH disusun ikut nombor.
   `kunci` = pengenal murid (docId). */
function agTandaKe(baris, kunci) {
  const ikut = {};
  baris.forEach(b => (ikut[kunci(b)] = ikut[kunci(b)] || []).push(b.no));
  baris.forEach(b => {
    const nos = ikut[kunci(b)];
    b.ke = nos.indexOf(b.no) + 1; b.jum = nos.length; b.lepas = nos.slice(b.ke);
  });
}

function agBilNaik(gil) {
  return (gil || []).filter(g => !agIkutSah(gil, g)).length;
}

/* Rancang nombor giliran (fungsi tulen — tiada tulisan).
   semua=true  → Jana Semula dari 1.
   semua=false → kekalkan nombor sedia ada, beri nombor kepada yang belum.
   Pulang { petaBaru: {docId: giliran[]}, tambah }.

   🔴 Gaya GABUNG: murid mendapat SATU nombor pada anugerah pertamanya
      (yang tidak dikecualikan); anugerah lain berkongsi nombor itu.
      Mod tambah: anugerah baharu bagi murid yang sudah bernombor
      menyertai nombor sedia ada, bukan nombor baharu di hujung. */
function agRancangNombor(majlis, penerima, semua, kedudukan) {
  const gaya = agGaya(majlis);
  const gabung = gaya === 'gabung';
  const kecuali = new Set(gabung ? (majlis.gabungKecuali || []) : []);
  const turutan = agBinaTurutan(majlis, penerima, kedudukan);

  let maks = 0;
  penerima.forEach(p => (p.giliran || []).forEach(g => {
    if (typeof g.no === 'number' && g.no > maks) maks = g.no;
  }));

  const petaBaru = {};
  const utama = {};          // docId -> {no, subId}
  let n = semua ? 0 : maks;
  let tambah = 0;

  /* mod tambah: entri utama sedia ada menjadi sauh untuk anugerah baharu */
  if (gabung && !semua) {
    turutan.forEach(({ p, a, s }) => {
      if (kecuali.has(a.id) || utama[p.docId]) return;
      const lama = (p.giliran || []).find(g => g.subId === s.id);
      if (lama && lama.no != null && !agIkutSah(p.giliran, lama))
        utama[p.docId] = { no: lama.no, subId: s.id };
    });
  }

  turutan.forEach(({ p, a, s }) => {
    petaBaru[p.docId] = petaBaru[p.docId] || [];
    const lama = (p.giliran || []).find(g => g.subId === s.id);

    if (!semua && lama && lama.no != null) {
      petaBaru[p.docId].push(lama);
      return;
    }

    const bolehGabung = gabung && !kecuali.has(a.id);
    let no, ikut = null;
    if (bolehGabung && utama[p.docId]) {
      no = utama[p.docId].no;
      ikut = utama[p.docId].subId;
    } else {
      no = ++n;
      if (bolehGabung) utama[p.docId] = { no, subId: s.id };
    }
    tambah++;
    petaBaru[p.docId].push(agEntriGiliran({
      anugerahId: a.id, anugerah: a.nama,
      subId: s.id, sub: s.nama, hadiah: s.hadiah || '',
      no, ikut,
      hadir: lama ? lama.hadir : null,
      mc: lama ? lama.mc : null
    }));
  });

  const buang = agBuangGiliranLuar(penerima, petaBaru);
  return { petaBaru, tambah, buang };
}

/* 🎤 Entri giliran yang tiada lagi dalam turutan (anugerah ditanda TIDAK
   naik pentas, atau sub dibuang) dikeluarkan. Murid yang SEMUA anugerahnya
   tidak naik pentas tiada dalam turutan langsung — tanpa ini nombor lama
   mereka kekal dan terus muncul dalam MC, hadiah, tayang dan tiket.
   Mengisi petaBaru[docId] (mungkin []) dan memulangkan bilangan dibuang. */
function agBuangGiliranLuar(penerima, petaBaru) {
  let buang = 0;
  penerima.forEach(p => {
    const lama = (p.giliran || []).length;
    const baru = (petaBaru[p.docId] || []).length;
    if (lama > baru) {
      buang += lama - baru;
      petaBaru[p.docId] = petaBaru[p.docId] || [];
    }
  });
  return buang;
}

/* 🔴 Nombor giliran yang DISIMPAN masih sepadan dengan Susunan Naik Pentas
      semasa? MC, hadiah, tayang, tiket dan sijil semuanya ikut nombor
      disimpan — admin yang menyeret susunan tanpa Jana Semula meninggalkan
      mereka pada susunan lama tanpa sesiapa sedar.
   Bandingan = apa yang Jana Semula AKAN tulis. Sub ikut-kedudukan memakai
   susunan nombor sedia ada (tidak membaca markah), jadi tiada amaran palsu.
   → { lapuk: entri bernombor yang akan berubah/dibuang,
       belum: anugerah naik pentas yang belum bernombor } */
function agSemakNombor(majlis, penerima) {
  const hasil = { lapuk: 0, belum: 0 };
  if (!majlis || !(penerima || []).length) return hasil;
  const ked = agKedudukanDariNombor(majlis, penerima);
  const rancang = agRancangNombor(majlis, penerima, true, ked).petaBaru;
  penerima.forEach(p => {
    const baru = rancang[p.docId] || [];
    const gil = p.giliran || [];
    gil.forEach(g => {
      if (g.no == null) return;
      const b = baru.find(x => x.subId === g.subId);
      if (!b || b.no !== g.no || (b.ikut || null) !== (g.ikut || null)) hasil.lapuk++;
    });
    baru.forEach(b => {
      const g = gil.find(x => x.subId === b.subId);
      if (!g || g.no == null) hasil.belum++;
    });
  });
  return hasil;
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

/* ---------- 🖨 Skrip MC (cetak) ----------
   🔴 Satu baris = satu NOMBOR GILIRAN DISIMPAN, sama seperti panel MC.
      Pengikut gaya GABUNG bukan baris sendiri (berkongsi nombor utama) —
      ia disenarai sebagai "turut menerima" pada baris utamanya.
   Kiraan dibuat di sini SAHAJA supaya kertas MC dan skrin tidak berbeza:
     bilGiliran  = nombor unik (berapa kali nama dipanggil ke pentas)
     bilMurid    = orang berbeza yang memegang sekurang-kurangnya satu nombor
     bilAnugerah = semua anugerah yang diserah di pentas (termasuk pengikut)
     bilUlang    = murid yang memegang LEBIH DARI 1 anugerah bernombor
     bilTiket    = murid yang dapat tiket — sama peraturan dgn lukisTiket:
                   ada ≥1 nombor pada sub naik pentas yang BUKAN 🤫 rahsia
     tanpaPentas = penerima yang TIADA nombor langsung (tidak naik pentas /
                   belum bernombor) — tidak dikira dalam bilMurid
     pendua / jurang = nombor yang dipegang >1 baris / nombor 1..maks yang tiada */
function agKiraSkripMC(penerima, majlis) {
  penerima = agTapisPenerimaPetugas(majlis, penerima);
  const baris = [];
  const rahsia = agSubRahsia(majlis);
  const pentas = new Set();
  ((majlis && majlis.anugerah) || []).forEach(a =>
    (a.sub || []).forEach(s => { if (agNaikPentas(a, s)) pentas.add(s.id); }));
  let bilTiket = 0;
  const muridAda = new Set();
  let bilAnugerah = 0, tanpaPentas = 0, bilUlang = 0;
  (penerima || []).forEach(p => {
    const gil = (p.giliran || []).filter(g => g.no != null);
    if (!gil.length) { tanpaPentas++; return; }
    muridAda.add(p.docId);
    bilAnugerah += gil.length;
    const utama = gil.filter(g => !agIkutSah(gil, g)).sort((a, b) => a.no - b.no);
    if (gil.length > 1) bilUlang++;
    if (gil.some(g => pentas.has(g.subId) && !rahsia.has(g.subId))) bilTiket++;
    utama.forEach((g, i) => baris.push({
      kumpul: agKumpulGiliran(majlis, gil, g),
      no: g.no, docId: p.docId, nama: p.nama || '', tahun: p.tahun, kelas: p.kelas, luar: agAdalahLuar(p),
      anugerahId: g.anugerahId || g.anugerah, anugerah: g.anugerah || '', sub: g.sub || '',
      subId: g.subId || '', hadiah: g.hadiah || '', hadir: g.hadir,
      kali: i + 1, daripada: utama.length,
      lain: agPengikutGiliran(gil, g).map(x => x.sub || x.anugerah),
      semua: agSemuaGiliran(gil)
    }));
  });
  baris.sort((a, b) => a.no - b.no || String(a.nama).localeCompare(String(b.nama)));
  agTandaKe(baris, b => b.docId);

  const kiraNo = {};
  baris.forEach(b => { kiraNo[b.no] = (kiraNo[b.no] || 0) + 1; });
  const nombor = Object.keys(kiraNo).map(Number);
  const maks = nombor.length ? Math.max(...nombor) : 0;
  const jurang = [];
  for (let n = 1; n <= maks; n++) if (!kiraNo[n]) jurang.push(n);
  const pendua = nombor.filter(n => kiraNo[n] > 1).sort((a, b) => a - b);

  return { baris, bilGiliran: nombor.length, bilBaris: baris.length, bilMurid: muridAda.size,
           bilAnugerah, bilUlang, bilTiket, tanpaPentas, maks, jurang, pendua };
}

/* 🔴 Angka asas SAMA di Peserta · MC · Hadiah · Slaid (5 Nov 2026,
   pengguna: "mesti sama"). Satu enjin — agKiraSkripMC: murid = orang
   berbeza dgn ≥1 nombor, giliran = satu baris naik pentas (pengikut gaya
   Gabung tidak dikira). Setiap panel menambah angka tugasnya SELEPAS ini. */
function agTeksAsasPetugas(k) {
  return k ? k.bilMurid + ' murid \u00b7 ' + k.bilBaris + ' giliran' : '';
}

/* Cetak melalui dialog cetak pelayar (Simpan sebagai PDF dari situ) —
   sama seperti sijil & Semak Penerima; tiada pustaka PDF dimuat.
   `w` = tetingkap yang SUDAH dibuka oleh pemanggil secara serentak dengan
   klik (pop-up yang dibuka selepas `await` disekat pelayar). */
function agCetakSkripMC(w, majlis, penerima) {
  const r = agKiraSkripMC(penerima, majlis);
  const E = agEsc;
  const kelasOf = b => b.luar ? '' : agDarjahKelas(b.tahun, b.kelas);
  const subNama = b => {
    const nA = String(b.anugerah).toUpperCase().replace(/^ANUGERAH\s+/, '');
    let n = String(b.sub || b.anugerah);
    if (n.toUpperCase() === String(b.anugerah).toUpperCase()) return '';
    if (n.toUpperCase().startsWith(nA + ' — ')) n = n.slice(nA.length + 3);
    return n;
  };

  /* blok BERTURUT-TURUT ikut nombor (anugerah › sub) — itulah susunan
     sebenar MC membaca, dalam ketiga-tiga gaya giliran. */
  const dipapar = new Set();   // 🎭 acara
  let html = r.baris.length ? agAcaraCetakTr('awal', 5, dipapar) : '', anAkhir = null, subAkhir = null;
  const bilDalam = (i, kunci) => {
    let n = 0;
    for (let k = i; k < r.baris.length && kunci(r.baris[k]); k++) n++;
    return n;
  };
  r.baris.forEach((b, i) => {
    if (b.anugerahId !== anAkhir) {
      anAkhir = b.anugerahId; subAkhir = null;
      const n = bilDalam(i, x => x.anugerahId === b.anugerahId);
      const py = agPenyelarasHtml(b.anugerahId, '');
      html += '<tr class="an"><td colspan="5">' + E(b.anugerah) +
        '<span class="bil">' + n + ' giliran</span>' +
        (py ? '<div class="pny">👤 ' + py + '</div>' : '') + '</td></tr>';
    }
    /* 🎁 blok pelbagai kategori (agKumpulGiliran) = tajuk sendiri */
    const kunciSub = x => x.kumpul ? x.kumpul.id : x.sub;
    if (kunciSub(b) !== subAkhir) {
      subAkhir = kunciSub(b);
      const sn = b.kumpul ? b.kumpul.nama : subNama(b);
      const pyS = b.kumpul ? '' : agPenyelarasHtml(b.anugerahId, b.subId);
      if (sn || b.hadiah || pyS) {
        const n = bilDalam(i, x => x.anugerahId === b.anugerahId && kunciSub(x) === subAkhir);
        html += '<tr class="sub"><td colspan="5">' + E(sn || b.anugerah) +
          (b.hadiah ? ' <span class="hadiah">· ' + E(b.hadiah) + '</span>' : '') +
          '<span class="bil">' + n + '</span>' +
          (pyS ? '<div class="pny">👤 ' + pyS + '</div>' : '') + '</td></tr>';
      }
    }
    const nota = [];
    if (b.jum > 1) nota.push('<b>' + E(agTeksKe(b)) + '</b>',
      agTeksSemuaGiliran(b.semua, b.no).map(E).join('<br>'));
    if (b.kumpul) nota.push('<b>' + E(agTeksKumpulBaris(b)) + '</b>');
    else if (b.lain.length) nota.push('+ turut menerima: ' + b.lain.map(E).join(' · '));
    if (b.hadir === false) nota.push('<b>TIDAK HADIR</b>');
    html += '<tr class="m' + (b.hadir === false ? ' absen' : '') + '">' +
      '<td class="kotak">☐</td><td class="no">' + b.no + '</td>' +
      '<td class="nama">' + E(b.nama) + '</td><td class="kls">' + E(kelasOf(b)) + '</td>' +
      '<td class="nota">' + nota.join('<br>') + '</td></tr>';
    agAcaraLepasBaris(r.baris, i).forEach(l => { html += agAcaraCetakTr(l, 5, dipapar); });
  });
  if (r.baris.length) agAcaraBaki(dipapar).forEach(l => { html += agAcaraCetakTr(l, 5, null); });

  const amaran = [];
  if (r.pendua.length) amaran.push('Nombor berulang: ' + r.pendua.join(', '));
  if (r.jurang.length) amaran.push('Nombor tiada (jurang): ' + r.jurang.slice(0, 30).join(', ') +
    (r.jurang.length > 30 ? ' … (+' + (r.jurang.length - 30) + ')' : ''));
  const kpi = (n, l) => '<div class="k"><div class="n">' + n + '</div><div class="l">' + l + '</div></div>';
  const ringkasan =
    '<div class="kpi">' +
      kpi(r.bilTiket, 'Jumlah tiket<br>dikeluarkan') +
      kpi(r.bilMurid, 'Jumlah<br>semua murid') +
      kpi(r.bilUlang, 'Jumlah murid<br>lebih dari 1 anugerah') +
    '</div>' +
    (r.bilTiket !== r.bilMurid
      ? '<p class="ket">' + (r.bilMurid - r.bilTiket) + ' murid tiada tiket kerana anugerahnya rahsia.</p>' : '') +
    (amaran.length ? '<p class="amaran">⚠ ' + amaran.join(' · ') + '</p>' : '');

  const tarikh = new Date().toLocaleString('ms-MY', { dateStyle: 'medium', timeStyle: 'short' });
  w.document.open();
  w.document.write('<!doctype html><html lang="ms"><head><meta charset="utf-8">' +
    '<title>Skrip MC — ' + E(majlis.nama || 'Majlis') + '</title><style>' +
    '@page{size:A4 portrait;margin:12mm 11mm 14mm}' +
    'body{font:11.5px/1.4 system-ui,-apple-system,"Segoe UI",sans-serif;color:#111;margin:0;-webkit-print-color-adjust:exact;print-color-adjust:exact}' +
    '.kepala{text-align:center;border-bottom:2px solid #111;padding-bottom:7px;margin-bottom:9px}' +
    '.kepala .s{font-size:11px;letter-spacing:.04em;text-transform:uppercase;color:#333}' +
    '.kepala h1{font-size:17px;margin:2px 0}.kepala .t{font-size:12.5px;font-weight:700;letter-spacing:.06em}' +
    '.kepala .d{font-size:10px;color:#555;margin-top:2px}' +
    '.kpi{display:flex;gap:7px;margin:0 0 6px}.k{flex:1;border:1.5px solid #111;border-radius:5px;padding:5px 4px;text-align:center}' +
    '.k .n{font-size:21px;font-weight:800;line-height:1.1}.k .l{font-size:9.5px;text-transform:uppercase;color:#333}' +
    '.ket{margin:3px 0;font-size:10px;color:#444}.amaran{margin:4px 0;padding:4px 7px;border:1.5px solid #900;color:#900;font-weight:700;font-size:10.5px}' +
    'table{border-collapse:collapse;width:100%;margin-top:8px}' +
    'thead th{font-size:9.5px;text-transform:uppercase;text-align:left;border-bottom:1.5px solid #111;padding:4px 5px}' +
    'td{padding:4px 5px;border-bottom:1px solid #CCC;vertical-align:top}' +
    'tr{page-break-inside:avoid;break-inside:avoid}' +
    'tr.an td{background:#E4E4E4;font-weight:800;font-size:12px;border-top:1.5px solid #111;padding:5px}' +
    'tr.sub td{background:#F3F3F3;font-weight:700;font-size:11px;padding:3px 5px 3px 14px}' +
    '.bil{float:right;font-weight:600;font-size:10px;color:#444}.hadiah{font-weight:500;color:#444}' +
    '.pny{font-weight:500;font-size:10.5px;margin-top:2px;line-height:1.35}' +
    'td.kotak{width:16px;font-size:14px;line-height:1;text-align:center}' +
    'td.no{width:34px;font-weight:800;font-size:14px;text-align:right}' +
    'td.nama{font-weight:700;font-size:12.5px}td.kls{width:88px;white-space:nowrap}' +
    'tr.acara td{border:1.5px dashed #111;padding:6px 8px;font-size:12px;background:#fff}' +
    '.acara-teks{font-size:10.5px;margin-top:2px;line-height:1.35;font-weight:400}' +
    'td.nota{width:190px;font-size:10px;color:#333}tr.absen td{color:#888;text-decoration:line-through}tr.absen td.nota{text-decoration:none}' +
    '.akhir{margin-top:10px;border-top:2px solid #111;padding-top:5px;font-weight:700;text-align:right}' +
    '</style></head><body>' +
    '<div class="kepala">' + (majlis.sekolah ? '<div class="s">' + E(majlis.sekolah) + '</div>' : '') +
      '<h1>' + E(majlis.nama || 'Majlis Anugerah') + '</h1>' +
      '<div class="t">SKRIP MC — SENARAI GILIRAN NAIK PENTAS</div>' +
      '<div class="d">' + (majlis.tarikh ? E(majlis.tarikh) + ' · ' : '') + 'dicetak ' + E(tarikh) + '</div></div>' +
    ringkasan +
    (r.baris.length
      ? '<table><thead><tr><th></th><th style="text-align:right">No</th><th>Nama</th><th>Kelas</th><th>Catatan</th></tr></thead>' +
        '<tbody>' + html + '</tbody></table>' +
        '<div class="akhir">Jumlah tiket dikeluarkan: ' + r.bilTiket + ' · Jumlah semua murid: ' + r.bilMurid +
          ' · Murid lebih dari 1 anugerah: ' + r.bilUlang + '</div>'
      : '<p style="margin-top:20px;text-align:center">Belum ada giliran bernombor. Tekan 🔢 Beri Nombor dahulu.</p>') +
    '</body></html>');
  w.document.close();
  setTimeout(() => { w.focus(); w.print(); }, 400);
  return r;
}

/* ---------- 🖨 Senarai Hadiah (cetak) ----------
   Kertas semakan petugas hadiah: SEBELUM majlis (☐ Sedia) dan SEMASA
   majlis (☐ Serah).
   🔴 Satu baris = satu NOMBOR GILIRAN DISIMPAN = satu hadiah. Gaya GABUNG:
      pengikut berkongsi nombor utama dan murid menerima SATU hadiah untuk
      semua — ia bukan baris sendiri, tetapi namanya masuk ke tajuk gabung
      ("TAHUN 5: BAHASA MELAYU + SAINS"). Sama peraturan dgn hadiah.html.
   🔴 Tidak hadir KEKAL dicetak (dicoret) — nombor tidak melompat dan
      petugas tidak hilang tempat. */
function agKiraSenaraiHadiah(penerima) {
  const baris = [];
  (penerima || []).forEach(p => {
    const gil = (p.giliran || []).filter(g => g.no != null);
    gil.filter(g => !agIkutSah(gil, g)).forEach(g => {
      const ikut = agPengikutGiliran(gil, g);
      const hadiah = [...new Set([g, ...ikut].map(x => x.hadiah || '').filter(Boolean))];
      baris.push({
        no: g.no, docId: p.docId, nama: p.nama || '', tahun: p.tahun, kelas: p.kelas, luar: agAdalahLuar(p),
        anugerahId: g.anugerahId || g.anugerah, anugerah: g.anugerah || '', sub: g.sub || '',
        subId: g.subId || '', gabung: ikut.map(x => x.sub || x.anugerah), hadiah: hadiah.join(' · '),
        hadir: g.hadir, mc: g.mc, semua: agSemuaGiliran(gil)
      });
    });
  });
  baris.sort((a, b) => a.no - b.no || String(a.nama).localeCompare(String(b.nama)));
  agTandaKe(baris, b => b.docId);
  const kiraNo = {};
  baris.forEach(b => { kiraNo[b.no] = (kiraNo[b.no] || 0) + 1; });
  const nombor = Object.keys(kiraNo).map(Number);
  const maks = nombor.length ? Math.max(...nombor) : 0;
  const min = nombor.length ? Math.min(...nombor) : 0;
  const jurang = [];
  for (let n = 1; n <= maks; n++) if (!kiraNo[n]) jurang.push(n);
  return {
    baris, min, maks, jurang,
    pendua: nombor.filter(n => kiraNo[n] > 1).sort((a, b) => a - b),
    bilAbsen: baris.filter(b => b.hadir === false).length,
    bilAmbil: baris.filter(b => b.hadir !== false && b.mc === true).length,
    bilGabung: baris.filter(b => b.gabung.length).length
  };
}

/* Tajuk sub dalam blok anugerah. Gabung: akhiran " — X" yang dikongsi
   semua sub dikeluarkan ke depan → "TAHUN 5: BAHASA MELAYU + SAINS". */
function agTajukSubHadiah(b) {
  const nA = String(b.anugerah).toUpperCase().replace(/^ANUGERAH\s+/, '');
  const pendek = n => {
    n = String(n || '');
    if (n.toUpperCase() === String(b.anugerah).toUpperCase()) return '';
    return n.toUpperCase().startsWith(nA + ' — ') ? n.slice(nA.length + 3) : n;
  };
  if (!b.gabung.length) return pendek(b.sub || b.anugerah);
  const semua = [b.sub, ...b.gabung].map(n => String(n || ''));
  const akhir = semua.map(n => { const i = n.lastIndexOf(' — '); return i < 0 ? null : n.slice(i + 3); });
  if (akhir[0] && akhir.every(x => x === akhir[0])) {
    return akhir[0] + ': ' + semua.map(n => n.slice(0, n.lastIndexOf(' — '))).join(' + ');
  }
  return semua.map(pendek).map((n, i) => n || semua[i]).join(' + ');
}

/* `w` = tetingkap yang SUDAH dibuka oleh pemanggil sebelum await. */
function agCetakSenaraiHadiah(w, majlis, penerima) {
  const r = agKiraSenaraiHadiah(agTapisPenerimaPetugas(majlis, penerima));
  const E = agEsc;
  const dijana = new Date().toLocaleString('ms-MY', { dateStyle: 'medium', timeStyle: 'short' });

  /* blok anugerah BERTURUT-TURUT ikut nombor — sama dgn Skrip MC. */
  const blok = [];
  r.baris.forEach(b => {
    let B = blok[blok.length - 1];
    if (!B || B.anugerahId !== b.anugerahId) {
      B = { anugerahId: b.anugerahId, anugerah: b.anugerah, baris: [] };
      blok.push(B);
    }
    B.baris.push(b);
  });

  const lajur = 6;
  const dipapar = new Set();   // 🎭 acara
  const jadualAcara = trs => trs ? '<table class="pendek"><tbody>' + trs + '</tbody></table>' : '';
  const html = (r.baris.length ? jadualAcara(agAcaraCetakTr('awal', lajur, dipapar)) : '') + blok.map(B => {
    let selepas = '';
    const n = B.baris.length;
    let isi = '', kunciAkhir = null;
    B.baris.forEach((b, i) => {
      const tajuk = agTajukSubHadiah(b);
      const kunci = tajuk + '|' + b.hadiah;
      if (kunci !== kunciAkhir) {
        kunciAkhir = kunci;
        let bil = 0;
        for (let k = i; k < n && agTajukSubHadiah(B.baris[k]) + '|' + B.baris[k].hadiah === kunci; k++) bil++;
        const pyS = agPenyelarasHtml(b.anugerahId, b.subId);
        if (tajuk || b.hadiah || pyS) {
          isi += '<tr class="sub' + (b.gabung.length ? ' gab' : '') + '"><td colspan="' + lajur + '">' +
            (b.gabung.length ? '🎁 GABUNG · ' : '') + E(tajuk || b.anugerah) +
            (b.hadiah ? ' <span class="hadiah">· ' + E(b.hadiah) + '</span>' : '') +
            '<span class="bil">' + bil + ' hadiah</span>' +
            (pyS ? '<div class="pny">👤 ' + pyS + '</div>' : '') +
            (b.gabung.length ? '<div class="ket-gab">1 hadiah untuk semua anugerah di atas</div>' : '') +
            '</td></tr>';
        }
      }
      const absen = b.hadir === false;
      const st = absen ? '<b>TIDAK HADIR</b>' : b.mc === true ? 'Sudah diambil' : '';
      isi += '<tr class="m' + (absen ? ' absen' : '') + '">' +
        '<td class="kotak">☐</td><td class="kotak">☐</td>' +
        '<td class="no">' + b.no + '</td>' +
        '<td class="kls">' + E(b.luar ? '' : agDarjahKelas(b.tahun, b.kelas)) + '</td>' +
        '<td class="nama">' + E(b.nama) +
          (b.jum > 1 ? '<div class="ke">' + E(agTeksKe(b)) + '</div>' +
            '<div class="gil">' + agTeksSemuaGiliran(b.semua, b.no).map(E).join('<br>') + '</div>' : '') +
        '</td><td class="st">' + st + '</td></tr>';
      agAcaraLepasBaris(r.baris, r.baris.indexOf(b)).forEach(l => {
        const tr = agAcaraCetakTr(l, lajur, dipapar);
        if (l.startsWith('sub:')) isi += tr; else selepas += tr;
      });
    });
    const a = B.baris[0].no, z = B.baris[n - 1].no;
    return '<table class="' + (n <= 30 ? 'pendek' : '') + '"><thead>' +
      '<tr class="an"><th colspan="' + lajur + '">' + E(B.anugerah) +
        '<span class="bil">' + n + ' hadiah · giliran ' + (a === z ? a : a + '–' + z) + '</span>' +
        (agPenyelarasHtml(B.anugerahId, '') ? '<div class="pny">👤 ' + agPenyelarasHtml(B.anugerahId, '') + '</div>' : '') +
        '</th></tr>' +
      '<tr class="lj"><th>Sedia</th><th>Serah</th><th style="text-align:right">No</th>' +
        '<th>Darjah/Kelas</th><th>Nama</th><th>Status</th></tr>' +
      '</thead><tbody>' + isi + '</tbody></table>' + jadualAcara(selepas);
  }).join('') + jadualAcara(agAcaraBaki(dipapar).map(l => agAcaraCetakTr(l, lajur, null)).join(''));

  const amaran = [];
  if (r.pendua.length) amaran.push('Nombor berulang: ' + r.pendua.join(', '));
  if (r.jurang.length) amaran.push('Nombor tiada (jurang): ' + r.jurang.slice(0, 30).join(', ') +
    (r.jurang.length > 30 ? ' … (+' + (r.jurang.length - 30) + ')' : ''));
  const kpi = (n, l) => '<div class="k"><div class="n">' + n + '</div><div class="l">' + l + '</div></div>';
  const julat = r.baris.length ? 'giliran ' + r.min + '–' + r.maks : '';

  w.document.open();
  w.document.write('<!doctype html><html lang="ms"><head><meta charset="utf-8">' +
    '<title>Senarai Hadiah — ' + E(majlis.nama || 'Majlis') + '</title><style>' +
    '@page{size:A4 portrait;margin:12mm 11mm 14mm}' +
    'body{font:11.5px/1.4 system-ui,-apple-system,"Segoe UI",sans-serif;color:#111;margin:0;-webkit-print-color-adjust:exact;print-color-adjust:exact}' +
    '.kepala{text-align:center;border-bottom:2px solid #111;padding-bottom:7px;margin-bottom:9px}' +
    '.kepala .s{font-size:11px;letter-spacing:.04em;text-transform:uppercase;color:#333}' +
    '.kepala h1{font-size:17px;margin:2px 0}.kepala .t{font-size:12.5px;font-weight:700;letter-spacing:.06em}' +
    '.kepala .d{font-size:10px;color:#555;margin-top:2px}' +
    '.kpi{display:flex;gap:7px;margin:0 0 6px}.k{flex:1;border:1.5px solid #111;border-radius:5px;padding:5px 4px;text-align:center}' +
    '.k .n{font-size:21px;font-weight:800;line-height:1.1}.k .l{font-size:9.5px;text-transform:uppercase;color:#333}' +
    '.ket{margin:3px 0;font-size:10px;color:#444}.amaran{margin:4px 0;padding:4px 7px;border:1.5px solid #900;color:#900;font-weight:700;font-size:10.5px}' +
    'table{border-collapse:collapse;width:100%;margin-top:10px}' +
    'table.pendek{break-inside:avoid;page-break-inside:avoid}' +
    'thead{display:table-header-group}' +
    'tr.an th{background:#E4E4E4;font-weight:800;font-size:12px;border-top:1.5px solid #111;padding:5px;text-align:left}' +
    'tr.lj th{font-size:9px;text-transform:uppercase;text-align:left;border-bottom:1.5px solid #111;padding:3px 5px;font-weight:700}' +
    'td{padding:4px 5px;border-bottom:1px solid #CCC;vertical-align:top}' +
    'tr{page-break-inside:avoid;break-inside:avoid}' +
    'tr.sub td{background:#F3F3F3;font-weight:700;font-size:11px;padding:3px 5px 3px 10px;break-after:avoid;page-break-after:avoid}' +
    'tr.sub.gab td{background:#FFF3D6;border-left:3px solid #111}' +
    '.ket-gab{font-weight:500;font-size:9.5px;color:#444}' +
    '.bil{float:right;font-weight:600;font-size:10px;color:#444}.hadiah{font-weight:500;color:#444}' +
    '.pny{font-weight:500;font-size:10.5px;margin-top:2px;line-height:1.35}' +
    'td.kotak{width:30px;font-size:15px;line-height:1;text-align:center}' +
    'td.no{width:34px;font-weight:800;font-size:14px;text-align:right}' +
    'td.kls{width:100px;white-space:nowrap}td.nama{font-weight:700;font-size:12px}' +
    'td.nama .ke{font-weight:600;font-size:10px;color:#333;text-decoration:none}' +
    'td.nama .gil{font-weight:400;font-size:9.5px;color:#333;line-height:1.35;text-decoration:none}' +
    'td.st{width:88px;font-size:10px}' +
    'tr.absen td{color:#888;text-decoration:line-through}tr.absen td.st{text-decoration:none;color:#900}' +
    '.akhir{margin-top:10px;border-top:2px solid #111;padding-top:5px;font-weight:700;text-align:right}' +
    'tr.acara td{border:1.5px dashed #111;padding:6px 8px;font-size:12px;background:#fff}' +
    '.acara-teks{font-size:10.5px;margin-top:2px;line-height:1.35;font-weight:400}' +
    '</style></head><body>' +
    '<div class="kepala">' + (majlis.sekolah ? '<div class="s">' + E(majlis.sekolah) + '</div>' : '') +
      '<h1>' + E(majlis.nama || 'Majlis Anugerah') + '</h1>' +
      '<div class="t">SENARAI HADIAH — SEMAKAN PETUGAS</div>' +
      '<div class="d">' + (majlis.tarikh ? E(majlis.tarikh) + ' · ' : '') +
        r.baris.length + ' hadiah' + (julat ? ' · ' + julat : '') + ' · Dijana ' + E(dijana) + '</div></div>' +
    '<div class="kpi">' +
      kpi(r.baris.length, 'Jumlah<br>hadiah') + kpi(r.bilAbsen, 'Tidak<br>hadir') +
      kpi(r.bilAmbil, 'Sudah<br>diambil') + kpi(r.baris.length - r.bilAbsen, 'Perlu<br>disediakan') +
    '</div>' +
    '<p class="ket">Satu baris = satu nombor giliran = satu hadiah. Kertas ini ikut nombor giliran yang ' +
      'disimpan pada masa dijana — selepas admin tekan 🔁 Jana Semula, cetak semula.' +
      (r.bilGabung ? ' 🎁 GABUNG: murid menerima <b>1 hadiah</b> untuk semua anugerah dalam tajuk itu (' + r.bilGabung + ' murid).' : '') +
    '</p>' +
    (amaran.length ? '<p class="amaran">⚠ ' + amaran.join(' · ') + '</p>' : '') +
    (r.baris.length
      ? html + '<div class="akhir">Jumlah hadiah: ' + r.baris.length + ' · ' + julat +
          ' · Tidak hadir: ' + r.bilAbsen + ' · Perlu disediakan: ' + (r.baris.length - r.bilAbsen) + '</div>'
      : '<p style="margin-top:20px;text-align:center">Belum ada giliran bernombor. Admin perlu tekan 🔢 Beri Nombor dahulu.</p>') +
    '</body></html>');
  w.document.close();
  setTimeout(() => { w.focus(); w.print(); }, 400);
  return r;
}

/* ---------- 📄 Senarai Hadiah (Word .docx) ----------
   Isi SAMA dengan PDF (agKiraSenaraiHadiah + agTajukSubHadiah) — hanya
   format berbeza, supaya petugas boleh ubah/tambah lajur sendiri.
   .docx dijana terus sebagai OOXML (JSZip), seperti anugerah-pptx.js.
   🔴 Teks MESTI dilepaskan untuk XML — satu `&` mentah merosakkan fail. */
async function agMuatTurunSenaraiHadiahWord(majlis, penerima) {
  if (typeof JSZip === 'undefined') {
    await new Promise((ya, tidak) => {
      const s = document.createElement('script');
      s.src = 'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js';
      s.onload = ya; s.onerror = () => tidak(new Error('Gagal memuat JSZip'));
      document.head.appendChild(s);
    });
  }
  const r = agKiraSenaraiHadiah(agTapisPenerimaPetugas(majlis, penerima));
  const X = s => agEsc(String(s == null ? '' : s).replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, ''));
  const dijana = new Date().toLocaleString('ms-MY', { dateStyle: 'medium', timeStyle: 'short' });

  /* run & perenggan */
  const run = (t, o = {}) => '<w:r><w:rPr>' +
    (o.b ? '<w:b/>' : '') + (o.strike ? '<w:strike/>' : '') +
    '<w:color w:val="' + (o.warna || '000000') + '"/>' +
    '<w:sz w:val="' + (o.sz || 20) + '"/></w:rPr>' +
    '<w:t xml:space="preserve">' + X(t) + '</w:t></w:r>';
  const para = (runs, o = {}) => '<w:p><w:pPr><w:spacing w:before="0" w:after="' + (o.after || 0) + '"/>' +
    (o.jc ? '<w:jc w:val="' + o.jc + '"/>' : '') + (o.keep ? '<w:keepNext/>' : '') + '</w:pPr>' + runs + '</w:p>';

  /* jadual: lebar twips, A4 margin 11mm ≈ 10660 ruang */
  const LEBAR = [700, 700, 700, 1700, 5060, 1800];
  const sel = (isi, o = {}) => '<w:tc><w:tcPr><w:tcW w:w="' + (o.w || 0) + '" w:type="dxa"/>' +
    (o.span ? '<w:gridSpan w:val="' + o.span + '"/>' : '') +
    (o.isi ? '<w:shd w:val="clear" w:color="auto" w:fill="' + o.isi + '"/>' : '') +
    '<w:vAlign w:val="center"/></w:tcPr>' + isi + '</w:tc>';
  const baris = (sels, o = {}) => '<w:tr><w:trPr><w:cantSplit/>' + (o.kepala ? '<w:tblHeader/>' : '') +
    '</w:trPr>' + sels + '</w:tr>';
  const sempadan = '<w:tblBorders>' + ['top', 'left', 'bottom', 'right', 'insideH', 'insideV']
    .map(k => '<w:' + k + ' w:val="single" w:sz="4" w:space="0" w:color="999999"/>').join('') + '</w:tblBorders>';

  /* blok anugerah BERTURUT-TURUT ikut nombor — sama dgn PDF */
  const blok = [];
  r.baris.forEach(b => {
    let B = blok[blok.length - 1];
    if (!B || B.anugerahId !== b.anugerahId) { B = { anugerah: b.anugerah, anugerahId: b.anugerahId, baris: [] }; blok.push(B); }
    B.baris.push(b);
  });

  let badan = '';
  badan += majlis.sekolah ? para(run(String(majlis.sekolah).toUpperCase(), { sz: 20 }), { jc: 'center' }) : '';
  badan += para(run(majlis.nama || 'Majlis Anugerah', { b: true, sz: 32 }), { jc: 'center' });
  badan += para(run('SENARAI HADIAH — SEMAKAN PETUGAS', { b: true, sz: 24 }), { jc: 'center' });
  const julat = r.baris.length ? 'giliran ' + r.min + '–' + r.maks : '';
  badan += para(run((majlis.tarikh ? majlis.tarikh + ' · ' : '') + r.baris.length + ' hadiah' +
    (julat ? ' · ' + julat : '') + ' · Dijana ' + dijana, { sz: 18, warna: '555555' }), { jc: 'center', after: 120 });
  badan += para(run('Jumlah hadiah: ' + r.baris.length + '   ·   Tidak hadir: ' + r.bilAbsen +
    '   ·   Sudah diambil: ' + r.bilAmbil + '   ·   Perlu disediakan: ' + (r.baris.length - r.bilAbsen), { b: true, sz: 20 }),
    { jc: 'center', after: 80 });
  badan += para(run('Satu baris = satu nombor giliran = satu hadiah. Senarai ini ikut nombor giliran yang disimpan ' +
    'pada masa dijana — selepas admin tekan 🔁 Jana Semula, muat turun semula.' +
    (r.bilGabung ? ' 🎁 GABUNG: murid menerima 1 hadiah untuk semua anugerah dalam tajuk itu (' + r.bilGabung + ' murid).' : ''),
    { sz: 17, warna: '444444' }), { after: 80 });
  const amaran = [];
  if (r.pendua.length) amaran.push('Nombor berulang: ' + r.pendua.join(', '));
  if (r.jurang.length) amaran.push('Nombor tiada (jurang): ' + r.jurang.slice(0, 30).join(', ') +
    (r.jurang.length > 30 ? ' … (+' + (r.jurang.length - 30) + ')' : ''));
  if (amaran.length) badan += para(run('⚠ ' + amaran.join(' · '), { b: true, sz: 19, warna: '990000' }), { after: 80 });

  if (!r.baris.length) {
    badan += para(run('Belum ada giliran bernombor. Admin perlu tekan 🔢 Beri Nombor dahulu.', { sz: 22 }), { jc: 'center' });
  }

  /* 🎭 acara — perenggan berbingkai di antara jadual; baris dalam jadual
     bila di antara kategori. */
  const dipapar = new Set();
  const acaraTeks = n => [run('🎭 ' + (n.tajuk || 'Acara'), { b: true, sz: 21 })]
    .concat(String(n.teks || '').split('\n').map(x => x.trim()).filter(Boolean).map(x => run(x, { sz: 18 })));
  const acaraPara = l => { dipapar.add(l); return agAcaraDi(l).map(n => {
    const [t, ...isi] = acaraTeks(n);
    return '<w:p><w:pPr><w:pBdr>' + ['top', 'left', 'bottom', 'right'].map(k =>
      '<w:' + k + ' w:val="dashed" w:sz="8" w:space="4" w:color="000000"/>').join('') +
      '</w:pBdr><w:spacing w:before="60" w:after="120"/></w:pPr>' + t +
      isi.map(x => '<w:r><w:br/></w:r>' + x).join('') + '</w:p>';
  }).join(''); };
  const acaraBaris = l => { dipapar.add(l); return agAcaraDi(l).map(n => {
    const [t, ...isi] = acaraTeks(n);
    return baris(sel(para(t) + isi.map(x => para(x)).join(''), { w: 10660, span: 6, isi: 'FFFFFF' }));
  }).join(''); };
  if (r.baris.length) badan += acaraPara('awal');

  blok.forEach(B => {
    const n = B.baris.length, a = B.baris[0].no, z = B.baris[n - 1].no;
    let selepas = '';
    let t = '<w:tbl><w:tblPr><w:tblW w:w="10660" w:type="dxa"/><w:tblLayout w:type="fixed"/>' + sempadan +
      '<w:tblCellMar><w:left w:w="70" w:type="dxa"/><w:right w:w="70" w:type="dxa"/></w:tblCellMar></w:tblPr>' +
      '<w:tblGrid>' + LEBAR.map(w => '<w:gridCol w:w="' + w + '"/>').join('') + '</w:tblGrid>';
    const py = agPenyelarasTeks(B.anugerahId, '');
    t += baris(sel(para(run(B.anugerah, { b: true, sz: 22 }) +
      (py ? run('   👤 ' + py, { b: true, sz: 18 }) : '') +
      run('   (' + n + ' hadiah · giliran ' + (a === z ? a : a + '–' + z) + ')', { sz: 18, warna: '444444' }), { keep: true }),
      { w: 10660, span: 6, isi: 'D9D9D9' }), { kepala: true });
    const lj = ['Sedia', 'Serah', 'No', 'Darjah/Kelas', 'Nama', 'Status'];
    t += baris(lj.map((l, i) => sel(para(run(l.toUpperCase(), { b: true, sz: 16 }), { jc: i === 2 ? 'right' : 'left', keep: true }),
      { w: LEBAR[i], isi: 'F2F2F2' })).join(''), { kepala: true });

    let kunciAkhir = null;
    B.baris.forEach((b, i) => {
      const tajuk = agTajukSubHadiah(b);
      const kunci = tajuk + '|' + b.hadiah;
      if (kunci !== kunciAkhir) {
        kunciAkhir = kunci;
        let bil = 0;
        for (let k = i; k < n && agTajukSubHadiah(B.baris[k]) + '|' + B.baris[k].hadiah === kunci; k++) bil++;
        const pyS = agPenyelarasTeks(b.anugerahId, b.subId);
        if (tajuk || b.hadiah || pyS) {
          let isi = run((b.gabung.length ? '🎁 GABUNG · ' : '') + (tajuk || b.anugerah), { b: true, sz: 19 }) +
            (b.hadiah ? run(' · ' + b.hadiah, { sz: 18, warna: '444444' }) : '') +
            run('   (' + bil + ' hadiah)', { sz: 17, warna: '444444' });
          let p = para(isi, { keep: true });
          if (pyS) p += para(run('👤 ' + pyS, { sz: 17 }), { keep: true });
          if (b.gabung.length) p += para(run('1 hadiah untuk semua anugerah di atas', { sz: 16, warna: '444444' }), { keep: true });
          t += baris(sel(p, { w: 10660, span: 6, isi: b.gabung.length ? 'FFF3D6' : 'F7F7F7' }));
        }
      }
      const absen = b.hadir === false;
      const o = absen ? { strike: true, warna: '888888' } : {};
      const st = absen ? run('TIDAK HADIR', { b: true, sz: 17, warna: '990000' })
        : b.mc === true ? run('Sudah diambil', { sz: 17 }) : '';
      t += baris(
        sel(para(run('☐', { sz: 24 }), { jc: 'center' }), { w: LEBAR[0] }) +
        sel(para(run('☐', { sz: 24 }), { jc: 'center' }), { w: LEBAR[1] }) +
        sel(para(run(b.no, Object.assign({ b: true, sz: 24 }, o)), { jc: 'right' }), { w: LEBAR[2] }) +
        sel(para(run(b.luar ? '' : agDarjahKelas(b.tahun, b.kelas), Object.assign({ sz: 18 }, o))), { w: LEBAR[3] }) +
        sel(para(run(b.nama, Object.assign({ b: true, sz: 21 }, o))) +
          (b.jum > 1 ? para(run(agTeksKe(b), { sz: 16, warna: '333333' })) +
            agTeksSemuaGiliran(b.semua, b.no).map(t => para(run(t, { sz: 15, warna: '333333' }))).join('') : ''),
          { w: LEBAR[4] }) +
        sel(para(st), { w: LEBAR[5] }));
      agAcaraLepasBaris(r.baris, r.baris.indexOf(b)).forEach(l => {
        if (l.startsWith('sub:')) t += acaraBaris(l); else selepas += acaraPara(l);
      });
    });
    t += '</w:tbl>';
    badan += t + para('', { after: 120 }) + selepas;
  });
  if (r.baris.length) agAcaraBaki(dipapar).forEach(l => { badan += acaraPara(l); });

  if (r.baris.length) {
    badan += para(run('Jumlah hadiah: ' + r.baris.length + ' · ' + julat + ' · Tidak hadir: ' + r.bilAbsen +
      ' · Perlu disediakan: ' + (r.baris.length - r.bilAbsen), { b: true, sz: 20 }), { jc: 'right' });
  }

  const dokumen = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>' + badan +
    '<w:sectPr><w:pgSz w:w="11906" w:h="16838"/>' +
    '<w:pgMar w:top="680" w:right="624" w:bottom="794" w:left="624" w:header="400" w:footer="400" w:gutter="0"/>' +
    '</w:sectPr></w:body></w:document>';
  const gaya = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">' +
    '<w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial" w:cs="Arial" w:eastAsia="Arial"/>' +
    '<w:sz w:val="20"/><w:lang w:val="ms-MY"/></w:rPr></w:rPrDefault>' +
    '<w:pPrDefault><w:pPr><w:spacing w:after="0" w:line="240" w:lineRule="auto"/></w:pPr></w:pPrDefault></w:docDefaults>' +
    '</w:styles>';

  const zip = new JSZip();
  zip.file('[Content_Types].xml', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
    '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
    '<Default Extension="xml" ContentType="application/xml"/>' +
    '<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>' +
    '<Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>' +
    '</Types>');
  zip.file('_rels/.rels', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
    '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>' +
    '</Relationships>');
  zip.file('word/_rels/document.xml.rels', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
    '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>' +
    '</Relationships>');
  zip.file('word/document.xml', dokumen);
  zip.file('word/styles.xml', gaya);

  const blob = await zip.generateAsync({
    type: 'blob', mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  });
  const nama = 'Senarai Hadiah - ' + String(majlis.nama || 'Majlis').replace(/[\\/:*?"<>|]+/g, ' ').trim() + '.docx';
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = nama;
  document.body.appendChild(a); a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  return r;
}

/* ---------- 📊 Senarai Hadiah (Excel .xlsx) ----------
   Enjin SAMA (agKiraSenaraiHadiah + agTajukSubHadiah) — satu baris RATA
   satu hadiah, supaya petugas boleh tapis/susun sendiri dalam Excel.
   .xlsx dijana terus sebagai OOXML (JSZip), rentetan inline (tiada
   sharedStrings). 🔴 Teks MESTI dilepaskan untuk XML. */
async function agMuatTurunSenaraiHadiahExcel(majlis, penerima) {
  if (typeof JSZip === 'undefined') {
    await new Promise((ya, tidak) => {
      const s = document.createElement('script');
      s.src = 'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js';
      s.onload = ya; s.onerror = () => tidak(new Error('Gagal memuat JSZip'));
      document.head.appendChild(s);
    });
  }
  const r = agKiraSenaraiHadiah(agTapisPenerimaPetugas(majlis, penerima));
  const X = s => agEsc(String(s == null ? '' : s).replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, ''));
  const dijana = new Date().toLocaleString('ms-MY', { dateStyle: 'medium', timeStyle: 'short' });
  const huruf = i => String.fromCharCode(65 + i);

  /* s: 0 biasa · 1 tebal · 2 kepala lajur · 3 tajuk · 4 tidak hadir (coret) · 5 merah tebal */
  const sel = (ref, v, s = 0) => (v === '' || v == null) ? (s ? '<c r="' + ref + '" s="' + s + '"/>' : '')
    : typeof v === 'number'
      ? '<c r="' + ref + '" s="' + s + '"><v>' + v + '</v></c>'
      : '<c r="' + ref + '" s="' + s + '" t="inlineStr"><is><t xml:space="preserve">' + X(v) + '</t></is></c>';
  const LAJUR = ['No', 'Darjah/Kelas', 'Nama', 'Hadiah ke- / Seterusnya', 'Anugerah', 'Penyelaras', 'Sub / Gabung', 'Hadiah', 'Status', 'Sedia', 'Serah'];
  const LEBAR = [7, 16, 42, 30, 36, 28, 40, 22, 15, 8, 8];

  const rows = [];
  let n = 0;
  const tambah = (sels, ht) => { n++; rows.push('<row r="' + n + '"' + (ht ? ' ht="' + ht + '" customHeight="1"' : '') + '>' +
    sels.map((x, i) => sel(huruf(i) + n, x[0], x[1])).join('') + '</row>'); };

  tambah([[majlis.nama || 'Majlis Anugerah', 3]], 22);
  tambah([['SENARAI HADIAH — SEMAKAN PETUGAS', 1]]);
  tambah([[(majlis.sekolah ? majlis.sekolah + ' · ' : '') + (majlis.tarikh ? majlis.tarikh + ' · ' : '') +
    'Dijana ' + dijana]]);
  tambah([['Jumlah hadiah: ' + r.baris.length + ' · Tidak hadir: ' + r.bilAbsen + ' · Sudah diambil: ' + r.bilAmbil +
    ' · Perlu disediakan: ' + (r.baris.length - r.bilAbsen), 1]]);
  const amaran = [];
  if (r.pendua.length) amaran.push('Nombor berulang: ' + r.pendua.join(', '));
  if (r.jurang.length) amaran.push('Nombor tiada (jurang): ' + r.jurang.slice(0, 30).join(', ') +
    (r.jurang.length > 30 ? ' … (+' + (r.jurang.length - 30) + ')' : ''));
  tambah([[amaran.length ? '⚠ ' + amaran.join(' · ') : '', amaran.length ? 5 : 0]]);
  const kepala = n + 1;
  tambah(LAJUR.map(l => [l, 2]));

  r.baris.forEach(b => {
    const absen = b.hadir === false;
    const s = absen ? 4 : 0;
    const tajuk = agTajukSubHadiah(b);
    tambah([
      [b.no, absen ? 4 : 1],
      [b.luar ? '' : agDarjahKelas(b.tahun, b.kelas), s],
      [b.nama, absen ? 4 : 1],
      [b.jum > 1 ? [agTeksKe(b)].concat(agTeksSemuaGiliran(b.semua, b.no)).join(' | ') : '', s],
      [b.anugerah, s],
      [[agPenyelarasTeks(b.anugerahId, ''), agPenyelarasTeks(b.anugerahId, b.subId)].filter(Boolean).join(' · '), s],
      [(b.gabung.length ? '🎁 GABUNG · ' : '') + (tajuk || ''), s],
      [b.hadiah, s],
      [absen ? 'TIDAK HADIR' : b.mc === true ? 'Sudah diambil' : '', absen ? 5 : 0],
      ['☐', 0], ['☐', 0]
    ]);
  });
  if (!r.baris.length) tambah([['Belum ada giliran bernombor. Admin perlu tekan 🔢 Beri Nombor dahulu.']]);

  const akhir = huruf(LAJUR.length - 1);
  const helaian = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">' +
    '<sheetViews><sheetView workbookViewId="0"><pane ySplit="' + kepala + '" topLeftCell="A' + (kepala + 1) +
      '" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>' +
    '<cols>' + LEBAR.map((w, i) => '<col min="' + (i + 1) + '" max="' + (i + 1) + '" width="' + w + '" customWidth="1"/>').join('') + '</cols>' +
    '<sheetData>' + rows.join('') + '</sheetData>' +
    (r.baris.length ? '<autoFilter ref="A' + kepala + ':' + akhir + (kepala + r.baris.length) + '"/>' : '') +
    '<pageMargins left="0.4" right="0.4" top="0.5" bottom="0.5" header="0.3" footer="0.3"/>' +
    '<pageSetup paperSize="9" orientation="landscape" fitToHeight="0"/>' +
    '</worksheet>';
  const gaya = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">' +
    '<fonts count="5">' +
      '<font><sz val="11"/><name val="Arial"/></font>' +
      '<font><b/><sz val="11"/><name val="Arial"/></font>' +
      '<font><b/><sz val="14"/><name val="Arial"/></font>' +
      '<font><strike/><sz val="11"/><color rgb="FF888888"/><name val="Arial"/></font>' +
      '<font><b/><sz val="11"/><color rgb="FF990000"/><name val="Arial"/></font>' +
    '</fonts>' +
    '<fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill>' +
      '<fill><patternFill patternType="solid"><fgColor rgb="FFD9D9D9"/><bgColor indexed="64"/></patternFill></fill></fills>' +
    '<borders count="2"><border><left/><right/><top/><bottom/><diagonal/></border>' +
      '<border><left/><right/><top/><bottom style="thin"><color rgb="FF000000"/></bottom><diagonal/></border></borders>' +
    '<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>' +
    '<cellXfs count="6">' +
      '<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>' +
      '<xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/>' +
      '<xf numFmtId="0" fontId="1" fillId="2" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1"/>' +
      '<xf numFmtId="0" fontId="2" fillId="0" borderId="0" xfId="0" applyFont="1"/>' +
      '<xf numFmtId="0" fontId="3" fillId="0" borderId="0" xfId="0" applyFont="1"/>' +
      '<xf numFmtId="0" fontId="4" fillId="0" borderId="0" xfId="0" applyFont="1"/>' +
    '</cellXfs>' +
    '<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>' +
    '</styleSheet>';

  const zip = new JSZip();
  zip.file('[Content_Types].xml', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
    '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
    '<Default Extension="xml" ContentType="application/xml"/>' +
    '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>' +
    '<Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>' +
    '<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>' +
    '</Types>');
  zip.file('_rels/.rels', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
    '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>' +
    '</Relationships>');
  zip.file('xl/workbook.xml', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" ' +
    'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">' +
    '<sheets><sheet name="Senarai Hadiah" sheetId="1" r:id="rId1"/></sheets>' +
    (r.baris.length ? '<definedNames><definedName name="_xlnm._FilterDatabase" localSheetId="0" hidden="1">' +
      '\'Senarai Hadiah\'!$A$' + kepala + ':$' + akhir + '$' + (kepala + r.baris.length) + '</definedName></definedNames>' : '') +
    '</workbook>');
  zip.file('xl/_rels/workbook.xml.rels', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
    '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>' +
    '<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>' +
    '</Relationships>');
  zip.file('xl/worksheets/sheet1.xml', helaian);
  zip.file('xl/styles.xml', gaya);

  const blob = await zip.generateAsync({
    type: 'blob', mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  });
  const nama = 'Senarai Hadiah - ' + String(majlis.nama || 'Majlis').replace(/[\\/:*?"<>|]+/g, ' ').trim() + '.xlsx';
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = nama;
  document.body.appendChild(a); a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  return r;
}

/* ---------- papar ---------- */
/* ---------- 📝 NOTA PETUGAS (2 Nov 2026) ----------
   Dikongsi Peserta · MC · Hadiah · admin (tab Link Petugas). Semua boleh
   TULIS dan PADAM. Koleksi `anugerah_nota` = {majlisId, anugerahId, teks,
   nama, panel, masa}. 🔴 BUKAN dalam dokumen majlis — simpanMajlis()
   admin menulis MAJLIS dari memori dan akan memadam nota petugas.
   DUA tempat, SATU pendengar:
   - Papan umum (`agPasangNota`) = banyak nota, anugerahId kosong.
   - Tajuk anugerah (`agNotaTajuk`) = SATU nota per anugerah, dipapar
     TERUS sebaris nama anugerah dalam accordion ("ANUGERAH X  📝 nota").
     Doc id tetap `${majlisId}__${anugerahId}` — ubah = tulis ganti,
     kosongkan = padam. Aras ANUGERAH sahaja (pengguna).
   onSnapshot pada majlisId sahaja (tiada orderBy → tiada indeks komposit);
   kemas kini DI TEMPAT, tidak melukis semula panel — jadual di bawah
   tangan petugas tidak boleh bertukar. Draf papan umum (`_agNotaDraf`)
   kekal bila panel melukis semula.
   Reset (padam semua) BERASINGAN daripada reset tanda — dalam admin. */
const AG_NOTA_KOL = 'anugerah_nota';
const AG_NOTA_PANEL = { peserta: 'Peserta', mc: 'MC', hadiah: 'Hadiah', admin: 'Admin' };
const AG_NOTA_HAD = 500;
const AG_NOTA_KUNCI_NAMA = 'ag_nota_nama';
const _agNotaS = { majlisId: null, panel: '', henti: null, nota: [], sedia: false };
const _agNotaDraf = {};          // '' (papan umum) → teks belum dihantar

function agNotaMasa(ms) {
  const d = new Date(ms || 0);
  const jam = d.toLocaleTimeString('ms-MY', { hour: '2-digit', minute: '2-digit' });
  return d.toDateString() === new Date().toDateString() ? jam
    : d.toLocaleDateString('ms-MY', { day: 'numeric', month: 'short' }) + ' ' + jam;
}

function agNotaNama() {
  try { return localStorage.getItem(AG_NOTA_KUNCI_NAMA) || ''; } catch (e) { return ''; }
}

function agNotaUntuk(anId) {
  return _agNotaS.nota.filter(n => !n.jenis && (n.anugerahId || '') === (anId || ''));
}

function agNotaSenaraiHtml(anId) {
  const l = agNotaUntuk(anId);
  if (!l.length) return '<div class="nota-kosong">Belum ada nota.</div>';
  return l.map(n =>
    '<div class="nota-item">' +
      '<div class="nota-teks">' + agEsc(n.teks) + '</div>' +
      '<div class="nota-meta">' + agEsc(n.nama || '—') + ' · ' +
        agEsc(AG_NOTA_PANEL[n.panel] || n.panel || '') + ' · ' + agEsc(agNotaMasa(n.masa)) +
        '<button class="btn sunyi kecil" data-nota-padam="' + agEsc(n.id) + '" title="Padam nota ini">🗑</button>' +
      '</div>' +
    '</div>').join('');
}

function agNotaBorangHtml(anId, teksPh) {
  const k = agEsc(anId || '');
  return '<div class="nota-borang">' +
      '<input type="text" data-nota-nama maxlength="40" value="' + agEsc(agNotaNama()) + '" ' +
        'placeholder="Nama anda (cth Cikgu Aina)">' +
      '<textarea data-nota-teks="' + k + '" rows="2" maxlength="' + AG_NOTA_HAD + '" ' +
        'placeholder="' + agEsc(teksPh) + '">' + agEsc(_agNotaDraf[anId || ''] || '') + '</textarea>' +
      '<button class="btn kecil" data-nota-hantar="' + k + '">Hantar</button>' +
    '</div>';
}

function agNotaAnugerah(anId) {
  return _agNotaS.nota.find(n => !n.jenis && n.anugerahId === anId) || null;
}

/* ---------- 👤 PENYELARAS (4 Nov 2026) ----------
   TEKS BEBAS, beberapa baris, pada bar ANUGERAH dan setiap bar KATEGORI
   (sub). Pengguna menulis perkataan sendiri ("Tahun 1–3 : Cikgu A") —
   tiada label/struktur dipaksa, tiada warisan anugerah → sub. Semua
   petugas boleh tulis/ubah/padam terus dari bar (pengguna).
   Menumpang enjin nota: koleksi `anugerah_nota`, `jenis:'penyelaras'`,
   `subId` ('' = aras anugerah). Doc id tetap
   `${majlisId}__${anugerahId}[__${subId}]__penyelaras`.
   Editor = kotak terapung sendiri (prompt() satu baris sahaja); ia di
   luar #senarai supaya muat berkala 90s tidak memusnahkan draf.
   Dicetak dalam Skrip MC + Senarai Hadiah (PDF/Word/Excel).
   🔴 TIDAK dipadam oleh 🗑 Padam semua nota — tetapan majlis. */
const AG_PNY = 'penyelaras';
const AG_PNY_HAD = 1000;

function _agPnyDoc(anId, subId) {
  return _agNotaS.nota.find(x => x.jenis === AG_PNY && x.anugerahId === anId &&
    (x.subId || '') === (subId || '')) || null;
}

function agPenyelaras(anId, subId) {
  const n = _agPnyDoc(anId, subId);
  return n ? String(n.teks || '') : '';
}

/* baris tidak kosong, seperti ditulis */
function agPenyelarasBaris(anId, subId) {
  return agPenyelaras(anId, subId).split('\n').map(x => x.trim()).filter(Boolean);
}

/* Cetakan HTML: baris demi baris, label sebelum ':' tebal. */
function agPenyelarasHtml(anId, subId) {
  return agPenyelarasBaris(anId, subId).map(_agPnyBarisHtml).join('<br>');
}

/* Teks satu baris (Word/Excel). */
function agPenyelarasTeks(anId, subId) {
  return agPenyelarasBaris(anId, subId).join(' · ');
}

function _agPnyBarisHtml(l) {
  const i = l.indexOf(':');
  return i > 0 ? '<b>' + agEsc(l.slice(0, i).trim()) + '</b> : ' + agEsc(l.slice(i + 1).trim())
    : agEsc(l);
}

function _agPnyDalam(anId, subId) {
  const l = agPenyelarasBaris(anId, subId);
  if (!l.length) return '＋ penyelaras';
  return '<span class="pny-ikon">👤</span><span class="pny-isi">' +
    l.map(x => '<span class="pny-baris">' + _agPnyBarisHtml(x) + '</span>').join('') + '</span>';
}

function _agPnyTitle(anId, subId) {
  const n = _agPnyDoc(anId, subId);
  return n ? (n.nama ? n.nama + ' · ' : '') + (AG_NOTA_PANEL[n.panel] || n.panel || '') + ' · ' +
    agNotaMasa(n.masa) + ' — tekan untuk ubah / padam' : 'Tekan untuk tulis penyelaras';
}

/* Butang penyelaras — `subId` kosong = aras anugerah. */
function agPenyelarasTajuk(anId, subId, nama) {
  if (!_agNotaS.majlisId || !anId) return '';
  const ada = agPenyelarasBaris(anId, subId).length;
  return '<span class="nota-tajuk pny' + (ada ? ' ada' : '') + '" role="button" tabindex="0" ' +
    'data-pny-an="' + agEsc(anId) + '" data-pny-sub="' + agEsc(subId || '') + '" ' +
    'data-pny-nama="' + agEsc(nama || '') + '" title="' + agEsc(_agPnyTitle(anId, subId)) + '">' +
    _agPnyDalam(anId, subId) + '</span>';
}

function _agPnyTutup() {
  const k = document.getElementById('ag-pny-kotak');
  if (k) k.remove();
}

function agPenyelarasUbah(anId, subId, nama) {
  _agPnyTutup();
  const k = document.createElement('div');
  k.id = 'ag-pny-kotak';
  k.innerHTML =
    '<div class="pny-kad" role="dialog" aria-label="Penyelaras">' +
      '<div class="pny-tajuk">👤 Penyelaras — ' + agEsc(nama || 'anugerah ini') + '</div>' +
      '<textarea rows="5" maxlength="' + AG_PNY_HAD + '" placeholder="Tulis bebas, satu baris satu perkara. Contoh:\n' +
        'Tahun 1–3 : Juliana bt Mohamed\nTahun 4–6 : Roliza bt Md Kesah, Ali bin Abu">' +
        agEsc(agPenyelaras(anId, subId)) + '</textarea>' +
      '<div class="pny-butang">' +
        (agPenyelaras(anId, subId) ? '<button class="btn sunyi kecil" data-pny-aksi="padam">🗑 Padam</button>' : '') +
        '<span style="flex:1"></span>' +
        '<button class="btn sunyi kecil" data-pny-aksi="batal">Batal</button>' +
        '<button class="btn kecil" data-pny-aksi="simpan">Simpan</button>' +
      '</div>' +
      '<div class="pny-ket">Dipapar kepada SEMUA petugas · Ctrl/⌘+Enter = Simpan</div>' +
    '</div>';
  document.body.appendChild(k);
  const ta = k.querySelector('textarea');
  ta.focus(); ta.setSelectionRange(ta.value.length, ta.value.length);

  const ref = agDb.collection(AG_NOTA_KOL)
    .doc(_agNotaS.majlisId + '__' + anId + (subId ? '__' + subId : '') + '__' + AG_PNY);
  const simpan = async teks => {
    const bersih = String(teks || '').split('\n').map(x => x.replace(/\s+$/, '')).join('\n').trim();
    k.querySelectorAll('button').forEach(b => { b.disabled = true; });
    try {
      if (!bersih) { if (_agPnyDoc(anId, subId)) await ref.delete(); }
      else await ref.set({
        majlisId: _agNotaS.majlisId, anugerahId: anId, subId: subId || '', jenis: AG_PNY,
        teks: bersih.slice(0, AG_PNY_HAD), nama: agNotaNama().slice(0, 40),
        panel: _agNotaS.panel || '', masa: Date.now()
      });
      _agPnyTutup();
    } catch (e) {
      k.querySelectorAll('button').forEach(b => { b.disabled = false; });
      agToast('Penyelaras TIDAK disimpan: ' + e.message, 'ralat');
    }
  };
  k.addEventListener('click', e => {
    if (e.target === k) return _agPnyTutup();          // klik luar kad
    const b = e.target.closest('[data-pny-aksi]');
    if (!b) return;
    const aksi = b.dataset.pnyAksi;
    if (aksi === 'batal') _agPnyTutup();
    else if (aksi === 'simpan') simpan(ta.value);
    else if (aksi === 'padam' && confirm('Padam penyelaras ini untuk SEMUA petugas?')) simpan('');
  });
  k.addEventListener('keydown', e => {
    if (e.key === 'Escape') _agPnyTutup();
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); simpan(ta.value); }
  });
}

function _agNotaTajukDalam(anId) {
  const n = agNotaAnugerah(anId);
  return n ? '📝 ' + agEsc(n.teks) : '＋ nota';
}

/* ---------- 🎭 ACARA (4 Nov 2026) ----------
   Acara bukan-anugerah (persembahan, ucapan, doa…) diselit DI MANA-MANA
   dalam senarai petugas: di awal, selepas sesuatu anugerah, atau selepas
   sesuatu kategori. Semua petugas boleh tambah/ubah/pindah/padam
   (pengguna). Dipapar di Peserta · MC · Hadiah + dicetak dalam Skrip MC
   dan Senarai Hadiah PDF/Word. Tiada ✓ Selesai, tiada tayangan (pengguna).
   Menumpang enjin nota: `anugerah_nota`, `jenis:'acara'`,
   {tajuk, teks, letak, urutan}. `letak` = 'awal' | 'an:<anId>' |
   'sub:<anId>|<subId>'. 🔴 Nombor giliran, tiket & susunan anugerah TIDAK
   disentuh — acara hanya diselit dalam paparan.
   Acara yang tempatnya tidak dilukis (kategori tiada murid / anugerah
   dibuang) dipapar di HUJUNG bila tiada tapisan — tidak pernah hilang. */
const AG_ACARA = 'acara';
let _agAcaraTT = null;           // tandatangan untuk lukis semula
let _agAcaraDipapar = new Set(); // letak yang dilukis dalam lukisan semasa

function agAcaraSemua() {
  return _agNotaS.nota.filter(n => n.jenis === AG_ACARA)
    .sort((a, b) => (a.urutan || 0) - (b.urutan || 0));
}

function agAcaraDi(letak) {
  return agAcaraSemua().filter(n => n.letak === letak);
}

function _agAcaraTeksHtml(teks) {
  return String(teks || '').split('\n').map(x => x.trim()).filter(Boolean)
    .map(_agPnyBarisHtml).join('<br>');
}

function _agAcaraBar(n, sekumpul) {
  const i = sekumpul.indexOf(n);
  const gerak = sekumpul.length > 1
    ? (i > 0 ? '<button class="btn sunyi kecil" data-acara-gerak="' + agEsc(n.id) + '" data-arah="-1" title="Naik">↑</button>' : '') +
      (i < sekumpul.length - 1 ? '<button class="btn sunyi kecil" data-acara-gerak="' + agEsc(n.id) + '" data-arah="1" title="Turun">↓</button>' : '')
    : '';
  return '<div class="acara-bar">' +
      '<span class="acara-ikon">🎭</span>' +
      '<div class="acara-isi"><div class="acara-tajuk">' + agEsc(n.tajuk || 'Acara') + '</div>' +
        (n.teks ? '<div class="acara-teks">' + _agAcaraTeksHtml(n.teks) + '</div>' : '') + '</div>' +
      '<span class="acara-aksi">' + gerak +
        '<button class="btn sunyi kecil" data-acara-ubah="' + agEsc(n.id) + '" title="Ubah / pindah / padam">✏️</button></span>' +
    '</div>';
}

/* Bar acara pada `letak` + tanda sebagai dilukis. */
function agAcaraHtml(letak) {
  _agAcaraDipapar.add(letak);
  const l = agAcaraDi(letak);
  return l.map(n => _agAcaraBar(n, l)).join('');
}

/* Kepala senarai: butang ＋ Acara + acara 'awal'. Memulakan lukisan. */
function agAcaraMula() {
  _agAcaraDipapar = new Set();
  if (!_agNotaS.majlisId) return '';
  return '<div class="acara-tambah-bar"><button class="btn sunyi kecil" data-acara-tambah="awal">' +
    '＋ 🎭 Acara</button><span class="kecil">persembahan, ucapan, doa… — letak di mana-mana</span></div>' +
    agAcaraHtml('awal');
}

/* Kategori dalam anugerah yang TERTUTUP tetap dikira dilukis (acaranya
   tersorok di dalam, bukan hilang) — lencana pada bar anugerah. */
function agAcaraLencana(anId, subIds) {
  (subIds || []).forEach(id => _agAcaraDipapar.add('sub:' + anId + '|' + id));
  const n = agAcaraSemua().filter(x => (subIds || []).some(id => x.letak === 'sub:' + anId + '|' + id)).length;
  return n ? '<span class="acara-lencana" title="Acara di antara kategori — buka anugerah ini">🎭 ' + n + ' acara</span>' : '';
}

/* Hujung senarai: acara yang tempatnya tidak dilukis. Hanya bila paparan
   PENUH — bawah tapisan carian, tempatnya memang tersorok. */
function agAcaraAkhir(penuh) {
  if (!penuh) return '';
  const l = agAcaraSemua().filter(n => !_agAcaraDipapar.has(n.letak));
  if (!l.length) return '';
  return '<div class="acara-yatim kecil">🎭 Acara yang tempatnya tiada dalam senarai (kategori tiada murid / anugerah dibuang) — tekan ✏️ untuk pindah:</div>' +
    l.map(n => _agAcaraBar(n, [n])).join('');
}

/* Pilihan tempat: ikut susunan sub naik pentas, dikumpul ikut anugerah.
   [nilai, label, kumpulan] — kumpulan = <optgroup> nama anugerah. */
function _agAcaraPilihan(majlis) {
  const op = [['awal', 'Di awal — sebelum anugerah pertama', '']];
  if (!majlis) return op;
  const ikutAn = [];
  agSusunanSub(majlis).forEach(({ a, s }) => {
    let A = ikutAn.find(x => x.a.id === a.id);
    if (!A) { A = { a, sub: [] }; ikutAn.push(A); }
    A.sub.push(s);
  });
  ikutAn.forEach(({ a, sub }) => {
    if (sub.length > 1) sub.forEach(s =>
      op.push(['sub:' + a.id + '|' + s.id, 'selepas kategori ' + (s.nama || ''), a.nama]));
    op.push(['an:' + a.id, sub.length > 1 ? '▸ selepas HABIS anugerah ini' : 'selepas anugerah ini', a.nama]);
  });
  return op;
}

function agAcaraUbah(id, letakAwal) {
  _agPnyTutup();
  const majlis = typeof MAJLIS !== 'undefined' ? MAJLIS : null;
  const ada = id ? agAcaraSemua().find(n => n.id === id) : null;
  if (id && !ada) return;
  const letak = ada ? ada.letak : (letakAwal || 'awal');
  const op = _agAcaraPilihan(majlis);
  if (!op.some(o => o[0] === letak)) op.unshift([letak, '(tempat asal tiada lagi — pilih tempat baharu)', '']);
  let kump = null;
  const opsiHtml = op.map(o => {
    let h = '';
    if (o[2] !== kump) { h += (kump ? '</optgroup>' : '') + (o[2] ? '<optgroup label="' + agEsc(o[2]) + '">' : ''); kump = o[2]; }
    return h + '<option value="' + agEsc(o[0]) + '"' + (o[0] === letak ? ' selected' : '') + '>' + agEsc(o[1]) + '</option>';
  }).join('') + (kump ? '</optgroup>' : '');
  const k = document.createElement('div');
  k.id = 'ag-pny-kotak';
  k.innerHTML =
    '<div class="pny-kad" role="dialog" aria-label="Acara">' +
      '<div class="pny-tajuk">🎭 ' + (ada ? 'Ubah acara' : 'Tambah acara') + '</div>' +
      '<input type="text" data-acara-f="tajuk" maxlength="120" placeholder="Tajuk — cth Persembahan Tarian Zapin" value="' +
        agEsc(ada ? ada.tajuk : '') + '">' +
      '<textarea rows="3" data-acara-f="teks" maxlength="' + AG_PNY_HAD + '" placeholder="Butiran (bebas, satu baris satu perkara) — cth\nOleh : Murid Tahun 4\nPerlu : 2 mikrofon wayarles">' +
        agEsc(ada ? ada.teks : '') + '</textarea>' +
      '<label class="pny-lbl-f">Letak</label>' +
      '<select data-acara-f="letak">' + opsiHtml + '</select>' +
      '<div class="pny-butang">' +
        (ada ? '<button class="btn sunyi kecil" data-pny-aksi="padam">🗑 Padam</button>' : '') +
        '<span style="flex:1"></span>' +
        '<button class="btn sunyi kecil" data-pny-aksi="batal">Batal</button>' +
        '<button class="btn kecil" data-pny-aksi="simpan">Simpan</button>' +
      '</div>' +
      '<div class="pny-ket">Dipapar kepada SEMUA petugas & dalam cetakan · nombor giliran tidak berubah</div>' +
    '</div>';
  document.body.appendChild(k);
  const f = n => k.querySelector('[data-acara-f="' + n + '"]');
  f('tajuk').focus();
  const kol = agDb.collection(AG_NOTA_KOL);
  const simpan = async () => {
    const tajuk = f('tajuk').value.trim();
    if (!tajuk) { f('tajuk').focus(); agToast('Sila isi tajuk acara', 'ralat'); return; }
    const teks = f('teks').value.split('\n').map(x => x.replace(/\s+$/, '')).join('\n').trim();
    const letakBaru = f('letak').value;
    k.querySelectorAll('button').forEach(b => { b.disabled = true; });
    try {
      const data = {
        majlisId: _agNotaS.majlisId, jenis: AG_ACARA, anugerahId: '',
        tajuk: tajuk.slice(0, 120), teks: teks.slice(0, AG_PNY_HAD), letak: letakBaru,
        nama: agNotaNama().slice(0, 40), panel: _agNotaS.panel || '', masa: Date.now()
      };
      /* pindah tempat / baharu → paling bawah di tempat itu */
      data.urutan = ada && ada.letak === letakBaru ? (ada.urutan || 0) : Date.now();
      if (ada) await kol.doc(ada.id).set(data);
      else await kol.add(data);
      _agPnyTutup();
    } catch (e) {
      k.querySelectorAll('button').forEach(b => { b.disabled = false; });
      agToast('Acara TIDAK disimpan: ' + e.message, 'ralat');
    }
  };
  k.addEventListener('click', async e => {
    if (e.target === k) return _agPnyTutup();
    const b = e.target.closest('[data-pny-aksi]');
    if (!b) return;
    const aksi = b.dataset.pnyAksi;
    if (aksi === 'batal') _agPnyTutup();
    else if (aksi === 'simpan') simpan();
    else if (aksi === 'padam' && confirm('Padam acara "' + (ada.tajuk || '') + '" untuk SEMUA petugas?')) {
      try { await kol.doc(ada.id).delete(); _agPnyTutup(); }
      catch (err) { agToast('Gagal padam: ' + err.message, 'ralat'); }
    }
  });
  k.addEventListener('keydown', e => {
    if (e.key === 'Escape') _agPnyTutup();
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); simpan(); }
  });
}

/* ↑↓ dalam tempat yang sama — tukar `urutan` dengan jiran. */
async function agAcaraGerak(id, arah) {
  const n = agAcaraSemua().find(x => x.id === id);
  if (!n) return;
  const l = agAcaraDi(n.letak);
  const j = l.indexOf(n) + arah;
  if (j < 0 || j >= l.length) return;
  const m = l[j];
  let un = n.urutan || 0, um = m.urutan || 0;
  if (un === um) um = un + arah;   // urutan sama — paksa beza
  const kol = agDb.collection(AG_NOTA_KOL);
  try {
    const b = agDb.batch();
    b.update(kol.doc(n.id), { urutan: um });
    b.update(kol.doc(m.id), { urutan: un });
    await b.commit();
  } catch (e) { agToast('Gagal: ' + e.message, 'ralat'); }
}

/* ---- cetakan ----
   `rows` = baris bernombor (ada anugerahId + subId), disusun. Selepas
   baris i: acara kategori bila kategori bertukar; acara anugerah bila
   ini baris TERAKHIR anugerah itu dalam keseluruhan senarai. */
function agAcaraLepasBaris(rows, i) {
  const b = rows[i], nx = rows[i + 1];
  const out = [];
  if (!nx || nx.anugerahId !== b.anugerahId || nx.subId !== b.subId)
    out.push('sub:' + b.anugerahId + '|' + b.subId);
  if (!rows.slice(i + 1).some(x => x.anugerahId === b.anugerahId))
    out.push('an:' + b.anugerahId);
  return out;
}

/* Satu baris jadual cetakan HTML untuk acara di `letak`. */
function agAcaraCetakTr(letak, colspan, dipapar) {
  if (dipapar) dipapar.add(letak);
  return agAcaraDi(letak).map(n =>
    '<tr class="acara"><td colspan="' + colspan + '">🎭 <b>' + agEsc(n.tajuk || 'Acara') + '</b>' +
      (n.teks ? '<div class="acara-teks">' + _agAcaraTeksHtml(n.teks) + '</div>' : '') + '</td></tr>').join('');
}

/* letak (unik) yang belum dicetak — kategori tiada murid / anugerah dibuang */
function agAcaraBaki(dipapar) {
  return [...new Set(agAcaraSemua().filter(n => !dipapar.has(n.letak)).map(n => n.letak))];
}

/* Nota anugerah SEBARIS nama dalam .grup-kepala. Klik = tulis / ubah /
   padam (semua petugas). `anNama` untuk dialog sahaja. */
function agNotaTajuk(anId, anNama) {
  if (!_agNotaS.majlisId || !anId) return '';
  const n = agNotaAnugerah(anId);
  return agPenyelarasTajuk(anId, '', anNama) +
    '<span class="nota-tajuk' + (n ? ' ada' : '') + '" role="button" tabindex="0" ' +
    'data-nota-an="' + agEsc(anId) + '" data-nota-an-nama="' + agEsc(anNama || '') + '" title="' +
    (n ? agEsc((n.nama || '') + ' · ' + (AG_NOTA_PANEL[n.panel] || n.panel || '') + ' · ' +
         agNotaMasa(n.masa)) + ' — tekan untuk ubah / padam'
       : 'Tekan untuk tulis nota anugerah ini') + '">' + _agNotaTajukDalam(anId) + '</span>';
}

async function agNotaUbahAnugerah(anId, anNama) {
  let nama = agNotaNama();
  if (!nama) {
    nama = (prompt('Nama anda (dipapar bersama nota):') || '').trim();
    if (!nama) return;
    try { localStorage.setItem(AG_NOTA_KUNCI_NAMA, nama); } catch (e) {}
  }
  const ada = agNotaAnugerah(anId);
  const teks = prompt('Nota untuk ' + (anNama || 'anugerah ini') +
    '\n(dipapar kepada SEMUA petugas · kosongkan untuk padam)', ada ? ada.teks : '');
  if (teks === null) return;
  const ref = agDb.collection(AG_NOTA_KOL).doc(_agNotaS.majlisId + '__' + anId);
  try {
    if (!teks.trim()) {
      if (ada) await agDb.collection(AG_NOTA_KOL).doc(ada.id).delete();
      return;
    }
    await ref.set({
      majlisId: _agNotaS.majlisId, anugerahId: anId,
      teks: teks.trim().slice(0, AG_NOTA_HAD), nama: nama.slice(0, 40),
      panel: _agNotaS.panel || '', masa: Date.now()
    });
  } catch (e) {
    agToast('Nota TIDAK disimpan: ' + e.message, 'ralat');
  }
}

/* Kemas kini di tempat bila nota berubah. */
function agNotaSegar() {
  /* 🎭 acara mengubah STRUKTUR senarai (bar baharu), bukan teks di tempat —
     panel melukis semula bila tandatangan acara berubah. */
  const tt = JSON.stringify(agAcaraSemua().map(n => [n.id, n.letak, n.urutan, n.tajuk, n.teks]));
  if (tt !== _agAcaraTT) {
    const pertama = _agAcaraTT === null;
    _agAcaraTT = tt;
    if (!(pertama && tt === '[]') && typeof window.lukis === 'function') {
      try { window.lukis(); } catch (e) { console.error(e); }
    }
  }
  document.querySelectorAll('[data-pny-an]').forEach(b => {
    const id = b.dataset.pnyAn, sub = b.dataset.pnySub || '';
    b.innerHTML = _agPnyDalam(id, sub);
    b.classList.toggle('ada', !!agPenyelarasBaris(id, sub).length);
    b.title = _agPnyTitle(id, sub);
  });
  document.querySelectorAll('[data-nota-an]').forEach(b => {
    const n = agNotaAnugerah(b.dataset.notaAn);
    b.innerHTML = _agNotaTajukDalam(b.dataset.notaAn);
    b.classList.toggle('ada', !!n);
    b.title = n ? (n.nama || '') + ' · ' + (AG_NOTA_PANEL[n.panel] || n.panel || '') + ' · ' +
      agNotaMasa(n.masa) + ' — tekan untuk ubah / padam' : 'Tekan untuk tulis nota anugerah ini';
  });
  document.querySelectorAll('[data-nota-senarai]').forEach(el => {
    el.innerHTML = agNotaSenaraiHtml(el.dataset.notaSenarai);
  });
  document.querySelectorAll('[data-nota-kira]').forEach(el => {
    const n = agNotaUntuk('').length;
    el.textContent = (n ? n + ' nota' : 'Tiada nota') + ' · semua petugas boleh tulis & padam';
  });
}

async function agNotaHantar(anId, el) {
  const akar = el.closest('.nota-borang');
  const elTeks = akar.querySelector('[data-nota-teks]');
  const elNama = akar.querySelector('[data-nota-nama]');
  const teks = elTeks.value.trim();
  const nama = elNama.value.trim();
  if (!teks) { elTeks.focus(); return; }
  if (!nama) { agToast('Sila isi nama anda dahulu', 'ralat'); elNama.focus(); return; }
  try { localStorage.setItem(AG_NOTA_KUNCI_NAMA, nama); } catch (e) {}
  const b = akar.querySelector('[data-nota-hantar]');
  b.disabled = true;
  try {
    await agDb.collection(AG_NOTA_KOL).add({
      majlisId: _agNotaS.majlisId, anugerahId: anId || '',
      teks: teks.slice(0, AG_NOTA_HAD), nama: nama.slice(0, 40),
      panel: _agNotaS.panel || '', masa: Date.now()
    });
    elTeks.value = '';
    delete _agNotaDraf[anId || ''];
  } catch (e) {
    agToast('Nota TIDAK dihantar: ' + e.message, 'ralat');
  } finally { b.disabled = false; }
}

/* Pendengar peringkat dokumen, sekali sahaja. Klik dalam fasa CAPTURE +
   stopPropagation — butang 📝 duduk DI DALAM .grup-kepala, jadi tanpa ini
   accordion anugerah turut menogol. */
function _agNotaPasangPendengar() {
  if (window._agNotaPasang) return;
  window._agNotaPasang = true;
  document.addEventListener('click', async e => {
    const ac = e.target.closest('[data-acara-tambah],[data-acara-ubah],[data-acara-gerak]');
    if (ac) {
      e.stopPropagation(); e.preventDefault();
      if (ac.dataset.acaraGerak) agAcaraGerak(ac.dataset.acaraGerak, Number(ac.dataset.arah));
      else agAcaraUbah(ac.dataset.acaraUbah || null, ac.dataset.acaraTambah || '');
      return;
    }
    const py = e.target.closest('[data-pny-an]');
    if (py) {
      e.stopPropagation(); e.preventDefault();
      agPenyelarasUbah(py.dataset.pnyAn, py.dataset.pnySub || '', py.dataset.pnyNama);
      return;
    }
    const tj = e.target.closest('[data-nota-an]');
    if (tj) {
      e.stopPropagation(); e.preventDefault();
      agNotaUbahAnugerah(tj.dataset.notaAn, tj.dataset.notaAnNama);
      return;
    }
    const hn = e.target.closest('[data-nota-hantar]');
    if (hn) { e.stopPropagation(); agNotaHantar(hn.dataset.notaHantar, hn); return; }
    const pd = e.target.closest('[data-nota-padam]');
    if (pd) {
      e.stopPropagation();
      if (!confirm('Padam nota ini untuk SEMUA petugas?')) return;
      pd.disabled = true;
      try { await agDb.collection(AG_NOTA_KOL).doc(pd.dataset.notaPadam).delete(); }
      catch (err) { pd.disabled = false; agToast('Gagal padam: ' + err.message, 'ralat'); }
      return;
    }
  }, true);
  document.addEventListener('input', e => {
    const ta = e.target.closest && e.target.closest('[data-nota-teks]');
    if (ta) _agNotaDraf[ta.dataset.notaTeks] = ta.value;
    const nm = e.target.closest && e.target.closest('[data-nota-nama]');
    if (nm) document.querySelectorAll('[data-nota-nama]').forEach(x => { if (x !== nm) x.value = nm.value; });
  });
  /* Ctrl/Cmd+Enter hantar; Enter biasa = baris baharu. Enter pada nota
     tajuk (papan kekunci) = buka, sama seperti klik. */
  document.addEventListener('keydown', e => {
    const py = e.target.closest && e.target.closest('[data-pny-an]');
    if (py && e.key === 'Enter') { e.preventDefault(); e.stopPropagation(); agPenyelarasUbah(py.dataset.pnyAn, py.dataset.pnySub || '', py.dataset.pnyNama); return; }
    const tj = e.target.closest && e.target.closest('[data-nota-an]');
    if (tj && e.key === 'Enter') { e.preventDefault(); e.stopPropagation(); agNotaUbahAnugerah(tj.dataset.notaAn, tj.dataset.notaAnNama); return; }
    const ta = e.target.closest && e.target.closest('[data-nota-teks]');
    if (ta && e.key === 'Enter' && (e.ctrlKey || e.metaKey)) agNotaHantar(ta.dataset.notaTeks, ta);
  });
}

/* Mulakan pendengar nota + papan umum dalam `bekas`. `bekas` boleh null
   (pendengar sahaja). Idempoten untuk majlis yang sama. */
function agPasangNota(bekas, majlisId, panel) {
  if (!majlisId) return;
  _agNotaPasangPendengar();
  if (bekas && !bekas.querySelector('[data-nota-kira]')) {
    bekas.innerHTML =
      '<div class="kad nota-papan">' +
        '<div class="kad-kepala"><h3>📝 Nota Petugas</h3>' +
          '<span class="sub" data-nota-kira>Memuatkan…</span></div>' +
        '<div class="kad-isi">' + agNotaBorangHtml('', 'Nota umum untuk semua petugas… (nota anugerah: tekan ＋ nota pada tajuk anugerah)') +
          '<div class="nota-senarai" data-nota-senarai="">' + agNotaSenaraiHtml('') + '</div>' +
        '</div>' +
      '</div>';
  }
  if (_agNotaS.majlisId === majlisId) { agNotaSegar(); return; }
  if (_agNotaS.henti) _agNotaS.henti();
  Object.assign(_agNotaS, { majlisId, panel: panel || '', nota: [], sedia: false });
  _agNotaS.henti = agDb.collection(AG_NOTA_KOL).where('majlisId', '==', majlisId)
    .onSnapshot(snap => {
      _agNotaS.nota = snap.docs.map(d => ({ id: d.id, ...d.data() }))
        .sort((a, b) => (b.masa || 0) - (a.masa || 0));
      _agNotaS.sedia = true;
      agNotaSegar();
    }, err => {
      document.querySelectorAll('[data-nota-kira]').forEach(el => {
        el.textContent = 'Gagal memuat nota: ' + err.message;
      });
    });
}

/* Padam SEMUA nota majlis — admin sahaja (butang reset berasingan).
   Dipecah 400 satu batch (had Firestore 500). Pulang bilangan. */
async function agPadamSemuaNota(majlisId) {
  const snap = await agDb.collection(AG_NOTA_KOL).where('majlisId', '==', majlisId).get();
  const docs = snap.docs.filter(d => !d.data().jenis);   // 👤 penyelaras + 🎭 acara kekal
  for (let i = 0; i < docs.length; i += 400) {
    const b = agDb.batch();
    docs.slice(i, i + 400).forEach(d => b.delete(d.ref));
    await b.commit();
  }
  return docs.length;
}

async function agBilNota(majlisId) {
  const snap = await agDb.collection(AG_NOTA_KOL).where('majlisId', '==', majlisId).get();
  return snap.docs.filter(d => !d.data().jenis).length;
}

function agEsc(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g,
    c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

/* 🔴 Cetakan papar DARJAH + KELAS, bukan kelas sahaja — "5 CELERON" dan
      "6 CELERON" dua kelas berbeza. */
/* ---------- Penerima BUKAN MURID (contoh ibu bapa) ----------
   Disimpan dalam anugerah_penerima yang SAMA dengan murid supaya giliran,
   tiket, kad, MC, hadiah dan tayangan berfungsi tanpa laluan kedua.
   `jenis:'luar'`, nama sahaja, tahun/kelas kosong. `no_kp` ialah id
   rekaan HURUF SAHAJA — carian KP (≥4 digit) tidak akan terpadan. */
function agAdalahLuar(p) {
  return !!p && p.jenis === 'luar';
}

function agIdLuar() {
  let t = '';
  for (let i = 0; i < 12; i++) t += String.fromCharCode(65 + Math.floor(Math.random() * 26));
  return 'LUAR_' + t;
}

/* Label kelas untuk senarai ADMIN. Tiket/kad/panel petugas memakai
   agDarjahKelas terus — kosong bagi bukan murid (nama sahaja). */
function agKelasPenerima(p) {
  return agAdalahLuar(p) ? 'Bukan murid' : agDarjahKelas(p && p.tahun, p && p.kelas);
}

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
