## 1. Models & project layer

- [ ] 1.1 `src/models/annotation.ts`: `Annotation`, `AnnotationGeometry`, `AnnotationType`, types for all 10 tools, color/opacity/width/content
- [ ] 1.2 `src/models/project.ts`: full `Project` (revision, dirty, pageOrder, fingerprint, sessionId) + `pageOrder` helpers
- [ ] 1.3 `src/project/project-manager.ts`: load/save Project JSON, create on first annotate, source fingerprint (lastModified+size), dirty flag
- [ ] 1.4 `src/project/annotation-serializer.ts`: Annotation <-> JSON round-trip (stable, versioned)

## 2. Command stack

- [ ] 2.1 `src/commands/types.ts`: `Command` interface, `CommandResult`
- [ ] 2.2 `src/commands/stack.ts`: undo/redo stacks, cap 100, canUndo/canRedo, redo-cleared-on-new-command
- [ ] 2.3 Commands: AddAnnotation, DeleteAnnotation, MoveAnnotation, ResizeAnnotation, Restyle, ClearPage
- [ ] 2.4 `src/store/use-command-store.ts`: zustand slice wiring stack state to UI

## 3. Annotation store & journal

- [ ] 3.1 `src/store/use-annotation-store.ts`: flat map store, CRUD, applyCommand integration
- [ ] 3.2 `src/journal/journal.ts`: append-only jsonl, sessionId, `{seq, commandType, payload}` entries, replay, backup/truncate on save
- [ ] 3.3 Autosave service: debounced Project JSON save, immediate journal append, AppState background flush
- [ ] 3.4 Recovery flow: detect dirty journal on open → dialog "Recover unsaved changes?" → replay or backup+truncate

## 4. Tool engine on canvas

- [ ] 4.1 Tool strategy interface + registry (`src/tools/`): begin/move/end → geometry in PDF points via `screenToPdf`
- [ ] 4.2 Text-marking tools: text-item snap on drag, fallback freehand rect on no-text pages
- [ ] 4.3 Pen + eraser tools (path polyline, stroke hit-test)
- [ ] 4.4 Text box tool: tap → inline editor → commit content
- [ ] 4.5 Shapes: rect/ellipse/line/arrow (arrowhead geometry)
- [ ] 4.6 Select tool: hit-test, move, resize handles, delete
- [ ] 4.7 `AnnotationOverlay` (react-native-svg): render all types, memoized, transformed inside PdfCanvas container

## 5. Toolbar UI

- [ ] 5.1 `Toolbar` component: tool selector, color swatches, opacity slider, width stepper, undo/redo buttons, select tool
- [ ] 5.2 Viewer integration: active tool state, keyboard-aware collapse for text box, toolbar + canvas wiring
- [ ] 5.3 Leave-viewer guard: dirty → Continue editing / Save / Discard dialog

## 6. Existing annotations display

- [ ] 6.1 `PdfEngine.extractAnnotations(pageId)` (pdf.js annotation layer) + read-only overlay rendering

## 7. Validation

- [ ] 7.1 `npx tsc --noEmit` passes
- [ ] 7.2 `npx expo export --platform android` bundle passes
- [ ] 7.3 Smoke test: draw pen, highlight text, undo/redo, text box, shapes, eraser; kill app mid-edit → reopen → recovery restores annotations
- [ ] 7.4 Golden test: highlight page 5 → (document-ops will verify reorder keeps it) — here verify journal replay round-trip
