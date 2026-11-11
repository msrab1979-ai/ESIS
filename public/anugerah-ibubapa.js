/* ==========================================================================
   anugerah-ibubapa.js — tab 👪 Ibu Bapa dalam anugerah-admin.html (5 Nov 2026)
   --------------------------------------------------------------------------
   Tetapan halaman ibubapa.html + statistik bancian/pendaftaran.

   Tetapan: MAJLIS.ibubapa = {
     tajuk:   { sek, utama, info, alu }   // kosong = lalai dari Tab Majlis / Kad Jemputan
     bancian: { buka, tutup }             // ms epoch — halaman buka/tutup sendiri ikut jam
     daftar:  { buka, tutup }
     buku:    'https://drive.google.com/…'
     wa:      { on, url, teks }
     had:     2                           // maksimum orang bagi SETIAP anak penerima (keluarga = had × bil. anak); 0/tiada = tiada had
   }

   🔴 Ditulis dengan update({ibubapa}) — BUKAN simpanMajlis() (set merge).
      Merge menggabung peta secara mendalam, jadi medan yang dikosongkan
      admin (cth link buku dipadam) akan kekal senyap. update() menggantikan
      seluruh peta.
   🔴 Data ibu bapa: anugerah_ibubapa (satu doc per keluarga, id = majlis__telefon)
      + anugerah_ibubapa_kp (indeks satu anak satu keluarga). Format ditulis
      oleh ibubapa.html — lihat ulasan kepala fail itu.
   ========================================================================== */

let IB_KEL = [];          // doc keluarga majlis aktif (termasuk ujian)
let IB_UJI = [];          // 🧪 ID ujian majlis aktif
let IB_SANDAR = [];       // ♻️ sandaran ujian data SEBENAR (anugerah_ibubapa_ujisandar)
let IB_SEDIA = false;     // pendengar dipasang sekali

const ibP = s => String(s == null ? '' : s);
const ibKeInput = ms => {
  if (!ms) return '';
  const d = new Date(ms), p = n => String(n).padStart(2, '0');
  return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()) + 'T' + p(d.getHours()) + ':' + p(d.getMinutes());
};
const ibDariInput = v => (v ? new Date(v).getTime() : null);
const ibMasa = x => (x && x.toDate ? x.toDate() : (x instanceof Date ? x : (x ? new Date(x) : null)));
function ibTarikh(ms) {
  if (!ms) return '';
  return new Date(ms).toLocaleString('ms-MY', { weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });
}
function ibStatus(w) {
  const t = Date.now();
  if (!w || !w.buka || !w.tutup) return '<span class="ib-chip">○ Belum ditetapkan — link tertutup</span>';
  if (w.tutup <= w.buka) return '<span class="ib-chip bahaya">✕ Masa tutup mesti selepas masa buka</span>';
  if (t < w.buka) return '<span class="ib-chip">○ BELUM DIBUKA · dibuka ' + agEsc(ibTarikh(w.buka)) + '</span>';
  if (t >= w.tutup) return '<span class="ib-chip">● DITUTUP · ' + agEsc(ibTarikh(w.tutup)) + '</span>';
  const j = Math.round((w.tutup - t) / 3600000);
  return '<span class="ib-chip ok">● SEDANG DIBUKA · tutup dalam ' + (j >= 48 ? Math.round(j / 24) + ' hari' : j + ' jam') + '</span>';
}
function ibBarisMajlis() {
  return (Array.isArray(MAJLIS.kadBaris) ? MAJLIS.kadBaris : []).filter(x => x && ibP(x.nilai).trim());
}
function ibInfoLalai() {
  const b = ibBarisMajlis(), cari = re => (b.find(x => re.test(ibP(x.label).toUpperCase())) || {}).nilai;
  const tc = s => ibP(s).toLowerCase().replace(/(^|\s)\S/g, c => c.toUpperCase()).replace(/\b(am|pm)\b/gi, x => x.toUpperCase());
  return [cari(/HARI/), cari(/TARIKH/) || MAJLIS.tarikh, cari(/MASA|WAKTU/)].filter(Boolean).map(tc).join(' · ');
}
/* Nama fail selamat untuk Windows — tajuk boleh mengandungi *italik*. */
const ibFail = () => (MAJLIS.nama || 'majlis').replace(/[^\w-]+/g, '-').replace(/^-+|-+$/g, '');
const ibLink = () => location.href.replace(/[^/]*$/, '') + 'ibubapa.html?m=' + encodeURIComponent(MAJLIS.id);

/* ---------- markup (dibina sekali ke dalam #p-ibubapa) ---------- */
function ibBina() {
  $('p-ibubapa').innerHTML = `
<style>
  .ib-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:16px}
  .ib-chip{display:inline-block;font-size:11.5px;font-weight:700;letter-spacing:.04em;padding:5px 11px;border-radius:20px;border:1px solid var(--garis);color:var(--neutral)}
  .ib-chip.ok{background:var(--hadir);border-color:var(--hadir);color:#fff}
  .ib-chip.bahaya{background:var(--absen-bg);border-color:var(--absen);color:var(--absen)}
  .ib-medan{display:flex;flex-direction:column;gap:5px;margin-bottom:11px}
  .ib-medan label{font-size:11.5px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;color:var(--neutral)}
  .ib-medan input{width:100%}
  .ib-dua{display:grid;grid-template-columns:1fr 1fr;gap:10px}
  .ib-dua input[type=datetime-local]{font:inherit;font-size:14px;padding:7px 9px;border:1px solid var(--garis);border-radius:7px;width:100%;background:var(--kertas-2);color:var(--tinta)}
  .ib-pratonton{background:linear-gradient(165deg,#121216,#24232B);color:#FAF7F0;border-radius:12px;padding:22px 18px;text-align:center}
  .ib-pratonton .s{font-size:10px;letter-spacing:.24em;color:#C6A867;font-weight:700;text-transform:uppercase}
  .ib-pratonton .u{font-family:"Iowan Old Style",Palatino,Georgia,serif;font-size:24px;line-height:1.15;margin-top:6px}
  .ib-pratonton em{font-style:italic;color:#E2C98A}
  .ib-pratonton .i{font-size:12px;color:rgba(250,247,240,.68);margin-top:8px}
  .ib-suis{display:flex;align-items:center;gap:9px;font-weight:700;font-size:13px;cursor:pointer;user-select:none}
  .ib-suis input{width:18px;height:18px;min-width:0;accent-color:#1F8F55}
  .ib-link{font-family:ui-monospace,Menlo,monospace;font-size:12.5px;background:var(--kertas-3);padding:8px 11px;border-radius:7px;word-break:break-all;flex:1 1 260px}
  #ib-jadual td.n,#ib-jadual th.n{text-align:right;font-variant-numeric:tabular-nums}
  #ib-jadual tfoot td{font-weight:700;border-top:2px solid var(--garis)}
  .ib-merah{color:var(--absen);font-weight:700}
  .ib-klik{cursor:pointer}
  .ib-klik:hover td{background:var(--kertas-3)}
  .ibm-chip{border:1px solid var(--garis);background:var(--kertas-2);border-radius:20px;padding:5px 12px;font-size:12.5px;font-weight:600;color:var(--neutral)}
  .ibm-chip.on{background:var(--tinta);border-color:var(--tinta);color:#fff}
  .ibm-ok{color:var(--hadir);font-weight:700}
  .ibm-borang td{background:var(--kertas-3)}
  .ibm-borang .ib-medan{margin:0}
  .ibm-borang input,.ibm-borang select{min-width:0;width:100%}
  .ibm-g{display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:10px;align-items:end}
</style>
<div class="kad">
  <div class="kad-kepala"><h3>👪 Link Ibu Bapa</h3></div>
  <div class="kad-isi">
    <div class="baris-input" style="align-items:center">
      <div class="ib-link" id="ib-url"></div>
      <button class="btn sunyi kecil" id="ib-salin">📋 Salin link</button>
      <a class="btn sunyi kecil" id="ib-buka" target="_blank" rel="noopener">Buka</a>
      <button class="btn emas kecil" id="ib-panduan">📲 Panduan &amp; QR</button>
    </div>
    <p class="hint" style="margin:9px 0 0">Satu link untuk semua fasa. Kongsi dalam group WhatsApp kelas — halaman bertukar sendiri ikut jadual di bawah.</p>
  </div>
</div>

<div class="ib-grid">
  <div class="kad">
    <div class="kad-kepala"><h3>✎ Tajuk halaman</h3></div>
    <div class="kad-isi">
      <div class="ib-medan"><label for="ib-sek">Baris kecil (atas)</label><input type="text" id="ib-sek"></div>
      <div class="ib-medan"><label for="ib-utama">Tajuk utama</label><input type="text" id="ib-utama"></div>
      <div class="ib-medan"><label for="ib-info">Tarikh / masa / tempat</label><input type="text" id="ib-info"></div>
      <div class="ib-medan"><label for="ib-alu">Mesej alu-aluan bancian</label><input type="text" id="ib-alu"></div>
      <p class="hint" style="margin:0">Kosong = ikut <strong>Tab Majlis</strong> &amp; <strong>Kad Jemputan</strong> (kelabu = nilai lalai).
        <strong>*perkataan*</strong> = italik emas.</p>
    </div>
  </div>
  <div class="kad">
    <div class="kad-kepala"><h3>Pratonton</h3></div>
    <div class="kad-isi"><div class="ib-pratonton" id="ib-pra"></div>
      <p class="hint" style="margin:9px 0 0">Maklumat majlis (Tarikh, Masa, Tempat…) pada skrin daftar diambil terus dari baris <strong>💌 Kad Jemputan</strong>.</p></div>
  </div>
</div>

<div class="ib-grid">
  <div class="kad">
    <div class="kad-kepala"><h3>① Bancian Kehadiran</h3></div>
    <div class="kad-isi">
      <div class="ib-dua">
        <div class="ib-medan"><label for="ib-b-buka">Buka</label><input type="datetime-local" id="ib-b-buka"></div>
        <div class="ib-medan"><label for="ib-b-tutup">Tutup</label><input type="datetime-local" id="ib-b-tutup"></div>
      </div>
      <div id="ib-b-status"></div>
    </div>
  </div>
  <div class="kad">
    <div class="kad-kepala"><h3>② Pendaftaran Hari Majlis</h3></div>
    <div class="kad-isi">
      <div class="ib-dua">
        <div class="ib-medan"><label for="ib-d-buka">Buka</label><input type="datetime-local" id="ib-d-buka"></div>
        <div class="ib-medan"><label for="ib-d-tutup">Tutup</label><input type="datetime-local" id="ib-d-tutup"></div>
      </div>
      <div id="ib-d-status"></div>
    </div>
  </div>
</div>

<div class="ib-grid">
  <div class="kad">
    <div class="kad-kepala"><h3>📖 Buku Program</h3></div>
    <div class="kad-isi">
      <div class="ib-medan"><label for="ib-buku">Link Google Drive</label><input type="text" id="ib-buku" placeholder="https://drive.google.com/file/d/…/view"></div>
      <p class="hint" style="margin:0">Pastikan fail Drive dikongsi <strong>"Sesiapa yang mempunyai pautan"</strong>. Muncul pada hari majlis sahaja.</p>
    </div>
  </div>
  <div class="kad">
    <div class="kad-kepala"><h3>💬 Group WhatsApp selepas bancian</h3>
      <div class="kanan"><label class="ib-suis"><input type="checkbox" id="ib-wa-on"><span id="ib-wa-lbl">OFF</span></label></div></div>
    <div class="kad-isi">
      <div class="ib-medan"><label for="ib-wa-url">Link group</label><input type="text" id="ib-wa-url" placeholder="https://chat.whatsapp.com/…"></div>
      <div class="ib-medan"><label for="ib-wa-teks">Teks atas butang</label><input type="text" id="ib-wa-teks" placeholder="Sertai group WhatsApp ibu bapa untuk makluman terkini majlis."></div>
      <p class="hint" style="margin:0">OFF = butang hilang dari telefon ibu bapa (link kekal disimpan).</p>
    </div>
  </div>
  <div class="kad">
    <div class="kad-kepala"><h3>③ 🚪 Masuk Dewan (PIN AJK)</h3></div>
    <div class="kad-isi">
      <div class="ib-dua">
        <div class="ib-medan"><label for="ib-dw-buka">Pas dibuka</label><input type="datetime-local" id="ib-dw-buka"></div>
        <div class="ib-medan"><label for="ib-dw-pin">PIN AJK / guru (4–6 digit)</label><input type="text" id="ib-dw-pin" inputmode="numeric" maxlength="6" autocomplete="off"></div>
      </div>
      <div id="ib-dw-status"></div>
      <p class="hint" style="margin:8px 0 0">Selepas masa ini, telefon ibu bapa yang <strong>sudah daftar</strong> terus tunjuk <strong>Pas Masuk</strong>.
        AJK / guru di pintu taip PIN pada telefon ibu bapa → Sahkan. Masa mesti dalam tempoh ② Pendaftaran Hari Majlis. Kosongkan masa = tiada pas (kelakuan lama).
        PIN tidak dipapar semula selepas disimpan — taip baharu untuk menukar.</p>
    </div>
  </div>
  <div class="kad">
    <div class="kad-kepala"><h3>👥 Had Kehadiran</h3></div>
    <div class="kad-isi">
      <div class="ib-medan"><label for="ib-had">Maksimum orang bagi setiap anak penerima (dewasa + kanak-kanak)</label><input type="number" id="ib-had" min="1" max="20" placeholder="Tiada had"></div>
      <p class="hint" style="margin:0">Cth <strong>2</strong> = 1 anak → 2 orang, 2 anak → 4 orang, 3 anak → 6 orang (bancian &amp; daftar hari majlis). Kosong = tiada had. Admin (✚ Daftar manual / ✎ Ubah) tidak dihadkan.</p>
    </div>
  </div>
</div>

<div class="baris-input" style="margin:2px 0 22px">
  <button class="btn emas" id="ib-simpan">💾 Simpan tetapan</button>
  <span class="hint" id="ib-simpan-st"></span>
</div>

<div class="kad">
  <div class="kad-kepala"><h3>🧪 ID Ujian — cuba apps tanpa murid sebenar</h3></div>
  <div class="kad-isi">
    <div class="baris-input">
      <div class="medan"><label for="ib-u-kp">No. KP ujian (6–12 digit)</label><input type="text" id="ib-u-kp" inputmode="numeric" placeholder="1234567890" style="min-width:160px"></div>
      <div class="medan"><label for="ib-u-nama">Nama murid ujian</label><input type="text" id="ib-u-nama" placeholder="MURID UJIAN 1"></div>
      <div class="medan"><label for="ib-u-darjah">Darjah</label><select id="ib-u-darjah">${['SATU','DUA','TIGA','EMPAT','LIMA','ENAM'].map((d, i) => '<option value="' + d + '"' + (i === 4 ? ' selected' : '') + '>' + (i + 1) + '</option>').join('')}</select></div>
      <div class="medan"><label for="ib-u-kelas">Kelas</label><input type="text" id="ib-u-kelas" value="UJIAN" style="min-width:110px"></div>
      <button class="btn emas kecil" id="ib-u-tambah">＋ Tambah ID ujian</button>
      <a class="btn sunyi kecil" id="ib-u-buka" target="_blank" rel="noopener">🧪 Buka apps mod uji ↗</a>
    </div>
    <div id="ib-u-sandar" style="margin-top:12px"></div>
    <div class="gulung" style="margin-top:12px"><table id="ib-u-jadual"></table></div>
    <p class="hint" style="margin:9px 0 0"><strong>🧪 Mod uji</strong> = tarikh diabaikan; pilih skrin (Bancian / Hari majlis / 🚪 Pas dewan / Belum / Selesai) dari bar oren di atas.
      Lalai <strong>ID ujian sahaja</strong> — keluarga sebenar tidak boleh dibuka atau ditindih. Pilih <strong>⚠ Data SEBENAR</strong> dalam bar untuk menguji keluarga sebenar:
      setiap rekod disandar sebelum ditulis, dan <strong>♻️ Pulihkan</strong> (muncul di sini) mengembalikan semuanya seperti sebelum ujian.</p>
    <p class="hint" style="margin:6px 0 0">ID ujian disimpan berasingan — <strong>tidak</strong> masuk senarai penerima, giliran, tiket atau MC.
      Bancian yang memakai ID ujian <strong>tidak dikira</strong> dalam statistik &amp; CSV. Padam ID = padam bancian ujiannya sekali.</p>
  </div>
</div>

<div class="kad">
  <div class="kad-kepala"><h3>📊 Bancian &amp; Pendaftaran</h3>
    <div class="kanan">
      <span class="hint" style="align-self:center">Klik baris kelas untuk senarai murid</span>
      <button class="btn sunyi kecil" id="ib-muat">🔄 Muat semula</button>
      <button class="btn sunyi kecil" id="ib-csv">⬇ CSV keluarga</button>
      <button class="btn sunyi kecil" id="ib-csv-belum">⬇ CSV belum jawab</button>
      <button class="btn emas kecil" id="ib-hadir">🖨 Senarai Kehadiran</button>
    </div></div>
  <div class="kad-isi">
    <div class="kpi-grid" id="ib-kpi"></div>
    <div class="gulung"><table id="ib-jadual"></table></div>
    <hr style="border:none;border-top:1px solid var(--garis-halus);margin:19px 0">
    <p class="eyebrow">Selepas pilot test / latihan</p>
    <button class="btn sunyi kecil" id="ib-reset-masuk" title="Kosongkan pendaftaran &amp; masuk dewan · bancian kekal">🧹 Reset hari majlis</button>
    <button class="btn bahaya kecil" id="ib-padam">🗑 Padam semua data ibu bapa majlis ini</button>
    <p class="hint" style="margin:8px 0 0">Memadam bancian &amp; pendaftaran sahaja (ID ujian kekal). Penerima, giliran dan tetapan di atas <strong>tidak</strong> disentuh.</p>
  </div>
</div>`;
}

