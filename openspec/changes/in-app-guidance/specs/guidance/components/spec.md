## Purpose

Defines the four guidance UI components (Badge, Tooltip, Spotlight, Contextual Helper) that teach and explain features in-context without blocking or annoying the user.

## ADDED Requirements

### Requirement: Badge (new-feature marker)
The app MUST provide a small "MỚI" badge that marks a new or updated feature. The badge MUST be a presentational pill (rounded, high-contrast accent color, uppercase label) positioned by its parent, MUST NOT intercept touches, and MUST support the label variants "MỚI", "BETA", "CẬP NHẬT".

#### Scenario: Badge marks the signature feature
- **WHEN** the annotation toolbar is shown and the user has never used the signature feature
- **THEN** the signature tool shows a "MỚI" badge in its top-right corner

### Requirement: Tooltip (in-context bubble)
The app MUST provide a Tooltip that explains a control with a short sentence. The Tooltip MUST wrap the anchor control, display a bubble with an arrow above or below it, appear on first tap of the anchor, and dismiss via tap on the bubble's close affordance, a tap elsewhere on the anchor wrapper, or an 8-second auto-timeout.

#### Scenario: First tap on the signature tool
- **WHEN** the user taps the signature tool for the first time
- **THEN** a tooltip "Vẽ một lần, dùng mãi mãi." appears above the tool, and it stops appearing after the user dismisses or completes it

### Requirement: Spotlight (coach-mark overlay)
The app MUST provide a Spotlight overlay that highlights a target element with a cutout while dimming the rest of the screen. The overlay MUST support multi-step sequences (≤ 4 steps), always show a "Bỏ qua" action, advance with "Tiếp" (last step "Xong"), show progress dots, position the step card below the target (or above when the target is near the bottom), and treat a tap on the highlighted target as completing the flow (the user is now using the feature). Taps outside the target and card MUST NOT dismiss the overlay.

#### Scenario: First-time annotation intro
- **WHEN** the user turns on annotating for the first time in a document
- **THEN** a 2-step spotlight highlights the annotation toolbar and the undo button, and the user can advance with "Tiếp", finish with "Xong", or skip at any time

### Requirement: Contextual Helper (locked/unavailable feature)
The app MUST provide a Contextual Helper that explains why a feature is locked or unavailable. The Helper MUST wrap the (possibly disabled) control, open a popover on tap, and show three parts: what the feature does, why it is unavailable now, and how to unlock it (with an optional action button that deep-links to the unlock location). It MUST NOT use a full-screen modal.

#### Scenario: Undo when nothing to undo
- **WHEN** the undo button is disabled because there are no commands
- **THEN** tapping the disabled undo button shows a helper "Chưa có thao tác nào để hoàn tác."

#### Scenario: Search on a scanned page
- **WHEN** a search returns zero results
- **THEN** the app explains that scanned pages have no text layer and suggests highlighting manually
