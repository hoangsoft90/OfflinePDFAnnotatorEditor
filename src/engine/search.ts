/**
 * Full-text search (pdf/search spec). Runs over per-page text items produced
 * by the engine, progressively page by page so the UI stays responsive.
 */
import type { PdfEngine, SearchHit, TextItem } from '@/engine/types';
import type { PageId } from '@/models/page';

export interface SearchProgress {
  scannedPages: number;
  totalPages: number;
}

export interface SearchController {
  cancel: () => void;
}

function normalize(s: string): string {
  return s.toLocaleLowerCase();
}

function findHitsInItems(items: TextItem[], query: string): { rect: TextItem['rect']; text: string }[] {
  const q = normalize(query);
  if (!q) return [];
  const hits: { rect: TextItem['rect']; text: string }[] = [];
  for (const item of items) {
    const hay = normalize(item.str);
    let idx = hay.indexOf(q);
    while (idx !== -1) {
      const ratio = q.length / Math.max(hay.length, 1);
      const rect =
        ratio >= 0.9
          ? item.rect
          : {
              ...item.rect,
              width: (item.rect.width / Math.max(hay.length, 1)) * q.length,
            };
      hits.push({ rect, text: item.str });
      idx = hay.indexOf(q, idx + 1);
    }
  }
  return hits;
}

/**
 * Searches all pages. `onProgress` is called after each page. Returns early
 * when the query changes (via the returned controller's `cancel`).
 */
export function searchDocument(
  engine: PdfEngine,
  pageIds: PageId[],
  query: string,
  onProgress?: (p: SearchProgress) => void
): { promise: Promise<SearchHit[]>; controller: SearchController } {
  let cancelled = false;
  const controller: SearchController = {
    cancel: () => {
      cancelled = true;
    },
  };

  const promise = (async () => {
    if (!query.trim()) return [];
    const results: SearchHit[] = [];
    for (let i = 0; i < pageIds.length; i++) {
      if (cancelled) return results;
      try {
        const items = await engine.extractText(i);
        const hits = findHitsInItems(items, query);
        for (const h of hits) {
          results.push({ pageId: pageIds[i], rect: h.rect, text: h.text });
        }
      } catch {
        // scanned page — skip silently
      }
      onProgress?.({ scannedPages: i + 1, totalPages: pageIds.length });
    }
    return results;
  })();

  return { promise, controller };
}
