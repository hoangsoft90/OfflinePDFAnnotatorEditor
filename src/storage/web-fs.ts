/**
 * Minimal virtual file system for the web build.
 *
 * Only imported from `.web.ts` modules — never from native code. Gives the
 * storage layer the same `Directory`/`File`-style API on web:
 *
 * - Files are stored as bytes + mime type in memory (per session).
 * - Small files (<= WEBFS_LS_MAX) are additionally persisted to localStorage
 *   so project JSON, journals, and signature PNGs survive page reloads.
 * - Larger files (page bitmaps, imported PDFs) stay in memory for the session.
 * - File URIs are data: URLs so RN-web `<Image>` can render them directly.
 */

const LS_PREFIX = 'offlinepdf.webfs.';
export const WEBFS_LS_MAX = 512 * 1024;

interface Stored {
  bytes: Uint8Array;
  mime: string;
}

const memory = new Map<string, Stored>();
const createdDirs = new Set<string>();
// Computed data: URL per path — avoids re-decoding base64 on every `.uri`
// read (resolveSignatureAsset is called during annotation overlay renders).
const uriCache = new Map<string, string>();

/** Normalizes a virtual path (no leading/trailing slashes). */
export function joinPath(...parts: string[]): string {
  return parts
    .filter(Boolean)
    .join('/')
    .replace(/^\/+|\/+$/g, '');
}

function lsKey(path: string): string {
  return LS_PREFIX + path;
}

function mimeFor(name: string): string {
  if (/\.png$/i.test(name)) return 'image/png';
  if (/\.jpe?g$/i.test(name)) return 'image/jpeg';
  if (/\.json$/i.test(name)) return 'application/json';
  if (/\.pdf$/i.test(name)) return 'application/pdf';
  if (/\.jsonl$/i.test(name)) return 'application/json';
  return 'text/plain';
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode.apply(null, Array.from(bytes.subarray(i, i + chunk)));
  }
  return btoa(binary);
}

function base64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

/** Builds a renderable data: URL for a stored file. */
export function dataUriFor(mime: string, bytes: Uint8Array): string {
  if (mime.startsWith('text/')) {
    const text = new TextDecoder().decode(bytes);
    return `data:${mime};charset=utf-8,${encodeURIComponent(text)}`;
  }
  return `data:${mime};base64,${bytesToBase64(bytes)}`;
}

function readStored(path: string): Stored | null {
  const hit = memory.get(path);
  if (hit) return hit;
  try {
    const raw = localStorage.getItem(lsKey(path));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { b64: string; mime: string };
    const stored = { bytes: base64ToBytes(parsed.b64), mime: parsed.mime };
    memory.set(path, stored);
    return stored;
  } catch {
    return null;
  }
}

function writeStored(path: string, bytes: Uint8Array, mime: string): void {
  uriCache.delete(path);
  memory.set(path, { bytes, mime });
  try {
    if (bytes.byteLength <= WEBFS_LS_MAX) {
      localStorage.setItem(lsKey(path), JSON.stringify({ b64: bytesToBase64(bytes), mime }));
    } else {
      localStorage.removeItem(lsKey(path));
    }
  } catch {
    // localStorage unavailable/quota — in-memory copy still works this session
  }
}

function deleteStored(path: string): void {
  uriCache.delete(path);
  memory.delete(path);
  try {
    localStorage.removeItem(lsKey(path));
  } catch {
    // ignore
  }
}

function hasChildren(path: string): boolean {
  const prefix = path === '' ? '' : path + '/';
  for (const key of memory.keys()) {
    if (prefix === '' || key.startsWith(prefix)) return true;
  }
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i) ?? '';
      if (key.startsWith(LS_PREFIX) && (prefix === '' || key.slice(LS_PREFIX.length).startsWith(prefix))) {
        return true;
      }
    }
  } catch {
    // ignore
  }
  return false;
}

/** Virtual directory — implicit; exists once created or once it has files. */
export class WebDirectory {
  readonly path: string;

  constructor(...parts: (string | WebDirectory)[]) {
    this.path = joinPath(...parts.map((p) => (typeof p === 'string' ? p : p.path)));
  }

  get uri(): string {
    return `webfs://${this.path}`;
  }