function ibIsiBorang() {
  const c = MAJLIS.ibubapa || {}, t = c.tajuk || {}, w = c.wa || {};
  $('ib-url').textContent = ibLink();
  $('ib-buka').href = ibLink();
  $('ib-u-buka').href = ibLink() + '&uji=1';
  $('ib-sek').value = t.sek || ''; $('ib-sek').placeholder = MAJLIS.sekolah || '';
  $('ib-utama').value = t.utama || ''; $('ib-utama').placeholder = MAJLIS.nama || 'Majlis Anugerah';
  $('ib-info').value = t.info || ''; $('ib-info').placeholder = ibInfoLalai();
  $('ib-alu').value = t.alu || '';
  $('ib-alu').placeholder = (c.bancian && c.bancian.tutup) ? 'Sila sahkan kehadiran sebelum …' : '';
  $('ib-b-buka').value = ibKeInput((c.bancian || {}).buka);
  $('ib-b-tutup').value = ibKeInput((c.bancian || {}).tutup);
  $('ib-d-buka').value = ibKeInput((c.daftar || {}).buka);
  $('ib-d-tutup').value = ibKeInput((c.daftar || {}).tutup);
  $('ib-buku').value = c.buku || '';
  $('ib-wa-on').checked = !!w.on;
  $('ib-wa-url').value = w.url || '';
  $('ib-wa-teks').value = w.teks || '';
  $('ib-had').value = c.had || '';
  const dw = c.dewan || {};
  $('ib-dw-buka').value = ibKeInput(dw.buka);
  $('ib-dw-pin').value = '';
  $('ib-dw-pin').placeholder = dw.pin ? '•••• sudah ditetapkan — taip untuk tukar' : 'Cth 2468';
  ibPratonton();
}
function ibBacaBorang() {
  const v = id => $(id).value.trim();
  return {
    tajuk: { sek: v('ib-sek'), utama: v('ib-utama'), info: v('ib-info'), alu: v('ib-alu') },
    bancian: { buka: ibDariInput(v('ib-b-buka')), tutup: ibDariInput(v('ib-b-tutup')) },
    daftar: { buka: ibDariInput(v('ib-d-buka')), tutup: ibDariInput(v('ib-d-tutup')) },
    buku: v('ib-buku'),
    wa: { on: $('ib-wa-on').checked, url: v('ib-wa-url'), teks: v('ib-wa-teks') },
    had: parseInt(v('ib-had'), 10) || 0,
    /* PIN disimpan sebagai cap SHA-256 sahaja (ibCapPin) — kotak kosong = kekal yang lama */
    dewan: { buka: ibDariInput(v('ib-dw-buka')), pin: ((MAJLIS.ibubapa || {}).dewan || {}).pin || '' }
  };
}
/* 🚪 Cap PIN — SAMA dengan capPin() dalam ibubapa.html. Telefon ibu bapa
   menyemak PIN sendiri (tiada bacaan tambahan pada hari majlis yang sesak).
   Bukan rahsia kukuh: menghalang ibu bapa menekan Sahkan sendiri, bukan
   penggodam (pengguna: tanpa Cloud Functions, 10 Nov 2026). */
async function ibCapPin(pin) {
  const b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode('esis-dewan:' + MAJLIS.id + ':' + pin));
  return Array.from(new Uint8Array(b)).map(x => x.toString(16).padStart(2, '0')).join('');
}
function ibStatusDewan(dw, ada) {
  if (!dw.buka) return '<span class="ib-chip">○ Tiada pas masuk — ibu bapa daftar sendiri seperti biasa</span>';
  if (!ada) return '<span class="ib-chip bahaya">✕ PIN belum ditetapkan</span>';
  if (Date.now() < dw.buka) return '<span class="ib-chip">○ Pas dibuka ' + agEsc(ibTarikh(dw.buka)) + ' · PIN ✓</span>';
  return '<span class="ib-chip ok">● PAS MASUK DIBUKA · PIN ✓</span>';
}
function ibPratonton() {
  const c = ibBacaBorang(), t = c.tajuk;
  const utama = agEsc(t.utama || MAJLIS.nama || 'Majlis Anugerah').replace(/\*([^*]+)\*/g, '<em>$1</em>');
  $('ib-pra').innerHTML = '<div class="s">' + agEsc(t.sek || MAJLIS.sekolah || '') + '</div>' +
    '<div class="u">' + utama + '</div><div class="i">' + agEsc(t.info || ibInfoLalai()) + '</div>';
  $('ib-b-status').innerHTML = ibStatus(c.bancian);
  $('ib-d-status').innerHTML = ibStatus(c.daftar);
  $('ib-dw-status').innerHTML = ibStatusDewan(c.dewan, c.dewan.pin || /^\d{4,6}$/.test($('ib-dw-pin').value.trim()));
  $('ib-wa-lbl').textContent = c.wa.on ? 'ON' : 'OFF';
  $('ib-wa-lbl').style.color = c.wa.on ? '#1F8F55' : '';
}

