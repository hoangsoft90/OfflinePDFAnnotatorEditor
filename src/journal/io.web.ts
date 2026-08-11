/**
 * Journal file primitives (web) — virtual web FS backed.
 * Same API as `io.ts`; resolved by Metro via the `.web` extension.
 */
import { WebFile } from '@/storage/web-fs';

import { resolveWorkspace } from '@/storage/workspace.web';

function journalFile(docId: string): WebFile {
  return new WebFile(resolveWorkspace(docId).root, 'journal.jsonl');
}

/** True if a journal file exists (recovery signal). */
export function journalExists(docId: string): boolean {
  return journalFile(docId).exists;
}

/** Appends a raw JSON line to the journal (crash-safe, immediate). */
export function appendJournalLine(docId: string, line: string): void {
  const file = journalFile(docId);
  file.write(file.textSync() + line + '\n');
}

/** Returns the raw journal text. */
export function readJournalText(docId: string): string {
  return journalFile(docId).textSync();
}

/** Backs up the journal to `journal.bak.jsonl` and truncates it. */
export function compactJournal(docId: string): void {
  const file = journalFile(docId);
  if (!file.exists) return;
  const parent = file.parentDirectory;
  const bak = new WebFile(parent, 'journal.bak.jsonl');
  if (bak.exists) bak.delete();
  file.copySync(bak);
  file.delete();
}

/** Backs up the journal to `journal.discarded.jsonl` and truncates it. */
export function discardJournal(docId: string): void {
  const file = journalFile(docId);
  if (!file.exists) return;
  const parent = file.parentDirectory;
  const bak = new WebFile(parent, 'journal.discarded.jsonl');
  if (bak.exists) bak.delete();
  file.copySync(bak);
  file.delete();
}
