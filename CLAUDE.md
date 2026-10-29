# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Sistem ESIS** (Sistem Informasi Peperiksaan Sekolah) — a Malaysian school examination marking and analysis web app, deployed to Firebase Hosting. The UI is entirely in Malay.

## Commands

```bash
# Local development server
firebase serve

# Deploy to Firebase Hosting only
firebase deploy --only hosting

# Deploy everything (hosting + rules)
firebase deploy
```

There is no build step, no package.json, no linting, and no test suite — this is a vanilla HTML/JS application.

## Architecture

The entire application lives in a **single file**: `public/index.html` (~10,070 lines). All HTML, CSS, and JavaScript are inline in this one file. `public/index.backup.html` is a manual backup snapshot — do not edit it.

**Firebase project:** `sistem-esis` (see `.firebaserc`)  
**Firebase services used:** Firestore (database) + Hosting (static serving) + Storage (slip images: logo, Jata Negara, GB signature)

`storage.rules` — folder `public/` allows public read, image-only writes under 5MB. `cors.json` sets CORS on the Storage bucket (`gsutil cors set cors.json gs://sistem-esis.firebasestorage.app`) — required because jsPDF `addImage` fails silently on cross-origin Storage URLs without it.

### Firestore Collections

| Collection | Purpose |
|---|---|
| `students` | Master student records (no_kp, tahun, kelas, nama, jantina, agama) |
| `rekodMarkah` | Exam mark records |
| `subjek` | Subject definitions |
| `gred` | Grade ranges/definitions (doc id = grade letter `A`..`F`; fields: `markah_min`, `markah_max`, and `mata` = GPS point value, see GPS section) |
| `examTypes` | Exam type classifications (fields: `nama`, `tahunKalendar`, `darjah[]`, `subjek[]`, `aktif`, `order`, `guruTerhad`, `diterbit`) |
| `settings` | System settings (markahEnabled flag, school name, logo URL) |
| `guruMarkah` | Pendaftaran guru subjek untuk Markah Ujian Khas (doc id = nama dinormalkan) |

### UI Panels (main navigation sections)

1. **Rekod & Laporan** — Enter exam marks **and** edit/print reports (one combined panel; see below)
2. **Analisa Keseluruhan** — Grade analysis across all subjects
3. **Analisa Subjek** — Grade trends for a single subject
4. **Murid Terbaik** — Student rankings
5. **Guru Kelas** — Manage student roster (4 tabs: Tambah / Lihat-Edit / Status Pengisian / **Markah Kelas**)
6. **Headcount** — Target tracking (TOV/OTI/ETR/AR)
7. **Anugerah** — Award ceremony module, separate pages (`anugerah-admin.html` + peserta/hadiah/mc/tayang)
8. **ESIS Helper** — Install guide for the ESIS→SPPB mark helper (`helper-sppb.html`); see its section below
9. **Markah Ujian Khas** — Guru subjek isi markah kelasnya sendiri (`markah-guru.html`); pentadbir lihat semua. Lihat bahagiannya di bawah
10. **Admin Panel** (password-protected) — System configuration

### Key Code Locations

| Area | Location in index.html |
|---|---|
| CDN lazy-loader (`loadScript`) | ~line 1732 |
| Firebase config | ~line 1757 |
| Main data load (`bacaInitialData`) | ~line 5310 |
| Admin login (`handleLogin`) | ~line 5660 |
| Panel navigation (`showPanel`) | ~line 5692 |
| Save marks — new entry (`simpanMarkah`) | ~line 6085 |
| Save marks — edit form (`simpanEditMarkah`) | ~line 6520 |
| Delete marks (`deleteMarkahByFilter`) | ~line 2278 |
| Edit marks table (`renderEditTable`) | ~line 6359 |
| Copy marks for SPPB (`salinUntukSPPB`) | search `function salinUntukSPPB` |
| Chrome-only guard (`adalahChromeTulen`) | directly above `salinUntukSPPB` |
| Analysis table (`renderAnalisaTable`) | ~line 6458 |
| Read-only exam check (`isEditExamReadOnly`) | ~line 6520 |
| Slip PDF — single student builder (`binaSlipBlobMurid`) | ~line 4524 |
| Slip PDF — settings + preloaded images (`bacaSlipCtx`) | ~line 4714 |
| Slip PDF — generate for selected students (`generateSlipPDF`) | ~line 4874 |
| Slip PDF — bulk download by darjah, ZIP per kelas folder (`downloadSlipDarjah`) | ~line 4779 |
| Slip image upload to Storage (`uploadSlipImage`) | ~line 4271 |
| Image → JPEG dataURL resize helper (`_imgToDataURL`) | search in file |
| GPS helpers (`getMataMap`, `kiraGPS`) | ~line 2437 |
| GPS admin UI (`renderMataGred`, `simpanMataGred`) | ~line 2463 |
| Exam types for a year, deduped (`getExamTypesForYear`) | ~line 11199 |

### GPS (Gred Purata Subjek) — subject grade-point average

