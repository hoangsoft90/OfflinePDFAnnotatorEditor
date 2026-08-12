/**
 * Guidance store — native (file-backed) singleton (in-app-guidance change).
 * Persists to `Paths.document/guidance/state.json` atomically (ADR-004).
 */
import { Directory, File, Paths } from 'expo-file-system';

import { atomicWrite } from '@/export/atomic';
import { GuidanceCore } from './guidance-core';
import type { GuidanceStateFile, GuidanceStorage } from './types';

const STATE_FILE_NAME = 'state.json';

const nativeStorage: GuidanceStorage = {
  async load(): Promise<GuidanceStateFile | null> {
    const file = new File(new Directory(Paths.document, 'guidance'), STATE_FILE_NAME);
    if (!file.exists) return null;
    const parsed = JSON.parse(await file.text()) as GuidanceStateFile;
    return parsed;
  },
  async save(state: GuidanceStateFile): Promise<void> {
    const target = new File(new Directory(Paths.document, 'guidance'), STATE_FILE_NAME);
    await atomicWrite(target, new TextEncoder().encode(JSON.stringify(state)));
  },
};

export const guidance = new GuidanceCore(nativeStorage);
