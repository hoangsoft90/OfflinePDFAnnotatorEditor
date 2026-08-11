/**
 * App-private storage layout (ADR-002 / storage/layout spec) — web variant.
 *
 * Same layout contract as the native `storage-paths.ts`, but backed by the
 * virtual web FS (`web-fs.ts`) instead of expo-file-system. Resolved by Metro
 * via the `.web` extension. Mirrors:
 *
 * ```
 * projects/<docId>/           project.json + assets/ (annotations, sig images)
 * signatures/                 saved signature PNGs (sensitive — ADR-006)
 * cache/thumbnails/<docId>/   page thumbnails
 * cache/pages/<docId>/        rendered page bitmaps
 * cache/imports/              copies of externally-opened PDFs (ADR-008)
 * cache/share/                temp copies for the share sheet
 * cache/duplicates/           temp copies for duplicate
 * ```
 */
import { WebDirectory } from '@/storage/web-fs';

export const storagePaths = {
  /** Root of app-private persistent storage */
  get root(): WebDirectory {
    return new WebDirectory();
  },
  /** Per-document project workspace: projects/<docId>/ */
  projectDir(docId: string): WebDirectory {
    return new WebDirectory('projects', docId);
  },
  /** Workspace assets dir: projects/<docId>/assets/ */
  assetsDir(docId: string): WebDirectory {
    return new WebDirectory('projects', docId, 'assets');
  },
  /** Signature assets (sensitive) — shared across documents */
  get signaturesDir(): WebDirectory {
    return new WebDirectory('signatures');
  },
  /** Thumbnail cache: cache/thumbnails/<docId>/ */
  thumbnailsDir(docId: string): WebDirectory {
    return new WebDirectory('cache', 'thumbnails', docId);
  },
  /** Rendered page bitmap cache: cache/pages/<docId>/ */
  pagesDir(docId: string): WebDirectory {
    return new WebDirectory('cache', 'pages', docId);
  },
  /** Imported external PDFs (ADR-008) */
  get importsDir(): WebDirectory {
    return new WebDirectory('cache', 'imports');
  },
  /** Temp copies for sharing */
  get shareDir(): WebDirectory {
    return new WebDirectory('cache', 'share');
  },
  /** Temp copies for duplicate */
  get duplicatesDir(): WebDirectory {
    return new WebDirectory('cache', 'duplicates');
  },
};

/** Ensures a directory exists (idempotent). */
export function ensureDir(dir: WebDirectory): WebDirectory {
  if (!dir.exists) {
    dir.create({ idempotent: true, intermediates: true });
  }
  return dir;
}
