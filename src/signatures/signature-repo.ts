/**
 * Signature asset storage (signature/manager spec, ADR-006).
 * Signatures live in the dedicated app-private `signatures/` directory with
 * an `index.json` for the picker list. Never in shared media directories.
 */
import { Directory, File } from 'expo-file-system';

import { ensureDir, storagePaths } from '@/storage/storage-paths';
import { uuid } from '@/utils/uuid';
import type { Signature } from '@/models/signature';

export class SignatureRepo {
  private get dir(): Directory {
    return ensureDir(storagePaths.signaturesDir);
  }

  private indexFile(): File {
    return new File(this.dir, 'index.json');
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
    const f = this.indexFile();
    if (!f.exists) f.create({ intermediates: true });
    f.write(JSON.stringify(list, null, 2));
  }

  /** Saves a signature PNG (bytes) and registers it. */
  async saveFromBytes(bytes: Uint8Array): Promise<Signature> {
    const id = uuid();
    const file = new File(this.dir, `${id}.png`);
    if (!file.exists) file.create({ intermediates: true });
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

  /** Saves a signature from an existing temp file URI (view-shot output). */
  async saveFromFile(sourceUri: string): Promise<Signature> {
    const id = uuid();
    const dest = new File(this.dir, `${id}.png`);
    const src = new File(sourceUri);
    await src.copy(dest);
    const sig: Signature = { id, imagePath: `${id}.png`, uri: dest.uri, createdAt: new Date().toISOString() };
    const list = this.readIndex();
    list.push(sig);
    this.writeIndex(list);
    return sig;
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
        const f = new File(this.dir, found.imagePath);
        if (f.exists) f.delete();
      } catch {
        // ignore
      }
      this.writeIndex(list.filter((s) => s.id !== id));
    }
  }
}

export const signatureRepo = new SignatureRepo();
