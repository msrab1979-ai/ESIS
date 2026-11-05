# Modul Anugerah — rujukan penuh

Dipindah dari `CLAUDE.md` pada 3 Nov 2026 (had 150k aksara). Baca fail ini sebelum mengubah mana-mana fail anugerah. Ringkasan peraturan paling kritikal kekal dalam `CLAUDE.md`.

### Modul Anugerah — TIADA dark mode (2 Nov 2026)

Semua panel anugerah (dan `markah-guru.html`, yang berkongsi `anugerah-kongsi.css`) **sentiasa terang** walaupun OS dalam mod gelap — pengguna mahu paparan rasmi. Blok `prefers-color-scheme:dark` / `data-theme="dark"` dibuang; `:root{color-scheme:only light}` + `<meta name="color-scheme" content="only light">` pada setiap halaman — `only` menghalang Auto Dark Mode Chrome daripada memaksa laman gelap. `<meta name="darkreader-lock">` menghalang extension Dark Reader (pengguna masih nampak gelap di Chrome desktop selepas kod bersih). Jangan kembalikan tanpa diminta.

### Modul Anugerah — tetapan subjek murid terbaik

Admin memilih **subjek mana dikira** untuk anugerah murid terbaik, **per darjah** — `settings/anugerahSubjek` = `{SATU:[nama_penuh...], ..., ENAM:[...]}`. Tandaan dibuat dalam tab `📚 Tetapan` (`initTetapan`/`lukisTetapan`, ids `tetapan-*`, satu accordion per darjah), disimpan dengan butang 💾 (bukan auto — admin majlis ramai dan sebahagiannya kurang biasa dengan komputer; toast "Disimpan" ialah pengesahan yang mereka cari).

**Senarai kosong `[]` / tiada = SEMUA subjek.** Ini lalai dan menjadikan setiap majlis sedia ada berkelakuan sama seperti sebelum ciri ini wujud. Jangan sekali-kali tukar maknanya kepada "tiada subjek". Menandakan *semua* kotak juga disimpan sebagai `[]`, supaya subjek baharu yang ditambah kemudian tidak terlepas secara senyap.

**Berasingan daripada `settings/subjekUtama`** milik Headcount/Murid Terbaik dalam `index.html` — dua tujuan berbeza, dan menukar subjek untuk satu majlis tidak boleh mengalihkan sasaran Headcount tanpa admin sedar. Butang "📥 Salin dari ESIS" menyalin `subjekUtama` masuk (baca sahaja, perlu tekan Simpan untuk mengesahkan).

**Tapisan berlaku di satu tempat sahaja** — dalam `agKiraCalon`, sebelum cabang `asas`:
- Terpakai kepada `gps` / `jumlah` / `purata`. **`asas:'subjek'` tidak ditapis** — ia mencari satu subjek yang dinamakan, termasuk subjek bukan teras (contoh anugerah "Terbaik Jawi").
- Murid yang **tiada satu pun** subjek teras **dikeluarkan** dari senarai dan dikira sebagai `tiadaTeras` — sekali sahaja, bukan juga `tiadaMarkah` (ujian mutasi menangkap pendua ini).
- Murid yang **kurang** subjek teras **tetap dikira** atas subjek yang ada — keputusan sekolah, bukan kod. Ia ditanda `kurang:true`, dipaparkan sebagai lajur **Subjek** `3/5` berwarna amber, dan dirumuskan oleh amaran.

**Amaran dikira atas baris yang DIPAPAR, bukan seluruh skop.** Jadual hanya menunjukkan `ambil+4` (minimum 10) baris. Versi pertama melaporkan "150 calon tidak lengkap" sedangkan kesemua 10 baris di skrin adalah `4/4` — amaran yang tidak boleh ditindak oleh sesiapa. Kini `kurangDipapar` memandu mesej, dengan jumlah skop penuh disebut secara berasingan, dan nota biru berasingan bila tiada seorang pun daripada mereka berada dalam senarai.

**Nama kelas berulang merentas darjah** (sekolah ini mempunyai "INTEL" di keenam-enam darjah, 187 murid). `skopJenis:'kelas'` memadankan `kelas` sahaja, jadi ia merangkumi semua darjah — `agDarjahDariKelas` mencari darjah daripada `students` untuk baris konteks, kerana nama kelas bebas ("4 INTEL", "LIMA HIGEN") dan tidak boleh dihurai daripada teks.

Disahkan 20 Okt 2026 pada data sebenar (UASA 2026, darjah ENAM 184 calon): GPS tiga murid dibandingkan dengan kiraan tangan — padan tepat; susunan calon berubah apabila tetapan dipasang. Ujian oracle 11 kes + 6 mutasi dalam `agKiraCalon`, semua ditangkap.

#### Satu anugerah, satu skrin (modal Pilih Murid)

Butang **👤 Pilih Murid** pada setiap sub-anugerah dalam pokok Jenis Anugerah membuka `modalPilihMurid(iAn, jSub)` — cadang calon, tambah manual, dan buang penerima semuanya dalam modal itu. Tab 🔍 Pilih Murid yang berasingan **kekal berfungsi** dan tidak dibuang; ia cuma bukan lagi satu-satunya jalan.

Sebabnya: tab berasingan memerlukan admin menukar tab, kemudian mencari sub-anugerah yang sama sekali lagi dalam dropdown — dua tempat dan satu nama untuk diingati. Majlis diuruskan oleh beberapa orang admin, sebahagiannya tidak biasa dengan komputer.

State dalam `PM = {an, s, hasil, tanda:Set, tandaM:Set}`. Modal guna kelas `.luas` (`max-width:1000px`) kerana jadual sembilan lajur menatal mendatar dalam 560px lalai. Bahagian manual mula pada darjah sub-anugerah itu, bukan darjah pertama.

#### Tambah manual berkelompok

`tambahPenerimaManualRamai` menulis semua murid dalam **satu `db.batch()`**. Versi lama menambah seorang setiap kali melalui carian taip — untuk Kehadiran Penuh yang boleh melibatkan satu kelas penuh, itu tiga puluh kali menaip dan tiga puluh penulisan berasingan yang boleh gagal separuh jalan. Dropdown darjah → kelas, "Tanda semua", satu simpanan. Murid yang sudah ada dalam sub-anugerah itu ditanda hijau, kotaknya `disabled`, dan tidak pernah ditulis dua kali.

#### Anugerah terbaik subjek — purata beberapa peperiksaan

`agKiraCalon` menerima `peperiksaan` sebagai **string atau array**. Bila array, setiap rekod ditanda `_pep` dan `markahPep{}` membawa markah setiap peperiksaan supaya jadual boleh memaparkan satu lajur bagi setiap satu — **purata yang tidak boleh disemak tidak berguna**.

- **Purata MARKAH, bukan purata gred.** 88 dan 82 memberi 85.0; purata gred memberi 6.00 kepada murid itu *dan* kepada murid dengan 82+82, menyembunyikan enam markah.
- Murid yang menduduki **sebahagian** peperiksaan **kekal** dengan purata atas yang diduduki, ditanda `kurang:true` dan dipapar `1/2` amber — keputusan sekolah, sama seperti layanan subjek tidak lengkap.
- `asas:'subjek'` juga menerima **array subjek**: "Pendidikan Islam dan Moral" ialah satu anugerah di mana murid Islam dinilai atas PI dan murid bukan Islam atas Moral, bersaing dalam ranking yang sama. Murid mengambil salah satu, tidak pernah kedua-duanya.
- Rekod pendua dalam peperiksaan yang sama: **yang pertama menang** (`if (ikutPep[kunci] == null)`), bukan yang terakhir.

#### Skop `tahap`

`skopJenis:'tahap'` dengan `skopNilai` 1 atau 2 — Tahap 1 = darjah 1, 2, 3; Tahap 2 = darjah 4, 5, 6. **Satu senarai merentas ketiga-tiga darjah**, bukan tiga senarai berasingan. Butang "⚡ Jana semua" menjana **2** sub untuk skop ini, bukan 6.

#### Tab 📋 Semak Penerima

Setiap penerima majlis dalam satu jadual (`initSemak`/`lukisSemak`, ids `sk-`), ditapis ikut anugerah/darjah/kelas/nama, dengan CSV dan PDF. KPI **"N dapat lebih satu"** dikira atas **seluruh majlis, bukan tapisan** — itu fakta tentang majlis dan tidak patut berubah kerana admin menapis kepada satu kelas. Soalan "siapa naik pentas lebih sekali?" tidak boleh dijawab di tab Pilih Murid yang menunjukkan satu sub pada satu masa.

Butang buang membuka **modal dengan satu butang bagi setiap anugerah**, bukan `prompt()` yang meminta admin menaip nombor baris — nombor yang hanya wujud dalam teks dialog itu sendiri. Ia menggunakan `onclick` pada elemen `#lapis` (yang dibuang setiap kali modal ditutup), **bukan** `addEventListener` pada `#bekas-modal` yang kekal — pendengar di sana berhimpun dan satu klik menjalankan pembuangan beberapa kali.

`agMuatTurunCSV` menulis **BOM UTF-8**; tanpanya Excel di Windows memaparkan nama bertanda diakritik sebagai sampah dan guru menyangka fail itu rosak.

Disahkan 20 Okt 2026 pada data live: modal dibuka dari pokok, 25 baris dipapar untuk `ambil:20` dengan 20 ditanda automatik, 3 calon disimpan ke Firestore dan dibuang semula melalui modal. 20 ujian oracle + 12 ujian mutasi dalam `agKiraCalon`.

#### Tiada calon ditanda secara automatik (jangan regres)

Jadual calon — dalam modal Pilih Murid **dan** tab 🔍 Pilih Murid — membuka dengan **kotak kosong**. Hanya murid yang **sudah disimpan** bertanda. Versi awal menandakan top-N secara automatik; kotak yang sudah bertanda sebelum admin membacanya menjadikan "Simpan" satu gerakan tanpa fikir, dan senarai yang terhasil kelihatan seperti pilihan sedangkan tiada siapa memilihnya.

Sistem masih mengira dan menyusun: lajur **Status** menunjukkan "Cadang" bagi top-N, dan butang **"Tanda N cadangan"** menandakannya sekali tekan bagi admin yang bersetuju. Butang Simpan `disabled` sehingga ada sekurang-kurangnya seorang murid **baharu** ditanda.

Dua skrin itu tidak boleh berbeza dasar — kalau satu menanda automatik dan satu tidak, admin yang berpindah antara keduanya tidak akan tahu yang mana dipercayai.

#### `settings/anugerahSubjek` ditulis TANPA merge

`agSimpanSubjekTeras` menggunakan `.set(bersih)`, **bukan** `{merge:true}`. Dengan merge, Firestore mengabaikan medan array kosong — jadi admin yang menanggalkan setiap tanda dan menekan Simpan mendapati pilihan lamanya masih hidup, dan tiada apa di skrin yang menjelaskan sebabnya. Dokumen ini kecil dan sentiasa ditulis penuh (keenam-enam darjah), jadi menulis ganti selamat.

Gejala yang didedahkan oleh pepijat ini: menetapkan "kecuali JAWI" untuk satu darjah, kemudian cuba mengosongkannya, meninggalkan **keenam-enam** darjah terikat pada senarai 12 subjek itu.

#### Tandaan subjek tidak melukis semula senarai

Pengendali `change` dalam tab Tetapan mengemas label dan nota **di tempat**. Versi yang memanggil `lukisTetapan()` memusnahkan kotak-kotak yang baru sahaja dirujuk oleh gelung pemanggil, jadi menanda dua belas subjek berturut-turut hanya mendaftarkan **satu**.

#### Subjek hidup pada SUB, bukan anugerah

Anugerah terbaik mata pelajaran ialah **dua** anugerah — `ANUGERAH TERBAIK MATA PELAJARAN — TAHAP 1` dan `— TAHAP 2` — masing-masing dengan **12 subjek sebagai sub-anugerah**. Versi pertama membina 12 anugerah berasingan (satu per subjek, dua sub setiap satu); pokok menjadi 24 tajuk berselerak dan admin menatal mencari satu baris.

`agKiraCalon` dipanggil dengan `s.subjek || an.subjek`, jadi sub boleh menimpa induk — modal Ubah Sub-anugerah kini membawa dropdown **Subjek** bila induknya `asas:'subjek'`. Kosong bermakna ikut induk.

Sub `PENDIDIKAN ISLAM & MORAL` menyimpan `subjek: ['PENDIDIKAN ISLAM','MORAL']` — array, bukan string.

#### Pokok anugerah ialah accordion

Setiap tajuk anugerah buka/tutup (`POKOK_BUKA[a.id]`, kelas `.buka` pada `<li>`), dengan butang **Buka semua** / **Tutup semua**. Lima puluh lima sub yang sentiasa terbuka lebih panjang daripada skrin. Pendengar klik memadankan `.induk[data-togol]` **bersama** butang-butang sedia ada dalam satu `closest()` — butang di dalam `.induk` dipadankan dahulu kerana ia lebih dalam, jadi "Ubah" tidak mencetuskan togol.

**Sub yang tiada penerima adalah normal dan tidak perlu dibuang.** Sekolah yang hanya memberi anugerah untuk empat subjek meninggalkan lapan yang lain pada 0 murid — ia tidak muncul dalam Giliran, tiket, MC, peserta, hadiah atau tayangan, dan sedia untuk tahun berikutnya.

#### Skop kelas mesti membawa `skopDarjah` (jangan regres)

Nama kelas **berulang merentas darjah** — sekolah ini mempunyai "INTEL" di keenam-enam darjah, 187 murid semuanya, dan "BYTECH" di lima. `agKiraCalon` dengan `skopJenis:'kelas'` kini memadankan `kelas` **dan** `skopDarjah`; tanpa `skopDarjah` ia jatuh kembali kepada padanan nama sahaja supaya dokumen lama tidak berubah makna.

Kesannya nyata: 6 INTEL memulangkan **34** murid dengan `skopDarjah`, **187** tanpanya.

Tiga tempat perlu konsisten, dan dua daripadanya pernah rosak:

1. **Dropdown kelas** (`isiNilai`) — `value` mesti `DARJAH|KELAS`, bukan nama kelas. Enam option berkongsi nilai "BYTECH" bermakna pelayar memilih yang **terakhir**: sub bernama "1 BYTECH" terbuka menunjukkan "6 BYTECH", dan menekan Simpan benar-benar menukarnya kepada darjah 6.
2. **`baca()` dalam modal sub** membina objek **baharu** — setiap medan yang tiada kawalan dalam borang (`skopDarjah`, `paparSemua`, `peperiksaan`, `asas`) mesti disalin secara eksplisit, atau menekan Simpan memadamkannya secara senyap.
3. **Jana semua** mengesan pendua mengikut darjah **dan** kelas; memadankan nama kelas sahaja melangkau lima daripada enam "BYTECH".

#### Senarai calon = SEMUA murid dalam skop (28 Okt 2026)

**Setiap** sub-anugerah kini memaparkan **semua** murid dalam skopnya, dalam modal 👤 Pilih Murid (admin) **dan** mod ✨ Cadang borang guru (`guru.html`). Contoh: "BAHASA MELAYU — DARJAH 1" memapar setiap murid darjah 1, bukan 10 calon teratas. Admin/guru memilih sendiri.

- Murid **ada markah** disusun ikut kedudukan; label "Cadang" masih menanda top-N. Tiada kotak ditanda automatik (peraturan di atas kekal).
- Murid **tiada markah** (belum diisi / TH / tiada subjek teras) diletak **di bawah**, tanpa kedudukan, berlabel "Tiada markah" — tetapi **masih boleh ditanda**. `agKiraCalon` memulangkan mereka sebagai `tanpaMarkah[]` (`{no_kp,nama,tahun,kelas,tiadaMarkah:true}`, susun nama). `senarai` tidak berubah, jadi pemanggil lain tidak terjejas. Invarian: `senarai + tanpaMarkah` = setiap murid skop, tepat sekali (`tanpaMarkah.length === tiadaMarkah + tiadaTeras`).
- Penerima tanpa markah yang disimpan dari modal admin ditulis `sumber:'manual', nilai:null, catatan:''`.
- Kunci darjah borang guru (`luarSkopSub`) **kekal** — "semua" bermaksud semua dalam skop sub, bukan seluruh sekolah.
- Medan `paparSemua` dan kotak `s-papar` dalam modal Ubah Sub kini **tiada kesan** pada dua skrin ini; dibiarkan supaya dokumen sub tidak disentuh.

Disahkan: oracle 3,000 kes rawak `agKiraCalon` (semua asas × skop × satu/beberapa peperiksaan × teras) — 0 beza.

#### 📋 Papar N teratas (30 Okt 2026)

`s.paparTop` (nombor, per sub; `a.paparTop` sebagai lalai) — `agPaparTop(a, s)` / `agTapisTop(senarai, n)` dalam `anugerah-kongsi.js`. **Tiada / 0 = semua murid skop** (peraturan 28 Okt di atas kekal untuk sub tanpa medan ini).

