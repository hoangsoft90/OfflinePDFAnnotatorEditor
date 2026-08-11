/**
 * Page identity model (ADR-007).
 *
 * Annotations and page operations reference stable `pageId`s, NEVER page
 * indexes. The display index of a page is derived at render time via
 * `pageOrder.indexOf(pageId)`.
 */
export type PageId = string;

/** Stable metadata for one page of a document. */
export interface PageMeta {
  pageId: PageId;
  /** Width in PDF points (72dpi) */
  widthPts: number;
  /** Height in PDF points (72dpi) */
  heightPts: number;
  /** Current rotation: 0 | 90 | 180 | 270 */
  rotation: 0 | 90 | 180 | 270;
}

/** Ordered list of page ids — the document's current page order. */
export type PageOrder = PageId[];

/** Reorders `order` by moving `from` index to `to` index (0-based, inclusive). */
export function moveInOrder(order: PageOrder, from: number, to: number): PageOrder {
  const next = [...order];
  if (from < 0 || from >= next.length || to < 0 || to >= next.length) return next;
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}

/** Removes the page ids at the given indexes. */
export function removeIndexes(order: PageOrder, indexes: number[]): PageOrder {
  const toRemove = new Set(indexes);
  return order.filter((_, i) => !toRemove.has(i));
}

export function indexOfPageId(order: PageOrder, pageId: PageId): number {
  return order.indexOf(pageId);
}
