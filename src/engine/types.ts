/**
 * PdfEngine contract (pdf/engine spec). All feature code depends on this
 * interface, never on a specific renderer implementation.
 */
import type { PdfRect } from '@/models/annotation';

/** A page size in PDF points (72 dpi units). */
export interface PdfSize {
  widthPts: number;
  heightPts: number;
}

/** A rendered page bitmap. */
export interface RenderedPage {
  /** Absolute file URI or data URI of the PNG */
  uri: string;
  /** Rendered width in screen pixels */
  widthPx: number;
  /** Rendered height in screen pixels */
  heightPx: number;
  /** Output scale relative to PDF points */
  scale: number;
}

/** A text item extracted from a page, with its PDF-point bounding box. */
export interface TextItem {
  str: string;
  /** PDF-point rect (bottom-left origin) */
  rect: PdfRect;
  /** Base font size in points */
  fontSize: number;
}

/** One search hit on a page. */
export interface SearchHit {
  pageId: string;
  /** PDF-point rect of the matched text */
  rect: PdfRect;
  /** The matched string */
  text: string;
}

export interface PageTextResult {
  pageId: string;
  items: TextItem[];
}

export interface PdfOpenResult {
  pageCount: number;
  /** page sizes in PDF points, indexed by page index */
  pageSizes: PdfSize[];
  /** Stable page ids, indexed by page index (initial order) */
  pageIds: string[];
}

export interface PdfEngine {
  /** True once a document has been opened. */
  readonly isOpen: boolean;
  /** Total page count of the open document. */
  readonly pageCount: number;
  /** Page sizes in PDF points, indexed by page index. */
  readonly pageSizes: PdfSize[];
  /** Stable page ids, indexed by page index (initial order). */
  readonly pageIds: string[];

  /** Opens a PDF from bytes. Resolves with page metadata. */
  open(bytes: Uint8Array): Promise<PdfOpenResult>;
  /** Renders a page (0-based index) at the given scale. */
  renderPage(pageIndex: number, scale: number): Promise<RenderedPage>;
  /** Extracts text items for a page (0-based index). */
  extractText(pageIndex: number): Promise<TextItem[]>;
  /** Frees resources. */
  close(): void;
}
