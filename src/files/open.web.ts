/**
 * Open a PDF on web — hidden `<input type="file">` instead of the Android SAF
 * picker. Registers the document in the metadata store (recents) as a blob:
 * object URL and navigates to the viewer. Same `OpenResult` API as the native
 * `open.ts`; resolved by Metro via the `.web` extension.
 */
import { router } from 'expo-router';

import { uuid } from '@/utils/uuid';
import { useMetadataStore } from '@/store/use-metadata-store';

export interface OpenResult {
  docId: string;
  canceled: boolean;
}

/**
 * Opens the file picker, registers the picked PDF in recents, and navigates
 * to the viewer. Returns the docId on success.
 */
export async function openPdfViaPicker(): Promise<OpenResult> {
  return new Promise<OpenResult>((resolve) => {
    let settled = false;
    const finish = (result: OpenResult) => {
      if (settled) return;
      settled = true;
      cleanup();
      resolve(result);
    };

    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/pdf';
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) {
        finish({ docId: '', canceled: true });
        return;
      }
      // Object URL keeps the file usable for this session (recents rows whose
      // source is gone after reload hit the existing "unavailable" flow).
      const url = URL.createObjectURL(file);
      const docId = uuid();
      const now = new Date().toISOString();
      void useMetadataStore
        .getState()
        .upsert({
          id: docId,
          uri: url,
          name: file.name,
          size: file.size,
          pageCount: 0,
          lastOpened: now,
          modifiedAt: now,
          isFavorite: false,
          isImportedCopy: false,
        })
        .then(() => {
          router.push({ pathname: '/viewer/[docId]', params: { docId } });
          finish({ docId, canceled: false });
        });
    };

    // There is no standard "cancel" event for file inputs; when the dialog is
    // dismissed the window regains focus without a file being selected.
    const onFocus = () => {
      // Give the change handler a tick to fire before declaring a cancel.
      setTimeout(() => {
        if (!settled && !input.files?.length) finish({ docId: '', canceled: true });
      }, 0);
    };
    const cleanup = () => window.removeEventListener('focus', onFocus);

    window.addEventListener('focus', onFocus);
    input.click();
  });
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
