## Purpose

Defines how documents are opened from the Android system: the SAF document picker with persistable access, and PDFs opened from external apps (Gmail, Drive, WhatsApp) via ACTION_VIEW/ACTION_SEND intents.

## ADDED Requirements

### Requirement: Open via system document picker
The app MUST open a PDF through Android SAF (ACTION_OPEN_DOCUMENT via expo-document-picker) and MUST attempt to persist read access to the chosen URI across app restarts.

#### Scenario: Pick a PDF
- **WHEN** the user taps "Open PDF" and picks a file in the system picker
- **THEN** the app opens it, records it in recents, and retains access for later sessions if the system grants a persistable permission

### Requirement: External intent open (ADR-008)
The app MUST declare an intent filter for `application/pdf` (ACTION_VIEW and ACTION_SEND) so other apps can open/share PDFs into it. When opened via a temporary (non-persistable) intent URI, the app MUST immediately copy the PDF into app-private storage so it remains usable after the intent session ends, and MUST record it in recents.

#### Scenario: Open PDF from Gmail
- **WHEN** the user opens a PDF attachment from Gmail into the app
- **THEN** the PDF is copied into app-private storage, opened in the viewer, and listed in recents even after the app is restarted

#### Scenario: Temporary access fallback
- **WHEN** persistable permission cannot be obtained for an external URI
- **THEN** the app still opens the PDF for the session from the copied file and labels it appropriately in recents

### Requirement: Unavailable URI handling
Opening a document whose URI is no longer readable MUST show a clear error with the option to remove the entry, never a silent crash.

#### Scenario: Deleted source file
- **WHEN** the user opens a recent document whose source file was deleted externally
- **THEN** the app shows "Document unavailable" with actions to remove it from recents or choose a new file
