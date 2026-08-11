## Why

The repo is empty — there is no app at all. Before any PDF feature can exist, we need the Expo React Native application shell, the privacy-first contract, and the local storage & metadata foundation that every later capability (viewer, annotation, signature, document ops) depends on. This is the platform layer translated from the Flutter blueprint in `.plan/plan2.md` (sections 3-4) to an Expo SDK 56 / TypeScript stack.

## What Changes

- Scaffold an Expo SDK 56 React Native app (TypeScript, expo-router file-based navigation, tabs) in the repo root.
- Define the app shell: Home (recent files), Settings screens, root layout with theme + providers.
- Lock the **privacy contract** (ADR-006): no INTERNET permission in the release manifest, zero outbound network calls, no analytics/crash-reporting SDKs, all data local.
- Define the **storage layout** (ADR-002): app-private directories per `docId` for Project JSON + assets, thumbnail cache, signature assets; metadata never stored as PDF BLOB.
- Add the **metadata database** (SQLite via expo-sqlite): documents table with recent/favorites semantics.
- Define the core data models shared by all future changes: `Document`, `Project`, `Annotation`, `AnnotationGeometry`, `Signature`, with stable `pageId` identity (ADR-007).

## Capabilities

### New Capabilities
- `app/shell`: application shell, navigation structure, theme, and provider wiring.
- `privacy/contract`: offline-only privacy guarantees — no network permission, no analytics, no outbound data.
- `storage/layout`: app-private storage directory layout and lifecycle (ADR-002).
- `storage/metadata`: SQLite metadata store for documents, recents, and favorites.

### Modified Capabilities
- (none — greenfield repo)

## Impact

- New Expo project: `package.json`, `app.json`, `tsconfig.json`, `app/` (expo-router), `src/`.
- Dependencies added: expo-router, expo-sqlite, expo-file-system, expo-document-picker (used by later changes), zustand, react-native-safe-area-context, etc.
- No existing code is affected — this is the first change on the repo.