async function ibSimpan() {
  const c = ibBacaBorang();
  const salah = [];
  [['Bancian', c.bancian], ['Pendaftaran', c.daftar]].forEach(([n, w]) => {
    if (!!w.buka !== !!w.tutup) salah.push(n + ': isi kedua-dua masa buka dan tutup (atau kosongkan kedua-duanya).');
    else if (w.buka && w.tutup <= w.buka) salah.push(n + ': masa tutup mesti selepas masa buka.');
  });
  if (c.buku && !/^https:\/\//i.test(c.buku)) salah.push('Link buku program mesti bermula https://');
  if (c.wa.url && !/^https:\/\/chat\.whatsapp\.com\/\S+/.test(c.wa.url)) salah.push('Link WhatsApp mesti bermula https://chat.whatsapp.com/');
  if (c.wa.on && !c.wa.url) salah.push('WhatsApp ON tetapi link group kosong.');
  if (c.had < 0 || c.had > 20) salah.push('Had kehadiran mesti 1–20, atau kosong (tiada had).');
  const pinBaru = $('ib-dw-pin').value.trim();
  if (pinBaru && !/^\d{4,6}$/.test(pinBaru)) salah.push('PIN masuk dewan mesti 4–6 digit nombor.');
  if (c.dewan.buka && !pinBaru && !c.dewan.pin) salah.push('Masuk dewan: tetapkan PIN AJK.');
  if (c.dewan.buka && (!c.daftar.buka || c.dewan.buka < c.daftar.buka || c.dewan.buka >= c.daftar.tutup))
    salah.push('Masuk dewan: masa pas mesti dalam tempoh ② Pendaftaran Hari Majlis.');
  if (salah.length) { agToast(salah[0], 'ralat'); $('ib-simpan-st').textContent = salah.join(' '); return; }
  const b = $('ib-simpan'); b.disabled = true;
  try {
    if (pinBaru) c.dewan.pin = await ibCapPin(pinBaru);
    await agDb.collection('anugerah_majlis').doc(MAJLIS.id).update({ ibubapa: c });
    MAJLIS.ibubapa = c;
    $('ib-dw-pin').value = '';
    $('ib-dw-pin').placeholder = c.dewan.pin ? '•••• sudah ditetapkan — taip untuk tukar' : 'Cth 2468';
    ibPratonton();
    $('ib-simpan-st').textContent = 'Disimpan ' + new Date().toLocaleTimeString('ms-MY');
    agToast('Tetapan ibu bapa disimpan', 'ok');
  } catch (e) {
    console.error(e);
    agToast('Gagal simpan: ' + e.message, 'ralat');
  } finally { b.disabled = false; }
}

/* ---------- statistik ---------- */
/* Penerima dibaca semula hanya bila 🔄 ditekan — membuka tab memakai
   PENERIMA yang sudah dimuat pilihMajlis (ratusan bacaan dijimatkan). */
async function ibMuat(paksa) {
  memuat($('ib-kpi'), 'Memuatkan bancian…');
  $('ib-jadual').innerHTML = '';
  try {
    const [snap, pen, uji, sandar] = await Promise.all([
      agDb.collection('anugerah_ibubapa').where('majlisId', '==', MAJLIS.id).get(),
      paksa === true || !PENERIMA.length ? agMuatPenerima(MAJLIS.id) : PENERIMA,
      agDb.collection('anugerah_ibubapa_uji').where('majlisId', '==', MAJLIS.id).get(),
      agDb.collection('anugerah_ibubapa_ujisandar').where('majlisId', '==', MAJLIS.id).get()
    ]);
    IB_KEL = snap.docs.map(d => ({ docId: d.id, ...d.data() }));
    IB_UJI = uji.docs.map(d => ({ docId: d.id, ...d.data() }));
    IB_SANDAR = sandar.docs.map(d => ({ docId: d.id, ...d.data() }));
    PENERIMA = pen;
    ibLukisUji();
    ibLukisStat();
  } catch (e) {
    console.error(e);
    kosong($('ib-kpi'), 'Gagal memuatkan: ' + e.message);
  }
}
/* 🎤/🙈 (10 Nov 2026, pengguna) — peraturan SAMA dengan link petugas
   (agPenerimaPentas + agTapisPenerimaPetugas): murid yang tiada satu pun
   anugerah naik pentas & tidak disorok, DISOROK dari tab ini (KPI, jadual,
   senarai kelas, CSV). Paparan sahaja — doc keluarga tidak diubah, jadi
   bila admin buka semula sub itu murid & keluarganya kembali. */
function ibKpSorok() {
  const pentas = agSubPentas(MAJLIS), sorok = agSubSorok(MAJLIS), set = new Set();
  PENERIMA.forEach(p => {
    if (agAdalahLuar(p) || !p.no_kp) return;
    if (!(p.anugerah || []).some(x => pentas.has(x.subId) && !sorok.has(x.subId))) set.add(p.no_kp);
  });
  return set;
}
function ibMuridPenerima() {
  const sk = ibKpSorok();
  return PENERIMA.filter(p => !agAdalahLuar(p) && p.no_kp && !sk.has(p.no_kp));
}
/* Keluarga ujian (ada anak ID ujian) tidak dikira dalam statistik/CSV sebenar.
   Anak tersorok dibuang dari SALINAN; keluarga yang semua anaknya tersorok
   tidak dikira. Tulisan admin memakai docId, bukan salinan ini. */
const ibKelAsli = () => IB_KEL.filter(k => !k.ujian);
function ibSebenar() {
  const sk = ibKpSorok();
  return ibKelAsli().map(k => {
    const m = (k.murid || []).filter(a => !sk.has(a.kp));
    return m.length === (k.murid || []).length ? k : (m.length ? { ...k, murid: m } : null);
  }).filter(Boolean);
}
function ibPetaAnak() {
  const m = {};
  ibKelAsli().forEach(k => (k.murid || []).forEach(a => { m[a.kp] = k; }));
  return m;
}
function ibLukisStat() {
  const murid = ibMuridPenerima(), peta = ibPetaAnak();
  const KEL = ibSebenar();
  const hadirK = KEL.filter(k => k.hadir !== false);
  const orang = hadirK.reduce((j, k) => j + (k.dewasa || 0) + (k.kanak || 0), 0);
  const daftarK = KEL.filter(k => k.daftar && k.daftar.bil);
  const orangDaftar = daftarK.reduce((j, k) => j + (k.daftar.bil || 0), 0);
  const jawab = murid.filter(p => peta[p.no_kp]).length;
  const walk = KEL.filter(k => k.sumber === 'walkin').length;
  const masukK = KEL.filter(k => k.masuk), dw = (MAJLIS.ibubapa || {}).dewan || {};
  const orangMasuk = masukK.reduce((j, k) => j + ((k.masuk.bil) || 0), 0);
  const kpi = (angka, label, kecil, kls) => '<div class="kpi ' + (kls || '') + '"><div class="angka">' + angka +
    '</div><div class="label">' + label + '</div>' + (kecil ? '<div class="kecil">' + kecil + '</div>' : '') + '</div>';
  $('ib-kpi').innerHTML =
    kpi(KEL.length, 'Keluarga jawab', jawab + ' dari ' + murid.length + ' murid penerima' +
      (IB_KEL.length > ibKelAsli().length ? ' · 🧪 ' + (IB_KEL.length - ibKelAsli().length) + ' ujian tidak dikira' : '') +
      (ibKelAsli().length > KEL.length ? ' · 🙈 ' + (ibKelAsli().length - KEL.length) + ' disorok (anak tidak naik pentas)' : '')) +
    kpi(orang, 'Orang dijangka hadir', hadirK.length + ' keluarga hadir · ' + (KEL.length - hadirK.length) + ' tidak', 'ok') +
    kpi(orangDaftar, 'Sudah daftar (hari majlis)', daftarK.length + ' keluarga' + (walk ? ' · ' + walk + ' walk-in' : ''), 'ok') +
    kpi(murid.length - jawab, 'Murid belum jawab', 'ibu bapa belum isi bancian', murid.length - jawab ? 'bahaya' : '') +
    (dw.buka || masukK.length ? kpi(orangMasuk, '🚪 Masuk dewan', masukK.length + ' dari ' + daftarK.length + ' keluarga berdaftar', 'ok') : '');

  /* Per kelas dikira ikut ANAK (bukan keluarga): keluarga dengan adik di
     kelas lain tidak boleh dikira dua kali dalam jumlah orang — sebab
     itu bilangan orang hanya dalam KPI di atas. Kunci = darjah + kelas
     (nama kelas berulang merentas darjah). */
  const kum = {};
  murid.forEach(p => {
    const kunci = agDarjahKelas(p.tahun, p.kelas) || '—';
    const r = kum[kunci] = kum[kunci] || { kelas: kunci, d: agWordDarjah(p.tahun), pen: 0, jawab: 0, hadir: 0, tidak: 0, daftar: 0 };
    r.pen++;
    const k = peta[p.no_kp];
    if (k) { r.jawab++; if (k.hadir !== false) r.hadir++; else r.tidak++; if (k.daftar && k.daftar.bil) r.daftar++; }
  });
  const baris = Object.values(kum).sort((a, b) => a.d - b.d || a.kelas.localeCompare(b.kelas));
  const jum = baris.reduce((j, r) => { ['pen', 'jawab', 'hadir', 'tidak', 'daftar'].forEach(k => j[k] += r[k]); return j; },
    { pen: 0, jawab: 0, hadir: 0, tidak: 0, daftar: 0 });
  const td = (n, merah) => '<td class="n' + (merah && n ? ' ib-merah' : '') + '">' + n + '</td>';
  $('ib-jadual').innerHTML = baris.length ?
    '<thead><tr><th>Kelas</th><th class="n">Murid penerima</th><th class="n">Sudah jawab</th><th class="n">Akan hadir</th>' +
    '<th class="n">Tidak hadir</th><th class="n">Belum jawab</th><th class="n">Daftar hari majlis</th></tr></thead><tbody>' +
    baris.map(r => '<tr class="ib-klik" data-ib-kelas="' + agEsc(r.kelas) + '" title="Klik untuk senarai murid"><td><strong>' + agEsc(r.kelas) + '</strong> ›</td>' + td(r.pen) + td(r.jawab) + td(r.hadir) + td(r.tidak) +
      td(r.pen - r.jawab, true) + td(r.daftar) + '</tr>').join('') + '</tbody>' +
    '<tfoot><tr class="ib-klik" data-ib-kelas="*" title="Klik untuk semua murid"><td>JUMLAH ›</td>' + td(jum.pen) + td(jum.jawab) + td(jum.hadir) + td(jum.tidak) + td(jum.pen - jum.jawab, true) + td(jum.daftar) + '</tr></tfoot>'
    : '<tbody><tr><td>Tiada murid penerima dalam majlis ini.</td></tr></tbody>';
}

/* KP & telefon dibalut ="…" supaya Excel tidak membuang sifar di hadapan
   (0123… → 123…) atau menukar KP 12 digit kepada 1.5E+11. */
const ibTeks = s => (s ? '="' + s + '"' : '');
function ibCSV() {
  if (!ibSebenar().length) { agToast('Tiada bancian untuk dimuat turun', 'ralat'); return; }
  const r = [['TELEFON', 'NAMA WAKIL', 'KP WAKIL', 'ANAK', 'KELAS', 'STATUS', 'DEWASA', 'KANAK-KANAK', 'JUMLAH',
    'DAFTAR (ORANG)', 'MASA DAFTAR', 'SUMBER', 'DIHANTAR', 'MASUK DEWAN']];
  ibSebenar().sort((a, b) => ibP((a.wakil || {}).nama).localeCompare(ibP((b.wakil || {}).nama))).forEach(k => {
    const d = k.daftar || {}, mD = ibMasa(d.masa), mH = ibMasa(k.dihantar);
    r.push([ibTeks(k.telefon), (k.wakil || {}).nama, ibTeks((k.wakil || {}).kp),
      (k.murid || []).map(a => a.nama).join(' | '),
      (k.murid || []).map(a => agDarjahKelas(a.tahun, a.kelas)).join(' | '),
      k.hadir !== false ? 'HADIR' : 'TIDAK HADIR', k.dewasa || 0, k.kanak || 0, (k.dewasa || 0) + (k.kanak || 0),
      d.bil || '', mD ? mD.toLocaleString('ms-MY') : '', ({ walkin: 'WALK-IN', admin: 'ADMIN' })[k.sumber] || 'BANCIAN',
      mH ? mH.toLocaleString('ms-MY') : '',
      k.masuk && ibMasa(k.masuk.masa) ? ibMasa(k.masuk.masa).toLocaleString('ms-MY') : '']);
  });
  agMuatTurunCSV(r, 'ibubapa-' + ibFail() + '.csv');
}
function ibCSVBelum() {
  const peta = ibPetaAnak();
  const belum = ibMuridPenerima().filter(p => !peta[p.no_kp])
    .sort((a, b) => agWordDarjah(a.tahun) - agWordDarjah(b.tahun) || ibP(a.kelas).localeCompare(ibP(b.kelas)) || ibP(a.nama).localeCompare(ibP(b.nama)));
  if (!belum.length) { agToast('Semua ibu bapa sudah jawab', 'ok'); return; }
  const r = [['DARJAH', 'KELAS', 'NAMA MURID', 'NO KP']];
  belum.forEach(p => r.push([agWordDarjah(p.tahun) || p.tahun, agDarjahKelas(p.tahun, p.kelas), p.nama, ibTeks(p.no_kp)]));
  agMuatTurunCSV(r, 'ibubapa-belum-jawab-' + ibFail() + '.csv');
}

/* ==========================================================================
   SENARAI MURID SATU KELAS — klik baris jadual (5 Nov 2026)
   --------------------------------------------------------------------------
   Sudah/belum daftar per murid + tindakan admin: ✅ Daftar · ✚ Daftar manual
   (tiada bancian) · ✎ Ubah · ✕ Batal daftar · 🗑 Padam bancian.
   🔴 Satu doc SEKELUARGA: tindakan pada seorang murid mengenai adik-beradiknya
      juga (kelas lain). Baris menyebutnya supaya admin tidak terkejut.
   🔴 Telefon = id doc keluarga, jadi TIDAK boleh diubah di sini (ibu bapa
      sendiri boleh, melalui Ubah bancian — doc lama dipadam di sana).
   🔴 Data ujian (🧪) tidak dipapar — ia bukan murid penerima.
   ========================================================================== */
let IBM = null;   // { kunci, tapis, cari, borang:{kp, mod} }

function ibmBuka(kunci) {
  IBM = { kunci, tapis: 'semua', cari: '', borang: null };
  const lapis = bukaModal('<div class="kad-kepala"><h3 id="ibm-tajuk"></h3>' +
    '<button class="b-tutup" data-ibm="tutup" aria-label="Tutup">×</button></div>' +
    '<div class="kad-isi" id="ibm-isi"></div>', 'luas');
  lapis.addEventListener('click', ibmKlik);
  lapis.addEventListener('input', e => {
    if (e.target.id === 'ibm-cari') { IBM.cari = e.target.value; ibmLukis(true); }
  });
  ibmLukis();
}
function ibmMurid() {
  const peta = ibPetaAnak();
  return ibMuridPenerima()
    .filter(p => IBM.kunci === '*' || (agDarjahKelas(p.tahun, p.kelas) || '—') === IBM.kunci)
    .map(p => ({ p, k: peta[p.no_kp] || null }))
    .sort((a, b) => ibP(a.p.nama).localeCompare(ibP(b.p.nama)));
}
const ibmDaftar = k => !!(k && k.daftar && k.daftar.bil);
const IBM_TAPIS = [
  ['semua', 'Semua', () => true],
  ['daftar', '✅ Sudah daftar', r => ibmDaftar(r.k)],
  ['belum', 'Belum daftar', r => !ibmDaftar(r.k)],
  ['tiada', 'Belum jawab bancian', r => !r.k],
  ['tidak', 'Tidak hadir', r => r.k && r.k.hadir === false],
  ['masuk', '🚪 Sudah masuk', r => !!(r.k && r.k.masuk)]
];
function ibmLukis(kekalCari) {
  if (!IBM || !$('ibm-isi')) return;
  const semua = ibmMurid();
  const t = (IBM_TAPIS.find(x => x[0] === IBM.tapis) || IBM_TAPIS[0])[2];
  const q = IBM.cari.trim().toUpperCase();
  const rows = semua.filter(t).filter(r => !q || ibP(r.p.nama).toUpperCase().includes(q) || ibP(r.p.no_kp).includes(q));
  const dft = semua.filter(r => ibmDaftar(r.k));
  $('ibm-tajuk').textContent = (IBM.kunci === '*' ? 'Semua kelas' : IBM.kunci) + ' · ' + dft.length + ' / ' + semua.length + ' murid sudah daftar · ' +
    dft.reduce((j, r) => j + (r.k.daftar.bil || 0), 0) + ' orang';
  const chip = IBM_TAPIS.map(([id, lbl, f]) => '<button class="ibm-chip' + (IBM.tapis === id ? ' on' : '') + '" data-ibm="tapis" data-v="' + id + '">' +
    lbl + ' (' + semua.filter(f).length + ')</button>').join(' ');
  const kepala = '<div class="baris-input" style="align-items:center;margin-bottom:12px">' + chip +
    '<input type="text" id="ibm-cari" placeholder="Cari nama / KP…" style="margin-left:auto;min-width:180px" value="' + agEsc(IBM.cari) + '"></div>';
  const badan = rows.length ? rows.map(ibmBaris).join('') : '<tr><td colspan="6" class="hint">Tiada murid.</td></tr>';
  const html = kepala + '<div class="gulung"><table><thead><tr><th>Nama murid</th>' + (IBM.kunci === '*' ? '<th>Kelas</th>' : '') +
    '<th>Wakil · telefon</th><th>Bancian</th><th>Daftar hari majlis</th><th></th></tr></thead><tbody>' + badan + '</tbody></table></div>';
  if (kekalCari && $('ibm-cari')) {   // jangan musnahkan kotak carian semasa menaip
    $('ibm-isi').querySelector('tbody').innerHTML = badan;
    $('ibm-isi').querySelectorAll('[data-ibm=tapis]').forEach((b, i) => {
      b.textContent = IBM_TAPIS[i][1] + ' (' + semua.filter(IBM_TAPIS[i][2]).length + ')';
    });
  } else $('ibm-isi').innerHTML = html;
}
function ibmBaris(r) {
  const { p, k } = r, kp = p.no_kp, sem = IBM.kunci === '*';
  const adik = k ? (k.murid || []).filter(m => m.kp !== kp) : [];
  const banc = !k ? '<span class="hint">Belum jawab</span>' :
    (k.hadir !== false ? 'Hadir · ' + ((k.dewasa || 0) + (k.kanak || 0)) + ' orang' : '<span class="ib-merah">Tidak hadir</span>') +
    (k.sumber === 'walkin' ? ' <span class="hint">(walk-in)</span>' : k.sumber === 'admin' ? ' <span class="hint">(admin)</span>' : '');
  const d = k && k.daftar, m = d && ibMasa(d.masa);
  const dft = ibmDaftar(k) ? '<span class="ibm-ok">✅ ' + d.bil + ' orang</span>' +
    (m ? ' <span class="hint">' + agEsc(m.toLocaleTimeString('ms-MY', { hour: 'numeric', minute: '2-digit' })) +
      (d.oleh === 'admin' ? ' · admin' : '') + '</span>' : '') : '—';
  const mk = k && k.masuk, mm = mk && ibMasa(mk.masa);
  const msk = mk ? '<div class="ibm-ok">🚪 masuk' + (mm ? ' ' + agEsc(mm.toLocaleTimeString('ms-MY', { hour: 'numeric', minute: '2-digit' })) : '') +
    (mk.oleh === 'admin' ? ' <span class="hint">· admin</span>' : '') + '</div>' : '';
  const btn = (aksi, lbl, kls) => '<button class="btn ' + (kls || 'sunyi') + ' kecil" data-ibm="' + aksi + '" data-kp="' + agEsc(kp) + '">' + lbl + '</button>';
  const aksi = !k ? btn('baru', '✚ Daftar manual', 'emas')
    : (ibmDaftar(k) ? (k.masuk ? btn('batalMasuk', '✕ Batal masuk') : btn('masuk', '🚪 Sahkan masuk', 'emas')) + ' ' +
                      btn('ubah', '✎ Ubah') + ' ' + btn('batal', '✕ Batal daftar')
                    : btn('daftar', '✅ Daftar', 'emas') + ' ' + btn('ubah', '✎ Ubah'));
  const kol = sem ? 6 : 5;
  return '<tr><td><strong>' + agEsc(p.nama) + '</strong>' +
    (adik.length ? '<div class="hint">+ adik-beradik: ' + adik.map(a => agEsc(agDarjahKelas(a.tahun, a.kelas))).join(', ') + '</div>' : '') + '</td>' +
    (sem ? '<td>' + agEsc(agDarjahKelas(p.tahun, p.kelas)) + '</td>' : '') +
    '<td>' + (k ? agEsc((k.wakil || {}).nama || '') + '<div class="hint">' + agEsc(k.telefon || '') + '</div>' : '—') + '</td>' +
    '<td>' + banc + '</td><td>' + dft + msk + '</td><td style="white-space:nowrap">' + aksi + '</td></tr>' +
    (IBM.borang && IBM.borang.kp === kp ? '<tr class="ibm-borang"><td colspan="' + kol + '">' + ibmBorang(IBM.borang.mod, k) + '</td></tr>' : '');
}
function ibmBorang(mod, k) {
  const f = (id, lbl, v, attr) => '<div class="ib-medan"><label for="' + id + '">' + lbl + '</label><input type="text" id="' + id + '" value="' + agEsc(v == null ? '' : v) + '"' + (attr || '') + '></div>';
  const n = (id, lbl, v, min) => '<div class="ib-medan"><label for="' + id + '">' + lbl + '</label><input type="number" id="' + id + '" min="' + min + '" max="20" value="' + agEsc(v) + '"></div>';
  const kaki = (lbl) => '<div style="display:flex;gap:8px;align-items:end"><button class="btn emas kecil" data-ibm="simpan">' + lbl + '</button>' +
    '<button class="btn sunyi kecil" data-ibm="tutupBorang">Batal</button></div>';
  if (mod === 'baru') return '<div class="ibm-g">' +
    f('ibm-nama', 'Nama wakil *', '') + f('ibm-tel', 'No. telefon *', '', ' inputmode="tel"') +
    f('ibm-wkp', 'No. KP wakil', '', ' inputmode="numeric"') + n('ibm-bil', 'Bilangan hadir *', 1, 1) + kaki('✅ Daftar') + '</div>' +
    '<p class="hint" style="margin:8px 0 0">Tiada bancian — keluarga baharu dicipta dan terus berdaftar. Jika no. telefon sudah ada bancian, murid ini digabung ke keluarga itu.</p>';
  const jum = k.hadir !== false ? (k.dewasa || 0) + (k.kanak || 0) : 0;
  if (mod === 'daftar') return '<div class="ibm-g">' + n('ibm-bil', 'Bilangan hadir hari ini *', (k.daftar && k.daftar.bil) || jum || 1, 1) + kaki('✅ Daftar') + '</div>';
  const w = k.wakil || {};
  return '<div class="ibm-g">' + f('ibm-nama', 'Nama wakil', w.nama) + f('ibm-wkp', 'No. KP wakil', w.kp, ' inputmode="numeric"') +
    '<div class="ib-medan"><label for="ibm-hadir">Bancian</label><select id="ibm-hadir"><option value="1"' + (k.hadir !== false ? ' selected' : '') +
      '>Hadir</option><option value="0"' + (k.hadir === false ? ' selected' : '') + '>Tidak hadir</option></select></div>' +
    n('ibm-dewasa', 'Dewasa', k.dewasa || 0, 0) + n('ibm-kanak', 'Kanak-kanak', k.kanak || 0, 0) +
    f('ibm-bil', 'Daftar (orang) — kosong = belum', (k.daftar && k.daftar.bil) || '', ' inputmode="numeric"') + kaki('💾 Simpan') + '</div>' +
    '<p class="hint" style="margin:8px 0 0">Telefon <strong>' + agEsc(k.telefon) + '</strong> tidak boleh diubah di sini (ibu bapa boleh, melalui Ubah bancian). ' +
    ((k.murid || []).length > 1 ? 'Perubahan mengenai <strong>' + k.murid.length + ' anak</strong> dalam keluarga ini. ' : '') +
    '<button class="btn bahaya kecil" data-ibm="padamKel" data-kp="' + agEsc(IBM.borang.kp) + '" style="margin-left:6px">🗑 Padam bancian keluarga</button></p>';
}

async function ibmKlik(e) {
  const b = e.target.closest('[data-ibm]');
  if (!b) return;
  const aksi = b.dataset.ibm, kp = b.dataset.kp;
  if (aksi === 'tutup') { tutupModal(); IBM = null; return; }
  if (aksi === 'tapis') { IBM.tapis = b.dataset.v; IBM.borang = null; return ibmLukis(); }
  if (aksi === 'tutupBorang') { IBM.borang = null; return ibmLukis(); }
  if (['baru', 'daftar', 'ubah'].includes(aksi)) { IBM.borang = { kp, mod: aksi }; ibmLukis(); const f = $('ibm-isi').querySelector('.ibm-borang input'); if (f) f.focus(); return; }
  const k = kp ? ibPetaAnak()[kp] : null;
  if (aksi === 'batal') {
    if (!confirm('Batal pendaftaran keluarga ' + ((k.wakil || {}).nama || k.telefon) + '?\nBancian (bilangan dijangka) kekal.')) return;
    return ibmTulis(b, () => agDb.collection('anugerah_ibubapa').doc(k.docId).update({ daftar: null }), 'Pendaftaran dibatalkan');
  }
  /* 🚪 sandaran admin — telefon ibu bapa rosak / habis bateri di pintu dewan */
  if (aksi === 'masuk')
    return ibmTulis(b, () => agDb.collection('anugerah_ibubapa').doc(k.docId)
      .update({ masuk: { masa: new Date(), bil: (k.daftar && k.daftar.bil) || 1, oleh: 'admin' } }), 'Disahkan masuk dewan');
  if (aksi === 'batalMasuk') {
    if (!confirm('Batal "masuk dewan" keluarga ' + ((k.wakil || {}).nama || k.telefon) + '?\nPendaftaran kekal.')) return;
    return ibmTulis(b, () => agDb.collection('anugerah_ibubapa').doc(k.docId).update({ masuk: null }), 'Masuk dewan dibatalkan');
  }
  if (aksi === 'padamKel') {
    const kp2 = b.dataset.kp, k2 = ibPetaAnak()[kp2];
    if (!confirm('Padam bancian keluarga ' + ((k2.wakil || {}).nama || k2.telefon) + ' (' + (k2.murid || []).length + ' anak)?\nIbu bapa perlu isi semula.')) return;
    const bt = agDb.batch();
    bt.delete(agDb.collection('anugerah_ibubapa').doc(k2.docId));
    (k2.murid || []).forEach(m => bt.delete(agDb.collection('anugerah_ibubapa_kp').doc(MAJLIS.id + '__' + m.kp)));
    IBM.borang = null;
    return ibmTulis(b, () => bt.commit(), 'Bancian keluarga dipadam');
  }
  if (aksi === 'simpan') return ibmSimpan(b);
}

async function ibmSimpan(b) {
  const { kp, mod } = IBM.borang, k = ibPetaAnak()[kp];
  const v = id => ($(id) ? $(id).value.trim() : '');
  const bil = parseInt(v('ibm-bil'), 10);
  const masa = new Date();
  if (mod === 'daftar') {
    if (!(bil >= 1)) return agToast('Bilangan hadir mesti sekurang-kurangnya 1', 'ralat');
    return ibmTulis(b, () => agDb.collection('anugerah_ibubapa').doc(k.docId)
      .update({ daftar: { bil, masa, oleh: 'admin' }, hadir: true, dikemaskini: masa }), 'Didaftar · ' + bil + ' orang');
  }
  if (mod === 'ubah') {
    const dewasa = parseInt(v('ibm-dewasa'), 10) || 0, kanak = parseInt(v('ibm-kanak'), 10) || 0;
    const hadir = v('ibm-hadir') === '1';
    if (v('ibm-bil') && !(bil >= 1)) return agToast('Daftar (orang) mesti nombor ≥ 1, atau kosong', 'ralat');
    if (hadir && dewasa < 1) return agToast('Hadir: dewasa sekurang-kurangnya 1', 'ralat');
    const daftar = v('ibm-bil') ? { bil, masa: (k.daftar && k.daftar.masa) || masa, oleh: (k.daftar && k.daftar.oleh) || 'admin' } : null;
    return ibmTulis(b, () => agDb.collection('anugerah_ibubapa').doc(k.docId).update({
      wakil: { nama: v('ibm-nama').toUpperCase(), kp: v('ibm-wkp').replace(/\D/g, '') },
      hadir, dewasa: hadir ? dewasa : 0, kanak: hadir ? kanak : 0, daftar, dikemaskini: masa
    }), 'Disimpan');
  }
  /* baru: tiada bancian → cipta keluarga (atau gabung ke no. telefon sedia ada) */
  const nama = v('ibm-nama').toUpperCase().replace(/\s+/g, ' ');
  let tel = v('ibm-tel').replace(/\D/g, '');
  if (tel.startsWith('60')) tel = tel.slice(1);
  if (nama.length < 3) return agToast('Isi nama wakil', 'ralat');
  if (!/^0\d{8,10}$/.test(tel)) return agToast('No. telefon tidak sah (cth 0123456789)', 'ralat');
  if (!(bil >= 1)) return agToast('Bilangan hadir mesti sekurang-kurangnya 1', 'ralat');
  const p = ibMuridPenerima().find(x => x.no_kp === kp);
  const anak = { kp, nama: ibP(p.nama).toUpperCase(), tahun: p.tahun || '', kelas: p.kelas || '' };
  const ref = agDb.collection('anugerah_ibubapa').doc(MAJLIS.id + '__' + tel);
  return ibmTulis(b, async () => {
    const ada = await ref.get();
    const bt = agDb.batch();
    if (ada.exists) {
      const x = ada.data();
      bt.update(ref, { murid: (x.murid || []).filter(m => m.kp !== kp).concat([anak]),
        daftar: { bil, masa, oleh: 'admin' }, hadir: true, dikemaskini: masa });
    } else {
      bt.set(ref, { majlisId: MAJLIS.id, telefon: tel, wakil: { nama, kp: v('ibm-wkp').replace(/\D/g, '') },
        murid: [anak], hadir: true, dewasa: bil, kanak: 0, sumber: 'admin', ujian: false,
        daftar: { bil, masa, oleh: 'admin' }, dihantar: masa, dikemaskini: masa });
    }
    bt.set(agDb.collection('anugerah_ibubapa_kp').doc(MAJLIS.id + '__' + kp), { majlisId: MAJLIS.id, no_kp: kp, telefon: tel });
    await bt.commit();
    if (ada.exists) agToast('No. telefon ini sudah ada bancian — murid digabung ke keluarga itu', 'ok');
  }, 'Didaftar · ' + bil + ' orang');
}

/* Tulis → baca semula keluarga (satu pertanyaan) → lukis semula jadual & modal. */
async function ibmTulis(btn, kerja, mesej) {
  btn.disabled = true;
  try {
    await kerja();
    const snap = await agDb.collection('anugerah_ibubapa').where('majlisId', '==', MAJLIS.id).get();
    IB_KEL = snap.docs.map(d => ({ docId: d.id, ...d.data() }));
    if (IBM) IBM.borang = null;
    ibLukisStat(); ibLukisUji(); ibmLukis();
    agToast(mesej, 'ok');
  } catch (e) {
    console.error(e);
    agToast('Gagal: ' + e.message, 'ralat');
    btn.disabled = false;
  }
}

/* ---------- 🧪 ID ujian ---------- */
/* ♻️ Mod uji dengan data SEBENAR menyandar setiap doc sebelum ia ditulis
   (salinan pertama = keadaan sebelum ujian). Pulihkan = tulis semula doc
   asal (atau padam doc yang dicipta semasa ujian) melalui REST dengan
   medan MENTAH — jenis (timestamp, integer) kekal tepat. */
function ibLukisSandar() {
  const el = $('ib-u-sandar');
  if (!IB_SANDAR.length) { el.innerHTML = ''; return; }
  const kel = IB_SANDAR.filter(x => /^anugerah_ibubapa\//.test(x.laluan)).length;
  el.innerHTML = '<div class="nota ralat" style="margin:0"><span class="sym">⚠</span><div><strong>Ujian data SEBENAR belum dipulihkan</strong> — ' +
    IB_SANDAR.length + ' rekod disandar (' + kel + ' keluarga). Statistik di bawah termasuk perubahan ujian.' +
    '<div style="margin-top:8px"><button class="btn emas kecil" id="ib-pulih">♻️ Pulihkan data seperti sebelum ujian</button></div></div></div>';
  $('ib-pulih').onclick = ibPulih;
}
async function ibPulih() {
  const snap = await agDb.collection('anugerah_ibubapa_ujisandar').where('majlisId', '==', MAJLIS.id).get();
  if (!snap.size) { agToast('Tiada sandaran ujian', 'ok'); return ibMuat(); }
  const taip = prompt('Pulihkan ' + snap.size + ' rekod kepada keadaan SEBELUM ujian?\n\n' +
    'Perubahan ibu bapa sebenar pada rekod yang sama sejak ujian bermula juga akan dikembalikan.\n\nTaip PULIH untuk mengesahkan.');
  if (taip !== 'PULIH') { if (taip !== null) agToast('Dibatalkan', 'ralat'); return; }
  const o = firebase.app().options, akar = 'projects/' + o.projectId + '/databases/(default)/documents';
  const writes = [];
  snap.docs.forEach(d => {
    const x = d.data(), nama = akar + '/' + x.laluan;
    writes.push(x.ada ? { update: { name: nama, fields: JSON.parse(x.data || '{}') } } : { delete: nama });
    writes.push({ delete: akar + '/anugerah_ibubapa_ujisandar/' + d.id });
  });
  try {
    for (let i = 0; i < writes.length; i += 400) {
      const r = await fetch('https://firestore.googleapis.com/v1/' + akar + ':commit?key=' + o.apiKey, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ writes: writes.slice(i, i + 400) })
      });
      if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error?.message || 'HTTP ' + r.status);
    }
    agToast(snap.size + ' rekod dipulihkan', 'ok');
  } catch (e) { agToast('Gagal pulih: ' + e.message, 'ralat'); }
  ibMuat();
}
function ibLukisUji() {
  ibLukisSandar();
  const el = $('ib-u-jadual');
  if (!IB_UJI.length) { el.innerHTML = '<tbody><tr><td class="hint">Tiada ID ujian.</td></tr></tbody>'; return; }
  const kelOf = kp => IB_KEL.find(k => (k.murid || []).some(m => m.kp === kp));
  el.innerHTML = '<thead><tr><th>No. KP ujian</th><th>Nama</th><th>Kelas</th><th>Bancian</th><th></th></tr></thead><tbody>' +
    IB_UJI.slice().sort((a, b) => ibP(a.no_kp).localeCompare(ibP(b.no_kp))).map(u => {
      const k = kelOf(u.no_kp);
      const st = !k ? '—' : (k.daftar && k.daftar.bil ? '✅ Daftar ' + k.daftar.bil + ' orang' :
        (k.hadir !== false ? 'Hadir ' + ((k.dewasa || 0) + (k.kanak || 0)) + ' orang' : 'Tidak hadir')) + ' · ' + agEsc(k.telefon);
      return '<tr><td style="font-family:ui-monospace,Menlo,monospace">' + agEsc(u.no_kp) + '</td><td>' + agEsc(u.nama) +
        '</td><td>' + agEsc(agDarjahKelas(u.tahun, u.kelas)) + '</td><td>' + st + '</td>' +
        '<td><button class="btn bahaya kecil" data-ib-uji-padam="' + agEsc(u.no_kp) + '">🗑 Padam</button></td></tr>';
    }).join('') + '</tbody>';
}
async function ibUjiTambah() {
  const kp = $('ib-u-kp').value.replace(/\D/g, '');
  const nama = ($('ib-u-nama').value.trim() || 'MURID UJIAN ' + (IB_UJI.length + 1)).toUpperCase();
  const tahun = $('ib-u-darjah').value, kelas = ($('ib-u-kelas').value.trim() || 'UJIAN').toUpperCase();
  if (!/^\d{6,12}$/.test(kp)) { agToast('No. KP ujian mesti 6–12 digit', 'ralat'); return; }
  if (IB_UJI.some(u => u.no_kp === kp)) { agToast('ID ujian ini sudah ada', 'ralat'); return; }
  /* KP murid sebenar tidak boleh dijadikan ID ujian — carian ibu bapa
     memilih penerima dahulu, jadi ID itu tidak akan pernah dipakai. */
  if (PENERIMA.some(p => p.no_kp === kp)) { agToast('KP ini milik murid penerima sebenar — guna nombor lain', 'ralat'); return; }
  const b = $('ib-u-tambah'); b.disabled = true;
  try {
    await agDb.collection('anugerah_ibubapa_uji').doc(MAJLIS.id + '__' + kp)
      .set({ majlisId: MAJLIS.id, no_kp: kp, nama, tahun, kelas, dibina: firebase.firestore.FieldValue.serverTimestamp() });
    IB_UJI.push({ majlisId: MAJLIS.id, no_kp: kp, nama, tahun, kelas });
    $('ib-u-kp').value = ''; $('ib-u-nama').value = '';
    ibLukisUji();
    agToast('ID ujian ' + kp + ' ditambah', 'ok');
  } catch (e) { agToast('Gagal: ' + e.message, 'ralat'); }
  finally { b.disabled = false; }
}
/* Padam ID + indeksnya + bancian ujiannya. Keluarga yang tinggal anak lain
   dikemas kini (anak ini dibuang), bukan dipadam. */
