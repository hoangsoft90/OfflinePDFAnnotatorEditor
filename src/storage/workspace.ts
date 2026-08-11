/**
 * Per-document workspace management (storage/layout spec).
 * A workspace is created lazily on first open of a document.
 */
import { Directory, File } from 'expo-file-system';

import { ensureDir, storagePaths } from '@/storage/storage-paths';

export interface Workspace {
  docId: string;
  root: Directory;
  assets: Directory;
  projectFile: File;
  projectUri: string;
}

export function resolveWorkspace(docId: string): Workspace {
  const root = ensureDir(storagePaths.projectDir(docId));
  const assets = ensureDir(storagePaths.assetsDir(docId));
  const projectFile = new File(root, 'project.json');
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
  return new File(storagePaths.projectDir(docId), 'project.json').exists;
}

/** Removes the whole workspace for a docId (used by 'remove from recents'). */
export function deleteWorkspace(docId: string): void {
  const dir = storagePaths.projectDir(docId);
  if (dir.exists) {
    dir.delete();
  }
}
