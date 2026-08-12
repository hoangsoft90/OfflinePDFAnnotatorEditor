const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Bundle pdf.js ESM sources as raw assets so they can be read into the
// WebView-hosted renderer at runtime (offline — no network fetch).
config.resolver.assetExts.push('mjs');
// Keep `.mjs` OUT of sourceExts. Metro's default order tries `mjs` before
// `js`, so extension-less requires like `abort-controller/dist/abort-controller`
// resolved to the `.mjs` build — and because `.mjs` is in assetExts (above),
// Metro silently turned those node_modules ESM builds into ASSET STUBS
// (module.exports = asset descriptor, exports undefined). That broke
// `setUpXHR`'s AbortSignal/AbortController globals and expo's winter url.ts at
// startup. Explicit `.mjs` references (pdf.js in assets/pdfjs) still resolve
// as raw assets via assetExts.
config.resolver.sourceExts = config.resolver.sourceExts.filter((ext) => ext !== 'mjs');

module.exports = config;
