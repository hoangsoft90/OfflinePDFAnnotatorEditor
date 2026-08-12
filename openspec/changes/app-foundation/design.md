## Context

Greenfield repo. The product blueprint (`.plan/plan2.md`) targets Flutter + PDFium; this project deliberately uses **Expo React Native + TypeScript** per user decision. The blueprint's ADRs (001-009) are translated to the Expo ecosystem here and in later changes. Key adaptation: the plan's "PDF engine abstraction + isolate rendering" becomes a TS `PdfEngine` interface; storage via `expo-file-system` + `expo-sqlite`; SAF via `expo-document-picker` (Android ACTION_OPEN_DOCUMENT); no-INTERNET enforced at the AndroidManifest level.

Environment: Expo SDK 57 (August 2026, RN 0.86, New Architecture always on, expo-router default), OpenSpec CLI 1.8.0, Node 24.

## Goals / Non-Goals

**Goals:**
- Ship a runnable Expo app shell with tabs, theme, and DB-backed recent list.
- Enforce the privacy contract (no INTERNET permission in release manifest, no network libs).
- Define the shared storage layout and data models exactly once, so later changes build on them.
- Keep every decision behind the same `PdfEngine`/store interfaces the blueprint demands.

**Non-Goals:**
- No PDF rendering/annotation yet (change `pdf-viewer`).
- No signature, page ops, or export (later changes).
- No iOS-specific work beyond what Expo provides by default (Android-first per user).

## Decisions

### D1 — Expo SDK 56 + expo-router (file-based tabs)
Scaffold via `npx create-expo-app` default template (already includes expo-router, TS, tabs). All routes live under `src/app/` (expo-router `src` directory): `src/app/(tabs)/index.tsx` (Home), `src/app/(tabs)/settings.tsx`. Viewer/organizer/signature screens mount at `src/app/viewer/[docId].tsx`, `src/app/organizer/[docId].tsx` and `src/app/signature-pad.tsx` without touching the tab bar (spec: deep-linkable routes).

### D2 — State management: zustand + stores
Blueprint's BLoC/Riverpod maps to zustand stores on RN. Three stores in foundation: `useMetadataStore` (documents/recents/favorites backed by SQLite), `useThemeStore` (appearance). Later changes add `useProjectStore`, `useAnnotationStore`, `useCommandStack`. Rationale: minimal boilerplate, no codegen, works with New Architecture.

### D3 — Metadata DB: expo-sqlite (async API)
`openDatabaseAsync` (`src/db/schema.ts`) + a typed repository factory `createMetadataRepo()` returning a `MetadataRepo` interface (`src/db/metadata-repo.ts`). No `SQLiteProvider` wrapper — the root layout initializes the repo directly into the metadata store. Single `documents` table (schema in spec). Migration strategy: `PRAGMA user_version` + simple versioned migration runner. No ORM — small typed data-access module (`src/db/documents-repo.ts`) keeps the DB layer swappable; web resolves a localStorage adapter (`documents-repo.web.ts`).

### D4 — Storage layout via expo-file-system (new object API)
`Paths.document` root with:
- `projects/<docId>/project.json` + `assets/` (signature images, stamps)
- `signatures/` (kept separate from thumbnails per ADR-006 sensitivity policy)
- under `Paths.cache`: `cache/thumbnails/<docId>/` (page previews), `cache/pages/<docId>/` (rendered page bitmaps), `cache/imports/` (copies of externally-opened PDFs, ADR-008), `cache/share/` + `cache/duplicates/` (temporary export copies)
Original PDF is NEVER copied into app storage by the viewer path (read via content URI); the only explicit copies are the `cache/imports/` copies for external-intent PDFs. Workspace is created lazily on first open by the `ProjectManager` (change `annotation`), but the layout constants + helpers are defined here (`src/storage/storage-paths.ts`, plus web variants `storage-paths.web.ts` / `workspace.web.ts` / `cleanup.web.ts` / `web-fs.ts`).

### D5 — Privacy enforcement
- `app.json`: `android.permissions` only lists what's needed. **OVERRIDDEN (2026-08-11, user decision):** release manifest now declares `android.permission.INTERNET` and `android:usesCleartextTraffic="true"` (http for all domains) via `expo-build-properties`; the strip-INTERNET config plugin was removed and `scripts/audit-manifest.js` now fails CI if INTERNET/cleartext are missing. The app performs no proactive network calls and has no analytics SDKs.
- No analytics/crash SDKs — dependency audit listed as a task.

### D6 — Data models in `src/models/`
Pure TS types (no class magic) so they serialize straight to JSON/SQLite: `Document`, `Project`, `Annotation`, `AnnotationGeometry`, `Signature`, plus `PageId`-based identity map. `pageOrder: string[]` holds page ids (ADR-007 — annotations reference `pageId`, never index). Defined in foundation so all later changes import the same types.

### D7 — Monorepo-free, flat layout
Expo app at repo root (no `/mobile` subfolder) because the repo is the app. `openspec/` lives beside it.

### D8 — AdMob monetization with real IDs (recorded 2026-08-11)
`react-native-google-mobile-ads` (banner adaptive cuối Home/Viewer, interstitial khi rời viewer với cooldown 90s, rewarded trong Settings) được cấu hình bằng **ID thật từ AdMob console**:
- App ID `ca-app-pub-6917313063209470~1623325977` điền vào `app.json` plugin `react-native-google-mobile-ads` (`androidAppId`/`iosAppId`) và đồng bộ vào `android/app/src/main/AndroidManifest.xml` (`com.google.android.gms.ads.APPLICATION_ID`).
- Ad units thật trong `src/ads/ads-config.ts` (`REAL_ADS`): Banner `.../1017535323`, Interstitial `.../7750464636`, Rewarded `.../1061199133`. `__DEV__` luôn dùng test ad unit chính thức của Google; release mới dùng ID thật.
- **`google-services.json` đã wire vào build:** `app.json` khai báo `android.googleServicesFile: "./google-services.json"` (package `com.offlinepdf.annotator`, khớp `applicationId` trong `android/app/build.gradle`); Expo prebuild sẽ copy sang `android/app/google-services.json` và áp dụng gradle plugin `com.google.gms.google-services`. File này không bắt buộc cho AdMob (SDK đọc App ID từ manifest) nhưng được giữ để tương thích Firebase/Analytics.
- **Compliance:** UMP consent (`src/ads/consent.ts`) tự chạy khi khởi động; mặc định non-personalized trừ khi user đồng ý; iOS có `NSUserTrackingUsageDescription`.
- ⚠ **iOS:** App ID + ad units hiện dùng chung giá trị Android — trước khi build iOS phải tạo app iOS riêng trên AdMob console và thay `iosAppId` + mục `ios` trong `REAL_ADS`.
- Vì SDK có native code, app không chạy trong Expo Go — dùng `npx expo run:android` hoặc EAS Build.

## Risks / Trade-offs

- **expo-sqlite vs plain JSON files:** SQLite chosen for query flexibility (favorites filter, ordering); risk: slightly more setup. Mitigated by small repo layer.
- **No INTERNET in release + Expo defaults:** Expo tooling sometimes injects permissions; mitigated by the CI manifest audit task.
- **create-expo-app default template churn:** SDK 56 template may differ from assumptions; treat template as starting point and adjust.
- **New Architecture only (RN 0.85):** all chosen libs are New-Arch-ready (expo modules, zustand, reanimated 4).
