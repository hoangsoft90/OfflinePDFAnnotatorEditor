#!/usr/bin/env node
/**
 * Network config audit — fails with exit code 1 if the built Android release
 * manifest does NOT support networking as decided:
 *   - android.permission.INTERNET must be declared (network access enabled)
 *   - android:usesCleartextTraffic="true" must be set (http allowed for all domains)
 *
 * Usage:
 *   node scripts/audit-manifest.js <path-to-AndroidManifest.xml>
 *
 * If no path is given it scans common prebuild output locations.
 */
const fs = require('fs');
const path = require('path');

const candidates = [
  process.argv[2],
  'android/app/src/main/AndroidManifest.xml',
  'android/app/src/release/AndroidManifest.xml',
].filter(Boolean);

let manifestPath = null;
for (const c of candidates) {
  if (c && fs.existsSync(c)) {
    manifestPath = c;
    break;
  }
}

if (!manifestPath) {
  console.log(
    '⚠ No AndroidManifest.xml found (run `npx expo prebuild` first). Skipping audit.'
  );
  process.exit(0);
}

const xml = fs.readFileSync(manifestPath, 'utf8');
const errors = [];

if (!xml.includes('android.permission.INTERNET')) {
  errors.push(
    'missing android.permission.INTERNET — network access is disabled in this build'
  );
}

// usesCleartextTraffic may be on the <application> element (allow http for all domains).
if (!/android:usesCleartextTraffic\s*=\s*"true"/.test(xml)) {
  errors.push(
    'missing android:usesCleartextTraffic="true" — http:// requests are blocked by default (API 28+)'
  );
}

if (errors.length > 0) {
  console.error(`✗ NETWORK CONFIG: ${manifestPath} is not network-ready:\n  - ${errors.join('\n  - ')}`);
  process.exit(1);
}

console.log(`✓ Network OK: INTERNET permission + cleartext http enabled in ${manifestPath}`);
