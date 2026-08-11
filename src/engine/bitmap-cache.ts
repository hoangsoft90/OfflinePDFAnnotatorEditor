/**
 * LRU cache for rendered page bitmaps: a bounded memory Map plus disk cache
 * under cache/pages/<docId>/ so re-opening a document avoids re-rendering.
 */
import { File } from 'expo-file-system';

import { ensureDir, storagePaths } from '@/storage/storage-paths';
import type { RenderedPage } from '@/engine/types';

const MAX_MEMORY_ENTRIES = 24;

export class BitmapCache {
  private mem = new Map<string, RenderedPage>();
  private readonly docId: string;

  constructor(docId: string) {
    this.docId = docId;
  }

  private key(pageIndex: number, scale: number): string {
    return `${pageIndex}@${Math.round(scale * 100)}`;
  }

  private diskFile(key: string): File {
    return new File(storagePaths.pagesDir(this.docId), `${key}.jpg`);
  }

  async get(pageIndex: number, scale: number): Promise<RenderedPage | null> {
    const key = this.key(pageIndex, scale);
    const hit = this.mem.get(key);
    if (hit) {
      // refresh LRU position
      this.mem.delete(key);
      this.mem.set(key, hit);
      return hit;
    }
    const file = this.diskFile(key);
    if (file.exists) {
      const size = file.size;
      const entry: RenderedPage = {
        uri: file.uri,
        widthPx: 0,
        heightPx: 0,
        scale,
      };
      // Recompute dimensions from the page aspect when needed by callers;
      // for now store the raw values and let the viewer use page sizes.
      void size;
      this.memSet(key, entry);
      return entry;
    }
    return null;
  }

  async put(pageIndex: number, scale: number, page: RenderedPage): Promise<void> {
    const key = this.key(pageIndex, scale);
    this.memSet(key, page);

    // Persist data-URI bitmaps to disk for future sessions.
    if (page.uri.startsWith('data:image')) {
      try {
        const file = this.diskFile(key);
        if (!file.exists) {
          file.create({ intermediates: true });
          file.write(base64FromDataUri(page.uri));
        }
      } catch {
        // best-effort disk caching
      }
    }
  }

  clear(): void {
    this.mem.clear();
    const dir = storagePaths.pagesDir(this.docId);
    if (dir.exists) dir.delete();
  }

  private memSet(key: string, value: RenderedPage): void {
    if (this.mem.has(key)) this.mem.delete(key);
    this.mem.set(key, value);
    if (this.mem.size > MAX_MEMORY_ENTRIES) {
      const oldest = this.mem.keys().next().value;
      if (oldest !== undefined) this.mem.delete(oldest);
    }
  }
}

export function base64FromDataUri(dataUri: string): Uint8Array {
  const comma = dataUri.indexOf(',');
  const b64 = dataUri.slice(comma + 1);
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

/** Pre-warms the pages dir for a doc (used by ensureDir semantics). */
export function ensurePagesDir(docId: string) {
  ensureDir(storagePaths.pagesDir(docId));
}
