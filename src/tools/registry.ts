/**
 * Tool registry (annotation/tools spec). Each tool maps gesture events
 * (canvas-local pixels) to a DraftAnnotation in PDF points via screenToPdf.
 */
import type {
  AnnotationGeometry,
  AnnotationType,
  PdfPoint,
  PdfRect,
} from '@/models/annotation';
import type { DraftAnnotation, GestureEvent, ToolId, ToolStyle } from '@/tools/types';
import { screenToPdfPoint } from '@/engine/coordinates';

export interface ToolContext {
  tool: ToolId;
  style: ToolStyle;
  /** page height in PDF points (for y-flip) */
  pageHeightPts: number;
  /** current zoom scale (canvas px per PDF point) */
  scale: number;
  /** text lines on the page (PDF-point rects) for snap-based tools */
  textLines?: PdfRect[];
}

function toPdf(ev: GestureEvent, ctx: ToolContext): PdfPoint {
  return screenToPdfPoint({ x: ev.x, y: ev.y }, ctx.pageHeightPts, ctx.scale);
}

interface GestureState {
  points: PdfPoint[];
  start: PdfPoint;
}

/** Returns the current draft (null while gesture in progress for some tools). */
export class ToolSession {
  private state: GestureState | null = null;
  private readonly ctx: ToolContext;

  constructor(ctx: ToolContext) {
    this.ctx = ctx;
  }

  handle(ev: GestureEvent): DraftAnnotation | null {
    const pt = toPdf(ev, this.ctx);
    if (ev.phase === 'begin') {
      this.state = { points: [pt], start: pt };
      return null;
    }
    if (!this.state) return null;
    if (ev.phase === 'cancel') {
      this.state = null;
      return null;
    }

    const s = this.state;
    switch (this.ctx.tool) {
      case 'pen':
        s.points.push(pt);
        return this.penDraft();
      case 'highlight':
      case 'underline':
      case 'strikeout':
        s.points.push(pt);
        return this.textMarkDraft(s.start, pt);
      case 'rectangle':
        s.points.push(pt);
        return this.rectDraft(s.start, pt, 'rectangle');
      case 'ellipse':
        s.points.push(pt);
        return this.rectDraft(s.start, pt, 'ellipse');
      case 'line':
      case 'arrow':
        s.points.push(pt);
        return this.lineDraft(s.start, pt);
      case 'text': {
        if (ev.phase === 'end') {
          const rect = this.squareAt(pt, 4);
          this.state = null;
          return {
            type: 'text',
            geometry: this.geometry(rect),
            color: this.ctx.style.color,
            opacity: this.ctx.style.opacity,
            strokeWidth: this.ctx.style.strokeWidth,
          };
        }
        return null;
      }
      case 'signature': {
        if (ev.phase === 'end') {
          const rect = this.squareAt(pt, 60);
          this.state = null;
          return {
            type: 'signature',
            geometry: this.geometry(rect),
            color: '#000000',
            opacity: 1,
            strokeWidth: 1,
          };
        }
        return null;
      }
      default:
        return null;
    }
  }

  private geometry(boundingBox: PdfRect, extra?: Partial<AnnotationGeometry>): AnnotationGeometry {
    return {
      boundingBox,
      pageRotation: 0,
      ...extra,
    };
  }

  private penDraft(): DraftAnnotation {
    const pts = this.state?.points ?? [];
    const bbox = bboxOfPoints(pts);
    return {
      type: 'pen',
      geometry: this.geometry(bbox, { pathPoints: pts }),
      color: this.ctx.style.color,
      opacity: this.ctx.style.opacity,
      strokeWidth: this.ctx.style.strokeWidth,
    };
  }

  private textMarkDraft(start: PdfPoint, end: PdfPoint): DraftAnnotation {
    // Snap to the text line covering the drag when available.
    const dragRect = rectBetween(start, end);
    const snapped = this.ctx.textLines?.find((l) => intersects(l, dragRect));
    const rect = snapped && this.ctx.tool !== 'pen' ? { ...snapped } : dragRect;
    const type: AnnotationType =
      this.ctx.tool === 'underline' ? 'underline' : this.ctx.tool === 'strikeout' ? 'strikeout' : 'highlight';
    return {
      type,
      geometry: this.geometry(rect),
      color: this.ctx.style.color,
      opacity: this.ctx.style.opacity,
      strokeWidth: this.ctx.style.strokeWidth,
    };
  }

  private rectDraft(start: PdfPoint, end: PdfPoint, type: 'rectangle' | 'ellipse'): DraftAnnotation {
    return {
      type,
      geometry: this.geometry(rectBetween(start, end)),
      color: this.ctx.style.color,
      opacity: this.ctx.style.opacity,
      strokeWidth: this.ctx.style.strokeWidth,
    };
  }

  private lineDraft(start: PdfPoint, end: PdfPoint): DraftAnnotation {
    return {
      type: this.ctx.tool as AnnotationType,
      geometry: this.geometry(rectBetween(start, end), { line: { start, end } }),
      color: this.ctx.style.color,
      opacity: this.ctx.style.opacity,
      strokeWidth: this.ctx.style.strokeWidth,
    };
  }

  private squareAt(pt: PdfPoint, half: number): PdfRect {
    return { x: pt.x - half, y: pt.y - half, width: half * 2, height: half * 2 };
  }
}

export function bboxOfPoints(points: PdfPoint[]): PdfRect {
  if (points.length === 0) return { x: 0, y: 0, width: 1, height: 1 };
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const p of points) {
    minX = Math.min(minX, p.x);
    minY = Math.min(minY, p.y);
    maxX = Math.max(maxX, p.x);
    maxY = Math.max(maxY, p.y);
  }
  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
}

function rectBetween(a: PdfPoint, b: PdfPoint): PdfRect {
  const x = Math.min(a.x, b.x);
  const y = Math.min(a.y, b.y);
  return { x, y, width: Math.abs(b.x - a.x), height: Math.abs(b.y - a.y) };
}

function intersects(a: PdfRect, b: PdfRect): boolean {
  return !(a.x + a.width < b.x || b.x + b.width < a.x || a.y + a.height < b.y || b.y + b.height < a.y);
}
