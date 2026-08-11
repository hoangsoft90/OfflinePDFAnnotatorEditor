## Purpose

Defines how the Home screen lists and manages recently opened documents, backed by the metadata store from app-foundation.

## ADDED Requirements

### Requirement: Recent documents list
The Home screen MUST list recently opened documents ordered by last-opened time (newest first), with name, page count, size, and a favorite indicator.

#### Scenario: Recents ordered by recency
- **WHEN** the user opens document A, then document B, then returns Home
- **THEN** B appears above A

### Requirement: Open from recents
Tapping a recent document MUST open it in the viewer, updating its last-opened timestamp.

#### Scenario: Tap recent opens viewer
- **WHEN** the user taps a recent document
- **THEN** the viewer opens it and its last-opened timestamp updates

### Requirement: Favorite management
The Home screen MUST allow toggling favorite status and filtering the list to favorites.

#### Scenario: Favorites filter
- **WHEN** the user enables the favorites filter
- **THEN** only favorited documents are shown

### Requirement: Clear recents
The Home screen MUST support clearing the recent list (from Settings or a menu), which removes recent rows and cached thumbnails but never deletes the source files or unsaved project workspaces.

#### Scenario: Clear history
- **WHEN** the user clears recent history
- **THEN** the recents list empties, thumbnails are purged, and source PDFs remain untouched