- **Master + sub**: **Ubah Anugerah → 📋 Papar berapa teratas** = `a.paparTop`, lalai SEMUA sub (auto sahaja; manual dibuang). Sub: **kosong = ikut anugerah** (tiada medan), **0 = semua** (timpa master), N = timpa. `agPaparTop` menyemak `s.paparTop != null` — jangan tukar kepada `s.paparTop ||`, itu menjadikan 0 jatuh ke master.
- Ditetapkan admin dalam **Ubah Sub → 📋 Papar berapa teratas** (menggantikan kotak `s-papar` "Papar semua" yang tiada kesan; `paparSemua` lama tetap dibawa oleh `baca()`). ⚡ Jana semua menyalin `paparTop`.
- **Dua skrin, satu penapis**: modal admin `pmLukisCalon` dan borang guru `senaraiMurid()` (mod CALON) kedua-duanya memanggil `agTapisTop`. Murid luar top N **dan** murid tiada markah disorok; **seri pada nilai kedudukan ke-N ikut sekali**.
- **Berasingan daripada `ambil`** (label "Cadang") — keputusan pengguna. Contoh: ambil 3, papar 20.
- Borang guru: sub dengan `paparTop` **terus dibuka dalam mod ranking** (`CALON_MEMUAT` mengelak kiraan berganda) dan butang senarai penuh abjad (`b-senarai`) **disorok** — ia akan memapar murid luar top N.

Oracle 20,000 kes `agTapisTop` (termasuk seri, n > panjang, n = 0) — 0 beza.

#### Terbaik Dalam Kelas = enam anugerah, satu per darjah

Pokok hanya dua aras, jadi tiga aras (anugerah › darjah › kelas) dibuat sebagai **enam anugerah** — `ANUGERAH TERBAIK DALAM KELAS — DARJAH 1` hingga `6` — masing-masing dengan kelas darjah itu sebagai sub. Nama sub ialah `1 INTEL`, `2 INTEL` dan seterusnya: nombor darjah menjadikannya unik, jadi tiada pengulangan dalam senarai.

#### Susunan naik pentas — sub boleh diseret, bukan hanya anugerah

Tab **Giliran & Tiket** → "Susunan Naik Pentas" ialah **accordion dua aras**: tekan nama anugerah, sub-anugerahnya terbuka di bawah dan boleh diseret sendiri. Sebelum ini hanya anugerah boleh disusun, jadi susunan dalam `ANUGERAH TERBAIK DALAM KELAS` (38 kelas, 1 BYTECH → 6 PIXEL) terkunci pada susunan ia dijana.

**`draggable="true"` sahaja tidak membuat apa-apa.** Baris anugerah sudah membawanya, tetapi tiada pendengar `dragstart`/`dragover`/`drop` pernah ditulis — hanya butang ↑↓ yang berfungsi, dan tooltip "Seret untuk susun" berbohong. Pendengar itu kini wujud untuk kedua-dua aras.

**Sub TIADA medan `urutan`.** `binaTurutan()` membaca `(a.sub || []).forEach` — susunan sub ialah **susunan array `a.sub`** itu sendiri. Jadi `pindahSub` menyusun semula array dan menyimpan; menambah medan `urutan` pada sub akan memecahkan `binaTurutan` secara senyap.

**Pindah = `splice`, bukan tukar tempat.** Seret dari baris 1 ke baris 6 mesti **menyelit** di situ, bukan bertukar dengan baris 6 dan meninggalkan lima yang lain tidak berganjak. Butang ↑↓ ialah kes khas `splice` yang sama (jarak 1), jadi satu laluan kod sahaja.

**Aras dikunci semasa seret.** Satu sub tidak boleh dilepaskan sebagai anugerah, dan sub hanya bergerak dalam induknya sendiri — `dragover` tidak memanggil `preventDefault()` bila aras tidak sepadan, jadi drop tidak pernah dicetuskan. Tanpa ini, menyeret "1 INTEL" ke atas senarai akan menjadikannya anugerah peringkat atas.

**Butang disemak dahulu dalam pendengar klik.** `closest('button[...]')` dipanggil sebelum `closest('.sgil-induk')` — butang berada *di dalam* baris induk, jadi menekan ↑ juga akan menogol accordion kalau urutan semakan terbalik. (Perangkap yang sama seperti pokok Jenis Anugerah.)

**↑↓ dikekalkan di samping seret**, dan butang hujung di-`disabled`. Admin majlis ramai dan sebahagiannya kurang biasa dengan komputer — seret tetikus pada senarai 38 baris yang menatal bukan satu-satunya jalan yang patut ada.

`SGIL_BUKA[anugerahId]` menyimpan blok mana terbuka supaya `lukisGiliran()` selepas setiap simpanan tidak menutup semula apa yang admin sedang kerjakan; `pindahSub` memaksanya terbuka.

**Nombor giliran KEKAL** — menyusun semula sub memapar amaran yang sama seperti menyusun anugerah (`amaranSusun()`), tidak pernah menulis nombor. Hanya 🔢 Beri Nombor / 🔁 Jana Semula mengubahnya.

Disahkan 21 Okt 2026 pada majlis sebenar (15 anugerah, 92 sub): accordion buka 38 kelas, ↓ dan seret-jauh kedua-duanya ditulis ke Firestore dan dipulihkan selepas ujian; seret sub→anugerah dan sub silang-induk kedua-duanya ditolak tanpa mengubah susunan. Oracle 280 kes `splice` (termasuk indeks di luar julat), 0 beza.

#### 🎓 Sijil (tab, `anugerah-sijil.js`) — 29 Okt 2026

Tab ke-8 dalam `anugerah-admin.html`; kod dalam fail berasingan `anugerah-sijil.js` (dimuat **selepas** skrip utama, guna globalnya: `MAJLIS`, `PENERIMA`, `$`, `bukaModal`, `simpanMajlis`, `susunanAnugerah`). Fungsi `sj*`, DOM id `sj-`.

**Satu sijil satu ANUGERAH** (bukan satu seorang seperti tiket) — murid menang 3 = 3 sijil. Senarai = `agBinaTurutan` disusun ikut nombor giliran; pilihan "ikut kelas & nama" untuk diedar guru kelas.

`MAJLIS.sijil = {templat:[{id,nama,gambarUrl,orientasi:'L'|'P',medan:[]}], lalai, peta:{anId | 'anId::subId': templatId}, pentadbir:[{nama,jawatan,ttdUrl}×3]}`. Keutamaan templat: **sub > anugerah > lalai**. Peta disimpan pada majlis, **bukan pada objek sub** — `baca()` modal sub membina objek baharu dan akan memadamnya.

- **Ditulis dengan `update({sijil})`, BUKAN `set(merge)`** — merge menggabung `peta` secara mendalam, jadi kunci yang dibuang hidup semula. `not-found` (majlis belum disimpan) → `simpanMajlis()`.
- **`sjFonCss` memulangkan petikan TUNGGAL** (`'Cinzel', serif`). Ia masuk ke dalam `style="…"`; petikan berganda menamatkan atribut pada `font-family` dan font/bold/italic/warna/jajaran hilang senyap (saiz masih nampak berfungsi kerana auto-kecil menetapkannya melalui JS). Ditemui pengguna 29 Okt 2026. Uji dengan **menghurai atribut** `style`, bukan `includes()` pada rentetan — ujian rentetan lulus walaupun pepijat ini wujud.
- **Satu pelukis** (`sjIsiHalaman`/`sjHtmlMedan`) untuk editor, pratonton dan cetakan. Halaman dilukis dalam **mm sebenar**; editor hanya `transform:scale`, jadi seretan = cetakan. Kedudukan `x,y,w` mm (penjuru kiri-atas).
- **Cetak = dialog cetak pelayar dalam tetingkap baharu**, bukan jsPDF: font Google (Great Vibes dll.) tanpa benam TTF, `<img>` Storage tanpa CORS. `@page` bernama L/P margin 0; tinggi 209.6mm (tepat 210mm boleh memberi halaman kosong). Tunggu stylesheet → gambar → `document.fonts.load` **sebelum** auto-kecil.
- **Auto-kecil font** `sjMuatkanSatu` (0.25pt, min 8pt) — pengajaran `_slipTeksMuat`. Tidak terpakai pada medan `balut`. Editor memapar amaran bila dikecilkan / masih tak muat.
- Teks = ayat bebas + `{kod}` (`SJ_KOD`). Kod salah eja **kekal kelihatan**. Mana-mana kod kosong → medan disembunyikan (lalai `sembunyiKosong`) — bukan murid tiada kelas/KP. Dalam editor ia dilukis pudar supaya masih boleh diseret.
- Gambar dikecilkan dalam pelayar sebelum muat naik ke `public/sijil/` (templat 3508px JPEG, tandatangan/cop 1200px PNG telus) — had `storage.rules` 5MB. Storage SDK dimuat malas.
- **`{no_siri}` = nombor GILIRAN anugerah itu, diformat** (`sjNoSiri`, `MAJLIS.sijil.siri = {awalan, digit, akhiran}`; awalan/akhiran boleh bawa `{tahun}`). Bukan nombor kedua — satu nombor supaya sijil sepadan dengan tiket. Tiada giliran → kosong → disorok. Pakai atau tidak = admin letak item itu dalam templat atau tidak. Gaya C: pengikut berkongsi `no` utama, jadi siri sama (pengguna pilih tanpa huruf A/B/C, 29 Okt 2026). Jana Semula selepas cetak = siri tidak lagi sepadan.
- **`templat.kertasBercetak`** (📄 *Kertas sudah bercetak — cetak teks sahaja*): gambar latar ialah mock up untuk menyusun teks; `sjIsiHalaman(..., cetak=true)` tidak memasukkannya. Editor & pratonton masih memaparkannya (berlabel). Tandatangan/cop tetap dicetak — ia item, bukan latar. **`sijil.laras {x,y}`** anjak semua item dalam cetakan (`.sj-isi` translate) kerana pencetak tersasar 1–3mm; editor tidak dianjak.
- **🔄 Segar semula** (kad Cetak) membaca segar dokumen majlis + `anugerah_penerima`, dikemas **di tempat** (`Object.assign(MAJLIS, …)` — `SENARAI_MAJLIS` memegang rujukan yang sama), dan melapor beza `+N baharu / N dibuang / N nombor berubah` (kunci `no_kp|subId`). Perlu kerana borang guru & admin lain tidak sampai ke pelayar ini tanpa muat semula. Draf editor tidak disentuh.
- **Tetapan slip ESIS (nama GB, jawatan, tandatangan) disimpan dalam `localStorage` pelayar (`slipTemplateSettings`), BUKAN Firestore.** "📥 Ambil dari slip ESIS" hanya berfungsi di komputer tempat slip disetkan; selepas Simpan, sijil berdiri sendiri.

- **Kad 5 · Nama pada Sijil** (30 Okt 2026, `sjLukisNama`, DOM `sj-nama`) — dua tetapan per anugerah/sub, **sijil sahaja**: tiket, MC, slaid, Giliran dan Semak kekal dengan nama ESIS.
  - `MAJLIS.sijil.nama{}` menimpa `{anugerah}` / `{sub}`. Kosong = nama ESIS. Kod `{anugerah_asal}` / `{sub_asal}` sentiasa nama ESIS. Ini juga mengatasi nama lapuk: `x.anugerah`/`x.sub` pada penerima ialah salinan semasa murid dipilih.
  - `MAJLIS.sijil.papar{}` = `'kedua'|'an'|'sub'`, keutamaan **sub > anugerah > kedua** (`sjModPapar`/`sjPapar`). Nilai yang disorok **dikosongkan** dalam `sjData`, jadi item hilang melalui `sembunyiKosong` — pelukis tidak berubah. Syarat: `{anugerah}` dan `{sub}` mesti **dua item berasingan**.
  - Tanpa pilihan, sub yang namanya sama dengan anugerah (selepas timpa, huruf besar, ruang dimampat) disorok supaya tidak tercetak dua kali; `'kedua'` eksplisit menang.
  - Kedua-dua peta berkunci `anId` / `anId::subId` seperti `peta`, disimpan pada majlis (bukan objek sub). Disimpan terus pada `change`. Diluluskan pengguna 30 Okt 2026.

**Belum dibina / diketahui (29 Okt 2026):** item teks dengan `teks:""` tidak kelihatan langsung dalam editor (pengguna pernah menyimpan item `{no_siri}` yang kosong tanpa sedar — punca kosong belum dikenal pasti; cadangan label "(teks kosong)" dalam editor sahaja belum diluluskan). Gaya C: semua sijil seorang murid berkongsi No. Siri (cadangan akhiran -A/-B belum diluluskan). ✕ Buang tandatangan tidak memadam fail di Storage.

### Borang serahan guru (`public/guru.html`)

Sebahagian anugerah bukan milik admin: Tokoh NILAM diketahui oleh guru pusat sumber, Sahsiah Terpuji oleh guru disiplin. Admin menyerahkan anugerah itu dengan butang hijau **📝 Bina Borang** dalam pokok Jenis Anugerah; guru mendapat borangnya sendiri dan tidak pernah melihat majlis selebihnya.

`MAJLIS.borangGuru = { <anugerahId>: {kod, pw, nama, dibuka, masa, dihantar, masaHantar, bilHantar, dibukaSemula} }`

**Dua lapisan, bukan satu.** Kod dalam URL menentukan anugerah MANA; kata laluan (ditaip admin, bukan dijana) membuktikan siapa. Pautan boleh tersebar dalam grup WhatsApp — kata laluan ialah lapisan yang masih berdiri selepas itu. Kod **kekal** apabila kata laluan ditukar, supaya pautan yang sudah dihantar tidak mati.

**Tiada penyegerakan data.** Borang guru menulis terus ke `anugerah_penerima` — koleksi yang **sama** digunakan panel admin, ditanda `sumber:'guru'` dengan nama guru dalam `catatan`. Dua senarai bermakna dua kebenaran, dan pada hari majlis seseorang terpaksa menyatukannya dengan tangan. Murid guru muncul dalam Semak Penerima dan Giliran tanpa langkah import.

**Guru membuang HANYA `sumber:'guru'`.** Murid yang ditambah admin dipaparkan dengan 🔒 supaya guru tahu siapa sudah ada, tetapi tidak boleh membuangnya — menyerahkan satu anugerah tidak bermakna menyerahkan kuasa membatalkan keputusan orang lain. Disemak dua kali: butang disembunyikan dalam paparan **dan** `entri.sumber !== 'guru'` disemak sebelum menulis; kawalan yang hanya wujud dalam paparan bukan kawalan.

#### Buang penerima — tiga tempat, satu enjin

Butang berada **di tempat kerja**, bukan dalam satu kad tetapan jauh:

| Tempat | Skop |
|---|---|
| 🏆 Jenis Anugerah — 🧹 pada baris anugerah | Anugerah itu + semua subnya |
| 🏆 Jenis Anugerah — 🧹 pada baris sub | Sub itu sahaja |
| 📋 Semak Penerima — 🧹 Buang yang dipapar | Ikut tapisan semasa |
| ⚙️ Majlis — kad Reset | Hanya dua tindakan seluruh-majlis |

Butang 🧹 **tidak dipapar bila 0 murid** — tiada butang untuk kerja yang tiada.

Semua menuju ke `resetJalan(label, padan, padanKunci)` → `resetOps(padan)`. Jenis anugerah, sub, tetapan subjek dan pautan borang guru **tidak pernah disentuh** — selepas membersihkan data ujian admin mahu majlis yang sama, bukan membina semula lima puluh lima sub.

**Predikat menerima `(entri, murid)`.** Hujah kedua wujud semata-mata untuk buang-ikut-tapisan: tapisan darjah/kelas/nama memilih **murid**, manakala tapisan anugerah memilih **entri**. Menapis kepada satu sub dan menekan Buang mesti mengeluarkan murid itu daripada **sub itu sahaja**, bukan daripada setiap anugerah lain yang dia menang.

**Borang yang dibuka semula mesti hanya yang benar-benar kehilangan penerima.** `resetJalan` mengumpul `kenaSub` (set `anugerahId|subId` yang tersentuh) dan menurunkan `padanKunci` daripadanya apabila pemanggil tidak memberi satu. Versi pertama menghantar `() => true` daripada Semak Penerima — menapis kepada satu kelas akan membuka semula borang **setiap** guru dalam majlis, sedangkan senarai mereka tidak disentuh.

**Membuang dropdown lama meninggalkan empat pendengar yatim** (`rs-anugerah`, `rs-sub`, dan dua butang). `$('rs-anugerah').addEventListener` pada `null` melontar `TypeError` semasa skrip dimuat dan **mematikan setiap `let` selepasnya** — perangkap yang sama seperti ketika tab Pilih Murid dibuang. `lukisReset()` dikekalkan sebagai tiada-op kerana `pilihMajlis` dan `resetJalan` masih memanggilnya; membuang pemanggil satu-satu ialah cara pendengar yatim masuk semula.

