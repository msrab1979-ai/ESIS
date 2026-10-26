/* ==========================================================================
   PINDAH PENERIMA KE SUB DARJAH YANG BETUL  —  jalankan SEKALI
   --------------------------------------------------------------------------
   Punca: borang guru membenarkan murid mana-mana darjah disimpan ke sub
   berskop darjah yang salah. Dibaiki dalam guru.html (luarSkopSub), tetapi
   58 entri sedia ada masih salah tempat.

   CARA GUNA
   1. Buka https://sistem-esis.web.app/anugerah-admin.html
   2. Buka Console (Cmd+Option+J)
   3. Tampal SELURUH fail ini, tekan Enter
   4. Ia LAPOR dahulu dan tidak menulis apa-apa.
      Untuk benar-benar menulis:   await PINDAH.jalan()
      Untuk pulihkan semula:       await PINDAH.pulih('<id-sandaran>')
   ========================================================================== */
window.PINDAH = (() => {
  const MAJLIS_ID = 'majlis_2026_mv7hxb5e';
  const db = firebase.firestore();
  const U = x => String(x || '').toUpperCase();

  async function rancang() {
    const m = (await db.collection('anugerah_majlis').doc(MAJLIS_ID).get()).data();
    const snap = await db.collection('anugerah_penerima')
      .where('majlisId', '==', MAJLIS_ID).get();

    const kerja = [], lapor = {};
    snap.forEach(d => {
      const p = d.data(); let ubah = false; const baru = [];
      (p.anugerah || []).forEach(x => {
        const a = (m.anugerah || []).find(y => y.id === x.anugerahId);
        const s = a && (a.sub || []).find(y => y.id === x.subId);
        // bukan sub berskop darjah, atau sudah betul → biarkan
        if (!s || s.skopJenis !== 'darjah' || U(s.skopNilai) === U(p.tahun)) {
          baru.push(x); return;
        }
        const t = (a.sub || []).find(y =>
          y.skopJenis === 'darjah' && U(y.skopNilai) === U(p.tahun));
        ubah = true;
        const kunci = s.nama + ' → ' + (t ? t.nama : 'TIADA SASARAN');
        if (!t) {                                   // tiada sub darjah itu: biarkan
          baru.push(x); lapor['[BIAR] ' + kunci] = (lapor['[BIAR] ' + kunci] || 0) + 1; return;
        }
        if ((p.anugerah || []).some(z => z.subId === t.id)) {  // sudah ada: pendua
          lapor['[BUANG PENDUA] ' + kunci] = (lapor['[BUANG PENDUA] ' + kunci] || 0) + 1; return;
        }
        baru.push(Object.assign({}, x, { subId: t.id, sub: t.nama }));
        lapor['[PINDAH] ' + kunci] = (lapor['[PINDAH] ' + kunci] || 0) + 1;
      });
      if (ubah) kerja.push({ docId: d.id, nama: p.nama, tahun: p.tahun,
                             lama: (p.anugerah || []).length, baru, asal: p.anugerah || [] });
    });
    return { kerja, lapor };
  }

  async function lihat() {
    const { kerja, lapor } = await rancang();
    console.table(lapor);
    console.log('Doc tersentuh: ' + kerja.length +
      ' · entri dibuang: ' + kerja.reduce((n, k) => n + (k.lama - k.baru.length), 0) +
      ' · doc jadi kosong: ' + kerja.filter(k => !k.baru.length).length);
    return kerja;
  }

  async function jalan() {
    const { kerja } = await rancang();
    if (!kerja.length) { console.log('Tiada apa untuk dipindah.'); return; }
    if (kerja.some(k => !k.baru.length)) {
      console.error('BERHENTI: ada doc yang akan jadi kosong. Semak dengan PINDAH.lihat()');
      return;
    }

    // Sandaran dahulu — hanya doc yang akan disentuh.
    const simpan = {};
    kerja.forEach(k => simpan[k.docId] = k.asal);
    const id = 'backup_' + new Date().toISOString().slice(0, 19).replace(/[:T-]/g, '');
    await db.collection('anugerah_backup').doc(id).set({
      majlisId: MAJLIS_ID, masa: new Date().toISOString(),
      sebab: 'sebelum pindah sub darjah salah', data: JSON.stringify(simpan) });
    console.log('Sandaran disimpan: ' + id);

    // Firestore had 500 operasi satu batch.
    let n = 0;
    for (let i = 0; i < kerja.length; i += 400) {
      const b = db.batch();
      kerja.slice(i, i + 400).forEach(k => {
        b.update(db.collection('anugerah_penerima').doc(k.docId), { anugerah: k.baru }); n++; });
      await b.commit();
    }
    console.log('SIAP — ' + n + ' doc dikemas kini. Pulihkan dengan:');
    console.log("await PINDAH.pulih('" + id + "')");
    return id;
  }

  async function pulih(id) {
    const d = (await db.collection('anugerah_backup').doc(id).get()).data();
    if (!d) { console.error('Sandaran tidak dijumpai: ' + id); return; }
    const simpan = JSON.parse(d.data);
    const senarai = Object.entries(simpan);
    for (let i = 0; i < senarai.length; i += 400) {
      const b = db.batch();
      senarai.slice(i, i + 400).forEach(([docId, anugerah]) =>
        b.update(db.collection('anugerah_penerima').doc(docId), { anugerah }));
      await b.commit();
    }
    console.log('DIPULIHKAN — ' + senarai.length + ' doc.');
  }

  return { lihat, jalan, pulih };
})();

console.log('%cPINDAH sedia.', 'font-weight:700');
console.log('Lihat dulu (tiada tulisan):  await PINDAH.lihat()');
console.log('Jalankan:                    await PINDAH.jalan()');
PINDAH.lihat();
