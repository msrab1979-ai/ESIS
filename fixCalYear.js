const admin = require('firebase-admin');
const serviceAccount = require('./sistem-esis-firebase-adminsdk-fbsvc-6186dfd5c0.json');

admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
const db = admin.firestore();

async function fixCalYear() {
    console.log('🔄 Membaca semua rekodMarkah...');
    const snapshot = await db.collection('rekodMarkah').get();
    console.log(`📊 Jumlah rekod: ${snapshot.size}`);

    let fixed = 0, skipped = 0;
    const BATCH_SIZE = 400;
    let batch = db.batch();
    let batchCount = 0;

    for (const doc of snapshot.docs) {
        const data = doc.data();
        if (!data.timestamp) { skipped++; continue; }

        const tsYear = data.timestamp.toDate().getFullYear();
        if (data.cal_year !== tsYear) {
            batch.update(doc.ref, { cal_year: tsYear });
            fixed++;
            batchCount++;
        } else {
            skipped++;
        }

        if (batchCount >= BATCH_SIZE) {
            await batch.commit();
            batch = db.batch();
            batchCount = 0;
            console.log(`   ⏳ Dikemaskini ${fixed} rekod setakat ini...`);
        }
    }

    if (batchCount > 0) await batch.commit();
    console.log(`\n✅ SELESAI: ${fixed} rekod cal_year dibetulkan | ${skipped} rekod tiada perubahan`);
    process.exit(0);
}

fixCalYear().catch(err => {
    console.error('❌ Ralat:', err);
    process.exit(1);
});
