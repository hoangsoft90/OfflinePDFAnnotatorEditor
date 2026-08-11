/**
 * Shared metadata repository contract (storage/metadata spec).
 *
 * Platform adapters implement this interface with identical semantics:
 * - iOS/Android: SQLite via expo-sqlite (`documents-repo.ts`)
 * - Web: localStorage (`documents-repo.web.ts`, resolved by Metro)
 *
 * Stores and business logic depend only on this interface, never on a
 * concrete storage backend.
 */
import type { Document } from '@/models/document';

/** Default cap for the recent-documents list (files/recent spec). */
export const RECENTS_LIMIT = 50;

export interface MetadataRepo {
  /** Insert or update a document row (upsert by stable id). */
  upsert(doc: Document): Promise<void>;

  /** Recently opened documents, newest first, capped at `limit`. */
  listRecent(limit?: number): Promise<Document[]>;

  /** Favorited documents, newest first. */
  listFavorites(): Promise<Document[]>;

  getById(id: string): Promise<Document | null>;

  /** Update page count, last-opened timestamp (now), and modified timestamp. */
  touch(id: string, pageCount: number, modifiedAt: string): Promise<void>;

  setFavorite(id: string, isFavorite: boolean): Promise<void>;

  rename(id: string, name: string): Promise<void>;

  remove(id: string): Promise<void>;

  clearAll(): Promise<void>;
}
