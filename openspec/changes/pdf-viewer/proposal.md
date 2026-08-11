## Why

The core of an offline PDF workspace is a fast, reliable viewer: users must be able to open a PDF from the system picker or an external app, read it page by page, zoom/pan, jump via thumbnails, and search text — all offline. No existing capability covers PDF file handling or rendering, so this change introduces the engine abstraction and the first real user flow.

## What Changes

- Introduce the **PdfEngine abstraction** (ADR-001 translated): an interface for load, page count/sizes, page render-to-bitmap, and text extraction, with an implementation backed by a React Native PDF renderer.
- **Open a PDF** via Android SAF (`expo-document-picker`, ACTION_OPEN_DOCUMENT), persist URI access where possible, and record the document in the metadata store (recent files).
- **Viewer screen**: render pages, page navigation (next/prev + page indicator), pinch-zoom/pan, thumbnails sheet, and text search with hit navigation.
- **Recent files** integration: the Home list from `app-foundation` now opens real documents.
- **External open** (ADR-008 translated): handle PDFs opened via `ACTION_VIEW`/`ACTION_SEND` intents (e.g. from Gmail/Drive) by copying to a safe location or requesting persistable permission, labeled as a session or persistable document.
- **Coordinate contract** (ADR-003 translated): define the mapping between PDF points (bottom-left origin) and screen pixels (top-left) as a shared transform utility used by all annotation features later.

## Capabilities

### New Capabilities
- `pdf/engine`: PDF engine contract — load, page metadata, render, text extraction, license/audit notes.
- `pdf/viewer`: the reading experience — open, render, navigate, zoom/pan, thumbnails.
- `pdf/search`: full-text search within the open document with per-hit page navigation.
- `files/open`: SAF picker + persistable URI + external-intent open flows.
- `files/recent`: recent documents list behavior backed by the metadata store.

### Modified Capabilities
- (none)

## Impact

- New screens under `app/viewer/[docId].tsx`; Home screen gains document-open handling.
- New engine layer under `src/engine/` (`PdfEngine`, implementation, coordinate transforms).
- Depends on `app-foundation` types (`Document`, `storage-paths`, metadata store).
- Dependencies added: PDF renderer package (react-native-pdf or alternative, evaluated in design), `expo-document-picker`.
