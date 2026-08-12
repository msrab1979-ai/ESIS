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
| `gred` | Grade ranges/definitions |
| `examTypes` | Exam type classifications |
| `settings` | System settings (markahEnabled flag, school name, logo URL) |

### UI Panels (main navigation sections)

1. **Rekod Markah** — Enter exam marks
2. **Edit & Cetak** — Edit marks and print reports
3. **Analisa Keseluruhan** — Grade analysis across all subjects
4. **Analisa Subjek** — Grade trends for a single subject
5. **Murid Terbaik** — Student rankings
6. **Guru Kelas** — Manage student roster
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

### Exam "Aktif" Toggle (Urus Jenis Peperiksaan)

Each exam type in `examTypes` has an `aktif` boolean, toggled in Admin. `aktif: false` puts the exam into **view-only mode** in Rekod & Laporan: teachers can view marks, print PDF, and export CSV, but cannot add/edit/delete marks (Simpan/Padam buttons hidden, no input fields, "Mod Baca Sahaja" banner shown). `isEditExamReadOnly()` also guards `simpanEditMarkah()`/`deleteMarkahByFilter()` server-side against bypass. This is separate from the global `settings.markahEnabled` flag, which blocks entry to the whole Rekod & Laporan panel.

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
