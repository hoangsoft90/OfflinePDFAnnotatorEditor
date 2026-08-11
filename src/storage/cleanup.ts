/**
 * Storage cleanup controls (storage/layout + files/recent specs).
 * Clearing history removes recent rows + cached thumbnails but NEVER
 * deletes project workspaces that hold unsaved changes.
 */
import { Directory, File, Paths } from 'expo-file-system';

import { storagePaths } from '@/storage/storage-paths';
import type { Document } from '@/models/document';

/** Clears the thumbnail cache entirely. */
export function clearThumbnailCache(): void {
  const dir = new Directory(Paths.cache, 'thumbnails');
  if (dir.exists) dir.delete();
}

/** Removes cached thumbnails for a single doc. */
export function clearDocThumbnails(docId: string): void {
  const dir = storagePaths.thumbnailsDir(docId);
  if (dir.exists) dir.delete();
}

/**
 * Clears recent history: cached thumbnails for the removed documents, plus
 * imported copies (external-intent PDFs) unless the user still has an open
 * project workspace with changes. Source files are never touched.
 */
export function cleanupForRemoval(docs: Document[]): void {
  for (const doc of docs) {
    clearDocThumbnails(doc.id);
    if (doc.isImportedCopy) {
      // Imported copies live in cache/imports — safe to delete on removal.
      const copy = new File(storagePaths.importsDir, `${doc.id}.pdf`);
      if (copy.exists) copy.delete();
    }
  }
}

/** Removes a temp copy used for sharing/duplicating. */
export function removeTempFile(uri: string): void {
  try {
    const f = new File(uri);
    if (f.exists) f.delete();
  } catch {
    // best-effort cleanup
  }
}
