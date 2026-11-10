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
    <div class="gulung" style="margin-top:12px"><table id="ib-u-jadual"></table></div>
    <p class="hint" style="margin:9px 0 0"><strong>🧪 Mod uji</strong> = tarikh diabaikan; pilih skrin (Bancian / Hari majlis / 🚪 Pas dewan / Belum / Selesai) dari bar oren di atas.
      Hanya ID ujian diterima — keluarga sebenar tidak boleh dibuka atau ditindih, jadi selamat walaupun link tersebar. Ibu bapa sebenar tidak terjejas.</p>
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
    </div></div>
  <div class="kad-isi">
    <div class="kpi-grid" id="ib-kpi"></div>
    <div class="gulung"><table id="ib-jadual"></table></div>
    <hr style="border:none;border-top:1px solid var(--garis-halus);margin:19px 0">
    <p class="eyebrow">Selepas pilot test / latihan</p>
    <button class="btn sunyi kecil" id="ib-reset-masuk">🧹 Reset masuk dewan</button>
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
    const [snap, pen, uji] = await Promise.all([
      agDb.collection('anugerah_ibubapa').where('majlisId', '==', MAJLIS.id).get(),
      paksa === true || !PENERIMA.length ? agMuatPenerima(MAJLIS.id) : PENERIMA,
      agDb.collection('anugerah_ibubapa_uji').where('majlisId', '==', MAJLIS.id).get()
    ]);
    IB_KEL = snap.docs.map(d => ({ docId: d.id, ...d.data() }));
    IB_UJI = uji.docs.map(d => ({ docId: d.id, ...d.data() }));
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
function ibLukisUji() {
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
/* 🧹 Kosongkan `masuk` sahaja (selepas latihan) — bancian & daftar kekal. */
async function ibResetMasuk() {
  const snap = await agDb.collection('anugerah_ibubapa').where('majlisId', '==', MAJLIS.id).get();
  const ada = snap.docs.filter(d => d.data().masuk);
  if (!ada.length) { agToast('Tiada tanda masuk dewan', 'ok'); return; }
  const taip = prompt('Reset ' + ada.length + ' tanda masuk dewan? Bancian & pendaftaran kekal.\n\nTaip RESET untuk mengesahkan.');
  if (taip !== 'RESET') { if (taip !== null) agToast('Dibatalkan', 'ralat'); return; }
  try {
    for (let i = 0; i < ada.length; i += 400) {
      const b = agDb.batch();
      ada.slice(i, i + 400).forEach(d => b.update(d.ref, { masuk: null }));
      await b.commit();
    }
    agToast(ada.length + ' tanda masuk dikosongkan', 'ok');
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
