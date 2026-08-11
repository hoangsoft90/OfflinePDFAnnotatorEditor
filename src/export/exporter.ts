/**
 * Exporter (document/save-export spec, ADR-004).
 * Produces new PDF bytes applying: page order (pageOrder), per-page rotation,
 * and annotations (annotation-layer or flattened). Original bytes untouched.
 */
import { PDFDocument, RotationTypes } from 'pdf-lib';

import { loadPdf, writeAnnotations } from '@/export/export-utils';
import type { Annotation } from '@/models/annotation';
import { useProjectStore } from '@/store/use-project-store';
import { useAnnotationStore } from '@/store/use-annotation-store';
import type { PageId } from '@/models/page';

export interface ExportOptions {
  flatten?: boolean;
  resolveAsset?: (assetPath: string) => string | null;
  onProgress?: (done: number, total: number) => void;
}

export interface ExportResult {
  bytes: Uint8Array;
  pageCount: number;
}

/**
 * Builds an exported PDF from the original bytes + current project state.
 * Reorders pages per pageOrder, applies rotations, writes annotations.
 */
export async function exportProject(
  docId: string,
  originalBytes: Uint8Array,
  options: ExportOptions = {}
): Promise<ExportResult> {
  const project = useProjectStore.getState().projects[docId];
  if (!project) throw new Error('No project for document');
  const annotations = useAnnotationStore.getState().forDoc(docId);

  const src = await loadPdf(originalBytes);
  if (!src) throw new Error('Cannot read source PDF');

  const pageOrder: PageId[] =
    project.pageOrder.length === src.getPageCount()
      ? project.pageOrder
      : src.getPages().map((_, i) => `page-${i + 1}`);

  // Rotation map by pageId -> rotation value for pdf-lib (clockwise degrees).
  const rotations = project.pageRotations ?? {};

  // Build a new document with pages in the target order.
  const out = await PDFDocument.create();
  const copied = await out.copyPages(src, pageOrder.map((_, i) => i));
  for (const page of copied) {
    out.addPage(page);
  }

  // Apply rotations per pageId.
  const pageSizes = src.getPages().map((p) => p.getSize());
  const total = copied.length;
  for (let i = 0; i < total; i++) {
    const rotation = rotations[pageOrder[i]] ?? 0;
    if (rotation !== 0) {
      copied[i].setRotation({ angle: rotation, type: RotationTypes.Degrees });
    }
  }

  // Write annotations per target page.
  const annotationsByPage = new Map<number, Annotation[]>();
  for (const a of annotations) {
    const targetIndex = pageOrder.indexOf(a.pageId);
    if (targetIndex === -1) continue;
    const list = annotationsByPage.get(targetIndex) ?? [];
    list.push(a);
    annotationsByPage.set(targetIndex, list);
  }
  for (let i = 0; i < total; i++) {
    const list = annotationsByPage.get(i) ?? [];
    if (list.length === 0) continue;
    const size = pageSizes[i] ?? { width: 612, height: 792 };
    await writeAnnotations(out, i, list, size.height, options);
    options.onProgress?.(i + 1, total);
  }

  const bytes = await out.save({ useObjectStreams: false });
  return { bytes: new Uint8Array(bytes), pageCount: total };
}

/** Exports selected page indexes as a new document (extract flow). */
export async function extractPagesToPdf(
  docId: string,
  originalBytes: Uint8Array,
  pageIndexes: number[]
): Promise<ExportResult> {
  const project = useProjectStore.getState().projects[docId];
  if (!project) throw new Error('No project for document');
  const src = await loadPdf(originalBytes);
  if (!src) throw new Error('Cannot read source PDF');

  const out = await PDFDocument.create();
  const copied = await out.copyPages(src, pageIndexes);
  for (const page of copied) out.addPage(page);

  const annotations = useAnnotationStore.getState().forDoc(docId);
  const pageOrder = project.pageOrder;
  for (let i = 0; i < copied.length; i++) {
    const pageId = pageOrder[pageIndexes[i]];
    if (!pageId) continue;
    const list = annotations.filter((a) => a.pageId === pageId);
    if (list.length === 0) continue;
    const size = copied[i].getSize();
    await writeAnnotations(out, i, list, size.height, {});
  }

  const bytes = await out.save({ useObjectStreams: false });
  return { bytes: new Uint8Array(bytes), pageCount: copied.length };
}
