# Port Pendaftaran Masuk Dewan → Anugerah ESIS (BELUM DIBINA)

Status 9 Nov 2026: **analisa sahaja, tiada kod diubah.** Sambung dari sini.

Sumber: `~/Desktop/appsKO-suratKebenaran/PORT-ESIS-PENDAFTARAN-DEWAN.md`
(suratkebenaranko, commit `46ceea4` → `0b73844`). Seni bina berbeza — port
KONSEP, jangan salin fail.

## Apa yang dibina di suratkebenaranko

1. **Pendaftaran masuk dewan** — admin set masa BUKA + PIN AJK. Selepas buka,
   telefon ibu bapa dipaksa ke skrin pas; AJK taip PIN pada telefon ibu bapa →
   Sahkan. Bilangan masuk = tempahan (tiada −/+). Tidak hadir → tidak boleh
   didaftar. Belum bayar → disekat, admin "Benarkan masuk" (medan berasingan).
   Skrin hijau sekali → "Teruskan ke giliran anak" + Buku Program (disorok
   sehingga disahkan). Tab admin Pendaftaran: carian, Sahkan N orang, Benarkan
   masuk, Batal, 🧹 Reset (taip RESET), statistik.
2. **Keluarga = telefon ATAU nama penjaga sama (transitif)**; server & admin
   peraturan sama.
3. **Mod majlis** — kad "📣 Semak giliran" di bawah semua anak; "Sedang
   dipanggil" BESAR.
4. **Pengurus Peserta** buka panel sendiri (▶ Mula Majlis); julat pertama auto
   buka panel.
5. **Amaran realtime** — trigger salin ke doc AWAM 4 nilai; onSnapshot →
   butang merah "Ada perubahan — sila tekan". Paparan tidak berubah sendiri.
6. **Panduan PDF** (9 halaman 108×192mm) + poster QR A4 + link pendek `/majlis`.

Perangkap dari sana: PIN di server sahaja · had kadar kira PIN SALAH sahaja
(WiFi dewan = satu IP) · maklumat keluarga sekali, bukan tiap anak · fungsi
module dlm `onclick` inline gagal senyap → `window.x` · teks gradient terpotong
dlm PDF · polling guna fungsi 1-bacaan · doc realtime awam tiada data peribadi.

## Percanggahan dengan ESIS

| Perkara | suratkebenaranko | ESIS sekarang |
|---|---|---|
| Pelayan | Cloud Functions (PIN, trigger) | **Tiada `functions/`** — hosting + Firestore sahaja |
| Halaman ibu bapa | SDK + onSnapshot | **Tiada SDK** (REST + fetch ±15 KB) — jangan regres |
| Daftar hari majlis | AJK sahkan dgn PIN | Ibu bapa daftar sendiri (cari telefon); admin ✅ di modal |
| Bayaran | Belum bayar = disekat | **Tiada konsep bayaran** |
| Giliran di telefon ibu bapa | Ada | Keputusan pengguna dahulu: **tiada QR, atur cara, giliran** |
| Keluarga | Telefon ATAU nama penjaga | Satu doc ikut telefon + indeks satu anak satu keluarga |
| Buku Program | Disorok sehingga disahkan | Dipapar terus |

## Soalan untuk pengguna (belum dijawab)

1. **PIN AJK** — naik Blaze + Cloud Functions, ATAU tiada PIN (AJK sahkan
   dari tab admin berkata laluan)?
2. **Giliran di telefon ibu bapa** — keputusan "tiada giliran" dibatalkan?
3. **Realtime** — SDK (saiz naik) atau polling REST satu doc?
4. **Bayaran** — langkau?
5. **Keluarga ikut nama penjaga** — perlu? (mengubah model doc-ikut-telefon)

Cadangan langkah pertama: tab Pendaftaran + skrin pas disahkan dari admin,
tanpa PIN/Functions — paling dekat dengan yang sedia ada.
