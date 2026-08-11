## Purpose

Defines undo/redo behavior for annotation operations via a command stack that is independent of the PDF engine (ADR-005).

## ADDED Requirements

### Requirement: Command-based operations
Every mutating annotation operation (add, delete, move, resize, restyle) MUST be expressed as a command with `execute()` and `undo()` semantics and MUST go through the command stack.

#### Scenario: Undo an add
- **WHEN** the user adds a highlight then taps undo
- **THEN** the highlight is removed and the canvas returns to the prior state

### Requirement: Undo/redo stack
The stack MUST support unlimited undo within a session and redo of undone operations. Any new operation after an undo MUST clear the redo stack.

#### Scenario: Redo after undo
- **WHEN** the user adds a highlight, undoes it, then taps redo
- **THEN** the highlight reappears

#### Scenario: New command clears redo
- **WHEN** the user undoes an operation then performs a new one
- **THEN** redo is no longer available

### Requirement: Stack limits
The stack MUST cap history at a configurable maximum (default 100 commands) to bound memory; when the cap is reached the oldest commands are dropped.

#### Scenario: Cap at 100
- **WHEN** more than 100 commands are executed
- **THEN** only the most recent 100 remain undoable
