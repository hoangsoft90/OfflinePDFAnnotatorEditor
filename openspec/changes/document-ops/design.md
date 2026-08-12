## Context

`annotation` supplies the Project (pageOrder, annotations, journal) and command stack. `pdf-viewer` supplies thumbnails, engine, coordinates. This change implements page organization and safe export. Governing ADRs: 004 (save/export/overwrite), 007 (pageId identity), 009 (conflict detection).

## Goals / Non-Goals

**Goals:**
- Page organizer: grid, drag reorder, multi-select rotate/delete, extract.
- Export copy (default) with flatten or annotation-layer output; atomic overwrite; rename/duplicate/share.
- Conflict detection that never silently overwrites.

**Non-Goals:**
- No merge/split, no forms filling, no password/encryption (P1).
- No OCR/redaction (P2).
- No PDF text editing (anti-scope).

## Decisions

### D1 — Page ops as commands over pageOrder (ADR-007)
All page operations mutate `Project.pageOrder` + per-page rotation map (`pageRotations: Record<pageId, 0|90|180|270>`) as undoable commands (`ReorderPagesCommand`, `RotatePageCommand`, `DeletePagesCommand`, `ExtractPagesCommand`) so the organizer shares the annotation command stack + journal (undo/redo + recovery for free). Deleting a page also removes its annotations (one command). Rendering derives index via `pageOrder.indexOf(pageId)`.

### D2 — Modifier: pdf-lib (from pdf-viewer change)
pdf-lib (pure JS, MIT) is the write-path engine:
- **Page ops for export**: `pdfDoc.getPages()`, reorder via `pdfDoc.removePage()`/`copyPages`, `page.setRotation({angle})`, delete via removePage, extract via copyPages into a new PDFDocument.
- **Annotations**: pdf-lib can add highlight/underline/strikeout with QuadPoints, ink (via drawSVGPath on a hidden layer or annotation dict), text (`page.drawText`), images (`page.drawImage`). Where pdf-lib lacks a native annotation API (e.g. QuadPoints), we append standard annotation dictionaries to `/Annots` via low-level `pdfDoc.context` — implemented in `src/export/export-utils.ts` (`writeAnnotations` / `appendMarkupAnnotation`).
- **Flatten**: draw annotations directly into content streams (opaque) → result renders identically everywhere.

### D3 — Atomic overwrite (ADR-004)
`src/export/atomic.ts`:
1. Export bytes → temp file in the same directory/namespace as target.
2. `fsync` via file handle write + `File.sync()` (expo-file-system).
3. Verify integrity (byte length + optional hash of written file).
4. Rename temp over target (`File.move/rename`).

For SAF `content://` targets (original in user storage), writing "over" requires a `Writable` grant: we open a SAF write stream via expo-document-picker `copyToCacheDirectory:false` + document URI; implementation detail: use `ContentResolver`-style write via `File(uri).write()`. If write grant is unavailable, fall back to "Save a copy…". Never writes directly over the original without the temp+verify+rename dance when target is app-private; for SAF targets the atomic rename is performed by the system picker transaction (createDocument → write → the picker handles placement).

### D4 — Conflict detection (ADR-009)
`src/project/conflict.ts`: on viewer open and before overwrite, stat the source URI (size + lastModified via expo-file-system) and compare to `Project.sourceFingerprint`. On mismatch → `ConflictDialog` with Reload (discard) / Export a copy. Fingerprint fallback: hash first 1KB if timestamps are unreliable.

### D5 — Share & duplicate
Share: export to temp copy in `cache/share/`, invoke `expo-sharing.shareAsync` (Android SAF share sheet); cleanup temp after. Duplicate: export a copy to `cache/duplicates/` then insert into metadata store as a new recent document (independent file).

### D6 — Organizer UI
`src/app/organizer/[docId].tsx` + `src/screens/organizer/OrganizerScreen.tsx`: thumbnail grid (FlatList, 2 columns), multi-select mode (tap-to-select layer) for rotate (cw/ccw), delete (with confirmation) and extract; top bar with selection actions + undo/redo buttons. Drag-to-reorder is NOT implemented — the `ReorderPagesCommand` and `pageOrder` mutation helpers exist, but the organizer exposes no drag UI yet.

## Risks / Trade-offs

- **pdf-lib annotation fidelity**: QuadPoints/highlight dictionaries written manually are standards-compliant but require careful testing against Adobe Reader (golden suite item). Flatten output is the safe fallback and the export default for maximum compatibility.
- **SAF atomic overwrite limits**: for externally-sourced content:// URIs, true rename-over may be constrained by the provider; the app requires explicit consent and falls back to Save a copy when no write grant exists.
- **Large-file export perf**: pdf-lib holds the doc in memory; for >50MB scans, export runs with progress indicator; heavy files documented as P1 hardening (foreground service).
- **Drag reorder library choice**: custom reorder with gesture-handler keeps dependencies lean; swap to draggable-flatlist if needed.
