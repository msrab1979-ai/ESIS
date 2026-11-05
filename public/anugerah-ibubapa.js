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
   }

   🔴 Ditulis dengan update({ibubapa}) — BUKAN simpanMajlis() (set merge).
      Merge menggabung peta secara mendalam, jadi medan yang dikosongkan
      admin (cth link buku dipadam) akan kekal senyap. update() menggantikan
      seluruh peta.
   🔴 Data ibu bapa: anugerah_ibubapa (satu doc per keluarga, id = majlis__telefon)
      + anugerah_ibubapa_kp (indeks satu anak satu keluarga). Format ditulis
      oleh ibubapa.html — lihat ulasan kepala fail itu.
   ========================================================================== */

let IB_KEL = [];          // doc keluarga majlis aktif
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
</div>

<div class="baris-input" style="margin:2px 0 22px">
  <button class="btn emas" id="ib-simpan">💾 Simpan tetapan</button>
  <span class="hint" id="ib-simpan-st"></span>
</div>

<div class="kad">
  <div class="kad-kepala"><h3>📊 Bancian &amp; Pendaftaran</h3>
    <div class="kanan">
      <button class="btn sunyi kecil" id="ib-muat">🔄 Muat semula</button>
      <button class="btn sunyi kecil" id="ib-csv">⬇ CSV keluarga</button>
      <button class="btn sunyi kecil" id="ib-csv-belum">⬇ CSV belum jawab</button>
    </div></div>
  <div class="kad-isi">
    <div class="kpi-grid" id="ib-kpi"></div>
    <div class="gulung"><table id="ib-jadual"></table></div>
    <hr style="border:none;border-top:1px solid var(--garis-halus);margin:19px 0">
    <p class="eyebrow">Selepas pilot test / latihan</p>
    <button class="btn bahaya kecil" id="ib-padam">🗑 Padam semua data ibu bapa majlis ini</button>
    <p class="hint" style="margin:8px 0 0">Memadam bancian &amp; pendaftaran sahaja. Penerima, giliran dan tetapan di atas <strong>tidak</strong> disentuh.</p>
  </div>
