/**
 * App-private storage layout (ADR-002 / storage/layout spec).
 *
 * ```
 * Paths.document/
 *   projects/<docId>/           project.json + assets/ (annotations, sig images)
 *   signatures/                 saved signature PNGs (sensitive — ADR-006)
 *   cache/thumbnails/<docId>/   page thumbnails
 *   cache/pages/<docId>/        rendered page bitmaps
 *   cache/imports/              copies of externally-opened PDFs (ADR-008)
 *   cache/share/                temp copies for the share sheet
 *   cache/duplicates/           temp copies for duplicate
 * ```
 *
 * The original PDF is NEVER stored here by the viewer path.
 */
import { Directory, Paths } from 'expo-file-system';

export const storagePaths = {
  /** Root of app-private persistent storage */
  get root() {
    return Paths.document;
  },
  /** Per-document project workspace: projects/<docId>/ */
  projectDir(docId: string): Directory {
    return new Directory(Paths.document, 'projects', docId);
  },
  /** Workspace assets dir: projects/<docId>/assets/ */
  assetsDir(docId: string): Directory {
    return new Directory(Paths.document, 'projects', docId, 'assets');
  },
  /** Signature assets (sensitive) — shared across documents */
  get signaturesDir(): Directory {
    return new Directory(Paths.document, 'signatures');
  },
  /** Thumbnail cache: cache/thumbnails/<docId>/ */
  thumbnailsDir(docId: string): Directory {
    return new Directory(Paths.cache, 'thumbnails', docId);
  },
  /** Rendered page bitmap cache: cache/pages/<docId>/ */
  pagesDir(docId: string): Directory {
    return new Directory(Paths.cache, 'pages', docId);
  },
  /** Imported external PDFs (ADR-008) */
  get importsDir(): Directory {
    return new Directory(Paths.cache, 'imports');
  },
  /** Temp copies for sharing */
  get shareDir(): Directory {
    return new Directory(Paths.cache, 'share');
  },
  /** Temp copies for duplicate */
  get duplicatesDir(): Directory {
    return new Directory(Paths.cache, 'duplicates');
  },
};

/** Ensures a directory exists (idempotent). */
export function ensureDir(dir: Directory): Directory {
  if (!dir.exists) {
    dir.create({ idempotent: true, intermediates: true });
  }
  return dir;
}
