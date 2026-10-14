/* ============================================================
   Bookmarklet "Tampal SPPB"  — dijalankan di moeissppb.moe.gov.my
   Pasangan kepada butang "Salin untuk SPPB" dalam ESIS.

   KUNCI PADANAN: No. Kad Pengenalan (bukan nama, bukan susunan).

   PRINSIP (jangan ubah):
   - Isi kotak Skor(%) SAHAJA
   - JANGAN sentuh Simpan / Hantar / Tutup / dropdown Status
   - Murid TH atau markah kosong = DILANGKAU
   - Mana-mana noKP tak padan = BERHENTI, tiada apa diisi
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

  // Baca jadual SPPB: Bil | Nama | ID Pengenalan | Jantina | Skor(%) | Gred | Status
  function bacaSPPB() {
    var out = [];
    document.querySelectorAll('tr').forEach(function (baris) {
      var sel = baris.querySelectorAll('td');
      if (sel.length < 5) return;
      var bil = (sel[0].textContent || '').trim();
      if (!/^\d+$/.test(bil)) return;
      var kotak = baris.querySelector('input[type="number"]');
      if (!kotak) return;
      out.push({
        bil: parseInt(bil, 10),
        nama: (sel[1].textContent || '').trim(),
        kp: bersihKP(sel[2].textContent),
        kotak: kotak
      });
    });
    return out;
  }

  // Isi supaya rangka kerja SPPB perasan perubahan
  function isi(kotak, nilai) {
    var d = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(kotak), 'value');
    if (d && d.set) { d.set.call(kotak, String(nilai)); } else { kotak.value = String(nilai); }
    kotak.dispatchEvent(new Event('input', { bubbles: true }));
    kotak.dispatchEvent(new Event('change', { bubbles: true }));
    kotak.dispatchEvent(new Event('blur', { bubbles: true }));
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

    var sppb = bacaSPPB();
    if (!sppb.length) {
      papar('Jadual tidak dijumpai',
        'Tiada senarai murid di skrin SPPB.\n\n' +
        'Pastikan anda di skrin Pentaksiran Bilik Darjah dengan senarai murid terpapar.', '#b4232a');
      return;
    }

    var k = data.konteks || {};
    var konteks = (k.darjah || '') + ' ' + (k.kelas || '') + ' — ' + (k.subjek || '');

    // SPPB tiada noKP? Jangan teka — berhenti.
    var tiadaKP = sppb.filter(function (b) { return !b.kp; }).length;
    if (tiadaKP === sppb.length) {
      papar('Tiada No. KP di SPPB',
        'Tiada apa diisi.\n\nHelper tidak menemui lajur ID Pengenalan.\n' +
        'Pastikan jadual murid terpapar penuh.', '#b4232a');
      return;
    }

    // Peta ikut noKP
    var peta = {};
    data.murid.forEach(function (m) {
      var kp = bersihKP(m.nokp);
      if (kp) peta[kp] = m;
    });

    var takJumpa = [], pasang = [];
    sppb.forEach(function (b) {
      var m = peta[b.kp];
      if (!m) { takJumpa.push(b.bil + '. ' + b.nama); } else { pasang.push({ s: b, e: m }); }
    });

    if (takJumpa.length) {
      papar('BERHENTI — No. KP tidak padan',
        'Tiada apa diisi.\n\n' + takJumpa.length + ' murid di SPPB tidak dijumpai di ESIS:\n\n' +
        takJumpa.slice(0, 12).join('\n') +
        (takJumpa.length > 12 ? '\n…dan ' + (takJumpa.length - 12) + ' lagi' : '') +
        '\n\nSemak: kelas dan subjek sama? Ada murid baru masuk?\n\nData ESIS: ' + konteks, '#b4232a');
      return;
    }

    if (sppb.length !== data.murid.length) {
      papar('BERHENTI — bilangan murid berbeza',
        'Tiada apa diisi.\n\nSPPB: ' + sppb.length + ' murid\nESIS: ' + data.murid.length + ' murid\n\n' +
        'Semak kelas yang dipilih di kedua-dua sistem.', '#b4232a');
      return;
    }

    var akanIsi = [], th = [], kosong = [];
    pasang.forEach(function (p) {
      if (p.e.th) { th.push(p.s.bil + '. ' + p.s.nama); }
      else if (p.e.markah === null || p.e.markah === undefined) { kosong.push(p.s.bil + '. ' + p.s.nama); }
      else { akanIsi.push(p); }
    });

    if (!akanIsi.length) {
      papar('Tiada markah untuk diisi',
        'Semua murid Tidak Hadir atau markah kosong di ESIS.', '#b45309');
      return;
    }

    var soal = 'TAMPAL MARKAH KE SPPB\n\n' +
      'Dari ESIS: ' + konteks + '\n\n' +
      'Akan diisi: ' + akanIsi.length + ' murid\n' +
      (th.length ? 'Tidak Hadir (dilangkau): ' + th.length + ' murid\n' : '') +
      (kosong.length ? 'Markah kosong (dilangkau): ' + kosong.length + ' murid\n' : '') +
      '\nSemua No. KP padan.\n\n' +
      'Helper HANYA isi kotak Skor.\nAnda yang tekan Simpan selepas semak.\n\nTeruskan?';

    if (!window.confirm(soal)) return;

    var n = 0;
    akanIsi.forEach(function (p) {
      try { isi(p.s.kotak, p.e.markah); n++; } catch (e) {}
    });

    var lap = n + ' markah telah diisi.\n\n';
    if (th.length) lap += 'TIDAK HADIR — sila guru isi sendiri:\n' + th.join('\n') + '\n\n';
    if (kosong.length) lap += 'Markah kosong di ESIS:\n' + kosong.join('\n') + '\n\n';
    lap += 'Semak markah di skrin, kemudian tekan SIMPAN sendiri.\nHelper tidak menekan Simpan.';

    papar('Siap', lap, '#1a7f45');
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
