/**
 * Save / Export actions (web) — browser download + Web Share API.
 *
 * Same functions and `SaveResult` semantics as the native `save-actions.ts`;
 * resolved by Metro via the `.web` extension. On web there is no file picker
 * for writing: "Save a copy…" and overwrite download the exported PDF, share
 * uses the Web Share API when available, and duplicates/extracts are written
 * to the virtual web FS and registered in recents.
 */
import { buildExportBytes, markSaved, type SaveResult } from '@/export/save-core';
import { detectConflict } from '@/project/conflict';
import { readPdfBytes } from '@/files/read-pdf';
import { WebFile, bytesToBlob } from '@/storage/web-fs';
import { storagePaths } from '@/storage/storage-paths.web';
import { useProjectStore } from '@/store/use-project-store';
import { useMetadataStore } from '@/store/use-metadata-store';
import { extractPagesToPdf } from '@/export/exporter';
import { uuid } from '@/utils/uuid';

function downloadBytes(bytes: Uint8Array, name: string): string {
  const blob = bytesToBlob(bytes);
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  return url;
}

/**
 * Save a copy… — downloads the exported PDF (page order, rotations,
 * annotations; flattened by default).
 */
export async function saveCopy(docId: string, options?: { flatten?: boolean }): Promise<SaveResult> {
  try {
    const bytes = await buildExportBytes(docId, options);
    const doc = await useMetadataStore.getState().getById(docId);
    const baseName = (doc?.name ?? 'document.pdf').replace(/\.pdf$/i, '') + '-annotated.pdf';
    const url = downloadBytes(bytes, baseName);
    await markSaved(docId);
    return { ok: true, path: url };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

/**
 * Overwrite original — web sources are immutable object URLs, so "overwrite"
 * exports the current state as a downloadable copy after the conflict check
 * (a changed/unreadable source still blocks, honoring ADR-009).
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
    const baseName = (doc.name ?? 'document.pdf').replace(/\.pdf$/i, '');
    const url = downloadBytes(bytes, `${baseName}-đã-ghi-đè.pdf`);
    await markSaved(docId);
    return { ok: true, path: url };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

/** Share a copy — Web Share API when available, else download. */
export async function shareDocument(docId: string): Promise<SaveResult> {
  try {
    const bytes = await buildExportBytes(docId, { flatten: true });
    const doc = await useMetadataStore.getState().getById(docId);
    const baseName = (doc?.name ?? 'document.pdf').replace(/\.pdf$/i, '') + '.pdf';
    if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
      try {
        await navigator.share({
          files: [new File([bytesToBlob(bytes)], baseName, { type: 'application/pdf' })],
          title: 'Chia sẻ PDF',
        });
        return { ok: true };
      } catch {
        // user canceled or share unsupported — fall through to download
      }
    }
    const url = downloadBytes(bytes, baseName);
    return { ok: true, path: url };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

/** Duplicate: export a copy into the virtual web FS + register as recents. */
export async function duplicateDocument(docId: string): Promise<SaveResult> {
  try {
    const bytes = await buildExportBytes(docId, { flatten: true });
    const doc = await useMetadataStore.getState().getById(docId);
    const baseName = (doc?.name ?? 'document.pdf').replace(/\.pdf$/i, '') + '-bản sao.pdf';
    const file = new WebFile(storagePaths.duplicatesDir, baseName);
    file.write(bytes);

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

/** Extract selected pages into a new document (download + recents row). */
export async function extractAndSave(docId: string, pageIndexes: number[]): Promise<SaveResult> {
  try {
    const doc = await useMetadataStore.getState().getById(docId);
    if (!doc) return { ok: false, error: 'Document not found' };
    const bytes = await readPdfBytes(doc.uri);
    if (!bytes) return { ok: false, error: 'Source unreadable' };
    const result = await extractPagesToPdf(docId, bytes, pageIndexes);
    const baseName = (doc.name ?? 'document.pdf').replace(/\.pdf$/i, '') + '-trích-xuất.pdf';
    const file = new WebFile(storagePaths.duplicatesDir, baseName);
    file.write(result.bytes);

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
