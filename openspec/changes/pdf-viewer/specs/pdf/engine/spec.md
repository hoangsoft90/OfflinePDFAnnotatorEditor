## Purpose

Defines the PDF engine contract that every feature (viewing, annotation, search, export) depends on, keeping the rendering implementation swappable behind one interface.

## ADDED Requirements

### Requirement: Engine abstraction
The app MUST expose a single `PdfEngine` interface providing: open a document source (URI or bytes), total page count, per-page size in PDF points, render a page to a bitmap (pixel buffer/URI) at a requested scale, and extract per-page text items with their coordinates. Feature code MUST NOT depend on any specific renderer implementation.

#### Scenario: Swap renderer without feature changes
- **WHEN** the renderer implementation is replaced with a different one
- **THEN** viewer, thumbnails, search, and annotation features continue to work unchanged

### Requirement: Page metadata and sizes
The engine MUST report page count and each page's width/height in PDF points (72 dpi units) after a successful open.

#### Scenario: Mixed-size document
- **WHEN** a document contains pages of different sizes
- **THEN** the engine reports each page's own size and the viewer renders each page at its correct aspect ratio

### Requirement: Page rendering
The engine MUST render any page to a bitmap at a requested output scale (e.g. 1x/2x/3x) suitable for the device pixel ratio, and MUST render pages off the main thread so the UI stays responsive.

#### Scenario: Render page 1 at 2x
- **WHEN** the viewer requests page 1 at 2x scale
- **THEN** a bitmap sized pageSize×2 is returned without blocking the UI thread

### Requirement: Text extraction for search
The engine MUST extract per-page text items (string + bounding box in PDF points) for search and later annotation positioning.

#### Scenario: Extract page text
- **WHEN** search requests text for a page
- **THEN** the engine returns text items with their coordinates, or an empty result for scanned/image-only pages

### Requirement: License and audit note
The chosen engine MUST be license-audited (BSD/MIT/Apache preferred; GPL/AGPL renderers rejected per plan ADR-001) and the decision recorded in the design document.

#### Scenario: License gate
- **WHEN** a renderer is evaluated for integration
- **THEN** a GPL/AGPL-licensed renderer is rejected unless the product license decision changes
