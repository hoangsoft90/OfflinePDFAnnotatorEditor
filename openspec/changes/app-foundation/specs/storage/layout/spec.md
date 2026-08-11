## Purpose

Defines where application data lives on device: per-document project workspaces (JSON + annotation assets), thumbnail cache, and signature assets — all inside app-private storage, never in shared media directories, and never with the PDF stored as a BLOB.

## ADDED Requirements

### Requirement: App-private storage layout
The app MUST organize storage under app-private directories as follows: one project workspace directory per `docId` (containing the Project JSON and annotation assets), a thumbnail cache directory, and a signature assets directory. The original PDF file is never copied into these directories unless explicitly imported by the user.

#### Scenario: Project workspace created per document
- **WHEN** a document is opened for the first time
- **THEN** a workspace directory keyed by the document id is created under app-private storage with an empty Project JSON and the document's page identity map

#### Scenario: Thumbnails live in cache only
- **WHEN** the app generates a page thumbnail
- **THEN** it is written under the thumbnail cache directory and never into Pictures/ or Downloads/

### Requirement: PDF metadata is never a BLOB
The metadata store MUST NOT persist PDF binary content. Only URIs, names, sizes, page counts, timestamps, and flags are stored.

#### Scenario: Large PDF opens without copying
- **WHEN** the user opens a 200MB PDF via the system document picker
- **THEN** the metadata row references the document by URI and the PDF bytes are not written into the metadata database

### Requirement: Storage cleanup controls
The app MUST provide Settings controls to clear recent-file history and cached thumbnails, and MUST NOT clear a project workspace with unsaved changes without explicit user confirmation.

#### Scenario: Clear history keeps open projects
- **WHEN** the user clears recent history in Settings
- **THEN** recent-file rows and cached thumbnails are removed but project workspaces and their JSON remain intact
