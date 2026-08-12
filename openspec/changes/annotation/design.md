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
`src/commands/` — `Command` interface + serializable `CommandPayload` (`types.ts`); concrete commands in `annotation-commands.ts`: `AddAnnotationCommand`, `DeleteAnnotationCommand`, `MoveAnnotationCommand`, `ClearPageCommand` (`ResizeAnnotationCommand` and `RestyleCommand` are implemented as aliases of `MoveAnnotationCommand`, since resize/restyle are store-level updates). `CommandStack` (`stack.ts`, zustand slice, undoStack/redoStack, cap 100) with `canUndo/canRedo`. Every `execute()`/`undo()`/`redo()` appends its effect to the journal (D4). Undo/redo buttons bound to stack state via the zustand slice.

### D3 — Tool engine: gesture → geometry
Tools implemented as a strategy on `PdfCanvas` (selected via toolbar): each tool defines gesture lifecycle (begin/move/end) mapping canvas (already-transformed) coordinates through `screenToPdf` into PDF points.
- Text-marking tools: on drag, use the engine's already-extracted text items for the page, find a line intersecting the drag rect, snap geometry to its bounds (falls back to freehand rect on no-text pages).
- Pen: accumulate path points → polyline.
- Shapes: drag start/end → rect/ellipse/line/arrow (arrowhead computed).
- Text box: type the content in the toolbar input, then tap the page → commit `content`.
- Select mode: hit-test topmost annotation, drag to move (accumulated locally, committed as ONE command per drag); resize handles are not implemented.
- Eraser: hit-test against bounding-box intersection, delete matched annotations (one command per erase action).

### D4 — Journal + recovery
`src/journal/journal.ts`:
- Append-only `journal.jsonl` per document session: one JSON line per command — `{ sessionId, seq, payload }`, where `payload` is the serializable `CommandPayload` (type, docId, annotation snapshots, pageOrder before/after, ts).
- On open with dirty flag: read journal, offer recovery dialog; on accept replay commands through the stack; on decline truncate journal after backing up to `journal.bak.jsonl` (kept until next successful save).
- New session id on each viewer entry (spec: no cross-session replay).
- Autosave: debounced (300ms) full Project JSON write + immediate journal append per command; `AppState` background listener flushes.

### D5 — Existing annotations preservation (ADR-004 read path)
In-viewer display of annotations already present in the source PDF is NOT implemented: the engine does not expose an `extractAnnotations` capability and the overlay only renders app-created annotations. Preservation at export is guaranteed structurally instead — `document-ops` builds the output by copying the original pages with pdf-lib (`copyPages`), so pre-existing annotations stay in the exported file unless the user explicitly chooses flatten.

### D6 — Toolbar UX
Bottom toolbar with tool selector (icons + active state), color swatches, opacity slider, stroke width stepper, undo/redo, and select tool. Collapses when keyboard open (text box). Non-modal; canvas gestures stay live.

## Risks / Trade-offs

- **Text-marking snap quality** depends on engine text items (pdf.js `getTextContent`); mixed fonts may produce imperfect line grouping — acceptable MVP, documented; fallback rect marking when no text layer.
- **Journal growth**: append-only can grow on long sessions; capped by compaction on successful save (rewrite Project JSON, truncate journal).
- **Undo of eraser**: eraser delete is a single command, so undo restores all erased items in one step.
- **Performance**: annotation overlay re-renders via React (svg elements keyed by id); for very dense pages, memoized components + `react-native-svg` `isolation` props keep it smooth.
- **Recovery correctness**: journal replay is deterministic because commands carry full geometry payloads, not deltas.
