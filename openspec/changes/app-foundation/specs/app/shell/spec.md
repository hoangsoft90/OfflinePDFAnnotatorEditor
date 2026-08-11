## Purpose

Defines the application shell: the navigable screens, their routing, and the shared visual/theme foundation every screen of the offline PDF workspace is built on.

## ADDED Requirements

### Requirement: Root navigation shell
The app MUST provide a tab-based navigation shell with a Home screen (recent documents) and a Settings screen. The shell MUST initialize all global providers (theme, metadata database, document store) before any screen renders.

#### Scenario: App launches to Home
- **WHEN** the user opens the app
- **THEN** the Home screen renders the list of recently opened documents and the bottom tab bar exposes Home and Settings

#### Scenario: Provider failure is surfaced
- **WHEN** the metadata database fails to initialize at startup
- **THEN** the app shows a clear error state with a retry action instead of a blank screen

### Requirement: Theme and visual consistency
The app MUST expose a single theme (colors, typography scale, spacing, elevation) consumed by all screens so visual elements are consistent across the app. The theme MUST support a dark appearance used by the PDF viewer (dimming around the page).

#### Scenario: Viewer uses dimmed surroundings
- **WHEN** the user opens the PDF viewer in dark appearance
- **THEN** the page area is surrounded by a dark surface and the theme colors are applied consistently across toolbar and panels

### Requirement: Deep-linkable routes for future screens
The router MUST reserve route segments for the Viewer, Page Organizer, and Signature pad so later changes add screens without restructuring the shell.

#### Scenario: Route reserved for viewer
- **WHEN** a future change introduces the viewer screen
- **THEN** it mounts at a route under the shell's layout without modifying the tab bar structure