**Penerima ialah satu doc per MURID dengan array `anugerah[]`.** Membuang satu sub bermakna **menapis array itu**, bukan memadam doc — murid yang sama mungkin memegang anugerah lain. Doc dipadam hanya apabila `anugerah[]` jadi kosong. `giliran[]` ditapis dengan predikat yang **sama**, jika tidak nombor giliran yatim kekal menunjuk kepada anugerah yang sudah tiada. `resetOps(padan)` ialah satu-satunya tempat logik ini hidup; ketiga-tiga skop memanggilnya.

**Firestore menghadkan 500 operasi satu batch** dan majlis ini melebihi seribu murid. `resetTulisPukal` memecah pada `RESET_CHUNK = 400`. Tiada tempat lain dalam fail ini yang chunk — kalau satu tulisan pukal baharu ditambah, ia perlukan ini juga.

**Borang yang penerimanya dibuang DIBUKA SEMULA automatik** (`resetBukaBorangTerjejas`). Senarai yang guru hantar sudah tiada, jadi "✓ Dihantar" menjadi pembohongan yang admin sendiri cipta — dan guru tidak boleh membukanya sendiri.

Pengesahan menaip **"PADAM"**, bukan `confirm()` — satu Enter tersasar tidak boleh mengosongkan senarai penerima satu majlis. Kiraan dipapar sebelum menekan (`Sub ini: N · Seluruh anugerah: N`) supaya admin nampak saiz kerosakan dahulu.

**Kosongkan nombor giliran** menyimpan `giliranLama`, jadi butang ↩️ Pulihkan masih berfungsi. Ia berbeza daripada 🔁 Jana Semula: Jana Semula memberi nombor **baharu**, ini mengosongkan terus.

Disahkan 21 Okt 2026: oracle 3,000 kes rawak (murid memegang 1–4 anugerah merentas 3 anugerah × 4 sub, ketiga-tiga mod skop) terhadap pelaksana bebas — 0 beza, termasuk sifat "murid yang pegang anugerah lain tidak dipadam". Kiraan disahkan pada majlis sebenar (5 penerima) tanpa menulis apa-apa.

#### Borang boleh dibina pada aras SUB, bukan hanya anugerah

`MAJLIS.borangGuru` dikunci oleh **`anugerahId`** (aras anugerah) atau **`anugerahId::subId`** (aras sub) — **satu peta untuk kedua-duanya**, bukan dua struktur selari, supaya status/hantar/batal hanya ada satu laluan kod. Format kunci itu diketahui oleh `agKunciBorang()` / `agPecahKunci()` sahaja; jangan cantum `'id::id'` dengan tangan di tempat lain.

Sebabnya: `ANUGERAH TERBAIK DALAM KELAS` ada 38 sub (satu per kelas). Satu borang aras-anugerah memberi setiap guru kelas pandangan ke atas 37 kelas orang lain, dan dia perlu menatal mencari kelasnya sendiri.

**SUB MENANG apabila bertindih.** Kalau sub ada borangnya sendiri, guru borang **induk** tidak melihat sub itu langsung — `subUntukBorangIni()` dalam `guru.html` menapisnya keluar. Tanpa peraturan ini dua guru menulis ke sub yang sama dan boleh saling memadam senarai masing-masing.

**Satu ujian keahlian untuk semua tempat: `dalamSkopBorang(x)`.** Kiraan (`bilDipilihGuru`), senarai pengesahan hantar, dan jadual paparan (`lukisPilih`) semuanya memanggilnya. Kalau ketiga-tiganya tidak berkongsi satu fungsi, guru boleh menghantar murid yang skrinnya tidak pernah tunjukkan.

Borang aras-sub mengunci dropdown Sub-anugerah (`disabled`, bukan disembunyikan — kawalan yang hilang menimbulkan soalan, kawalan yang mati menjawabnya), dan tajuk memapar nama **sub**, bukan nama anugerah.

#### Label "dah dapat N anugerah" (modal Pilih Murid)

Admin memilih calon **satu sub pada satu masa**, jadi tanpa label ini dia tidak dapat melihat bahawa murid di hadapannya sudah memenangi tiga anugerah lain. Keputusan "beri juga kepadanya atau beri kepada orang kedua" ialah keputusan sekolah — tetapi ia tidak boleh dibuat atas maklumat yang tidak kelihatan.

Pil merah **⚠ N anugerah ▾** di sebelah nama, dalam kedua-dua jadual modal (calon automatik dan tambah manual). Klik → popover menyenaraikan sub + anugerah induk setiap satu. Fungsi `pmPetaLain()` / `pmPilLain()` / `pmTunjukLain()`.

**Sub yang sedang DIBUKA dikecualikan daripada kiraan.** Label bermaksud "sudah dapat di tempat **lain**"; memasukkan sub ini bermakna nombor bertukar sebaik admin menanda kotak, dan label menjadi gema tandaannya sendiri, bukan maklumat baharu. Lajur Status sudah menunjukkan "Dipilih" untuk itu.

**Label SENTIASA "N anugerah", termasuk N=1 — jangan tukar kepada nama anugerah.** Pernah dicuba: pada N=1 nama anugerah dipapar terus ("MURID CEMERLANG KAFA 2025"). Ia nampak lebih bermaklumat tetapi memecahkan kerja sebenar label itu. Label ialah **bendera**: mata mengimbas 183 baris dan menangkap yang merah tanpa membaca. Bendera yang panjang pada sesetengah baris dan pendek pada yang lain memaksa admin **membaca** setiap satu. Jenis anugerah ialah kerja popover.

**`z-index` MESTI mengatasi `.lapis` (200, dalam `<style>` inline `anugerah-admin.html`).** Pada 120 popover terbina dengan kedudukan dan saiz yang betul, `visibility:visible`, tiada ralat konsol — tetapi dilukis **di belakang lapisan gelap modal**. Gejalanya: klik nampak seperti tidak berfungsi langsung. Kini 260. Sahkan dengan `elementFromPoint`, bukan dengan melihat nilai `z-index` sahaja.

**Popover, BUKAN `bukaModal()`.** `bukaModal` menulis ganti `#bekas-modal` sepenuhnya, jadi modal bersarang memusnahkan modal Pilih Murid dan admin kehilangan setiap kotak yang sudah ditandanya. Popover duduk pada `document.body` dan berbalik ke atas/kiri bila dekat tepi skrin (jadual calon menatal dalam 340px, modal di tengah skrin).

**Satu pendengar klik peringkat dokumen**, dijaga `window._pmLainPasang`. Jadual dilukis semula pada setiap taip dalam kotak carian — pendengar per-butang akan berhimpun dan satu klik membuka beberapa popover.

Baris popover tidak mengulang nama bila `sub === anugerah` (contoh `KEHADIRAN PENUH`). `title` butang sentiasa membawa senarai penuh, jadi hover berfungsi tanpa klik.

Disahkan 22 Okt 2026: oracle 10,562 kes (`pmPetaLain` berbanding pelaksana bebas, termasuk sifat "sub semasa tidak pernah bocor" dan "murid tanpa anugerah lain tidak hadir dalam peta") — 0 beza; 10 kes label termasuk escaping; dan melalui UI sebenar dengan `.lapis` z-index:200 di tempatnya.

#### Carian nama — token, bukan substring

`agPecahCarian(q)` + `agPadanCarian(c, nama, noKP)` dalam `anugerah-kongsi.js`. Ketiga-tiga kotak carian modul ini memakainya: **Semak Penerima** (`sk-cari`), **modal Pilih Murid** (`pm-cari`), dan **borang guru** (`f-cari`).

**Nama Melayu panjang memecahkan padanan substring.** `MUHAMMAD DANIAL ASYRAF BIN MOHD KHAIRUNIZAM` — guru mengingati nama pertama dan nama bapa, jarang urutan tepat dengan BIN/BINTI di tengah. Disahkan pada 1,134 murid sebenar: `danial khairunizam` memulangkan **0** sebelum ini, begitu juga `sophia zaki` dan mana-mana urutan terbalik.

Peraturannya: **setiap token mesti hadir, urutan tidak penting.** Taip lebih banyak perkataan = lebih sempit, yang memang apa yang orang jangka. Ruang berlebihan, tab dan baris baharu dinormalkan (`split(/\s+/)`), jadi `aaira  amani` tidak lagi memulangkan sifar.

**Digit dicari pada `no_kp`, bukan pada nama,** dengan ambang **4 digit** — tanpa ambang, menaip `99` dalam nama akan menarik masuk setiap KP yang mengandunginya. Tanda sempang dilucutkan pada kedua-dua belah, jadi `140102-11-0011` dan `140102110011` sama-sama padan.

`agPecahCarian` dipanggil **sekali** oleh pemanggil, bukan sekali bagi setiap murid dalam gelung penapis. Diukur 0.44ms bagi 1,134 murid.

Disahkan 21 Okt 2026: oracle 2,022 kes (termasuk 2,000 rentetan rawak — tiada hempas pada nilai null/pelik), dan melalui UI sebenar: `layth saleh`, `saleh layth`, KP penuh dan KP bertanda semuanya 0 → 1.

#### Satu majlis, dua nama peperiksaan (ikut darjah)

Sekolah ini menduduki **UJIAN AKHIR SEMESTER (UASA)** bagi darjah 4–6 dan **PENTAKSIRAN AKHIR TAHUN** bagi darjah 1–3. Satu medan `MAJLIS.peperiksaan` tidak dapat membawa kedua-duanya — kesannya **21 sub darjah 1–3** mengira UASA yang muridnya tidak pernah duduki, dan senarai calon keluar kosong tanpa sebarang mesej yang menerangkannya.

**`examTypes` SUDAH menyimpan `darjah[]`** (UASA = `[4,5,6]`, PENTAKSIRAN = `[1,2,3]`), jadi admin tidak perlu memberitahu sistem apa yang ia sudah tahu. `agPepUntukDarjah(majlis, darjah)` membaca medan itu; `MAJLIS.pepDarjah{}` hanya menyimpan pilihan admin apabila dia **menimpa** tekaan automatik.

Keutamaan penuh, tertinggi menang:

```
sub.peperiksaan  >  anugerah.peperiksaan  >  MAJLIS.pepDarjah[n]
                 >  examTypes.darjah      >  MAJLIS.peperiksaan
```

**Peperiksaan `aktif:false` tidak pernah dipilih automatik** — sekolah ini ada tiga peperiksaan tidak aktif bagi darjah 4–6 (UPSA, MATRIKS PRISMA, dan satu "UASA" pendua). Antara yang aktif, peperiksaan majlis menang bila ia sendiri meliputi darjah itu (admin memilihnya dengan sengaja); jika tidak, yang terakhir mengikut `order`.

**Skop bukan-darjah jatuh ke `MAJLIS.peperiksaan`.** `agDarjahSub()` memulangkan 0 untuk skop `sekolah` dan `tahap` kerana ia merentasi beberapa darjah — tiada satu kertas yang betul untuk dipilih.

Admin melihat dan menimpa peta itu dalam **⚙️ Majlis → Peperiksaan mengikut darjah**: enam baris, setiap satu memaparkan nama yang akan digunakan (`auto: PENTAKSIRAN AKHIR TAHUN`) atau `ditetapkan admin`. Pendengar `change` duduk pada **bekas**, bukan setiap `<select>` — baris dilukis semula setiap kali dan pendengar per-elemen akan berhimpun.

Nota dalam modal anugerah menyenaraikan darjah sebenar sub anugerah itu (`D1: PENTAKSIRAN AKHIR TAHUN · D6: UASA`) supaya admin tidak perlu membuka tab lain untuk menyemaknya.

Disahkan 21 Okt 2026: oracle 22 kes terhadap `examTypes` sebenar sekolah — darjah 1–3 → PENTAKSIRAN, 4–6 → UASA, timpa admin menang, peperiksaan tidak aktif dilangkau, skop sekolah/tahap jatuh ke lalai majlis.

#### Tiket, kad jemputan dan slaid — tiga keluaran, satu sumber

| Keluaran | Tab | Susunan | Saiz |
|---|---|---|---|
| **Tiket giliran** | 🎟️ Giliran & Tiket | nombor giliran | 136mm, 4 sehelai A4 |
| **Kad jemputan** | 💌 Kad Jemputan | nombor giliran terkecil (sama dgn tiket, 1 Nov 2026; tiada nombor → bawah ikut nama; nombor TIDAK dicetak) | 139×94mm, 4 sehelai A4 **landskap** |
| **Slaid PPTX** | 🎟️ Giliran & Tiket | nombor giliran | 16:9 |

**SATU TIKET SEORANG MURID**, bukan satu per anugerah. Murid yang menang beberapa anugerah tetap naik pentas beberapa kali (`binaTurutan` tidak disentuh) tetapi memegang satu keping yang menyenaraikan semua anugerah dan semua nombor gilirannya. Sama untuk kad jemputan, dengan nota "anak anda dipanggil 2 kali — sila kekal di dewan".

**Nombor giliran duduk SEBARIS dengan anugerahnya** (jadual `.gil-jadual`, dua lajur `NAMA ANUGERAH | GILIRAN`). Susunan lama ialah dua lajur dengan lajur kanan 92px mengumpulkan semua nombor **bertindan** — murid yang menang tiga anugerah memegang nombor 1, 6 dan 18 dalam satu blok dan nama anugerah di lajur lain, jadi dia tidak tahu yang mana untuk yang mana. Itu soalan yang tiket ini wujud untuk menjawabnya. Jangan kembalikan lajur berasingan.

Tiket kini **satu lajur rata tengah**: sekolah → majlis → nama murid (serif, terbesar) → kelas → jadual anugerah. Nama sekolah dan majlis dibaca daripada `MAJLIS.sekolah` / `MAJLIS.nama` — tiada medan baharu untuk admin isi.

**Auto-muat (1 Nov 2026):** tiket pada skrin kini **saiz cetak sebenar** (97×136mm, taip cetak), dan `tiketMuatkan()` mengukur setiap tiket (`scrollHeight > clientHeight`) lalu mengecilkan `--sk` (skala taip, 1 → 0.5, langkah 0.05) sehingga muat. Menggantikan kelas `.padat` lama (ambang 4 anugerah, hanya "disahkan muat sehingga 5"). Dipanggil selepas `lukisTiket`, semasa tab Giliran dibuka (panel tersembunyi tiada ukuran), selepas `document.fonts.ready`, dan pada `beforeprint`. `#t-kira` melapor "N tiket dikecilkan" dan amaran merah jika masih tidak muat pada 0.5. Semua teks tiket hitam #000 (pencetak kualiti rendah).

**136mm ialah nilai yang diukur, bukan dipilih.** A4 = 297mm tolak margin 8mm atas+bawah = 281mm ruang; 2 baris × 136 = 272mm, lega 9mm. **Jangan naikkan ke 140mm**: 2 × 140 = 280mm meninggalkan 1mm, dan pembundaran pemandu pencetak menolak baris kedua ke halaman baharu — gejalanya **2 sehelai, bukan 4**. Nilai asal 74mm memberi 6 sehelai sedangkan UI menjanjikan 4.

**Kad jemputan: butiran ialah baris DINAMIK** (`MAJLIS.kadBaris`), bukan medan tetap — setiap sekolah mahu perkara berbeza (pakaian, masa tiba, nombor untuk dihubungi). Tarikh majlis disalin sebagai nilai permulaan **sekali sahaja**; selepas simpan ia berdiri sendiri supaya menukar tarikh majlis tidak mengubah kad secara senyap. Baris tanpa label dibuang semasa simpan. Admin menyusun baris dengan seret ⠿ atau ↑↓ (`pindahKjBaris`, `splice` menyelit); susunan dipapar terus pada pratonton, disimpan dengan 💾.

**`kjSemakMuat()` memberi amaran sebelum isi terpotong.** Kad ialah tinggi TETAP dengan `overflow:visible` — isi yang terlalu panjang tidak menatal dan tidak mengembangkan `scrollHeight`, ia terkeluar senyap dan dipotong oleh pemotong kertas. Jadi tinggi cetak dikira (136mm tolak padding) berbanding jumlah tinggi anak kad. Diukur pada data sebenar: ruang susut ~23px setiap anugerah dan habis pada yang **ke-10**; ambang 30px memberi amaran tepat di situ (ambang 12px memberi amaran pada ke-11 — sudah terlambat).

**PPTX dijana terus sebagai OOXML** (`anugerah-pptx.js`) — PPTX ialah fail ZIP berisi XML, jadi hanya JSZip diperlukan. Struktur slaid **identik dengan `tayang.html`**: satu slaid satu sub-anugerah. **Teks MESTI dilepaskan untuk XML** — nama murid membawa `&` dan kadangkala `<`; satu aksara tidak dilepaskan merosakkan keseluruhan fail dan PowerPoint menolaknya dengan "perlu dibaiki" tanpa menyatakan sebab.

#### Anugerah tanpa sub — penerima disimpan pada `subId`

**Penerima disimpan pada `subId`, bukan `anugerahId`.** Giliran, tiket, kad jemputan, slaid dan Semak Penerima semuanya memadankan padanya, jadi anugerah tanpa sub **tidak dapat memegang seorang pun murid dan tidak muncul di mana-mana** — admin menyangka ia rosak sedangkan ia cuma tiada tempat simpan.

