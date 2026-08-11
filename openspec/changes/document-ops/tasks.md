## 1. Page organizer service

- [ ] 1.1 `src/pages/page-ops.ts`: pageOrder mutation helpers (move, delete, rotate map) + command payloads
- [ ] 1.2 Commands: ReorderPages, RotatePage, DeletePages, ExtractPages (undoable, journaled)
- [ ] 1.3 `src/pages/extract.ts`: pdf-lib extract pages → new PDF bytes (with annotations per D2)
- [ ] 1.4 Organizer data flow: load thumbnails + pageOrder, apply ops via command stack, autosave

## 2. Organizer UI

- [ ] 2.1 `app/organizer/[docId].tsx` + grid screen with thumbnails and page labels
- [ ] 2.2 Drag-to-reorder (long-press lift, drop into slot) — custom gesture-handler or draggable-flatlist
- [ ] 2.3 Multi-select mode: checkbox layer, select-all, actions (rotate cw/ccw, delete w/ confirmation, extract)
- [ ] 2.4 Undo/redo + Done bar; leave-guard for unsaved page ops

## 3. Export engine

- [ ] 3.1 `src/export/exporter.ts`: pdf-lib build — apply pageOrder + rotations, write annotations (annotation-layer or flatten)
- [ ] 3.2 `src/export/annotation-writer.ts`: highlight/underline/strikeout QuadPoints dicts, ink, text, image (signature) annotations via pdf-lib context
- [ ] 3.3 `src/export/flatten.ts`: draw annotations into content streams (flatten mode)
- [ ] 3.4 `src/export/atomic.ts`: temp write → sync → verify → rename; SAF write-grant fallback path

## 4. Save / export actions

- [ ] 4.1 Save a copy… flow (expo-document-picker create/place) with flatten/annotation-layer choice
- [ ] 4.2 Overwrite original flow: confirmation, atomic write, error handling
- [ ] 4.3 Rename + duplicate actions (metadata + copy export); Share via expo-sharing with temp copy + cleanup
- [ ] 4.4 Progress UI for long exports; disabled-while-exporting guards

## 5. Conflict detection

- [ ] 5.1 `src/project/conflict.ts`: source stat (size+lastModified, hash fallback) vs fingerprint
- [ ] 5.2 Conflict dialog on open + before overwrite: Reload (discard, confirmed) / Export a copy
- [ ] 5.3 Block overwrite when conflict detected; fingerprint update after successful overwrite

## 6. Validation

- [ ] 6.1 `npx tsc --noEmit` passes
- [ ] 6.2 `npx expo export --platform android` bundle passes
- [ ] 6.3 Golden round-trip: annotate → reorder/rotate/delete → export → reopen exported PDF (Adobe-compatible) → annotations at correct pages/positions (ADR-004/007)
- [ ] 6.4 Conflict test: modify source externally → overwrite blocked → reload works
- [ ] 6.5 Original untouched until export; overwrite atomic (kill mid-write leaves original intact)
