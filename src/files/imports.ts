/**
 * External-open handling (ADR-008): PDFs opened via ACTION_VIEW / ACTION_SEND
 * from other apps (Gmail, Drive, WhatsApp) typically grant only temporary
 * access. We immediately copy the file into app-private storage so it remains
 * usable after the intent session ends, then register it in recents.
 */
import { File } from 'expo-file-system';

import { ensureDir, storagePaths } from '@/storage/storage-paths';
import { uuid } from '@/utils/uuid';
import { useMetadataStore } from '@/store/use-metadata-store';

export interface ImportResult {
  docId: string;
  copied: boolean;
  error?: string;
}

/**
 * Copies an externally-sourced content:// PDF into cache/imports and
 * registers it in recents. Returns the new docId.
 */
export async function importExternalPdf(uri: string, displayName?: string): Promise<ImportResult> {
  try {
    const dir = ensureDir(storagePaths.importsDir);
    const docId = uuid();
    const dest = new File(dir, `${docId}.pdf`);

    const source = new File(uri);
    await source.copy(dest);

    const name = displayName && displayName.length > 0 ? displayName : 'Đã nhận.pdf';
    const now = new Date().toISOString();
    await useMetadataStore.getState().upsert({
      id: docId,
      uri: dest.uri,
      name,
      size: dest.exists ? dest.size : 0,
      pageCount: 0,
      lastOpened: now,
      modifiedAt: now,
      isFavorite: false,
      isImportedCopy: true,
    });

    return { docId, copied: true };
  } catch (e) {
    return { docId: '', copied: false, error: e instanceof Error ? e.message : String(e) };
  }
}
