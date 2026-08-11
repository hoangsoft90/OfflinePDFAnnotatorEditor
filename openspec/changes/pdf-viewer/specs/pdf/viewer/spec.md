## Purpose

Defines the reading experience: opening a document, rendering it, navigating pages, zooming/panning, and previewing pages via thumbnails.

## ADDED Requirements

### Requirement: Open and render a document
The viewer MUST open a document from a content URI, render the current page, and display it with correct aspect ratio and crispness for the device.

#### Scenario: Open PDF from recents
- **WHEN** the user taps a recent document
- **THEN** the viewer opens it, renders the first page, and shows a loading state until the first page is ready

### Requirement: Page navigation
The viewer MUST support previous/next page actions and display the current page / total pages. Programmatic jumps (e.g. from search results or thumbnails) MUST go to the requested page.

#### Scenario: Next page
- **WHEN** the user taps next on the last page
- **THEN** no action occurs and the page indicator remains on the last page

#### Scenario: Jump from thumbnails
- **WHEN** the user taps a thumbnail of page 5
- **THEN** the viewer navigates to page 5

### Requirement: Pinch zoom and pan
The viewer MUST support pinch-to-zoom and pan on the rendered page, with the annotation overlay staying aligned at all zoom levels (enforced by the coordinate contract in `pdf/engine`).

#### Scenario: Zoom keeps annotations aligned
- **WHEN** the user zooms into a page that has annotations
- **THEN** annotations remain positioned over the same PDF coordinates (no drift)

### Requirement: Thumbnails sheet
The viewer MUST provide a thumbnail sheet listing all pages rendered as small previews, generated asynchronously and cached in the thumbnail cache directory.

#### Scenario: Generate thumbnails
- **WHEN** the user opens the thumbnail sheet for a 100-page document
- **THEN** thumbnails appear progressively without freezing the UI

### Requirement: Performance budget
Cold-open of a 100-page PDF MUST complete (first page visible) within 1.5s on a mid-range device, and page turns MUST not exceed 150ms of user-perceived latency.

#### Scenario: Cold open 100-page PDF
- **WHEN** a 100-page PDF is opened from recents on a 4-6GB RAM device
- **THEN** the first page is visible within 1.5 seconds
