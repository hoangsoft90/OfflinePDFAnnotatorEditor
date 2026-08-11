/**
 * Autosave (annotation/recovery spec, ADR-005):
 *  - every command payload is appended to the session journal immediately
 *  - the full Project JSON is written debounced (300ms) and on backgrounding
 */
import { AppState, type AppStateStatus } from 'react-native';

import { Journal } from '@/journal/journal';
import { saveProject } from '@/project/project-manager';
import { useProjectStore } from '@/store/use-project-store';
import type { CommandPayload } from '@/commands/types';

const DEBOUNCE_MS = 300;

const journals = new Map<string, Journal>();
const timers = new Map<string, ReturnType<typeof setTimeout>>();

export function journalFor(docId: string): Journal {
  let journal = journals.get(docId);
  if (!journal) {
    const sessionId = useProjectStore.getState().projects[docId]?.sessionId ?? cryptoRandomFallback();
    journal = new Journal(docId, sessionId);
    journals.set(docId, journal);
  }
  return journal;
}

/** Called by command stack after each executed/undone command. */
export function markDocDirty(docId: string) {
  useProjectStore.getState().markDirty(docId, true);
  scheduleSave(docId);
}

/** Journals a payload immediately (crash-safe), then schedules autosave. */
export function journalCommand(docId: string, payload: CommandPayload) {
  const journal = journalFor(docId);
  journal.append(payload);
  useProjectStore.getState().markDirty(docId, true);
  scheduleSave(docId);
}

function scheduleSave(docId: string) {
  const existing = timers.get(docId);
  if (existing) clearTimeout(existing);
  const t = setTimeout(() => {
    timers.delete(docId);
    void flushSave(docId);
  }, DEBOUNCE_MS);
  timers.set(docId, t);
}

/** Writes the project JSON; compacts the journal after a clean write. */
export async function flushSave(docId: string): Promise<void> {
  const project = useProjectStore.getState().projects[docId];
  if (!project) return;
  await saveProject(docId);
  // compact journal only if dirty=false would be set after export; keep journal
  // for recovery until the user explicitly saves/export (document-ops).
}

/** AppState background flush for all open docs. */
let subscribed = false;
export function initAutosaveListener(): void {
  if (subscribed) return;
  subscribed = true;
  AppState.addEventListener('change', (state: AppStateStatus) => {
    if (state !== 'active') {
      for (const docId of useProjectStore.getState().projects ? Object.keys(useProjectStore.getState().projects) : []) {
        void flushSave(docId);
      }
    }
  });
}

function cryptoRandomFallback(): string {
  return `session-${Date.now()}-${Math.floor(Math.random() * 1e9)}`;
}

export function disposeAutosave(docId: string): void {
  const t = timers.get(docId);
  if (t) clearTimeout(t);
  timers.delete(docId);
  journals.delete(docId);
}
