/**
 * Document metadata (SQLite-backed) — metadata only, never PDF bytes.
 * Mirrors the blueprint's `Document` model (plan2.md §4).
 */
export interface Document {
  /** Stable id (uuid) */
  id: string;
  /** content:// or file:// URI from SAF / external intents */
  uri: string;
  /** Display name (includes extension) */
  name: string;
  /** File size in bytes */
  size: number;
  /** Total page count (0 until opened) */
  pageCount: number;
  /** Last time the user opened it */
  lastOpened: string; // ISO 8601
  /** Last time the file/metadata changed */
  modifiedAt: string; // ISO 8601
  isFavorite: boolean;
  /**
   * True when the document was opened via an external intent and only exists
   * as an app-private copy (ADR-008). Such rows may be cleaned up when the
   * user clears history.
   */
  isImportedCopy?: boolean;
}

export const DOCUMENT_COLUMNS = [
  'id',
  'uri',
  'name',
  'size',
  'pageCount',
  'lastOpened',
  'modifiedAt',
  'isFavorite',
  'isImportedCopy',
] as const;
