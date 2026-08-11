/**
 * Signature asset resolution (web) — virtual web FS backed.
 * Same API as `signature-assets.ts`; resolved by Metro via the `.web` extension.
 * `uri` is a data: URL renderable by RN-web `<Image>`.
 */
import { WebFile } from '@/storage/web-fs';

import { storagePaths } from '@/storage/storage-paths.web';

/** assetPath is stored relative to the doc's workspace assets dir. */
export function resolveSignatureAsset(docId: string, assetPath: string): string | null {
  try {
    // assetPath may be like "signatures/<id>.png" inside workspace assets.
    const file = new WebFile(storagePaths.assetsDir(docId), assetPath);
    return file.exists ? file.uri : null;
  } catch {
    return null;
  }
}

/**
 * Copies a global signature asset into the doc workspace assets dir so the
 * document is self-contained (survives global deletion + export).
 */
export function copySignatureIntoWorkspace(docId: string, imagePath: string): void {
  try {
    const src = new WebFile(storagePaths.signaturesDir, imagePath);
    if (!src.exists) return;
    const dest = new WebFile(storagePaths.assetsDir(docId), `signatures/${imagePath}`);
    if (!dest.exists) {
      dest.parentDirectory.create({ idempotent: true, intermediates: true });
      src.copySync(dest);
    }
  } catch {
    // best-effort
  }
}