Per-exam subject grade-point average. **Higher is better** (A=6…F=1, opposite of KPM's low-is-good convention). Point values are admin-editable and stored on the existing `gred` collection as a new field `mata` (reuses the collection — no new collection). Missing/blank `mata` falls back to `MATA_GRED_DEFAULT` = `{A:6,B:5,C:4,D:3,E:2,F:1}`.

- **Formula:** `GPS(subjek) = jumlah_skor ÷ jumlah_murid`, where `jumlah_skor = Σ(bil_murid_gred × mata_gred)`. **TOTAL GPS** (whole exam) = `Σ skor semua subjek ÷ jumlah rekod` (records = murid × subjek).
- Grade "Gagal"/"TIDAK SAH" = **0 points but still counted in the divisor** (matches existing tables that only bucket A–F in `grades{}` yet still `total++`). GPS shown to **2 decimals**.
- **Helpers** (near `getGredFromMarkah`): `getMataMap()` returns `{A..F: number}` merging `GLOBAL_DATA.grades[].mata` over defaults; `kiraGPS(grades, jumlah)` returns a 2-dp number or `null` when `jumlah<=0`. Both use the fixed A–F keys (grades are hardcoded A–F across the app).
- **Admin UI:** card "📊 Mata Gred (GPS)" inside Admin › Setting (`#mata-gred-container`), rendered by `renderMataGred()` on tab open, saved by `simpanMataGred()` (`db.batch().set(..., {merge:true})` per grade doc + live-updates `GLOBAL_DATA.grades`).
- **Also surfaced in Headcount:** **Perbandingan Gred** table (a GPS column per exam block + the SASARAN block, `hcRenderGredJadual`), **Corak Gred** (GPS per pattern row, per pupil, and a KPI card — note this is the average *grade point*, e.g. `3A1B` = 5.75, not the average *mark*), and **📈 Trend GPS** (see below). `simpanMataGred` redraws Perbandingan Gred so changed point values apply without a reload.
- **Surfaces:** (a) **Analisa Keseluruhan** — big green **GPS Keseluruhan** summary card above the chart (`#analisa-gps-kad`, filled in `cariAnalisa`), plus a **GPS** column + **TOTAL GPS** footer row in the table (`renderAnalisaDataTable`), and GPS in CSV (`exportAnalisaCSV`) and PDF (`cetakAnalisaPDF`). (b) **Analisa Subjek** — GPS column in table (`renderAnalisaSubjekDataTable`, far right — scroll) + CSV. (c) **Analisa Kelas** — GPS column per kelas + GPS in JUMLAH footer (`renderAnalisaKelas`); the print view (`cetakAnalisaKelas`) reuses the table HTML so GPS carries over automatically. **Analisa Subjek PDF is NOT modified** (its multi-subject-per-year layout is separate from `analisaSubjekReportData`).

### Exam-type dedup gotcha (dropdown consistency)

`loadExamTypes` (used by Urus Peperiksaan / Rekod) deletes duplicate same-name docs in the same `tahunKalendar` (via in-fn dedup + `deduplicateExamTypes`). `getExamTypesForYear` (used by **Analisa Mengikut Kelas** dropdown, Status Pengisian) previously did **not** dedup, so the same-name dupes could show there but not in Urus Peperiksaan. Fixed: `getExamTypesForYear` now dedups by uppercased `nama` in-memory with `.filter()` (**read-only — never deletes Firestore docs**). Note: different-name entries (e.g. `UPSA` vs `UJIAN PERTENGAHAN TAHUN (UPSA)` in the same year) are NOT dupes — they legitimately both appear; managing those is the teacher's job in Urus Peperiksaan.

### Exam "Aktif" Toggle (Urus Jenis Peperiksaan)

Each exam type in `examTypes` has an `aktif` boolean, toggled in Admin. `aktif: false` puts the exam into **view-only mode** in Rekod & Laporan: teachers can view marks, print PDF, and export CSV, but cannot add/edit/delete marks (Simpan/Padam buttons hidden, no input fields, "Mod Baca Sahaja" banner shown). `isEditExamReadOnly()` also guards `simpanEditMarkah()`/`deleteMarkahByFilter()` server-side against bypass. This is separate from the global `settings.markahEnabled` flag, which blocks entry to the whole Rekod & Laporan panel.

### Rekod & Laporan panel — ONE combined form (IMPORTANT)

"Rekod Markah" (enter) and "Edit & Cetak" (edit/print) are **one panel** (`#markah-panel`, `showPanel('rekod-laporan')`) driven by the `edit-*` dropdowns: `edit-year` → `edit-peperiksaan` → `edit-tahun` (darjah) → `edit-kelas` → `edit-subjek`, handled by `onEdit*Change()`. The old `pilih-peperiksaan`/`pilih-tahun` selects are **hidden/legacy** (kept only so old JS ID refs don't break). **When debugging "exam type not showing in Rekod", inspect `onEdit*Change`, not `populateAllExamDropdowns`.**

Each dropdown level is populated from **two sources merged**: (a) values that already have marks (`getMarksByYear`) — for editing existing records incl. inactive exams in read-only mode; and (b) for **active** exam types, the school structure so teachers can **start entering marks for a brand-new exam that has zero marks yet** — jenis from `examTypes` aktif (`onEditYearChange`), darjah from `examType.darjah` (`onEditPeperiksaanChange`), kelas from `GLOBAL_DATA.allClasses[tahun]` (`onEditTahunChange`). `cariMarkahEdit()` then builds an empty per-student template to fill (~line 7956). Without (b), a new active exam is invisible (chicken-and-egg: no marks → not shown → can't add marks).

### TH (Tidak Hadir) — absent pupils

Teachers tick a **TH** checkbox beside each mark box in Rekod & Laporan. TH is **not a mark and not a failing grade** — the pupil was absent, so there is nothing to assess.

**Three distinct states** (do not collapse them):

| State | Meaning | Firestore |
|---|---|---|
| Empty | Teacher has not filled it in yet | **No record** |
| TH | Teacher checked; pupil was absent | **Record exists**: `{markah: null, gred: 'TH', th: true}` |
| 0-100 | Real mark | Record exists |

A TH record is written so it is clear the teacher *processed* that pupil — a TH row is therefore **not** highlighted yellow "belum diisi", and does not count toward the incomplete-marks banner.

**Helpers** (declared near the top of the script, before `tanpaTH`/`kiraGPS` — `GRED_TH` is a `const`, so ordering matters):
- `isTH(rekod)` — accepts a record object *or* a raw value; checks `th === true` or `gred === 'TH'`
- `tanpaTH(marks)` / `bilTH(marks)` — **use these at the top of every aggregation**, not per-bucket conditionals. 16 call sites.

**The invariant: TH leaves both the numerator and the denominator.** A class of 30 with 2 TH is scored out of 28. This differs from grade `Gagal`, which is 0 points but *stays* in the divisor. Getting this wrong silently drops a class's GPS and % lulus.

**Where the bugs were** (all fixed — do not regress):
- Four sites bucketed grades with `String(m.gred || 'F')`, turning TH into an F, and ran `total++` unconditionally.
- **Murid Terbaik** used `parseInt(mark.markah) || 0`, which gave absent pupils **0 marks** and sank their ranking. Percentage now divides by `bilSubjekDinilai` (subjects actually sat), not `selectedSubjects.length`.
- The report **PDF printed the literal string `"null"`** for a TH mark via `String(mark.markah)`.
- Coverage warnings counted TH as "markah belum masuk", producing a red warning a teacher could never clear. `cariMarkahMurid` now returns a separate `th` array alongside `tiada`.

**Classification rule:** a pupil with `3A + 1 TH` is **Full A**, and their Corak Gred pattern is `3A` — judged on the subjects they actually sat (`jumSubjek` is reduced by the TH count). This is deliberately different from a pupil with 3A whose fourth subject the teacher simply *has not entered*: that one stays "tidak lengkap", because the grade exists but is unknown. If the school ever decides Full A requires every core subject present, change `hcmKumpulan(gl, subjekUtama.length - th.length)` back to the unadjusted count.

**Related fix — mark 0 was silently lost.** `simpanEditMarkah` rejected anything `< 1` and `renderEditTable` used `mark.markah || ''` (0 is falsy in JS). A teacher entering 0 got a "BERJAYA" message while no record was written. Both now accept 0; `input.min` is 0.

### Subjek Terlibat (subjects involved per exam type)

`examTypes.subjek` = array of subject `nama_penuh` involved in that exam. **Empty `[]` / missing = ALL subjects** (default; legacy docs are safe). Admin sets it via a dynamically-generated checklist (from `GLOBAL_DATA.allSubjects`, not static HTML) in the Add form (`new-exam-subjek`) and Edit modal (`edit-exam-subjek`) — all checked by default; admin unticks those not involved. Helpers: `renderSubjekChecklist(prefix, selectedNames)`, `setSubjekChecks(prefix, val)`, `bacaSubjekTerlibat(prefix)` (returns `[]` when all/none ticked, else the ticked names). Saved by `tambahJenisPeperiksaan`/`saveEditJenisPeperiksaan`.

Filtering applies **only at mark entry**: `onEditKelasChange` restricts the `edit-subjek` dropdown to `examType.subjek` (var `subjekTerlibat`). Slip & Analisa are **not** filtered (they follow actual marks). Subjects that already have records are **always shown** even if not in the list (so existing data is never hidden). Admin list badge shows "N subjek" / "Semua subjek".

### Kuota Firestore habis — jangan gagal secara senyap

Firestore memulangkan `resource-exhausted` (gRPC 8) apabila kuota harian projek habis. Pada pelan Spark, **setiap** bacaan ditolak selepas itu — termasuk satu dokumen.

Kegagalan ini dahulu ditangkap dan dicatat ke console sahaja, lalu kod meneruskan dengan **senarai kosong**. Jadi "kuota habis" kelihatan serupa dengan **"guru belum isi markah"**: Rekod & Laporan papar "tiada data", Status Pengisian papar hampir semua kelas sudah siap, dan tiada sesiapa dapat membezakan keduanya. Guru menyangka markah mereka hilang.

- `_adalahRalatKuota(e)` menyemak `e.code` (`resource-exhausted` / `8`) **dan** teks mesej — pembungkus SDK tidak sentiasa mengekalkan kod.
- Bendera `_kuotaHabis` menghalang laluan **segar semula** daripada membuang cache yang masih baik: menekan 🔄 ketika kuota habis **memburukkan** keadaan, kerana ia membuang data yang boleh dipakai kemudian gagal mengisi ganti.
- `markah-guru.js`: guru diberitahu markah **TIDAK tersimpan** dan jangan tutup tab. Mesej generik membuatkan dia menyangka ralat kecil dan beredar — kuota menolak **tulisan** juga, bukan bacaan sahaja.

### Caching

IndexedDB is used to cache Firestore data client-side. A "force refresh" button in the UI invalidates this cache. Cache keys follow the pattern `year_subject_marks`.

**The cache stores data AFTER processing** — `normalizeAgama`/`normalizeJantina` run on read and the *result* is what gets cached. So a fix that changes how data is interpreted does not reach users who already hold a cache: they keep seeing the old code's output until it expires (24h) or they hit 🔄 Segar Semula, and the fix looks like it did not work.

**`CACHE_CONFIG.DATA_VERSION` (currently 2) guards this.** It is written onto every entry and checked on read, before the expiry check; a mismatch (or a missing `version`, i.e. pre-dating this system) discards the entry and refetches once. **Bump it whenever a change alters how cached data is derived, not only when the data's shape changes** — the shape looking unchanged is exactly what makes this easy to miss. See the IndexedDB wedge section for the separate `DB_NAME` recovery mechanism.

### Cross-Year Mark Matching (IMPORTANT)

For any mark lookup **across calendar years** (e.g. Headcount TOV = last year's mark, or tracking a pupil's progression), **always match by `no_kp` only** — never by `tahun`/`kelas`. A pupil's `no_kp` is stable, but their `tahun` (darjah) and `kelas` change every year (a ENAM 2026 pupil was LIMA 2025, possibly in a different class). Matching cross-year on `tahun`/`kelas` silently returns 0.

Use the shared helper `cariMarkahMurid({calYear, subjek, peperiksaan, muridList, mod})` (near `getMarksByYear`): `mod:'no_kp'` for cross-year, `mod:'kelas'` for same-year (edit/slip/analisa). It returns `{map, jumpa, tiada}` — use `tiada` to warn the user when marks are missing rather than showing silent zeros. Pass `forceFresh:true` to bypass the `marksCache` (which `ensureMarksLoaded` does not otherwise re-pull for an already-cached year).

### Headcount (target tracking: TOV → OTI → ETR → AR)

A per-class-per-subject student target-tracking feature. Four numbers per pupil:
- **TOV** (Take-Off Value) = starting mark, pulled from a **prior-year** exam in `rekodMarkah` (matched by `no_kp`, cross-year).
- **OTI** (steps) = evenly-spaced sub-targets computed from TOV→ETR by `hcKiraOTI(tov, etr, bil)`.
- **ETR** = final target mark the teacher/admin sets. Auto-suggested as `TOV + n` (default +10), editable.
- **AR** = actual current-year marks per ladder step, pulled live from `rekodMarkah`.

**Only ETR + settings + overrides are persisted**; TOV/OTI/AR are always recomputed from real marks (so they never go stale when marks are corrected).

**Firestore collection `rekodHeadcount`** — one doc per kelas×subjek. Doc id: `` `${tahun}_${kelas}_${subjek}_${calYear}` `` (tahun = darjah word SATU..ENAM). Doc shape: `{tahun, kelas, subjek, cal_year, tovSource:{tahun,peperiksaan}, bilTangga, petaOTI:[examName...], etr:{no_kp:val}, override:{no_kp:{tov:n}}, timestamp}`.

**Two surfaces:**
- **Guru (user) panel** — main-menu card 🎯 Headcount (`#headcount-panel`), gated like Rekod Markah (`markahEnabled`/`isAuthenticated`). Eight internal tabs via `hcTukarTab`: **Ubah Sasaran (ETR)** / **Papan Jejak** / **📊 Analisa** / **📈 Analisa Perbandingan** / **📋 Perbandingan Gred** / **🏆 Murid Terbaik** / **📋 Corak Gred** / **📈 Trend GPS**. For non-admins, the TOV-source + anak-tangga blocks are hidden (`hcAturPaparan()`), a locked "tetapan admin" banner shows instead, and the TOV column is read-only (only ETR editable). Papan Jejak headers show the **real exam name** from `petaOTI` (not "Ujian N"). Per-row + per-card **individual PDF print** (`hcCetakIndividu`).
- **Admin bulk-build** — tab "🎯 Bina Headcount" inside Admin Panel (`toggleAdminTab('bina-headcount')` → `initBinaHeadcount`). Sets TOV source + anak tangga for a whole darjah and batch-writes one `rekodHeadcount` doc per selected kelas×subjek (`bhcBinaSemua`, `db.batch()` chunked at 450).

**Analisa tab** (`hcLukisAnalisa`, `hcStatKelas`): dashboard of % on-target, avg improvement (TOV→AR), grade distribution per kelas (bar chart via Chart.js loaded in `<head>`, table + JUMLAH footer). Toggle **Gred Sebenar (AR)** vs **🎯 Gred Sasaran (ETR)** (`hcTukarGredMod`) — target grades computed from ETR via `getGredFromMarkah`.

#### Analisa correctness rules (audited 2026-09-05 — do not regress)

All three analysis tabs (Analisa / Analisa Perbandingan / Perbandingan Gred) were cross-checked against an independent oracle (80k synthetic cases + 29 real `rekodHeadcount` docs, 0 discrepancies). Keep these invariants:

1. **`% capai` denominator = `bilSasaran`**, NOT `bilAdaMarkah`. Only pupils with a mark **and** a valid OTI (needs both TOV and ETR) can ever be "capai", so pupils without ETR must not sit in the denominator. `peratusCapai` is `null` (not `0`) when nobody has a target. Displayed as "12 dari 28 murid".
2. **Classes with no `rekodHeadcount` doc are excluded from every aggregate** (KPI, table footer, chart) and reported separately as a warning — they are "belum dibina", not 0%.
3. **`TIDAK SAH` marks are never bucketed as F.** `hcTambahGred` returns `true` / `'rosak'` / `false`; grade `Gagal` counts as F, but non-numeric/out-of-range is excluded and surfaced via `hcAmaranRosak`. `pLulus` divides by `s.total` (valid grades), not `bilAdaMarkah`.
4. **Exam order drives OTI ladders.** `hcSemakSusunan` flags duplicate/missing `order` in `examTypes` and `hcAmaranSusunan` prints the actual ladder order so teachers can verify. `tambahJenisPeperiksaan` computes `order` from `max(order)+1` **of the target year**, not `GLOBAL_DATA.examTypes.length` (which is the *displayed* year — caused colliding orders).
5. **OTI step count comes from the live exam list**, so adding/removing an exam retroactively shifts ladders. This is intentional (avoids stale `petaOTI`); `hcAmaranTangga` warns when `doc.bilTangga` differs from the current exam count.
6. **Calendar year is selectable** per tab (`hcTahunAnalisa('hca-tahun-kal')` etc.), threaded through `hcBacaDocHeadcount` / `hcMuatPepSemasa` / all stat functions. Tab Set Sasaran & Papan Jejak stay on the current year (data entry).
7. **Wording is plain Malay, not jargon**: "Ikut Sasaran" (🟢 Baik ≥60% / 🟡 Sederhana 40–59% / 🟠 Perlu perhatian <40%) and "Markah Naik" showing actual vs `purataDiminta` (ETR−TOV) — a class with a modest target must not look weak just because its raw gain is small.

### Murid Terbaik (main menu panel) — grade filter

The main-menu panel **Murid Terbaik Mengikut Subjek** (`murid-terbaik-panel`, `cariMuridTerbaik`) has a **Gred** dropdown beside Jenis Peperiksaan, default "Semua Gred". It filters the listing to pupils who scored that grade in that subject. Filtering happens *after* records are found so the error message can tell "no marks at all for this selection" apart from "marks exist but nobody got that grade". CSV and PDF follow the filter, and the PDF header states the grade.

**Do not confuse this with the Headcount tab of the same name** — a subject+grade filter was once added to the Headcount 🏆 Murid Terbaik tab and reverted (`82c50c5`); the main-menu panel is the right home for it.

### 🏆 Murid Terbaik tab + ⭐ Subjek Diutamakan (admin)

Classifies pupils **across core subjects** with per-exam vs ETR comparison. Sixth Headcount tab (`hcTukarTab('murid')` → `hcInitMurid`); functions prefixed `hcm*` / `hcMurid*`.

**Admin › ⭐ Subjek Diutamakan** (`toggleAdminTab('subjek-utama')` → `initSubjekUtama`): per-darjah core-subject checklist, reusing `renderSubjekChecklist`/`bacaSubjekTerlibat`. Stored at `settings/subjekUtama` = `{darjah: {EMPAT: [nama_penuh...]}}`. **Empty `[]` / missing = ALL subjects** (legacy-safe). Read via `subjekUtamaUntuk(darjah)`; `hcInitMurid` calls `bacaSubjekUtama(true)` on every tab open so admin changes apply without a page reload.

**Classification** (`hcmKumpulan(gredList, jumSubjek)`) on the latest exam with marks, counting grades — not averages:
- 🌟 **Full A** — all core subjects grade A **and marks complete** (`gredList.length >= jumSubjek`). A pupil with A A A and one subject unmarked is **not** Full A: the missing grade is unknown.
- 🟢 **Terbaik** — no D/E/F · 🟡 **Sederhana** — has D, no E/F · 🟠 **Lemah** — has E or F.
- Lemah/Sederhana do **not** require complete marks: one E already settles it. Check order is EF → D → allA+complete → terbaik.

**Ranking is darjah-wide** and stored per pupil, so filtering by kelas hides rows without renumbering (a teacher sees their pupil is #3 in the darjah, not #1 in the class). Ties on average share a rank (1,2,2,4).

**Exam selector** (`#hcm-pep`, `hcMuridIsiPep` / `hcMuridPepIdx`): lists that year's exam types per admin setup, with "Terkini (auto)" as the default preserving the original latest-exam-with-marks behaviour. Changing it reclassifies everything — group, weak subjects, average, ETR status, darjah rank — **without re-reading Firestore**: per-subject grades are computed for *every* exam during the initial load into `butirUjian[]`, and switching only changes which index `hcmPakaiUjian(m, idx)` applies. Pupils with no marks in the chosen exam get `kump = null` and drop out of the list rather than being miscounted as "lemah". Ranking logic lives in `hcmSusunRank` so the initial load and per-exam recompute share one code path.

**Surfaces:** 4 KPI cards (selected exam) → `hcMuridBanding` comparison table (each group × each exam + ETR target column + "Beza" coloured by *direction*: green when Full A/Terbaik rise or Sederhana/Lemah fall) → ranked pupil list with per-exam grade columns, ETR grade, ✅/❗ status, group, and weak subjects (D/E/F with marks). CSV + print PDF follow the active filter.

**Missing-mark handling:** `m.tiadaMarkah[]` records the *names* of unmarked core subjects, shown per row as "⚠ SAINS belum masuk" (abbreviated via `hcmSingkat`, full names in tooltip and CSV). `hcMuridAmaran` prints a per-subject coverage banner ("SAINS — 92 dari 207 murid ada markah"), worst first, red under 60%, and explains that Full A/Terbaik are provisional while Sederhana/Lemah are already reliable.

**Race guard:** `hcLukisMurid` is slow (marks for every core subject × exam, plus ETR docs per kelas). It takes a token (`hcMuridRun`) and bails at every `await` if a newer run started — without this an older run finishes last and overwrites fresh results ("appears then disappears"). It also waits up to 10s for `GLOBAL_DATA.students`. Kelas/Kumpulan dropdowns call `hcMuridRender()` (filter only), never a recompute.

**What is dynamic:** ETR, subjek diutamakan, grade ranges, exam types and class lists are all re-read on tab open — nothing is persisted except ETR. **Exception:** exam marks are cached (memory + IndexedDB), so newly entered marks need the 🔄 Segar Semula button or a page reload.

**Key gotcha:** `hcTarikTOV(senyap, forceFresh)` — when `senyap` (auto-load from doc / refresh), it uses `hcState.tovSource` (from the saved doc), NOT the DOM dropdowns (which are hidden for teachers). Only reads dropdowns when admin clicks the button manually.

All Headcount functions are prefixed `hc*` (user) / `bhc*` (admin bulk build). Reuses `cariMarkahMurid`, `getGredFromMarkah`, `getExamTypesForYear`, `ensureMarksLoaded`.

### 📋 Corak Gred (tab berasingan)

Seventh Headcount tab (`hcTukarTab('corak')` → `hcgInit`), functions prefixed `hcg*` but **DOM ids prefixed `hcp-`** (see gotcha below). **Independent of 🏆 Murid Terbaik** — its own dropdowns, own state (`hcgData`), own race guard (`hcgRun`); it shares only the generic helpers (`cariMarkahMurid`, `getGredFromMarkah`, `subjekUtamaUntuk`, `hcmSingkat`).

**DOM id gotcha (cost several debugging rounds — do not repeat):** the `hcg-` id prefix was already taken by the **Perbandingan Gred** tab (`hcg-chart`, `hcg-mod`, `hcg-subjek`, `hcg-table`, `hcg-kpi`, `hcg-darjah`, `hcg-kelas`, `hcg-tahun-kal`). Duplicate ids do not error — `getElementById` silently returns the **first** match in DOM order, which was the hidden Gred tab. Symptom: this tab's dropdowns appeared empty and inert while `hcgData` held correct values, and its KPI area showed the *Analisa* tab's warning. Fixed by moving every id in this section to `hcp-` (pola). **Before adding a tab, grep the intended id prefix across the file.**

**Exam is chosen from `examTypes.darjah`, which stores NUMBERS (`[4,5,6]`), not words.** Filtering with `e.darjah.includes('EMPAT')` matches nothing and empties the dropdown; convert with `_tahunToDarjah` first (the rest of the app already does). `hcgIsiPep` accepts both forms, falls back to exam names found in actual marks if `examTypes` is missing, and `hcgInit` auto-jumps to the first darjah that actually has exams (SATU usually has none) until the teacher picks one themselves (`hcgPilihanGuru`).

Groups pupils by their **grade combination** across the core subjects: `4A`, `3A1B`, `2A1B1C`. Count follows Admin › ⭐ Subjek Diutamakan for that darjah, so 7 core subjects yields `7A`, `6A1B` — nothing is hardcoded to 4. Label built by `hcgLabel` (tally → `NA` `NB` … in A–F order); rows sorted best-first by `hcgBanding` (compare count of A, then B, then C…) — **not** by pupil count, so the drop-off reads top to bottom.

- **Exam is selectable** (`#hcg-pep`, filtered to the darjah via `getExamTypesForYear`) — unlike Murid Terbaik which always uses the latest exam. Lets a teacher compare patterns between exams.
- **Incomplete marks are excluded from every pattern** and collected into a separate "⚠ Tidak lengkap" row (`hcgKira`): `3A1B` is not a valid claim while one grade is still unknown — same rule as Full A. `TIDAK SAH`/out-of-range is treated as missing, never bucketed as F.
- Accordion state in `hcgBuka` (survives re-render); "Buka semua"/"Tutup semua" buttons. 4 KPI cards, coverage warning (`hcgAmaran`), CSV (`hcgCSV`) and print PDF (`hcgPDF` — always prints every pattern in full regardless of which rows are expanded on screen). All follow the active kelas filter.

`hcTukarTab` was refactored to loop over a tab-name array — add a new tab in that one array, not in three parallel lists.

### 📈 Trend GPS (tab kelapan)

Eighth Headcount tab (`hcTukarTab('trend')` → `hctInit`), functions prefixed `hct*`, **DOM ids `hct-`** (`hcg-`/`hcp-` were already taken — grep the prefix before adding a tab). Answers two questions that previously needed several menus: *are we improving?* and *how much must ETR rise to hit our target?*

**Two halves.** Top: a planning table, one row per subject with **GPS sekarang** (real marks), **GPS dari ETR** (what GPS would be if every pupil hit their ETR), a teacher-editable **Sasaran GPS**, and two status columns. Bottom: a **line chart** across every exam of that year — thick line for overall GPS, dashed line for the target, one line per ticked subject.

**Two status columns, deliberately separate** — merging them hides one of the two stories:
- **Sedia?** = ETR vs target. Still changeable *now* by raising ETR.
- **Capai?** = real marks vs target. A result that already happened.

Real example: SAINS target 4.66, ETR gives 4.19 (planning short by 0.47) while actual marks are 3.66 (short by 1.00).

**Targets are set by teachers, not admin** — same as ETR. Stored at `settings/sasaranGPS` = `{darjah: {_darjah: n, NAMA_SUBJEK: n}}`, written with `merge:true` so other darjah are untouched. A subject with no value of its own **inherits `_darjah`**. Marks and `rekodHeadcount` are **read-only** here; the only write is this one settings doc.

#### KESELURUHAN counts only subjects common to every exam (do not regress)

Different exams test different subject sets — UPSA tested 13 subjects including BAHASA ARAB (GPS 5.24) and JAWI (4.85); MATRIKS PRISMA tested only the 4 core ones. Averaging everything made darjah EMPAT look like it **dropped** 4.37 → 4.30 while every individual subject **rose**. `asasKeseluruhan` therefore keeps only subjects with marks in *every* exam that has data, giving the true 3.50 → 4.30 (+0.80). A blue note under the table names the basis and how many subjects were excluded. Exams with no marks at all are skipped when computing that set — otherwise every subject fails the "in every exam" test and the basis silently falls back.

**Kad Perubahan always shows the full trend** (first → last exam with marks), never up to the selected exam — binding it to the dropdown made picking UPSA erase the +0.80.

**ETR is read with ONE query** (`where('tahun')` + `where('cal_year')`), not per kelas×subjek. The old per-doc loop was 7×13 = 91 serial reads ≈ 10s; the query is ~0.3s and returns only docs that exist. A per-doc fallback runs if the query throws (e.g. missing composite index).

Chart defaults: the 4 subjects with the **most mark coverage** are auto-ticked (picking the first 4 alphabetically gave part-marked subjects and broken lines), the y-axis **auto-zooms** to the data range (a fixed 1–6 scale flattened a real 4.30→4.37 move into a straight line), and every point is **labelled** by a small inline canvas plugin with overlap pushed downward.

### Wide tables on desktop (`.jadual-gulung`)

Shared wrapper class for horizontally scrollable tables. Its scroll affordances — edge-shadow hints, sticky first column — were originally inside `@media (max-width: 640px)`, so on **desktop** a wide table was silently cut off with no indication more columns existed (macOS hides overlay scrollbars until you drag). They now apply at every width, plus an always-visible styled scrollbar above 640px.

Because `min-width: max-content` forces every cell onto one line, long text columns alone can blow the width out (Murid Terbaik: Nama 518px + Subjek Lemah 468px + the exam title 238px → 1800px in a 1166px space). Mark such columns `lajur-teks` (260px), `lajur-teks-kecil` (200px) or `lajur-tajuk-ujian` (120px) to let them wrap. Verify a new wide table with `table.offsetWidth <= wrapper.clientWidth`.

### Prestasi muat data (diukur 7 Sep 2026)

Measured on live data, not guessed:

| Step | Time |
|---|---|
| HTML load | 0.3s |
| IndexedDB cache read (3.1 MB) | 0.06s |
| `students` collection (1,138 docs) | 1.3s |
| **`rekodMarkah` — whole collection (20,925 docs)** | **17.1s** ← what it used to do |
| `rekodMarkah` — one year only (8,122 docs) | **6.3s** ← what it does now |

**Fixed (9 Sep 2026) — verified live.** `bacaInitialData` no longer fetches the whole collection: it probes each year with `.limit(1)` **in parallel**, then pulls only the year that has data (8,122 docs, ~6.3s instead of 20,925 docs, ~17.1s). Other years load on demand via `ensureMarksLoaded(year)`. The parallel probe matters in January, when the current year is still empty — a serial loop paid a full round-trip per empty year.

**`timestamp` integrity audited on live data:** 20,925/20,925 docs valid, **0 missing, 0 malformed**, and `cal_year` agrees 100% (2025: 12,803 · 2026: 8,122). Nothing is dropped by the `timestamp` filter. Re-run that audit before switching the query field.

### IndexedDB cache can wedge — always leave a recovery path

A worse landing-page stall hid behind the cache: `ESIS_Cache` can reach a state where **both `open()` and `deleteDatabase()` hang forever** (measured: corrupt DB open = 4000ms timeout, fresh DB name = 6ms). The 5s timeout guard in `initIndexedDB` keeps the app from freezing permanently, but it was charged on **every single load** because nothing ever repaired the DB.

Two rules this produced — do not regress:
- **Always set `onversionchange`** on an open IndexedDB connection and close it. Without it, this page's own connection blocks any `deleteDatabase`, so the delete hangs and the wedge is permanent.
- **Recover by renaming, not just deleting.** `pulihIndexedDB()` writes a new DB name to `localStorage` (`esis_db_name`, read by the `CACHE_CONFIG.DB_NAME` getter) and abandons the broken DB, because the delete itself may hang. Deletion is still attempted in the background to reclaim space. Called from both the cache read and write paths.

Symptom to recognise: console shows `❌ Cache read error: IndexedDB timeout (5s)` on every load, and the page takes ~5s longer than the Firestore queries alone explain.

**General rule this uncovered:** never read Firestore docs one at a time in a loop. Per-doc reads cost ~113ms each, so 91 of them is ~10s while one filtered query returning the same data is ~0.3s — a 70× difference. See the Trend GPS ETR query above.

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
| **Kad jemputan** | 💌 Kad Jemputan | nama murid | 136mm, 4 sehelai A4 |
| **Slaid PPTX** | 🎟️ Giliran & Tiket | nombor giliran | 16:9 |

**SATU TIKET SEORANG MURID**, bukan satu per anugerah. Murid yang menang beberapa anugerah tetap naik pentas beberapa kali (`binaTurutan` tidak disentuh) tetapi memegang satu keping yang menyenaraikan semua anugerah dan semua nombor gilirannya. Sama untuk kad jemputan, dengan nota "anak anda dipanggil 2 kali — sila kekal di dewan".

**Nombor giliran duduk SEBARIS dengan anugerahnya** (jadual `.gil-jadual`, dua lajur `NAMA ANUGERAH | GILIRAN`). Susunan lama ialah dua lajur dengan lajur kanan 92px mengumpulkan semua nombor **bertindan** — murid yang menang tiga anugerah memegang nombor 1, 6 dan 18 dalam satu blok dan nama anugerah di lajur lain, jadi dia tidak tahu yang mana untuk yang mana. Itu soalan yang tiket ini wujud untuk menjawabnya. Jangan kembalikan lajur berasingan.

Tiket kini **satu lajur rata tengah**: sekolah → majlis → nama murid (serif, terbesar) → kelas → jadual anugerah. Nama sekolah dan majlis dibaca daripada `MAJLIS.sekolah` / `MAJLIS.nama` — tiada medan baharu untuk admin isi.

**4+ anugerah mendapat kelas `.padat`** yang mengecilkan taip. Sebab sama dengan `kjSemakMuat` di bawah: tinggi tiket TETAP dengan `overflow:visible`, jadi isi berlebihan tidak menatal — ia terkeluar senyap dan dipotong oleh pemotong kertas. Disahkan muat sehingga **5** anugerah; kalau sekolah ada murid yang melebihi itu, turunkan ambang atau tambah aras kedua.

**136mm ialah nilai yang diukur, bukan dipilih.** A4 = 297mm tolak margin 8mm atas+bawah = 281mm ruang; 2 baris × 136 = 272mm, lega 9mm. **Jangan naikkan ke 140mm**: 2 × 140 = 280mm meninggalkan 1mm, dan pembundaran pemandu pencetak menolak baris kedua ke halaman baharu — gejalanya **2 sehelai, bukan 4**. Nilai asal 74mm memberi 6 sehelai sedangkan UI menjanjikan 4.

**Kad jemputan: butiran ialah baris DINAMIK** (`MAJLIS.kadBaris`), bukan medan tetap — setiap sekolah mahu perkara berbeza (pakaian, masa tiba, nombor untuk dihubungi). Tarikh majlis disalin sebagai nilai permulaan **sekali sahaja**; selepas simpan ia berdiri sendiri supaya menukar tarikh majlis tidak mengubah kad secara senyap. Baris tanpa label dibuang semasa simpan.

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

**`margin-top:auto` berpindah ke `.kaki`** apabila blok `.anu` dibuang — tanpanya nota kaki melekat pada butiran dan separuh bawah kad kosong. `kjSemakMuat` masih dikekalkan kerana baris butiran dinamik: sepuluh baris pakaian/masa/telefon masih boleh melimpah 136mm. Diukur selepas perubahan: ruang 482px, isi tertinggi 42px, **0 kad sesak** daripada 105.

#### Pengurus peserta — murid yang naik pentas berulang

Tanda tidak-hadir menulis `giliran[].hadir` ke **kesemua** giliran murid itu sekali gus. Untuk murid berulang itu bermakna dua atau tiga anugerah hilang dengan satu tekanan, dan MC (`statusBaris`) serta pengurus hadiah (`status`) terus melihat kesannya.

- **Lencana MERAH `⚠ NAIK PENTAS N KALI`** + garis tepi (`.baris.ulang`). Lencana emas sedia ada sama rupa dengan "1 giliran" dan mata yang mengimbas 105 baris tidak menangkapnya.
- **Pengesahan sebelum menanda tidak hadir**, menyenaraikan setiap anugerah yang akan dilangkau. **Hanya untuk murid berulang** — satu giliran tiada dialog.
- **`gilSeterusnya(m)`** = nombor terkecil yang MC belum tanda (`mc !== true`). Pengurus peserta yang melihat "4 · 31" tidak tahu yang mana sudah lepas; tanpa ini dia perlu bertanya MC.
- KPI **"Naik pentas >1"** — angka yang diperlukan **sebelum** majlis bermula.

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

Auto-muat 90s kini **senyap**: ia menyemak dan menyalakan butang, **tidak melukis semula**. Jadual yang bertukar di bawah tangan petugas semasa dia mengira hadiah atau membaca nama ke mikrofon ialah tepat apa yang tidak boleh berlaku semasa majlis berjalan.

| Panel | Cap jari | Sebab |
|---|---|---|
| **Hadiah** (`capBaris`) | `hadir` **dan** `mc` | kedua-duanya mengubah kiraan "perlu dibawa" |
| **MC** (`capHadir`) | `hadir` **sahaja** | memasukkan `mc` akan menyalakan butang setiap kali MC menekan ✓ pada panelnya sendiri |

- Butang membawa **apa** yang berubah (`🔄 1 tidak hadir`), bukan sekadar "sila refresh".
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
- Panel: MC satu baris per nombor + "turut menerima", ✓ menanda utama **dan** pengikut (`tandaMC`). Peserta: murid hanya di baris utama, "naik pentas N kali" = `agBilNaik`. Hadiah: baris pengikut kekal, dipapar di bawah anugerah **utama** dengan "untuk: …". Tayang/PPTX: satu slaid utama, pengikut disenarai. Gaya ≠ asal: accordion petugas = blok **berturut-turut** (kunci `anId#n`), gaya A kekal `find`.
- **Tukar gaya tidak menukar nombor.** Pratonton dalam kad memberi amaran bila nombor semasa tidak padan dengan gaya disimpan → Jana Semula.

Oracle 20,000 kes (susunan + nombor + mod tambah + invarian 1…N tanpa jurang) — 0 beza; 5 mutasi ditangkap.

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

#### Nombor giliran mesti berturutan tanpa jurang

`beriNombor(true)` (🔁 Jana Semula) menomborkan 1…N mengikut `binaTurutan`; sub tanpa peserta dilangkau sendiri dan tidak memakan nombor.

Selepas kerja membetulkan sub darjah (26 Okt 2026), majlis ini tinggal **110 murid tetapi nombor berjalan sehingga 113** dengan jurang di 2, 5, 6 — nombor yatim milik entri pendua yang dibuang. Dijana semula ke **1–110, 0 jurang, 0 pendua**.

**Nombor disimpan dalam database, bukan dikira pada paparan.** Membiarkan satu panel mengira nombornya sendiri bermakna pengurus peserta nampak "5" sementara MC memanggil "7" untuk murid yang sama. Kalau tiket sudah dicetak, jana semula bermakna cetak semula.

#### Reset tanda petugas

`resetTanda(medan, label)` menerima **array** supaya "Reset kedua-dua" mengosongkan `hadir` dan `mc` dalam **satu** tulisan. Dua tulisan berasingan bermakna separuh reset kalau yang kedua gagal — dan admin yang sedang menguji tidak dapat membezakan "gagal" daripada "memang tiada tanda".

- **Dipecah pada `RESET_CHUNK` (400).** Versi lama memakai **satu batch**; Firestore menghadkan 500 operasi, jadi ia akan pecah senyap pada majlis >500 murid. Majlis ini 105 — ia belum pernah gagal, dan itulah sebabnya ia terlepas pandang.
- **Dialog membawa kiraan tanda sebenar.** "Reset semua tanda MC?" tanpa nombor tidak memberitahu admin sama ada dia memadam kerja satu majlis penuh atau tiada apa-apa.
- `lukisResetStatus()` memaparkan keadaan semasa (kuning bila ada tanda, hijau bila bersih).
- Nombor giliran dan senarai penerima **tidak disentuh** — boleh diulang berapa kali pun semasa menguji.

Disahkan 26 Okt 2026 pada majlis sebenar: taip salah → 5 tanda kekal; taip RESET → **0 tanda tinggal, 39 giliran kekal, 0 medan lain berubah**. Oracle 20,000 kes + 15 unit, termasuk invarian "reset `hadir` tidak menyentuh `mc`/`no`/`sub`/`hadiah`".

### Markah Ujian Khas (`public/markah-guru.html` + `markah-guru.js`)

Rekod & Laporan terbuka kepada **setiap** guru — sesiapa boleh pilih mana-mana darjah/kelas/subjek dan menulis atas markah orang lain. Untuk ujian khas (contoh MATRIKS SEBENAR darjah 4), sekolah mahu guru SAINS 4 INTEL mengisi SAINS 4 INTEL **sahaja**.

| Peranan | Nampak |
|---|---|
| **Guru** | satu subjek, kelas yang didaftarkannya, boleh tulis |
| **Pentadbir** | kata laluan admin, semua subjek × semua kelas, **baca sahaja** |

**Kunci slot = `subjek + kelas`.** Satu slot satu tuan. Pendaftaran kedua untuk slot yang sama **ditolak dengan nama tuannya dipaparkan** — bukan ditolak senyap, kerana guru perlu tahu siapa hendak dihubungi. Subjek lain pada kelas yang sama kekal bebas (BAHASA MELAYU BYTECH masih terbuka selepas SAINS BYTECH diambil).

**Doc id `guruMarkah` = nama DINORMALKAN** (`mgIdNama`): huruf kecil, ruang dimampat, gelaran dilucutkan berulang kali (`pn hjh siti` → `siti`). Keunikan nama dikuatkuasakan oleh **Firestore sendiri** (satu doc satu id), bukan oleh semakan yang boleh terlepas apabila dua guru mendaftar serentak. Guru menaip namanya setiap kali masuk, jadi padanan tepat akan menjadi aduan harian.

```
guruMarkah/{nama-dinormal}
  { nama, pw, subjek, kelas:[...], darjah, calYear, daftar, dibuka, akhir }
```

**Markah ditulis ke `rekodMarkah`** — koleksi dan format docId **yang sama** dengan seluruh ESIS (`${no_kp}_${subjek}_${tahun}_${peperiksaan}_${calYear}`), ditanda `sumber:'guru'` + `guru:<nama>`. Jadi Analisa, Headcount, GPS, slip dan Anugerah membacanya tanpa satu baris kod baharu dan tanpa penyegerakan. **Dua koleksi bermakna dua kebenaran.**

Peraturan simpan **mesti sama** dengan `simpanEditMarkah`: sel kosong **dilangkau** (tiada rekod ditulis), TH ditulis `{markah:null, gred:'TH', th:true}`, markah **0 diterima**.

**`examTypes.guruTerhad: true`** menanda peperiksaan ini. Kesannya dua: ia **dibuang sepenuhnya** dari dropdown Rekod & Laporan (walaupun sudah ada rekod — kalau ia kekal, mana-mana guru boleh menulis atas markah kelas orang lain dan seluruh tujuan kawalan ini gugur), dan ia muncul dalam menu Markah Ujian Khas. Kotak tandanya ada dalam **modal Edit** jenis peperiksaan, bukan di baris senarai.

**`agMuatMurid` kini membawa `agama`** — rekod markah ESIS mengandungi medan itu dan tapisan agama dalam Analisa membacanya; rekod tanpanya terkeluar secara senyap.

#### Analisa gred

`mgKiraGred(rekod)` memulangkan `{A..F, th, bil, gps, purata, lulus, pLulus}`. Dipakai oleh **kedua-dua** panel supaya dua skrin tidak boleh memberi nombor berbeza: kad di bawah jadual guru, dan lajur A–F + GPS + Lulus dalam senarai pentadbir.

**TH keluar dari pengangka DAN penyebut** — kelas 30 murid dengan 2 TH dikira atas 28. Gred `Gagal`/`TIDAK SAH` = 0 mata tetapi **kekal** dalam penyebut. Kad guru dikira daripada apa yang **tersimpan** (`MG.markah`), bukan daripada kotak di skrin — supaya nombor itu bermaksud "keputusan yang sudah disimpan", bukan draf separuh taip.

PDF melalui **dialog cetak pelayar** (`body.cetak-guru` + `@media print`), bukan jsPDF — tiada pustaka dimuat, dan guru menyimpan sebagai PDF dari dialog yang sama.

Disahkan 25 Okt 2026 pada data sebenar: 28 murid BYTECH, 7 rekod ditulis daripada 28 baris (21 sel kosong dilangkau), markah 0 tersimpan sebagai `0`, TH sebagai `gred:'TH'`. Oracle 40,000 kes `mgKiraGred` + 8 mutasi ditangkap; 27 kes normalisasi nama.

#### Analisa Mengikut Subjek (panel pentadbir)

Jadual status ialah satu baris per **slot** (subjek × kelas): ia menjawab *"siapa belum isi?"*. Kad kedua menjawab soalan yang berbeza — *"subjek mana lemah?"* — dan itu tidak boleh dibaca daripada tiga puluh baris berselerak. Susun atur disalin daripada **Analisa Keseluruhan** dalam `index.html` (Bil + % bagi A–F, Jumlah, GPS, footer TOTAL GPS) supaya dua skrin itu dibaca dengan cara yang sama.

**Rekod mentah dihimpunkan semula, BUKAN statistik per-kelas dicampur.** GPS purata-bagi-purata memberi nombor yang salah apabila saiz kelas berbeza — kelas 12 murid menyumbang berat yang sama dengan kelas 34. Diukur oleh oracle: purata-bagi-purata memberi **3.31** di mana jawapan betul ialah **3.63**. `mgKiraGred` kekal satu-satunya enjin kiraan (sama dengan jadual status dan panel guru).

`TOTAL GPS` = `Σ skor semua subjek ÷ Σ murid dinilai`, bukan purata lajur GPS — sebab yang sama.

**Mengikut tapisan Darjah + Subjek yang sedia ada**, peraturan sama dengan KPI: nombor yang tidak berubah ketika pentadbir menapis mengelirukan.

**Subjek yang kelasnya belum diisi ditanda dua kali** — "2 dari 6 kelas belum diisi" di bawah nama subjek itu, dan nota ringkas di bawah jadual. Tanpa ini GPS 5.20 dibaca sebagai keputusan subjek sedangkan ia keputusan satu kelas daripada enam.

Fungsi: `ptSubjekStat()` (himpun) → `lukisAnalisaSubjek()` (lukis) → `ptSubjekCSV()`. Dipanggil dari `lukisPentadbir()`, jadi ia mengikut setiap tapisan tanpa pendawaian tambahan.

Disahkan 27 Okt 2026: oracle 60,000 kes berbanding pelaksana bebas — 0 beza; 4 mutasi ditangkap (purata-bagi-purata, lupa tapis darjah, TH masuk penyebut, lupa tapis subjek).

### Terbit Keputusan (`examTypes.diterbit`)

Admin menutup satu peperiksaan daripada **semua** paparan guru tanpa menghalang guru mengisi markah. Toggle **biru** di sebelah toggle Aktif (**hijau**) dalam Urus Jenis Peperiksaan.

| Suis | Kawal |
|---|---|
| `aktif` | siapa boleh **MENULIS** markah |
| `diterbit` | siapa boleh **MELIHAT** keputusan |

**Lalai `true`.** Dokumen lama tiada medan ini dan mesti terus berkelakuan seperti sebelum ciri ini wujud — sama peraturan dengan `aktif` dan `subjek`. **Jangan tukar maknanya kepada "belum terbit"**: 18,000 markah akan hilang dari paparan guru pada deploy berikutnya.

**Satu pintu, bukan dua puluh.** Tapisan hidup dalam `_tapisDiterbit()`, dipanggil oleh **`getMarksByYear()`** (30 pemanggil) dan oleh pengisi dropdown yang membaca `allMarks` terus. `getExamTypesForYear()` menapis pada setiap pemulangan (bukan semasa menulis cache) supaya admin yang log masuk pertengahan sesi terus nampak semua tanpa menunggu TTL.

**Admin (`isAuthenticated`) melihat semua** — dia perlu menyemak Analisa sebelum mengumumkan. Notis kelabu di atas senarai menamakan apa yang belum terbit, kerana tanpanya admin melihat nombor yang guru tidak nampak dan tidak tahu mengapa mereka melaporkan "data hilang".

**Mematikan perlu sahkan**, dengan **kiraan markah sebenar** dalam dialog ("828 markah akan hilang") — itu soalan pertama admin sebelum menekan. Menghidupkan terus, tiada soalan.

**`DATA_VERSION` TIDAK dinaikkan** — status terbit dibaca dari `examTypes`, bukan disimpan dalam cache markah, jadi menogol suis berkuat kuasa pada muat semula berikutnya tanpa menunggu cache 24 jam.

**Modul Anugerah TIDAK ditapis** (`agMuatMarkah`). Ia panel **admin majlis**: justru kerjanya memilih calon daripada keputusan yang belum diumumkan, supaya tiket dan giliran siap sebelum hari majlis. Menapis di sana akan mengosongkan senarai calon setiap kali admin menutup keputusan. `guru.html` hanya menulis penerima, tidak membaca markah.

Disahkan 25 Okt 2026 pada data live: guru 18,024 → 17,196 markah (tepat 828 MATRIKS PRISMA hilang, UASA kekal 5,922), admin 18,024 penuh, hidupkan semula → 828 kembali. Oracle 30,000 kes + 4 mutasi.

#### Status Pengisian — peperiksaan 🔒 muncul walaupun 0 markah

`_populateStatusPerikDropdown` menggabungkan **dua sumber**: peperiksaan yang ada markah (asal) **dan** peperiksaan `guruTerhad` dari `examTypes` walaupun kosong.

Sebabnya ayam-dan-telur: dropdown yang dibina daripada markah sahaja bermakna peperiksaan yang belum diisi **langsung** tidak muncul — sedangkan "tiada seorang guru pun sudah mula" ialah tepat keadaan yang tab ini wujud untuk menangkapnya. Option berlabel `🔒` dan `— belum ada markah`.

Butang **Segar Semula kekal kelihatan** walaupun belum memilih peperiksaan. Markah dicache per-tahun, jadi peperiksaan yang baru diisi guru lain tidak muncul sehingga cache ditarik semula — dan butang yang tersembunyi ketika itu bermakna tiada jalan membetulkannya tanpa memuat semula halaman.

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

### Helper markah ESIS → SPPB (`public/helper-sppb.html` + `helper-sppb/`)

Teachers had to retype marks that already exist in ESIS into the KPM **SPPB** form (`moeissppb.moe.gov.my`, reached via idMe → Pengurusan Pentaksiran). SPPB has **no CSV import**.

| Half | Where | What |
|---|---|---|
| **Copy** | Button `#btn-salin-sppb` in `#edit-actions` → `salinUntukSPPB()` | Reads the on-screen table, writes JSON to the clipboard |
| **Paste** | Bookmarklet `helper-sppb/tampal-sppb.js` → `bookmarklet.txt`, named **ESIS Helper** | Runs on SPPB, **POSTs marks directly to the server** |

**The bookmarklet does NOT fill the Skor(%) boxes. It POSTs to SPPB's own endpoint.** This is the single most important fact about this file — the obvious approach does not work, and six separate attempts at it failed.

#### Why filling the boxes cannot work (audited 18 Oct 2026, live)

SPPB is **Vue 3 + Inertia.js + Laravel**. Its save handler (`Show.vue` `simpan()`) filters rows before sending:

```js
if (pbd_mp.items[i].simpan == 1) { item_form.push({...}) }
```

Only rows flagged `simpan == 1` are sent. That flag is set by `inputMarkah()`, which is **`_.debounce(..., 1000)`** — so when a script fills 32 boxes quickly, the debounce cancels the first 31 and only the last row survives. Every mechanism tried gave the same "only the last row" pattern: `dispatchEvent`, full keydown simulation, `execCommand` (browser-generated events), calling the Vue handler directly, `setTimeout` pacing, and separate task runs. Only a real human keyboard worked.

Symptom when it fails: marks and grades appear on screen, Status stays **"Belum Ditaksir"**, and pressing Simpan posts `items: []` — the page re-renders **blank**.

#### What the helper sends

Format copied exactly from `Show.vue` `simpan()`:

```js
{ id, aksi, status_id, ltt_skor_pbd_mp_status_id,
  tindakan: {e:{}, errorsCount:0}, max_skor,
  items: [{ id, ltt_pbd_mp_id, markah, ulasan_gmp, intervensi_gmp,
            ltt_pbd_usaha_id, status_taksir: 2, kemahiran, kategori }] }
```

- **Data source is `props.skors.data.items`**, not `pbd_mp.tbt_skor_pbd`. Only the former carries `no_id` (the pupil's KP) and matches the shape the form posts back.
- **`status_taksir: 2`** is what makes SPPB keep the row. `1` = Belum Ditaksir and is silently dropped.
- **`ltt_pbd_mp_id` is the grade-range id**, derived from the mark via `props.skor` (A 82–100 = 2779, B 66–81 = 4087, C 50–65 = 5390, D 35–49 = 6817, E 20–34 = 7992, F 0–19 = 9294). Those ids are read from the page, never hardcoded.
- **`status_id` is required.** An early version omitted it and the request was ignored.

#### Two traps that produced false "success"

1. **Inertia headers.** Without `X-Inertia`, Laravel treats the POST as a browser visit, **discards the data, and returns the full HTML page with status 200**. `res.ok` is therefore `true` and the helper reported "BERJAYA" while nothing saved. The helper now sends `X-Inertia`, `X-Inertia-Version`, `X-XSRF-TOKEN` and **rejects any reply that is HTML without an `x-inertia` header**. Never trust `res.ok` alone here.
2. **`localStorage` shadows the server.** `Show.vue` `getStorage()` prefers its cached copy: `if (data) { table.items = storage }`. So after a successful save the screen still shows the old empty table, and marks only appear after the teacher presses Simpan (which clears the cache). The helper clears `localStorage` **before and after** the POST and then **reloads the page itself** — clearing alone is not enough because the live Vue instance rewrites it.

**Safety rules — do not relax:**
- Match key is **`no_kp`**, never name or row order.
- One unmatched `no_kp`, or a differing pupil count → **stop, send nothing**.
- **TH pupils are skipped entirely** — writing 0 for an absent pupil corrupts an official record.
- Marks outside `0..max_skor` → stop.
- Never touches **Hantar** (submission to PPD). That stays the teacher's decision.

**No "test mode".** An earlier build asked "OK = 3 pupils / Batal = all", and a teacher pressed OK (the natural answer to "continue"), got 3 rows, and reasonably concluded the helper was broken. It now always sends every eligible pupil.

**Chrome only** (`adalahChromeTulen()` guards `salinUntukSPPB`).

**Known gap: the helper matches the pupil, not the subject.** The confirm dialog prints both sides — `Dari ESIS: LIMA HIGEN — SAINS` against `Ke SPPB: — SAINS` (read from `pbd_mp.ltt_mata_pelajaran.keterangan`) — for the teacher to compare, but it cannot refuse on its own.

**Rebuilding the bookmarklet** after editing `tampal-sppb.js`: strip comments, URL-encode, prefix `javascript:`, write to `bookmarklet.txt`, then re-embed in `public/helper-sppb.html` in **one** place — the drag anchor's `href` (HTML-escaped). Verify it decodes to parseable JS before deploying. (It used to be embedded twice; the second copy was a `KOD_HELPER` JS string feeding the copy-paste install, removed 22 Okt 2026 — see below.)

#### Satu cara pasang sahaja: seret (22 Okt 2026)

Halaman itu dulu menawarkan **dua** cara pasang dalam tab: "Salin & tampal" (butang salin → tampal ke kotak URL penanda) dan "Seret butang". Cara tampal dibuang; tinggal seret.

Dua nama untuk satu benda ialah sebabnya ia dibuang: kad menu bertajuk "Markah ke SPPB", halaman bertajuk cara pasang, dan butang di bar penanda bernama "ESIS Helper" — guru yang mencari semula apa yang dia pasang tidak jumpa nama itu di mana-mana menu. Kad menu kini **ESIS Helper**, sama dengan nama bookmarklet.

Yang dibuang bersama: pemboleh ubah `KOD_HELPER`, `tukar()`, `salinKod()`, dan CSS `.pilih` / `.btn-salin` / `.borang`. Blok `<script>` menjadi kosong dan dibuang terus — **halaman ini kini tiada JS langsung**, jadi jangan cari fungsi di situ bila menyahpepijat.

**Nota lapuk yang masih tinggal:** langkah 3 halaman itu masih terangkan tawaran "uji 3 murid dahulu" yang sudah lama dibuang dari bookmarklet (lihat "No test mode" di atas). Panduan itu menerangkan butang yang tidak wujud.

**`helper-sppb.html` is in the `no-cache` list in `firebase.json`** — it carries the bookmarklet source inline, so with the default `max-age=3600` a teacher installing after a fix copies the **old** code for up to an hour, with a confusing symptom: the helper runs but fails with a message that should no longer exist.

### Firebase Hosting cache

`firebase.json` sets `Cache-Control: no-cache, must-revalidate` for `index.html`. Firebase's default is `max-age=3600`, and since this app is a single HTML file that meant **every deploy took up to an hour to reach users** — fixes looked like they had not worked when they were already live. If a deployed change appears to have no effect, verify with `curl -sI` before assuming the code is wrong.

### Data Normalization

`normalizeAgama` / `normalizeJantina` run on every student read (`bacaInitialData`), not on CSV import — the importer stores raw values. They canonicalise spelling variants only:

- **Agama**: `ISLAM` and `TIDAK` are canonical; **any other religion is preserved as-is** (`HINDU`, `KRISTIAN`, …). Empty stays empty.
- **Jantina**: `LELAKI`/`L` → `L`, `PEREMPUAN`/`P` → `P`. Unknown values preserved, empty stays empty.

**Fixed 9 Sep 2026 — do not regress.** Both functions used to return a default for unrecognised input (`'ISLAM'` and `'L'`), so the school's 2 HINDU + 1 KRISTIAN pupils were displayed as Islam everywhere. Two rules came out of it:

- **Never default an unknown value to the majority case.** Preserve it, or return empty. A silent default is indistinguishable from real data once it is displayed.
- **A `<select>` must contain an `<option>` for the value it is showing.** The Guru Kelas agama dropdown had only ISLAM/TIDAK, so for a HINDU pupil the browser auto-selected the *first* option — and `simpanEditMurid` then wrote `ISLAM` to Firestore when a teacher edited *any* field on that row (e.g. fixing a name). The dropdowns now emit an extra `<option>` for any out-of-list value. **Grep for other 2-option selects bound to free-form data before adding one.**

Order matters in `normalizeAgama`: `'BUKAN ISLAM'` contains `'ISLAM'`, so the negation is checked first.

All agama filters use `isIslam = (agama === 'ISLAM')` and `!isIslam` for "Tidak" (5 sites), so preserved religions fall into "bukan Islam" correctly with no other change.

### Guru Kelas — carian murid & Markah Kelas

**Everything in this panel is open to every teacher.** No password, no `markahEnabled` gate — deliberately. Only Admin Panel requires `ADMIN_PASSWORD`. Do not add auth checks to `tambahMuridBaru` / `simpanEditMurid` / `padamMuridRow`.

**Carian murid** (`cariMuridGlobal`, tab Lihat/Edit) — free-text box matching **name OR no_kp across every darjah and kelas**, unlike `cariMuridUntukEdit()` which requires darjah+kelas first. Teachers usually know the name but not the current class. KP matching strips non-digits, so `060405-07-0888` and `060405070888` both hit. Needs ≥2 characters; results are editable in place and show Tahun/Kelas columns so the teacher sees where each pupil sits.

`segarkanPaparanMurid()` is the shared post-write refresh: if a search is active it re-runs the search, otherwise it falls back to the class view. All four write paths call it — without this, saving an edit from a search result jumps back to the darjah/kelas table and the teacher loses the pupil they were working on.

**Markah Kelas** (`hcTukarTab`-style tab, functions `gkm*`, DOM ids `gkm-`) — one row per pupil, one column per subject, cell = mark + grade. Filters: calendar year → exam type → darjah → kelas.

**Deliberately has no ranking, total, average or percentage columns.** Class teachers want to read raw marks against their own class list; judging position is what Murid Terbaik and Analisa are for. Pupils are sorted by name only and the order is not user-sortable, so the list reads the same every time. Do not add those columns.

Subject columns are the subjects that actually have marks, ordered by `GLOBAL_DATA.allSubjects` so the layout stays identical between classes. Missing mark renders `—`; **TH renders `TH` in amber, never 0** (same invariant as the TH section above). Calls `ensureMarksLoaded(year)` first — without it, picking a non-current year returns an empty list.

### `GLOBAL_DATA.allMarks` holds ONE year — never read it for a year-filtered view

**`GLOBAL_DATA.allMarks` is not "all marks".** `bacaInitialData` probes the last 6 years and pulls only the **most recent year that has data** (`tahunAdaData.slice(0, 1)`), per the perf fix above. Every other year reaches `marksCache` via `ensureMarksLoaded(year)`, and **newly saved marks land in `marksCache`, not in `allMarks`**.

So any panel with its own year dropdown must read `await ensureMarksLoaded(year)` then `getMarksByYear(year)`. Reading `GLOBAL_DATA.allMarks` and filtering it by year yields **zero records** for every year except the one loaded at startup — and the symptom is not an error, it is a screen that looks like the teacher never entered the marks.

**Fixed 22 Okt 2026 in `loadStatusPengisian` (Guru Kelas › Status Pengisian).** Three reads were on `allMarks`: the subject-column list, the `markahCount` loop, and the darjah fallback. Measured on live data for year 2025: **0 records found before, 7,015 after** (235 cells filled) — the whole table had been solid red ✗ while the marks existed. The per-record year filter inside the counting loop became redundant once the source was year-scoped, and was removed.

**A year-filtered panel also needs its own refresh button.** `ensureMarksLoaded` **returns early when the year is already in `marksCache`**, so a plain re-render shows the same stale counts and the button looks broken. `segarkanStatusPengisian()` does `delete marksCache[year]` **first**, then re-populates the exam dropdown and re-renders. Status Pengisian previously had no refresh control at all, so marks entered by another teacher required a full page reload to appear.

Remaining `allMarks` readers are existence checks (`.some(...)` for "does this exam have any records") and dropdown seeding, which are year-agnostic — those are fine. **Grep `GLOBAL_DATA.allMarks` before adding any year-aware view.**

**`getMarksByYear` kini juga menapis `examTypes.diterbit`** (lihat Terbit Keputusan). Pembaca `allMarks` terus yang mengisi dropdown mesti melalui `_tapisDiterbit()` juga — jika tidak, nama peperiksaan yang ditutup kekal dalam senarai dan memilihnya memberi jadual kosong tanpa sebab yang dinyatakan.

### Cache invalidation after writing students (do not regress)

`bacaInitialData()` **without** `forceRefresh` reads the IndexedDB cache. So any write to `students` must be followed by `clearAllCache()` + `bacaInitialData(true)`, or the change is invisible to the user who just made it until the cache expires (24h) or they hit 🔄 Segar Semula.

All three paths now do this: `tambahMuridBaru`, `simpanEditMurid`, `padamMuridRow`. Tambah was the straggler — it called bare `bacaInitialData()`, so a newly added pupil did not appear.

**What this does NOT fix:** the cache lives in each teacher's own browser. Another teacher still sees the stale roster until their cache expires or they refresh manually. Closing that properly needs Firestore `onSnapshot` listeners, which is a change to how all data loads — not a patch.

### Deletion Safety

Delete confirmations require typing `"PADAM"` to confirm. This includes **padamMuridRow** (Guru Kelas) as of 18 Oct 2026 — it previously used a plain `confirm()`, which a stray Enter could accept, even though deleting a pupil is heavier than deleting marks: the master record goes, along with the link to their marks. Deleted Firestore documents are replaced with placeholder documents to preserve collection structure.

### Libraries (all loaded via CDN)

- **Tailwind CSS** — styling
- **Chart.js** — data visualization
- **PapaParse** — CSV parsing
- **jsPDF + jsPDF AutoTable** — PDF reports
- **html2pdf.js** — exam slip PDFs
- **JSZip** — batch file downloads

jsPDF, html2pdf, and JSZip are lazy-loaded on demand via `loadScript()` / `ensurePdfLibs()` / `ensureJSZip()` to avoid blocking initial page load.

### Exam Slip PDFs

Slip layout (black/white, no color): Jata Negara (left) + school logo **centred above the school name** with double rule, BIL/SUBJEK/MARKAH/GRED table with a JUMLAH MARKAH footer row (sums only ticked subjects, skips '-'), bold black text, class/year ranking (optional), print date. Images are fetched once per batch via `bacaSlipCtx()`, resized and re-encoded as JPEG on white background (`_imgToDataURL`) — this is ~17x smaller than embedding the original PNGs and is what makes bulk ZIP generation fast. `downloadSlipDarjah()` generates every student in a darjah, grouped into one folder per kelas inside the ZIP.

#### Susun atur slip DIBEKUKAN (27 Okt 2026) — jangan ubah tanpa diminta

Pengguna telah meluluskan susun atur ini dan memintanya **kekal sehingga dia memberitahu sebaliknya**. Jangan laraskan kedudukan, saiz font, jarak atau susunan elemen slip walaupun ia kelihatan boleh diperbaiki.

Bentuk yang diluluskan, dari atas:

```
        [ logo sekolah — TENGAH ]        (jata di KIRI bila ada)
          NAMA SEKOLAH  — bold, huruf besar, tengah
            alamat       — bila ada
  ═══════════════════════════════════════  garis berkembar
     SLIP KEPUTUSAN PEPERIKSAAN   — bold, tengah
        NAMA JENIS PEPERIKSAAN    — bold, tengah, baris sendiri
  NAMA   : <nama murid>    — label DAN nilai bold, huruf besar
  NO. KP : <no kp>
  KELAS  : <darjah + kelas>
  [ jadual BIL / SUBJEK / MARKAH / GRED ]
  [ kedudukan — pilihan ]
  [ tandatangan — KIRI ]
```

**Logo di TENGAH, bukan kanan.** Dahulu nama sekolah "tengah" pada x=105 sedangkan logo di kanan menolaknya secara visual — nama nampak terpesong ke kiri. Jata Negara kekal di kiri dan sebaris dengan logo.

**Jata adalah pilihan dan kini KOSONG.** `settings/slipTemplate` **tidak wujud** dalam Firestore projek ini, jadi `jataUrl` kosong, `if (jataData)` tidak berjalan, dan logo tengah berdiri sendiri. Bila admin memuat naiknya melalui Admin → Setting, ia terus muncul di kiri tanpa perubahan kod. Ruang nama sekolah mengecil 170mm → 118mm bila jata hadir, supaya nama tidak bertindih dengan lambang.

**Nama jenis peperiksaan ialah baris sendiri.** Sebelum ini slip tidak menyebut langsung peperiksaan mana, jadi helaian UASA dan PENTAKSIRAN kelihatan serupa sebaik keluar dari pencetak.

**Isu sedia ada yang BELUM dibetulkan:** `slipTemplate.namaSekolah` kosong, jadi slip mencetak nilai lalai `SEKOLAH KEBANGSAAN` dan bukan `SK SULTAN ISMAIL`. Nama sebenar ada di `settings/systemSettings.tajuk` (tempat logo diambil juga). Jatuh-balik ke medan itu telah dicadangkan tetapi **belum diluluskan** — jangan laksana tanpa diminta.

#### `_slipTeksMuat` — auto-kecilkan font supaya teks muat

`pdf.text()` jsPDF **tidak memotong dan tidak membaluti**: teks yang melebihi ruangnya terus mencetak melepasi tepi kertas dan hilang, tanpa amaran dan tanpa ralat. Guru tidak perasan sampai ibu bapa bertanya kenapa nama anaknya terpotong.

```js
_slipTeksMuat(pdf, teks, lebarMaks, saizAsal, saizMin = 8)
```

Turun **0.25pt** setiap langkah sehingga muat, berhenti pada `saizMin`; pulangkan saiz yang dipakai. `setFont()` mesti sudah dipanggil sebelum ini — `getTextWidth()` ikut font **dan** saiz semasa, dan bold memberi lebar berbeza daripada normal.

**Kecilkan, JANGAN baluti dua baris.** Baris kedua menolak segala yang di bawahnya turun, dan jadual 12–13 subjek boleh melimpah ke muka surat kedua. Satu baris kekal satu baris, jadi layout tidak beranjak.

Dipakai pada: nama murid (ruang **148mm** — nilai bermula x=42, margin kanan 190), nama sekolah dan alamat (170mm, atau 118mm bila ada jata), tajuk slip dan nama peperiksaan (170mm).

**Mengapa ia perlu walaupun 0 nama melimpah hari ini:** diukur pada kesemua **1,134 nama murid** sekolah ini — terpanjang `TENGKU MUHAMMAD AMSYAR HAZIQ BIN TENGKU MOHAMED SALAHUDDIN` = **145.7mm dalam ruang 148mm**. Baki **2.3mm**. Itu nasib, bukan keselamatan; satu murid baharu dengan nama dua aksara lebih panjang akan terkeluar. Tujuh murid sudah melepasi 130mm.

Disahkan 27 Okt 2026: oracle 30,000 kes berbanding pelaksana bebas — 0 beza, tiga invarian lulus (hasil mesti muat atau sudah di minimum; tidak pernah bawah 8pt; tidak pernah melebihi saiz asal); 4 mutasi ditangkap (lupa `setFontSize` dalam gelung, langkah 1pt, lupa had minimum, pulang `saizAsal`). Diuji live: nama 76 aksara (184.3mm) turun ke **8.75pt** dan muat dalam 146.6mm; slip sebenar murid 58-aksara dengan 12 subjek muat satu muka surat.
