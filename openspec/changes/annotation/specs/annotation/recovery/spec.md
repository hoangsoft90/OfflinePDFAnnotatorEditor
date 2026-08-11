## Purpose

Defines crash-safe persistence: every command is journaled, sessions are recoverable after process death, and the user is never silently surprised by lost or overwritten work (ADR-005).

## ADDED Requirements

### Requirement: Autosave
Annotation changes MUST be autosaved to the project workspace (Project JSON + append-only journal) automatically after each command and on backgrounding, without a manual save action.

#### Scenario: Autosave after command
- **WHEN** the user completes a pen stroke
- **THEN** the stroke is persisted to the workspace journal and the project's dirty flag is set

### Requirement: Crash recovery
If the app process is killed while a project is dirty, reopening the app MUST detect the pending journal and offer to recover the unsaved session ("Recover unsaved changes?"). Recovery MUST replay the journal and restore the annotation state.

#### Scenario: Kill during edit then reopen
- **WHEN** the app is killed mid-edit and reopened
- **THEN** the user is offered recovery and, on accept, the annotations are restored from the journal

### Requirement: Dirty-state leave prompt
When the user leaves the viewer with unsaved changes, the app MUST prompt with explicit choices: Continue editing / Save / Discard. Saving writes the project (and flattens to an export only when the user chooses Save in the export flow).

#### Scenario: Leave viewer with changes
- **WHEN** the user has unsaved annotation changes and attempts to leave the viewer
- **THEN** the app shows Continue editing / Save / Discard and only discards after confirmation

### Requirement: Non-destructive journal
The journal MUST be append-only and never rewrite or erase prior entries during a session; recovery replays entries in order. A session boundary (new session marker) MUST be recorded so a fresh session does not replay old ones.

#### Scenario: Two sessions
- **WHEN** the user recovers session 1, then later kills and recovers session 2
- **THEN** session 1's commands are not replayed into session 2
