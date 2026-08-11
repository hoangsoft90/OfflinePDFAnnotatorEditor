/**
 * Export core (shared, platform-neutral).
 *
 * `SaveResult`, `buildExportBytes` and `markSaved` are used identically by the
 * native save actions (`save-actions.ts`) and the web save actions
 * (`save-actions.web.ts`). Platform-specific parts live in those files.
 */
import { exportProject } from '@/export/exporter';
import { readPdfBytes } from '@/files/read-pdf';
import { useProjectStore } from '@/store/use-project-store';
import { useMetadataStore } from '@/store/use-metadata-store';
import { resolveSignatureAsset } from '@/signatures/signature-assets';
import { saveProject } from '@/project/project-manager';

export interface SaveResult {
  ok: boolean;
  path?: string;
  canceled?: boolean;
  conflict?: boolean;
  error?: string;
}

function resolveAssetFor(docId: string): (p: string) => string | null {
  return (p) => resolveSignatureAsset(docId, p);
}

/** Exports current project state to bytes. */
export async function buildExportBytes(
  docId: string,
  options?: { flatten?: boolean }
): Promise<Uint8Array> {
  const doc = await useMetadataStore.getState().getById(docId);
  if (!doc) throw new Error('Document not found');
  const bytes = await readPdfBytes(doc.uri);
  if (!bytes) throw new Error('Source PDF unreadable');
  const result = await exportProject(docId, bytes, {
    flatten: options?.flatten ?? true,
    resolveAsset: resolveAssetFor(docId),
  });
  return result.bytes;
}

/** After a successful save/export: mark clean, compact journal. */
export async function markSaved(docId: string): Promise<void> {
  const { journalFor } = await import('@/journal/autosave');
  const project = useProjectStore.getState().projects[docId];
  if (project) {
    useProjectStore.getState().updateProject(docId, { dirty: false });
    await saveProject(docId);
    journalFor(docId).compact();
  }
}
