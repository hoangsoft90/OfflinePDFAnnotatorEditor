/**
 * Command pattern (ADR-005) — engine-independent, undoable operations.
 */
import type { Annotation } from '@/models/annotation';

export type CommandType =
  | 'AddAnnotation'
  | 'DeleteAnnotation'
  | 'MoveAnnotation'
  | 'ResizeAnnotation'
  | 'Restyle'
  | 'ReorderPages'
  | 'RotatePage'
  | 'DeletePages'
  | 'ExtractPages'
  | 'ClearPage';

/** Serializable payload used for journaling (ADR-005). */
export interface CommandPayload {
  type: CommandType;
  /** docId the command applies to */
  docId: string;
  /** annotation snapshot (Add/Delete/Move/Resize/Restyle) */
  annotation?: Annotation;
  /** previous geometry snapshot for undo of move/resize */
  prevAnnotation?: Annotation;
  /** page operations */
  pageOrderBefore?: string[];
  pageOrderAfter?: string[];
  pageIds?: string[];
  pageId?: string;
  rotation?: number;
  /** free-form extension for extract, etc. */
  meta?: Record<string, unknown>;
  ts: string;
}

export interface Command {
  type: CommandType;
  /** Re-apply the effect (idempotent after undo). */
  execute(): void;
  /** Reverse the effect. */
  undo(): void;
  /** Serializable snapshot for the journal. */
  toPayload(): CommandPayload;
  /**
   * The store mutation this command applies, for the append-only journal.
   * Replaying effects in order reconstructs the final annotation state.
   */
  effect(): CommandPayload;
  /** The inverse store mutation, journaled when the command is undone. */
  inverseEffect(): CommandPayload;
}
