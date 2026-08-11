import { DarkTheme, DefaultTheme, Stack, ThemeProvider, useRouter } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef } from 'react';
import { useColorScheme } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import * as Linking from 'expo-linking';
import { importExternalPdf } from '@/files/imports';

import { createMetadataRepo } from '@/db/documents-repo';
import { useMetadataStore } from '@/store/use-metadata-store';
import { ThemedText } from '@/components/themed-text';
import { initAds } from '@/ads/init';

SplashScreen.preventAutoHideAsync();

function RootProviders({ children }: { children: React.ReactNode }) {
  const colorScheme = useColorScheme() ?? 'light';
  const { initialized, initError, init } = useMetadataStore();

  useEffect(() => {
    async function bootstrap() {
      const repo = await createMetadataRepo();
      await init(repo);
      // AdMob bootstrap (consent → config → initialize). Fire-and-forget so
      // app startup is never blocked; ads become ready in the background.
      void initAds();
      await SplashScreen.hideAsync();
    }
    if (!initialized && !initError) {
      bootstrap().catch(async (e) => {
        console.error('DB init failed', e);
        await SplashScreen.hideAsync();
      });
    }
  }, [initialized, initError, init]);

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
      {children}
    </ThemeProvider>
  );
}

/**
 * Handles external intents (ADR-008): ACTION_VIEW / ACTION_SEND PDFs and
 * in-app deep links (offlinepdf://viewer/<docId> | offlinepdf://organizer/<docId>).
 */
function useExternalIntentHandler() {
  const router = useRouter();
  const ready = useMetadataStore((s) => s.initialized);
  // getInitialURL and the 'url' event can deliver the same link on a cold
  // start — dedupe so a deep link is only processed once.
  const handled = useRef<Set<string>>(new Set());

  const handleUri = async (url: string | null) => {
    if (!url || !ready) return;
    const raw = url.trim();
    if (handled.current.has(raw)) return;
    handled.current.add(raw);

    // In-app deep link: offlinepdf://viewer/<docId> (or organizer). Navigate
    // only if the document actually exists — never land on a dead error screen.
    const parsed = Linking.parse(raw);
    if (parsed.scheme === 'offlinepdf') {
      const host = parsed.hostname;
      const docId = parsed.path?.replace(/^\/+/, '');
      if ((host === 'viewer' || host === 'organizer') && docId) {
        const doc = await useMetadataStore.getState().getById(docId);
        if (doc) {
          router.replace({
            pathname: host === 'viewer' ? '/viewer/[docId]' : '/organizer/[docId]',
            params: { docId },
          });
        }
      }
      return;
    }

    // ACTION_VIEW / ACTION_SEND deliver a content:// (or file://) URI.
    if (!/^content:\/\//.test(raw) && !/^file:\/\//.test(raw)) return;
    const result = await importExternalPdf(raw);
    if (result.copied) {
      router.replace({ pathname: '/viewer/[docId]', params: { docId: result.docId } });
    }
  };

  useEffect(() => {
    if (!ready) return;
    Linking.getInitialURL().then(handleUri);
    const sub = Linking.addEventListener('url', (e) => void handleUri(e.url));
    return () => sub.remove();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready]);
}

export default function RootLayout() {
  const { initError } = useMetadataStore();
  useExternalIntentHandler();

  if (initError) {
    return (
      <GestureHandlerRootView style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <ThemedText type="heading">Không thể khởi tạo dữ liệu</ThemedText>
        <ThemedText type="small" color="textSecondary" style={{ marginTop: 8, textAlign: 'center' }}>
          {initError}
        </ThemedText>
        <ThemedText type="caption" color="textSecondary" style={{ marginTop: 16, textAlign: 'center' }}>
          Hãy thử mở lại ứng dụng. Dữ liệu của bạn vẫn nằm trên thiết bị.
        </ThemedText>
      </GestureHandlerRootView>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <RootProviders>
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: 'transparent' },
          }}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="viewer/[docId]" options={{ animation: 'fade' }} />
          <Stack.Screen name="organizer/[docId]" options={{ animation: 'slide_from_right' }} />
          <Stack.Screen name="signature-pad" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
        </Stack>
      </RootProviders>
    </GestureHandlerRootView>
  );
}
