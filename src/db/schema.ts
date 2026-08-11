/**
 * Metadata database schema (storage/metadata spec).
 * Only metadata lives here — never PDF bytes.
 */
import * as SQLite from 'expo-sqlite';

export const DB_NAME = 'offlinepdf.db';

const MIGRATIONS: string[] = [
  // v1 — initial schema
  `
  CREATE TABLE IF NOT EXISTS documents (
    id            TEXT PRIMARY KEY NOT NULL,
    uri           TEXT NOT NULL,
    name          TEXT NOT NULL,
    size          INTEGER NOT NULL DEFAULT 0,
    pageCount     INTEGER NOT NULL DEFAULT 0,
    lastOpened    TEXT NOT NULL,
    modifiedAt    TEXT NOT NULL,
    isFavorite    INTEGER NOT NULL DEFAULT 0,
    isImportedCopy INTEGER NOT NULL DEFAULT 0
  );
  CREATE INDEX IF NOT EXISTS idx_documents_lastOpened ON documents(lastOpened DESC);
  `,
];

export async function migrate(db: SQLite.SQLiteDatabase): Promise<void> {
  const row = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  let version = row?.user_version ?? 0;

  while (version < MIGRATIONS.length) {
    const sql = MIGRATIONS[version];
    await db.execAsync(sql);
    version += 1;
    await db.execAsync(`PRAGMA user_version = ${version}`);
  }
}

export async function openDatabase(): Promise<SQLite.SQLiteDatabase> {
  const db = await SQLite.openDatabaseAsync(DB_NAME);
  await migrate(db);
  return db;
}
