## Why

Signing PDFs is one of the top-3 product pillars and the reason many privacy-sensitive users switch to an offline workspace. Users must be able to draw a signature once, keep it locally (sensitive asset — see ADR-006 signature policy), and place/move/resize it onto pages, all without any network or account.

## What Changes

- **Signature capture**: draw a signature on a canvas (finger/stylus), with clear/redo of the stroke.
- **Signature assets**: saved as transparent PNGs in the dedicated `signatures/` directory (separate from thumbnail policy per ADR-006), listed and reusable across documents.
- **Place on page**: insert a signature image as an annotation on the current page at tapped location; move, resize, rotate (optional); delete.
- **Project integration**: placed signatures are normal annotations referencing pageId (ADR-007), stored in Project workspace, autosaved/journaled like other annotations.
- **Privacy**: signatures never leave the device; no network; asset listing is local-only.

## Capabilities

### New Capabilities
- `signature/manager`: signature capture, storage, reuse, and placement onto pages.

### Modified Capabilities
- (none)

## Impact

- New `app/signature-pad` screen/modal, `src/signatures/` service (capture → PNG → `signatures/` dir), placement tool integrated into the annotation toolbar.
- Reuses annotation model (signature annotations with `assetPath`), journal, command stack from `annotation` change.
- Depends on `annotation` (model, tools, undo/redo) and `app-foundation` (storage layout).
