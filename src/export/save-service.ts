/**
 * Save / Export service (document/save-export spec, ADR-004).
 *
 * Compatibility barrel: re-exports the shared core (`save-core.ts`) and the
 * platform save actions. Metro resolves `./save-actions` to the native
 * implementation (`save-actions.ts`) on iOS/Android and to the web
 * implementation (`save-actions.web.ts`) on web — callers keep the same API.
 */
export type { SaveResult } from '@/export/save-core';
export { buildExportBytes, markSaved } from '@/export/save-core';
export {
  saveCopy,
  overwriteOriginal,
  shareDocument,
  duplicateDocument,
  extractAndSave,
} from '@/export/save-actions';
