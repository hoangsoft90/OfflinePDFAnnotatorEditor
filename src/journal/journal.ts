/**
 * Crash-safe journal (annotation/recovery spec, ADR-005).
 *
 * Every command appends a JSON line to `journal.jsonl` in the doc's
 * workspace. On reopen, if the journal has entries and the project is dirty,
 * the app offers to replay them. Journal is append-only per session; a
 * successful save compacts it (truncates after backup).
 *
 * File primitives live in `./io` (platform-specific; web resolves `io.web.ts`).
 */
import type { CommandPayload } from '@/commands/types';
import type { Project } from '@/models/project';
import {
  appendJournalLine,
  compactJournal,
  journalExists,
  readJournalText,
} from '@/journal/io';

interface JournalEntry {
  sessionId: string;
  seq: number;
  payload: CommandPayload;
}

export class Journal {
  private readonly sessionId: string;
  private seq = 0;
  private entries: JournalEntry[] = [];

  constructor(private readonly docId: string, sessionId: string) {
    this.sessionId = sessionId;
  }

  /** Appends a command payload immediately (sync — crash-safe). */
  append(payload: CommandPayload): void {
    this.seq += 1;
    const entry: JournalEntry = { sessionId: this.sessionId, seq: this.seq, payload };
    this.entries.push(entry);
    try {
      appendJournalLine(this.docId, JSON.stringify(entry));
    } catch {
      // journaling is best-effort; in-memory replay still works for the session
    }
  }

  /** Returns entries from disk for THIS session (crash recovery). */
  readSessionEntries(sessionId: string): CommandPayload[] {
    try {
      const text = readJournalText(this.docId);
      const entries: CommandPayload[] = [];
      for (const line of text.split('\n')) {
        if (!line.trim()) continue;
        try {
          const entry = JSON.parse(line) as JournalEntry;
          if (entry.sessionId === sessionId) entries.push(entry.payload);
        } catch {
          // skip malformed line
        }
      }
      return entries;
    } catch {
      return [];
    }
  }

  /**
   * Compacts the journal after a successful save: backs up to
   * `journal.bak.jsonl` and truncates. Only safe when the project JSON is
   * already up to date.
   */
  compact(): void {
    try {
      compactJournal(this.docId);
      this.entries = [];
    } catch {
      // best-effort
    }
  }

  /** True if a journal file exists on disk (recovery signal). */
  static exists(docId: string): boolean {
    return journalExists(docId);
  }
}

/** Replays a list of journal payloads by re-applying them to stores. */
export function replayPayload(payload: CommandPayload): void {
  // eslint-disable-next-line @typescript-eslint/no-require-imports -- avoids a circular import with the store
  const { useAnnotationStore } = require('@/store/use-annotation-store') as typeof import('@/store/use-annotation-store');
  // eslint-disable-next-line @typescript-eslint/no-require-imports -- avoids a circular import with the project store
  const { useProjectStore } = require('@/store/use-project-store') as typeof import('@/store/use-project-store');
  const store = useAnnotationStore.getState();

  switch (payload.type) {
    case 'AddAnnotation':
    case 'MoveAnnotation':
    case 'ResizeAnnotation':
    case 'Restyle':
      if (payload.annotation) store.setAnnotation(payload.docId, payload.annotation);
      break;
    case 'DeleteAnnotation':
      if (payload.annotation) store.removeAnnotation(payload.docId, payload.annotation.id);
      break;
    case 'ClearPage':
      if (payload.pageId) {
        const anns = store.forPage(payload.docId, payload.pageId);
        anns.forEach((a) => store.removeAnnotation(payload.docId, a.id));
      }
      break;
    case 'ReorderPages':
      if (payload.pageOrderAfter) {
        useProjectStore.getState().updateProject(payload.docId, { pageOrder: payload.pageOrderAfter });
      }
      break;
    case 'RotatePage':
      if (payload.pageId && typeof payload.rotation === 'number') {
        const rotations = {
          ...(useProjectStore.getState().projects[payload.docId]?.pageRotations ?? {}),
          [payload.pageId]: payload.rotation as 0 | 90 | 180 | 270,
        };
        useProjectStore.getState().updateProject(payload.docId, { pageRotations: rotations });
      }
      break;
    case 'DeletePages':
      if (payload.pageOrderAfter) {
        useProjectStore.getState().updateProject(payload.docId, { pageOrder: payload.pageOrderAfter });
        // Drop annotations that no longer belong to any page (orphans from
        // deleted pages) so they don't resurface after recovery.
        const valid = new Set(payload.pageOrderAfter);
        const docAnns = useAnnotationStore.getState().byDoc[payload.docId] ?? {};
        for (const a of Object.values(docAnns)) {
          if (!valid.has(a.pageId)) store.removeAnnotation(payload.docId, a.id);
        }
      }
      break;
    default:
      break;
  }
}

/** Recovery dialog data: whether a recoverable journal exists. */
export function detectRecoverableSession(project: Project | null, docId: string): boolean {
  if (!project) return false;
  return project.dirty && Journal.exists(docId);
}
