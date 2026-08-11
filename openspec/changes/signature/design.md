## Context

`annotation` provides the model (`Annotation` with `assetPath`), command stack, journal, and tool registry. This change adds the signature capture surface and the placement tool. ADR-006 governs signature asset storage (sensitive: forgery risk), separated from the general thumbnail policy.

## Goals / Non-Goals

**Goals:**
- Draw a signature on a dedicated pad and save as transparent PNG in `signatures/`.
- List + reuse saved signatures across documents.
- Place/move/resize/delete a signature as an annotation (undoable, autosaved).
- All offline; signatures stay in app-private storage.

**Non-Goals:**
- No crypto at-rest for signatures yet (ADR-006 marks Keystore encryption as P1).
- No "signature verification"/digital-signature semantics (product calls this "Signature annotation" only).
- No handwriting-to-text.

## Decisions

### D1 — Capture surface: react-native-svg-based signature pad
A `SignaturePad` component (full-width drawing area) records pointer path via gesture-handler, renders live stroke with react-native-svg polyline, and exports to PNG using `react-native-view-shot` (captures the SVG layer to a transparent-background PNG file). Alternative considered: canvas libs (`react-native-canvas` via skia) — heavier, not Expo Go friendly; svg+view-shot is Expo-Go compatible.

### D2 — Storage: `src/signatures/signature-repo.ts`
- Dir: `Paths.document/signatures/<signatureId>.png` (from foundation `storage-paths`).
- Index JSON `signatures/index.json` mapping id → {imagePath, createdAt} for the picker list (avoids full dir scan).
- `SignatureManager` service: `save(pngPath)`, `list()`, `delete(id)` — delete only removes the asset file + index entry (placed copies unaffected because they embed the image bytes at place time? No — see D3).

### D3 — Placed signature = annotation referencing asset
`PlaceSignatureCommand` copies the chosen signature PNG into the project workspace assets dir (`projects/<docId>/assets/signatures/<sigId>.png`) and creates a signature-type `Annotation` with `assetPath` pointing at the workspace copy + `bbox`. This makes placed signatures self-contained per document (safe if the global signature asset is later deleted) and preserves them through export. The annotation participates in the existing move/resize/delete/undo/journal flow with zero special-casing in the engine.

### D4 — Tool integration
Signature placement is a tool in the annotation toolbar: tap tool → picker modal (saved signatures grid + "Draw new") → on pick, back to canvas where next tap places the signature centered at the tap point, then Select mode auto-activates for move/resize. Resize uses the same handle system as other annotations (uniform scale for images).

### D5 — UX flow
`SignaturePadScreen` (modal): canvas + Clear/Redo/Save. Save validates non-empty stroke, exports PNG, upserts index, returns to picker with new entry selected.

## Risks / Trade-offs

- **view-shot capture of SVG**: requires the SVG layer to be laid out and captured without clipping; handled by capturing the pad container (fixed aspect) rather than the whole screen. Fallback: capture via `react-native-view-shot` `result: 'tmpfile'` then copy to signatures dir.
- **Transparency**: PNG from svg background must be transparent (no fill on capture container).
- **Large signatures**: PNG sizes are small (vector-ish strokes), acceptable.
- **Security hardening (P1)**: encrypting `signatures/` with Android Keystore is explicitly deferred; documented in README privacy notes.