Anugerah baharu kini mencipta satu sub dengan **nama yang sama**, skop sekolah. Anugerah lama (0 sub) mendapat butang **👤 Pilih Murid** pada baris kosongnya yang mencipta sub itu pada klik pertama lalu terus membuka modal. `➕ Sub berasingan` kekal untuk yang memang perlu dipecah.

**Modal Pilih Murid manual: "— semua darjah —"** untuk sub bukan-darjah. Tanpanya admin terpaksa memilih satu darjah dahulu dan kotak carian nama menjadi hampir tidak berguna — ia hanya menapis dalam darjah yang kebetulan dipilih, sedangkan anugerah berskop sekolah boleh memenangi murid dari mana-mana darjah. `isiKelas()` memberi kelas daripada semua darjah (dinyahduakan — "INTEL" wujud di enam darjah), dan "Tanda semua" meminta pengesahan melebihi 60 baris.

**`MURID_SEMUA` diisi sekali dalam `mulaPanel()`.** Kalau pemuatan itu gagal, modal keluar "Tiada murid padan" tanpa sebab. `pmLukisManual()` kini memuatnya sendiri bila kosong.

#### Anugerah subjek: pecah ikut darjah

Butang **⚡ Pecah ikut darjah** menukar sub berskop `tahap` kepada satu sub per **darjah**: 13 subjek → **39 sub**. Pokok mengumpulkannya ikut **SUBJEK** (`agSubjekSub`) — 39 baris rata tidak boleh dibaca, jadi `SAINS` menjadi satu tajuk buka/tutup dengan `SAINS — TAHUN 4/5/6` di dalamnya, sama seperti sub berskop kelas dikumpul ikut darjah.

Nama sub membawa subjek **penuh** (`SAINS — TAHUN 4`), bukan "Tahun 4" sahaja: tiket, slaid, kad jemputan dan CSV memaparkan nama sub tanpa konteks kumpulan pokok. `paparSemua:true` — setiap murid darjah itu dipapar mengikut kedudukan, terbaik di atas, admin menandakan sendiri.

`agSubjekSub()` mengendalikan subjek **array** ("Pendidikan Islam dan Moral") supaya kedua-duanya kekal satu kumpulan, tidak pecah dua.

#### Borang aras-DARJAH (kumpulan kelas)

Kunci `borangGuru` ada **tiga** bentuk, semuanya dalam satu peta:

| Kunci | Liputan |
|---|---|
| `anugerahId` | seluruh anugerah |
| `anugerahId::subId` | satu sub |
| `anugerahId::@DARJAH` | semua sub berskop kelas dalam darjah itu |

**Awalan `@` membezakan darjah daripada sub.** Id sub dijana sebagai `sub_<base36>` dan tidak pernah bermula dengan `@`, jadi tiada pertembungan. `agKunciBorang` / `agKunciDarjah` / `agPecahKunci` ialah satu-satunya tempat format ini diketahui.

Sebabnya: `ANUGERAH TERBAIK DALAM KELAS` ada 38 kelas dikumpul kepada 6 darjah. GPK darjah memegang satu darjah penuh — tanpa aras ini admin mengurus enam pautan dan enam kata laluan untuk satu orang.

**Keutamaan: SUB > DARJAH > ANUGERAH.** Borang darjah melangkau sub yang sudah diserahkan individu; borang anugerah melangkau kedua-duanya. Satu sub tepat satu borang, sentiasa. Dalam pokok, butang sub yang diliputi borang darjah bertukar menjadi **"↳ ikut darjah"** (sunyi, tetapi masih boleh ditekan — menekannya membina borang sub yang kemudian menang, yang jarang apa yang dimaksudkan, jadi ia bertanda dan bukan hijau).

**`data-dj-*` membawa `"indeks,DARJAH"` dan darjah ialah PERKATAAN** (SATU..ENAM) — ia tidak boleh dihurai dengan `.split(',').map(Number)` seperti pasangan indeks lain dalam fail ini. `pecahDj()` memisahkan pada koma pertama sahaja. Butang Urus dalam Link Petugas menggunakan awalan `@` pada ekornya atas sebab yang sama.

Kumpulan darjah ialah pengumpulan **paparan** (`ikutDarjah` dalam `lukisPokok`), bukan entiti bersimpan — tiada id untuk dirujuk, jadi kunci dibina daripada `skopDarjah` sub itu sendiri.

Disahkan 21 Okt 2026 pada majlis sebenar (38 kelas): enam kumpulan darjah masing-masing dengan butangnya; menyerahkan Darjah 1 menukar keenam-enam kelasnya kepada "↳ ikut darjah", borang darjah melihat 6 kelas, borang anugerah turun 38 → 32 tanpa satu pun kelas darjah 1. Oracle 37 kes (pusing-balik tiga bentuk + matriks keutamaan termasuk sub individu di dalam darjah yang diserah), 0 beza.

#### Hantar = TERKUNCI; hanya admin boleh buka semula

Guru **tidak** boleh membuka semula borangnya sendiri. Butang 🔓 dalam `guru.html` dibuang; `agBukaSemulaBorang` menjadi **`agResetBorang`** dan dipanggil hanya dari modal admin.

Sebabnya: sebaik borang dihantar, admin mula menyusun giliran dan **mencetak tiket** atas dasar senarai itu. Senarai yang boleh berubah diam-diam selepas itu bermakna tiket yang sudah dicetak tidak lagi sepadan — dan tiada siapa tahu bila ia berlaku. Guru yang tersilap menghubungi admin; admin menekan **🔓 Buka Semula untuk Guru**.

`masaReset` dirakam, dan `bilHantar` **dikekalkan** (ia merekodkan berapa yang dihantar dahulu). Menukar kata laluan juga mengekalkan semua medan status — menukar kata laluan bukan sebab untuk menghapus rekod bahawa guru sudah menghantar.

Tab **Link Petugas** memapar kedua-dua aras dalam **satu jadual** (`Anugerah — Sub`): admin bertanya "siapa memegang pautan apa", dan jawapan yang berselerak antara dua jadual bukan jawapan. Kiraan murid per baris mengikut **skop borang itu**, bukan skop anugerah — borang sub yang melaporkan kiraan seluruh anugerah memberitahu admin bahawa guru menghantar 38 kelas sedangkan dia hantar satu.

**Anugerah baharu yang diisi guru (contoh Kecemerlangan KAFA) tidak perlu kod baharu** — cipta anugerah, tambah sub, tekan 📝 Bina Borang. Tiada templat dikodkan untuk Kehadiran Penuh pun; `sumber:'guru'` datang daripada penerima, bukan daripada tetapan anugerah. Sync automatik: borang guru menulis terus ke `anugerah_penerima`, koleksi yang sama dibaca panel admin.

Disahkan 21 Okt 2026: oracle 123 kes (pusing-balik kunci termasuk subId yang mengandungi `::`, dan matriks skop induk/sub × peta borang × sub asing), 0 beza; tindihan induk+sub menghasilkan tepat satu borang per sub.

#### 🔒 Kunci borang — single & bundle (29 Okt 2026)

**Label (jangan campur):** borang guru = **🔒 Kunci borang** (tab Link Petugas); susunan murid = **📌 Kunci susunan** (tab Jenis Anugerah). Asalnya kedua-duanya 🔒 "Kunci semua" dan admin tertekan kunci susunan 28 kelas sangka ia kunci borang. Medan data kekal `ditutup` / `susunKunci`.

**Tutup ≠ Batal.** Batal memadam borang (pautan mati). Tutup (`borangGuru[k].ditutup`, `masaTutup`) mengekalkan pautan: guru boleh log masuk dan **melihat** senarainya, tetapi tidak boleh menambah, membuang atau menghantar. Murid yang sudah dipilih kekal.

- **Satu laluan** `jalanTutupBorang(kunciList, tutup, label)` → `agTutupBorang` (satu `update` dokumen majlis untuk semua kunci — bundle berjaya semua atau tiada). Dipanggil oleh: butang dalam modal Urus, butang setiap baris (single), baris kumpulan anugerah dalam jadual Link Petugas (bundle per anugerah, bila >1 borang), dan butang di atas jadual (semua borang majlis).
- `pilStatusBorang` dan lajur Status memapar **🔒 Ditutup** mengatasi status lain. Modal Urus `bg-simpan` membawa `ditutup`/`masaTutup` — menukar kata laluan tidak membuka borang.
- **guru.html menyemak status SEGAR dari Firestore (`agStatusBorang`) sebelum setiap tulisan** — simpan, buang, hantar (`borangMasihBuka`). Admin boleh menutup ketika guru sedang mengisi; `KONTEKS` yang dimuat semasa halaman dibuka sudah lapuk. Borang dibatalkan → `null` → ditolak juga.

#### Hantar = tanda siap, bukan pemindahan data

Murid sudah berada dalam majlis sejak guru menekan **Simpan**. Butang **📤 Hantar kepada Admin** menandakan senarai itu **muktamad** — ia memberi admin perbezaan antara "guru masih memilih" dan "guru sudah siap, jangan tunggu lagi". Tiada kelulusan, tiada barisan menunggu, tiada salinan kedua.

Tiga status, dipapar dalam pokok anugerah dan tab Link Petugas:
- `Diserah · belum dibuka` — guru belum menyentuh pautan
- `Sedang diisi · N murid` — dibuka, belum dihantar
- `✓ Dihantar · N murid` — siap, dengan masa

Borang yang dihantar menjadi **baca-sahaja**, tetapi guru boleh **membukanya semula sendiri**. Guru yang tersilap seorang murid tidak sepatutnya terpaksa mencari admin — dan status bertukar kembali kepada "sedang diisi", jadi tiada apa yang tersembunyi daripada admin. Kawalan **dimatikan, bukan disembunyikan**, supaya guru nampak apa yang ada dan faham ia terkunci buat sementara.

`guru.html` ada dalam senarai `no-cache` dalam `firebase.json` — sebab yang sama dengan panel lain.

#### Tab 🔍 Pilih Murid dibuang (Okt 2026)

Setiap kerjanya kini dibuat dari **🏆 Jenis Anugerah → 👤 Pilih Murid**, jadi tab berasingan itu hanyalah pintu kedua kepada bilik yang sama. Enam tab tinggal: Majlis · Tetapan · Jenis Anugerah · Semak Penerima · Giliran & Tiket · Link Petugas.

**Membuang panel mematikan seluruh skrip kalau pendengarnya ditinggalkan.** `$('b-tambah-manual').addEventListener(...)` di aras atas melontar `TypeError` pada `null` apabila butang itu tiada lagi — dan kerana ia berjalan semasa skrip dimuat, **setiap `let` selepasnya tidak pernah wujud**. Gejalanya menipu: fungsi di sekeliling wujud dan sintaks lulus, tetapi tab Semak Penerima terbuka kosong dengan `Cannot access 'SK_BARIS' before initialization`.

Selepas membuang mana-mana panel, imbas dua perkara: pendengar aras-atas yang merujuk id yang sudah tiada, dan fungsi yang kehilangan semua pemanggilnya. `tambahPenerimaManualRamai` dan `agDarjahDariKelas` tinggal di dalam blok yang dibuang — kedua-duanya masih dipakai oleh modal baharu dan `guru.html`, jadi ia dipindahkan keluar, bukan dipadam bersama.

#### Skop sub DIKUATKUASAKAN semasa simpan (jangan regres)

Dropdown **Darjah** dalam borang guru ialah **tapisan paparan, bukan kunci skop**. Guru boleh menetapkannya ke "— semua darjah —" sambil dropdown Sub-anugerah kekal pada pilihan pertama, lalu menanda seluruh sekolah ke dalam satu sub.

**Ini berlaku pada majlis 2026.** `ANUGERAH KEHADIRAN PENUH` ada 6 sub (satu per darjah) dalam **satu** borang aras-anugerah; guru kena tukar dropdown 6 kali dan tiada apa-apa memberitahunya. Hasilnya: **61 murid darjah 2–6 dalam "KEHADIRAN PENUH — DARJAH 1"**, dan sub darjah 2–5 kekal kosong. `ANUGERAH SAHSIAH TERPUJI` sama: 2 murid darjah 5 dalam sub Darjah 1. **Dua guru berbeza, kesilapan serupa — itu borangnya, bukan orangnya.**

Tiga lapisan, semuanya perlu:

| Lapisan | Peranan |
|---|---|
| `lukisPapanSkop()` | Guru **nampak** sub mana sedang diisi — papan tanda di atas jadual |
| `isiDarjah()` / `isiKelas()` | Guru **tak boleh** pilih murid darjah salah — dropdown dikunci |
| `luarSkopSub()` dalam `simpan()` | Kalau lolos juga, simpan **tolak semua** |

- **Semakan berada dalam SIMPAN, bukan hanya paparan.** Kawalan yang hanya wujud dalam paparan bukan kawalan — sama peraturan dengan butang Buang yang disemak dua kali.
- **Luar skop = BERHENTI, tiada apa ditulis.** Separuh disimpan bermakna guru perlu meneka yang mana menjadi. Nama yang salah dipaparkan; ditolak senyap ialah tepat bagaimana 63 entri salah berlaku tanpa disedari.
- Dropdown **dimatikan, bukan disembunyikan**, dan opsyen "semua darjah" **dibuang terus** — tiada pilihan salah untuk dipilih. Darjah sub mesti wujud sebagai opsyen walaupun tiada murid padanya, jika tidak dropdown terkunci jadi kosong.
- Skop `sekolah` dan `tahap` merentasi beberapa darjah, jadi tiada ujian darjah tunggal yang betul — ia sentiasa lulus.
- Skop `kelas` mesti menyemak `skopDarjah` **juga** — "INTEL" wujud di keenam-enam darjah.

**Papan tanda duduk TEPAT di atas jadual**, bukan di atas bar tapisan. Sebaik guru mula menatal senarai nama, dropdown Sub-anugerah keluar dari skrin — dan dia menanda berpuluh kotak tanpa apa-apa di hadapan matanya yang menyatakan senarai ini untuk apa. Ia dilukis **sebelum** cabang `CALON` dalam `lukis()` supaya kedua-dua mod mendapatnya.

Disahkan 26 Okt 2026: oracle 48,000 kes (0 beza) + 4 mutasi ditangkap; live terhadap **95/95 sub berskop** dalam majlis sebenar — 0 bocor.

**Cadangan struktur:** borang **aras-darjah** (tekan 📝 Bina Borang pada kumpulan darjah, bukan tajuk anugerah) menghapuskan masalah ini di punca — satu guru, satu darjah, tiada dropdown untuk tersilap. Lencana ⚠ dalam Link Petugas menandakan borang yang merentas beberapa darjah.

#### Senarai murid di dalam pokok Jenis Anugerah

Kiraan "N murid" pada baris sub ialah **butang togol**; senarai terbuka di tempat yang sama (`MURID_BUKA`, DOM id `murid-*`). Admin bertanya "siapa sudah dipilih?" sambil matanya pada baris sub — sebelum ini jawapannya memerlukan modal Pilih Murid (satu sub pada satu masa) atau tab Semak Penerima (tapis dahulu).

- **Sumber ditanda**: `Admin` (kuning) vs nama guru dari `catatan` (hijau). Borang guru menulis ke koleksi yang sama, jadi tanpa tanda ini admin tidak dapat membezakan senarai yang dia sendiri bina daripada yang datang melalui borang.
- **Luar skop ditanda merah** (`luarSkopPenerima` — peraturan sama dengan `luarSkopSub` dalam `guru.html`). Baris yang menyatakan "68 murid" tanpa memberitahu 61 daripadanya milik darjah lain ialah tepat bagaimana masalah itu tersembunyi.
- `li.ada-murid` mesti `display:block` — sebab yang **sama** dengan `li.kump`: baris sub dan senarai muridnya akan jadi dua item bersebelahan, bukan satu di bawah satu.
- Togol **tidak melukis semula pokok** — satu togol akan menutup setiap accordion lain. Senarai disuntik ke `li` itu sahaja.
- Butang togol **disemak sebelum `.induk[data-togol]`** dalam pendengar klik: ia duduk di dalam baris sub, jadi membiarkan togol anugerah menangkapnya akan menutup seluruh anugerah. (Perangkap sama seperti butang Ubah.)
- Kunci = `anugerahId|m|subId`, dipecah pada `'|m|'` **pertama** — id dijana boleh mengandungi paip, jadi `split('|')` memecahkannya.

#### Butang Buang pada setiap baris murid (dalam senarai pokok)

Senarai murid di dalam pokok Jenis Anugerah membawa butang **Buang** pada setiap baris. Admin yang membaca senarai dan nampak seorang murid yang tidak sepatutnya ada boleh membuangnya di situ juga — sebelum ini jalannya ialah tab Semak Penerima (tapis dahulu) atau modal Pilih Murid (buka, cari, nyahtanda, simpan): dua skrin untuk satu baris yang sudah di hadapan matanya.

