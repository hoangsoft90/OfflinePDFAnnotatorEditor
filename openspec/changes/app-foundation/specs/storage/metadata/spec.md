## Purpose

Provides the local SQLite-backed metadata store that tracks documents, recent-open history, and favorites, forming the data source for the Home screen and document management features.

## ADDED Requirements

### Requirement: Document metadata persistence
The metadata store MUST persist one row per known document with: stable id, content URI, display name, size, page count, last-opened timestamp, modified timestamp, and favorite flag.

#### Scenario: Document row upsert on open
- **WHEN** a document is opened successfully
- **THEN** its metadata row is inserted or updated with the current page count and last-opened timestamp

### Requirement: Recent documents list
The store MUST return recently opened documents ordered by last-opened time, most recent first, and MUST cap the list at a configured maximum (default 50).

#### Scenario: Home screen shows recents
- **WHEN** the Home screen loads
- **THEN** it displays recent documents from the store ordered newest-first, including documents that were only ever opened via external intents

### Requirement: Favorites
The user MUST be able to mark a document as favorite or unfavorite from the Home screen, and the store MUST persist that flag and support filtering by favorite.

#### Scenario: Favoriting from Home
- **WHEN** the user toggles favorite on a document row
- **THEN** the flag is persisted and a favorites filter shows only favorited documents

### Requirement: Missing-URI handling
When a stored document's content URI is no longer accessible (e.g. permission lost or file deleted), the app MUST surface a clear "document unavailable" state and MUST NOT crash.

#### Scenario: Stale URI in recents
- **WHEN** the user opens a recent document whose content URI can no longer be read
- **THEN** the app shows a clear unavailable message and offers to remove the entry from recents
