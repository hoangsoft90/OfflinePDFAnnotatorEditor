/**
 * External-open handling (ADR-008) — web variant.
 *
 * Web has no ACTION_VIEW/SEND intents, but deep links / dropped URLs may
 * arrive. We fetch the source into a blob: object URL (this session) and
 * register it in recents, mirroring the native copy-into-app-storage flow.
 */
import { uuid } from '@/utils/uuid';
import { useMetadataStore } from '@/store/use-metadata-store';
import { bytesToBlob } from '@/storage/web-fs';

export interface ImportResult {
  docId: string;
  copied: boolean;
  error?: string;
}

/** Imports a fetch-able PDF URL into a session object URL + recents row. */
export async function importExternalPdf(uri: string, displayName?: string): Promise<ImportResult> {
  try {
    const resp = await fetch(uri);
    if (!resp.ok) throw new Error('Không thể đọc file');
    const bytes = new Uint8Array(await resp.arrayBuffer());
    const url = URL.createObjectURL(bytesToBlob(bytes));

    const docId = uuid();
    const name = displayName && displayName.length > 0 ? displayName : 'Đã nhận.pdf';
    const now = new Date().toISOString();
    await useMetadataStore.getState().upsert({
      id: docId,
      uri: url,
      name,
      size: bytes.byteLength,
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