**Melalui `resetOps()` yang SAMA** dengan 🧹 dan reset majlis — satu-satunya tempat yang tahu menapis `anugerah[]` dan `giliran[]` seiring, dan memadam doc hanya bila `anugerah[]` jadi kosong. Predikatnya `(x, m) => m.no_kp === noKP && x.subId === subId`: **kedua-dua syarat perlu**; melupakan `no_kp` membuang murid itu daripada **setiap** murid dalam sub tersebut.

**`confirm()`, bukan taip "PADAM".** Skopnya satu baris yang admin sedang tuding dan kiraannya kelihatan di skrin. Dialog menyatakan sama ada murid itu masih memegang anugerah lain (tidak disentuh) atau ini yang terakhir (rekodnya dibuang).

**Butang muncul untuk SEMUA sumber**, admin dan guru — ini panel admin, dan 🔒 dalam `guru.html` wujud untuk menghalang **guru** membuang kerja admin, bukan sebaliknya.

**Borang guru yang meliputi sub itu dibuka semula**, sama peraturan dengan `resetJalan`. Ketiga-tiga bentuk kunci disemak (`anugerahId`, `anugerahId::subId`, `anugerahId::@DARJAH`), bukan padanan tepat sahaja.

**Kunci `data-buang-murid` = `no_kp|m|subId`, dipecah pada `'|m|'` PERTAMA** — id sub dijana boleh membawa paip, jadi `split('|')` memecahkannya. Butang disemak **sebelum** `.induk[data-togol]` dalam pendengar klik: ia duduk di dalam baris sub, jadi membiarkan togol anugerah menangkapnya akan menutup seluruh anugerah.

`lukisPokok()` melukis semula senarai yang terbuka (`MURID_BUKA` kekal), jadi baris yang dibuang hilang tanpa accordion tertutup.

Disahkan 26 Okt 2026: oracle 5,000 kes (0 beza) + 2 mutasi ditangkap (lupa `no_kp` → membuang 2 murid bukan 1; `giliran[]` tidak ditapis → nombor yatim); live di Chrome — ALI kekal dengan anugerah kedua dan giliran 12 (giliran 5 dibuang), ABU dipadam kerana anugerah terakhir, id sub bertanda paip selamat.

#### Butang 🔧 Betulkan — pindah murid luar skop

Pada baris **anugerah** (semua sub) dan baris **sub** (satu sub). **Muncul hanya bila ada murid luar skop** — butang untuk sifar ialah bunyi bising pada setiap baris, dan admin berhenti membacanya.

Tiga peraturan dalam `betulkanRancang()`:

| Keadaan | Tindakan |
|---|---|
| Murid darjah 6 dalam sub DARJAH 1 | **Pindah** ke sub DARJAH 6 |
| Murid **sudah** ada dalam sub sasaran | **Buang pendua** — jika tidak dia naik pentas dua kali |
| Anugerah tiada sub untuk darjah itu | **Biarkan** + beritahu admin |

- **`giliran[]` ditransformasi dengan peta yang sama** sebagai `anugerah[]`. Nombor giliran yang masih menunjuk sub lama menjadi yatim — murid dipanggil untuk anugerah yang senarainya tidak lagi mengandunginya.
- Satu operasi per **MURID**, bukan per entri — seorang murid boleh mempunyai beberapa entri untuk dipindah.
- **Sandaran ke `anugerah_backup` sebelum menulis**; `betulkanPulih(id)` memulihkan dari Console. `resetJalan` tiada sandaran kerana ia membuang atas permintaan terang admin; di sini admin menerima **cadangan sistem**, jadi dia mesti boleh berpatah balik.
- Dialog memaparkan **ke mana setiap murid pergi** sebelum menekan (`betulkanRingkas`), bukan selepas.

Dijalankan pada majlis sebenar 26 Okt 2026: 61 pindah + 2 pendua dibuang → **0 salah, 39 nombor giliran utuh, 0 doc kosong, 0 entri yatim**. Oracle 4,000 iterasi (0 beza) + 7 mutasi ditangkap.

#### Kad jemputan TIDAK menyebut anugerah, giliran atau bilangan naik pentas

Ia **jemputan kepada ibu bapa, bukan jadual majlis**. Versi awal membawa senarai anugerah + "Giliran 12" setiap satu + lencana "NAIK PENTAS 2 KALI". Tiga maklumat itu milik **tiket murid** (tab 🎟️ Giliran & Tiket), yang memang dicetak untuk dipegang murid sendiri. Pada kad ibu bapa ia membocorkan keputusan sebelum diumumkan, dan menjadikan kad padat sehingga terpotong.

Yang tinggal: sekolah · majlis · ayat jemputan · nama murid · kelas · baris butiran dinamik · nota kaki.

**Reka bentuk A2 "Klasik Emas" landskap (1 Nov 2026, dipilih pengguna):** bingkai garis berkembar emas + ❖ di bucu, lajur kiri (50mm) = sekolah · KAD JEMPUTAN · majlis (kelas `.majlis-kj` — **bukan `.tajuk`**, kelas itu kepala halaman dan disorok semasa cetak, jadi nama majlis hilang), lajur kanan = penerima + butiran. Saiz **tetap 139×94mm pada skrin dan cetakan**; cetak melalui halaman bernama `@page kjland` (A4 landskap) supaya tiket kekal potret. Tiada latar putih (kertas warna) — hiasan bucu duduk di dalam bingkai, tidak menutup garis. `kjSemakMuat` kini mengukur limpahan `.kiri`/`.kanan` terus (`scrollHeight > clientHeight`). Jangan naikkan tinggi ke 97mm (2×97 = 194mm tepat → baris kedua ke halaman baharu).

**`margin-top:auto` berpindah ke `.kaki`** apabila blok `.anu` dibuang — tanpanya nota kaki melekat pada butiran dan separuh bawah kad kosong. `kjSemakMuat` masih dikekalkan kerana baris butiran dinamik: sepuluh baris pakaian/masa/telefon masih boleh melimpah 136mm. Diukur selepas perubahan: ruang 482px, isi tertinggi 42px, **0 kad sesak** daripada 105.

#### Pengurus peserta — murid yang naik pentas berulang

**Tanda ikut GILIRAN, bukan murid (5 Nov 2026, pengguna).** Dahulu satu tanda ✓/✕ menulis `giliran[].hadir` ke **kesemua** giliran murid sekali gus. Kini setiap baris (= satu nombor giliran) ditanda sendiri: Ali hadir di Kelas Terbaik **tidak** menjadikan Subjek Terbaik dia hadir — pengurus peserta klik ✓ lagi bila giliran itu tiba. `padanGil(g, t)`: nombor sama (utama + pengikut gabung berkongsi nombor) → belum bernombor = `subId` → baris yatim = semua. Transaksi `tulisTanda` hanya mengubah entri yang padan. Baris `li` membawa `data-no` + `data-sub`; `MENUNGGU`/`TERBANG` membawa `{docId, no, subId, nilai}` (kunci `kunciTanda`). Status murid (KPI, ringkasan) = `statusMurid`: hadir bila **mana-mana** giliran hadir; "giliran terjejas" = bilangan giliran (bukan pengikut) ✕. Tapisan status ikut baris. Dialog sahkan ✕ murid berulang **dibuang** (satu tekan = satu giliran). Senarai giliran murid berulang kini juga papar `✓ hadir`. Cap jari `muat()` membawa `hadir` per giliran. MC/Hadiah/Tayang sudah membaca `hadir` per giliran — tidak diubah.

- **Lencana MERAH `⚠ NAIK PENTAS N KALI`** + garis tepi (`.baris.ulang`). Lencana emas sedia ada sama rupa dengan "1 giliran" dan mata yang mengimbas 105 baris tidak menangkapnya.
- ~~Pengesahan sebelum menanda tidak hadir~~ — dibuang 5 Nov 2026 (tanda kini satu giliran sahaja).
- **`gilSeterusnya(m)`** = nombor terkecil yang MC belum tanda (`mc !== true`). Pengurus peserta yang melihat "4 · 31" tidak tahu yang mana sudah lepas; tanpa ini dia perlu bertanya MC.
- KPI **"Naik pentas >1"** — angka yang diperlukan **sebelum** majlis bermula.
- **Senarai SEMUA giliran (4 Nov 2026, pengguna)** — menggantikan pil `juga: #93 5 CELERON (DLP)`, yang tidak menyatakan anugerah mana dan hanya menunjukkan giliran *lain*. Kini setiap giliran murid berulang disenaraikan ikut nombor, **termasuk yang sudah selesai**, dengan nama anugerah **penuh** (`agNamaGiliran`: `ANUGERAH TERBAIK DALAM KELAS — 5 CELERON (DLP)`) dan status `✓ sudah diambil` (dibaca daripada `giliran[].mc`, tick MC) / `belum` / `✗ tidak hadir` / `◀ giliran ini`. Pengikut gabung dipapar `+ turut menerima:` di bawah nombornya (nama sub sahaja kalau anugerahnya sama). **Cap jari `muat()` kini membawa `mc`**, jadi skrin Peserta dilukis semula bila MC tick. Sebelum ini tick MC sengaja diabaikan, dan tanpa perubahan itu ✓ tidak akan muncul.
- **Cetakan membawa senarai yang sama TANPA status** (`agTeksSemuaGiliran`, tanda `◀ ini`): Skrip MC PDF, Senarai Hadiah PDF / Word / Excel. Kertas ditanda dengan pen, jadi status cetakan dibiarkan kosong (pengguna). Skrin MC dan Hadiah **tidak** diubah, kerana pengguna hanya mahu perubahan ini di Peserta. Fungsi kongsi: `agNamaGiliran`, `agSemuaGiliran(gil)`, `agTeksSemuaGiliran(semua, noIni)` dalam `anugerah-kongsi.js`; baris kira MC/Hadiah membawa `semua`.

Sync **Peserta → MC → Hadiah** disahkan hujung-ke-hujung 26 Okt 2026 pada majlis sebenar: satu tanda ✕ mencoret kedua-dua giliran dalam MC ("Tidak hadir — langkau") dan menurunkan "perlu dibawa" dalam Hadiah. **Peserta ialah penulis tunggal** `hadir`; MC dan Hadiah membacanya dan tidak boleh mengubahnya. Oracle 20,000 kes + 3 mutasi (`gilSeterusnya`).

#### Tiga panel petugas berkongsi SATU corak paparan

Peserta, MC dan Hadiah kini semuanya **accordion dua aras** (anugerah › sub), lalai **tertutup**. Petugas yang berpindah antara skrin tidak perlu belajar dua cara membaca senarai yang sama.

**Susunan ialah `binaTurutan()`, bukan abjad.** Pengurus peserta berdiri di pintu dewan dengan senarainya sementara MC memanggil nombor mengikut Susunan Naik Pentas — dua susunan berbeza bermakna dia mencari ke bawah senarai setiap kali. Peraturan disalin terus:

```
anugerah ikut `urutan`  →  sub ikut susunan array a.sub  →  murid ikut nama
```

**Sub TIADA medan `urutan`** — susunannya ialah susunan array itu sendiri, jadi menyeret sub di tab Giliran terus terpakai pada ketiga-tiga panel tanpa sebarang tetapan. Versi lama Peserta memakai `Object.keys(grup).sort()` (abjad), jadi "IKON TV" boleh muncul sebelum anugerah yang sebenarnya naik pentas dahulu.

**Satu baris per GILIRAN, bukan per murid.** Murid yang menang dua anugerah naik pentas dua kali dengan dua nombor; satu baris membawa "4 · 31" memaksa petugas sendiri memikirkan yang mana dahulu. Giliran lain dipapar sebagai **nombor + nama anugerah** (`juga: #109 KEBITARAAN ANTARABANGSA`) — "juga: 41" ialah nombor bogel yang tidak memberitahu anugerah apa.

**Nama sub tidak mengulang nama anugerah** (`nemaSub`): "KEHADIRAN PENUH — DARJAH 1" di bawah tajuk "ANUGERAH KEHADIRAN PENUH" dibaca dua kali. Awalan yang sama dibuang.

**State buka/tutup kekal antara lukisan** (`BUKA_AN`/`BUKA_SUB`). Tanpa ini, muat berkala 90s dan setiap tanda ✓ (yang melukis semula) akan menutup blok yang petugas baru buka.

**Butang disemak DAHULU dalam pendengar accordion.** Butang ✓ duduk di dalam baris, dan baris di dalam blok — kalau togol menangkap klik itu, MC kehilangan tempatnya setiap kali dia menanda seorang murid. Perangkap sama seperti pokok Jenis Anugerah.

Anugerah dengan **satu sub sahaja** tidak mendapat aras dalam — tajuk dalam akan mengulang tajuk luar.

#### Butang muat MERAH — perubahan diambil bila petugas sedia

Kemas kini kini **senyap**: ia menyemak dan menyalakan butang, **tidak melukis semula**.

**Pemantau langsung (4 Nov 2026)** — MC & Hadiah tidak lagi muat berkala 90s. `agPantauPetugas(majlis, panggil)` (`anugerah-kongsi.js`) memasang `onSnapshot` pada doc majlis + `anugerah_penerima where majlisId`; panggilan dilambatkan 400ms (batch = satu panggilan) dan dihantar ke `muat(pertama, senyap, sedia)` — `sedia` menggantikan `agMuatPetugas`. Tanda ✕ Peserta menyalakan butang merah dalam 1–2s. **Lebih jimat kuota**: senarai penuh dibaca sekali, kemudian hanya doc yang berubah dibil (polling lama membaca semua penerima setiap 90s). Pemantau gagal → jatuh balik ke muat berkala 90s (`panggil(null)` → panel baca sendiri). Bila cap jari kembali sama, `TERTUNDA` dikosongkan supaya butang tidak memakai data lapuk. Peserta & tayang tidak diubah. Jadual yang bertukar di bawah tangan petugas semasa dia mengira hadiah atau membaca nama ke mikrofon ialah tepat apa yang tidak boleh berlaku semasa majlis berjalan.

| Panel | Cap jari | Sebab |
|---|---|---|
| **Hadiah** (`capBaris`) | `hadir` **dan** `mc` | kedua-duanya mengubah kiraan "perlu dibawa" |
| **MC** (`capHadir`) | `hadir` **sahaja** | memasukkan `mc` akan menyalakan butang setiap kali MC menekan ✓ pada panelnya sendiri |

**Kedua-dua cap juga membawa `capSusun(b)`** = `docId@subId+pengikut` (31 Okt 2026). Selepas 🔁 Jana Semula nombor tetap 1…N dan tanda masih kosong — hanya murid di setiap nombor bertukar, jadi tanpa ini butang merah tidak menyala dan petugas terus memegang susunan lama. Butang membawa "Susunan giliran berubah". Peserta & tayang melukis semula sendiri setiap 90s, jadi tidak perlu.

- Butang membawa **apa** yang berubah (`🔄 1 tidak hadir`), bukan sekadar "sila refresh".
- **Ramai petugas satu link (4 Nov 2026).** MC: ✓ dari MC LAIN dikemas **di tempat** pada `BARIS` oleh `kemasMC(senarai)` (padanan `docId|subId`, bukan nombor) + `lukis()` — tanpa butang merah, **dan juga semasa butang merah sedang menyala** (dahulu ✓ MC lain tertahan dalam `TERTUNDA` sampai butang ditekan). Peserta kini juga di atas `agPantauPetugas` (muat berkala 90s dibuang) dan melukis semula sendiri; cap jari `CAP` (status + nama/kelas + giliran no/subId + `anugerah` majlis) melangkau lukisan bila tiada apa yang dipapar berubah — tanpanya setiap ✓ MC melukis semula Peserta. **`TERBANG`** (MC: `docId|subId`, Peserta: `docId`) = tanda yang transaksinya belum selesai, disapu ke atas data pemantau bersama `MENUNGGU` (`sapuTertunggak` dalam MC, juga dipanggil pada klik butang merah) — tanpanya data petugas lain yang tiba sebelum transaksi kita siap membuat tanda melompat balik sekejap.
- **🎯 Auto-buka MC (4 Nov 2026):** muat pertama (BARIS kosong = buka/refresh halaman) menetapkan `AUTO_BUKA` = giliran pertama ikut nombor yang `statusBaris === 'belum'`; `lukis()` membuka `BUKA_AN`/`BUKA_SUB` blok itu, menatal baris ke tengah, lalu mengosongkan `AUTO_BUKA`. Sekali sahaja — tidak pada pemantau/🔄 semasa MC bekerja.
- **Butang terapung `#b-muat-apung`** (4 Nov 2026, MC + Hadiah): salinan butang merah di bawah KANAN (toast di tengah bawah), muncul hanya bila `tandaPerlu(true)` — petugas yang sudah tatal ke bawah tidak nampak butang di kepala kad. Klik = `$('b-muat').click()` (satu laluan). Elemen diletak **sebelum** `<script>` sebaris — pendengar aras-atas pada `null` mematikan skrip.
- Menekan butang memakai data yang **sudah dimuat** (`TERTUNDA`), tidak pergi Firestore lagi — kuota majlis ini pernah habis di tengah ujian.
- Accordion **kekal terbuka** selepas mengambil data.

