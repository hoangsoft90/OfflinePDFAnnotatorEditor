/**
 * Resolves an annotation assetPath (workspace-relative) to a usable file URI
 * for rendering in the annotation overlay.
 */
import { File } from 'expo-file-system';

import { storagePaths } from '@/storage/storage-paths';

/** assetPath is stored relative to the doc's workspace assets dir. */
export function resolveSignatureAsset(docId: string, assetPath: string): string | null {
  try {
    // assetPath may be like "signatures/<id>.png" inside workspace assets.
    const file = new File(storagePaths.assetsDir(docId), assetPath);
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
    const src = new File(storagePaths.signaturesDir, imagePath);
    if (!src.exists) return;
    const dest = new File(storagePaths.assetsDir(docId), `signatures/${imagePath}`);
    if (!dest.exists) {
      const parent = dest.parentDirectory;
      if (!parent.exists) parent.create({ idempotent: true, intermediates: true });
      src.copySync(dest);
    }
  } catch {
    // best-effort
  }
}
