/**
 * Reads PDF bytes from a content:// or file:// URI via expo-file-system.
 */
import { File } from 'expo-file-system';

/** Returns the PDF bytes, or null if the URI is not readable. */
export async function readPdfBytes(uri: string): Promise<Uint8Array | null> {
  try {
    const file = new File(uri);
    if (!file.exists) return null;
    return await file.bytes();
  } catch {
    return null;
  }
}

/** Checks whether a URI is still readable (used for recents validation). */
export async function isPdfReadable(uri: string): Promise<boolean> {
  try {
    const file = new File(uri);
    return file.exists;
  } catch {
    return false;
  }
}
