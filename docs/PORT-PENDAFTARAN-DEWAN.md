# Port Pendaftaran Masuk Dewan → Anugerah ESIS (BELUM DIBINA)

Status 9 Nov 2026: **nombor giliran berjalan DIBINA** (Peserta → ibu bapa, lihat
`docs/ANUGERAH.md` › 📣 Giliran Ibu Bapa). **Pas Masuk Dewan + PIN DIBINA 10 Nov** tanpa Cloud Functions (`docs/ANUGERAH.md` ›
🚪 Pas Masuk Dewan). **KIV:** kumpul semula keluarga (soalan 5), panduan PDF.

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

## Soalan untuk pengguna

1. ✅ **PIN AJK** — DIJAWAB 9 Nov 2026: **akaun `sistem-esis` sudah Blaze.**
   Cloud Functions boleh dipakai, jadi PIN boleh disemak di server seperti
   suratkebenaranko. (`functions/` belum wujud dalam repo — perlu dicipta.)
2. ✅ **Giliran di telefon ibu bapa** — DIJAWAB: **ya.** Keputusan lama
   "tiada giliran" (5 Nov) dibatalkan. Kad "📣 Semak giliran" akan dibina.
3. ✅ **Realtime** — DIJAWAB: bila **Pengurus Peserta** kemas kini nombor →
   ibu bapa dapat amaran "Ada perubahan — sila tekan". Draf flow di bawah.
4. ✅ **Bayaran** — DIJAWAB: **langkau.** Tiada sekatan belum bayar, tiada
   butang "Benarkan masuk".
5. ✅ **Keluarga** — DIJAWAB: **ya, kumpul semula** ikut **no. telefon ibu bapa
   + no. KP anak**. Draf peraturan di bawah, menunggu pengesahan.

## DRAF — soalan 3 (realtime), bahasa mudah

Bila MC panggil giliran seterusnya, bagaimana telefon ibu bapa tahu?

| Pilihan | Apa ibu bapa nampak | Kos |
|---|---|---|
| A. Tekan 🔄 sendiri | Nombor lama sehingga ibu bapa tekan | Tiada |
| B. **Semak sendiri setiap ±30 saat** (cadangan) | Butang merah "Ada perubahan — sila tekan" muncul sendiri | 1 bacaan kecil / telefon / 30s. 300 telefon × 2 jam ≈ 72,000 bacaan ≈ RM0.20 (Blaze) |
| C. Langsung serta-merta (SDK) | Sama dengan B, tanpa lengah | Halaman ibu bapa jadi ±10× lebih berat untuk dimuat di WiFi dewan |

B mengekalkan peraturan "tiada SDK" dan hampir sama pantas dengan C.
Doc yang dibaca hanya 4 nilai awam (tiada nama/KP).

## Semakan ESIS sekarang (9 Nov 2026) — flow itu BELUM WUJUD

- `ibubapa.html`: tiada giliran, tiada "Sedang dipanggil", tiada semakan berkala.
- Tab admin 👪 (`anugerah-ibubapa.js`): tiada tetapan panel giliran.
- `peserta.html`: hanya tanda hadir per giliran (`giliran[].hadir`). Tiada
  kotak nombor/julat, tiada ▶ Mula Majlis.
- Corak butang merah "Ada perubahan" SUDAH ada untuk petugas (`mc.html`,
  `agPantauPetugas`) — konsep sama boleh dipakai semula.

## DRAF — flow amaran giliran (ikut suratkebenaranko `setGiliranSemasa`)

1. **Peserta** (`peserta.html`) dapat panel baharu "📣 Giliran seterusnya":
   - ▶ Mula Majlis → buka panel di telefon ibu bapa (⏸ Tutup panel).
   - Kotak **Mula – Akhir** (julat kumpulan yang akan naik) → 📣 Papar.
   - ⏹ Henti → ibu bapa nampak "belum bermula".
2. Simpan ke `anugerah_majlis.modGiliran {langsung, julatMula, julatAkhir,
   semasaPada}` melalui Cloud Function (kuasa ikut kod link Peserta).
3. **Trigger** `cerminLangsung` salin 4 nilai itu ke `anugerah_langsung/{majlis}`
   (awam, TIADA nama/KP). Tulis hanya bila nilai berubah.
4. **Ibu bapa** (`ibubapa.html`) — kad "📣 Semak giliran" di bawah semua anak:
   nombor "Sedang dipanggil" BESAR + anak seterusnya. Semak doc awam itu
   setiap ±30s (REST, kekal tanpa SDK) → nilai berubah → butang 🔄 jadi
   MERAH "Ada perubahan — sila tekan". Paparan tidak bertukar sendiri.

## DRAF — soalan 5 (kumpul semula keluarga)

**Keadaan sekarang:** satu doc = satu no. telefon. Satu anak hanya boleh
dalam satu keluarga (indeks KP anak). Jadi pertindihan *anak yang sama*
sudah dihalang.

**Yang terlepas:** bapa daftar ANAK 1 dgn telefon A, ibu daftar ANAK 2 dgn
telefon B → dua doc, padahal satu keluarga. Di dewan mereka dapat dua pas,
dan kad Semak giliran hanya tunjuk separuh anak.

**Cadangan peraturan:** dua doc = satu keluarga jika berkongsi
**no. telefon** ATAU **no. KP anak** (transitif: A~B, B~C → A,B,C satu).
Server (Functions) dan tab admin guna SATU fungsi yang sama.

⚠ **Masalah:** contoh bapa/ibu di atas TIDAK berkongsi telefon mahupun KP
anak — peraturan ini tidak dapat menyatukan mereka. Perlu satu pautan lagi:
- **No. KP wakil** (sudah dikumpul, 12 digit wajib) — tepat, tetapi bapa &
  ibu ada KP berbeza, jadi tetap tidak bersatu; ATAU
- **Nama wakil** (cara suratkebenaranko) — boleh tersalah eja; ATAU
- **Ibu bapa sendiri gabung**: semasa bancian, tanya "Ada anak lain
  didaftar dgn no. telefon lain?" → taip telefon itu → digabung.
- **Admin gabung manual** di tab 👪 (butang 🔗 Gabung keluarga).

**Kumpul semula data sedia ada:** butang admin sekali-guna
"🔗 Semak pertindihan" — senarai kumpulan yang akan digabung, admin
sahkan, baru ditulis. Tiada gabung automatik senyap.

Cadangan langkah pertama (dikemas kini selepas Blaze): tab admin Pendaftaran
+ skrin pas, kemudian PIN AJK melalui Cloud Functions.
