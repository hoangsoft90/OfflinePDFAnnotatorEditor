## 1. Engine layer

- [ ] 1.1 Add deps: `react-native-webview`, `react-native-gesture-handler`, `react-native-reanimated`, `react-native-svg`, `pdfjs-dist`, `pdf-lib`; bundle pdf.js legacy build as an asset (`assets/pdfjs/`)
- [ ] 1.2 `src/engine/types.ts`: `PdfEngine` interface (open, pageCount, pageSize, renderPage, extractText), `PdfRect`, `TextItem`, `PdfDocument` types
- [ ] 1.3 `src/engine/pdfjs-webview-engine.ts`: WebView host, message protocol (`open`, `renderPage`, `extractText`, `destroy`), PNG/JSON results, error channel
- [ ] 1.4 `src/engine/coordinates.ts`: `pdfToScreen`, `screenToPdf`, `pdfRectToQuadPoints`, y-flip helpers (ADR-003)
- [ ] 1.5 `src/engine/bitmap-cache.ts`: LRU memory + disk cache (`cache/pages/<docId>/<page>@<scale>.png`)

## 2. Open flows

- [ ] 2.1 `src/files/open.ts`: SAF pick via expo-document-picker (application/pdf), read bytes, metadata upsert, return `Document`
- [ ] 2.2 `src/files/imports.ts`: copy external-intent URI to `cache/imports/<uuid>.pdf` (ADR-008), record recents
- [ ] 2.3 Intent handling: `android.intentFilters` for application/pdf in app.json; `Linking.getInitialURL` + event listener in app shell → route to viewer
- [ ] 2.4 `app/viewer/[docId].tsx` route + `src/screens/viewer/` wiring: load document, engine open, error/unavailable states with remove-from-recents action

## 3. Viewer UI

- [ ] 3.1 `src/components/pdf/PdfCanvas.tsx`: gesture container (pinch/pan/double-tap), bitmap display, page-size aspect, reanimated transform
- [ ] 3.2 Page navigation: toolbar prev/next, page indicator `n/N`, `PdfCanvas` page swap with pre-render of neighbors
- [ ] 3.3 `src/components/pdf/ThumbnailsSheet.tsx`: async thumbnail grid, jump-to-page, generation queue
- [ ] 3.4 `src/screens/viewer/ViewerScreen.tsx`: compose toolbar + canvas + sheet; loading state; dark surroundings (theme from foundation)

## 4. Search

- [ ] 4.1 `src/engine/search.ts`: progressive `extractText` over pages, query matching (case-insensitive, whole-word flag), `SearchResults` model
- [ ] 4.2 `src/screens/viewer/SearchBar.tsx`: input, results list (page + hit count), tap → navigate + temporary highlight rect on canvas
- [ ] 4.3 Empty/scanned state: "no text layer" message

## 5. Recent files integration

- [ ] 5.1 Home screen: tap recent → viewer; favorites filter; clear-recents action wired to cleanup service
- [ ] 5.2 Open-via-picker from Home toolbar ("Open PDF" button)

## 6. Validation

- [ ] 6.1 `npx tsc --noEmit` passes
- [ ] 6.2 `npx expo export --platform android` bundle passes; manifest audit still green (no INTERNET)
- [ ] 6.3 Smoke test: open a sample PDF, navigate pages, pinch-zoom, search a known word, verify thumbnails render

## 7. Code review findings (2026-08-13)

- [x] **On-device bug (fixed, rebuild in flight — run `31658949336`): black page, no bitmap.** `engine.open()` succeeded (bridge OK: header shows "Trang 1/1") but `renderPage` never resolved and the error was swallowed (empty `catch` + `request()` without timeout). Root cause: the engine WebView was kept hidden (1×1, `opacity: 0`, offscreen) → Android suspends the compositor/canvas → `page.render().promise` never settles in the hidden WebView. Proven pdf.js works on-device (rendered the same bridge HTML + pdf.js 6.2.108 in Chrome = same WebView engine, via tailscale). Fix (`f192810`): WebView 320×480 + `opacity: 0.01` + `androidLayerType="software"`; `request()` now has a 30s timeout and surfaces failures; WebView `console`/JS errors forwarded to RN logs for future diagnostics. **Rule for this module: never fully hide the engine WebView (visibility tricks suspend rendering); always timeout async bridge calls; never swallow render errors.**
- [ ] **Cosmetic UX — zoom not reset on page change:** `PdfCanvas` pinch/pan/double-tap live in reanimated shared values; `scale`/`tx`/`ty` persist across `pageIndex` changes, so switching pages keeps the zoomed state. Candidate fix: `canvasRef.current?.reset()` in `goToPage`. Note: the transform-container design (bitmap + annotation overlay in the same transformed stage) keeps annotations pixel-aligned at any zoom — `onScaleChange` no-op is intentional.
- [ ] **Minor logic — interstitial on failed open / conflict reload:** `ViewerScreen`'s unmount cleanup calls `showInterstitialIfDue()` unconditionally, including when the doc failed to open (`state='error'`) or during `router.replace` (conflict reload) → an ad can appear right when the user hit an error. Candidate fix: gate on `pageCount > 0` (only when a document was actually opened).
