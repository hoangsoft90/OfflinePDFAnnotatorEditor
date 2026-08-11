import type { PdfEngine } from '@/engine/types';

/**
 * Web build: the direct in-browser pdf.js engine (`pdfjs-engine.web.ts`) needs
 * no host component — the WebView host exists only on iOS/Android
 * (`PdfEngineHost.tsx`). This file is resolved by Metro via the `.web` extension.
 */
export function PdfEngineHost({ engine }: { engine: PdfEngine }): null {
  void engine;
  return null;
}
