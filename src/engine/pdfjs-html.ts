/**
 * Builds the HTML document served inside the hidden WebView. pdf.js main +
 * worker are embedded as base64 blobs (offline — no fetch). A small bridge
 * exposes `open / renderPage / extractText` and reports results via
 * `window.ReactNativeWebView.postMessage`, correlating responses by request id.
 */
export function buildBridgeHtml(pdfBase64: string, workerBase64: string): string {
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
<style>html,body{margin:0;padding:0;background:#fff;overflow:hidden}</style>
</head>
<body>
<canvas id="render-canvas" style="display:none"></canvas>
<script type="module">
const PDF_B64 = ${JSON.stringify(pdfBase64)};
const WORKER_B64 = ${JSON.stringify(workerBase64)};
const canvas = document.getElementById('render-canvas');

function decode(b64) {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

async function bootstrap() {
  const pdfBlob = new Blob([decode(PDF_B64)], { type: 'text/javascript' });
  const pdfUrl = URL.createObjectURL(pdfBlob);
  const pdfjsLib = await import(/* webpackIgnore: true */ pdfUrl);
  pdfjsLib.GlobalWorkerOptions.workerSrc =
    URL.createObjectURL(new Blob([decode(WORKER_B64)], { type: 'text/javascript' }));
  return pdfjsLib;
}

let pdfjsLib = null;
let pdfDoc = null;

const post = (id, ok, payload) => {
  window.ReactNativeWebView.postMessage(JSON.stringify({ id, ok, ...payload }));
};

async function handleOpen(b64) {
  pdfDoc = await pdfjsLib.getDocument({
    data: decode(b64),
    useWorkerFetch: false,
    isEvalSupported: false,
    useSystemFonts: true,
  }).promise;
  const pageSizes = [];
  const pageIds = [];
  for (let i = 1; i <= pdfDoc.numPages; i++) {
    const page = await pdfDoc.getPage(i);
    pageSizes.push({ widthPts: page.view[2] - page.view[0], heightPts: page.view[3] - page.view[1] });
    pageIds.push('page-' + i);
  }
  return { pageCount: pdfDoc.numPages, pageSizes, pageIds };
}

async function handleRenderPage(pageIndex, scale) {
  const page = await pdfDoc.getPage(pageIndex + 1);
  const viewport = page.getViewport({ scale });
  canvas.width = Math.floor(viewport.width);
  canvas.height = Math.floor(viewport.height);
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  await page.render({ canvasContext: ctx, viewport }).promise;
  const dataUrl = canvas.toDataURL('image/jpeg', 0.82);
  return { uri: dataUrl, widthPx: canvas.width, heightPx: canvas.height, scale };
}

async function handleExtractText(pageIndex) {
  const page = await pdfDoc.getPage(pageIndex + 1);
  const content = await page.getTextContent();
  const items = [];
  for (const it of content.items) {
    if (!it.str || typeof it.str !== 'string') continue;
    const [a, b, c, d, e, f] = it.transform;
    const w = Math.sqrt(a * a + b * b) * it.width || 0;
    const h = Math.abs(d) || 0;
    if (w <= 0 || h <= 0) continue;
    items.push({ str: it.str, rect: { x: e, y: f, width: w, height: h }, fontSize: h });
  }
  return { items };
}

const handlers = {
  init: async () => {
    pdfjsLib = await bootstrap();
    return { ready: true };
  },
  open: handleOpen,
  renderPage: handleRenderPage,
  extractText: handleExtractText,
};

// Requests arrive from React Native as JSON strings.
window.__dispatch = function (msg) {
  const req = JSON.parse(msg);
  const handler = handlers[req.type];
  if (!handler) {
    post(req.id, false, { error: 'Unknown request: ' + req.type });
    return;
  }
  handler(...req.args)
    .then((result) => post(req.id, true, { result }))
    .catch((err) => post(req.id, false, { error: String((err && err.message) || err) }));
};

window.__pdfBridge = {
  init: () => {
    handlers
      .init()
      .then((result) => post('bridge-init', true, { result }))
      .catch((err) => post('bridge-init', false, { error: String((err && err.message) || err) }));
  },
};
window.__pdfBridge.init();
</script>
</body>
</html>`;
}
