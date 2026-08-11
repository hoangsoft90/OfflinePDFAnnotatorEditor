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
        onMessage={(e: WebViewMessageEvent) => engine.handleMessage(e)}
        onError={(e) => {
          console.warn('PDF engine WebView error', e.nativeEvent.description);
        }}
        onRenderProcessGone={() => {
          console.warn('PDF engine WebView process gone');
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  hidden: {
    position: 'absolute',
    width: 1,
    height: 1,
    opacity: 0,
    left: -100,
    top: -100,
  },
  error: {
    position: 'absolute',
    width: 1,
    height: 1,
    opacity: 0,
  },
  webview: { flex: 1, backgroundColor: 'transparent' },
});
