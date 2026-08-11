## Why

Reading and annotating are not enough — users need to organize pages (rotate, delete, reorder, extract) and get their work out safely: export a copy (default), overwrite the original (explicit, atomic), rename, duplicate, and share. All while guaranteeing no silent data corruption: page operations respect pageId identity (ADR-007), export preserves existing annotations unless flattening is chosen (ADR-004), and conflicts with external modifications are detected (ADR-009).

## What Changes

- **Page Organizer screen**: thumbnail grid of all pages; drag-to-reorder; multi-select rotate (90° steps), delete, extract-as-new-document. Updates `pageOrder` by pageId (ADR-007).
- **Save / Export semantics (ADR-004)**: "Save a copy…" is the default recommended action (export flattened or annotation-layer PDF via pdf-lib); "Overwrite original" is explicit with atomic write (tmp → fsync → rename) and clear confirmation.
- **Document management**: rename, duplicate, share (via system share sheet, exporting a copy), from Home or a document menu.
- **Conflict detection (ADR-009)**: compare source fingerprint (lastModified + size) on open/export; if the original changed externally, block overwrite and offer Reload (discard changes) or Export a new copy.
- **Existing-annotation preservation (ADR-004)**: engine reads existing annotations (from annotation change) and export preserves them unless the user explicitly flattens.

## Capabilities

### New Capabilities
- `pages/organizer`: page thumbnail grid, reorder/rotate/delete/extract operations.
- `document/save-export`: export-copy and overwrite flows, atomic writes, flattening, rename/duplicate/share.
- `document/conflict`: source fingerprinting and external-change conflict handling.

### Modified Capabilities
- (none)

## Impact

- New `app/organizer/[docId].tsx` screen and `src/pages/` service layer; `src/export/` exporter (pdf-lib based); save/export actions in viewer + Home menus.
- Uses `pdf-lib` (added in pdf-viewer) for page ops and annotation writing/flattening.
- Depends on `annotation` (Project, journal, annotations), `pdf-viewer` (engine, thumbnails), `app-foundation` (storage layout, metadata).
- Metadata store gains rename + duplicate rows.
