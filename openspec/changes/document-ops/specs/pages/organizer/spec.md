## Purpose

Defines the page organizer: a thumbnail-grid screen where users reorder, rotate, delete, and extract pages, with page identity preserved across all operations.

## ADDED Requirements

### Requirement: Thumbnail grid
The organizer MUST display all pages of the document as a thumbnail grid with page numbers, generated from cached thumbnails when available.

#### Scenario: Open organizer
- **WHEN** the user opens the page organizer for a 10-page document
- **THEN** a grid of 10 thumbnails with page labels is shown

### Requirement: Reorder pages
The user MUST be able to reorder pages via drag-and-drop (long-press to lift, drag to target slot). Reordering MUST update `pageOrder` (list of pageIds) so annotations remain attached to the correct page (ADR-007).

#### Scenario: Drag page 2 to position 1
- **WHEN** the user drags page 2 above page 1
- **THEN** the grid shows page 2 first and the pageOrder list reflects the new order

### Requirement: Rotate pages
The user MUST be able to rotate a page (or multi-selected pages) by 90° clockwise/counterclockwise. Rotation MUST be recorded per page (0/90/180/270) and MUST NOT detach annotations from the page.

#### Scenario: Rotate one page
- **WHEN** the user rotates page 3 by 90°
- **THEN** page 3 renders rotated in the organizer, viewer, and export

### Requirement: Delete pages
The user MUST be able to delete one or more pages with confirmation. Deleting a page MUST remove it from pageOrder and drop its annotations; other pages' annotations MUST be unaffected.

#### Scenario: Delete page with confirmation
- **WHEN** the user selects pages 4 and 5 and confirms delete
- **THEN** the document has two fewer pages and annotations on remaining pages are unchanged

### Requirement: Extract pages
The user MUST be able to extract selected pages into a new PDF document, keeping annotations on those pages.

#### Scenario: Extract pages to new document
- **WHEN** the user selects pages 1-3 and taps Extract
- **THEN** a new document containing those pages (with their annotations) is created and offered for saving

### Requirement: Organizer changes participate in undo/redo
Page operations MUST be commands in the command stack (undoable/redoable) and MUST autosave like annotation operations.

#### Scenario: Undo a reorder
- **WHEN** the user reorders pages then taps undo in the organizer
- **THEN** the original order is restored
