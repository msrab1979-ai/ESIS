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
| `examTypes` | Exam type classifications (fields: `nama`, `tahunKalendar`, `darjah[]`, `subjek[]`, `aktif`, `order`) |
| `settings` | System settings (markahEnabled flag, school name, logo URL) |

### UI Panels (main navigation sections)

1. **Rekod & Laporan** — Enter exam marks **and** edit/print reports (one combined panel; see below)
2. **Analisa Keseluruhan** — Grade analysis across all subjects
3. **Analisa Subjek** — Grade trends for a single subject
4. **Murid Terbaik** — Student rankings
5. **Guru Kelas** — Manage student roster
6. **Headcount** — Target tracking (TOV/OTI/ETR/AR)
7. **Admin Panel** (password-protected) — System configuration

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
- **Surfaces:** (a) **Analisa Keseluruhan** — big green **GPS Keseluruhan** summary card above the chart (`#analisa-gps-kad`, filled in `cariAnalisa`), plus a **GPS** column + **TOTAL GPS** footer row in the table (`renderAnalisaDataTable`), and GPS in CSV (`exportAnalisaCSV`) and PDF (`cetakAnalisaPDF`). (b) **Analisa Subjek** — GPS column in table (`renderAnalisaSubjekDataTable`, far right — scroll) + CSV. (c) **Analisa Kelas** — GPS column per kelas + GPS in JUMLAH footer (`renderAnalisaKelas`); the print view (`cetakAnalisaKelas`) reuses the table HTML so GPS carries over automatically. **Analisa Subjek PDF is NOT modified** (its multi-subject-per-year layout is separate from `analisaSubjekReportData`).

### Exam-type dedup gotcha (dropdown consistency)

`loadExamTypes` (used by Urus Peperiksaan / Rekod) deletes duplicate same-name docs in the same `tahunKalendar` (via in-fn dedup + `deduplicateExamTypes`). `getExamTypesForYear` (used by **Analisa Mengikut Kelas** dropdown, Status Pengisian) previously did **not** dedup, so the same-name dupes could show there but not in Urus Peperiksaan. Fixed: `getExamTypesForYear` now dedups by uppercased `nama` in-memory with `.filter()` (**read-only — never deletes Firestore docs**). Note: different-name entries (e.g. `UPSA` vs `UJIAN PERTENGAHAN TAHUN (UPSA)` in the same year) are NOT dupes — they legitimately both appear; managing those is the teacher's job in Urus Peperiksaan.

### Exam "Aktif" Toggle (Urus Jenis Peperiksaan)

Each exam type in `examTypes` has an `aktif` boolean, toggled in Admin. `aktif: false` puts the exam into **view-only mode** in Rekod & Laporan: teachers can view marks, print PDF, and export CSV, but cannot add/edit/delete marks (Simpan/Padam buttons hidden, no input fields, "Mod Baca Sahaja" banner shown). `isEditExamReadOnly()` also guards `simpanEditMarkah()`/`deleteMarkahByFilter()` server-side against bypass. This is separate from the global `settings.markahEnabled` flag, which blocks entry to the whole Rekod & Laporan panel.

### Rekod & Laporan panel — ONE combined form (IMPORTANT)