async function ibUjiPadam(kp) {
  if (!confirm('Padam ID ujian ' + kp + ' beserta bancian ujiannya?')) return;
  const b = agDb.batch(), pfx = MAJLIS.id + '__';
  b.delete(agDb.collection('anugerah_ibubapa_uji').doc(pfx + kp));
  b.delete(agDb.collection('anugerah_ibubapa_kp').doc(pfx + kp));
  IB_KEL.filter(k => (k.murid || []).some(m => m.kp === kp)).forEach(k => {
    const baki = (k.murid || []).filter(m => m.kp !== kp);
    const ref = agDb.collection('anugerah_ibubapa').doc(k.docId);
    if (baki.length) b.update(ref, { murid: baki, ujian: baki.some(m => m.ujian) });
    else b.delete(ref);
  });
  try { await b.commit(); agToast('ID ujian ' + kp + ' dipadam', 'ok'); ibMuat(); }
  catch (e) { agToast('Gagal padam: ' + e.message, 'ralat'); }
}

/* 🔴 Taip PADAM, bukan confirm() — sama dengan reset penerima. */
/* 🧹 Reset hari majlis (selepas latihan): kosongkan `daftar` + `masuk`; bancian kekal.
   Keluarga yang wujud HANYA kerana didaftar hari itu (walk-in / tambah admin, tiada
   bancian) dipadam bersama indeks anaknya — jika dibiarkan ia kekal sebagai bancian palsu.
   Jawapan "tidak hadir" yang ditukar ke hadir semasa daftar tidak dapat dipulihkan. */
