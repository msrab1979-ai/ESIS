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
| **`rekodMarkah` collection (20,918 docs)** | **16.5s** |

**The landing-page wait is `rekodMarkah`.** `bacaInitialData` fetches the whole collection even though a single calendar year needs only ~8,115 of those 20,918 docs, and the gap widens every year. The IndexedDB cache hides this on repeat visits, but a first visit or a 🔄 Segar Semula pays it in full.

**Not yet fixed** — it sits on the load path every panel depends on. The fix is to filter by `timestamp` range for the wanted year and load other years on demand; before doing so, count how many docs have a missing or malformed `timestamp`, because those would silently vanish from every panel.

**General rule this uncovered:** never read Firestore docs one at a time in a loop. Per-doc reads cost ~113ms each, so 91 of them is ~10s while one filtered query returning the same data is ~0.3s — a 70× difference. See the Trend GPS ETR query above.

### Firebase Hosting cache

`firebase.json` sets `Cache-Control: no-cache, must-revalidate` for `index.html`. Firebase's default is `max-age=3600`, and since this app is a single HTML file that meant **every deploy took up to an hour to reach users** — fixes looked like they had not worked when they were already live. If a deployed change appears to have no effect, verify with `curl -sI` before assuming the code is wrong.

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
