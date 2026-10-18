/* ============================================================
   Bookmarklet "ESIS Helper" — dijalankan di moeissppb.moe.gov.my
   Pasangan kepada butang "Salin untuk SPPB" dalam ESIS.

   KUNCI PADANAN: No. Kad Pengenalan (bukan nama, bukan susunan).

   ------------------------------------------------------------
   KENAPA HELPER MENGHANTAR TERUS, BUKAN MENGISI KOTAK
   ------------------------------------------------------------
   Versi lama mengisi kotak Skor(%) lalu guru tekan Simpan.
   Markah dan Gred memang terpapar — tetapi lajur Status kekal
   "Belum Ditaksir" (status_taksir = 1), dan SPPB hanya
   menghantar baris berstatus 2 dalam items[]. Hasilnya POST
   bawa 0 item, server render semula, skrin jadi BLANK.

   Disahkan 18 Okt 2026 pada skrin SPPB sebenar: Simpan dengan
   10 baris "Ditaksir" menghantar tepat 10 item, semuanya
   status_taksir:2. Baris lain tidak dihantar langsung.

   SPPB ialah Vue 3 (Inertia + Laravel). Enam mekanisme dicuba
   untuk menjadikan Status = 2 dari luar — dispatchEvent,
   simulasi keydown penuh, execCommand (event dijana pelayar),
   panggil handler Vue terus, jeda setTimeout, larian berasingan.
   Semuanya memberi corak sama: hanya SATU baris berjaya setiap
   kali. Hanya papan kekunci manusia sebenar berjaya untuk
   banyak baris.

   Maka helper menghantar POST yang sama persis seperti SPPB
   sendiri hantar. JANGAN kembali kepada pendekatan isi-kotak.
   ------------------------------------------------------------

   PRINSIP (jangan ubah):
   - Murid TH DILANGKAU sepenuhnya — TH bukan markah 0
   - Markah kosong DILANGKAU
   - Mana-mana noKP tak padan = BERHENTI, tiada apa dihantar
   - Bilangan murid berbeza = BERHENTI
   - JANGAN sentuh butang Hantar (hantar ke PPD) — hanya simpan
   ============================================================ */