async function ibResetMasuk() {
  const [kel, idx] = await Promise.all([
    agDb.collection('anugerah_ibubapa').where('majlisId', '==', MAJLIS.id).get(),
    agDb.collection('anugerah_ibubapa_kp').where('majlisId', '==', MAJLIS.id).get()
  ]);
  const hariItu = d => { const x = d.data(); return x.sumber === 'walkin' || x.sumber === 'admin'; };
  const padam = kel.docs.filter(hariItu);
  const kosong = kel.docs.filter(d => !hariItu(d) && (d.data().daftar || d.data().masuk));
  const nDaftar = kosong.filter(d => d.data().daftar).length;
  const nMasuk = kosong.filter(d => d.data().masuk).length;
  if (!padam.length && !kosong.length) { agToast('Tiada data hari majlis untuk direset', 'ok'); return; }
  const telPadam = new Set(padam.map(d => d.data().telefon));
  const idxPadam = idx.docs.filter(d => telPadam.has(d.data().telefon));
  const taip = prompt('Reset hari majlis?\n\n' +
    '• ' + nDaftar + ' pendaftaran + ' + nMasuk + ' masuk dewan dikosongkan (bancian kekal)\n' +
    '• ' + padam.length + ' keluarga walk-in / tambah admin (tiada bancian) dipadam\n\n' +
    'Taip RESET untuk mengesahkan.');
  if (taip !== 'RESET') { if (taip !== null) agToast('Dibatalkan', 'ralat'); return; }
  const ops = kosong.map(d => b => b.update(d.ref, { daftar: null, masuk: null }))
    .concat(padam.concat(idxPadam).map(d => b => b.delete(d.ref)));
  try {
    for (let i = 0; i < ops.length; i += 400) {
      const b = agDb.batch();
      ops.slice(i, i + 400).forEach(f => f(b));
      await b.commit();
    }
    agToast('Hari majlis direset · ' + kosong.length + ' dikosongkan, ' + padam.length + ' walk-in dipadam', 'ok');
    ibMuat();
  } catch (e) { agToast('Gagal reset: ' + e.message, 'ralat'); }
}
async function ibPadamSemua() {
  const [kel, idx] = await Promise.all([
    agDb.collection('anugerah_ibubapa').where('majlisId', '==', MAJLIS.id).get(),
    agDb.collection('anugerah_ibubapa_kp').where('majlisId', '==', MAJLIS.id).get()
  ]);
  if (!kel.size && !idx.size) { agToast('Tiada data ibu bapa untuk dipadam', 'ralat'); return; }
  const taip = prompt('Padam ' + kel.size + ' bancian keluarga (termasuk pendaftaran hari majlis)?\n\nTIADA UNDO. Taip PADAM untuk mengesahkan.');
  if (taip !== 'PADAM') { if (taip !== null) agToast('Dibatalkan', 'ralat'); return; }
  const refs = kel.docs.concat(idx.docs).map(d => d.ref);
  try {
    for (let i = 0; i < refs.length; i += 400) {
      const b = agDb.batch();
      refs.slice(i, i + 400).forEach(r => b.delete(r));
      await b.commit();
    }
    agToast(kel.size + ' bancian dipadam', 'ok');
    ibMuat();
  } catch (e) { agToast('Gagal padam: ' + e.message, 'ralat'); }
}

/* ==========================================================================
   📲 PANDUAN & QR — hari majlis (11 Nov 2026)
   --------------------------------------------------------------------------
   Untuk dihantar ke group WhatsApp ibu bapa: Panduan PDF (saiz telefon),
   Poster QR (PNG) dan teks WhatsApp. Semua dibaca dari tetapan majlis
   yang SUDAH DISIMPAN — majlis seterusnya terus betul tanpa ubah kod.
   🔴 SATU PELUKIS kanvas untuk pratonton, PNG dan halaman PDF.
   🔴 Langkah mengikut aliran sebenar ibubapa.html (vUtama → vDaftarTel →
      vDaftarKel → vPas/vDaftarSiap → vGiliran). Ubah aliran di sana =
      kemas kini langkah di sini.
   ========================================================================== */
const IBP_W = 1080, IBP_H = 1920;
const IBP_WARNA = { emas: '#C6A867', emasTua: '#8C6D33', gading: '#FAF7F0', garis: '#E7E0D0', teks: '#1B1B20', kelabu: '#6B6A70', hijau: '#1F8F55' };
const IBP_SERIF = 'Georgia, "Times New Roman", serif', IBP_SANS = 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';

function ibpSkrip(src, ada) {
  if (ada()) return Promise.resolve();
  return new Promise((ok, gagal) => {
    const s = document.createElement('script');
    s.src = src; s.onload = ok; s.onerror = () => gagal(new Error('Gagal memuat ' + src));
    document.head.appendChild(s);
  });
}
const ibpSedia = () => Promise.all([
  ibpSkrip('https://cdnjs.cloudflare.com/ajax/libs/qrcode-generator/1.4.4/qrcode.min.js', () => window.qrcode),
  ibpSkrip('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js', () => window.jspdf)
]);

/* Maklumat majlis dari tetapan tersimpan. */
function ibpMaklumat() {
  const c = MAJLIS.ibubapa || {}, t = c.tajuk || {};
  const baris = ibBarisMajlis().filter(x => !/BAJU|PAKAIAN|MAKLUMAT|NOTA/i.test(ibP(x.label)));
  return {
    sek: t.sek || MAJLIS.sekolah || '',
    utama: ibP(t.utama || MAJLIS.nama || 'Majlis Anugerah').replace(/\*/g, ''),
    info: t.info || ibInfoLalai(),
    baris: baris.slice(0, 4),
    daftar: c.daftar || {}, dewan: (c.dewan || {}).buka ? c.dewan : null,
    buku: !!c.buku, link: ibLink()
  };
}
const ibpJam = ms => new Date(ms).toLocaleTimeString('ms-MY', { hour: 'numeric', minute: '2-digit' }).replace(/\b(am|pm)\b/gi, x => x.toUpperCase());
const ibpHari = ms => new Date(ms).toLocaleDateString('ms-MY', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

/* ---------- alat lukis ---------- */
function ibpBalut(ctx, teks, lebar) {
  const keluar = [];
  ibP(teks).split('\n').forEach(p => {
    let b = '';
    p.split(/\s+/).forEach(k => {
      const cuba = b ? b + ' ' + k : k;
      if (ctx.measureText(cuba).width > lebar && b) { keluar.push(b); b = k; } else b = cuba;
    });
    keluar.push(b);
  });
  return keluar;
}
/* Tulis teks berbalut, pulang y selepas baris terakhir. */
function ibpTeks(ctx, teks, x, y, o) {
  ctx.font = o.font; ctx.fillStyle = o.warna || IBP_WARNA.teks; ctx.textAlign = o.align || 'center';
  ctx.letterSpacing = o.jarak || '0px'; ctx.textBaseline = 'alphabetic';
  const baris = ibpBalut(ctx, teks, o.lebar || 900);
  baris.forEach((b, i) => ctx.fillText(b, x, y + i * o.tinggi));
  ctx.letterSpacing = '0px';
  return y + baris.length * o.tinggi;
}
function ibpSegi(ctx, x, y, w, h, r, isi, garis, tebal) {
  ctx.beginPath(); ctx.roundRect(x, y, w, h, r);
  if (isi) { ctx.fillStyle = isi; ctx.fill(); }
  if (garis) { ctx.strokeStyle = garis; ctx.lineWidth = tebal || 2; ctx.stroke(); }
}
function ibpGarisEmas(ctx, y, x1, x2) {
  const g = ctx.createLinearGradient(x1, 0, x2, 0);
  g.addColorStop(0, 'rgba(198,168,103,0)'); g.addColorStop(.5, IBP_WARNA.emas); g.addColorStop(1, 'rgba(198,168,103,0)');
  ctx.fillStyle = g; ctx.fillRect(x1, y, x2 - x1, 2);
}
function ibpQR(ctx, teks, x, y, saiz) {
  const q = window.qrcode(0, 'M'); q.addData(teks); q.make();
  const n = q.getModuleCount(), m = saiz / (n + 8);
  ctx.fillStyle = '#fff'; ctx.fillRect(x, y, saiz, saiz);
  ctx.fillStyle = IBP_WARNA.teks;
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++)
    if (q.isDark(r, c)) ctx.fillRect(Math.floor(x + (c + 4) * m), Math.floor(y + (r + 4) * m), Math.ceil(m), Math.ceil(m));
}
function ibpKanvas(w, h) {
  const k = document.createElement('canvas'); k.width = w; k.height = h;
  const ctx = k.getContext('2d');
  ctx.fillStyle = IBP_WARNA.gading; ctx.fillRect(0, 0, w, h);
  return [k, ctx];
}
/* Kepala majlis (sekolah + tajuk) — pulang y bawah. */
function ibpKepala(ctx, M, y, w) {
  const cx = w / 2;
  ctx.font = '64px ' + IBP_SANS; ctx.textAlign = 'center'; ctx.fillText('🏆', cx, y + 60);
  y += 120;
  if (M.sek) y = ibpTeks(ctx, M.sek.toUpperCase(), cx, y, { font: '700 26px ' + IBP_SANS, warna: IBP_WARNA.emasTua, jarak: '6px', tinggi: 36, lebar: w - 160 }) + 14;
  y = ibpTeks(ctx, M.utama, cx, y + 40, { font: '600 62px ' + IBP_SERIF, tinggi: 74, lebar: w - 160 });
  ibpGarisEmas(ctx, y + 8, w * .2, w * .8);
  return y + 40;
}