  get name(): string {
    return this.path.split('/').pop() ?? '';
  }

  get exists(): boolean {
    if (this.path === '') return true;
    return createdDirs.has(this.path) || hasChildren(this.path);
  }

  create(_options?: { idempotent?: boolean; intermediates?: boolean }): void {
    createdDirs.add(this.path);
  }

  delete(): void {
    const prefix = this.path === '' ? '' : this.path + '/';
    for (const key of [...memory.keys()]) {
      if (prefix === '' || key.startsWith(prefix)) memory.delete(key);
    }
    for (const key of [...createdDirs]) {
      if (key === this.path || (prefix !== '' && key.startsWith(prefix))) createdDirs.delete(key);
    }
    try {
      for (let i = localStorage.length - 1; i >= 0; i--) {
        const key = localStorage.key(i) ?? '';
        if (key.startsWith(LS_PREFIX) && (prefix === '' || key.slice(LS_PREFIX.length).startsWith(prefix))) {
          localStorage.removeItem(key);
        }
      }
    } catch {
      // ignore
    }
  }
}

/** Virtual file — uri resolves to a data: URL (renderable by RN-web). */
export class WebFile {
  readonly path: string;

  constructor(dirOrPath: string | WebDirectory, name?: string) {
    if (name !== undefined) {
      const base = typeof dirOrPath === 'string' ? dirOrPath : dirOrPath.path;
      this.path = joinPath(base, name);
    } else {
      this.path = joinPath(String(dirOrPath));
    }
  }

  get name(): string {
    return this.path.split('/').pop() ?? '';
  }

  get parentDirectory(): WebDirectory {
    return new WebDirectory(this.path.split('/').slice(0, -1).join('/'));
  }

  get exists(): boolean {
    return readStored(this.path) !== null;
  }

  get size(): number {
    return readStored(this.path)?.bytes.byteLength ?? 0;
  }

  get uri(): string {
    const cached = uriCache.get(this.path);
    if (cached !== undefined) return cached;
    const stored = readStored(this.path);
    if (!stored) return '';
    const uri = dataUriFor(stored.mime, stored.bytes);
    uriCache.set(this.path, uri);
    return uri;
  }

  create(_options?: { intermediates?: boolean }): void {
    // files are implicit; parent dirs are marked on write
    this.parentDirectory.create({ idempotent: true });
  }

  write(data: string | Uint8Array): void {
    const bytes = typeof data === 'string' ? new TextEncoder().encode(data) : data;
    this.parentDirectory.create({ idempotent: true });
    writeStored(this.path, bytes, mimeFor(this.name));
  }

  text(): Promise<string> {
    return Promise.resolve(this.textSync());
  }

  textSync(): string {
    const stored = readStored(this.path);
    return stored ? new TextDecoder().decode(stored.bytes) : '';
  }

  bytes(): Promise<Uint8Array> {
    const stored = readStored(this.path);
    return Promise.resolve(stored ? stored.bytes.slice() : new Uint8Array());
  }

  copySync(dest: WebFile): void {
    const stored = readStored(this.path);
    if (stored) writeStored(dest.path, stored.bytes, stored.mime);
  }

  moveSync(dest: WebFile): void {
    this.copySync(dest);
    this.delete();
  }

  delete(): void {
    deleteStored(this.path);
  }

  info(): { modificationTime?: number } {
    return { modificationTime: Date.now() };
  }
}

/**
 * Wraps bytes into a Blob, casting away the ArrayBufferLike generic so
 * `Uint8Array` from pdf-lib/other libs satisfies the DOM BlobPart contract.
 */
export function bytesToBlob(bytes: Uint8Array, type = 'application/pdf'): Blob {
  return new Blob([bytes as unknown as BlobPart], { type });
}

/** Decodes a data: URL into bytes (used for captured signatures on web). */
export function dataUrlToBytes(dataUri: string): Uint8Array | null {
  try {
    const comma = dataUri.indexOf(',');
    if (comma < 0) return null;
    const meta = dataUri.slice(0, comma);
    const payload = dataUri.slice(comma + 1);
    if (/;base64/i.test(meta)) return base64ToBytes(payload);
    return new TextEncoder().encode(decodeURIComponent(payload));
  } catch {
    return null;
  }
}
