/**
 * Open a PDF via Android SAF (ACTION_OPEN_DOCUMENT through expo-document-picker).
 * Records the document in the metadata store (recent list) and opens the viewer.
 */
import * as DocumentPicker from 'expo-document-picker';
import { router } from 'expo-router';

import { uuid } from '@/utils/uuid';
import { useMetadataStore } from '@/store/use-metadata-store';

export interface OpenResult {
  docId: string;
  canceled: boolean;
}

/**
 * Opens the system picker, registers the picked PDF in recents, and
 * navigates to the viewer. Returns the docId on success.
 */
export async function openPdfViaPicker(): Promise<OpenResult> {
  const result = await DocumentPicker.getDocumentAsync({
    type: 'application/pdf',
    copyToCacheDirectory: false,
    multiple: false,
  });

  if (result.canceled || result.assets.length === 0) {
    return { docId: '', canceled: true };
  }

  const asset = result.assets[0];
  const docId = uuid();
  const now = new Date().toISOString();

  await useMetadataStore.getState().upsert({
    id: docId,
    uri: asset.uri,
    name: asset.name ?? 'document.pdf',
    size: asset.size ?? 0,
    pageCount: 0,
    lastOpened: now,
    modifiedAt: now,
    isFavorite: false,
    isImportedCopy: false,
  });

  router.push({ pathname: '/viewer/[docId]', params: { docId } });
  return { docId, canceled: false };
}

/**
 * Registers an already-known document (e.g. opened from recents) and returns
 * whether it's usable. Callers check URI readability before opening.
 */
export async function openDocumentById(docId: string): Promise<boolean> {
  const doc = await useMetadataStore.getState().getById(docId);
  if (!doc) return false;
  router.push({ pathname: '/viewer/[docId]', params: { docId } });
  return true;
}