/* ---------- skrin telefon contoh ---------- */
/* Rangka telefon; `isi(ctx, x, y, w)` melukis kandungan dari atas. */
function ibpTelefon(ctx, x, y, w, h, isi) {
  ctx.save();
  ctx.shadowColor = 'rgba(27,27,32,.18)'; ctx.shadowBlur = 40; ctx.shadowOffsetY = 14;
  ibpSegi(ctx, x, y, w, h, 56, IBP_WARNA.teks);
  ctx.restore();
  ibpSegi(ctx, x + 14, y + 14, w - 28, h - 28, 44, IBP_WARNA.gading);
  ibpSegi(ctx, x + w / 2 - 70, y + 26, 140, 26, 13, IBP_WARNA.teks);
  ctx.save(); ctx.beginPath(); ctx.roundRect(x + 14, y + 14, w - 28, h - 28, 44); ctx.clip();
  isi(ctx, x + 50, y + 90, w - 100);
  ctx.restore();
}
const ibpT = {
  kecil(ctx, x, y, w, t) { return ibpTeks(ctx, t, x + w / 2, y + 26, { font: '700 20px ' + IBP_SANS, warna: IBP_WARNA.emasTua, jarak: '4px', tinggi: 28, lebar: w }); },
  tajuk(ctx, x, y, w, t) { return ibpTeks(ctx, t, x + w / 2, y + 44, { font: '600 38px ' + IBP_SERIF, tinggi: 46, lebar: w }) + 10; },
  label(ctx, x, y, w, t) { return ibpTeks(ctx, t.toUpperCase(), x, y + 22, { font: '700 18px ' + IBP_SANS, warna: IBP_WARNA.kelabu, align: 'left', jarak: '2px', tinggi: 24, lebar: w }) + 8; },
  medan(ctx, x, y, w, t, diisi) {
    ibpSegi(ctx, x, y, w, 76, 16, '#fff', IBP_WARNA.garis, 2);
    ibpTeks(ctx, t, x + 24, y + 48, { font: (diisi ? '600 ' : '') + '28px ' + IBP_SANS, warna: diisi ? IBP_WARNA.teks : '#A9A7AE', align: 'left', tinggi: 30, lebar: w - 48 });
    return y + 96;
  },
  butang(ctx, x, y, w, t, jenis, sorot) {
    const isi = jenis === 'garis' ? '#fff' : jenis === 'hijau' ? IBP_WARNA.hijau : IBP_WARNA.emas;
    ibpSegi(ctx, x, y, w, 84, 18, isi, jenis === 'garis' ? IBP_WARNA.garis : null, 2);
    ibpTeks(ctx, t, x + w / 2, y + 54, { font: '700 30px ' + IBP_SANS, warna: jenis === 'garis' ? IBP_WARNA.teks : '#fff', tinggi: 32, lebar: w - 30 });
    if (sorot) ibpSorot(ctx, x - 10, y - 10, w + 20, 104);
    return y + 104;
  },
  menu(ctx, x, y, w, ikon, t, s, sorot) {
    ibpSegi(ctx, x, y, w, 120, 20, '#fff', IBP_WARNA.garis, 2);
    ctx.font = '44px ' + IBP_SANS; ctx.textAlign = 'center'; ctx.fillText(ikon, x + 64, y + 76);
    ibpTeks(ctx, t, x + 120, y + 54, { font: '700 30px ' + IBP_SANS, align: 'left', tinggi: 32, lebar: w - 150 });
    ibpTeks(ctx, s, x + 120, y + 90, { font: '22px ' + IBP_SANS, warna: IBP_WARNA.kelabu, align: 'left', tinggi: 26, lebar: w - 150 });
    if (sorot) ibpSorot(ctx, x - 10, y - 10, w + 20, 140);
    return y + 140;
  },
  nota(ctx, x, y, w, t) { return ibpTeks(ctx, t, x + w / 2, y + 26, { font: '22px ' + IBP_SANS, warna: IBP_WARNA.kelabu, tinggi: 30, lebar: w }) + 14; },
  /* Tiket: bilangan besar + baris kaki */
  tiket(ctx, x, y, w, atas, besar, bawah, kaki, warna) {
    const h = 300 + kaki.length * 46;
    ibpSegi(ctx, x, y, w, h, 26, '#fff', IBP_WARNA.garis, 2);
    ctx.fillStyle = warna || IBP_WARNA.emas; ctx.fillRect(x + 30, y, w - 60, 4);
    ibpTeks(ctx, atas.toUpperCase(), x + w / 2, y + 58, { font: '700 20px ' + IBP_SANS, warna: warna || IBP_WARNA.emasTua, jarak: '4px', tinggi: 26, lebar: w - 40 });
    ibpTeks(ctx, besar, x + w / 2, y + 170, { font: '600 104px ' + IBP_SERIF, warna: warna || IBP_WARNA.teks, tinggi: 104, lebar: w - 40 });
    ibpTeks(ctx, bawah, x + w / 2, y + 220, { font: '22px ' + IBP_SANS, warna: IBP_WARNA.kelabu, tinggi: 26, lebar: w - 40 });
    ctx.setLineDash([8, 8]); ctx.strokeStyle = IBP_WARNA.garis; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(x + 24, y + 252); ctx.lineTo(x + w - 24, y + 252); ctx.stroke(); ctx.setLineDash([]);
    kaki.forEach(([l, v], i) => {
      const yy = y + 296 + i * 46;
      ibpTeks(ctx, l, x + 34, yy, { font: '22px ' + IBP_SANS, warna: IBP_WARNA.kelabu, align: 'left', tinggi: 26, lebar: w });
      ibpTeks(ctx, v, x + w - 34, yy, { font: '700 22px ' + IBP_SANS, align: 'right', tinggi: 26, lebar: w });
    });
    return y + h + 20;
  }
};
/* Bulatan merah "tekan di sini" */
function ibpSorot(ctx, x, y, w, h) {
  ibpSegi(ctx, x, y, w, h, 24, null, '#D9443A', 5);
  ctx.font = '54px ' + IBP_SANS; ctx.textAlign = 'center'; ctx.fillText('👆', x + w - 20, y + h + 30);
}

/* ---------- halaman panduan (1080×1920) ---------- */
function ibpHalaman(M, langkah, jumlah, tajuk, ket, telefon, kaki) {
  const [k, ctx] = ibpKanvas(IBP_W, IBP_H), cx = IBP_W / 2;
  ibpTeks(ctx, 'LANGKAH ' + langkah + ' / ' + jumlah, cx, 110, { font: '700 26px ' + IBP_SANS, warna: IBP_WARNA.emasTua, jarak: '8px', tinggi: 30 });
  ibpSegi(ctx, cx - 56, 140, 112, 112, 56, IBP_WARNA.emas);
  ibpTeks(ctx, String(langkah), cx, 222, { font: '600 70px ' + IBP_SERIF, warna: '#fff', tinggi: 70 });
  let y = ibpTeks(ctx, tajuk, cx, 336, { font: '600 64px ' + IBP_SERIF, tinggi: 74, lebar: 940 });
  y = ibpTeks(ctx, ket, cx, y + 20, { font: '32px ' + IBP_SANS, warna: IBP_WARNA.kelabu, tinggi: 44, lebar: 900 });
  const tTel = 1100, yTel = Math.min(y + 40, IBP_H - tTel - 240);
  ibpTelefon(ctx, cx - 300, yTel, 600, tTel, telefon);
  if (kaki) {
    ibpSegi(ctx, 90, IBP_H - 200, IBP_W - 180, 140, 24, '#fff', IBP_WARNA.garis, 2);
    ibpTeks(ctx, kaki, cx, IBP_H - 146, { font: '28px ' + IBP_SANS, tinggi: 38, lebar: IBP_W - 260 });
  }
  ibpTeks(ctx, M.utama, cx, IBP_H - 24, { font: '20px ' + IBP_SANS, warna: '#A9A7AE', tinggi: 24, lebar: 980 });
  return k;
}
/* Kepala mini dalam skrin telefon contoh */
function ibpKepalaMini(ctx, M, x, y, w) {
  ctx.font = '40px ' + IBP_SANS; ctx.textAlign = 'center'; ctx.fillText('🏆', x + w / 2, y + 40);
  y += 56;
  if (M.sek) y = ibpT.kecil(ctx, x, y, w, M.sek.toUpperCase());
  y = ibpTeks(ctx, M.utama, x + w / 2, y + 44, { font: '600 34px ' + IBP_SERIF, tinggi: 40, lebar: w });
  ibpGarisEmas(ctx, y + 4, x + w * .15, x + w * .85);
  return y + 36;
}

function ibpSemuaHalaman(M) {
  const pas = !!M.dewan, J = 5;
  const H = [];
  /* 0 — kulit */
  {
    const [k, ctx] = ibpKanvas(IBP_W, IBP_H), cx = IBP_W / 2;
    let y = ibpKepala(ctx, M, 120, IBP_W);
    y = ibpTeks(ctx, 'Panduan Pendaftaran', cx, y + 64, { font: '600 66px ' + IBP_SERIF, tinggi: 76 });
    y = ibpTeks(ctx, 'Hari Majlis', cx, y, { font: 'italic 600 66px ' + IBP_SERIF, warna: IBP_WARNA.emasTua, tinggi: 76 });
    y = ibpTeks(ctx, 'Panduan ringkas untuk ibu bapa & penjaga', cx, y + 10, { font: '30px ' + IBP_SANS, warna: IBP_WARNA.kelabu, tinggi: 40 });
    const maklumat = M.baris.map(b => b.label + ': ' + b.nilai);
    if (M.daftar.buka) maklumat.push('Pendaftaran dibuka: ' + ibpJam(M.daftar.buka) + ', ' + ibpHari(M.daftar.buka));
    if (maklumat.length) {
      const hk = 60 + maklumat.length * 52;
      ibpSegi(ctx, 110, y + 40, IBP_W - 220, hk, 26, '#fff', IBP_WARNA.garis, 2);
      maklumat.forEach((m, i) => ibpTeks(ctx, m, cx, y + 104 + i * 52, { font: '30px ' + IBP_SANS, tinggi: 36, lebar: IBP_W - 280 }));
      y += 40 + hk;
    }
    /* Baris langkah ringkas + kaki dilabuh ke bawah; QR mengisi ruang yang tinggal. */
    const sq = Math.max(240, Math.min(440, IBP_H - 400 - (y + 40)));
    ibpQR(ctx, M.link, cx - sq / 2, y + 40, sq);
    ibpTeks(ctx, 'Imbas QR atau tekan link dalam group WhatsApp', cx, y + sq + 90, { font: '700 28px ' + IBP_SANS, tinggi: 36, lebar: 900 });
    const ringkas = ['Buka link', 'Daftar', 'Semak', pas ? 'Pas masuk' : 'Tunjuk AJK', 'Giliran'];
    const lb = (IBP_W - 120) / ringkas.length, yr = IBP_H - 250;
    ringkas.forEach((r, i) => {
      const x = 60 + lb * i + lb / 2;
      ibpSegi(ctx, x - 34, yr, 68, 68, 34, IBP_WARNA.emas);
      ibpTeks(ctx, String(i + 1), x, yr + 48, { font: '700 32px ' + IBP_SANS, warna: '#fff', tinggi: 32 });
      ibpTeks(ctx, r, x, yr + 106, { font: '24px ' + IBP_SANS, tinggi: 28, lebar: lb - 10 });
    });
    ibpTeks(ctx, 'Leret untuk langkah seterusnya ›', cx, IBP_H - 50, { font: '26px ' + IBP_SANS, warna: IBP_WARNA.kelabu, tinggi: 30 });
    H.push(k);
  }
  /* 1 — buka link */
  H.push(ibpHalaman(M, 1, J, 'Buka link majlis',
    'Guna link yang sama semasa anda mengisi bancian. Pada hari majlis, tekan "Daftar Kehadiran".',
    (ctx, x, y, w) => {
      y = ibpKepalaMini(ctx, M, x, y, w);
      if (M.baris.length) {
        const hk = 40 + M.baris.length * 62;
        ibpSegi(ctx, x, y, w, hk, 20, '#fff', IBP_WARNA.garis, 2);
        M.baris.forEach((b, i) => {
          ibpTeks(ctx, b.label.toUpperCase(), x + 26, y + 46 + i * 62, { font: '700 16px ' + IBP_SANS, warna: IBP_WARNA.kelabu, align: 'left', jarak: '2px', tinggi: 20, lebar: w - 50 });
          ibpTeks(ctx, b.nilai, x + 26, y + 72 + i * 62, { font: '600 22px ' + IBP_SANS, align: 'left', tinggi: 26, lebar: w - 50 });
        });
        y += hk + 26;
      }
      ibpT.menu(ctx, x, y, w, '📝', 'Daftar Kehadiran', 'Guna no. telefon bancian', true);
    },
    '💡 Belum ada link? Imbas QR di muka depan panduan ini.'));
  /* 2 — no. telefon */
  H.push(ibpHalaman(M, 2, J, 'Masukkan no. telefon',
    'Taip no. telefon yang anda guna semasa mengisi bancian, kemudian tekan "Cari".',
    (ctx, x, y, w) => {
      y = ibpT.kecil(ctx, x, y, w, 'PENDAFTARAN');
      y = ibpT.tajuk(ctx, x, y, w, 'Daftar Kehadiran') + 30;
      y = ibpT.label(ctx, x, y, w, '📞 No. telefon (semasa bancian)');
      y = ibpT.medan(ctx, x, y, w, '0123456789', true);
      y = ibpT.butang(ctx, x, y + 10, w, '🔍 Cari', 'emas', true) + 30;
      ibpGarisEmas(ctx, y, x, x + w);
      y = ibpT.nota(ctx, x, y + 20, w, 'Tidak isi bancian atau guna telefon lain?');
      ibpTeks(ctx, 'Cari dengan No. KP anak →', x + w / 2, y + 26, { font: '700 24px ' + IBP_SANS, warna: IBP_WARNA.emasTua, tinggi: 28, lebar: w });
    },
    '🙋 Tidak isi bancian? Tekan "Cari dengan No. KP anak".'));
  /* 3 — semak & daftar */
  H.push(ibpHalaman(M, 3, J, 'Semak & tekan Daftar',
    'Nama anak dan bilangan hadir (ikut bancian anda) dipaparkan. Semak, kemudian tekan "Daftar".',
    (ctx, x, y, w) => {
      y = ibpT.kecil(ctx, x, y, w, 'PENDAFTARAN');
      y = ibpT.tajuk(ctx, x, y, w, 'Keluarga anda') + 20;
      ['NAMA ANAK PERTAMA', 'NAMA ANAK KEDUA'].forEach((n, i) => {
        ibpSegi(ctx, x, y, w, 96, 18, '#fff', IBP_WARNA.garis, 2);
        ibpTeks(ctx, n, x + 26, y + 44, { font: '700 24px ' + IBP_SANS, align: 'left', tinggi: 28, lebar: w - 50 });
        ibpTeks(ctx, (i ? '3' : '6') + ' KELAS', x + 26, y + 76, { font: '20px ' + IBP_SANS, warna: IBP_WARNA.kelabu, align: 'left', tinggi: 24, lebar: w - 50 });
        y += 112;
      });
      y = ibpT.nota(ctx, x, y, w, 'Wakil: NAMA IBU / BAPA');
      ibpSegi(ctx, x, y, w, 190, 22, '#fff', IBP_WARNA.emas, 2);
      ibpTeks(ctx, 'BILANGAN HADIR', x + w / 2, y + 40, { font: '700 18px ' + IBP_SANS, warna: IBP_WARNA.emasTua, jarak: '3px', tinggi: 22 });
      ibpTeks(ctx, '2', x + w / 2, y + 128, { font: '600 84px ' + IBP_SERIF, tinggi: 84 });
      ibpTeks(ctx, 'orang · ikut bancian anda', x + w / 2, y + 168, { font: '20px ' + IBP_SANS, warna: IBP_WARNA.kelabu, tinggi: 24 });
      y += 214;
      y = ibpT.nota(ctx, x, y, w, 'Bilangan salah? Sila jumpa AJK di kaunter pendaftaran.');
      ibpT.butang(ctx, x, y + 10, w, '✓ Daftar', 'emas', true);
    },
    '👨‍👩‍👧 Bilangan salah, atau bancian "tidak hadir"? Jumpa AJK di kaunter.'));
  /* 4 — pas masuk / sudah berdaftar */
  H.push(pas
    ? ibpHalaman(M, 4, J, 'Tunjuk pas di pintu dewan',
      'Skrin Pas Masuk Dewan muncul sendiri' + (M.dewan.buka ? ' mulai ' + ibpJam(M.dewan.buka) : '') + '. Serahkan telefon kepada AJK di pintu — AJK akan masukkan PIN.',
      (ctx, x, y, w) => {
        y = ibpKepalaMini(ctx, M, x, y, w);
        y = ibpT.tiket(ctx, x, y, w, 'Pas Masuk Dewan', '2', 'orang · tunjuk kepada AJK di pintu dewan',
          [['Penjaga', 'Nama Ibu / Bapa'], ['Status', 'Belum masuk']]);
        y = ibpT.label(ctx, x, y, w, '🔑 PIN AJK / guru');
        y = ibpT.medan(ctx, x, y, w, 'Diisi oleh AJK di pintu dewan');
        ibpT.butang(ctx, x, y + 6, w, '✓ Sahkan Masuk', 'emas', true);
      },
      '🔒 PIN diisi oleh AJK sahaja. Selepas disahkan, skrin bertukar hijau — boleh masuk.')
    : ibpHalaman(M, 4, J, 'Tunjuk skrin ini kepada AJK',
      'Selepas daftar, skrin "Sudah Berdaftar" muncul. Tunjukkan kepada AJK sebelum masuk dewan.',
      (ctx, x, y, w) => {
        y = ibpKepalaMini(ctx, M, x, y, w);
        ibpT.tiket(ctx, x, y, w, 'Sudah Berdaftar', '✓', 'Terima kasih kerana hadir',
          [['Penjaga', 'Nama Ibu / Bapa'], ['Hadir', '2 orang'], ['Daftar', '7:45 PG']]);
      },
      '📱 Buka semula link bila-bila masa — skrin ini muncul semula sendiri.'));
  /* 5 — semasa majlis */
  H.push(ibpHalaman(M, 5, J, 'Semak giliran anak',
    'Semasa majlis, tekan "Semak Giliran Anak" untuk tahu bila anak anda naik pentas.' + (M.buku ? ' Buku Program juga dibuka selepas daftar.' : ''),
    (ctx, x, y, w) => {
      y = ibpKepalaMini(ctx, M, x, y, w);
      y = ibpT.tiket(ctx, x, y, w, 'Disahkan Masuk', '✓', 'Selamat datang', [['Penjaga', 'Nama Ibu / Bapa'], ['Hadir', '2 orang']], IBP_WARNA.hijau);
      y = ibpT.butang(ctx, x, y, w, '⏰ Teruskan ke giliran anak', 'emas', true);
      if (M.buku) ibpT.butang(ctx, x, y + 10, w, '📖 Buku Program', 'garis');
    },
    '🔴 Butang merah "Ada kemas kini" muncul? Tekan untuk nombor giliran terkini.'));
  return H;
}

