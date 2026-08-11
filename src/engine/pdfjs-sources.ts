/**
 * Loads the bundled pdf.js ESM sources (assets/pdfjs/) as base64 strings so
 * they can be embedded into the offline WebView renderer. Runs once.
 */
import { Asset } from 'expo-asset';

import { File } from 'expo-file-system';

let cache: { pdf: string; worker: string } | null = null;

async function assetToBase64(moduleId: number): Promise<string> {
  const asset = Asset.fromModule(moduleId);
  await asset.downloadAsync();
  if (!asset.localUri) throw new Error('pdf.js asset unavailable');
  const f = new File(asset.localUri);
  return f.base64();
}

export async function loadPdfjsSources(): Promise<{ pdf: string; worker: string }> {
  if (cache) return cache;
  const [pdf, worker] = await Promise.all([
    // eslint-disable-next-line @typescript-eslint/no-require-imports -- asset module id
    assetToBase64(require('@/assets/pdfjs/pdf.min.mjs')),
    // eslint-disable-next-line @typescript-eslint/no-require-imports -- asset module id
    assetToBase64(require('@/assets/pdfjs/pdf.worker.min.mjs')),
  ]);
  cache = { pdf, worker };
  return cache;
}