</div>`;
}

function ibIsiBorang() {
  const c = MAJLIS.ibubapa || {}, t = c.tajuk || {}, w = c.wa || {};
  $('ib-url').textContent = ibLink();
  $('ib-buka').href = ibLink();
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
  ibPratonton();
}
function ibBacaBorang() {
  const v = id => $(id).value.trim();
  return {
    tajuk: { sek: v('ib-sek'), utama: v('ib-utama'), info: v('ib-info'), alu: v('ib-alu') },
    bancian: { buka: ibDariInput(v('ib-b-buka')), tutup: ibDariInput(v('ib-b-tutup')) },
    daftar: { buka: ibDariInput(v('ib-d-buka')), tutup: ibDariInput(v('ib-d-tutup')) },
    buku: v('ib-buku'),
    wa: { on: $('ib-wa-on').checked, url: v('ib-wa-url'), teks: v('ib-wa-teks') }
  };
}
function ibPratonton() {
  const c = ibBacaBorang(), t = c.tajuk;
  const utama = agEsc(t.utama || MAJLIS.nama || 'Majlis Anugerah').replace(/\*([^*]+)\*/g, '<em>$1</em>');
  $('ib-pra').innerHTML = '<div class="s">' + agEsc(t.sek || MAJLIS.sekolah || '') + '</div>' +
    '<div class="u">' + utama + '</div><div class="i">' + agEsc(t.info || ibInfoLalai()) + '</div>';
  $('ib-b-status').innerHTML = ibStatus(c.bancian);
  $('ib-d-status').innerHTML = ibStatus(c.daftar);
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
  if (salah.length) { agToast(salah[0], 'ralat'); $('ib-simpan-st').textContent = salah.join(' '); return; }
  const b = $('ib-simpan'); b.disabled = true;
  try {
    await agDb.collection('anugerah_majlis').doc(MAJLIS.id).update({ ibubapa: c });
    MAJLIS.ibubapa = c;
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
    const [snap, pen] = await Promise.all([
      agDb.collection('anugerah_ibubapa').where('majlisId', '==', MAJLIS.id).get(),
      paksa === true || !PENERIMA.length ? agMuatPenerima(MAJLIS.id) : PENERIMA
    ]);
    IB_KEL = snap.docs.map(d => ({ docId: d.id, ...d.data() }));
    PENERIMA = pen;
    ibLukisStat();
  } catch (e) {
    console.error(e);
    kosong($('ib-kpi'), 'Gagal memuatkan: ' + e.message);
  }
}
function ibMuridPenerima() {
  return PENERIMA.filter(p => !agAdalahLuar(p) && p.no_kp);
}
function ibPetaAnak() {
  const m = {};
  IB_KEL.forEach(k => (k.murid || []).forEach(a => { m[a.kp] = k; }));
  return m;
}
function ibLukisStat() {
  const murid = ibMuridPenerima(), peta = ibPetaAnak();
  const hadirK = IB_KEL.filter(k => k.hadir !== false);
  const orang = hadirK.reduce((j, k) => j + (k.dewasa || 0) + (k.kanak || 0), 0);
  const daftarK = IB_KEL.filter(k => k.daftar && k.daftar.bil);
  const orangDaftar = daftarK.reduce((j, k) => j + (k.daftar.bil || 0), 0);
  const jawab = murid.filter(p => peta[p.no_kp]).length;
  const walk = IB_KEL.filter(k => k.sumber === 'walkin').length;
  const kpi = (angka, label, kecil, kls) => '<div class="kpi ' + (kls || '') + '"><div class="angka">' + angka +
    '</div><div class="label">' + label + '</div>' + (kecil ? '<div class="kecil">' + kecil + '</div>' : '') + '</div>';
  $('ib-kpi').innerHTML =
    kpi(IB_KEL.length, 'Keluarga jawab', jawab + ' dari ' + murid.length + ' murid penerima') +
    kpi(orang, 'Orang dijangka hadir', hadirK.length + ' keluarga hadir · ' + (IB_KEL.length - hadirK.length) + ' tidak', 'ok') +
    kpi(orangDaftar, 'Sudah daftar (hari majlis)', daftarK.length + ' keluarga' + (walk ? ' · ' + walk + ' walk-in' : ''), 'ok') +
    kpi(murid.length - jawab, 'Murid belum jawab', 'ibu bapa belum isi bancian', murid.length - jawab ? 'bahaya' : '');

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
    baris.map(r => '<tr><td>' + agEsc(r.kelas) + '</td>' + td(r.pen) + td(r.jawab) + td(r.hadir) + td(r.tidak) +
      td(r.pen - r.jawab, true) + td(r.daftar) + '</tr>').join('') + '</tbody>' +
    '<tfoot><tr><td>JUMLAH</td>' + td(jum.pen) + td(jum.jawab) + td(jum.hadir) + td(jum.tidak) + td(jum.pen - jum.jawab, true) + td(jum.daftar) + '</tr></tfoot>'
    : '<tbody><tr><td>Tiada murid penerima dalam majlis ini.</td></tr></tbody>';
}

/* KP & telefon dibalut ="…" supaya Excel tidak membuang sifar di hadapan
   (0123… → 123…) atau menukar KP 12 digit kepada 1.5E+11. */
const ibTeks = s => (s ? '="' + s + '"' : '');
function ibCSV() {
  if (!IB_KEL.length) { agToast('Tiada bancian untuk dimuat turun', 'ralat'); return; }
  const r = [['TELEFON', 'NAMA WAKIL', 'KP WAKIL', 'ANAK', 'KELAS', 'STATUS', 'DEWASA', 'KANAK-KANAK', 'JUMLAH',
    'DAFTAR (ORANG)', 'MASA DAFTAR', 'SUMBER', 'DIHANTAR']];
  IB_KEL.slice().sort((a, b) => ibP((a.wakil || {}).nama).localeCompare(ibP((b.wakil || {}).nama))).forEach(k => {
    const d = k.daftar || {}, mD = ibMasa(d.masa), mH = ibMasa(k.dihantar);
    r.push([ibTeks(k.telefon), (k.wakil || {}).nama, ibTeks((k.wakil || {}).kp),
      (k.murid || []).map(a => a.nama).join(' | '),
      (k.murid || []).map(a => agDarjahKelas(a.tahun, a.kelas)).join(' | '),
      k.hadir !== false ? 'HADIR' : 'TIDAK HADIR', k.dewasa || 0, k.kanak || 0, (k.dewasa || 0) + (k.kanak || 0),
      d.bil || '', mD ? mD.toLocaleString('ms-MY') : '', k.sumber === 'walkin' ? 'WALK-IN' : 'BANCIAN',
      mH ? mH.toLocaleString('ms-MY') : '']);
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

/* 🔴 Taip PADAM, bukan confirm() — sama dengan reset penerima. */
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
    $('ib-salin').onclick = async () => {
      try { await navigator.clipboard.writeText(ibLink()); agToast('Link disalin', 'ok'); }
      catch { agToast('Gagal menyalin — salin manual dari paparan', 'ralat'); }
    };
    IB_SEDIA = true;
  }
  ibIsiBorang();
  ibMuat();
}
