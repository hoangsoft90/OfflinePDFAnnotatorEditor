/**
 * Conflict detection (document/conflict spec, ADR-009).
 * Compares the current source file against the Project's recorded fingerprint;
 * if the file changed outside the app, overwrite must be blocked.
 */
import type { SourceFingerprint } from '@/models/project';
import { statSource } from '@/project/io';

export interface SourceStat {
  size: number;
  lastModified: number;
  readable: boolean;
}

export { statSource };

/** True if the current file differs from the recorded fingerprint. */
export function fingerprintMatches(current: SourceStat, recorded: SourceFingerprint): boolean {
  if (!recorded) return true;
  if (!current.readable) return false;
  if (current.size !== recorded.size) return false;
  // Only compare modificationTime when both sides have a real value;
  // otherwise fall back to size (avoids false conflicts on content:// URIs).
  if (current.lastModified > 0 && recorded.lastModified > 0) {
    return current.lastModified === recorded.lastModified;
  }
  return true;
}

/** Detects a conflict for a doc's source file. */
export async function detectConflict(uri: string, fingerprint: SourceFingerprint | undefined): Promise<boolean> {
  if (!fingerprint) return false;
  const current = await statSource(uri);
  return !fingerprintMatches(current, fingerprint);
}
