/**
 * Crash recovery (annotation/recovery spec, ADR-005).
 *
 * On viewer open: if the project is dirty and a journal exists on disk, the
 * app offers "Recover unsaved changes?". Accepting replays the journal's
 * effects into the stores. Declining backs up the journal and truncates it.
 */
import { Alert } from 'react-native';

import { Journal, replayPayload } from '@/journal/journal';
import { useProjectStore } from '@/store/use-project-store';
import { useCommandStack } from '@/commands/stack';
import type { CommandPayload } from '@/commands/types';
import { discardJournal } from '@/journal/io';

/** Returns journal effects for the project's current session (if any). */
export function collectRecoverableEffects(docId: string): CommandPayload[] {
  const project = useProjectStore.getState().projects[docId];
  if (!project || !project.dirty) return [];
  const journal = new Journal(docId, project.sessionId);
  return journal.readSessionEntries(project.sessionId);
}

/**
 * Checks for a recoverable session and, if present, asks the user.
 * Returns true if the caller should proceed (recovered or nothing to recover).
 */
export function promptRecovery(docId: string): Promise<boolean> {
  const effects = collectRecoverableEffects(docId);
  if (effects.length === 0) return Promise.resolve(true);

  return new Promise((resolve) => {
    Alert.alert(
      'Phục hồi phiên làm việc',
      'Phát hiện các thay đổi chưa lưu từ lần trước. Bạn có muốn phục hồi chúng không?',
      [
        { text: 'Bỏ qua', style: 'cancel', onPress: () => { discardSessionJournal(docId); resolve(true); } },
        {
          text: 'Phục hồi',
          onPress: () => {
            replayEffects(docId, effects);
            resolve(true);
          },
        },
      ]
    );
  });
}

/** Replays journal effects into the stores (order matters). */
export function replayEffects(docId: string, effects: CommandPayload[]): void {
  useCommandStack.getState().reset();
  for (const payload of effects) {
    replayPayload(payload);
  }
  void docId;
  useProjectStore.getState().markDirty(docId, true);
  // A recovered session is a new session going forward.
  useProjectStore.getState().updateProject(docId, { sessionId: cryptoRandom(), dirty: false });
}

/** Backs up + truncates the journal (discard path). */
export function discardSessionJournal(docId: string): void {
  try {
    discardJournal(docId);
  } catch {
    // best-effort
  }
  // Roll a fresh session so future commands never replay discarded entries.
  useProjectStore.getState().updateProject(docId, { dirty: false, sessionId: cryptoRandom() });
}

function cryptoRandom(): string {
  return `session-${Date.now()}-${Math.floor(Math.random() * 1e9)}`;
}