Aliran tulisan tidak berubah: **Peserta ialah penulis tunggal `hadir`**; MC menulis `mc`; Hadiah tidak menulis apa-apa.

#### Apa yang DIBUANG dari panel petugas (jangan kembalikan tanpa diminta)

| Panel | Dibuang |
|---|---|
| **Hadiah** | kad Stok Hadiah (jadual penuh) + 4 KPI |
| **MC** | kad Seterusnya (nombor besar + ✓) + 4 KPI |
| **MC** | `catatan` guru ("CIKGU FAEZAH") — dari paparan **dan** struktur data |

Kiraan tidak hilang: ia berpindah ke tajuk accordion (`70 giliran · 0 sudah naik · 2 tidak hadir`), dan jumlah besar kekal di kepala halaman (`sari`).

`catatan` ialah maklumat pentadbiran — nama guru yang menghantar borang penerima. MC membaca barisnya ke mikrofon; nama guru memanjangkan baris yang dia perlu tangkap sekilas. Ia masih dipapar di tempat yang betul: 📋 Semak Penerima dan senarai murid dalam 🏆 Jenis Anugerah.

**Membuang panel mematikan seluruh skrip kalau pendengarnya ditinggalkan** — `$('stok').addEventListener(...)` pada `null` melontar `TypeError` semasa skrip dimuat, dan setiap `let` selepasnya tidak pernah wujud. Dibuang sekali: `lukisStok`, `lukisKPI`, `kad()`, pendengar `#stok`, pendengar `data-seterusnya`, CSS `.seterusnya` / `.dicoret` / `[data-stok-togol]`. `nemaSub()` **dikekalkan** — masih dipakai oleh accordion.

Hadiah: status **"Simpan balik" → "Tidak hadir"** dalam jadual **dan** dropdown tapisan. Tapisan yang berkata lain daripada baris bermakna petugas tidak tahu itu benda sama.

#### Gaya Giliran — A Asal · B Bebas · C Gabung (28 Okt 2026)

Kad **Gaya Giliran** di atas Susunan Naik Pentas (tab 🎟️ Giliran & Tiket). **Tambahan, bukan ganti**: `MAJLIS.gayaGiliran` tiada / tidak dikenali = `'asal'`, dan gaya A berjalan pada **kod asal yang tidak disentuh** (`binaTurutan`/`beriNombor` hanya bercabang bila gaya ≠ asal).

| Gaya | Medan | Kelakuan |
|---|---|---|
| A `asal` | — | anugerah `urutan` → array `a.sub` |
| B `bebas` | `susunanPentas: [subId]` | satu senarai rata, sub merentas anugerah (seret / ↑↓ / Pindah) |
| C `gabung` | `gabungAsas: 'asal'\|'bebas'`, `gabungKecuali: [anugerahId]` | murid naik **sekali** di anugerah pertamanya, terima semua serentak |

- **Enjin di `anugerah-kongsi.js`** supaya semua panel membaca peraturan sama: `agSusunanSub`, `agBinaTurutan`, `agRancangNombor` (tulen), `agIkutSah` / `agUtamaGiliran` / `agPengikutGiliran` / `agBilNaik`.
- **Gaya C: entri giliran KEKAL satu per anugerah** (meja hadiah kira hadiah satu per satu), tetapi **berkongsi `no`**. Entri utama tiada `ikut`; yang lain `ikut: <subId utama>`. Medan `ikut` hanya ditulis bila wujud — data gaya A/B sama tepat seperti dahulu.
- **`agIkutSah`, bukan `g.ikut` mentah**: bila sub utama dibuang, pengikut mesti berdiri sendiri semula, jika tidak anugerahnya hilang dari MC dan tayangan.
- Sub yang tiada dalam `susunanPentas` (ditambah kemudian) **disambung di hujung** dengan amaran, bukan hilang.
- Panel: MC satu baris per nombor + "turut menerima", ✓ menanda utama **dan** pengikut (`tandaMC`). Peserta: murid hanya di baris utama, "naik pentas N kali" = `agBilNaik`. Hadiah: **satu baris satu nombor = satu hadiah** — pengikut tidak lagi baris sendiri, dinamakan sebagai "🎁 1 hadiah untuk: A + B" (pengguna, 31 Okt 2026; dahulu 414 baris, kini 401). Tayang/PPTX: satu slaid utama, pengikut disenarai. Gaya ≠ asal: accordion petugas = blok **berturut-turut** (kunci `anId#n`), gaya A kekal `find`.
- **Tukar gaya tidak menukar nombor.** Pratonton dalam kad memberi amaran bila nombor semasa tidak padan dengan gaya disimpan → Jana Semula.

Oracle 20,000 kes (susunan + nombor + mod tambah + invarian 1…N tanpa jurang) — 0 beza; 5 mutasi ditangkap.

#### 🎁 Paling banyak dahulu — per anugerah gabung (31 Okt 2026)

Dropdown **Murid: Biasa / 🎁 Paling banyak dahulu** pada baris anugerah dalam Susunan Naik Pentas (gaya A: `.sgil-induk`; gaya B/C bebas: kepala `.pb-gab-kepala` di sub pertama setiap segmen anugerah) = `a.gabungDahulu`. Hanya gaya C, anugerah bukan `gabungKecuali`. Tiada medan = turutan sama tepat. Simpan terus (`setGabDahulu`); nombor berubah hanya selepas Jana Semula.

`agBinaTurutan` → `agGabungDahulu`: entri anugerah itu disusun semula **dalam slot yang sama** (anugerah lain tidak bergerak):
- **Dikumpul ikut darjah** (`agDarjahSub`), darjah dalam urutan sub pertama darjah itu dalam Susunan Naik Pentas (sub 🚫 tidak naik pentas tidak dikira — majlis 2026: T5 → T6 → T4).
- Dalam setiap darjah: murid dengan **≥2 entri dalam anugerah DIGABUNG** (bukan kecuali — keputusan pengguna) yang anugerah gabung pertamanya ialah anugerah ini → paling banyak dahulu, seri ikut nama; kemudian sub biasa darjah itu ikut susunan admin.
- Versi pertama (kotak peringkat majlis, semua murid gabung di awal anugerah merentas darjah) **ditolak pengguna** dan dibuang — ia memecahkan Susunan Naik Pentas.

**👁 Pratonton** di sebelah dropdown (`bukaPratontonGab`, modal `.luas`): satu baris satu nombor yang Jana Semula **akan** tulis (`agRancangNombor` + `agKedudukanDariNombor`), dikumpul ikut darjah, gabungan via `agTajukSubHadiah`, pil "dulu N" bila berubah. Baca sahaja; dropdown dalam modal yang sama melukis semula pratonton (`PRATONTON_GAB`).

Data live: 53 entri berubah nombor, 0 nombor anugerah lain berubah, 401 tanpa jurang/pendua, set anugerah setiap murid sama.

#### Susunan murid naik pentas — ikut nama ATAU ikut kedudukan (29 Okt 2026)

Tetapan per anugerah dalam modal Ubah Anugerah: **Susunan murid naik pentas** = `Ikut nama` (lalai, tiada medan) atau `Ikut kedudukan` (`a.susunMurid:'kedudukan'`). Hanya anugerah `sumber:'auto'` — manual tiada ranking. Dipakai untuk Terbaik Dalam Kelas dan Terbaik Mata Pelajaran.

- **Rank 1 naik dahulu.** Rank dikira atas semua murid skop, tetapi hanya yang **dipilih** naik pentas: rank 2, 5, 9 menjadi giliran pertama, kedua, ketiga dalam sub itu. Seri → ikut nama. Tiada rank (tambah manual / tiada markah) → di bawah, ikut nama.
- **Rank dikira SEMULA dari markah semasa Beri Nombor / Jana Semula** (`agKiraKedudukanMajlis`), bukan dibaca dari entri penerima: penerima borang guru tidak membawa rank, dan markah boleh dibetulkan selepas calon dipilih. Markah ditarik sekali per peperiksaan (`paksa`), kemudian setiap sub membaca cache. Peperiksaan sama seperti modal Pilih Murid: sub > anugerah > ikut darjah > majlis.
- **Gagal mengira = berhenti, tiada nombor ditukar** (`kedudukanUntukGiliran` pulang `null`). Jatuh balik ke abjad secara senyap memberi giliran yang kelihatan betul tetapi salah.
- `agBinaTurutan(majlis, penerima, kedudukan)` / `agRancangNombor(..., kedudukan)` / `binaTurutan(kedudukan)` — tanpa hujah ketiga kelakuan sama tepat seperti dahulu. Rank hanya dipakai bila `agIkutKedudukan(a)`, walaupun peta membawa sub lain.
- Pratonton Gaya Giliran tidak membaca markah: `agKedudukanDariNombor` menganggap susunan nombor sedia ada dalam sub ikut-kedudukan sebagai betul, supaya amaran "tidak padan" tidak menyala palsu.
- **Peserta** kini menyusun murid dalam sub ikut **nombor giliran** (bukan nama) supaya sama dengan MC.
- **Modal 👤 Pilih Murid — senarai "N murid sudah dipilih"** (`pmLukisSediaAda`) kini disusun ikut **Kedudukan** (nombor sama dengan lajur Kedudukan jadual ⚡ Cadang Calon) dengan lajur Kedudukan + nilai asas. Untuk SEMUA anugerah auto, bukan hanya ikut-kedudukan. Sebelum ini ia dalam susunan dokumen Firestore.
- **Senarai murid dalam pokok Jenis Anugerah** (`agMuridSub`/`lukisMuridSub`) bagi anugerah ikut-kedudukan disusun ikut **Kedudukan** dan memapar `Kedudukan N` + `Giliran N`, supaya admin nampak sama ada giliran perlu Jana Semula. Anugerah ikut-nama tidak berubah.
- Cache `RANK_SUB[subId] = {no_kp: {kedudukan, nilai}}` diisi oleh `pmCadang` (sudah dikira) atau `rankSub(an, s)` (latar, bila senarai dibuka). Markah dicache per peperiksaan, jadi membuka banyak kelas tidak membaca Firestore berulang. ⚡ Cadang menyegarkannya.
- Nombor sedia ada tidak berubah sendiri — admin tekan 🔁 Jana Semula.

Oracle 5,000 majlis rawak (3 gaya) — 0 beza; 4 mutasi ditangkap (buang pengawal, terbalik, seri tanpa nama, rancang lupa kedudukan).

#### Susunan murid naik pentas — Susun sendiri (29 Okt 2026)

Pilihan ketiga dalam modal Ubah Anugerah: **Susun sendiri (admin seret)** = `a.susunMurid:'manual'`. Terpakai kepada **semua** anugerah, termasuk `sumber:'manual'` (pilihan "Ikut kedudukan" disorok untuk anugerah manual). Namanya sengaja bukan "Manual" — "Manual sahaja" sudah bermaksud *sumber* anugerah.

- **Disimpan pada SUB**: `s.susunanMurid = [no_kp...]` dalam dokumen majlis. Medan berasingan daripada susunan sub (array `a.sub`), jadi `binaTurutan` tidak terjejas. `baca()` modal sub **membawa** medan ini; ⚡ Pecah ikut darjah **membuangnya** (sub baharu tiada penerima; `delete`, bukan `undefined` — Firestore menolak `undefined`).
- **Satu enjin**: `agSusunMuridDalamSub(a, s, senarai, kedudukan)` dalam `anugerah-kongsi.js` memutuskan susunan murid dalam satu sub untuk **semua** gaya giliran (A/B/C), pokok dan modal. `agSusunManual` = ikut susunan; murid tiada dalam susunan → **di bawah ikut nama** (tidak pernah hilang); no_kp basi diabaikan.
- **Dua pintu, satu jadual**: senarai murid pokok Jenis Anugerah dan blok `#pm-susun` dalam modal 👤 Pilih Murid kedua-duanya melukis `lukisSusunManual` dan menulis melalui `simpanSusunanMurid` (simpan terus, pulih nilai lama bila gagal). `segarPaparanSusun(s)` melukis semula di mana-mana ia terbuka. Pendengar klik/seret **peringkat dokumen** (`window._msPasang`), klik dalam fasa *capture* supaya togol pokok tidak menangkapnya. Seret hanya dalam sub yang sama.
- **Susunan permulaan** (`semaiSusunanAnugerah`) semasa tukar ke Susun sendiri: ikut kedudukan bila anugerah auto, jika tidak nama. Susunan sedia ada **dikekalkan** — tukar ke auto dan balik tidak memadam kerja admin.
- Murid dipilih dalam modal → **disambung di hujung** (`tambahKeSusunan`). Murid dari borang guru → di bawah + amaran "N murid belum disusun" dengan butang ✓ Sahkan.
- Butang ↺ Susun ikut kedudukan / nama (dengan `confirm`) menggantikan susunan.
- **Dropdown "Susunan:" pada baris anugerah (root) dalam pokok** (`pilihSusunAnugerah`, `select[data-an-susun]`): Auto — ikut kedudukan / Susun sendiri / Ikut nama, simpan terus pada `change`, pulih nilai lama bila gagal. Medan sama dengan modal Ubah Anugerah. Klik pada select **disemak dahulu** dalam pendengar klik pokok — ia duduk di dalam `.induk` dan akan menogol accordion. Baris sub memapar lencana `✋ Sendiri` / `🔢 Auto` dan butang **⠿ Susun** (`data-sub-susun`) yang membuka jadual seret di tempat.
- **Nombor giliran TIDAK berubah sendiri.** `susunTakPadanGiliran` memapar amaran dalam jadual itu sendiri (entri pengikut gaya C dilangkau) sehingga admin tekan 🔁 Jana Semula. Peserta/MC/Hadiah/tiket/PPTX ikut nombor giliran, jadi semuanya sync selepas itu.

- **SATU NOMBOR sahaja dalam jadual susunan** (29 Okt 2026): lajur **Kedudukan** = susunan admin. Rank markah dan nombor giliran **dibuang** daripada jadual — versi pertama memapar ketiga-tiganya dan admin keliru mana satu kedudukan sebenar (perkataan "Kedudukan" melekat pada rank markah). Rank markah kini hanya dalam `title` nama. Pilihan auto dinamakan **"Auto — ikut markah"**, bukan "ikut kedudukan" — satu perkataan, satu maksud.
- **🔒 Kunci susunan** per sub: `s.susunKunci`, `s.susunKunciMasa`. Dikunci → tiada seret/↑↓/↺, `jalanSusun` menolak, `tambahKeSusunan` tidak menyambung (murid baharu di bawah + amaran **merah**). Menekan Kunci **membekukan susunan yang sedang dipapar**. 🔓 Buka kunci perlu `confirm`. Pil kemajuan `🔒 x / y dikunci` (`pilKunci`) pada baris anugerah, tajuk darjah dan tajuk subjek, dengan **🔒 Kunci semua** (`data-kunci-semua` = JSON id sub). `baca()` modal sub membawa kedua-dua medan; ⚡ Pecah membuangnya.

Oracle 20,000 kes `agSusunManual`/`agBelumDisusun` — 0 beza; 3 mutasi ditangkap. Diuji di Chrome dengan data dalam memori (`simpanMajlis` disekat): ↓, seret, murid baharu, giliran, modal, modal sub membawa medan.

#### Penerima BUKAN MURID (29 Okt 2026)

Untuk anugerah seperti **Anugerah Ibu Bapa Terbaik**: anugerah `sumber:'manual'` mendapat kotak **✏️ Nama bukan murid** di atas senarai murid dalam modal 👤 Pilih Murid. Admin taip **nama sahaja** (tiada KP/telefon — tidak disimpan kerana tidak diperlukan). Murid ESIS masih dipilih dari senarai seperti biasa.

- **Koleksi SAMA** (`anugerah_penerima`), `jenis:'luar'`, `tahun:''`, `kelas:''`. Giliran, tiket, kad, MC, Peserta, Hadiah, tayangan, PPTX, Semak dan Susun sendiri berfungsi tanpa laluan baharu.
- `no_kp` = `agIdLuar()` → `LUAR_` + 12 **huruf** (tiada digit, supaya carian KP ≥4 digit tidak terpadan secara tak sengaja).
- **Nama sama (huruf besar, ruang dimampat) dalam majlis yang sama = orang yang sama**: entri ditambah pada rekod sedia ada (`tambahPenerimaLuar`), jadi dia memegang satu tiket dan satu kad. Pendua dalam sub yang sama ditolak.
- Nama yang sama dengan murid ESIS → `confirm()` (murid patut dipilih dari senarai supaya kelasnya ikut).
- `agKelasPenerima(p)` = "Bukan murid" untuk senarai **admin**; tiket/kad/panel petugas memakai `agDarjahKelas` → kosong (nama sahaja).
- `luarSkopPenerima` sentiasa `false` untuk bukan murid (tiada darjah) — jadi 🔧 Betulkan tidak menyentuh mereka.
- **Kad jemputan**: ayat berasingan `MAJLIS.kadAjakLuar` (lalai "Dengan hormatnya mempelawa") — bukan "ibu bapa / penjaga kepada".
- Belum ada "Daftar Orang" untuk dipakai semula tahun berikutnya — nama ditaip setiap majlis.
- **Tiga kad semasa cipta/ubah anugerah** (`kadSumber`, `.kad-sumber`): 📊 **Auto dari ESIS** (`sumber:'auto'`) · 👤 **Pilih murid** (`sumber:'manual'`) · ✏️ **Bukan dalam ESIS** (`sumber:'manual'` + `calon:'luar'`). `<select id="a-sumber">` kekal tersorok sebagai nilai sebenar supaya semua semakan `sumber === 'manual'` sedia ada tidak berubah — **jangan tambah nilai `sumber` baharu**. `calon:'luar'` hanya menentukan apa yang dibuka DAHULU dalam modal Pilih Murid: kotak nama terbuka + senarai murid dilipat (`details.pm-blok-murid`); kad 👤 sebaliknya. Bahagian dilipat dibuka sendiri bila sudah ada isi. Nota TH disorok untuk anugerah manual.

