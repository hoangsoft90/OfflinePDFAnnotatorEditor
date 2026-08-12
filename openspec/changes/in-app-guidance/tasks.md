## 1. Guidance core

- [x] 1.1 `src/guidance/types.ts`: `GuidanceStatus`, `FeatureGuidanceState`, `GuidanceStateFile`, `GuidanceMark`, `GuidanceMetrics`
- [x] 1.2 `src/guidance/registry.ts`: feature ids + Vietnamese copy (spotlight steps, tooltip, helper content, badge label)
- [x] 1.3 `src/guidance/guidance-core.ts`: state machine (shouldShowSpotlight/Tooltip/Badge), mark transitions, session budget, counters, metrics, subscribe/notify
- [x] 1.4 `src/guidance/guidance-store.ts` (native, atomicWrite → `Paths.document/guidance/state.json`) + `guidance-store.web.ts` (localStorage)
- [x] 1.5 `src/guidance/use-guidance.ts`: `useGuidance(featureId)` hook exposing state + show flags + mark actions

## 2. Components

- [x] 2.1 `GuidanceBadge`: presentational pill (MỚI/BETA/CẬP NHẬT), absolute-positioned by parent
- [x] 2.2 `GuidanceTooltip`: anchor wrapper, bubble with arrow, first-tap trigger, tap-outside/✕/8s auto-dismiss
- [x] 2.3 `SpotlightOverlay`: full-screen overlay, cutout via 4 dim rects, step card + Bỏ qua/Tiếp/Xong + progress dots, cutout-tap completes
- [x] 2.4 `ContextualHelper`: popover (Làm gì / Vì sao chưa dùng được / Cách mở khóa + optional action button)

## 3. Integrations

- [x] 3.1 `_layout.tsx`: `guidance.ensureLoaded()` at bootstrap
- [x] 3.2 `AnnotationToolbar`: signature badge + first-tap tooltip; undo contextual helper when disabled; `undoRef` for spotlight measuring
- [x] 3.3 `ViewerScreen`: `annotation-intro` spotlight (2 steps, measured targets); search 0-result inline helper (scanned pages); usage tracking on tool/signature/open
- [x] 3.4 `SignaturePickerModal`: empty-state copy aligned with helper pattern (no behavior change)

## 4. Validation

- [ ] 4.1 `npx tsc --noEmit` passes
- [ ] 4.2 `npx expo lint` passes
- [ ] 4.3 `openspec validate --all` passes (all changes incl. new one)
- [ ] 4.4 Smoke (manual): open PDF → enable annotating → 2-step spotlight shows once → skip → never auto-re-nags; tap signature → badge + tooltip; undo disabled → helper explains; search in scanned doc → 0-result helper
