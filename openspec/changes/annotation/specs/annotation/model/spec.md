## Purpose

Defines the annotation and project data models, including the page-identity rule that keeps annotations attached to the correct page across page reordering/deletion (ADR-007).

## ADDED Requirements

### Requirement: Annotation references pageId, never pageIndex
Every annotation MUST reference a stable page identifier (`pageId`) that is independent of display order. The current page index MUST be derived only at render time via `pageOrder.indexOf(pageId)`. Page operations (reorder, delete, extract) MUST NOT change which page an annotation belongs to.

#### Scenario: Reorder keeps annotations attached
- **WHEN** the user highlights text on page 5, then reorders pages so page 5 moves to position 2
- **THEN** the highlight still appears on the same content (page 5), now displayed at position 2

#### Scenario: Delete another page
- **WHEN** the user deletes page 2 of a document containing a highlight on page 5
- **THEN** the highlight remains on page 5's content and does not shift to another page

### Requirement: Annotation types and geometry
The model MUST support at least: highlight, underline, strikeout, freehand pen, eraser-stroke, text box (add-only), rectangle, ellipse, line, and arrow annotations. Each annotation MUST store: type, pageId, geometry (bounding box in PDF points and/or path points), color, opacity, stroke width, optional text content, and creation/modification timestamps.

#### Scenario: Geometry in PDF points
- **WHEN** an annotation is created on a page
- **THEN** its geometry is stored in PDF native coordinates (points, bottom-left origin) and never in screen pixels

### Requirement: Project workspace
Each document MUST have a Project object containing: id, documentId, revision, dirty flag, source fingerprint (lastModified + size of the original), pageOrder (list of pageIds), and references to annotation store and signature assets. The Project MUST persist as JSON in the document's workspace directory.

#### Scenario: Project created on first annotate
- **WHEN** the user creates the first annotation on a document
- **THEN** a Project JSON is written to the workspace with revision 1 and dirty=true

### Requirement: Non-destructive source
Annotations MUST NOT modify the original PDF file. All annotation data lives in the Project workspace until the user explicitly exports/flattens (see document-ops).

#### Scenario: Original PDF unchanged
- **WHEN** the user annotates a PDF and closes the app without exporting
- **THEN** the original PDF file is byte-identical to before
