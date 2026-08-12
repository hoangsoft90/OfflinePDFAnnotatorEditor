/**
 * Guidance store — web (localStorage-backed) singleton (in-app-guidance
 * change). Same contract as `guidance-store.ts`, resolved by Metro via the
 * `.web` extension.
 */
import { GuidanceCore } from './guidance-core';
import type { GuidanceStateFile, GuidanceStorage } from './types';

const STORAGE_KEY = 'guidance.state.v1';

const webStorage: GuidanceStorage = {
  async load(): Promise<GuidanceStateFile | null> {
    const raw = globalThis.localStorage?.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as GuidanceStateFile;
  },
  async save(state: GuidanceStateFile): Promise<void> {
    globalThis.localStorage?.setItem(STORAGE_KEY, JSON.stringify(state));
  },
};

export const guidance = new GuidanceCore(webStorage);
