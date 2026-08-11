/**
 * Typed data access for the `documents` table (storage/metadata spec).
 */
import * as SQLite from 'expo-sqlite';

import { openDatabase } from '@/db/schema';
import { RECENTS_LIMIT, type MetadataRepo } from '@/db/metadata-repo';
import type { Document } from '@/models/document';

interface Row {
  id: string;
  uri: string;
  name: string;
  size: number;
  pageCount: number;
  lastOpened: string;
  modifiedAt: string;
  isFavorite: number;
  isImportedCopy: number;
}

function toDocument(r: Row): Document {
  return {
    id: r.id,
    uri: r.uri,
    name: r.name,
    size: r.size,
    pageCount: r.pageCount,
    lastOpened: r.lastOpened,
    modifiedAt: r.modifiedAt,
    isFavorite: r.isFavorite === 1,
    isImportedCopy: r.isImportedCopy === 1,
  };
}

/**
 * SQLite-backed metadata repository (iOS/Android).
 * Web uses the localStorage implementation in `documents-repo.web.ts`.
 */
export class DocumentsRepo implements MetadataRepo {
  constructor(private readonly db: SQLite.SQLiteDatabase) {}

  async upsert(doc: Document): Promise<void> {
    await this.db.runAsync(
      `INSERT INTO documents (id, uri, name, size, pageCount, lastOpened, modifiedAt, isFavorite, isImportedCopy)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
         uri = excluded.uri,
         name = excluded.name,
         size = excluded.size,
         pageCount = excluded.pageCount,
         lastOpened = excluded.lastOpened,
         modifiedAt = excluded.modifiedAt,
         isFavorite = excluded.isFavorite,
         isImportedCopy = excluded.isImportedCopy`,
      [
        doc.id,
        doc.uri,
        doc.name,
        doc.size,
        doc.pageCount,
        doc.lastOpened,
        doc.modifiedAt,
        doc.isFavorite ? 1 : 0,
        doc.isImportedCopy ? 1 : 0,
      ]
    );
  }

  async listRecent(limit: number = RECENTS_LIMIT): Promise<Document[]> {
    const rows = await this.db.getAllAsync<Row>(
      `SELECT * FROM documents ORDER BY lastOpened DESC LIMIT ?`,
      [limit]
    );
    return rows.map(toDocument);
  }

  async listFavorites(): Promise<Document[]> {
    const rows = await this.db.getAllAsync<Row>(
      `SELECT * FROM documents WHERE isFavorite = 1 ORDER BY lastOpened DESC`
    );
    return rows.map(toDocument);
  }

  async getById(id: string): Promise<Document | null> {
    const row = await this.db.getFirstAsync<Row>(
      `SELECT * FROM documents WHERE id = ?`,
      [id]
    );
    return row ? toDocument(row) : null;
  }

  async touch(id: string, pageCount: number, modifiedAt: string): Promise<void> {
    await this.db.runAsync(
      `UPDATE documents SET pageCount = ?, lastOpened = ?, modifiedAt = ? WHERE id = ?`,
      [pageCount, new Date().toISOString(), modifiedAt, id]
    );
  }

  async setFavorite(id: string, isFavorite: boolean): Promise<void> {
    await this.db.runAsync(`UPDATE documents SET isFavorite = ? WHERE id = ?`, [
      isFavorite ? 1 : 0,
      id,
    ]);
  }

  async rename(id: string, name: string): Promise<void> {
    await this.db.runAsync(`UPDATE documents SET name = ? WHERE id = ?`, [
      name,
      id,
    ]);
  }

  async remove(id: string): Promise<void> {
    await this.db.runAsync(`DELETE FROM documents WHERE id = ?`, [id]);
  }

  async clearAll(): Promise<void> {
    await this.db.runAsync(`DELETE FROM documents`);
  }
}

/** Native factory — opens the SQLite database and returns the repository. */
export async function createMetadataRepo(): Promise<MetadataRepo> {
  const db = await openDatabase();
  return new DocumentsRepo(db);
}
