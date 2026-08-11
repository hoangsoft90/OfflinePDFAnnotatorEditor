/**
 * ProjectManager — creates the non-destructive project layer for a document:
 * stable pageIds (ADR-007), source fingerprint (ADR-009), and JSON persistence
 * in the workspace (ADR-002). Original PDF is never modified.
 *
 * File-system primitives live in `./io` (platform-specific; web resolves
 * `io.web.ts`); this module holds the shared business logic.
 */
import type { Project, SourceFingerprint } from '@/models/project';
import { createProject } from '@/models/project';
import type { PageMeta, PageId } from '@/models/page';
import { createDocumentPageMetas } from '@/project/page-identity';
import { resolveWorkspace } from '@/storage/workspace';
import { useProjectStore } from '@/store/use-project-store';
import type { Document } from '@/models/document';
import type { PdfOpenResult } from '@/engine/types';
import {
  fingerprintSource,
  loadProjectFromDisk,
  saveProject,
  statSource,
} from '@/project/io';

export interface ProjectSession {
  project: Project;
  pageMetas: Record<PageId, PageMeta>;
}

// Platform-specific IO is re-exported so existing importers keep working.
export { fingerprintSource, loadProjectFromDisk, saveProject, statSource };
export type { SourceFingerprint };

/**
 * Initializes the project layer for a document. Creates pageIds from the
 * engine's open result if no project exists; otherwise restores the stored
 * project and page metas. Persists the project JSON.
 */
export async function initProjectForDoc(docId: string, doc: Document, opened: PdfOpenResult): Promise<ProjectSession> {
  const store = useProjectStore.getState();
  const inMemory = store.projects[docId];
  resolveWorkspace(docId);

  let project: Project;
  let pageMetas: Record<PageId, PageMeta>;

  if (inMemory) {
    project = inMemory;
    pageMetas = store.pageMetas[docId] ?? {};
    if (project.pageOrder.length === 0 && opened.pageIds.length > 0) {
      project = { ...project, pageOrder: opened.pageIds };
    }
  } else {
    // CRITICAL (recovery correctness): reuse the on-disk project (old sessionId,
    // pageOrder, dirty flag) so promptRecovery can replay its journal. Creating
    // a fresh project here would silently orphan the previous session's
    // annotations (they live only in the journal keyed by sessionId).
    const fromDisk = await loadProjectFromDisk(docId);
    if (fromDisk) {
      project = fromDisk;
      if (project.pageOrder.length === 0 && opened.pageIds.length > 0) {
        project = { ...project, pageOrder: opened.pageIds };
      }
      pageMetas = buildMetasFromOrder(project, opened);
    } else {
      // First open: build page identity from the engine.
      pageMetas = createDocumentPageMetas(opened);
      const fingerprint = await fingerprintSource(doc.uri);
      project = createProject({
        documentId: doc.id,
        sourceFingerprint: fingerprint,
        pageOrder: opened.pageIds,
        pageRotations: {},
      });
    }
  }

  store.setProject(docId, project);
  store.setPageMetas(docId, pageMetas);
  await saveProject(docId);
  return { project, pageMetas };
}

/** Rebuilds page metas from the on-disk project's pageOrder + engine sizes. */
function buildMetasFromOrder(project: Project, opened: PdfOpenResult): Record<PageId, PageMeta> {
  const metas: Record<PageId, PageMeta> = {};
  const sizeById = new Map<string, { widthPts: number; heightPts: number }>();
  opened.pageIds.forEach((id, i) => {
    sizeById.set(id, opened.pageSizes[i] ?? { widthPts: 595, heightPts: 842 });
  });
  for (const pageId of project.pageOrder) {
    const size = sizeById.get(pageId) ?? { widthPts: 595, heightPts: 842 };
    metas[pageId] = {
      pageId,
      widthPts: size.widthPts,
      heightPts: size.heightPts,
      rotation: project.pageRotations?.[pageId] ?? 0,
    };
  }
  return metas;
}
