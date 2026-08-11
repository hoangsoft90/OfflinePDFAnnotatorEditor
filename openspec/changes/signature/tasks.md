## 1. Signature capture

- [ ] 1.1 `src/signatures/signature-pad.tsx`: drawing canvas (gesture-handler + svg polyline), live stroke, Clear/Redo
- [ ] 1.2 Export to transparent PNG via `react-native-view-shot` (fixed-aspect capture, `result: 'tmpfile'`)
- [ ] 1.3 `app/signature-pad` modal screen: pad + Save/Cancel; non-empty validation

## 2. Signature storage

- [ ] 2.1 `src/signatures/signature-repo.ts`: save PNG to `signatures/<id>.png`, `signatures/index.json` upsert, list, delete
- [ ] 2.2 `src/signatures/signature-manager.ts`: service API (save/list/delete) with index cache

## 3. Placement tool

- [ ] 3.1 `PlaceSignatureCommand` in `src/commands/` + workspace assets copy (projects/<docId>/assets/signatures/)
- [ ] 3.2 Signature tool in toolbar: picker modal (saved grid + Draw new), tap-to-place, auto-select mode
- [ ] 3.3 Move/resize/delete integration: reuse annotation handles (uniform scale), undo/redo + journal wiring
- [ ] 3.4 Signature asset rendering in `AnnotationOverlay` (image with bbox, aspect preserved)

## 4. Validation

- [ ] 4.1 `npx tsc --noEmit` passes
- [ ] 4.2 `npx expo export --platform android` bundle passes
- [ ] 4.3 Smoke test: draw + save signature → place on page → move/resize → undo → reopen doc → signature persists; delete saved signature → placed copy remains
