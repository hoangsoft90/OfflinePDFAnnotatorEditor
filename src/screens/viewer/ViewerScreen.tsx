import { Ionicons } from '@expo/vector-icons';
import { router as expoRouter, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, View, TextInput, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { PdfCanvas, type PdfCanvasHandle } from '@/components/pdf/PdfCanvas';
import { AnnotationCanvas } from '@/components/pdf/AnnotationCanvas';
import { AnnotationToolbar } from '@/components/pdf/AnnotationToolbar';
import { SignaturePickerModal } from '@/components/pdf/SignaturePickerModal';
import { PdfEngineHost } from '@/engine/PdfEngineHost';
import { createPdfEngine } from '@/engine/pdfjs-engine';
import { BitmapCache } from '@/engine/bitmap-cache';
import { ThumbnailsSheet } from '@/components/pdf/ThumbnailsSheet';
import { searchDocument } from '@/engine/search';
import type { PdfEngine, SearchHit } from '@/engine/types';
import { readPdfBytes } from '@/files/read-pdf';
import { useMetadataStore } from '@/store/use-metadata-store';
import { usePalette } from '@/store/use-theme-store';
import { Radius, Spacing } from '@/constants/theme';
import { useProjectStore } from '@/store/use-project-store';
import { useAnnotationStore } from '@/store/use-annotation-store';
import { initProjectForDoc } from '@/project/project-manager';
import { promptRecovery } from '@/journal/recovery';
import { initAutosaveListener } from '@/journal/autosave';
import { useToolStore } from '@/store/use-tool-store';
import { resolveSignatureAsset } from '@/signatures/signature-assets';
import { safeBack } from '@/utils/navigation';
import { saveCopy, overwriteOriginal, shareDocument, duplicateDocument } from '@/export/save-service';
import { detectConflict } from '@/project/conflict';
import { DocumentMenuModal } from '@/components/pdf/DocumentMenuModal';
import { AdBanner } from '@/ads/AdBanner';
import { showInterstitialIfDue } from '@/ads/interstitial-manager';
import { SpotlightOverlay, type SpotlightStep } from '@/guidance/components/SpotlightOverlay';
import { getFeatureDef } from '@/guidance/registry';
import { useGuidance } from '@/guidance/use-guidance';

export function ViewerScreen() {
  const { docId } = useLocalSearchParams<{ docId: string }>();
  const router = useRouter();
  const palette = usePalette();

  const [engine] = useState<PdfEngine>(() => createPdfEngine());
  const cache = useMemo(() => new BitmapCache(docId ?? 'doc'), [docId]);
  const canvasRef = useRef<PdfCanvasHandle>(null);

  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [error, setError] = useState<string>('');
  const [pageIndex, setPageIndex] = useState(0);
  const [pageCount, setPageCount] = useState(0);
  const [pageIds, setPageIds] = useState<string[]>([]);
  const [pageSizes, setPageSizes] = useState<{ widthPts: number; heightPts: number }[]>([]);
  const [currentBitmap, setCurrentBitmap] = useState<string | null>(null);
  const [renderScale, setRenderScale] = useState(1);
  const [canvasW, setCanvasW] = useState(0);
  const [canvasH, setCanvasH] = useState(0);
  const [, setLayoutW] = useState(0);
  const [showThumbs, setShowThumbs] = useState(false);
  const [annotating, setAnnotating] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<SearchHit[]>([]);
  const [textLines, setTextLines] = useState<import('@/models/annotation').PdfRect[]>([]);
  const [showSignaturePicker, setShowSignaturePicker] = useState(false);
  const searchController = useRef<{ cancel: () => void } | null>(null);
  const openedAtRef = useRef(0);

  // ---- in-app guidance (in-app-guidance change) ----
  const annotationIntro = useGuidance('annotation-intro');
  const searchScanned = useGuidance('search-scanned');
  const searchScannedHelper = getFeatureDef('search-scanned').helper!;
  const introDef = getFeatureDef('annotation-intro');
  const toolbarWrapRef = useRef<View>(null);
  const undoRef = useRef<View>(null);
  const pendingIntroRef = useRef(false);
  const annotatingRef = useRef(false);
  const [introSteps, setIntroSteps] = useState<SpotlightStep[]>([]);
  const [introVisible, setIntroVisible] = useState(false);
  const [introStepIndex, setIntroStepIndex] = useState(0);
  const [searchTried, setSearchTried] = useState(false);

  const docName = useMetadataStore((s) => s.recents.find((d) => d.id === docId)?.name ?? 'Tài liệu');
  const activeTool = useToolStore((s) => s.activeTool);

  // ---- interstitial on leave (monetization) ----
  useEffect(() => {
    openedAtRef.current = Date.now();
    return () => {
      // Skip in dev: StrictMode double-mount would fire an ad right at
      // startup, and test ads interrupting navigation are noise anyway.
      if (__DEV__) return;
      void showInterstitialIfDue(openedAtRef.current);
    };
  }, []);

  // ---- load document + recovery ----
  useEffect(() => {
    let cancelled = false;
    initAutosaveListener();
    async function load() {
      if (!docId) return;
      const doc = await useMetadataStore.getState().getById(docId);
      if (!doc) {
        setError('Không tìm thấy tài liệu.');
        setState('error');
        return;
      }
      const bytes = await readPdfBytes(doc.uri);
      if (!bytes || bytes.byteLength === 0) {
        setError('Không thể đọc file. File có thể đã bị xóa hoặc mất quyền truy cập.');
        setState('error');
        return;
      }
      try {
        const opened = await engine.open(bytes);
        if (cancelled) return;
        setPageCount(opened.pageCount);
        setPageIds(opened.pageIds);
        setPageSizes(opened.pageSizes);
        await initProjectForDoc(docId, doc, opened);
        await useMetadataStore.getState().touch(docId, opened.pageCount, doc.modifiedAt);
        // crash recovery prompt (ADR-005)
        await promptRecovery(docId);
        if (cancelled) return;
        setState('ready');
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : 'Không thể mở PDF');
          setState('error');
        }
      }
    }
    void load();
    return () => {
      cancelled = true;
      searchController.current?.cancel();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [docId]);

  // ---- render current page ----
  const renderPage = useCallback(
    async (index: number) => {
      if (!engine.isOpen) return;
      try {
        const cached = await cache.get(index, renderScale);
        if (cached) {
          setCurrentBitmap(cached.uri);
          return;
        }
        const rendered = await engine.renderPage(index, renderScale);
        setCurrentBitmap(rendered.uri);
        await cache.put(index, renderScale, rendered);
      } catch {
        // keep previous bitmap
      }
    },
    [cache, engine, renderScale]
  );

  useEffect(() => {
    if (state !== 'ready') return;
    // Defer out of the effect body to avoid cascading renders.
    const id = setTimeout(() => void renderPage(pageIndex), 0);
    return () => clearTimeout(id);
  }, [state, pageIndex, renderScale, renderPage]);

  // ---- extract text lines for snap tools (only when a text-marking tool active) ----
  const needText = activeTool === 'highlight' || activeTool === 'underline' || activeTool === 'strikeout';
  useEffect(() => {
    if (state !== 'ready' || !needText) return;
    let cancelled = false;
    engine
      .extractText(pageIndex)
      .then((items) => {
        if (!cancelled) setTextLines(items.map((i) => i.rect));
      })
      .catch(() => setTextLines([]));
    return () => {
      cancelled = true;
    };
  }, [engine, state, pageIndex, needText]);

  // ---- canvas layout (fit-width) ----
  const onLayout = useCallback(
    (e: { nativeEvent: { layout: { width: number } } }) => {
      const w = e.nativeEvent.layout.width;
      setLayoutW(w);
      if (pageSizes[pageIndex]) {
        const { widthPts, heightPts } = pageSizes[pageIndex];
        const s = w / widthPts;
        setRenderScale(s);
        setCanvasW(w);
        setCanvasH(heightPts * s);
      }
    },
    [pageSizes, pageIndex]
  );

  const goToPage = useCallback(
    (index: number) => {
      if (index < 0 || index >= pageCount) return;
      setPageIndex(index);
      setShowThumbs(false);
    },
    [pageCount]
  );

  // ---- search ----
  const runSearch = useCallback(() => {
    searchController.current?.cancel();
    if (!query.trim() || pageIds.length === 0) {
      setSearchResults([]);
      setSearchTried(false);
      return;
    }
    setSearching(true);
    const { promise, controller } = searchDocument(engine, pageIds, query);
    searchController.current = controller;
    promise
      .then((hits) => {
        setSearchResults(hits);
        if (hits.length === 0) {
          // Scanned pages have no text layer — explain via the helper copy.
          searchScanned.markHelperOpened();
          setSearchTried(true);
        }
      })
      .finally(() => setSearching(false));
  }, [engine, pageIds, query, searchScanned]);

  const selectHit = useCallback(
    (hit: SearchHit) => {
      const idx = pageIds.indexOf(hit.pageId);
      if (idx >= 0) goToPage(idx);
    },
    [pageIds, goToPage]
  );

  const handleRemoveDoc = useCallback(() => {
    if (!docId) return;
    Alert.alert('Xóa khỏi danh sách', 'Xóa tài liệu này khỏi danh sách gần đây? File gốc không bị xóa.', [
      { text: 'Hủy', style: 'cancel' },
      {
        text: 'Xóa',
        style: 'destructive',
        onPress: async () => {
          const doc = await useMetadataStore.getState().getById(docId);
          if (doc) await useMetadataStore.getState().removeFromRecents(doc);
          safeBack();
        },
      },
    ]);
  }, [docId]);

  const openOrganizer = useCallback(() => {
    if (docId) expoRouter.push({ pathname: '/organizer/[docId]', params: { docId } });
  }, [docId]);

  const openSignaturePad = useCallback(() => {
    setShowSignaturePicker(true);
  }, []);

  // ---- annotation-intro spotlight (guidance) ----
  const toggleAnnotating = useCallback(() => {
    const next = !annotatingRef.current;
    annotatingRef.current = next;
    // First time the user enables annotating → schedule the spotlight; it
    // fires once the toolbar has actually laid out (measured below). Side
    // effect kept OUTSIDE the state updater (updaters must stay pure).
    if (next && annotationIntro.showSpotlight) pendingIntroRef.current = true;
    setAnnotating(next);
  }, [annotationIntro.showSpotlight]);

  const handleToolbarLayout = useCallback(() => {
    if (!pendingIntroRef.current) return;
    pendingIntroRef.current = false;
    toolbarWrapRef.current?.measureInWindow((x, y, width, height) => {
      if (width <= 0 || height <= 0) return;
      const steps = (introDef.steps ?? []).map((s, i) => ({
        ...s,
        target: i === 0 ? { x, y, width, height } : null,
      }));
      if (steps.length === 0) return;
      annotationIntro.markShown('spotlight');
      setIntroSteps(steps);
      setIntroStepIndex(0);
      setIntroVisible(true);
    });
  }, [annotationIntro, introDef]);

  const closeIntro = useCallback(() => {
    setIntroVisible(false);
    setIntroStepIndex(0);
  }, []);

  const handleIntroNext = useCallback(() => {
    if (introStepIndex >= introSteps.length - 1) {
      annotationIntro.markCompleted();
      closeIntro();
      return;
    }
    setIntroStepIndex((i) => i + 1);
  }, [introStepIndex, introSteps.length, annotationIntro, closeIntro]);

  const handleIntroSkip = useCallback(() => {
    annotationIntro.markDismissed();
    closeIntro();
  }, [annotationIntro, closeIntro]);

  const handleIntroTargetTap = useCallback(() => {
    // User tapped the highlighted toolbar → they are now using the feature.
    annotationIntro.markCompleted();
    closeIntro();
  }, [annotationIntro, closeIntro]);

  // Measure the undo control when the second spotlight step becomes active.
  useEffect(() => {
    if (!introVisible || introStepIndex !== 1) return;
    undoRef.current?.measureInWindow((x, y, width, height) => {
      if (width > 0 && height > 0) {
        setIntroSteps((prev) =>
          prev.map((s, i) => (i === 1 ? { ...s, target: { x, y, width, height } } : s))
        );
      }
    });
  }, [introVisible, introStepIndex]);

  const [menuOpen, setMenuOpen] = useState(false);

  const handleSaveCopy = useCallback(async () => {
    if (!docId) return;
    const res = await saveCopy(docId, { flatten: false });
    if (res.ok) Alert.alert('Đã lưu', 'Đã xuất bản sao PDF kèm ghi chú.');
    else if (res.error) Alert.alert('Lỗi khi lưu', res.error);
  }, [docId]);

  const handleOverwrite = useCallback(async () => {
    if (!docId) return;
    const doc = await useMetadataStore.getState().getById(docId);
    if (!doc) return;
    const project = useProjectStore.getState().projects[docId];
    const conflicted = project ? await detectConflict(doc.uri, project.sourceFingerprint) : false;
    if (conflicted) {
      Alert.alert(
        'File gốc đã thay đổi bên ngoài',
        'File gốc đã được sửa bởi ứng dụng khác. Bạn có muốn tải lại (bỏ thay đổi) hoặc xuất bản sao mới?',
        [
          { text: 'Xuất bản sao mới', onPress: () => void handleSaveCopy() },
          { text: 'Tải lại', style: 'destructive', onPress: () => router.replace({ pathname: '/viewer/[docId]', params: { docId } }) },
        ]
      );
      return;
    }
    Alert.alert('Ghi đè file gốc', 'Ghi đè file gốc với các thay đổi hiện tại? Thao tác này không thể hoàn tác.', [
      { text: 'Hủy', style: 'cancel' },
      {
        text: 'Ghi đè',
        style: 'destructive',
        onPress: async () => {
          const res = await overwriteOriginal(docId, { flatten: true });
          if (res.ok) Alert.alert('Đã ghi đè', 'File gốc đã được cập nhật.');
          else if (res.error) Alert.alert('Lỗi', res.error);
        },
      },
    ]);
  }, [docId, handleSaveCopy, router]);

  const handleShare = useCallback(async () => {
    if (!docId) return;
    await shareDocument(docId);
  }, [docId]);

  const handleDuplicate = useCallback(async () => {
    if (!docId) return;
    const res = await duplicateDocument(docId);
    if (res.ok) Alert.alert('Đã nhân bản', 'Đã tạo bản sao của tài liệu.');
    else if (res.error) Alert.alert('Lỗi', res.error);
  }, [docId]);

  const currentPageId = pageIds[pageIndex];
  const pageHeightPts = pageSizes[pageIndex]?.heightPts ?? 842;
  const pageAnnotations = useAnnotationStore((s) =>
    docId ? Object.values(s.byDoc[docId] ?? {}).filter((a) => a.pageId === currentPageId) : []
  );
  const projectReady = useProjectStore((s) => s.projects[docId ?? ''] !== undefined);

  if (state === 'loading') {
    return (
      <ThemedView color="background" style={styles.center}>
        <ActivityIndicator size="large" color={palette.primary} />
        <ThemedText type="small" color="textSecondary" style={{ marginTop: Spacing.three }}>
          Đang mở PDF…
        </ThemedText>
        <PdfEngineHost engine={engine} />
      </ThemedView>
    );
  }

  if (state === 'error') {
    return (
      <ThemedView color="background" style={styles.center}>
        <Ionicons name="alert-circle-outline" size={44} color={palette.danger} />
        <ThemedText type="subheading" style={{ marginTop: Spacing.three, textAlign: 'center' }}>
          Không thể mở tài liệu
        </ThemedText>
        <ThemedText type="small" color="textSecondary" style={{ marginTop: Spacing.two, textAlign: 'center', paddingHorizontal: Spacing.four }}>
          {error}
        </ThemedText>
        <View style={{ flexDirection: 'row', gap: Spacing.three, marginTop: Spacing.four }}>
          <Pressable onPress={() => safeBack()} style={[styles.btn, { backgroundColor: palette.backgroundElement }]}>
            <ThemedText type="smallBold">Quay lại</ThemedText>
          </Pressable>
          {docId ? (
            <Pressable onPress={handleRemoveDoc} style={[styles.btn, { backgroundColor: palette.danger }]}>
              <ThemedText type="smallBold" color="onPrimary">Xóa khỏi danh sách</ThemedText>
            </Pressable>
          ) : null}
        </View>
        <PdfEngineHost engine={engine} />
      </ThemedView>
    );
  }

  return (
    <ThemedView color="background" style={{ flex: 1 }}>
      <PdfEngineHost engine={engine} />

      {/* Top bar */}
      <SafeAreaView edges={['top']} style={styles.topBar}>
        <Pressable onPress={() => safeBack()} hitSlop={8} style={styles.iconBtn}>
          <Ionicons name="arrow-back" size={22} color={palette.text} />
        </Pressable>
        <View style={{ flex: 1, paddingHorizontal: Spacing.two }}>
          <ThemedText type="smallBold" numberOfLines={1}>
            {docName}
          </ThemedText>
          <ThemedText type="caption" color="textSecondary">
            Trang {pageIndex + 1}/{pageCount}
          </ThemedText>
        </View>
        <Pressable onPress={() => setSearchOpen((v) => !v)} hitSlop={8} style={styles.iconBtn}>
          <Ionicons name="search-outline" size={22} color={palette.text} />
        </Pressable>
        <Pressable onPress={toggleAnnotating} hitSlop={8} style={[styles.iconBtn, annotating && { backgroundColor: palette.backgroundSelected }]}>
          <Ionicons name="color-wand-outline" size={22} color={annotating ? palette.primary : palette.text} />
        </Pressable>
        <Pressable onPress={openOrganizer} hitSlop={8} style={styles.iconBtn}>
          <Ionicons name="albums-outline" size={22} color={palette.text} />
        </Pressable>
        <Pressable onPress={() => setShowThumbs(true)} hitSlop={8} style={styles.iconBtn}>
          <Ionicons name="grid-outline" size={22} color={palette.text} />
        </Pressable>
        <Pressable onPress={() => setMenuOpen(true)} hitSlop={8} style={styles.iconBtn}>
          <Ionicons name="ellipsis-vertical" size={22} color={palette.text} />
        </Pressable>
      </SafeAreaView>

      {/* Search bar */}
      {searchOpen ? (
        <View style={[styles.searchBar, { backgroundColor: palette.backgroundElevated }]}>
          <TextInput
            value={query}
            onChangeText={setQuery}
            onSubmitEditing={runSearch}
            placeholder="Tìm kiếm trong tài liệu…"
            placeholderTextColor={palette.textSecondary}
            autoFocus
            style={[styles.searchInput, { color: palette.text }]}
          />
          <Pressable onPress={runSearch} hitSlop={8} style={styles.iconBtn}>
            {searching ? (
              <ActivityIndicator size="small" color={palette.primary} />
            ) : (
              <Ionicons name="arrow-forward" size={20} color={palette.primary} />
            )}
          </Pressable>
          {searchResults.length > 0 ? (
            <View style={[styles.searchResults, { backgroundColor: palette.backgroundElevated }]}>
              <ThemedText type="caption" color="textSecondary" style={{ padding: Spacing.two }}>
                {searchResults.length} kết quả
              </ThemedText>
              {searchResults.slice(0, 30).map((hit, i) => (
                <Pressable key={i} onPress={() => selectHit(hit)} style={[styles.resultRow, { backgroundColor: palette.backgroundElement }]}>
                  <Ionicons name="document-text-outline" size={16} color={palette.primary} />
                  <ThemedText type="small" numberOfLines={1} style={{ flex: 1, marginLeft: Spacing.two }}>
                    Trang {pageIds.indexOf(hit.pageId) + 1}: {hit.text}
                  </ThemedText>
                </Pressable>
              ))}
            </View>
          ) : null}
          {!searching && searchTried && query.trim() !== '' && searchResults.length === 0 ? (
            <View style={[styles.searchEmpty, { backgroundColor: palette.backgroundElement }]}>
              <Ionicons name="information-circle-outline" size={16} color={palette.textSecondary} />
              <ThemedText type="caption" color="textSecondary" style={{ flex: 1 }}>
                {searchScannedHelper.why} {searchScannedHelper.how}
              </ThemedText>
            </View>
          ) : null}
        </View>
      ) : null}

      {/* Canvas + annotation layer */}
      <View style={{ flex: 1 }} onLayout={onLayout}>
        <PdfCanvas
          ref={canvasRef}
          uri={currentBitmap}
          aspectRatio={canvasW > 0 ? canvasW / Math.max(canvasH, 1) : 1}
          width={canvasW}
          height={canvasH}
          gesturesEnabled={!showThumbs}
          onScaleChange={() => {}}>
          {projectReady && currentPageId ? (
            <AnnotationCanvas
              docId={docId!}
              pageId={currentPageId}
              pageHeightPts={pageHeightPts}
              scale={renderScale}
              width={canvasW}
              height={canvasH}
              textLines={textLines}
              resolveAsset={(p) => resolveSignatureAsset(docId!, p)}
            />
          ) : null}
        </PdfCanvas>
      </View>

      {/* Annotation toolbar — toggled via the wand button (so a fresh doc is
          never stuck in read-only; select mode with annotations also shows it) */}
      {annotating || activeTool !== 'select' || pageAnnotations.length > 0 ? (
        <View ref={toolbarWrapRef} onLayout={handleToolbarLayout}>
          <AnnotationToolbar onOpenSignature={openSignaturePad} undoRef={undoRef} />
        </View>
      ) : (
        <SafeAreaView edges={['bottom']} style={[styles.bottomBar, { borderTopColor: palette.border }]}>
          <Pressable onPress={() => goToPage(pageIndex - 1)} disabled={pageIndex === 0} style={[styles.iconBtn, pageIndex === 0 && { opacity: 0.3 }]}>
            <Ionicons name="chevron-up" size={24} color={palette.text} />
          </Pressable>
          <ThemedText type="smallBold">
            {pageIndex + 1} / {pageCount}
          </ThemedText>
          <Pressable onPress={() => goToPage(pageIndex + 1)} disabled={pageIndex >= pageCount - 1} style={[styles.iconBtn, pageIndex >= pageCount - 1 && { opacity: 0.3 }]}>
            <Ionicons name="chevron-down" size={24} color={palette.text} />
          </Pressable>
        </SafeAreaView>
      )}

      {showThumbs ? (
        <ThumbnailsSheet
          engine={engine}
          cache={cache}
          pageIds={pageIds}
          currentPage={pageIndex}
          onSelect={goToPage}
          onClose={() => setShowThumbs(false)}
        />
      ) : null}

      <AdBanner placement="viewer" />

      <SignaturePickerModal visible={showSignaturePicker} onClose={() => setShowSignaturePicker(false)} />
      <DocumentMenuModal
        visible={menuOpen}
        onClose={() => setMenuOpen(false)}
        onSaveCopy={() => void handleSaveCopy()}
        onOverwrite={() => void handleOverwrite()}
        onShare={() => void handleShare()}
        onDuplicate={() => void handleDuplicate()}
      />

      {/* Annotation-intro spotlight — rendered last so it sits above the toolbar. */}
      {introVisible ? (
        <SpotlightOverlay
          steps={introSteps}
          index={introStepIndex}
          onNext={handleIntroNext}
          onSkip={handleIntroSkip}
          onTargetTap={handleIntroTargetTap}
        />
      ) : null}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.two,
  },
  iconBtn: { padding: Spacing.two, borderRadius: Radius.md },
  bottomBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.four,
    paddingVertical: Spacing.two,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  btn: { paddingHorizontal: Spacing.three, paddingVertical: Spacing.two, borderRadius: Radius.md },
  searchBar: { padding: Spacing.two, flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  searchInput: { flex: 1, fontSize: 15, paddingVertical: Spacing.two },
  searchResults: { position: 'absolute', top: 52, left: Spacing.two, right: Spacing.two, maxHeight: 260, borderRadius: Radius.lg, padding: Spacing.two, zIndex: 10, elevation: 4 },
  resultRow: { flexDirection: 'row', alignItems: 'center', padding: Spacing.two, borderRadius: Radius.md, marginTop: Spacing.one },
  searchEmpty: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two, marginTop: Spacing.one, padding: Spacing.two, borderRadius: Radius.md },
});
