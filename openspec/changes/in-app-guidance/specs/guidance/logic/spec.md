## Purpose

Defines when guidance appears, when it hides, and the rules that keep it from annoying the user — a per-feature state machine with a session budget, persistence, and a centralized copy registry.

## ADDED Requirements

### Requirement: Per-feature guidance state machine
Each guided feature MUST have a state (`unseen → shown → dismissed | completed`) with counters (`shownCount`, `dismissedCount`, `completedCount`, `usageCount`, `helperOpenedCount`, `helperActionCount`) and timestamps. Transitions MUST be recorded via a single store API (`markShown`, `markDismissed`, `markCompleted`, `markUsed`, `markHelperOpened`, `markHelperAction`).

#### Scenario: Complete once, never re-nag
- **WHEN** a user completes the annotation-intro spotlight
- **THEN** the spotlight is never shown for that feature again, even in later sessions

#### Scenario: Two uses prove knowledge
- **WHEN** the user uses a guided feature for the 2nd time
- **THEN** the feature is marked completed and its badge/tooltip stop appearing

### Requirement: Trigger rules
The app MUST trigger guidance by rule: Spotlight on first use of a core feature; Tooltip on first tap of the anchor; Contextual Helper on a blocked/unavailable action; Badge while a feature is unseen (or recently dismissed). Guidance MUST NOT appear before the user has reached the relevant screen.

#### Scenario: Spotlight on first annotating session
- **WHEN** the user enables annotating in a document for the first time
- **THEN** the annotation-intro spotlight starts (and only once)

### Requirement: Non-intrusiveness (frequency budget)
The app MUST limit guidance to at most **1 spotlight** and **2 tooltips** per app session, MUST NOT show two guidance surfaces at the same time, MUST cooldown a dismissed spotlight for **7 days** before re-offering it, MUST auto-hide badges after **2 uses** or **14 days**, and MUST respect the user's reduced-motion accessibility preference by skipping animations.

#### Scenario: Session budget is exhausted
- **WHEN** a spotlight and 2 tooltips have already been shown in the current session
- **THEN** no further spotlight or tooltip guidance is shown until the next app launch

### Requirement: Local persistence
Guidance state MUST be persisted locally as `guidance/state.json` under the app-private document directory (native, written atomically) or `localStorage['guidance.state.v1']` (web). State MUST survive app restarts and MUST NOT be transmitted anywhere.

#### Scenario: State survives restart
- **WHEN** the user dismisses a spotlight and later restarts the app
- **THEN** the dismissal is remembered and the spotlight is not re-offered before the cooldown

### Requirement: Centralized copy registry
All guidance copy (tooltip sentences, spotlight steps, helper content, badge labels) MUST live in `src/guidance/registry.ts` keyed by feature id, so Dev and UI Designer can tune wording without changing components or integration sites.

#### Scenario: Rewording a tooltip
- **WHEN** the UI Designer changes the signature tooltip text in the registry
- **THEN** the toolbar shows the new text with no component changes
