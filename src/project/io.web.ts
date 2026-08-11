/**
 * Project persistence primitives (web) — virtual web FS backed.
 * Same API as `io.ts`; resolved by Metro via the `.web` extension.
 */
import type { Project, SourceFingerprint } from '@/models/project';
import { PROJECT_SCHEMA_VERSION } from '@/models/project';
import { resolveWorkspace } from '@/storage/workspace.web';
import { useProjectStore } from '@/store/use-project-store';

/** Builds a source fingerprint — real size from the (blob/data) URL. */
export async function fingerprintSource(uri: string): Promise<SourceFingerprint> {
  let size = 0;
  try {
    const resp = await fetch(uri);
    if (resp.ok) size = (await resp.arrayBuffer()).byteLength;
  } catch {
    // unreadable — keep 0
  }
  // Web sources are immutable object URLs — no meaningful lastModified.
  return { size, lastModified: Date.now() };
}

/** Stats the current source file (size-only; lastModified unavailable on web). */
export async function statSource(uri: string): Promise<{
  size: number;
  lastModified: number;
  readable: boolean;
}> {
  try {
    const resp = await fetch(uri);
    if (!resp.ok) return { size: 0, lastModified: 0, readable: false };
    const size = (await resp.arrayBuffer()).byteLength;
    return { size, lastModified: 0, readable: true };
  } catch {
    return { size: 0, lastModified: 0, readable: false };
  }
}

/** Persists the current project JSON into the virtual web FS. */
export async function saveProject(docId: string): Promise<void> {
  const project = useProjectStore.getState().projects[docId];
  if (!project) return;
  const ws = resolveWorkspace(docId);
  ws.projectFile.write(JSON.stringify(project, null, 2));
}

/** Loads a project JSON from the virtual web FS. */
export async function loadProjectFromDisk(docId: string): Promise<Project | null> {
  const ws = resolveWorkspace(docId);
  if (!ws.projectFile.exists) return null;
  try {
    const parsed = JSON.parse(ws.projectFile.textSync()) as Project;
    if (parsed.schemaVersion !== PROJECT_SCHEMA_VERSION) return null;
    return parsed;
  } catch {
    return null;
  }
}
