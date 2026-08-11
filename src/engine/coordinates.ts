/**
 * Coordinate system contract (ADR-003 / pdf/engine spec).
 *
 * Canonical storage space : PDF native coordinates — points (1/72 inch),
 *                            origin BOTTOM-LEFT (ISO 32000).
 * Screen/render space    : pixels, origin TOP-LEFT (RN viewport, matches
 *                            pdf.js viewport space).
 *
 * All annotation geometry is stored in PDF points and only converted at
 * render time. This guarantees no drift across zoom levels, device pixel
 * ratios, or export.
 */
import type { PdfPoint, PdfRect } from '@/models/annotation';

/** Converts a PDF-point rect to screen pixels for a page rendered at `scale`. */
export function pdfRectToScreen(rect: PdfRect, pageHeightPts: number, scale: number) {
  return {
    x: rect.x * scale,
    // flip y: PDF bottom-left -> screen top-left
    y: (pageHeightPts - rect.y - rect.height) * scale,
    width: rect.width * scale,
    height: rect.height * scale,
  };
}

/** Converts a screen pixel point back to PDF points (bottom-left origin). */
export function screenToPdfPoint(screen: PdfPoint, pageHeightPts: number, scale: number): PdfPoint {
  return {
    x: screen.x / scale,
    y: pageHeightPts - screen.y / scale,
  };
}

/** Converts a screen-pixel rect to a PDF-point rect. */
export function screenRectToPdfRect(screen: PdfRect, pageHeightPts: number, scale: number): PdfRect {
  const tl = screenToPdfPoint({ x: screen.x, y: screen.y }, pageHeightPts, scale);
  const br = screenToPdfPoint(
    { x: screen.x + screen.width, y: screen.y + screen.height },
    pageHeightPts,
    scale
  );
  return {
    x: tl.x,
    y: br.y, // bottom edge in PDF coords
    width: br.x - tl.x,
    height: tl.y - br.y,
  };
}

/**
 * Converts a PDF-point rect to a PDF QuadPoints array (8 numbers: two
 * rectangles in top-left origin, per PDF spec QuadPoints ordering).
 */
export function pdfRectToQuadPoints(rect: PdfRect, pageHeightPts: number): number[] {
  // QuadPoints are in PDF user space (bottom-left origin): two triangles
  // forming a quadrilateral. For an axis-aligned rect the quad is the
  // rect itself. Order: x1 y1 x2 y2 x3 y3 x4 y4 (top-left first).
  const x1 = rect.x;
  const x2 = rect.x + rect.width;
  const y1 = rect.y + rect.height; // top
  const y2 = rect.y; // bottom
  return [x1, y1, x2, y1, x2, y2, x1, y2];
}

/** Applies page rotation to a PDF-point rect (90/180/270 clockwise). */
export function rotatePdfRect(rect: PdfRect, pageW: number, pageH: number, rotation: 0 | 90 | 180 | 270): PdfRect {
  switch (rotation) {
    case 0:
      return rect;
    case 90: {
      // rotate 90° CW: (x,y) -> (pageH - y, x) with swapped dims
      return { x: pageH - rect.y - rect.height, y: rect.x, width: rect.height, height: rect.width };
    }
    case 180:
      return { x: pageW - rect.x - rect.width, y: pageH - rect.y - rect.height, width: rect.width, height: rect.height };
    case 270: {
      return { x: rect.y, y: pageW - rect.x - rect.width, width: rect.height, height: rect.width };
    }
  }
}
