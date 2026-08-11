## Purpose

Defines detection and handling of external modifications to the source PDF while a project is open, so the app never silently overwrites a file changed elsewhere (ADR-009).

## ADDED Requirements

### Requirement: Source fingerprinting
Each Project MUST record a source fingerprint of the original file (lastModified + size; hash of first 1KB as stronger fallback). The app MUST compare the current file against the fingerprint when opening and before overwriting.

#### Scenario: Fingerprint recorded on open
- **WHEN** a project is created for a document
- **THEN** the source fingerprint is recorded in the project JSON

### Requirement: External-change detection and blocking
If the original file changed externally (e.g. cloud-sync replaced it) while the project is open, the app MUST block overwrite of the original and present: "The original file changed outside the app. [Reload (discard changes)] or [Export a new copy]." The app MUST NOT silently overwrite.

#### Scenario: Drive sync replaced the file
- **WHEN** the user tries to overwrite a document whose source changed outside the app
- **THEN** overwrite is blocked and the dialog offers reload or export-copy

### Requirement: Reload semantics
Choosing Reload MUST discard the project's uncommitted page/annotation changes and reopen from the new source, with a clear confirmation that unsaved changes will be lost.

#### Scenario: Reload after conflict
- **WHEN** the user confirms reload
- **THEN** the document reopens from the external version and the old project changes are discarded