"Rekod Markah" (enter) and "Edit & Cetak" (edit/print) are **one panel** (`#markah-panel`, `showPanel('rekod-laporan')`) driven by the `edit-*` dropdowns: `edit-year` → `edit-peperiksaan` → `edit-tahun` (darjah) → `edit-kelas` → `edit-subjek`, handled by `onEdit*Change()`. The old `pilih-peperiksaan`/`pilih-tahun` selects are **hidden/legacy** (kept only so old JS ID refs don't break). **When debugging "exam type not showing in Rekod", inspect `onEdit*Change`, not `populateAllExamDropdowns`.**

Each dropdown level is populated from **two sources merged**: (a) values that already have marks (`getMarksByYear`) — for editing existing records incl. inactive exams in read-only mode; and (b) for **active** exam types, the school structure so teachers can **start entering marks for a brand-new exam that has zero marks yet** — jenis from `examTypes` aktif (`onEditYearChange`), darjah from `examType.darjah` (`onEditPeperiksaanChange`), kelas from `GLOBAL_DATA.allClasses[tahun]` (`onEditTahunChange`). `cariMarkahEdit()` then builds an empty per-student template to fill (~line 7956). Without (b), a new active exam is invisible (chicken-and-egg: no marks → not shown → can't add marks).

### Subjek Terlibat (subjects involved per exam type)

`examTypes.subjek` = array of subject `nama_penuh` involved in that exam. **Empty `[]` / missing = ALL subjects** (default; legacy docs are safe). Admin sets it via a dynamically-generated checklist (from `GLOBAL_DATA.allSubjects`, not static HTML) in the Add form (`new-exam-subjek`) and Edit modal (`edit-exam-subjek`) — all checked by default; admin unticks those not involved. Helpers: `renderSubjekChecklist(prefix, selectedNames)`, `setSubjekChecks(prefix, val)`, `bacaSubjekTerlibat(prefix)` (returns `[]` when all/none ticked, else the ticked names). Saved by `tambahJenisPeperiksaan`/`saveEditJenisPeperiksaan`.

Filtering applies **only at mark entry**: `onEditKelasChange` restricts the `edit-subjek` dropdown to `examType.subjek` (var `subjekTerlibat`). Slip & Analisa are **not** filtered (they follow actual marks). Subjects that already have records are **always shown** even if not in the list (so existing data is never hidden). Admin list badge shows "N subjek" / "Semua subjek".

### Caching

IndexedDB is used to cache Firestore data client-side. A "force refresh" button in the UI invalidates this cache. Cache keys follow the pattern `year_subject_marks`.

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
- **Guru (user) panel** — main-menu card 🎯 Headcount (`#headcount-panel`), gated like Rekod Markah (`markahEnabled`/`isAuthenticated`). Three internal tabs via `hcTukarTab`: **Ubah Sasaran (ETR)** / **Papan Jejak** / **📊 Analisa**. For non-admins, the TOV-source + anak-tangga blocks are hidden (`hcAturPaparan()`), a locked "tetapan admin" banner shows instead, and the TOV column is read-only (only ETR editable). Papan Jejak headers show the **real exam name** from `petaOTI` (not "Ujian N"). Per-row + per-card **individual PDF print** (`hcCetakIndividu`).
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

### 🏆 Murid Terbaik tab + ⭐ Subjek Diutamakan (admin)

Classifies pupils **across core subjects** with per-exam vs ETR comparison. Sixth Headcount tab (`hcTukarTab('murid')` → `hcInitMurid`); functions prefixed `hcm*` / `hcMurid*`.

**Admin › ⭐ Subjek Diutamakan** (`toggleAdminTab('subjek-utama')` → `initSubjekUtama`): per-darjah core-subject checklist, reusing `renderSubjekChecklist`/`bacaSubjekTerlibat`. Stored at `settings/subjekUtama` = `{darjah: {EMPAT: [nama_penuh...]}}`. **Empty `[]` / missing = ALL subjects** (legacy-safe). Read via `subjekUtamaUntuk(darjah)`; `hcInitMurid` calls `bacaSubjekUtama(true)` on every tab open so admin changes apply without a page reload.

**Classification** (`hcmKumpulan(gredList, jumSubjek)`) on the latest exam with marks, counting grades — not averages:
- 🌟 **Full A** — all core subjects grade A **and marks complete** (`gredList.length >= jumSubjek`). A pupil with A A A and one subject unmarked is **not** Full A: the missing grade is unknown.
- 🟢 **Terbaik** — no D/E/F · 🟡 **Sederhana** — has D, no E/F · 🟠 **Lemah** — has E or F.
- Lemah/Sederhana do **not** require complete marks: one E already settles it. Check order is EF → D → allA+complete → terbaik.

**Ranking is darjah-wide** and stored per pupil, so filtering by kelas hides rows without renumbering (a teacher sees their pupil is #3 in the darjah, not #1 in the class). Ties on average share a rank (1,2,2,4).

**Surfaces:** 4 KPI cards (current exam) → `hcMuridBanding` comparison table (each group × each exam + ETR target column + "Beza" coloured by *direction*: green when Full A/Terbaik rise or Sederhana/Lemah fall) → ranked pupil list with per-exam grade columns, ETR grade, ✅/❗ status, group, and weak subjects (D/E/F with marks). CSV + print PDF follow the active filter.

**Missing-mark handling:** `m.tiadaMarkah[]` records the *names* of unmarked core subjects, shown per row as "⚠ SAINS belum masuk" (abbreviated via `hcmSingkat`, full names in tooltip and CSV). `hcMuridAmaran` prints a per-subject coverage banner ("SAINS — 92 dari 207 murid ada markah"), worst first, red under 60%, and explains that Full A/Terbaik are provisional while Sederhana/Lemah are already reliable.

**Race guard:** `hcLukisMurid` is slow (marks for every core subject × exam, plus ETR docs per kelas). It takes a token (`hcMuridRun`) and bails at every `await` if a newer run started — without this an older run finishes last and overwrites fresh results ("appears then disappears"). It also waits up to 10s for `GLOBAL_DATA.students`. Kelas/Kumpulan dropdowns call `hcMuridRender()` (filter only), never a recompute.

**What is dynamic:** ETR, subjek diutamakan, grade ranges, exam types and class lists are all re-read on tab open — nothing is persisted except ETR. **Exception:** exam marks are cached (memory + IndexedDB), so newly entered marks need the 🔄 Segar Semula button or a page reload.

**Key gotcha:** `hcTarikTOV(senyap, forceFresh)` — when `senyap` (auto-load from doc / refresh), it uses `hcState.tovSource` (from the saved doc), NOT the DOM dropdowns (which are hidden for teachers). Only reads dropdowns when admin clicks the button manually.

All Headcount functions are prefixed `hc*` (user) / `bhc*` (admin bulk build). Reuses `cariMarkahMurid`, `getGredFromMarkah`, `getExamTypesForYear`, `ensureMarksLoaded`.

### Data Normalization

CSV imports normalize:
- **Agama** (religion): → `"ISLAM"` or `"TIDAK"`
- **Jantina** (gender): → standardized uppercase format

### Deletion Safety

Delete confirmations require typing `"PADAM"` to confirm. Deleted Firestore documents are replaced with placeholder documents to preserve collection structure.

### Libraries (all loaded via CDN)

- **Tailwind CSS** — styling
- **Chart.js** — data visualization
- **PapaParse** — CSV parsing
- **jsPDF + jsPDF AutoTable** — PDF reports
- **html2pdf.js** — exam slip PDFs
- **JSZip** — batch file downloads

jsPDF, html2pdf, and JSZip are lazy-loaded on demand via `loadScript()` / `ensurePdfLibs()` / `ensureJSZip()` to avoid blocking initial page load.

### Exam Slip PDFs

Slip layout (black/white, no color): Jata Negara (left) + school logo (right) header with double rule, BIL/SUBJEK/MARKAH/GRED table with a JUMLAH MARKAH footer row (sums only ticked subjects, skips '-'), bold black text, class/year ranking (optional), print date. Images are fetched once per batch via `bacaSlipCtx()`, resized and re-encoded as JPEG on white background (`_imgToDataURL`) — this is ~17x smaller than embedding the original PNGs and is what makes bulk ZIP generation fast. `downloadSlipDarjah()` generates every student in a darjah, grouped into one folder per kelas inside the ZIP.
