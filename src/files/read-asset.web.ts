/**
 * Reads binary asset bytes from a data:/blob: URL (web). Same API as
 * `read-asset.ts`; resolved by Metro via the `.web` extension.
 */
/** Returns the asset bytes, or null if the URI is not readable. */
export async function readAssetBytes(uri: string): Promise<Uint8Array | null> {
  try {
    const resp = await fetch(uri);
    if (!resp.ok) return null;
    return new Uint8Array(await resp.arrayBuffer());
  } catch {
    return null;
  }
}
