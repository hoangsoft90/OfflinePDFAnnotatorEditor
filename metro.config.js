const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Bundle pdf.js ESM sources as raw assets so they can be read into the
// WebView-hosted renderer at runtime (offline — no network fetch).
config.resolver.assetExts.push('mjs');

module.exports = config;