/* ---------- poster QR (1080×1350, sesuai WhatsApp) ---------- */
function ibpPoster(M) {
  const W = 1080, Hh = 1350, [k, ctx] = ibpKanvas(W, Hh), cx = W / 2;
  ctx.strokeStyle = IBP_WARNA.emas; ctx.lineWidth = 3; ctx.strokeRect(36, 36, W - 72, Hh - 72);
  let y = ibpKepala(ctx, M, 50, W);
  if (M.info) y = ibpTeks(ctx, M.info, cx, y + 10, { font: '30px ' + IBP_SANS, warna: IBP_WARNA.kelabu, tinggi: 40, lebar: W - 200 });
  y = ibpTeks(ctx, 'Imbas untuk daftar kehadiran', cx, y + 60, { font: '700 40px ' + IBP_SANS, tinggi: 48, lebar: W - 200 });
  const sq = Math.max(320, Math.min(560, Hh - y - 250));
  ibpSegi(ctx, cx - sq / 2 - 16, y + 24, sq + 32, sq + 32, 28, '#fff', IBP_WARNA.emas, 3);
  ibpQR(ctx, M.link, cx - sq / 2, y + 40, sq);
  y += sq + 110;
  if (M.daftar.buka) y = ibpTeks(ctx, 'Pendaftaran dibuka ' + ibpJam(M.daftar.buka) + ' · ' + ibpHari(M.daftar.buka), cx, y, { font: '28px ' + IBP_SANS, tinggi: 36, lebar: W - 200 });
  ibpTeks(ctx, 'Guna no. telefon yang sama semasa bancian', cx, y + 8, { font: '24px ' + IBP_SANS, warna: IBP_WARNA.kelabu, tinggi: 30, lebar: W - 200 });
  return k;
}

/* ---------- teks WhatsApp ---------- */
function ibpTeksWA(M) {
  const b = M.baris.map(x => '▪️ ' + x.label + ': ' + x.nilai);
  return [
    '*' + M.utama.toUpperCase() + '*', M.sek, '',
    'Assalamualaikum & salam sejahtera ibu bapa / penjaga.', '',
    ...b, b.length ? '' : null,
    '📝 *Pendaftaran kehadiran hari majlis*' + (M.daftar.buka ? ' dibuka ' + ibpJam(M.daftar.buka) + ', ' + ibpHari(M.daftar.buka) : ''),
    '1️⃣ Buka link: ' + M.link,
    '2️⃣ Tekan *Daftar Kehadiran*, masukkan no. telefon semasa bancian → *Cari*',
    '3️⃣ Semak nama anak & bilangan hadir → *Daftar*',
    M.dewan ? '4️⃣ Di pintu dewan, tunjuk *Pas Masuk Dewan* — AJK akan sahkan' : '4️⃣ Tunjuk skrin *Sudah Berdaftar* kepada AJK',
    '5️⃣ Semasa majlis, tekan *Semak Giliran Anak* untuk tahu bila anak naik pentas', '',
    'Tidak isi bancian? Tekan *Cari dengan No. KP anak* atau jumpa AJK di kaunter.',
    'Panduan bergambar (PDF) dilampirkan. Terima kasih 🙏'
  ].filter(x => x !== null).join('\n');
}

/* ---------- modal ---------- */
async function ibPanduan() {
  const lapis = bukaModal('<div class="kad-kepala"><h3>📲 Panduan & QR — hari majlis</h3>' +
    '<button class="b-tutup" data-ibp="tutup" aria-label="Tutup">×</button></div>' +
    '<div class="kad-isi" id="ibp-isi"><p class="hint">Memuatkan…</p></div>', 'luas');
  lapis.querySelector('[data-ibp="tutup"]').onclick = tutupModal;
  try { await ibpSedia(); }
  catch (e) { $('ibp-isi').innerHTML = '<p class="hint">Gagal memuat pustaka (semak internet): ' + agEsc(e.message) + '</p>'; return; }
  const M = ibpMaklumat(), d = M.daftar;
  const amaran = [];
  if (!d.buka || !d.tutup) amaran.push('② Pendaftaran Hari Majlis belum ditetapkan — link akan papar "tertutup" pada hari majlis.');
  if (!M.dewan) amaran.push('🚪 Pas masuk dewan tidak ditetapkan — langkah 4 = "Tunjuk skrin kepada AJK".');
  const H = ibpSemuaHalaman(M), poster = ibpPoster(M);
  $('ibp-isi').innerHTML =
    '<p class="hint" style="margin-top:0">Dibina dari tetapan yang <strong>sudah disimpan</strong>. Ubah tetapan → 💾 Simpan → buka semula modal ini.</p>' +
    amaran.map(a => '<p class="hint" style="color:var(--absen)">⚠ ' + agEsc(a) + '</p>').join('') +
    '<div style="display:flex;gap:10px;overflow-x:auto;padding:6px 0 12px" id="ibp-pra"></div>' +
    '<div class="baris-input">' +
    '<button class="btn emas kecil" id="ibp-pdf">⬇ Panduan PDF (' + H.length + ' halaman)</button>' +
    '<button class="btn sunyi kecil" id="ibp-png">⬇ Poster QR (PNG)</button>' +
    '<button class="btn sunyi kecil" id="ibp-salin">📋 Salin teks WhatsApp</button></div>' +
    '<textarea id="ibp-wa" rows="14" style="width:100%;margin-top:12px;font:13px/1.5 ui-monospace,Menlo,monospace">' + agEsc(ibpTeksWA(M)) + '</textarea>' +
    '<p class="hint" style="margin:6px 0 0">Teks boleh diubah di sini sebelum disalin. Di WhatsApp: hantar poster + PDF, kemudian tampal teks.</p>';
  [poster].concat(H).forEach(k => {
    const img = new Image(); img.src = k.toDataURL('image/jpeg', .8);
    img.style.cssText = 'height:300px;border:1px solid var(--garis);border-radius:8px;flex:none';
    $('ibp-pra').appendChild(img);
  });
  const nama = 'Panduan-Hari-Majlis-' + ibFail();
  $('ibp-pdf').onclick = () => {
    const pdf = new window.jspdf.jsPDF({ unit: 'mm', format: [108, 192], orientation: 'portrait' });
    H.forEach((k, i) => { if (i) pdf.addPage([108, 192], 'portrait'); pdf.addImage(k.toDataURL('image/jpeg', .9), 'JPEG', 0, 0, 108, 192); });
    pdf.save(nama + '.pdf');
  };
  $('ibp-png').onclick = () => {
    const a = document.createElement('a'); a.href = poster.toDataURL('image/png'); a.download = 'Poster-QR-' + ibFail() + '.png'; a.click();
  };
  $('ibp-salin').onclick = async () => {
    try { await navigator.clipboard.writeText($('ibp-wa').value); agToast('Teks WhatsApp disalin', 'ok'); }
    catch (e) { $('ibp-wa').select(); agToast('Tekan Ctrl+C untuk salin', 'ralat'); }
  };
}

/* ==========================================================================
   🖨 SENARAI KEHADIRAN IBU BAPA — selepas majlis (11 Nov 2026)
   --------------------------------------------------------------------------
   Satu baris SEKELUARGA (anak-anak dalam satu sel) — bilangan hadir dikira
   sekali, bukan setiap anak. Susunan ikut MASA DAFTAR (pengguna); yang tidak
   hadir di bawah, ikut kelas → nama. PDF (dialog cetak) dan Excel (.xlsx)
   membaca SATU enjin (ibKehadiran) supaya dua fail tidak boleh berbeza.
   🔴 Ringkasan dikira atas SEMUA data, bukan baris yang ditapis.
   🔴 Bancian "tidak hadir" yang kemudian didaftar: `hadir` sudah ditulis
      true semasa daftar, jadi dikenal daripada dewasa+kanak = 0.
   ========================================================================== */
const IBK_TAPIS = { hadir: 'Hadir sahaja', semua: 'Semua murid penerima', tidak: 'Tidak hadir sahaja' };

function ibKehadiran(tapis) {
  const KEL = ibSebenar(), murid = ibMuridPenerima(), peta = ibPetaAnak();
  const penerimaKp = new Set(murid.map(p => p.no_kp));
  const sudah = k => !!(k.daftar && k.daftar.bil);
  const orangB = k => (k.dewasa || 0) + (k.kanak || 0);
  const jam = x => { const m = ibMasa(x); return m ? m.toLocaleTimeString('ms-MY', { hour: 'numeric', minute: '2-digit' }) : ''; };
  const penuh = x => { const m = ibMasa(x); return m ? m.toLocaleString('ms-MY') : ''; };
  const kelasAnak = a => agDarjahKelas(a.tahun, a.kelas);
  const bancianTeks = k => k.sumber === 'walkin' ? 'Walk-in' : k.sumber === 'admin' ? 'Daftar admin'
    : orangB(k) > 0 ? orangB(k) + ' orang' : 'Tidak hadir';

  const baris = KEL.map(k => ({
    hadir: sudah(k), masaMs: sudah(k) ? (ibMasa(k.daftar.masa) || new Date(0)).getTime() : 0,
    anak: (k.murid || []).map(a => ({ nama: a.nama, kelas: kelasAnak(a), d: agWordDarjah(a.tahun) })),
    wakil: (k.wakil || {}).nama || '', tel: k.telefon || '',
    bancian: bancianTeks(k), bil: sudah(k) ? k.daftar.bil : '',
    masa: sudah(k) ? jam(k.daftar.masa) : '', masaPenuh: sudah(k) ? penuh(k.daftar.masa) : '',
    masuk: k.masuk ? jam(k.masuk.masa) : '', masukPenuh: k.masuk ? penuh(k.masuk.masa) : ''
  }));
  /* Murid penerima tanpa bancian langsung — satu baris seorang. */
  murid.filter(p => !peta[p.no_kp]).forEach(p => baris.push({
    hadir: false, masaMs: 0, anak: [{ nama: p.nama, kelas: agDarjahKelas(p.tahun, p.kelas), d: agWordDarjah(p.tahun) }],
    wakil: '', tel: '', bancian: 'Tiada bancian', bil: '', masa: '', masaPenuh: '', masuk: '', masukPenuh: ''
  }));
  const kunci = b => (b.anak[0] || {});
  baris.sort((a, b) => (b.hadir - a.hadir) || (a.masaMs - b.masaMs) ||
    ((kunci(a).d || 9) - (kunci(b).d || 9)) || ibP(kunci(a).kelas).localeCompare(ibP(kunci(b).kelas)) ||
    ibP(kunci(a).nama).localeCompare(ibP(kunci(b).nama)));

  const hadirK = KEL.filter(sudah), masukK = KEL.filter(k => k.masuk);
  const diwakili = new Set(); hadirK.forEach(k => (k.murid || []).forEach(a => { if (penerimaKp.has(a.kp)) diwakili.add(a.kp); }));
  const ringkas = [
    ['Murid penerima', murid.length + ' murid'],
    ['Hadir (daftar)', hadirK.length + ' keluarga · ' + hadirK.reduce((j, k) => j + (k.daftar.bil || 0), 0) + ' orang'],
    ['Masuk dewan', masukK.length + ' keluarga · ' + masukK.reduce((j, k) => j + ((k.masuk || {}).bil || 0), 0) + ' orang'],
    ['Murid diwakili ibu bapa', diwakili.size + ' dari ' + murid.length + ' murid'],
    ['Walk-in / daftar admin', hadirK.filter(k => k.sumber === 'walkin' || k.sumber === 'admin').length + ' keluarga'],
    ['Bancian hadir, tidak datang', KEL.filter(k => !sudah(k) && k.sumber === 'bancian' && k.hadir !== false && orangB(k) > 0).length + ' keluarga'],
    ['Tiada bancian', murid.filter(p => !peta[p.no_kp]).length + ' murid']
  ];
  const dipilih = baris.filter(b => tapis === 'semua' || (tapis === 'hadir' ? b.hadir : !b.hadir));
  return { baris: dipilih, ringkas, jumOrang: dipilih.reduce((j, b) => j + (b.bil || 0), 0) };
}

