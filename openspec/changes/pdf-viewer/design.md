## Context

`app-foundation` provides the shell, storage layout, metadata DB, and `Document`/`Project` models. This change adds the PDF engine, open flows (SAF + external intents), and the viewer screen. Blueprint ADR-001/002/003/008 are translated to the Expo stack here.

Constraint from `pdf/engine` spec: annotation overlay must stay aligned with the rendered page at all zoom levels. Constraint from `privacy/contract`: no INTERNET permission, no outbound calls — the engine must be local-only.

## Goals / Non-Goals

**Goals:**
- Open PDFs via SAF and external intents, persist access, record recents.
- Render pages to bitmaps and display with smooth pinch-zoom/pan under our own control (so annotation overlay alignment is guaranteed later).
- Full-text search with hit navigation.
- Clean `PdfEngine` interface so the renderer can be swapped later.

**Non-Goals:**
- No annotation tools yet (change `annotation`), no signatures, no page ops/export (change `document-ops`).
- No iOS-specific work (Android-first).

## Decisions

### D1 — Renderer: pdf.js (Mozilla) inside a single hidden WebView
Chosen over `react-native-pdf` (native) and `@thatkid02/react-native-pdf-viewer` (Nitro):

| Criterion | pdf.js in WebView | react-native-pdf | Nitro pdf-viewer |
|---|---|---|---|
| Expo Go compatible | ✅ | ❌ (dev build) | ❌ (dev build) |
| Per-page bitmap output | ✅ (canvas → PNG dataURL) | ❌ (no page→image API) | ✅ generateThumbnail |
| Annotation overlay alignment | ✅ exact (we own zoom/pan) | ⚠️ internal gestures hide layout | ❌ pan offsets not exposed |
| Text extraction + search | ✅ getTextContent | ❌ | ❌ |
| License | Apache-2.0 ✅ (ADR-001 OK) | MIT ✅ | MIT ✅ |
| Runtime perf on huge files | ⚠️ ok w/ caching | ✅ native | ✅ native |

The alignment requirement is decisive: we render each page to a bitmap and control zoom/pan ourselves with gesture-handler + reanimated, so the SVG annotation overlay shares the exact same transform — no drift, satisfying the golden acceptance criteria. pdf.js is Apache-2.0 (passes ADR-001 license gate).

Architecture: one hidden `react-native-webview` (1×1, transparent — `PdfEngineHost.tsx`) hosts an HTML shell with the bundled pdf.js ESM build (`assets/pdfjs/pdf.min.mjs` + `pdf.worker.min.mjs`), embedded as base64 blobs and loaded fully offline via `pdfjs-sources.ts` + `pdfjs-html.ts` (no fetch). RN sends commands via `postMessage` (`open(bytes)`, `renderPage(page, scale)`, `extractText(page)`); the engine (`WebViewPdfEngine` in `pdfjs-engine.ts`) correlates responses by request id. WebView returns `Uint8Array`-free results: JPEG/PNG data URLs for pages, JSON text items for extraction. Page bitmaps are cached to `cache/pages/<docId>` via expo-file-system (`bitmap-cache.ts`) to avoid re-render.

**Swap path:** `PdfEngine` interface isolates all feature code; a native renderer (react-native-pdf) can replace the WebView implementation without touching viewer/annotation code.

### D2 — Modifier/Exporter: pdf-lib (pure JS)
pdf-lib (MIT) performs page ops (rotate/delete/reorder/extract) and writes annotations (highlight/underline/strikeout as QuadPoints, ink, text, images) and flattening at export — this is the "Modifier" half of the blueprint's Renderer/Modifier split. Introduced now as a dependency; used in `document-ops`. No native code, works in Expo Go.

