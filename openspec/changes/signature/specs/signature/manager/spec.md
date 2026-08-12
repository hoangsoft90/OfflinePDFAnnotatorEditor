## Purpose

Defines end-to-end signature management: capturing a signature, storing it as a private local asset, reusing it across documents, and placing/resizing it on PDF pages.

## ADDED Requirements

### Requirement: Capture a signature
The app MUST provide a signature capture screen where the user draws with finger or stylus, sees the stroke live, and can clear the stroke before saving. The saved signature MUST be a PNG stored in the app-private `signatures/` directory (currently ink on a white background; transparent background is not yet implemented).

#### Scenario: Draw and save signature
- **WHEN** the user draws a signature and taps Save
- **THEN** a PNG of the drawn ink is written to the signatures directory and appears in the saved-signatures list

### Requirement: Signature asset privacy
Signature PNGs MUST be stored in app-private internal storage, never in shared media directories, and MUST NOT be transmitted anywhere. They MUST be protected by the same privacy contract as the rest of the app (ADR-006), with encryption of the signatures directory identified as a P1 hardening item.

#### Scenario: Signatures stay on device
- **WHEN** the user creates signatures and uses the app fully offline
- **THEN** no signature data leaves the device and no outbound traffic occurs

### Requirement: Reusable saved signatures
The app MUST list saved signatures and let the user pick one to place on a page, including signatures saved in previous sessions.

#### Scenario: Reuse across documents
- **WHEN** the user saved a signature in document A and later opens document B
- **THEN** the same signature is available in B's signature picker

### Requirement: Place, move, resize on page
Placing a signature MUST insert it as a pageId-referenced annotation at the tapped location. The user MUST be able to move, resize, and delete a placed signature, and these operations MUST participate in undo/redo and autosave like any annotation.

#### Scenario: Place then resize
- **WHEN** the user taps the page to place a signature, then drags its handle
- **THEN** the signature scales to the new size and the change is undoable and autosaved

### Requirement: Signature asset deletion
The user MUST be able to delete a saved signature from the local list; deleting it MUST NOT remove signatures already placed on documents (those keep their embedded image).

#### Scenario: Delete saved signature
- **WHEN** the user deletes a saved signature asset
- **THEN** the asset is removed from the list but placed copies on documents remain
