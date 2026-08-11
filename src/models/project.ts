/**
 * Project — the non-destructive editing layer for a document (plan2.md §4).
 * Persisted as JSON in the document's workspace directory.
 */
import { uuid } from '@/utils/uuid';
import type { PageOrder } from './page';

export interface SourceFingerprint {
  /** Original file size in bytes at project creation */
  size: number;
  /** Original file lastModified epoch ms at project creation */
  lastModified: number;
  /** Optional sha-256 of the first 1KB (stronger check) */
  firstKbHash?: string;
}

export interface Project {
  id: string;
  documentId: string;
  /** Monotonic revision; bumped on each saved state */
  revision: number;
  dirty: boolean;
  createdAt: string;
  modifiedAt: string;
  /** Relative path (inside workspace) of the project.json, e.g. 'project.json' */
  projectPath: string;
  sourceFingerprint: SourceFingerprint;
  /** Ordered stable page ids (ADR-007) */
  pageOrder: PageOrder;
  /** Per-page rotation, keyed by pageId */
  pageRotations: Record<string, 0 | 90 | 180 | 270>;
  /** Active session id for journal scoping */
  sessionId: string;
  /** Version of the project schema */
  schemaVersion: number;
}

export const PROJECT_SCHEMA_VERSION = 1;

export function createProject(input: {
  id?: string;
  documentId: string;
  sourceFingerprint: SourceFingerprint;
  pageOrder: PageOrder;
  pageRotations?: Record<string, 0 | 90 | 180 | 270>;
  sessionId?: string;
}): Project {
  const now = new Date().toISOString();
  return {
    id: input.id ?? uuid(),
    documentId: input.documentId,
    revision: 0,
    dirty: false,
    createdAt: now,
    modifiedAt: now,
    projectPath: 'project.json',
    sourceFingerprint: input.sourceFingerprint,
    pageOrder: input.pageOrder,
    pageRotations: input.pageRotations ?? {},
    sessionId: input.sessionId ?? uuid(),
    schemaVersion: PROJECT_SCHEMA_VERSION,
  };
}
