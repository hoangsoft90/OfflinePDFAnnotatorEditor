/**
 * Annotation model — references stable pageId (ADR-007), geometry stored in
 * PDF native coordinates (points, bottom-left origin, ADR-003).
 */
import { uuid } from '@/utils/uuid';
import type { PageId } from './page';

export type AnnotationType =
  | 'highlight'
  | 'underline'
  | 'strikeout'
  | 'pen'
  | 'eraser' // eraser is a transient tool; strokes are removed, not stored
  | 'text'
  | 'rectangle'
  | 'ellipse'
  | 'line'
  | 'arrow'
  | 'signature';

/** A rectangle in PDF points (bottom-left origin). */
export interface PdfRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** A 2D point in PDF points (bottom-left origin). */
export interface PdfPoint {
  x: number;
  y: number;
}

export interface AnnotationGeometry {
  /** Bounding box in PDF points (all types) */
  boundingBox: PdfRect;
  /** Freehand pen / polyline path points in PDF points */
  pathPoints?: PdfPoint[];
  /** For line/arrow: the two endpoints in PDF points */
  line?: { start: PdfPoint; end: PdfPoint };
  /** Page rotation at creation time (0/90/180/270) — snapshot */
  pageRotation: 0 | 90 | 180 | 270;
}

export interface Annotation {
  id: string;
  /** Stable page id — NEVER a page index (ADR-007) */
  pageId: PageId;
  type: AnnotationType;
  geometry: AnnotationGeometry;
  /** hex color, e.g. '#FFD54F' */
  color: string;
  /** 0..1 */
  opacity: number;
  /** Stroke width in PDF points */
  strokeWidth: number;
  /** Text content for text annotations */
  content?: string;
  /** Path to an image asset (signature) — workspace-relative */
  assetPath?: string;
  createdAt: string; // ISO 8601
  modifiedAt: string; // ISO 8601
}

export function createAnnotation(input: {
  id?: string;
  pageId: PageId;
  type: AnnotationType;
  geometry: AnnotationGeometry;
  color: string;
  opacity?: number;
  strokeWidth?: number;
  content?: string;
  assetPath?: string;
}): Annotation {
  const now = new Date().toISOString();
  return {
    id: input.id ?? uuid(),
    pageId: input.pageId,
    type: input.type,
    geometry: input.geometry,
    color: input.color,
    opacity: input.opacity ?? 0.35,
    strokeWidth: input.strokeWidth ?? 1.5,
    content: input.content,
    assetPath: input.assetPath,
    createdAt: now,
    modifiedAt: now,
  };
}
