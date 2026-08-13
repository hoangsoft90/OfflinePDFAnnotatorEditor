import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';

import type { PdfEngine } from '@/engine/types';
import { buildBridgeHtml } from '@/engine/pdfjs-html';
import { loadPdfjsSources } from '@/engine/pdfjs-sources';
import { WebViewPdfEngine } from '@/engine/pdfjs-engine';

/**
 * Renders a hidden WebView hosting the pdf.js renderer and binds it to the
 * given engine instance. Only meaningful for the WebView engine (native);
 * on web `PdfEngineHost.web.tsx` renders nothing. The WebView is 1x1 and
 * transparent so it never interferes with the UI; work happens off the JS thread.
 */
export function PdfEngineHost({ engine }: { engine: PdfEngine }) {
  // On native the engine is always the WebView engine (createPdfEngine); other
  // implementations are no-op hosts (web resolves PdfEngineHost.web.tsx).
  if (!(engine instanceof WebViewPdfEngine)) return null;
  return <WebViewHost engine={engine} />;
}

function WebViewHost({ engine }: { engine: WebViewPdfEngine }) {
  const [html, setHtml] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    loadPdfjsSources()
      .then(({ pdf, worker }) => {
        if (!cancelled) setHtml(buildBridgeHtml(pdf, worker));
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : String(e));
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (error) {
    // Renderer failed to load — surface loudly rather than fail silently.
    return <View style={styles.error} testID="pdf-engine-error" />;
  }
  if (!html) {
    return <View style={styles.hidden} />;
  }

  return (
    <View pointerEvents="none" style={styles.hidden}>
      <WebView
        ref={(ref) => engine.attach(ref)}
        originWhitelist={['*']}
        source={{ html }}
        style={styles.webview}
        javaScriptEnabled
        domStorageEnabled
        allowFileAccess
        // Android skips compositing fully-invisible (opacity 0 / 1x1) WebViews,
        // which suspends canvas rendering — pdf.js `render().promise` then never
        // resolves and `toDataURL` returns black. Keep a real size + near-zero
        // opacity so the compositor still draws, and use a software layer so
        // canvas readback is reliable off-screen.
        androidLayerType="software"
        onMessage={(e: WebViewMessageEvent) => engine.handleMessage(e)}
        onError={(e) => {
          console.warn('PDF engine WebView error', e.nativeEvent.description);
        }}
        onRenderProcessGone={() => {
          console.warn('PDF engine WebView process gone');
        }}
        onConsoleMessage={(e: { type?: string; message?: string }) => {
          // Forward WebView console (incl. pdf.js errors) to logcat for debugging.
          if (e?.type === 'error' || /error|fail|throw|undefined/i.test(e?.message ?? '')) {
            console.warn('[pdfjs-webview]', e?.message);
          }
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  hidden: {
    position: 'absolute',
    // Real, non-zero size — a 1x1 WebView can be treated as not laid out.
    width: 320,
    height: 480,
    opacity: 0.01,
    left: -2000,
    top: -2000,
  },
  error: {
    position: 'absolute',
    width: 1,
    height: 1,
    opacity: 0,
  },
  webview: { flex: 1, backgroundColor: 'transparent' },
});
