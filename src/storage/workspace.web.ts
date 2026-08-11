/**
 * Per-document workspace management (storage/layout spec) — web variant.
 * A workspace is created lazily on first open of a document.
 */
import { WebDirectory, WebFile } from '@/storage/web-fs';

// Import the web variant explicitly so tsc type-checks against the same
// implementation Metro resolves at runtime (`.web` platform extension).
import { ensureDir, storagePaths } from '@/storage/storage-paths.web';

export interface Workspace {
  docId: string;
  root: WebDirectory;
  assets: WebDirectory;
  projectFile: WebFile;
  projectUri: string;
}

export function resolveWorkspace(docId: string): Workspace {
  const root = ensureDir(storagePaths.projectDir(docId));
  const assets = ensureDir(storagePaths.assetsDir(docId));
  const projectFile = new WebFile(root, 'project.json');
  return {
    docId,
    root,
    assets,
    projectFile,
    projectUri: projectFile.uri,
  };
}

/** True if a project.json already exists for this document. */
export function hasProject(docId: string): boolean {
  return new WebFile(storagePaths.projectDir(docId), 'project.json').exists;
}

/** Removes the whole workspace for a docId (used by 'remove from recents'). */
export function deleteWorkspace(docId: string): void {
  const dir = storagePaths.projectDir(docId);
  if (dir.exists) {
    dir.delete();
  }
}
