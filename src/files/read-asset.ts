/**
 * Reads binary asset bytes from a file URI (native). The web build resolves
 * `read-asset.web.ts` (fetch on data/blob URLs) instead. Used by the export
 * engine to embed signature images.
 */
import { File } from 'expo-file-system';

/** Returns the asset bytes, or null if the URI is not readable. */
export async function readAssetBytes(uri: string): Promise<Uint8Array | null> {
  try {
    const file = new File(uri);
    if (!file.exists) return null;
    return await file.bytes();
  } catch {
    return null;
  }
}
