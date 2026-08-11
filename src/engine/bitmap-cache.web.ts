/**
 * LRU cache for rendered page bitmaps — web variant.
 *
 * Memory-only: rendered pages are already data: URLs (renderable by RN-web),
 * and re-persisting them is unnecessary for the session-based web build.
 * Keeps the same `BitmapCache` API as the native disk-backed version.
 */
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

  async get(pageIndex: number, scale: number): Promise<RenderedPage | null> {
    const key = this.key(pageIndex, scale);
    const hit = this.mem.get(key);
    if (hit) {
      // refresh LRU position
      this.mem.delete(key);
      this.mem.set(key, hit);
      return hit;
    }
    return null;
  }

  async put(pageIndex: number, scale: number, page: RenderedPage): Promise<void> {
    const key = this.key(pageIndex, scale);
    if (this.mem.has(key)) this.mem.delete(key);
    this.mem.set(key, page);
    if (this.mem.size > MAX_MEMORY_ENTRIES) {
      const oldest = this.mem.keys().next().value;
      if (oldest !== undefined) this.mem.delete(oldest);
    }
  }

  clear(): void {
    this.mem.clear();
    void this.docId;
  }
}

/** Decodes a data: URL into bytes (kept for interface parity with native). */
export function base64FromDataUri(dataUri: string): Uint8Array {
  const comma = dataUri.indexOf(',');
  const b64 = dataUri.slice(comma + 1);
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

/** No-op on web — the web cache is memory-only. */
export function ensurePagesDir(_docId: string): void {
  // nothing to do
}
