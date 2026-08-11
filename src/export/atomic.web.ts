/**
 * Atomic write (ADR-004 / document/save-export spec) — web variant.
 *
 * The virtual web FS has no partial-write risk, but we keep the same contract:
 * write bytes, verify length, and only then treat the target as replaced.
 * Same exported API as the native `atomic.ts`; resolved by Metro via the
 * `.web` extension.
 */
import { WebDirectory, WebFile } from '@/storage/web-fs';

export interface AtomicWriteOptions {
  /** verify written byte length matches (default true) */
  verify?: boolean;
}

export async function atomicWrite(
  target: WebFile,
  bytes: Uint8Array,
  options: AtomicWriteOptions = {}
): Promise<void> {
  const tmp = new WebFile(target.parentDirectory, `${target.name}.tmp-${Date.now()}`);
  try {
    tmp.write(bytes);
    if (options.verify !== false && tmp.size !== bytes.byteLength) {
      throw new Error(`Write verification failed (${tmp.size}/${bytes.byteLength})`);
    }
    // replace target
    if (target.exists) target.delete();
    tmp.moveSync(target);
  } catch (e) {
    if (tmp.exists) {
      try {
        tmp.delete();
      } catch {
        // ignore
      }
    }
    throw e;
  }
}

/** Convenience: write atomically into a directory with a given filename. */
export async function atomicWriteToDir(
  dir: WebDirectory,
  fileName: string,
  bytes: Uint8Array
): Promise<WebFile> {
  const target = new WebFile(dir, fileName);
  await atomicWrite(target, bytes);
  return target;
}
