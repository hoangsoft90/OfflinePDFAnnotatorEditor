/**
 * Project persistence primitives (native) — file-system backed.
 *
 * Shared business logic (`project-manager.ts`, `conflict.ts`) depends on these
 * functions; the web build resolves `io.web.ts` (virtual web FS) instead.
 */
import { File } from 'expo-file-system';

import type { Project, SourceFingerprint } from '@/models/project';
import { PROJECT_SCHEMA_VERSION } from '@/models/project';
import { resolveWorkspace } from '@/storage/workspace';
import { useProjectStore } from '@/store/use-project-store';

/** Builds a source fingerprint from file metadata (ADR-009). */
export async function fingerprintSource(uri: string): Promise<SourceFingerprint> {
  const file = new File(uri);
  let size = 0;
  let lastModified = Date.now();
  try {
    if (file.exists) size = file.size;
    const info = file.info();
    const m = info?.modificationTime;
    if (typeof m === 'number' && m > 0) lastModified = m;
  } catch {
    // fall back to defaults
  }
  return { size, lastModified };
}

/** Stats the current source file (used by conflict detection). */
export async function statSource(uri: string): Promise<{
  size: number;
  lastModified: number;
  readable: boolean;
}> {
  try {
    const file = new File(uri);
    if (!file.exists) return { size: 0, lastModified: 0, readable: false };
    // modificationTime may be unavailable for SAF content:// URIs; leave it 0
    // so the comparison falls back to size-only instead of a false conflict.
    let lastModified = 0;
    try {
      const info = file.info();
      const m = (info as { modificationTime?: number }).modificationTime;
      if (typeof m === 'number' && m > 0) lastModified = m;
    } catch {
      // modificationTime unavailable — keep 0 (size-only comparison)
    }
    return { size: file.size, lastModified, readable: true };
  } catch {
    return { size: 0, lastModified: 0, readable: false };
  }
}

/** Persists the current project JSON to the workspace. */
export async function saveProject(docId: string): Promise<void> {
  const project = useProjectStore.getState().projects[docId];
  if (!project) return;
  const ws = resolveWorkspace(docId);
  const file = ws.projectFile;
  if (!file.exists) file.create({ intermediates: true });
  file.write(JSON.stringify(project, null, 2));
}

/** Loads a project JSON from disk (used for recovery/session restore). */
export async function loadProjectFromDisk(docId: string): Promise<Project | null> {
  const ws = resolveWorkspace(docId);
  if (!ws.projectFile.exists) return null;
  try {
    const text = await ws.projectFile.text();
    const parsed = JSON.parse(text) as Project;
    if (parsed.schemaVersion !== PROJECT_SCHEMA_VERSION) return null;
    return parsed;
  } catch {
    return null;
  }
}
