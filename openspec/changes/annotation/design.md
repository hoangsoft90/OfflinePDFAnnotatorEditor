## Context

`pdf-viewer` delivers `PdfCanvas` (owned gesture container, page bitmap + transform) and `coordinates.ts` (PDF points ↔ screen pixels). This change adds the annotation model, interactive tools, command stack, and crash-safe persistence. Blueprint ADRs 003/004/005/007 are the governing contracts.

## Goals / Non-Goals

**Goals:**
- Annotate with 10 tool types, all geometry in PDF points, aligned at any zoom.
- pageId-based identity so reorder/delete never detaches annotations (ADR-007).
- Full undo/redo via engine-independent commands (ADR-005).
- Autosave + journal + crash recovery (ADR-005).
- Non-destructive: original PDF untouched until export (document-ops).

**Non-Goals:**
- No PDF export/flattening here (document-ops); no signatures (signature change); no page ops UI (document-ops); no existing-annotation *editing*.

## Decisions

### D1 — State: `useProjectStore` + `useAnnotationStore` (zustand)
- `Project` (revision, dirty, pageOrder, fingerprint) held in `useProjectStore`.
- Annotations as a flat `Map<annotationId, Annotation>` in `useAnnotationStore` (immutable updates), serialized to Project JSON.
- Persistence via `ProjectManager` service (`src/project/`) — save/load/autosave; journal via `src/journal/`.

### D2 — Command pattern (ADR-005)
`src/commands/` — base `Command { id, label, execute(), undo() }`; concrete commands: `AddAnnotationCommand`, `DeleteAnnotationCommand`, `MoveAnnotationCommand`, `ResizeAnnotationCommand`, `RestyleCommand`, `ClearPageCommand`. `CommandStack` (undoStack/redoStack, cap 100) with `canUndo/canRedo`. Every `execute()` appends a journal entry (D4). Undo/redo buttons bound to stack state via a zustand slice.

### D3 — Tool engine: gesture → geometry
Tools implemented as a strategy on `PdfCanvas` (selected via toolbar): each tool defines gesture lifecycle (begin/move/end) mapping canvas (already-transformed) coordinates through `screenToPdf` into PDF points.
- Text-marking tools: on drag, query the engine's extracted text items for the page, find lines intersecting the drag rect, snap geometry to line bounds (falls back to freehand rect on no-text pages).
- Pen: accumulate path points → polyline.
- Shapes: drag start/end → rect/ellipse/line/arrow (arrowhead computed).
- Text box: tap → inline editor overlay → commit `content`.
- Select mode: hit-test topmost annotation, handles for resize, move updates geometry.
- Eraser: hit-test against stroke distance / bbox intersection, delete matched annotations (one command per erase action).

### D4 — Journal + recovery
`src/journal/journal.ts`:
- Append-only `journal.jsonl` per document session: `{ seq, sessionId, commandType, payload, ts }`.
- On open with dirty flag: read journal, offer recovery dialog; on accept replay commands through the stack; on decline truncate journal after backing up to `journal.bak.jsonl` (kept until next successful save).
- New session id on each viewer entry (spec: no cross-session replay).
- Autosave: debounced (300ms) full Project JSON write + immediate journal append per command; `AppState` background listener flushes.

### D5 — Existing annotations display (ADR-004 read path)
`PdfEngine` gains `extractAnnotations(pageId)` (optional capability): pdf.js annotation layer returns existing annotation rects/types; the canvas renders them as read-only overlay items (editable later). Preservation at export is handled in `document-ops` (pdf-lib keeps them unless flatten). This change only guarantees they are displayed.

### D6 — Toolbar UX
Bottom toolbar with tool selector (icons + active state), color swatches, opacity slider, stroke width stepper, undo/redo, and select tool. Collapses when keyboard open (text box). Non-modal; canvas gestures stay live.

## Risks / Trade-offs

- **Text-marking snap quality** depends on engine text items (pdf.js `getTextContent`); mixed fonts may produce imperfect line grouping — acceptable MVP, documented; fallback rect marking when no text layer.
- **Journal growth**: append-only can grow on long sessions; capped by compaction on successful save (rewrite Project JSON, truncate journal).
- **Undo of eraser**: eraser delete is a single command, so undo restores all erased items in one step.
- **Performance**: annotation overlay re-renders via React (svg elements keyed by id); for very dense pages, memoized components + `react-native-svg` `isolation` props keep it smooth.
- **Recovery correctness**: journal replay is deterministic because commands carry full geometry payloads, not deltas.