#### 🎤 Naik pentas Ya/Tidak (30 Okt 2026)

`a.pentas === false` = anugerah tidak naik pentas; `s.pentas` (true/false) menimpa, tiada = ikut anugerah. **Lalai YA** (tiada medan) — majlis lama tidak berubah. Ditetapkan melalui **butang 🎤 pada tiga aras pokok** (`butangPentas`/`setPentas`): baris anugerah (`*` = tetapkan `a.pentas` + buang semua timpaan sub), tajuk kumpulan subjek/darjah, dan baris sub. Label = keadaan (`🎤 Naik pentas` / `🚫 Tidak naik pentas` / `🎤 2/3 naik pentas`); klik: semua naik → semua tidak, selain itu → semua naik. `s.pentas` dibuang bila sama dengan anugerah. Juga dalam modal Ubah Anugerah (tukar aras anugerah membuang timpaan sub) dan Ubah Sub (`baca()` membawa `pentas`).

- **Kekal** dalam Jenis Anugerah & Semak Penerima. **Keluar** dari giliran, tiket, MC, peserta, hadiah, tayang, PPTX, **sijil dan kad jemputan** (pengguna: sijil ✗, kad ✗).
- Satu penapis: `agNaikPentas` dalam `agSusunanSub` (+ cabang gaya asal `binaTurutan`). Peserta & sijil ikut serta-merta; MC/hadiah/tayang membaca `giliran[]`, jadi perlu **🔁 Jana Semula** — `agBuangGiliranLuar` membuang entri giliran yang tiada dalam turutan, termasuk murid yang SEMUA anugerahnya tidak naik pentas (tiada dalam turutan langsung). `amaranPentas()` memberi amaran selagi nombor lama wujud. Tiket & PPTX admin menapis terus.
- Senarai Susunan Naik Pentas: anugerah tidak naik pentas dikumpul dalam nota kelabu di bawah; sub tidak naik pentas kelabu tanpa seret. ↑↓ membawa `data-ke` = indeks jiran naik pentas (indeks sebenar), supaya tidak bertukar dengan baris tersorok.

#### Amaran nombor lapuk (30 Okt 2026)

MC, Hadiah, Slaid (tayang + PPTX), tiket dan sijil semuanya ikut **nombor giliran DISIMPAN**, bukan susunan admin secara terus. Menyeret Susunan Naik Pentas tidak menukar nombor (tiket mungkin sudah dicetak), jadi `agSemakNombor(majlis, penerima)` (`anugerah-kongsi.js`) membandingkan nombor sedia ada dengan apa yang Jana Semula **akan** tulis → `{lapuk, belum}`. Sub ikut-kedudukan memakai `agKedudukanDariNombor` (tiada bacaan markah, tiada amaran palsu).

- `lukisAmaranNombor()` melukis banner merah + butang 🔁 Jana Semula / 🔢 Beri Nombor di **tiga** tempat: `#susun-amaran`, `#tiket-amaran`, `#petugas-amaran` (tab Link Petugas). Dikira semula setiap lukisan, jadi ia **kekal** selagi tidak sepadan, termasuk selepas muat semula. `amaranSusun`/`amaranPentas` kini memanggilnya.
- **Senarai murid dalam Susunan Naik Pentas** (gaya A **dan** senarai bebas gaya B/C — dua bekas, dua pendengar klik): butang `N murid ▾` (`data-sgil-murid`, state `SGIL_MURID`) pada baris sub membuka `senaraiMuridSusun(a, s)` — murid ikut susunan yang Jana Semula **akan** hasilkan (`binaTurutan(agKedudukanDariNombor(...))`), dengan nombor giliran disimpan dan `→ N` merah bila Jana Semula akan menukarnya. Tidak membaca markah.
- **Entri YATIM** (`entriYatim()`): entri `anugerah[]` yang `subId`-nya tiada lagi dalam majlis. Ditemui 30 Okt 2026 — MUHAMMAD AISY memegang SIMPOSIUM B&K **lama** (`sub_mvrobj8k`, anugerah dibuang lalu dicipta semula) → KPI "1 belum bernombor" yang Beri Nombor/Jana Semula tidak dapat selesaikan. Punca: `buangAnugerah`/`buangSub` mengira `kena` daripada `PENERIMA` **lapuk** dan melangkau pembersihan bila 0. Kini kedua-duanya baca segar dahulu dan **sentiasa** membersih melalui `resetOps`+`resetTulisPukal`. KPI "Belum bernombor" = `agSemakNombor().belum`, bukan `bilAnugerah − bilGil`. Banner yatim + 🧹 (`data-buang-yatim` → `resetJalan`) dalam `#susun-amaran`.
- Cetak tiket & muat turun PPTX: `sahkanNomborSebelum()` → `confirm` bila lapuk.
- **Peserta** menyusun blok sub ikut nombor giliran terkecil (`kumpulIkutGiliran`), bukan `agSusunanSub` terus — dahulu ia mengikut susunan baharu sementara MC memanggil nombor lama.

Oracle 3,000 majlis rawak (3 gaya, sub tidak naik pentas, susun manual): tiada nombor → `belum` = turutan; selepas jana → 0/0; terbalikkan susunan → `lapuk>0` tepat bila rancangan berubah. 0 gagal.

#### 🤫 Anugerah rahsia — tidak dicetak pada tiket (30 Okt 2026)

Untuk anugerah kejutan (contoh Tokoh Murid). `a.rahsia === true` / `s.rahsia` (boolean, menimpa) — `agRahsia(a, s)`, `agSubRahsia(majlis)` dalam `anugerah-kongsi.js`. **Lalai TIDAK rahsia** (tiada medan).

- **Hanya tiket murid** (`lukisTiket`) menapisnya. Giliran, MC, Peserta, Hadiah, tayang, PPTX, sijil dan kad jemputan **tidak berubah** — keputusan pengguna. Kad jemputan tidak menyebut anugerah, jadi rahsia kekal.
- Murid yang **semua** anugerahnya rahsia → **tiada tiket langsung** (keputusan pengguna). `#t-kira` menyebut bilangan anugerah rahsia yang tidak dicetak.
- Butang `butangRahsia`/`setRahsia` di pokok — corak sama dengan 🎤: baris anugerah + tajuk kumpulan **sentiasa**; baris sub **hanya bila sub itu rahsia** (107 butang "🎟️ Dalam tiket" ialah bunyi). Modal Ubah Sub ada `#s-rahsia`, dan `baca()` membawanya.
- Nombor giliran **tidak** disentuh — tiada Jana Semula diperlukan.

#### 🙈 Sorok dari petugas — latihan (2 Nov 2026)

`a.sorokPetugas === true` / `s.sorokPetugas` (boolean, menimpa) — `agSorokPetugas`, `agSubSorok` dalam `anugerah-kongsi.js`. **Lalai PAPAR** (tiada medan). Butang `butangSorok`/`setSorok` di pokok, corak sama dengan 🤫: baris anugerah + tajuk kumpulan sentiasa; baris sub hanya bila disorok. `baca()` modal sub membawa medan ini.

- **Disorok dari SEMUA link petugas** (pengguna: "semua sorok"): Peserta, MC, Hadiah, Tayang, Guru Kelas, Skrip MC PDF, Senarai Hadiah PDF/Word/Excel (termasuk bila dicetak dari admin — tapisan dalam enjin `agKiraSkripMC` / pemanggil `agKiraSenaraiHadiah`). **Kekal** dalam panel admin, tiket, sijil, kad.
- **Tapisan paparan sahaja — nombor giliran TIDAK berubah**, tiada Jana Semula. Berbeza dgn 🎤 yang membuang dari giliran.
- Murid dengan anugerah lain yang tidak disorok **kekal**, di bawah anugerah itu sahaja (`agTapisPenerimaPetugas` menapis `anugerah[]` + `giliran[]`; murid tanpa baki dibuang). Gaya C: utama disorok → pengikut berdiri sendiri (agIkutSah), nombor sama.
- **Peserta** juga membuang murid yang SEMUA anugerahnya 🚫 tidak naik pentas (`agPenerimaPentas` atas majlis segar) — dahulu mereka jatuh ke blok "(tiada anugerah)" (5 murid PI/MORAL/SEJARAH T4, 2 Nov 2026).
- Panel memanggil `agMuatPetugas(MAJLIS)` = dokumen majlis **segar** + penerima ditapis, supaya 🙈 sampai pada 🔄 / muat berkala tanpa muat semula halaman (+1 bacaan setiap muat). `MAJLIS` panel = `agMajlisPetugas(...)` (sub disorok dibuang, `_penuh` = asal untuk jatuh balik bila bacaan gagal). MC/Hadiah: `MAJLIS` hanya ditukar bila senarai dipakai (`senarai.majlis` / `TERTUNDA.majlis`). Tayang auto: pemantau `onSnapshot` menapis dgn `MAJLIS._penuh`.

#### 📝 Nota Petugas (2 Nov 2026)

> **4 Nov 2026: papan umum DIBUANG** dari Peserta, MC, Hadiah dan Admin (pengguna). Yang kekal: nota pada tajuk anugerah (＋ nota), 👤 penyelaras dan 🎭 acara — semuanya pada enjin yang sama. `agPasangNota(null, …)` = pendengar sahaja, tanpa papan. Butiran papan di bawah ialah sejarah.

Papan nota dikongsi **Peserta · MC · Hadiah · Admin** (tab 🔗 Link Petugas). Tayang tiada (skrin dewan). **Semua boleh tulis dan padam** (keputusan pengguna). Satu enjin `agPasangNota(bekas, majlisId, panel)` dalam `anugerah-kongsi.js`; DOM `#nota-petugas` (panel) / `#nota-admin`.

- Koleksi **`anugerah_nota`** = `{majlisId, teks (≤500), nama (≤40), panel, masa: Date.now()}` — **bukan** dalam dokumen majlis (`simpanMajlis()` admin akan memadamnya).
- `onSnapshot` pada `where('majlisId')` sahaja (tiada orderBy → tiada indeks komposit), susun terbaru dahulu di klien. Nama penulis wajib, diingati dalam `localStorage` `ag_nota_nama`. Ctrl/Cmd+Enter hantar.
- `agPasangNota` idempoten per bekas+majlis (dipanggil setiap `lukisPetugas`); tukar majlis → pendengar lama dihentikan. Padam: `bekas.onclick` (ditulis ganti, tidak berhimpun) + `confirm`.
- **Nota pada tajuk ANUGERAH** (pengguna: aras anugerah sahaja, papan umum kekal, semua petugas tulis): **SATU nota per anugerah**, dipapar **SEBARIS nama** dalam accordion Peserta/MC/Hadiah (`ANUGERAH X  📝 nota`; tiada nota = `＋ nota` sunyi). Doc id tetap `${majlisId}__${anugerahId}` — ubah = `set` ganti, kosongkan = padam. `agNotaTajuk(anId, anNama)` → HTML; klik → `prompt` (nama diminta sekali, `localStorage`). Versi pertama (butang 📝 N + panel kuning di bawah tajuk, banyak nota) **ditolak pengguna** — jangan kembalikan. Satu `onSnapshot` untuk papan + tajuk; `agNotaSegar()` mengemas **di tempat**. Pendengar klik dokumen **fasa capture + stopPropagation** — nota duduk dalam tajuk accordion.
- **Reset nota BERASINGAN** daripada reset tanda: butang `#b-reset-nota` (admin) → `agPadamSemuaNota` (batch 400), taip RESET. Reset tanda tidak menyentuh nota dan sebaliknya.

#### 🔄 Tukar link petugas (2 Nov 2026)

Tab 🔗 Link Petugas: butang **🔄 Tukar Link** per baris (Batal + Jana dalam satu langkah, `confirm`) dan **🔄 Tukar SEMUA link petugas** (`#b-tukar-semua-link`, taip RESET) — kod rawak baharu (`agKodBaru`) untuk `kodPeserta/kodMC/kodHadiah/kodTayang/kodGuruKelas` dalam satu `simpanMajlis`. Untuk selepas latihan: link yang tersebar mati serta-merta. **Borang guru (`borangGuru`) tidak disentuh.** Pendaftaran Guru Kelas kekal (doc ikut majlisId, bukan kod) — guru cuma perlu link baharu. Gagal simpan → kod lama dipulihkan dalam memori.

#### 🖨 Skrip MC (PDF) — 30 Okt 2026

Butang **🖨 Skrip MC (PDF)** dalam kad Susunan Naik Pentas (admin) dan **🖨 Cetak** dalam `mc.html`. Satu enjin dalam `anugerah-kongsi.js`: `agKiraSkripMC(penerima)` (kiraan) + `agCetakSkripMC(w, majlis, penerima)` (dialog cetak pelayar, A4). Penerima dibaca **segar**; tetingkap dibuka **sebelum** `await` (pop-up selepas await disekat).

- Satu baris = satu **nombor giliran disimpan** (pengikut gaya C = "turut menerima", bukan baris). Dikumpul anugerah › sub berturut-turut ikut nombor. Kotak ☐ untuk MC tanda tangan; "naik kali ke-2 dari 3"; tidak hadir dicoret.
- **Tiga angka sahaja** (pengguna: label lain mengelirukan) — dalam PDF dan kepala senarai `mc.html`: **Jumlah tiket dikeluarkan** (`bilTiket`, peraturan sama dgn `lukisTiket`: ≥1 nombor pada sub naik pentas bukan 🤫 rahsia) · **Jumlah semua murid** (`bilMurid`, orang berbeza dgn ≥1 nombor) · **Jumlah murid lebih dari 1 anugerah** (`bilUlang`, `giliran[]` bernombor > 1, termasuk pengikut gaya C). Amaran nombor berulang / jurang kekal.
- **KPI tab Giliran berbeza maksud**: "Giliran" = semua entri `giliran[]` (termasuk pengikut gaya C), "Murid" = semua penerima (termasuk yang tidak naik pentas). Skrip MC ialah angka naik pentas yang tepat.

#### 🖨 Senarai Hadiah (PDF) — 31 Okt 2026

Butang dalam kad Pengurus Hadiah (tab 🔗 Link Petugas, `data-cetak-hadiah`, melalui `sahkanNomborSebelum`) dan **🖨 Cetak** dalam `hadiah.html`. Enjin `agKiraSenaraiHadiah` + `agCetakSenaraiHadiah` dalam `anugerah-kongsi.js`, corak sama dgn Skrip MC (penerima segar, tetingkap dibuka sebelum `await`).

- Satu baris = satu **nombor disimpan** = satu hadiah; lajur ☐ Sedia · ☐ Serah · No · Darjah/Kelas · Nama · Status (TIDAK HADIR dicoret, tidak dibuang / Sudah diambil = `mc`).
- Satu `<table>` per blok anugerah berturut-turut; `thead` (tajuk + kiraan + julat giliran) berulang di muka baharu; blok ≤30 baris `break-inside:avoid`.
- Gaya C: tajuk `🎁 GABUNG · TAHUN 5: BAHASA MELAYU + SAINS` (`agTajukSubHadiah` — akhiran " — X" dikongsi dikeluarkan ke depan). Tajuk bertukar ikut nombor, jadi boleh berulang — nombor tidak disusun semula.
- Kepala: sekolah, majlis, tarikh, jumlah hadiah, julat giliran, "Dijana <masa>".
- **📄 Word (.docx)** (2 Nov 2026): butang `data-word-hadiah` (admin) / `#b-word` (`hadiah.html`) → `agMuatTurunSenaraiHadiahWord` — OOXML terus via JSZip (corak PPTX), enjin kiraan sama `agKiraSenaraiHadiah`, jadi isi sentiasa sama dgn PDF. Baris kepala jadual berulang (`tblHeader`), tidak hadir dicoret.
- **📊 Excel (.xlsx)** (2 Nov 2026): butang `data-excel-hadiah` (admin) / `#b-excel` (`hadiah.html`) → `agMuatTurunSenaraiHadiahExcel` — OOXML terus via JSZip, enjin sama `agKiraSenaraiHadiah`. **Satu baris RATA satu hadiah** (No · Darjah/Kelas · Nama · Anugerah · Sub/Gabung · Hadiah · Status · Sedia · Serah), bukan blok bertajuk seperti PDF/Word — supaya petugas boleh tapis/susun. Kepala dibekukan + autoFilter; tidak hadir dicoret kelabu.

