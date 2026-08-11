/**
 * Save / Export actions (native) — document/save-export spec, ADR-004.
 *
 * Save a copy is the default; overwrite is explicit + atomic with conflict
 * checks (ADR-009). All exports work on a fresh copy — the workspace and
 * original remain untouched. Shared core (`buildExportBytes`, `markSaved`,
 * `SaveResult`) lives in `save-core.ts`; the web build resolves
 * `save-actions.web.ts` (browser download / Web Share API) instead.
 */
import * as DocumentPicker from 'expo-document-picker';
import * as Sharing from 'expo-sharing';

import { File } from 'expo-file-system';

import { buildExportBytes, markSaved, type SaveResult } from '@/export/save-core';
import { atomicWrite, atomicWriteToDir } from '@/export/atomic';
import { detectConflict } from '@/project/conflict';
import { readPdfBytes } from '@/files/read-pdf';
import { ensureDir, storagePaths } from '@/storage/storage-paths';
import { useProjectStore } from '@/store/use-project-store';
import { useMetadataStore } from '@/store/use-metadata-store';
import { extractPagesToPdf } from '@/export/exporter';
import { saveProject } from '@/project/project-manager';
import { uuid } from '@/utils/uuid';
import { removeTempFile } from '@/storage/cleanup';

/**
 * Save a copy… — user picks a destination via the system picker; the new file
 * includes page order, rotations, and annotations (flattened by default).
 */
export async function saveCopy(docId: string, options?: { flatten?: boolean }): Promise<SaveResult> {
  try {
    const bytes = await buildExportBytes(docId, options);
    const doc = await useMetadataStore.getState().getById(docId);
    const baseName = (doc?.name ?? 'document.pdf').replace(/\.pdf$/i, '') + '-annotated.pdf';

    const picked = await DocumentPicker.getDocumentAsync({
      type: 'application/pdf',
      copyToCacheDirectory: false,
      multiple: false,
    });
    if (picked.canceled) return { ok: false, canceled: true };

    const asset = picked.assets[0];
    if (asset) {
      const target = new File(asset.uri);
      await atomicWrite(target, bytes);
      await markSaved(docId);
      return { ok: true, path: asset.uri };
    }

    // Fallback: save into app cache (older picker behavior).
    const dir = ensureDir(storagePaths.shareDir);
    const file = await atomicWriteToDir(dir, baseName, bytes);
    await markSaved(docId);
    return { ok: true, path: file.uri };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

/**
 * Overwrite original — explicit + atomic + conflict-checked (ADR-004/009).
 */
export async function overwriteOriginal(docId: string, options?: { flatten?: boolean }): Promise<SaveResult> {
  try {
    const doc = await useMetadataStore.getState().getById(docId);
    if (!doc) return { ok: false, error: 'Document not found' };
    const project = useProjectStore.getState().projects[docId];
    if (!project) return { ok: false, error: 'No project' };

    const conflict = await detectConflict(doc.uri, project.sourceFingerprint);
    if (conflict) return { ok: false, conflict: true };

    const bytes = await buildExportBytes(docId, options);
    const target = new File(doc.uri);
    if (!target.exists) {
      return { ok: false, error: 'Source file no longer exists' };
    }
    if (doc.uri.startsWith('content://')) {
      // SAF content:// URIs don't support temp-file+rename; degrade to the
      // documented safe path instead of risking a partial write.
      const picked = await DocumentPicker.getDocumentAsync({
        type: 'application/pdf',
        copyToCacheDirectory: false,
        multiple: false,
      });
      if (picked.canceled) return { ok: false, canceled: true };
      const asset = picked.assets[0];
      if (!asset) return { ok: false, error: 'No destination selected' };
      await atomicWrite(new File(asset.uri), bytes);
      await markSaved(docId);
      return { ok: true, path: asset.uri };
    }
    await atomicWrite(target, bytes);

    await markSaved(docId);
    // Update fingerprint to the newly-written file.
    const { fingerprintSource } = await import('@/project/project-manager');
    const fp = await fingerprintSource(doc.uri);
    useProjectStore.getState().updateProject(docId, { sourceFingerprint: fp });
    await saveProject(docId);
    return { ok: true, path: doc.uri };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

/** Share a copy via the system share sheet (temp copy, then cleanup). */
export async function shareDocument(docId: string): Promise<SaveResult> {
  try {
    const bytes = await buildExportBytes(docId, { flatten: true });
    const doc = await useMetadataStore.getState().getById(docId);
    const baseName = (doc?.name ?? 'document.pdf').replace(/\.pdf$/i, '') + '.pdf';
    const dir = ensureDir(storagePaths.shareDir);
    const file = await atomicWriteToDir(dir, baseName, bytes);
    if (!(await Sharing.isAvailableAsync())) {
      return { ok: false, error: 'Chia sẻ không khả dụng' };
    }
    await Sharing.shareAsync(file.uri, { mimeType: 'application/pdf', dialogTitle: 'Chia sẻ PDF' });
    removeTempFile(file.uri);
    return { ok: true, path: file.uri };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

/** Duplicate: export a copy into cache and register as a new recent document. */
export async function duplicateDocument(docId: string): Promise<SaveResult> {
  try {
    const bytes = await buildExportBytes(docId, { flatten: true });
    const doc = await useMetadataStore.getState().getById(docId);
    const baseName = (doc?.name ?? 'document.pdf').replace(/\.pdf$/i, '') + '-bản sao.pdf';
    const dir = ensureDir(storagePaths.duplicatesDir);
    const file = await atomicWriteToDir(dir, baseName, bytes);

    const newId = uuid();
    const now = new Date().toISOString();
    await useMetadataStore.getState().upsert({
      id: newId,
      uri: file.uri,
      name: baseName,
      size: file.size,
      pageCount: 0,
      lastOpened: now,
      modifiedAt: now,
      isFavorite: false,
      isImportedCopy: true,
    });
    return { ok: true, path: file.uri };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

/** Extract selected pages into a new document (saved as a copy). */
export async function extractAndSave(docId: string, pageIndexes: number[]): Promise<SaveResult> {
  try {
    const doc = await useMetadataStore.getState().getById(docId);
    if (!doc) return { ok: false, error: 'Document not found' };
    const bytes = await readPdfBytes(doc.uri);
    if (!bytes) return { ok: false, error: 'Source unreadable' };
    const result = await extractPagesToPdf(docId, bytes, pageIndexes);
    const baseName = (doc.name ?? 'document.pdf').replace(/\.pdf$/i, '') + '-trích-xuất.pdf';
    const dir = ensureDir(storagePaths.duplicatesDir);
    const file = await atomicWriteToDir(dir, baseName, result.bytes);

    const newId = uuid();
    const now = new Date().toISOString();
    await useMetadataStore.getState().upsert({
      id: newId,
      uri: file.uri,
      name: baseName,
      size: file.size,
      pageCount: result.pageCount,
      lastOpened: now,
      modifiedAt: now,
      isFavorite: false,
      isImportedCopy: true,
    });
    return { ok: true, path: file.uri };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}
