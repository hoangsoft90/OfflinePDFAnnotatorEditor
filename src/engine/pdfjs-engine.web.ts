/**
 * Web PdfEngine — pdf.js runs directly in the browser (no WebView).
 *
 * Resolved by Metro on web via the `.web` platform extension. Uses the same
 * bundled pdf.js ESM assets as the native WebView engine (`assets/pdfjs/`),
 * loaded through Blob URLs so the app stays fully offline. Feature code only
 * depends on the `PdfEngine` interface — rendering stays swappable.
 */
import type { PdfEngine, PdfOpenResult, RenderedPage, TextItem } from '@/engine/types';

interface PdfjsPage {
  view: number[];
  getViewport(options: { scale: number }): { width: number; height: number };
  render(options: {
    canvasContext: CanvasRenderingContext2D;
    viewport: { width: number; height: number };
  }): { promise: Promise<void> };
  getTextContent(): Promise<{ items: { str?: string; transform: number[]; width?: number }[] }>;
}

interface PdfjsDoc {
  numPages: number;
  getPage(index: number): Promise<PdfjsPage>;
  destroy(): Promise<void>;
}

interface PdfjsModule {
  GlobalWorkerOptions: { workerSrc: string };
  getDocument(options: {
    data: Uint8Array;
    useWorkerFetch?: boolean;
    isEvalSupported?: boolean;
    useSystemFonts?: boolean;
  }): { promise: Promise<PdfjsDoc> };
}

/** Loads the bundled pdf.js ESM via Blob URL (offline, no fetch at runtime). */
async function loadPdfjs(): Promise<PdfjsModule | null> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports -- asset module id
    const pdfUrl: string = require('@/assets/pdfjs/pdf.min.mjs');
    // eslint-disable-next-line @typescript-eslint/no-require-imports -- asset module id
    const workerUrl: string = require('@/assets/pdfjs/pdf.worker.min.mjs');
    const [pdfResp, workerResp] = await Promise.all([fetch(pdfUrl), fetch(workerUrl)]);
    if (!pdfResp.ok || !workerResp.ok) throw new Error('pdf.js assets unavailable');
    const mod = (await import(/* webpackIgnore: true */ URL.createObjectURL(await pdfResp.blob()))) as PdfjsModule;
    mod.GlobalWorkerOptions.workerSrc = URL.createObjectURL(await workerResp.blob());
    return mod;
  } catch (e) {
    console.warn('pdf.js web engine failed to load', e);
    return null;
  }
}

/**
 * Direct in-browser pdf.js engine. Render/text extraction run on the main
 * thread but are async (pdf.js yields between tasks); acceptable for the web
 * build where the native "render off JS thread" guarantee maps to the browser.
 */
export class DirectPdfEngine implements PdfEngine {
  private modulePromise: Promise<PdfjsModule | null> | null = null;
  private pdfjs: PdfjsModule | null = null;
  private pdfDoc: PdfjsDoc | null = null;
  private openResult: PdfOpenResult | null = null;

  get isOpen(): boolean {
    return this.openResult !== null;
  }

  get pageCount(): number {
    return this.openResult?.pageCount ?? 0;
  }

  get pageSizes() {
    return this.openResult?.pageSizes ?? [];
  }

  get pageIds(): string[] {
    return this.openResult?.pageIds ?? [];
  }

  private async ensureModule(): Promise<PdfjsModule> {
    if (!this.pdfjs) {
      if (!this.modulePromise) this.modulePromise = loadPdfjs();
      this.pdfjs = await this.modulePromise;
    }
    if (!this.pdfjs) throw new Error('PDF engine không khả dụng trên web');
    return this.pdfjs;
  }

  async open(bytes: Uint8Array): Promise<PdfOpenResult> {
    const pdfjs = await this.ensureModule();
    const doc = await pdfjs
      .getDocument({ data: bytes, useWorkerFetch: false, isEvalSupported: false, useSystemFonts: true })
      .promise;
    const pageSizes = [];
    const pageIds = [];
    for (let i = 1; i <= doc.numPages; i++) {
      const page = await doc.getPage(i);
      pageSizes.push({ widthPts: page.view[2] - page.view[0], heightPts: page.view[3] - page.view[1] });
      pageIds.push('page-' + i);
    }
    this.pdfDoc = doc;
    this.openResult = { pageCount: doc.numPages, pageSizes, pageIds };
    return this.openResult;
  }

  async renderPage(pageIndex: number, scale: number): Promise<RenderedPage> {
    if (!this.pdfDoc || !this.openResult) throw new Error('No document open');
    const page = await this.pdfDoc.getPage(pageIndex + 1);
    const viewport = page.getViewport({ scale });
    // Fresh canvas per call: thumbnails and the main page render concurrently
    // on the same engine, so a shared canvas would corrupt each other's output.
    const canvas = document.createElement('canvas');
    canvas.width = Math.floor(viewport.width);
    canvas.height = Math.floor(viewport.height);
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D context unavailable');
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    await page.render({ canvasContext: ctx, viewport }).promise;
    return {
      uri: canvas.toDataURL('image/jpeg', 0.82),
      widthPx: canvas.width,
      heightPx: canvas.height,
      scale,
    };
  }

  async extractText(pageIndex: number): Promise<TextItem[]> {
    if (!this.pdfDoc) throw new Error('No document open');
    const page = await this.pdfDoc.getPage(pageIndex + 1);
    const content = await page.getTextContent();
    const items: TextItem[] = [];
    for (const it of content.items) {
      if (!it.str || typeof it.str !== 'string') continue;
      const [a, b, , d, e, f] = it.transform;
      const w = Math.sqrt(a * a + b * b) * (it.width || 0);
      const h = Math.abs(d) || 0;
      if (w <= 0 || h <= 0) continue;
      items.push({ str: it.str, rect: { x: e, y: f, width: w, height: h }, fontSize: h });
    }
    return items;
  }

  close(): void {
    void this.pdfDoc?.destroy().catch(() => {});
    this.pdfDoc = null;
    this.openResult = null;
  }
}

/** Web factory — direct in-browser pdf.js engine. */
export function createPdfEngine(): PdfEngine {
  return new DirectPdfEngine();
}