(function () {
  'use strict';

  function bersihKP(v) {
    return String(v || '').replace(/\D/g, '');
  }

  function papar(tajuk, isi, warna) {
    var lama = document.getElementById('pesanSPPB');
    if (lama) lama.remove();
    var k = document.createElement('div');
    k.id = 'pesanSPPB';
    k.style.cssText =
      'position:fixed;top:18px;right:18px;z-index:2147483647;background:#fff;' +
      'border-left:6px solid ' + warna + ';box-shadow:0 6px 24px rgba(0,0,0,.28);' +
      'border-radius:9px;padding:17px 21px;max-width:430px;max-height:82vh;overflow:auto;' +
      'font:14px/1.55 system-ui,-apple-system,sans-serif;color:#15181e';
    var h = document.createElement('div');
    h.style.cssText = 'font-weight:700;font-size:15.5px;margin-bottom:9px';
    h.textContent = tajuk;
    var b = document.createElement('div');
    b.style.cssText = 'white-space:pre-wrap';
    b.textContent = isi;
    var t = document.createElement('button');
    t.textContent = 'Tutup';
    t.style.cssText = 'margin-top:13px;background:#374151;color:#fff;border:0;' +
      'border-radius:6px;padding:7px 15px;cursor:pointer;font-size:13px';
    t.onclick = function () { k.remove(); };
    k.appendChild(h); k.appendChild(b); k.appendChild(t);
    document.body.appendChild(k);
  }

  // ---- Baca keadaan halaman SPPB dari data-page (Inertia) ----
  function bacaHalaman() {
    var el = document.getElementById('app');
    if (!el) return null;
    var dp = el.getAttribute('data-page');
    if (!dp) return null;
    var p;
    try { p = JSON.parse(dp); } catch (e) { return null; }
    var mp = p.props && p.props.pbd_mp;
    if (!mp) return null;
    var itemsVue = p.props.skors && p.props.skors.data && p.props.skors.data.items;
    if (!Array.isArray(itemsVue) || !itemsVue.length) return null;
    return {
      versi: p.version || '',
      mpId: mp.id,
      aksi: mp.aksi,
      statusId: mp.status_id,
      statusMpId: mp.ltt_skor_pbd_mp_status_id,
      sumatif: mp.pbd_sumatif,
      maxSkor: Number(mp.max_skor) || 100,
      minSkor: Number(mp.min_skor) || 0,
      // SUMBER SEBENAR ialah props.skors.data.items — struktur yang
      // Show.vue sendiri gunakan (table.items), lengkap dengan no_id,
      // simpan, kemahiran. tbt_skor_pbd TIDAK mengandungi no_id dan
      // bukan yang dihantar semula oleh borang.
      rekod: (p.props.skors && p.props.skors.data && p.props.skors.data.items) || [],
      skor: (p.props.skor || []).map(function (s) {
        return { id: s.id, kod: s.kod, min: Number(s.markah_min), mak: Number(s.markah_mak) };
      }),
      subjek: (mp.ltt_mata_pelajaran && mp.ltt_mata_pelajaran.keterangan) || '',
      kelas: (mp.kelas && (mp.kelas.keterangan || mp.kelas.nama)) || '',
      aktiviti: (mp.aktiviti && (mp.aktiviti.keterangan || mp.aktiviti.nama)) || ''
    };
  }

  // markah -> id julat gred (ltt_pbd_mp_id)
  function idGred(markah, senarai) {
    for (var i = 0; i < senarai.length; i++) {
      var s = senarai[i];
      if (markah >= s.min && markah <= s.mak) return s.id;
    }
    return null;
  }

  function kodGred(markah, senarai) {
    for (var i = 0; i < senarai.length; i++) {
      var s = senarai[i];
      if (markah >= s.min && markah <= s.mak) return s.kod;
    }
    return '?';
  }

  function hantarKeSPPB(hal, items, bila) {
    // Format disalin TEPAT dari Show.vue simpan():
    //   param = { id, aksi, status_id, ltt_skor_pbd_mp_status_id,
    //             tindakan, max_skor, items }
    // Nota: status_id WAJIB ada — versi awal tertinggal dan permintaan diabaikan.
    var badan = {
      id: hal.mpId,
      aksi: hal.aksi,
      status_id: hal.statusId,
      ltt_skor_pbd_mp_status_id: hal.statusMpId,
      tindakan: { e: {}, errorsCount: 0 },
      max_skor: hal.maxSkor,
      items: items
    };
    // SPPB ialah Inertia.js. TANPA header X-Inertia, Laravel menganggap ini
    // lawatan pelayar biasa: ia MEMBUANG data lalu memulangkan HTML halaman
    // penuh dengan kod 200. Jadi res.ok bernilai true walaupun tiada apa
    // disimpan — itulah sebab versi pertama melaporkan "BERJAYA" secara palsu.
    // Disahkan 18 Okt 2026: balasan 200, content-type text/html, 483837 bait.
    // JANGAN buang header ini, dan JANGAN percaya res.ok sahaja.
    var kepala = {
      'Content-Type': 'application/json',
      'Accept': 'text/html, application/xhtml+xml',
      'X-Requested-With': 'XMLHttpRequest',
      'X-Inertia': 'true',
      'X-Inertia-Version': hal.versi || ''
    };
    var ck = document.cookie.split('; ').filter(function (c) {
      return c.indexOf('XSRF-TOKEN=') === 0;
    })[0];
    if (ck) kepala['X-XSRF-TOKEN'] = decodeURIComponent(ck.split('=').slice(1).join('='));

    fetch('/keputusan/pbd/pbd/update_keputusan/' + hal.mpId, {
      method: 'POST',
      headers: kepala,
      credentials: 'same-origin',
      body: JSON.stringify(badan)
    }).then(function (res) {
      var ct = res.headers.get('content-type') || '';
      var inertia = res.headers.get('x-inertia');
      if (!res.ok) { bila(false, 'HTTP ' + res.status); return; }
      // Balasan Inertia yang sah: header x-inertia ADA, atau JSON.
      // HTML penuh tanpa x-inertia = permintaan dibuang senyap.
      if (!inertia && ct.indexOf('json') === -1) {
        bila(false, 'DIBUANG (balasan HTML, bukan Inertia)');
        return;
      }
      bila(true, res.status);
    }).catch(function (e) {
      bila(false, String(e).slice(0, 120));
    });
  }

  function mula(teks) {
    var data;
    try { data = JSON.parse(teks); } catch (e) {
      papar('Data tidak dikenali',
        'Papan klip tidak mengandungi data ESIS.\n\n' +
        'Pergi ke ESIS > Rekod & Laporan, klik "Salin untuk SPPB" dahulu.', '#b4232a');
      return;
    }
    if (!data || data.jenisData !== 'ESIS-SPPB-v1' || !Array.isArray(data.murid)) {
      papar('Data tidak dikenali', 'Format tidak sepadan. Sila salin semula dari ESIS.', '#b4232a');
      return;
    }

    var hal = bacaHalaman();
    if (!hal) {
      papar('Skrin SPPB tidak dikenali',
        'Helper tidak dapat membaca data murid di halaman ini.\n\n' +
        'Pastikan anda di skrin Pentaksiran Bilik Darjah dengan senarai murid terpapar, ' +
        'kemudian muat semula halaman dan cuba lagi.', '#b4232a');
      return;
    }

    // Padan terus pada rekod Vue (ada no_id), bukan DOM — lebih tepat
    // dan tidak bergantung pada susunan lajur jadual.
    var jadual = hal.rekod.map(function (rk, i) {
      return { bil: i + 1, nama: rk.nama || '', kp: bersihKP(rk.no_id), rekod: rk };
    });

    var k = data.konteks || {};
    var konteksESIS = (k.darjah || '') + ' ' + (k.kelas || '') + ' — ' + (k.subjek || '');
    var konteksSPPB = (hal.kelas || '') + ' — ' + (hal.subjek || '');

    var tiadaKP = jadual.filter(function (b) { return !b.kp; }).length;
    if (tiadaKP === jadual.length) {
      papar('Tiada No. KP di SPPB',
        'Tiada apa dihantar.\n\nHelper tidak menemui lajur ID Pengenalan.\n' +
        'Pastikan jadual murid terpapar penuh.', '#b4232a');
      return;
    }

    var peta = {};
    data.murid.forEach(function (m) {
      var kp = bersihKP(m.nokp);
      if (kp) peta[kp] = m;
    });

    var takJumpa = [], pasang = [];
    jadual.forEach(function (b) {
      var m = peta[b.kp];
      if (!m) { takJumpa.push(b.bil + '. ' + b.nama); }
      else { pasang.push({ s: b, e: m, rekod: b.rekod }); }
    });

    if (takJumpa.length) {
      papar('BERHENTI — No. KP tidak padan',
        'Tiada apa dihantar.\n\n' + takJumpa.length + ' murid di SPPB tidak dijumpai di ESIS:\n\n' +
        takJumpa.slice(0, 12).join('\n') +
        (takJumpa.length > 12 ? '\n…dan ' + (takJumpa.length - 12) + ' lagi' : '') +
        '\n\nSemak: kelas dan subjek sama? Ada murid baru masuk?\n\n' +
        'Data ESIS: ' + konteksESIS + '\nSkrin SPPB: ' + konteksSPPB, '#b4232a');
      return;
    }

    if (jadual.length !== data.murid.length) {
      papar('BERHENTI — bilangan murid berbeza',
        'Tiada apa dihantar.\n\nSPPB: ' + jadual.length + ' murid\nESIS: ' + data.murid.length + ' murid\n\n' +
        'Semak kelas yang dipilih di kedua-dua sistem.', '#b4232a');
      return;
    }

    var akanHantar = [], th = [], kosong = [], luarJulat = [];
    pasang.forEach(function (p) {
      if (p.e.th) { th.push(p.s.bil + '. ' + p.s.nama); return; }
      if (p.e.markah === null || p.e.markah === undefined) { kosong.push(p.s.bil + '. ' + p.s.nama); return; }
      var n = Number(p.e.markah);
      if (!isFinite(n) || n < 0 || n > hal.maxSkor) {
        luarJulat.push(p.s.bil + '. ' + p.s.nama + ' (' + p.e.markah + ')'); return;
      }
      var gid = idGred(n, hal.skor);
      if (gid === null) { luarJulat.push(p.s.bil + '. ' + p.s.nama + ' (' + n + ')'); return; }
      akanHantar.push({ p: p, n: n, gid: gid, kod: kodGred(n, hal.skor) });
    });

    if (luarJulat.length) {
      papar('BERHENTI — markah di luar julat',
        'Tiada apa dihantar.\n\n' + luarJulat.slice(0, 10).join('\n') +
        '\n\nJulat sah: 0 hingga ' + hal.maxSkor + '.', '#b4232a');
      return;
    }

    if (!akanHantar.length) {
      papar('Tiada markah untuk dihantar',
        'Semua murid Tidak Hadir atau markah kosong di ESIS.', '#b45309');
      return;
    }

    // Mod ujian DIBUANG 18 Okt 2026. Soalan "OK = 3 murid / Batal = semua"
    // terbalik dengan naluri: guru menekan OK (jawapan semula jadi untuk
    // "teruskan") dan hanya 3 murid dihantar, lalu nampak seperti helper
    // gagal. Helper kini sentiasa menghantar semua yang layak.
    var senarai = akanHantar;

    var contoh = senarai.slice(0, 3).map(function (x) {
      return '  ' + x.p.s.nama.slice(0, 26) + ' → ' + x.n + ' (' + x.kod + ')';
    }).join('\n');

    var soal = 'HANTAR MARKAH TERUS KE SPPB\n\n' +
      'Dari ESIS:  ' + konteksESIS + '\n' +
      'Ke SPPB:    ' + konteksSPPB + '\n' +
      (hal.aktiviti ? '            ' + hal.aktiviti + '\n' : '') + '\n' +
      'Akan dihantar: ' + senarai.length + ' murid\n' +
      (th.length ? 'Tidak Hadir (dilangkau): ' + th.length + ' murid\n' : '') +
      (kosong.length ? 'Markah kosong (dilangkau): ' + kosong.length + ' murid\n' : '') +
      '\nSemua No. KP padan.\n\n' +
      contoh + '\n\n' +
      '⚠ Helper akan SIMPAN terus ke SPPB.\n' +
      'Anda TIDAK perlu tekan Simpan.\n' +
      'Markah masuk rekod rasmi.\n\n' +
      'Semak subjek di atas betul. Teruskan?';

    if (!window.confirm(soal)) return;

    // Show.vue menapis dengan `if (items[i].simpan == 1)` dan menghantar
    // tepat sembilan medan ini. Medan `kemahiran` mesti dikekalkan apa
    // adanya daripada rekod — mengosongkannya memadam kemahiran murid.
    var items = senarai.map(function (x) {
      var rk = x.p.rekod;
      return {
        id: rk.id,
        ltt_pbd_mp_id: x.gid,
        markah: x.n,
        ulasan_gmp: rk.ulasan_gmp,
        intervensi_gmp: rk.intervensi_gmp,
        ltt_pbd_usaha_id: rk.ltt_pbd_usaha_id,
        status_taksir: 2,
        kemahiran: rk.kemahiran,
        kategori: rk.kategori
      };
    });

    // Buang cache SEBELUM hantar juga: jika guru menutup tab sebelum
    // muat semula automatik berjalan, lawatan berikutnya tidak boleh
    // memaparkan salinan lama yang tiada markah baharu.
    try {
      localStorage.removeItem('pbd_' + hal.mpId);
      localStorage.clear();
    } catch (e) {}

    papar('Menghantar…', 'Menghantar ' + items.length + ' markah ke SPPB.\nTunggu sebentar.', '#2563eb');

    hantarKeSPPB(hal, items, function (ok, kod) {
      if (!ok) {
        papar('GAGAL — markah TIDAK disimpan',
          'Server SPPB tidak menerima markah.\n\nSebab: ' + kod + '\n\n' +
          'TIADA markah masuk. Cuba:\n' +
          '1. Tekan F5 untuk muat semula SPPB\n' +
          '2. Pastikan anda masih log masuk\n' +
          '3. Jalankan helper sekali lagi\n\n' +
          'Jika berterusan, isi markah secara manual.\n' +
          'Jangan anggap markah sudah masuk — semak di skrin.', '#b4232a');
        return;
      }
      // Show.vue getStorage() MENGUTAMAKAN localStorage berbanding data
      // server: `if (data) { table.items = storage }`. Jadi selepas helper
      // menyimpan ke pangkalan data, skrin masih memaparkan salinan lama
      // dan markah kelihatan "tidak masuk" — ia hanya muncul selepas guru
      // menekan Simpan, yang membuang cache itu.
      //
      // Membuang localStorage sahaja TIDAK memadai: Vue masih hidup dan
      // menulis semula pada interaksi berikutnya. Kita mesti membuangnya
      // DAN memuat semula halaman serta-merta, supaya getStorage()
      // berjalan sekali lagi tanpa cache dan membaca terus dari server.
      try {
        localStorage.removeItem('pbd_' + hal.mpId);
        localStorage.clear();
      } catch (e) {}

      var lap = items.length + ' markah disimpan ke SPPB.\n\n';
      if (th.length) lap += 'TIDAK HADIR — sila guru isi sendiri:\n' + th.join('\n') + '\n\n';
      if (kosong.length) lap += 'Markah kosong di ESIS:\n' + kosong.join('\n') + '\n\n';
      lap += 'Halaman akan dimuat semula untuk memaparkan markah…\n\n' +
        'Helper TIDAK menekan "Hantar" (ke PPD).\nItu kekal keputusan anda.';
      papar('Berjaya disimpan', lap, '#1a7f45');

      // Muat semula supaya markah terpapar tanpa guru perlu tekan Simpan.
      setTimeout(function () { window.location.reload(); }, 2500);
    });
  }

  if (navigator.clipboard && navigator.clipboard.readText) {
    navigator.clipboard.readText().then(mula).catch(function () {
      var t = window.prompt('Tampal data ESIS di sini (Cmd+V atau Ctrl+V):', '');
      if (t) mula(t);
    });
  } else {
    var t = window.prompt('Tampal data ESIS di sini (Cmd+V atau Ctrl+V):', '');
    if (t) mula(t);
  }
})();
