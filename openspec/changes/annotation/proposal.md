## Why

Annotation is the heart of the product: users must be able to mark up PDFs (highlight, underline, strikeout, freehand pen, eraser, text boxes, shapes) with precise placement, undo/redo, and crash-safe persistence — entirely offline. This change delivers the annotation data model (pageId-based per ADR-007), the coordinate system (ADR-003), the tooling UI on top of the viewer, and the undo/redo + autosave/recovery machinery (ADR-005).

## What Changes

- **Annotation model** (`Annotation`, `AnnotationGeometry`, types for highlight/underline/strikeout/pen/eraser/text/shape) referencing stable `pageId`, never page index (ADR-007).
- **Project workspace** (`Project` JSON + journal) per document, with source fingerprint and pageOrder (pageId list).
- **Annotation tools UI** on the viewer canvas: highlight/underline/strikeout (drag-select text), freehand pen, eraser, text box (add-only), shapes (rect/ellipse/line/arrow), with color/opacity/thickness controls.
- **Command pattern + undo/redo** (`CommandStack`) for every annotation operation, independent of the engine (ADR-005).
- **Autosave + journal + crash recovery**: every command append-only to `journal.json`; on reopen, offer "Recover unsaved changes?" (ADR-005); non-destructive — original PDF untouched.
- **Existing-annotation preservation** (ADR-004 part): engine reads & displays annotations already present in the PDF; export preserves them unless "flatten" is chosen (export itself is in `document-ops`).

## Capabilities

### New Capabilities
- `annotation/model`: annotation + project data model, pageId identity, journal schema.
- `annotation/tools`: interactive annotation tool behaviors (create/edit/erase/move/resize).
- `annotation/undo-redo`: command stack semantics for all annotation operations.
- `annotation/recovery`: autosave, journal replay, crash recovery dialog, dirty-state prompts.

### Modified Capabilities
- (none)

## Impact

- New `src/models/annotation.ts`, `src/models/project.ts` (may move from foundation skeleton to full impl), `src/engine/` annotation-writing helpers (flatten prep), `src/commands/`, `src/store/use-annotation-store.ts`, `src/store/use-project-store.ts`.
- Viewer screen gains a tools toolbar and interactive canvas overlay.
- Depends on `pdf-viewer` (`PdfCanvas`, `coordinates.ts`, `PdfEngine`), `app-foundation` (storage layout).
- New dependency: `react-native-gesture-handler` gestures for selection/drawing (already added in pdf-viewer).
