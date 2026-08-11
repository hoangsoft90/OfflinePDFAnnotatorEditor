/**
 * Web metadata repository — localStorage backend (storage/metadata spec).
 *
 * This file is resolved by Metro on web only (`.web` platform extension),
 * keeping the app shell free of expo-sqlite in the browser. It implements
 * the exact same `MetadataRepo` semantics as the SQLite adapter
 * (`documents-repo.ts`), so stores and business logic are platform-agnostic.
 */
import type { Document } from '@/models/document';
import { RECENTS_LIMIT, type MetadataRepo } from '@/db/metadata-repo';

/** Versioned storage key so future migrations can read old payloads. */
const STORAGE_KEY = 'offlinepdf.documents.v1';

function readAll(): Document[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as Document[]) : [];
  } catch {
    // Corrupt or unavailable storage — treat as empty (never crash).
    return [];
  }
}

function writeAll(docs: Document[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(docs));
  } catch (e) {
    // Storage unavailable/quota exceeded — surface like a DB failure.
    throw new Error(`Không thể ghi metadata: ${e instanceof Error ? e.message : String(e)}`);
  }
}

function newestFirst(docs: Document[]): Document[] {
  return [...docs].sort((a, b) => (a.lastOpened < b.lastOpened ? 1 : -1));
}

export class WebDocumentsRepo implements MetadataRepo {
  async upsert(doc: Document): Promise<void> {
    const docs = readAll();
    const idx = docs.findIndex((d) => d.id === doc.id);
    if (idx >= 0) {
      docs[idx] = doc;
    } else {
      docs.push(doc);
    }
    writeAll(docs);
  }

  async listRecent(limit: number = RECENTS_LIMIT): Promise<Document[]> {
    return newestFirst(readAll()).slice(0, limit);
  }

  async listFavorites(): Promise<Document[]> {
    return newestFirst(readAll().filter((d) => d.isFavorite));
  }

  async getById(id: string): Promise<Document | null> {
    return readAll().find((d) => d.id === id) ?? null;
  }

  async touch(id: string, pageCount: number, modifiedAt: string): Promise<void> {
    const docs = readAll();
    const doc = docs.find((d) => d.id === id);
    if (!doc) return;
    doc.pageCount = pageCount;
    doc.lastOpened = new Date().toISOString();
    doc.modifiedAt = modifiedAt;
    writeAll(docs);
  }

  async setFavorite(id: string, isFavorite: boolean): Promise<void> {
    const docs = readAll();
    const doc = docs.find((d) => d.id === id);
    if (!doc) return;
    doc.isFavorite = isFavorite;
    writeAll(docs);
  }

  async rename(id: string, name: string): Promise<void> {
    const docs = readAll();
    const doc = docs.find((d) => d.id === id);
    if (!doc) return;
    doc.name = name;
    writeAll(docs);
  }

  async remove(id: string): Promise<void> {
    writeAll(readAll().filter((d) => d.id !== id));
  }

  async clearAll(): Promise<void> {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (e) {
      throw new Error(`Không thể xóa metadata: ${e instanceof Error ? e.message : String(e)}`);
    }
  }
}

/** Web factory — returns the localStorage-backed repository. */
export async function createMetadataRepo(): Promise<MetadataRepo> {
  return new WebDocumentsRepo();
}
