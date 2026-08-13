import type { WebView } from 'react-native-webview';

import type { PdfEngine, PdfOpenResult, RenderedPage, TextItem } from '@/engine/types';

interface PendingRequest {
  resolve: (v: unknown) => void;
  reject: (e: Error) => void;
}

type ReadyWaiter = () => void;

interface BridgeMessage {
  id: string;
  ok: boolean;
  result?: unknown;
  error?: string;
}

/**
 * PdfEngine backed by pdf.js running inside a hidden WebView (pdfjs-html).
 * All heavy work (parse, render, text extraction) happens off the JS thread
 * in the WebView process — satisfying the plan's "render off main thread".
 * On web the direct pdf.js engine (`pdfjs-engine.web.ts`) is used instead;
 * feature code only ever depends on the `PdfEngine` interface.
 */
export class WebViewPdfEngine implements PdfEngine {
  private webView: WebView | null = null;
  private pending = new Map<string, PendingRequest>();
  private seq = 0;
  private openResult: PdfOpenResult | null = null;
  /** True once the WebView bridge reports ready */
  ready = false;
  private readyWaiters: ReadyWaiter[] = [];

  attach(webView: WebView | null): void {
    this.webView = webView;
  }

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

  /** Handles messages from the WebView. */
  handleMessage(event: { nativeEvent: { data: string } }): void {
    let msg: BridgeMessage;
    try {
      msg = JSON.parse(event.nativeEvent.data) as BridgeMessage;
    } catch {
      return;
    }
    if (msg.id === 'bridge-init') {
      if (msg.ok) {
        this.ready = true;
        this.readyWaiters.splice(0).forEach((fn) => fn());
      }
      return;
    }
    const pending = this.pending.get(msg.id);
    if (!pending) return;
    this.pending.delete(msg.id);
    if (msg.ok) {
      pending.resolve(msg.result);
    } else {
      pending.reject(new Error(msg.error ?? 'PDF engine error'));
    }
  }

  private request(type: string, ...args: unknown[]): Promise<unknown> {
    return new Promise((resolve, reject) => {
      const id = `req-${++this.seq}`;
      this.pending.set(id, { resolve, reject });
      if (!this.webView) {
        this.pending.delete(id);
        reject(new Error('PDF engine not attached'));
        return;
      }
      const message = JSON.stringify({ id, type, args });
      // Double-encode so the message is passed as a string literal.
      this.webView.injectJavaScript(`window.__dispatch(${JSON.stringify(message)});true;`);
      // Requests must not hang forever — if the hidden WebView's canvas render
      // is suspended (e.g. compositor paused), surface a clear error instead of
      // leaving the viewer black indefinitely.
      const original = this.pending.get(id)!;
      const timeout = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error(`PDF engine request timed out: ${type}`));
      }, 30000);
      this.pending.set(id, {
        resolve: (v: unknown) => {
          clearTimeout(timeout);
          original.resolve(v);
        },
        reject: (e: Error) => {
          clearTimeout(timeout);
          original.reject(e);
        },
      });
    });
  }

  private async whenReady(): Promise<void> {
    if (this.ready) return;
    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => {
        const i = this.readyWaiters.indexOf(resolve);
        if (i >= 0) this.readyWaiters.splice(i, 1);
        reject(new Error('PDF engine failed to initialize (WebView unavailable)'));
      }, 15000);
      this.readyWaiters.push(() => {
        clearTimeout(timeout);
        resolve();
      });
    });
  }

  async open(bytes: Uint8Array): Promise<PdfOpenResult> {
    await this.whenReady();
    let b64: string;
    try {
      b64 = arrayBufferToBase64(bytes);
    } catch {
      b64 = uint8ToBase64(bytes);
    }
    const result = (await this.request('open', b64)) as PdfOpenResult;
    this.openResult = result;
    return result;
  }

  async renderPage(pageIndex: number, scale: number): Promise<RenderedPage> {
    if (!this.openResult) throw new Error('No document open');
    return (await this.request('renderPage', pageIndex, scale)) as RenderedPage;
  }

  async extractText(pageIndex: number): Promise<TextItem[]> {
    if (!this.openResult) throw new Error('No document open');
    const result = (await this.request('extractText', pageIndex)) as { items: TextItem[] };
    return result.items ?? [];
  }

  close(): void {
    this.openResult = null;
    this.pending.clear();
    this.readyWaiters = [];
  }
}

/** Native factory — WebView-backed engine. Web resolves `pdfjs-engine.web.ts`. */
export function createPdfEngine(): PdfEngine {
  return new WebViewPdfEngine();
}

/** Fast base64 conversion for large buffers (chunked). */
function arrayBufferToBase64(buffer: Uint8Array): string {
  const chunks: string[] = [];
  const chunkSize = 0x8000;
  for (let i = 0; i < buffer.length; i += chunkSize) {
    const chunk = buffer.subarray(i, i + chunkSize);
    chunks.push(String.fromCharCode.apply(null, Array.from(chunk)));
  }
  return btoa(chunks.join(''));
}

function uint8ToBase64(bytes: Uint8Array): string {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}
