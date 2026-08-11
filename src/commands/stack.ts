/**
 * CommandStack (annotation/undo-redo spec) — undo/redo with a configurable
 * cap. Pushing a new command clears the redo stack.
 */
import { create } from 'zustand';

import type { Command } from '@/commands/types';
import { journalCommand } from '@/journal/autosave';

const DEFAULT_CAP = 100;

interface CommandStackState {
  undoStack: Command[];
  redoStack: Command[];
  cap: number;
  execute: (cmd: Command) => void;
  undo: () => void;
  redo: () => void;
  reset: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;
}

export const useCommandStack = create<CommandStackState>((set, get) => ({
  undoStack: [],
  redoStack: [],
  cap: DEFAULT_CAP,

  execute: (cmd) => {
    cmd.execute();
    const effect = cmd.effect();
    if (effect.docId) journalCommand(effect.docId, effect);
    set((s) => {
      const undoStack = [...s.undoStack, cmd];
      // enforce cap
      while (undoStack.length > s.cap) undoStack.shift();
      return { undoStack, redoStack: [] };
    });
  },

  undo: () => {
    const { undoStack, redoStack } = get();
    const cmd = undoStack[undoStack.length - 1];
    if (!cmd) return;
    cmd.undo();
    const inv = cmd.inverseEffect();
    if (inv.docId) journalCommand(inv.docId, inv);
    set({
      undoStack: undoStack.slice(0, -1),
      redoStack: [...redoStack, cmd],
    });
  },

  redo: () => {
    const { undoStack, redoStack } = get();
    const cmd = redoStack[redoStack.length - 1];
    if (!cmd) return;
    cmd.execute();
    const effect = cmd.effect();
    if (effect.docId) journalCommand(effect.docId, effect);
    set({
      undoStack: [...undoStack, cmd],
      redoStack: redoStack.slice(0, -1),
    });
  },

  reset: () => set({ undoStack: [], redoStack: [] }),

  canUndo: () => get().undoStack.length > 0,
  canRedo: () => get().redoStack.length > 0,
}));

/** React hook-friendly selectors. */
export function useCanUndo() {
  return useCommandStack((s) => s.undoStack.length > 0);
}
export function useCanRedo() {
  return useCommandStack((s) => s.redoStack.length > 0);
}
