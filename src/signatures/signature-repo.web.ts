/**
 * Signature asset storage (signature/manager spec, ADR-006) — web variant.
 * Same API as `signature-repo.ts`; resolved by Metro via the `.web` extension.
 * Backed by the virtual web FS — signature PNGs (small) survive page reloads.
 */
import { WebDirectory, WebFile, dataUrlToBytes } from '@/storage/web-fs';

import { ensureDir, storagePaths } from '@/storage/storage-paths.web';
import { uuid } from '@/utils/uuid';
import type { Signature } from '@/models/signature';

export class SignatureRepo {
  private get dir(): WebDirectory {
    return ensureDir(storagePaths.signaturesDir);
  }

  private indexFile(): WebFile {
    return new WebFile(this.dir, 'index.json');
  }

  private readIndex(): Signature[] {
    try {
      const f = this.indexFile();
      if (!f.exists) return [];
      return JSON.parse(f.textSync()) as Signature[];
    } catch {
      return [];
    }
  }

  private writeIndex(list: Signature[]): void {
    this.indexFile().write(JSON.stringify(list, null, 2));
  }

  /** Saves a signature PNG (bytes) and registers it. */
  async saveFromBytes(bytes: Uint8Array): Promise<Signature> {
    const id = uuid();
    const file = new WebFile(this.dir, `${id}.png`);
    file.write(bytes);
    const sig: Signature = {
      id,
      imagePath: `${id}.png`,
      uri: file.uri,
      createdAt: new Date().toISOString(),
    };
    const list = this.readIndex();
    list.push(sig);
    this.writeIndex(list);
    return sig;
  }

  /** Saves a signature from a data: URL (web signature pad capture output). */
  async saveFromFile(sourceUri: string): Promise<Signature> {
    const bytes = dataUrlToBytes(sourceUri) ?? (await fetchToBytes(sourceUri));
    if (!bytes) throw new Error('Không thể đọc ảnh chữ ký');
    return this.saveFromBytes(bytes);
  }

  list(): Signature[] {
    return this.readIndex().sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  /** Deletes the asset + index entry. Placed copies on documents are unaffected. */
  delete(id: string): void {
    const list = this.readIndex();
    const found = list.find((s) => s.id === id);
    if (found) {
      try {
        const f = new WebFile(this.dir, found.imagePath);
        if (f.exists) f.delete();
      } catch {
        // ignore
      }
      this.writeIndex(list.filter((s) => s.id !== id));
    }
  }
}

async function fetchToBytes(uri: string): Promise<Uint8Array | null> {
  try {
    const resp = await fetch(uri);
    if (!resp.ok) return null;
    return new Uint8Array(await resp.arrayBuffer());
  } catch {
    return null;
  }
}

export const signatureRepo = new SignatureRepo();
