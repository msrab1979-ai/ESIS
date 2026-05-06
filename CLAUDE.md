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

The entire application lives in a **single file**: `public/index.html` (~8,350 lines). All HTML, CSS, and JavaScript are inline in this one file. JavaScript begins at line 1517. `public/index.backup.html` is a manual backup snapshot — do not edit it.

**Firebase project:** `sistem-esis` (see `.firebaserc`)  
**Firebase services used:** Firestore (database) + Hosting (static serving)

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
| Firebase config | ~line 1548 |
| CDN lazy-loader (`loadScript`) | ~line 1523 |
| Data normalization helpers | ~line 1563 |
| Global year filter (`onGlobalYearChange`) | ~line 1664 |
| Filtered marks getter (`getFilteredMarks`) | ~line 1678 |
| Main data load (`bacaInitialData`) | ~line 4161 |
| Admin login (`handleLogin`) | ~line 4450 |
| Panel navigation (`showPanel`) | ~line 4465 |
| Save marks (`simpanMarkah`) | ~line 4845 |
| Exam slip PDF generation (`generateSlipPDF`) | ~line 3524 |
| Edit marks table (`renderEditTable`) | ~line 5053 |
| Analysis table (`renderAnalisaTable`) | ~line 5124 |

### Caching

IndexedDB is used to cache Firestore data client-side. A "force refresh" button in the UI invalidates this cache. Cache keys follow the pattern `year_subject_marks`.

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