#### Susun ikut kelas — 3 anugerah dipadan pada NAMA (1 Nov 2026)

`agIkutKelas(a)` / `agSusunIkutKelas` dalam `anugerah-kongsi.js`, dipanggil dalam `agSusunMuridDalamSub` (enjin tunggal). **Hanya** anugerah yang namanya mengandungi `KEHADIRAN PENUH`, `SAHSIAH TERPUJI` atau `KECEMERLANGAN UPKK` — permintaan pengguna, **tiada butang/medan** (dia minta "jangan bina butang, terus baiki").

- Susunan kelas `AG_SUSUN_KELAS` = CELERON → RYZEN → INTEL → PENTIUM → HIGEN → PIXEL → BYTECH (padanan `includes`, jadi `CELERON (DLP)` padan), kemudian nama. Kelas tidak dikenali → hujung (pengguna: beritahu dia jika berlaku — disemak live, 0 setakat ini).
- Terpakai hanya bila `susunMurid` tiada / `'nama'`; Susun sendiri dan ikut kedudukan **menang**.
- Nombor giliran tidak berubah sendiri → 🔁 Jana Semula.
- Menambah anugerah lain = tambah satu `n.includes(...)` dalam `agIkutKelas`.

#### 🏫 Guru Kelas — lihat murid kelas sendiri (`guru-kelas.html`, 1 Nov 2026)

Guru kelas melihat murid **kelasnya sahaja** yang menerima anugerah + nombor giliran, **baca sahaja**, dengan 🖨 Cetak/PDF (`window.print`). Dua pintu, satu halaman:
- **Link** `guru-kelas.html?kod=` — `modPetugas.kodGuruKelas` (`AG_PERANAN_MEDAN.guruKelas`), baris 🏫 dalam Link Petugas.
- **ESIS › Guru Kelas › tab 🏆 Anugerah** (`index.html`, `gkaSemak`/`gkaBuka`) — halaman sama dalam iframe `?esis=1` (tajuk disorok, tinggi dilapor via `postMessage {gkaTinggi}`). Tab muncul hanya bila `anugerah_majlis.guruKelasEsis === true` dan kod wujud; majlis terbaru dipilih. Admin: butang **🏆 Tab di ESIS: YA/TIDAK** (lalai TIDAK).

**Pendaftaran** dalam koleksi `anugerah_guruKelas`, doc id `${majlisId}__${tahun}__${kelas}` = `{majlisId, tahun, kelas, nama, idNama, pw, daftar, tutup?}`. **Satu kelas satu guru** dikuatkuasakan oleh **transaksi** (ditolak dengan nama tuan). Satu nama satu kelas. Nama dinormalkan seperti Markah Ujian Khas (`gkIdNama`, gelaran dilucut). **Bukan dalam dokumen majlis** — `simpanMajlis()` admin menulis MAJLIS dari memori dan akan memadam pendaftaran baharu.

**Buka/Tutup senarai:** `agGuruKelasTutup(majlis, g)` — `g.tutup` (per kelas) menang, tiada → `MAJLIS.guruKelasTutup` (lalai untuk pendaftar kemudian, ditetapkan oleh 👁 Buka semua / ⛔ Tutup semua yang juga menulis setiap doc). Lalai DIBUKA. Guru masih boleh daftar/masuk bila ditutup. `guru-kelas.html` membaca majlis + doc pendaftaran **segar** setiap 🔄 Muat Semula; doc dipadam admin → mesej daftar semula. Admin boleh **Padam** pendaftaran (lupa kata laluan / salah kelas).

Rahsia 🤫 disorok (`agSubRahsia`); bukan murid (`jenis:'luar'`) tidak dipapar; anugerah tidak naik pentas = "Tidak naik pentas", tiada nombor = "Belum".

**Rahsia KEKAL disorok daripada guru kelas** — keputusan pengguna 2 Nov 2026 (cadangan papar dengan tanda "jangan maklumkan murid" ditolak).

**Aduan "anugerah X tidak keluar" (2 Nov 2026, contoh NILAM):** disemak live untuk 31 kelas berdaftar — 370/372 entri dipapar, 2 yang tiada ialah 🤫 rahsia. Punca sebenar: borang guru NILAM **belum dihantar** (senarai belum lengkap), atau kelas guru itu **tiada pendaftaran** (7 kelas ada penerima tanpa guru berdaftar). Semak dua perkara ini dahulu sebelum menyangka `binaBaris` rosak.

#### Nombor giliran mesti berturutan tanpa jurang

`beriNombor(true)` (🔁 Jana Semula) menomborkan 1…N mengikut `binaTurutan`; sub tanpa peserta dilangkau sendiri dan tidak memakan nombor.

Selepas kerja membetulkan sub darjah (26 Okt 2026), majlis ini tinggal **110 murid tetapi nombor berjalan sehingga 113** dengan jurang di 2, 5, 6 — nombor yatim milik entri pendua yang dibuang. Dijana semula ke **1–110, 0 jurang, 0 pendua**.

**Nombor disimpan dalam database, bukan dikira pada paparan.** Membiarkan satu panel mengira nombornya sendiri bermakna pengurus peserta nampak "5" sementara MC memanggil "7" untuk murid yang sama. Kalau tiket sudah dicetak, jana semula bermakna cetak semula.

#### Reset tanda petugas

`resetTanda(medan, label)` menerima **array** supaya "Reset kedua-dua" mengosongkan `hadir` dan `mc` dalam **satu** tulisan. Dua tulisan berasingan bermakna separuh reset kalau yang kedua gagal — dan admin yang sedang menguji tidak dapat membezakan "gagal" daripada "memang tiada tanda".

- **Dipecah pada `RESET_CHUNK` (400).** Versi lama memakai **satu batch**; Firestore menghadkan 500 operasi, jadi ia akan pecah senyap pada majlis >500 murid. Majlis ini 105 — ia belum pernah gagal, dan itulah sebabnya ia terlepas pandang.
- **Dialog membawa kiraan tanda sebenar.** "Reset semua tanda MC?" tanpa nombor tidak memberitahu admin sama ada dia memadam kerja satu majlis penuh atau tiada apa-apa.
- **Baca `PENERIMA` segar dahulu** (3 Nov 2026). Dahulu `resetTanda` mengira daripada `PENERIMA` dalam memori — tanda yang petugas buat selepas admin membuka halaman tidak direset dan "Sudah diambil" kekal.
- **Panel MC/Hadiah lukis terus selepas reset** (`agAdaResetTanda(lama, baru)`): bila senarai lama ada tanda dan yang segar tiada, mod senyap diabaikan dan toast dipapar. MC juga mengosongkan `MENUNGGU`. Tanpanya MC tidak pun menyalakan butang merah (`capHadir` tidak membawa `mc`). Berkuat kuasa pada muat berkala seterusnya (≤90s) atau 🔄.
- **🎁 1/3 + seterusnya** (`agTandaKe`/`agTeksKe`/`agPilKe`): skrin Peserta/MC/Hadiah dan cetakan Skrip MC + Senarai Hadiah PDF/Word/Excel. Dikira atas senarai penuh, gabung = 1.
- `lukisResetStatus()` memaparkan keadaan semasa (kuning bila ada tanda, hijau bila bersih).
- Nombor giliran dan senarai penerima **tidak disentuh** — boleh diulang berapa kali pun semasa menguji.

Disahkan 26 Okt 2026 pada majlis sebenar: taip salah → 5 tanda kekal; taip RESET → **0 tanda tinggal, 39 giliran kekal, 0 medan lain berubah**. Oracle 20,000 kes + 15 unit, termasuk invarian "reset `hadir` tidak menyentuh `mc`/`no`/`sub`/`hadiah`".


### Anugerah — gabung BEBERAPA peperiksaan

Modal anugerah dulu ada **dua** slot tetap (`a-pep1`, `a-pep2`) berlabel "purata dua peperiksaan". Kini senarai **kotak tanda** (`.a-pep-chk`) — UASA + UPSA + MATRIK, seberapa banyak yang perlu. Enjin `agKiraCalon` memang sudah generik (gelung `senaraiPep`), hanya UI yang mengehadkannya.

#### `asas:'gps'` dengan beberapa peperiksaan — purata per SUBJEK dahulu

**Pepijat yang dibetulkan 25 Okt 2026.** Rekod semua peperiksaan ditimbun menjadi satu kolam, jadi setiap subjek dikira **sekali bagi setiap peperiksaan**. Tiga kesan, semuanya senyap:

- **GPS condong** — UASA+MATRIK 4 subjek → 8 rekod, GPS 4.88 bukan 5.00
- **`jumlah` berganda** (580 bukan 290), jadi pemecah seri salah
- **`kurang` tidak pernah dicetuskan** — murid dengan **2 daripada 4** subjek teras × 2 peperiksaan = 4 rekod, dilaporkan **LENGKAP**, jadi amaran "2/4" yang admin bergantung padanya tidak muncul

Kini: purata **markah per subjek** dahulu (sama peraturan dengan cabang `asas:'subjek'`), kemudian gred dikira atas purata itu. Rekod pendua dalam peperiksaan yang sama: **yang pertama menang**.

`jumlah` guna **`parseFloat`**, bukan `parseInt` — purata merentas beberapa peperiksaan boleh jadi 72.5, dan `parseInt` membuangnya menjadi 72; pada 13 subjek itu cukup untuk menukar kedudukan dua murid.

Oracle 40,000 kes · 0 beza · 6 mutasi ditangkap (termasuk kod lama: 25,656 beza).


#### 👤 Penyelaras — teks bebas, anugerah DAN kategori (4 Nov 2026)

Butang **＋ penyelaras** (biru bila diisi) pada bar **anugerah** (sebelum ＋ nota) dan pada **setiap bar kategori (sub)**, di Peserta · MC · Hadiah. **Semua petugas boleh tulis/ubah/padam terus dari bar** — bukan Panel Admin.

- **Teks bebas, berbilang baris** (pengguna: "wording bebas, bukan state segmen"). Satu baris tulisan = satu baris paparan, seperti ditaip; perkataan sebelum `:` ditebalkan. Tiada label dipaksa, tiada warisan anugerah → sub, tiada pemecahan nama. (Versi awal memecah nama ikut koma + huruf besar + amaran "dua orang" — dibuang kerana penyelaras berbeza ikut segmen yang pengguna tentukan sendiri.)
- Editor = kotak terapung `#ag-pny-kotak` (textarea, Simpan/Padam/Batal, Ctrl/⌘+Enter, Esc). `prompt()` satu baris sahaja. Di luar `#senarai` supaya muat berkala 90s tidak memusnahkan draf.
- Menumpang enjin nota: koleksi `anugerah_nota`, `jenis:'penyelaras'`, `subId` (`''` = aras anugerah), doc id `${majlisId}__${anugerahId}[__${subId}]__penyelaras`. `agNotaAnugerah` / `agNotaUntuk` **mesti** menapis `jenis !== 'penyelaras'`.
- Dicetak: Skrip MC PDF + Senarai Hadiah PDF/Word di bawah tajuk anugerah dan tajuk kategori; Excel lajur **Penyelaras** = anugerah · kategori. Admin memasang pendengar nota (`agPasangNota(null, …)`) dalam `lukisPetugas` supaya cetakan dari admin membawanya.
- **🗑 Padam semua nota TIDAK memadam penyelaras** (`agPadamSemuaNota` / `agBilNota` menapisnya) — ia tetapan majlis.
- Papan 📝 Nota Petugas umum dibuang dari keempat-empat panel (4 Nov 2026); nota anugerah (＋ nota) kekal.

#### 🎭 Acara di link petugas (4 Nov 2026)

Acara bukan-anugerah (persembahan, ucapan, doa…) **diselit di mana-mana**: di awal, selepas sesuatu anugerah, atau selepas sesuatu kategori. **Semua petugas** tambah/ubah/pindah/padam dari Peserta · MC · Hadiah (butang **＋ 🎭 Acara** di atas senarai, ✏️ pada bar, ↑↓ bila >1 di tempat sama). **Dicetak** dalam Skrip MC + Senarai Hadiah PDF/Word (baris berbingkai putus-putus). Excel tidak (senarai rata per murid). Tiada ✓ Selesai, tiada tayangan (pengguna).

- Data: `anugerah_nota`, `jenis:'acara'`, `{tajuk, teks, letak, urutan}`. `letak` = `'awal'` | `'an:<anId>'` | `'sub:<anId>|<subId>'`. **Nombor giliran, tiket, susunan TIDAK disentuh.** 🗑 Padam semua nota tidak memadamnya (nota biasa = `!jenis`).
- `an:` dilukis selepas blok **terakhir** anugerah itu (gaya bebas boleh ada beberapa blok). `sub:` di dalam anugerah — bila anugerah tertutup, bar anugerah memapar lencana `🎭 N acara`.
- Acara yang tempatnya tidak dilukis (kategori tiada murid / anugerah dibuang) dipapar di **hujung** bila tiada tapisan (`agAcaraAkhir`) dan dicetak di hujung (`agAcaraBaki`) — tidak pernah hilang senyap.
- Perubahan acara mengubah struktur → `agNotaSegar` memanggil `window.lukis()` bila tandatangan acara berubah. Editor di luar `#senarai`.
- Diuji 4 Nov 2026 dengan acara dalam memori (tiada tulisan): kedudukan awal/an/sub/yatim betul dalam Peserta dan cetakan Skrip MC + Senarai Hadiah PDF. Word belum diuji.

#### 📊 Analisa (tab admin, 4 Nov 2026)

Tab baca sahaja `p-analisa` (sebelah 📋 Semak Penerima): `initAnalisa` → `kiraAnalisa` → `lukisAnalisa`, DOM id `an-`. Penerima dibaca **segar** setiap buka tab / 🔄 Segar Semula.

**Kad = angka + label pendek + `ⓘ klik` SAHAJA.** Pecahan dan senarai nama masuk modal `anModalButiran(id)` (klik / Enter pada `[data-an-kad]`). Versi teks pecahan panjang di bawah angka dibalas "keliru" tiga kali oleh pengguna — jangan kembalikan; pengguna sendiri minta "klik show details".

| Kad (`data-an-kad`) | Angka | Modal |
|---|---|---|
| `murid` Jumlah semua murid | murid ESIS (bukan `luar`) dgn ≥1 anugerah sah | per darjah "N dari M (%)" |
| `tiket` Jumlah tiket dikeluarkan | peraturan `lukisTiket` (≥1 nombor pada sub naik pentas bukan 🤫), **termasuk bukan murid** | tiket murid + bukan murid = jumlah; senarai murid tiada tiket + sebab (🚫 / belum bernombor / 🤫) |
| `ulang` Lebih dari 1 anugerah | `anugerah[]` sah > 1 (murid sahaja) | senarai |
| `anugerah` Jumlah anugerah | semua entri sah | naik pentas + tidak naik pentas 🚫 |
| `naik` Jumlah kali naik pentas | nombor berbeza per penerima pada sub naik pentas = satu hadiah | anugerah naik pentas − digabung (gaya C) − belum bernombor |
| `luar` Bukan murid | hanya bila > 0 | senarai |
| `tanpa` Murid tidak naik pentas | penerima yang SEMUA anugerahnya 🚫 (hanya bila > 0) | senarai |

Angka sebenar 4 Nov 2026: 312 murid, 333 tiket = 307 murid + 26 bukan murid, 5 murid tidak naik pentas (312 − 5 = 307), 454 anugerah → 435 kali naik pentas.

- "Sah" = `subId` masih wujud dalam majlis (entri yatim tidak dikira).
- **Ikut darjah & kelas:** kunci `DARJAH|KELAS` (nama kelas berulang), susunan `AG_SUSUN_KELAS`, jumlah per darjah + JUMLAH. Kelas 0 penerima = baris merah `⚠ tiada penerima`. Lajur Tiket = murid sahaja.
- **Murid lebih dari 1 anugerah:** jadual di skrin, susun bil. menurun kemudian nama.
- CSV (`agMuatTurunCSV`) + PDF (dialog cetak) memuat semua pecahan + senarai (termasuk tidak naik pentas).
- Angka di sini boleh berbeza dgn Skrip MC: Skrip MC menapis 🙈 sorok petugas, Analisa tidak.

#### Angka asas sama di semua link petugas (5 Nov 2026)

Pengguna: "mesti sama". Baris tajuk (`#sari`) Peserta · MC · Hadiah · Slaid kini bermula dengan teks yang SAMA — `agTeksAsasPetugas(agKiraSkripMC(penerima, majlis))` → `325 murid · 425 giliran` — kemudian angka tugas panel itu (hadir / sudah naik / perlu dibawa (N tidak hadir) / slaid). **Giliran = satu nombor**; pengikut gaya Gabung tidak dikira. Dahulu Peserta mengira `giliran[]` mentah (437) sedangkan MC 425 — beza tepat 12 pengikut. Panel baharu mesti memakai helper yang sama, bukan kiraan sendiri.
