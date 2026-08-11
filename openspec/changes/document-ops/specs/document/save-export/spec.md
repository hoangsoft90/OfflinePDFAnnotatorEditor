## Purpose

Defines how work is written out: exporting a copy (default, recommended), overwriting the original (explicit, atomic), plus rename/duplicate/share, with strict guarantees against data loss and corruption (ADR-004).

## ADDED Requirements

### Requirement: Save a copy (default)
The app MUST offer "Save a copy…" as the default save action, writing a new PDF file that includes annotations (and page operations), with the user choosing the destination via the system picker. The original file MUST remain untouched.

#### Scenario: Export annotated copy
- **WHEN** the user taps Save a copy and chooses a destination
- **THEN** a new PDF is written there containing the page order, rotations, and annotations, and the original is unchanged

### Requirement: Annotation layer options
Export MUST support both (a) flattened output where annotations are drawn into the page content, and (b) non-flattened output where annotations are written as standard PDF annotation objects (highlight with QuadPoints, ink, text, images) preserved across viewers. Existing annotations from other tools MUST be preserved unless the user explicitly chooses flatten.

#### Scenario: Reopen in Adobe Reader
- **WHEN** a highlight is exported non-flattened and reopened in Adobe Reader
- **THEN** the highlight appears with correct position, color, and PDF annotation properties (QuadPoints)

### Requirement: Overwrite original (explicit + atomic)
Overwriting the original MUST require explicit confirmation and MUST be atomic: write to a temp file, fsync, verify integrity, then rename over the original. A failed write MUST leave the original untouched.

#### Scenario: Atomic overwrite
- **WHEN** the user confirms overwrite of the original
- **THEN** the new content is written via temp file + fsync + rename, and the original is only replaced after the write verifies

#### Scenario: Failed overwrite preserves original
- **WHEN** the temp write fails mid-export
- **THEN** the original file remains intact and the user sees an error

### Requirement: Rename and duplicate
The user MUST be able to rename a document (metadata + exported copy name) and duplicate it (export a copy under a new name). Duplicating MUST produce an independent file.

#### Scenario: Duplicate document
- **WHEN** the user duplicates a document
- **THEN** a new independent document appears in recents and edits to one do not affect the other

### Requirement: Share
The user MUST be able to share the document via the system share sheet; sharing MUST export a temporary copy first and never share the internal workspace.

#### Scenario: Share a copy
- **WHEN** the user taps Share
- **THEN** the system share sheet is presented with a PDF copy and the workspace remains private
