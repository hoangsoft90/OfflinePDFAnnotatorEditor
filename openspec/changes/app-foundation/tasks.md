## 1. Scaffold the Expo app

- [ ] 1.1 Run `npx create-expo-app@latest . --template default` (or equivalent SDK 56 default) in repo root; verify `app/`, `package.json`, `app.json`, `tsconfig.json` exist and the app boots in Expo
- [ ] 1.2 Pin dependencies: expo-sqlite, expo-file-system, expo-document-picker, zustand, expo-build-properties; run `npx expo install --check`
- [ ] 1.3 Configure `app.json`: app name "Offline PDF Annotator & Editor", package id `com.offlinepdf.annotator`, `userInterfaceStyle`, android permissions list (no INTERNET in release)

## 2. App shell

- [ ] 2.1 Set up expo-router tabs: `app/(tabs)/_layout.tsx`, `app/(tabs)/index.tsx` (Home), `app/(tabs)/settings.tsx`
- [ ] 2.2 Root layout `app/_layout.tsx`: theme provider, SQLite provider, metadata store init with error boundary + retry
- [ ] 2.3 Theme module `src/theme/`: colors (light/dark), typography, spacing, elevation tokens; dark appearance used by viewer later
- [ ] 2.4 Home screen UI: recent documents list (placeholder until pdf-viewer change fills it), favorites toggle, empty state; Settings screen with storage-clear controls (wired in this change, storage ops in D4)

## 3. Storage layer

- [ ] 3.1 `src/storage/storage-paths.ts`: directory constants + helpers (`projectDir(docId)`, `thumbnailCacheDir`, `signaturesDir`, `assetsDir`)
- [ ] 3.2 `src/storage/workspace.ts`: create workspace for docId, ensure dirs exist, resolve project.json path
- [ ] 3.3 Storage cleanup service `src/storage/cleanup.ts`: clear recents + thumbnails (guards: never clears workspaces with unsaved changes)

## 4. Metadata database

- [ ] 4.1 `src/db/schema.ts`: `documents` table (id, uri, name, size, pageCount, lastOpened, modifiedAt, isFavorite) + `PRAGMA user_version` migration runner
- [ ] 4.2 `src/db/documents-repo.ts`: upsert, listRecent(limit 50), toggleFavorite, deleteRow, getById
- [ ] 4.3 `src/store/use-metadata-store.ts` (zustand): load recents on init, favorite toggle, add/update document rows; expose to Home screen
- [ ] 4.4 Unavailable-URI handling: read attempt wrapper that marks rows unavailable + remove-from-recents action

## 5. Data models & privacy gate

- [ ] 5.1 `src/models/`: `document.ts`, `project.ts`, `annotation.ts`, `signature.ts`, `page.ts` (PageId, PageMeta, pageOrder helpers) — pure TS types per design D6
- [x] 5.2 Privacy: ~~`scripts/audit-manifest.ts` — fail if release manifest contains INTERNET~~ — **OVERRIDDEN (2026-08-11):** `scripts/audit-manifest.js` now fails if release manifest is MISSING INTERNET + `usesCleartextTraffic="true"`; `plugins/with-no-internet.js` removed
- [ ] 5.3 Dependency audit note in README (no analytics/crash SDKs) + Settings shows "100% offline" indicator

## 6. Validation

- [ ] 6.1 `npx tsc --noEmit` passes
- [ ] 6.2 `npx expo export --platform android` (bundle only) passes; manifest audit script passes
- [ ] 6.3 Smoke-test app boot in Expo (or `npx expo start` web fallback if emulator unavailable)
