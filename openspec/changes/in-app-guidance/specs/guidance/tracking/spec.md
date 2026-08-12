## Purpose

Defines how guidance effectiveness is measured locally — privacy-first (ADR-006): counters and timestamps persisted on-device, no network, with a metrics API for future analytics decisions.

## ADDED Requirements

### Requirement: Local guidance counters
The app MUST record, per guided feature: how many times guidance was shown, dismissed (skipped), completed, and how many times the feature was actually used (plus helper-opened/action counts for contextual helpers). Counters MUST be persisted with the guidance state and survive restarts.

#### Scenario: Skipping a spotlight is counted
- **WHEN** the user skips the annotation-intro spotlight
- **THEN** `dismissedCount` for that feature is incremented and persisted

### Requirement: Metrics API
The app MUST expose a `getMetrics()` API returning per-feature: `shown`, `skipped`, `completed`, `used`, `completionRate` (completed ÷ shown), and `skipRate` (skipped ÷ shown), so effectiveness can be reviewed locally or exported later.

#### Scenario: Reading completion rate
- **WHEN** a user completes the annotation-intro spotlight after it was shown once
- **THEN** `completionRate` for that feature is 1.0 and `skipRate` is 0

### Requirement: Effectiveness thresholds (decision guidance)
The app MUST apply thresholds when evaluating metrics: spotlight completion below 50% indicates a trigger/copy problem; skip rate above 50% indicates the guidance should be trimmed or removed. (These thresholds drive future decisions; no automatic action is required in v1.)

#### Scenario: Flagging a noisy spotlight
- **WHEN** a spotlight's skip rate exceeds 50%
- **THEN** the feature is a candidate for removal or copy redesign in the next release
