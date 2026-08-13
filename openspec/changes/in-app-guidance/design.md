## Context

Users hit three "wow this is complex" moments: the 12-tool annotation toolbar, the signature create→place flow, and export/save semantics. The privacy contract (ADR-006) forbids outbound analytics, so all guidance state and tracking stay on-device. The app already has solid primitives to build on: `atomicWrite` (atomic.ts), `Paths.document` storage layout, and a centralized copy/theme token system.

## Goals / Non-Goals

**Goals:**
- Teach complex features in-context with 4 lightweight components (Badge, Tooltip, Spotlight, Contextual Helper).
- Never annoy: 1 spotlight OR 2 tooltips max per session; dismissed guidance has a 7-day cooldown; completed features never re-nag; badge auto-hides after 2 uses or 14 days.
- All copy centralized in `registry.ts` so Dev/UI can tune without touching components.
- Track effectiveness locally (completion/skip/usage counters) with zero network.

**Non-Goals:**
- No remote onboarding server / A-B tooling (privacy-first, ADR-006).
- No multi-screen onboarding tour at first launch (out of scope; in-context only).
- No new dependencies (no react-native-popover/coachmark libs) — components are small and tailored to the design tokens.
- Raw event streaming (JSONL) is deferred; counters + timestamps suffice for the KPIs.

## Decisions

### D1 — One module, three layers
`src/guidance/` has: **registry** (ids + copy), **store** (state machine + persistence + session budget), **components** (presentation). Integration sites import `useGuidance(featureId)` + a component; they never touch persistence directly. Copy lives ONLY in `registry.ts`.

### D2 — State machine per feature
Statuses `unseen → shown → dismissed | completed`, plus counters `shownCount / dismissedCount / completedCount / usageCount` and `helperOpenedCount / helperActionCount`.

- `shown`: guidance is currently on screen (bubble/overlay active until dismissed/completed).
- `dismissed`: user skipped; re-offer spotlight after **7-day cooldown** (only if used < 2 times); tooltip is one-shot per tap — no re-show after dismiss.
- `completed`: via explicit completion OR **2 uses** of the feature (badge/tooltip hidden once the user demonstrably knows it).
- Session budget: max **1 spotlight** and **2 tooltips** per app launch.

### D3 — Persistence: `guidance/state.json` (native) / localStorage (web)
Reuses `atomicWrite` into `Paths.document/guidance/state.json`; web variant stores the same JSON under `localStorage['guidance.state.v1']`. Writes are serialized through a promise queue. Loaded lazily once at app bootstrap (`_layout`); reads before load fall back to defaults (safe, non-crashing).

### D4 — Component contracts
- **Badge**: pure presentational pill ("MỚI"/"BETA"/"CẬP NHẬT"), absolutely positioned by parent; rendered when `shouldShowBadge`.
- **Tooltip**: wraps an anchor; bubble with arrow above/below, first-tap trigger, tap-anywhere (within wrapper) + ✕ + 8s auto-dismiss. Bubble positioned relative to wrapper (works inside the bottom toolbar without a portal). A **floating variant** (bubble positioned by the caller via `bubbleStyle`, no anchor/overlay) is used inside horizontal ScrollViews, which clip an anchored bubble that extends past their bounds on Android — the signature tooltip in the annotation toolbar uses it.
- **Spotlight**: full-screen overlay; 4 dim rects carve a cutout around the measured target (window coords from `measureInWindow`); step card below (or above, when target is low on screen); always-visible "Bỏ qua", "Tiếp"/"Xong" + progress dots; tapping the cutout completes the flow (user is now using the feature); tap outside does nothing.
- **Contextual Helper**: wraps a (possibly disabled) control; tapping it opens a "Làm gì / Vì sao chưa dùng được / Cách mở khóa" popover with optional action button (deep link). Used for undo-empty and scanned-page search.

### D4a — Undo/redo live outside the horizontal ScrollView
In the annotation toolbar's second row, the swatches scroll horizontally while undo/redo stay pinned right of the scroll viewport. This is required so the undo **Contextual Helper** popover (which opens upward) is never clipped by the ScrollView on Android — the same clipping problem that motivated the Tooltip floating variant.
- `annotation-intro` spotlight: first time the user turns on annotating → 2 steps (toolbar, undo), targets measured from the rendered toolbar.
- `signature-create`: badge on the signature tool; first tap shows tooltip "Vẽ một lần, dùng mãi mãi."
- `undo-empty`: contextual helper on the disabled undo button.
- `search-scanned`: inline helper when a search yields 0 results (explains no text layer on scanned pages).

## Risks / Trade-offs

- **Tooltip dismissal scope**: tap-outside only dismisses within the wrapper bounds (no portal); mitigated by ✕ + 8s auto-dismiss. A future portal (e.g. `react-native-portalize`) can widen this if needed. ScrollView clipping on Android is avoided via the floating variant (D4) and by keeping undo/redo outside the scroll (D4a).
- **measureInWindow timing**: toolbar must be laid out before measuring; integration guards with `onLayout` (no fixed sleeps).
- **Disabled children inside Contextual Helper**: the wrapper Pressable intercepts taps even when the inner control is disabled; callers render the plain control when the feature is available (helper only wraps the disabled state).
- **Counters only (no raw events)**: sufficient for completion/skip/usage KPIs; a JSONL event log is deferred.

## Implementation notes (from code review, 2026-08-13)

- Verified: `useGuidance` memoizes all callbacks (`useCallback` over `[featureId]`), so the Tooltip 8s auto-dismiss effect (deps `[visible, onDismiss]`) is never reset by parent re-renders — the signature tooltip in the toolbar is safe even though the toolbar re-renders on every tool/style change.
- **Known cosmetic bug**: `GuidanceTooltip` and `ContextualHelper` arrows render incorrectly for `placement="bottom"`. The `arrow` style sets `borderTopWidth: 6` unconditionally; the bottom-placement branch sets only `borderBottomColor` (width stays 0 → triangle invisible) while `borderTopColor` stays at its RN default (black) → a black triangle pointing the wrong way. Fix when bottom placement is needed: `borderBottomWidth: 6` + `borderTopColor: 'transparent'`. All current call sites use `placement="top"`, so this is latent, not visible.

## Implementation notes (from on-device smoke test)

- The first smoke test on a real device surfaced a **pre-existing viewer crash** unrelated to this change: with zustand v5, store selectors returning a fresh array/object each call (`useAnnotationStore((s) => Object.values(...).filter(...))`) make the component re-render forever (`Maximum update depth exceeded`) once any other render happens. Fixed by wrapping those selectors in `useShallow`. **Rule for this module**: every `useGuidance`-related selector and every store selector used alongside guidance must return stable references (primitives, memoized values, or `useShallow`); the guidance singleton itself only ever hands out stable objects/flags computed during render.
