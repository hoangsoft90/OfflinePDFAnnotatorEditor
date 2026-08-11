## Purpose

Locks the product's core promise — "Your PDFs never leave your device" — as an enforceable contract: the app is fully functional offline, performs no network calls, and contains no analytics or third-party tracking.

> **⚠ OVERRIDDEN (2026-08-11, user decision):** The "No INTERNET permission in release builds" requirement below is deliberately overridden — the release manifest now declares `android.permission.INTERNET` and `android:usesCleartextTraffic="true"` (http allowed for all domains), configured via `expo-build-properties` in `app.json`. The privacy plugin (`plugins/with-no-internet.js`) was removed and `scripts/audit-manifest.js` now fails if INTERNET/cleartext are MISSING. The app still performs no proactive network calls and contains no analytics SDKs; the remaining requirements below (zero outbound calls, no analytics) stay valid.

## ADDED Requirements

### Requirement: No INTERNET permission in release builds
The release Android manifest MUST NOT declare the INTERNET permission. The app MUST run all P0 features (open, view, annotate, sign, organize, save/export, search) with network access fully disabled.

#### Scenario: Release build has no internet permission
- **WHEN** a release Android build is installed and the system network is turned off
- **THEN** every P0 feature works identically and no permission for INTERNET is granted

#### Scenario: Debug builds may differ
- **WHEN** a debug/development build is inspected
- **THEN** INTERNET permission may be present for Metro bundler connectivity, but release manifests MUST exclude it

### Requirement: Zero outbound network calls
The app MUST NOT initiate any network request from any feature code path. No PDF content, annotation, signature, thumbnail, or metadata is transmitted.

#### Scenario: Network profiler on release build
- **WHEN** a network profiler observes the release app during open, annotate, sign, organize, save, and export flows
- **THEN** zero bytes of outbound traffic are recorded

### Requirement: No analytics or crash-reporting SDKs
The app MUST NOT include analytics, telemetry, or crash-reporting SDKs that transmit data off-device. Dependency audits MUST be performed before any release.

#### Scenario: Dependency audit gate
- **WHEN** a new dependency is proposed for the project
- **THEN** it is audited for network/telemetry behavior and rejected if it transmits data without user action
