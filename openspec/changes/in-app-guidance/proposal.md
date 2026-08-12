## Why

The app's core value (annotation, signature, save/export) is also its most complex surface: a 12-tool annotation toolbar, a two-step signature flow, and export options that only make sense once a user has content. New users get overwhelmed and drop off; experienced users get annoyed by anything that repeats. We need a lightweight, local-only, non-intrusive guidance system that teaches features in-context, explains why a feature is locked, and never nags.

## What Changes

- **Guidance UI components**: `Badge` ("MỚI"), `Tooltip`, `Spotlight` (coach-mark overlay with cutout), `Contextual Helper` (explains locked/unavailable features).
- **Guidance logic**: a per-feature state machine (`unseen → shown → dismissed | completed`), trigger rules (first-use, first-tap, blocked-action), hide conditions (completed, used ≥ 2 times, session budget, cooldown after dismiss), and a session budget (max 1 spotlight + 2 tooltips per session).
- **Guidance copy registry**: a single source of truth (`src/guidance/registry.ts`) with feature ids + Vietnamese microcopy for Dev and UI Designer to edit without touching components.
- **Local tracking**: per-feature counters (shown / dismissed / completed / used) persisted in an app-private `guidance/state.json` — privacy-first, no network (ADR-006). Metrics (completion rate, skip rate) computed locally and available for later analytics decisions.
- **Integrations (v1)**: annotation-toolbar intro spotlight, signature badge + first-tap tooltip, undo contextual helper, search empty-state helper for scanned pages.

## Capabilities

### New Capabilities
- `guidance/components`: Badge, Tooltip, Spotlight, Contextual Helper.
- `guidance/logic`: feature state machine, triggers, hide conditions, session budget, persistence.
- `guidance/tracking`: local counters + metrics API.

### Modified Capabilities
- `app/shell`: bootstrap loads guidance state at startup.
- `pdf/viewer` + `annotation/tools`: toolbar/search surfaces render guidance elements (no behavior change otherwise).

## Impact

- New `src/guidance/` module (types, registry, store, hooks, 4 components) and `guidance/` storage dir under `Paths.document`.
- Small integration edits in `AnnotationToolbar`, `ViewerScreen`, `SignaturePickerModal`, `_layout`.
- No new dependencies (reuses expo-file-system + zustand-free singleton + existing `atomicWrite`).
- Does not touch the annotation/export engines; guidance is presentation + local state only.
