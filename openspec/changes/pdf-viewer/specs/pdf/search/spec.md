## Purpose

Provides full-text search inside the currently open document with page-level hit navigation.

## ADDED Requirements

### Requirement: Search within the open document
The viewer MUST provide a search input that finds all occurrences of a query string in the open document, showing results grouped by page with hit counts.

#### Scenario: Find matches across pages
- **WHEN** the user searches for "contract" in a document
- **THEN** results list all pages containing matches with the number of hits per page

### Requirement: Navigate to search hits
The viewer MUST navigate to the page of a selected search result and visually indicate the hit position on that page.

#### Scenario: Tap a search result
- **WHEN** the user taps a search result for page 7
- **THEN** the viewer navigates to page 7 and highlights the matched text region

### Requirement: Scanned-document behavior
When a page has no extractable text (scanned/image-only), search MUST skip it and MUST NOT crash or show misleading results.

#### Scenario: Search scanned PDF
- **WHEN** the user searches in a scanned PDF with no text layer
- **THEN** the search returns no hits and the results list stays empty (no misleading entries)