const ibkTajuk = () => ({
  sek: ((MAJLIS.ibubapa || {}).tajuk || {}).sek || MAJLIS.sekolah || '',
  nama: ibP(MAJLIS.nama || 'Majlis Anugerah').replace(/\*/g, ''),
  info: ((MAJLIS.ibubapa || {}).tajuk || {}).info || ibInfoLalai() || MAJLIS.tarikh || ''
});

function ibkPDF(tapis) {
  const r = ibKehadiran(tapis), T = ibkTajuk();
  if (!r.baris.length) { agToast('Tiada rekod untuk dicetak', 'ralat'); return; }
  const w = window.open('', '_blank');
  if (!w) { agToast('Benarkan pop-up untuk mencetak', 'ralat'); return; }
  const E = agEsc;
  const tr = r.baris.map((b, i) => '<tr' + (b.hadir ? '' : ' class="x"') + '><td class="n">' + (i + 1) + '</td>' +
    '<td class="n">' + E(b.masa || '—') + '</td>' +
    '<td>' + b.anak.map(a => '<b>' + E(a.nama) + '</b>').join('<br>') + '</td>' +
    '<td>' + b.anak.map(a => E(a.kelas)).join('<br>') + '</td>' +
    '<td>' + E(b.wakil) + '</td><td class="n">' + E(b.tel) + '</td>' +
    '<td>' + E(b.bancian) + '</td><td class="n"><b>' + (b.bil || '—') + '</b></td>' +
    '<td class="n">' + E(b.masuk || '—') + '</td></tr>').join('');
  w.document.write('<!doctype html><meta charset="utf-8"><title>Senarai Kehadiran Ibu Bapa</title>' +
    '<style>body{font:10.5px/1.4 Arial,sans-serif;margin:0;color:#000}' +
    '.kp{text-align:center;margin-bottom:10px}.kp .s{font-size:10px;letter-spacing:.18em;font-weight:700}' +
    '.kp h1{font-size:16px;margin:3px 0}.kp .t{font-size:12px;font-weight:700;margin-top:6px}.kp .i{font-size:10px}' +
    '.rk{display:grid;grid-template-columns:repeat(4,1fr);gap:0;border:1px solid #000;margin:8px 0 12px}' +
    '.rk div{padding:5px 7px;border-right:1px solid #000;border-bottom:1px solid #000}.rk small{display:block;font-size:8.5px;text-transform:uppercase;letter-spacing:.04em}' +
    '.rk b{font-size:11.5px}table{border-collapse:collapse;width:100%}thead{display:table-header-group}' +
    'th,td{border:1px solid #000;padding:3px 5px;text-align:left;vertical-align:top}th{font-size:9px;text-transform:uppercase;background:#E5E5E5}' +
    'td.n,th.n{text-align:center;white-space:nowrap}tr{page-break-inside:avoid}tr.x td{color:#555}' +
    '.kaki{margin-top:8px;font-size:9px}@page{size:A4 portrait;margin:12mm}' +
    '*{-webkit-print-color-adjust:exact;print-color-adjust:exact}</style>' +
    '<div class="kp">' + (T.sek ? '<div class="s">' + E(T.sek.toUpperCase()) + '</div>' : '') +
    '<h1>' + E(T.nama) + '</h1>' + (T.info ? '<div class="i">' + E(T.info) + '</div>' : '') +
    '<div class="t">SENARAI KEHADIRAN IBU BAPA / PENJAGA — ' + E(IBK_TAPIS[tapis].toUpperCase()) + '</div></div>' +
    '<div class="rk">' + r.ringkas.map(([l, v]) => '<div><small>' + E(l) + '</small><b>' + E(v) + '</b></div>').join('') +
    '<div><small>Dalam senarai ini</small><b>' + r.baris.length + ' baris · ' + r.jumOrang + ' orang</b></div></div>' +
    '<table><thead><tr><th class="n">Bil</th><th class="n">Masa Daftar</th><th>Nama Murid</th><th>Kelas</th><th>Wakil</th>' +
    '<th class="n">Telefon</th><th>Bancian</th><th class="n">Hadir</th><th class="n">Masuk Dewan</th></tr></thead>' +
    '<tbody>' + tr + '</tbody></table>' +
    '<div class="kaki">Satu baris satu keluarga. Hadir = bilangan orang semasa daftar. Dicetak ' + E(new Date().toLocaleString('ms-MY')) + '.</div>');
  w.document.close();
  setTimeout(() => w.print(), 350);
}

async function ibkExcel(tapis) {
  const r = ibKehadiran(tapis), T = ibkTajuk();
  if (!r.baris.length) { agToast('Tiada rekod untuk dimuat turun', 'ralat'); return; }
  if (typeof JSZip === 'undefined') await ibpSkrip('https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js', () => window.JSZip);
  const X = s => agEsc(String(s == null ? '' : s).replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, ''));
  const huruf = i => String.fromCharCode(65 + i);
  /* s: 0 biasa · 1 tebal · 2 kepala lajur · 3 tajuk · 4 balut teks */
  const sel = (ref, v, s = 0) => (v === '' || v == null) ? (s ? '<c r="' + ref + '" s="' + s + '"/>' : '')
    : typeof v === 'number' ? '<c r="' + ref + '" s="' + s + '"><v>' + v + '</v></c>'
      : '<c r="' + ref + '" s="' + s + '" t="inlineStr"><is><t xml:space="preserve">' + X(v) + '</t></is></c>';
  const LAJUR = ['Bil', 'Masa Daftar', 'Nama Murid', 'Kelas', 'Wakil', 'Telefon', 'Bancian', 'Hadir (orang)', 'Masuk Dewan'];
  const LEBAR = [6, 20, 42, 18, 32, 14, 14, 12, 20];
  const rows = []; let n = 0;
  const tambah = sels => { n++; rows.push('<row r="' + n + '">' + sels.map((x, i) => sel(huruf(i) + n, x[0], x[1])).join('') + '</row>'); };
  tambah([[T.nama, 3]]);
  tambah([['SENARAI KEHADIRAN IBU BAPA / PENJAGA — ' + IBK_TAPIS[tapis].toUpperCase(), 1]]);
  tambah([[[T.sek, T.info, 'Dijana ' + new Date().toLocaleString('ms-MY')].filter(Boolean).join(' · ')]]);
  r.ringkas.forEach(([l, v]) => tambah([[l, 0], [v, 1]]));
  tambah([['Dalam senarai ini', 0], [r.baris.length + ' baris · ' + r.jumOrang + ' orang', 1]]);
  const kepala = n + 2; n++;
  tambah(LAJUR.map(l => [l, 2]));
  r.baris.forEach((b, i) => tambah([[i + 1, 0], [b.masaPenuh, 0], [b.anak.map(a => a.nama).join('\n'), 4],
    [b.anak.map(a => a.kelas).join('\n'), 4], [b.wakil, 0], [b.tel, 0], [b.bancian, 0],
    [b.bil === '' ? '' : b.bil, 1], [b.masukPenuh, 0]]));
  const akhir = huruf(LAJUR.length - 1), bawah = kepala + r.baris.length;
  const helaian = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">' +
    '<sheetViews><sheetView workbookViewId="0"><pane ySplit="' + kepala + '" topLeftCell="A' + (kepala + 1) +
      '" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>' +
    '<cols>' + LEBAR.map((w, i) => '<col min="' + (i + 1) + '" max="' + (i + 1) + '" width="' + w + '" customWidth="1"/>').join('') + '</cols>' +
    '<sheetData>' + rows.join('') + '</sheetData>' +
    '<autoFilter ref="A' + kepala + ':' + akhir + bawah + '"/>' +
    '<pageMargins left="0.4" right="0.4" top="0.5" bottom="0.5" header="0.3" footer="0.3"/>' +
    '<pageSetup paperSize="9" orientation="landscape" fitToHeight="0"/></worksheet>';
  const gaya = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">' +
    '<fonts count="3"><font><sz val="11"/><name val="Arial"/></font><font><b/><sz val="11"/><name val="Arial"/></font>' +
      '<font><b/><sz val="14"/><name val="Arial"/></font></fonts>' +
    '<fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill>' +
      '<fill><patternFill patternType="solid"><fgColor rgb="FFD9D9D9"/><bgColor indexed="64"/></patternFill></fill></fills>' +
    '<borders count="2"><border><left/><right/><top/><bottom/><diagonal/></border>' +
      '<border><left/><right/><top/><bottom style="thin"><color rgb="FF000000"/></bottom><diagonal/></border></borders>' +
    '<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>' +
    '<cellXfs count="5"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>' +
      '<xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/>' +
      '<xf numFmtId="0" fontId="1" fillId="2" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1"/>' +
      '<xf numFmtId="0" fontId="2" fillId="0" borderId="0" xfId="0" applyFont="1"/>' +
      '<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0" applyAlignment="1"><alignment wrapText="1" vertical="top"/></xf>' +
    '</cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>';
  const H = 'Kehadiran';
  const zip = new JSZip();
  zip.file('[Content_Types].xml', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
    '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
    '<Default Extension="xml" ContentType="application/xml"/>' +
    '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>' +
    '<Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>' +
    '<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>');
  zip.file('_rels/.rels', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
    '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>');
  zip.file('xl/workbook.xml', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">' +
    '<sheets><sheet name="' + H + '" sheetId="1" r:id="rId1"/></sheets>' +
    '<definedNames><definedName name="_xlnm._FilterDatabase" localSheetId="0" hidden="1">' + H + '!$A$' + kepala + ':$' + akhir + '$' + bawah + '</definedName></definedNames></workbook>');
  zip.file('xl/_rels/workbook.xml.rels', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
    '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>' +
    '<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>');
  zip.file('xl/worksheets/sheet1.xml', helaian);
  zip.file('xl/styles.xml', gaya);
  const blob = await zip.generateAsync({ type: 'blob', mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = URL.createObjectURL(blob), a = document.createElement('a');
  a.href = url; a.download = 'Kehadiran-Ibu-Bapa-' + ibFail() + '.xlsx';
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/* Modal pilih tapisan. Data dimuat semula dahulu — senarai selepas majlis mesti terkini. */
async function ibKehadiranModal() {
  const lapis = bukaModal('<div class="kad-kepala"><h3>🖨 Senarai Kehadiran Ibu Bapa</h3>' +
    '<button class="b-tutup" data-ibk="tutup" aria-label="Tutup">×</button></div>' +
    '<div class="kad-isi" id="ibk-isi"><p class="hint">Memuatkan data terkini…</p></div>');
  lapis.querySelector('[data-ibk="tutup"]').onclick = tutupModal;
  await ibMuat(true);
  if (!$('ibk-isi')) return;
  const kira = t => ibKehadiran(t).baris.length;
  $('ibk-isi').innerHTML =
    Object.entries(IBK_TAPIS).map(([k, l], i) => '<label style="display:flex;gap:8px;align-items:center;margin:0 0 9px;cursor:pointer">' +
      '<input type="radio" name="ibk-t" value="' + k + '"' + (i ? '' : ' checked') + '> ' + agEsc(l) +
      ' <span class="hint">(' + kira(k) + ' baris)</span></label>').join('') +
    '<p class="hint" style="margin:4px 0 14px">Susunan ikut masa daftar; yang tidak hadir di bawah ikut kelas. Satu baris satu keluarga.</p>' +
    '<div class="baris-input"><button class="btn emas kecil" id="ibk-pdf">🖨 PDF / Cetak</button>' +
    '<button class="btn sunyi kecil" id="ibk-xls">📊 Excel</button></div>';
  const t = () => (document.querySelector('input[name="ibk-t"]:checked') || {}).value || 'hadir';
  $('ibk-pdf').onclick = () => ibkPDF(t());
  $('ibk-xls').onclick = () => ibkExcel(t()).catch(e => agToast('Gagal: ' + e.message, 'ralat'));
}

function ibInit() {
  if (!MAJLIS) return;
  if (!IB_SEDIA) {
    ibBina();
    const p = $('p-ibubapa');
    p.addEventListener('input', e => { if (e.target.closest('input')) ibPratonton(); });
    p.addEventListener('change', e => { if (e.target.closest('input')) ibPratonton(); });
    $('ib-simpan').onclick = ibSimpan;
    $('ib-muat').onclick = () => ibMuat(true);
    $('ib-csv').onclick = ibCSV;
    $('ib-csv-belum').onclick = ibCSVBelum;
    $('ib-padam').onclick = ibPadamSemua;
    $('ib-reset-masuk').onclick = ibResetMasuk;
    $('ib-panduan').onclick = ibPanduan;
    $('ib-hadir').onclick = ibKehadiranModal;
    $('ib-u-tambah').onclick = ibUjiTambah;
    $('ib-u-kp').addEventListener('keydown', e => { if (e.key === 'Enter') ibUjiTambah(); });
    p.addEventListener('click', e => {
      const x = e.target.closest('[data-ib-uji-padam]');
      if (x) return ibUjiPadam(x.dataset.ibUjiPadam);
      const r = e.target.closest('[data-ib-kelas]');
      if (r) ibmBuka(r.dataset.ibKelas);
    });
    $('ib-salin').onclick = async () => {
      try { await navigator.clipboard.writeText(ibLink()); agToast('Link disalin', 'ok'); }
      catch { agToast('Gagal menyalin — salin manual dari paparan', 'ralat'); }
    };
    IB_SEDIA = true;
  }
  ibIsiBorang();
  ibMuat();
}
