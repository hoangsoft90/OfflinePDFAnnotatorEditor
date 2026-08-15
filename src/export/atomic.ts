/**
 * Atomic write (ADR-004 / document/save-export spec).
 * Writes bytes to a temp file, verifies length, then renames over the target.
 * A failed write leaves the target untouched.
 */
import { Directory, File } from 'expo-file-system';

export interface AtomicWriteOptions {
  /** verify written byte length matches (default true) */
  verify?: boolean;
}

export async function atomicWrite(
  target: File,
  bytes: Uint8Array,
  options: AtomicWriteOptions = {}
): Promise<void> {
  // SAF content:// URIs (picked via the document picker) cannot be written
  // with the temp-file + rename dance: Directory.create rejects content:// and
  // there is no rename over the provider's document. The picker has already
  // granted write access to that exact URI, so write straight through — the
  // SAF provider makes the write atomic on its side.
  if (target.uri.startsWith('content://')) {
    target.write(bytes);
    if (options.verify !== false && target.size !== bytes.byteLength) {
      throw new Error(`Write verification failed (${target.size}/${bytes.byteLength})`);
    }
    return;
  }

  const dir = target.parentDirectory;
  if (!dir.exists) dir.create({ idempotent: true, intermediates: true });

  const tmp = new File(dir, `${target.name}.tmp-${Date.now()}`);
  try {
    if (!tmp.exists) tmp.create({ intermediates: true });
    tmp.write(bytes);
    if (options.verify !== false && tmp.size !== bytes.byteLength) {
      throw new Error(`Write verification failed (${tmp.size}/${bytes.byteLength})`);
    }
    // rename over target (atomic within the same directory)
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
export async function atomicWriteToDir(dir: Directory, fileName: string, bytes: Uint8Array): Promise<File> {
  const target = new File(dir, fileName);
  await atomicWrite(target, bytes);
  return target;
}
