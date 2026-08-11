/**
 * Reads PDF bytes from a blob:/data: URL (web). The native version reads
 * content:// or file:// URIs via expo-file-system.
 */
/** Returns the PDF bytes, or null if the URI is not readable. */
export async function readPdfBytes(uri: string): Promise<Uint8Array | null> {
  try {
    const resp = await fetch(uri);
    if (!resp.ok) return null;
    return new Uint8Array(await resp.arrayBuffer());
  } catch {
    return null;
  }
}

/** Checks whether a URI is still readable (used for recents validation). */
export async function isPdfReadable(uri: string): Promise<boolean> {
  try {
    const resp = await fetch(uri, { method: 'GET' });
    return resp.ok;
  } catch {
    return false;
  }
}