### D3 — Reading flow: SAF picker + persistable permission
- `expo-document-picker.getDocumentAsync({ type: 'application/pdf', copyToCacheDirectory: false })` returns a `content://` URI.
- We read bytes via the new `expo-file-system` `File` API (which handles content:// on Android) into memory/bytes, pass to the engine. Persistable permission: Android grants persistable access to SAF-picked URIs automatically via `ACTION_OPEN_DOCUMENT` (the picker request includes persistable flags; expo-document-picker uses ACTION_OPEN_DOCUMENT). We record the URI + name + size in the metadata store.
- External intents (`ACTION_VIEW`/`ACTION_SEND`): declared via `app.json` `android.intentFilters`. Expo Router `Linking.getInitialURL()` + `useLinking` event surfaces the incoming `content://` URI; because external grant is typically single-session, we **copy the file into `Paths.document/cache/imports/<uuid>.pdf`** (ADR-008) and open from there, recording it in recents.

### D4 — Owned gesture canvas (annotation-ready)
`PdfCanvas` component: `GestureDetector` (Pinch + Pan from react-native-gesture-handler, animated with reanimated shared values `scale`, `tx`, `ty`) wrapping an `Animated.View` that contains the page `<Image>` (from cached PNG) and — in a later change — the SVG annotation overlay. Because both live in the same transformed container, alignment is automatic. Double-tap toggles 1x/2x. Page navigation swaps the bitmap (rendered at current zoom's target scale, max clamped).

### D5 — Coordinate contract (ADR-003)
- Canonical storage space: **PDF points, bottom-left origin** (ISO 32000) — annotations are stored this way and exported unchanged.
- View/render space: **pixels, top-left origin** (RN screen + pdf.js viewport).
- `src/engine/coordinates.ts` provides the bijective transforms:
  - `pdfRectToScreen(rect, pageHeightPts, scale)` → `{x, y, w, h}` screen px (y flipped: `screenY = (pageHeightPts - pdfY - h) * scale`)
  - `screenToPdfPoint(point, pageHeightPts, scale)` → PDF points
  - `screenRectToPdfRect(screen, pageHeightPts, scale)` → PDF-point rect
  - `pdfRectToQuadPoints(rect, pageHeightPts)` → PDF QuadPoints array for export
  - `rotatePdfRect(rect, pageW, pageH, rotation)` → rect after 90/180/270 CW rotation
- pdf.js viewport: use `viewport = page.getViewport({ scale })` whose coordinate space is already top-left pixels with the PDF points scaled — so `pdfToScreen` is mostly a y-flip from PDF points.

### D6 — Search
Reuse the same WebView engine: `extractText(page)` → pdf.js `getTextContent` → items `{str, transform}` → normalize to PDF-point bounding boxes → search scans all pages (progressively, page-by-page, off the render queue) → results `{page, hits: PdfRect[]}`. Tapping a hit navigates to its page and shows a temporary highlight rect on the canvas. Scanned pages yield empty text → "no text layer" empty state.

### D7 — Thumbnails
WebView renders small scales (e.g. width 160px) async, cached in `cache/thumbnails/<docId>/<page>.png`. Thumbnail sheet = FlatList grid; generation is queued so the UI never freezes (satisfies progressive thumbnails spec).

### D8 — Performance strategy
- Render at device pixel ratio, clamp max zoom scale to 4x (configurable).
- LRU bitmap cache (memory Map + disk) with pre-render of next/prev page.
- Cold open: open bytes + render page 1 at display scale — target < 1.5s; page turn swaps cached bitmaps (< 150ms).

## Risks / Trade-offs

- **WebView pdf.js perf on 50MB+ scan PDFs:** mitigated by LRU cache, pre-render, capped zoom scale; native renderer swap path exists if insufficient (D1).
- **WebView memory on huge files:** bytes held in JS bridge; acceptable for MVP budget (test `large.pdf` in golden suite later).
- **pdf-lib rendering fidelity:** pdf-lib is for modification; all *display* is pdf.js. pdf-lib never re-renders.
- **New Architecture:** gesture-handler v2 + reanimated 4 are New-Arch ready (RN 0.86).
- **Expo Go preview:** WebView, gesture-handler, reanimated, svg all run in Expo Go — no dev build required for the viewer change.
