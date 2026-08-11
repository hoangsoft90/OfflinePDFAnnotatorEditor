/**
 * Journal file primitives (native) — expo-file-system backed.
 * Shared logic in `journal.ts` / `recovery.ts` depends on these; the web build
 * resolves `io.web.ts` (virtual web FS) instead.
 */
import { File } from 'expo-file-system';

import { resolveWorkspace } from '@/storage/workspace';

function journalFile(docId: string): File {
  return new File(resolveWorkspace(docId).root, 'journal.jsonl');
}

/** True if a journal file exists on disk (recovery signal). */
export function journalExists(docId: string): boolean {
  return journalFile(docId).exists;
}

/** Appends a raw JSON line to the journal (crash-safe, immediate). */
export function appendJournalLine(docId: string, line: string): void {
  const file = journalFile(docId);
  if (!file.exists) file.create({ intermediates: true });
  // read-modify-write is O(n); acceptable for MVP session sizes.
  const current = file.exists ? file.textSync() : '';
  file.write(current + line + '\n');
}

/** Returns the raw journal text. */
export function readJournalText(docId: string): string {
  const file = journalFile(docId);
  if (!file.exists) return '';
  return file.textSync();
}

/**
 * Compacts the journal after a successful save: backs up to
 * `journal.bak.jsonl` and truncates. Only safe when the project JSON is
 * already up to date.
 */
export function compactJournal(docId: string): void {
  const file = journalFile(docId);
  if (!file.exists) return;
  const parent = file.parentDirectory;
  const bak = new File(parent, 'journal.bak.jsonl');
  if (bak.exists) bak.delete();
  file.copySync(bak);
  file.delete();
}

/** Backs up the journal to `journal.discarded.jsonl` and truncates it. */
export function discardJournal(docId: string): void {
  const file = journalFile(docId);
  if (!file.exists) return;
  const parent = file.parentDirectory;
  const bak = new File(parent, 'journal.discarded.jsonl');
  if (bak.exists) bak.delete();
  file.copySync(bak);
  file.delete();
}
