/**
 * Export engine helpers (document/save-export spec).
 * pdf-lib is the write-path engine: it never renders, only structures.
 */
import { PDFDocument, PDFName, rgb, type Color } from 'pdf-lib';

import type { Annotation } from '@/models/annotation';
import { pdfRectToQuadPoints } from '@/engine/coordinates';
import { readAssetBytes } from '@/files/read-asset';

/** Loads a PDFDocument from bytes (returns null on failure). */
export async function loadPdf(bytes: Uint8Array): Promise<PDFDocument | null> {
  try {
    return await PDFDocument.load(bytes, { ignoreEncryption: false });
  } catch {
    return null;
  }
}

/**
 * Writes an annotation into a pdf-lib page as a standard PDF annotation.
 * highlight/underline/strikeout -> QuadPoints dict; others -> content drawing.
 * Existing annotations are preserved (ADR-004) unless flatten=true.
 */
export async function writeAnnotations(
  doc: PDFDocument,
  pageIndex: number,
  annotations: Annotation[],
  pageHeightPts: number,
  options?: { flatten?: boolean; resolveAsset?: (p: string) => string | null }
): Promise<void> {
  if (annotations.length === 0) return;
  const page = doc.getPages()[pageIndex];
  if (!page) return;

  for (const a of annotations) {
  const quad = pdfRectToQuadPoints(a.geometry.boundingBox, pageHeightPts);
  const color = hexToRgb(a.color) as Color;

    switch (a.type) {
      case 'highlight':
      case 'underline':
      case 'strikeout': {
        if (options?.flatten) {
          const height = a.geometry.boundingBox.height;
          const yOffset =
            a.type === 'underline' ? quad[1] - height * 0.15 : a.type === 'strikeout' ? quad[1] - height * 0.55 : 0;
          page.drawRectangle({
            x: a.geometry.boundingBox.x,
            y: a.geometry.boundingBox.y + yOffset,
            width: a.geometry.boundingBox.width,
            height: a.type === 'highlight' ? height : Math.max(2, height * 0.12),
            color,
            opacity: a.opacity,
          });
        } else {
          await appendMarkupAnnotation(doc, page, a, quad, color, pageHeightPts);
        }
        break;
      }
      case 'pen': {
        const pts = a.geometry.pathPoints ?? [];
        if (pts.length < 2) break;
        const path = pts
          .map((p, i) => `${i === 0 ? 'm' : 'l'} ${p.x.toFixed(2)} ${p.y.toFixed(2)}`)
          .join(' ');
        page.drawSvgPath(path, {
          borderColor: color,
          borderWidth: a.strokeWidth,
          borderOpacity: a.opacity,
        });
        break;
      }
      case 'text': {
        page.drawText(a.content ?? '', {
          x: a.geometry.boundingBox.x,
          y: a.geometry.boundingBox.y,
          size: 12,
          color,
          opacity: a.opacity,
        });
        break;
      }
      case 'rectangle':
        page.drawRectangle({
          x: a.geometry.boundingBox.x,
          y: a.geometry.boundingBox.y,
          width: a.geometry.boundingBox.width,
          height: a.geometry.boundingBox.height,
          borderColor: color,
          borderWidth: a.strokeWidth,
          borderOpacity: a.opacity,
        });
        break;
      case 'ellipse':
        page.drawEllipse({
          x: a.geometry.boundingBox.x + a.geometry.boundingBox.width / 2,
          y: a.geometry.boundingBox.y + a.geometry.boundingBox.height / 2,
          xScale: a.geometry.boundingBox.width / 2,
          yScale: a.geometry.boundingBox.height / 2,
          borderColor: color,
          borderWidth: a.strokeWidth,
          borderOpacity: a.opacity,
        });
        break;
      case 'line':
      case 'arrow': {
        const s = a.geometry.line?.start;
        const e = a.geometry.line?.end;
        if (!s || !e) break;
        page.drawLine({
          start: { x: s.x, y: s.y },
          end: { x: e.x, y: e.y },
          thickness: a.strokeWidth,
          color,
          opacity: a.opacity,
        });
        break;
      }
      case 'signature': {
        if (a.assetPath && options?.resolveAsset) {
          const uri = options.resolveAsset(a.assetPath);
          if (uri) {
            try {
              const bytes = await readAssetBytes(uri);
              if (!bytes) break;
              const img = await doc.embedPng(bytes);
              page.drawImage(img, {
                x: a.geometry.boundingBox.x,
                y: a.geometry.boundingBox.y,
                width: a.geometry.boundingBox.width,
                height: a.geometry.boundingBox.height,
                opacity: a.opacity,
              });
            } catch {
              // skip unreadable signature image
            }
          }
        }
        break;
      }
    }
  }
}

async function appendMarkupAnnotation(
  doc: PDFDocument,
  page: import('pdf-lib').PDFPage,
  a: Annotation,
  quad: number[],
  color: Color,
  pageHeightPts: number
): Promise<void> {
  const context = doc.context;
  const subtype = a.type === 'highlight' ? 'Highlight' : a.type === 'underline' ? 'Underline' : 'StrikeOut';
  const rect = [
    a.geometry.boundingBox.x,
    a.geometry.boundingBox.y,
    a.geometry.boundingBox.x + a.geometry.boundingBox.width,
    a.geometry.boundingBox.y + a.geometry.boundingBox.height,
  ];
  const c = color as unknown as { red: number; green: number; blue: number };
  const annotDict = context.obj({
    Type: 'Annot',
    Subtype: subtype,
    Rect: rect,
    QuadPoints: quad,
    C: [c.red, c.green, c.blue],
    CA: a.opacity,
  });
  const annots = page.node.Annots();
  if (annots) {
    annots.push(annotDict);
  } else {
    page.node.set(PDFName.of('Annots'), context.obj([annotDict]));
  }
}

function hexToRgb(hex: string): Color {
  const clean = hex.replace('#', '');
  const full = clean.length === 3 ? clean.split('').map((c) => c + c).join('') : clean;
  const num = parseInt(full, 16);
  if (Number.isNaN(num)) return rgb(1, 0.8, 0.3);
  return rgb(((num >> 16) & 255) / 255, ((num >> 8) & 255) / 255, (num & 255) / 255);
}
