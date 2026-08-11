/**
 * Page identity (ADR-007): builds stable PageMeta entries from the engine's
 * open result. PageIds are stable across page operations; only their position
 * in `pageOrder` changes.
 */
import type { PageId, PageMeta } from '@/models/page';
import type { PdfOpenResult } from '@/engine/types';

export function createDocumentPageMetas(opened: PdfOpenResult): Record<PageId, PageMeta> {
  const metas: Record<PageId, PageMeta> = {};
  opened.pageIds.forEach((pageId, index) => {
    const size = opened.pageSizes[index] ?? { widthPts: 595, heightPts: 842 };
    metas[pageId] = {
      pageId,
      widthPts: size.widthPts,
      heightPts: size.heightPts,
      rotation: 0,
    };
  });
  return metas;
}

/** Resolves the current index of a pageId within a pageOrder. */
export function pageIndexOf(pageOrder: PageId[], pageId: PageId): number {
  return pageOrder.indexOf(pageId);
}
