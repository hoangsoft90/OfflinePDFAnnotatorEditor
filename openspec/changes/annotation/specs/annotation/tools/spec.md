## Purpose

Defines the interactive behaviors of each annotation tool on the viewer canvas.

## ADDED Requirements

### Requirement: Tool selection
The toolbar MUST let the user select one active tool at a time: highlight, underline, strikeout, pen, eraser, text box, rectangle, ellipse, line, arrow, or select/move. The active tool MUST be visually indicated.

#### Scenario: Switch tools
- **WHEN** the user taps the pen tool
- **THEN** the pen becomes the active tool and subsequent drags create pen strokes

### Requirement: Text-marking tools (highlight/underline/strikeout)
Highlight, underline, and strikeout MUST be applied by dragging across text on the page; the annotation MUST snap to the text line(s) covered by the drag. On scanned pages with no text layer, these tools MUST fall back to freehand rectangle marking or be disabled with a clear hint.

#### Scenario: Highlight text
- **WHEN** the user drags across a line of text with highlight active
- **THEN** a highlight annotation covering exactly that text line's bounds is created

### Requirement: Freehand pen and eraser
The pen MUST record the pointer path as PDF-point polyline with configurable color, opacity, and width. The eraser MUST remove existing annotations it intersects (full-annotation erasure), with a configurable eraser size.

#### Scenario: Pen stroke and undo erasure
- **WHEN** the user draws a pen stroke then uses the eraser on it
- **THEN** the stroke is removed and the undo action restores it

### Requirement: Text box (add-only)
The text box tool MUST add a text annotation at a tapped location with editable content; editing existing text boxes is supported (move/resize/edit), but the text layer itself is add-only (no PDF text reflow editing).

#### Scenario: Add text note
- **WHEN** the user taps the page with the text tool and types a note
- **THEN** a text annotation appears at that location, stored with content and geometry

### Requirement: Shapes
Rectangle, ellipse, line, and arrow tools MUST draw the corresponding vector shape with the active color/opacity/width.

#### Scenario: Draw arrow
- **WHEN** the user drags with the arrow tool
- **THEN** an arrow annotation from start to end point is created with an arrowhead at the end

### Requirement: Move, resize, and delete selections
With the select tool, the user MUST be able to tap an annotation to select it, drag to move it, use handles to resize it (where applicable), and delete it. Selection MUST highlight the annotation's bounds.

#### Scenario: Move a highlight
- **WHEN** the user selects a highlight and drags it
- **THEN** the highlight moves to the new location and its geometry updates in the project
