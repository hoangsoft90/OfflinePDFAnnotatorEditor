# Offline PDF Annotator & Editor

**"Your PDFs never leave your device."** — privacy-first PDF workspace for Android, built with **Expo (React Native) + TypeScript**.

App mở, xem, chú thích (highlight/pen/text/shapes), chữ ký, sắp xếp trang, và xuất PDF — **không tài khoản, không analytics**. Toàn bộ dữ liệu PDF/chú thích/chữ ký nằm trong app-private storage; app không chủ động gửi dữ liệu đi đâu. Nguồn gốc thiết kế: `.plan/plan2.md` (blueprint Flutter) được dịch sang Expo stack; các ADR trong blueprint được giữ về mặt contract, riêng **ADR-006 (no-INTERNET) đã được ghi đè theo quyết định**: manifest có quyền INTERNET và cho phép http cleartext.

---

## Stack

| Layer | Lựa chọn | Ghi chú |
|---|---|---|
| Framework | **Expo SDK 57 / React Native 0.86** | New Architecture bắt buộc, TypeScript strict |
| Navigation | **expo-router** | file-based routing, tabs (Home / Cài đặt) |
| State | **zustand** | metadata, project, annotation, tool stores |
| PDF Render | **pdf.js (WebView)** | render trang → bitmap, extract text, tìm kiếm — chạy ngoài JS thread |
| PDF Modify/Export | **pdf-lib** (pure JS) | page ops (rotate/delete/reorder/extract), ghi annotation, flatten |
| Annotation Overlay | **react-native-svg** | nằm trong cùng container transform với page bitmap (không lệch khi zoom) |
| Gestures | **react-native-gesture-handler + reanimated** | pinch/pan/double-tap, vẽ chú thích |
| Storage | **expo-file-system** (object API) | workspace JSON, thumbnails cache, signatures dir |
| Metadata DB | **expo-sqlite** | documents (recent, favorites) |
| SAF / Share | **expo-document-picker / expo-sharing** | mở PDF qua system picker, chia sẻ bản sao |
| Ads (AdMob) | **react-native-google-mobile-ads** | banner (Home/Viewer), interstitial (khi rời viewer), rewarded (Settings); cần dev build |

## Cấu trúc

```
src/
  app/                  # expo-router routes: (tabs), viewer/[docId], organizer/[docId], signature-pad
  models/               # Document, Project, Annotation, Signature, Page (pageId identity)
  engine/               # PdfEngine interface, pdf.js WebView engine, coordinates (ADR-003), cache
  components/pdf/       # PdfCanvas, AnnotationCanvas, AnnotationOverlay, Toolbar, Thumbnails, ...
  commands/             # Command pattern + stack (ADR-005)
  journal/              # append-only journal + autosave + crash recovery (ADR-005)
  project/              # ProjectManager, page identity (ADR-007), conflict detection (ADR-009)
  signatures/           # signature repo + pad (ADR-006)
  export/               # exporter (pdf-lib), annotation writer, flatten, atomic write (ADR-004)
  storage/  db/  files/ # storage layout, SQLite repo, SAF open + external imports (ADR-002/008)
  store/  tools/  hooks/# zustand stores, tool registry, theme
scripts/audit-manifest.js    # audit: release manifest phải có INTERNET + usesCleartextTraffic=true (http cho mọi domain)
```

## Bản đồ ADR (plan2.md → Expo)

| ADR | Blueprint (Flutter) | Implementation (Expo) |
|---|---|---|
| ADR-001 Engine | PDFium qua pdfrx/pdfx | pdf.js (WebView) render + pdf-lib modify; giữ `PdfEngine` interface |
| ADR-002 Storage/SAF | DocumentFile + ContentResolver | expo-document-picker + expo-file-system, workspace app-private |
| ADR-003 Coordinates | PDF points (bottom-left) | `src/engine/coordinates.ts` — pdf↔screen bijective transform |
| ADR-004 Save/Export | atomic tmp→fsync→rename | `src/export/atomic.ts`; Save a copy mặc định, Overwrite có xác nhận |
| ADR-005 Undo/Redo | Command + journal | `src/commands/*` + `src/journal/*` (jsonl, recovery dialog) |
| ADR-006 Privacy | No INTERNET (đã được ghi đè theo quyết định) | app không gọi mạng chủ động; manifest có INTERNET + `usesCleartextTraffic=true` (http mọi domain) |
| ADR-007 Page Identity | pageId | `pageOrder: PageId[]`, annotation refs pageId |
| ADR-008 External Open | ACTION_VIEW/SEND | intentFilters + copy sang cache/imports (persist session) |
| ADR-009 Conflict | fingerprint | `src/project/conflict.ts` — block overwrite, dialog reload/export |

## Chạy app

```bash
npm install
npx expo start              # dev client (⚠ AdMob có native code → KHÔNG chạy trong Expo Go)
npx expo run:android        # dev build (cần Android SDK)
```

> **Network & HTTP:** release manifest có `android.permission.INTERNET` và `android:usesCleartextTraffic="true"` (qua `expo-build-properties`) — app có thể gọi mạng và http:// hoạt động với mọi domain. App code không chủ động gọi mạng (không analytics SDK).

### Validate

```bash
npx tsc --noEmit            # typecheck
npx expo lint               # lint
npx expo export --platform android   # bundle check
node scripts/audit-manifest.js       # network gate (INTERNET + cleartext http enabled)
openspec validate --all    # OpenSpec changes
```

## OpenSpec

Toàn bộ kế hoạch nằm trong `openspec/changes/` — 5 changes đầy đủ artifacts (proposal / specs / design / tasks):

1. **app-foundation** — shell, privacy contract, storage layout, metadata DB, models
2. **pdf-viewer** — engine, SAF open, viewer, zoom/pan, thumbnails, search, recents, external-open
3. **annotation** — model (pageId), tools, undo/redo, autosave + crash recovery
4. **signature** — signature pad, storage, placement
5. **document-ops** — page organizer, save/export atomic, conflict detection

## Ads (AdMob)

- SDK: **`react-native-google-mobile-ads`** — banner adaptive (cuối Home + Viewer), interstitial (khi rời viewer, cooldown 90s), rewarded (Settings → "Xem quảng cáo ủng hộ").
- **ID thật (đã điền cho Android):** App ID `ca-app-pub-6917313063209470~1623325977` trong `app.json`; ad units Banner `.../1017535323`, Interstitial `.../7750464636`, Rewarded `.../1061199133` trong `src/ads/ads-config.ts` (`REAL_ADS`). Dev dùng test ad unit ID chính thức của Google (`__DEV__`).
- **iOS:** cần tạo app iOS riêng trên [AdMob console](https://admob.google.com) → lấy App ID + ad units riêng (AdMob ID theo từng platform) → cập nhật `iosAppId` trong `app.json` và mục `ios` trong `REAL_ADS`.
- **Compliance:** UMP consent (GDPR/EEA) tự chạy khi khởi động (`src/ads/consent.ts`); iOS có `NSUserTrackingUsageDescription` (ATT) trong `app.json`. Mặc định quảng cáo **non-personalized** trừ khi user đồng ý.
- **Web:** AdMob không hỗ trợ web — banner/init/interstitial/rewarded là no-op trên web (`.web.ts`).
- ⚠ Vì SDK có native code, app **không chạy trong Expo Go** — dùng `npx expo run:android` hoặc EAS Build.

## Privacy & Network

- **INTERNET permission có trong release** và `android:usesCleartextTraffic="true"` (http cho mọi domain) — theo quyết định cho phép truy cập mạng. Audit script (`scripts/audit-manifest.js`) fail CI nếu thiếu 1 trong 2.
- App code **không chủ động gọi mạng** và không có analytics / crash-reporting SDK.
- PDF, annotation, chữ ký, thumbnail đều nằm trong app-private storage.
- Thumbnails & recents có thể xóa trong Settings; workspace chưa lưu không bị xóa.
