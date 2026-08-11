import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Image, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { PdfEngineHost } from '@/engine/PdfEngineHost';
import { createPdfEngine } from '@/engine/pdfjs-engine';
import type { PdfEngine } from '@/engine/types';
import { BitmapCache } from '@/engine/bitmap-cache';
import { Radius, Spacing } from '@/constants/theme';
import { usePalette } from '@/store/use-theme-store';
import { useProjectStore } from '@/store/use-project-store';
import { useCommandStack } from '@/commands/stack';
import { DeletePagesCommand, RotatePageCommand } from '@/commands/page-commands';
import { extractAndSave } from '@/export/save-service';
import { readPdfBytes } from '@/files/read-pdf';
import { useMetadataStore } from '@/store/use-metadata-store';
import { loadProjectFromDisk } from '@/project/project-manager';
import { safeBack } from '@/utils/navigation';

export function OrganizerScreen() {
  const { docId } = useLocalSearchParams<{ docId: string }>();
  const palette = usePalette();

  const [engine] = useState<PdfEngine>(() => createPdfEngine());
  const cache = useMemo(() => new BitmapCache(docId ?? 'doc'), [docId]);

  const [loading, setLoading] = useState(true);
  const [thumbs, setThumbs] = useState<Record<number, string>>({});
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [extracting, setExtracting] = useState(false);

  const project = useProjectStore((s) => (docId ? s.projects[docId] : undefined));
  const pageOrder = useMemo(() => project?.pageOrder ?? [], [project]);
  const pageRotations = useMemo(() => project?.pageRotations ?? {}, [project]);
  const execute = useCommandStack((s) => s.execute);

  // ---- load document + thumbnails ----
  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!docId) return;
      try {
        // restore project state if not in memory (deep-link / reopen)
        const inMemory = useProjectStore.getState().projects[docId];
        if (!inMemory) {
          const loaded = await loadProjectFromDisk(docId);
          if (loaded) useProjectStore.getState().setProject(docId, loaded);
        }
        const doc = await useMetadataStore.getState().getById(docId);
        if (!doc) {
          if (!cancelled) setLoading(false);
          return;
        }
        const bytes = await readPdfBytes(doc.uri);
        if (!bytes) {
          if (!cancelled) setLoading(false);
          return;
        }
        await engine.open(bytes);
        const projectState = useProjectStore.getState().projects[docId];
        const count = projectState?.pageOrder.length ?? engine.pageCount;
        for (let i = 0; i < count; i++) {
          const cached = await cache.get(i, 0.5);
          if (cached) {
            setThumbs((p) => ({ ...p, [i]: cached.uri }));
          } else {
            const rendered = await engine.renderPage(i, 0.5);
            setThumbs((p) => ({ ...p, [i]: rendered.uri }));
            await cache.put(i, 0.5, rendered);
          }
          if (cancelled) return;
        }
      } catch {
        // tolerate
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [docId]);

  const toggleSelect = useCallback((index: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  }, []);

  const rotateSelected = useCallback(
    (delta: 90 | -90) => {
      if (!docId || selected.size === 0) return;
      const indexes = [...selected].sort((a, b) => a - b);
      for (const idx of indexes) {
        const pageId = pageOrder[idx];
        if (!pageId) continue;
        const cur = pageRotations[pageId] ?? 0;
        const next = (((cur + delta) % 360) + 360) % 360;
        execute(new RotatePageCommand(docId, pageId, next as 0 | 90 | 180 | 270));
      }
      setSelected(new Set());
    },
    [docId, execute, pageOrder, pageRotations, selected]
  );

  const deleteSelected = useCallback(() => {
    if (!docId || selected.size === 0) return;
    Alert.alert('Xóa trang', `Xóa ${selected.size} trang được chọn? Các ghi chú trên trang đó cũng sẽ bị xóa.`, [
      { text: 'Hủy', style: 'cancel' },
      {
        text: 'Xóa',
        style: 'destructive',
        onPress: () => {
          const indexes = [...selected].sort((a, b) => b - a);
          execute(new DeletePagesCommand(docId, indexes));
          setSelected(new Set());
        },
      },
    ]);
  }, [docId, execute, selected]);

  const extractSelected = useCallback(async () => {
    if (!docId || selected.size === 0) return;
    setExtracting(true);
    try {
      const indexes = [...selected].sort((a, b) => a - b);
      const result = await extractAndSave(docId, indexes);
      if (result.ok) {
        Alert.alert('Đã trích xuất', 'Các trang đã được lưu thành một tài liệu mới trong danh sách gần đây.');
      } else if (result.error) {
        Alert.alert('Lỗi', result.error);
      }
    } finally {
      setExtracting(false);
      setSelected(new Set());
    }
  }, [docId, selected]);

  const undo = useCommandStack((s) => s.undo);
  const redo = useCommandStack((s) => s.redo);

  if (loading) {
    return (
      <ThemedView color="background" style={styles.center}>
        <ActivityIndicator size="large" color={palette.primary} />
        <ThemedText type="small" color="textSecondary" style={{ marginTop: Spacing.three }}>
          Đang tải trang…
        </ThemedText>
        <PdfEngineHost engine={engine} />
      </ThemedView>
    );
  }

  return (
    <ThemedView color="background" style={{ flex: 1 }}>
      <PdfEngineHost engine={engine} />
      <SafeAreaView edges={['top']} style={styles.topBar}>
        <Pressable onPress={() => safeBack()} hitSlop={8} style={styles.iconBtn}>
          <Ionicons name="arrow-back" size={22} color={palette.text} />
        </Pressable>
        <ThemedText type="subheading" style={{ flex: 1, marginLeft: Spacing.two }}>
          Sắp xếp trang
        </ThemedText>
        <Pressable onPress={undo} hitSlop={8} style={styles.iconBtn}>
          <Ionicons name="arrow-undo-outline" size={20} color={palette.text} />
        </Pressable>
        <Pressable onPress={redo} hitSlop={8} style={styles.iconBtn}>
          <Ionicons name="arrow-redo-outline" size={20} color={palette.text} />
        </Pressable>
      </SafeAreaView>

      {selected.size > 0 ? (
        <View style={[styles.actionBar, { backgroundColor: palette.backgroundElevated }]}>
          <Pressable onPress={() => rotateSelected(90)} style={styles.actionBtn}>
            <Ionicons name="sync-outline" size={20} color={palette.primary} />
            <ThemedText type="caption" color="primary">Xoay phải</ThemedText>
          </Pressable>
          <Pressable onPress={() => rotateSelected(-90)} style={styles.actionBtn}>
            <Ionicons name="sync-outline" size={20} color={palette.primary} style={{ transform: [{ scaleX: -1 }] }} />
            <ThemedText type="caption" color="primary">Xoay trái</ThemedText>
          </Pressable>
          <Pressable onPress={() => void extractSelected()} disabled={extracting} style={styles.actionBtn}>
            <Ionicons name="copy-outline" size={20} color={palette.success} />
            <ThemedText type="caption" color="success">{extracting ? '…' : 'Trích xuất'}</ThemedText>
          </Pressable>
          <Pressable onPress={deleteSelected} style={styles.actionBtn}>
            <Ionicons name="trash-outline" size={20} color={palette.danger} />
            <ThemedText type="caption" color="danger">Xóa</ThemedText>
          </Pressable>
          <Pressable onPress={() => setSelected(new Set())} style={styles.actionBtn}>
            <ThemedText type="caption" color="textSecondary">Bỏ chọn</ThemedText>
          </Pressable>
        </View>
      ) : (
        <ThemedText type="small" color="textSecondary" style={{ paddingHorizontal: Spacing.three, paddingBottom: Spacing.two }}>
          Chạm vào trang để chọn nhiều trang.
        </ThemedText>
      )}

      <FlatList
        data={pageOrder}
        keyExtractor={(id) => id}
        numColumns={2}
        contentContainerStyle={{ padding: Spacing.two, paddingBottom: Spacing.six }}
        renderItem={({ item, index }) => {
          const rotation = pageRotations[item] ?? 0;
          const isSel = selected.has(index);
          return (
            <Pressable
              onPress={() => toggleSelect(index)}
              style={[styles.thumbWrap, { borderColor: isSel ? palette.primary : 'transparent', backgroundColor: palette.backgroundElevated }]}>
              {thumbs[index] ? (
                <Image source={{ uri: thumbs[index] }} style={[styles.thumb, rotation !== 0 && { transform: [{ rotate: `${rotation}deg` }] }]} resizeMode="contain" />
              ) : (
                <View style={[styles.thumb, { backgroundColor: palette.backgroundElement }]} />
              )}
              <View style={styles.thumbLabelRow}>
                <ThemedText type="caption" color="textSecondary">{index + 1}</ThemedText>
                {isSel ? <Ionicons name="checkmark-circle" size={18} color={palette.primary} /> : null}
              </View>
            </Pressable>
          );
        }}
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  topBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.two, paddingVertical: Spacing.two },
  iconBtn: { padding: Spacing.two, borderRadius: Radius.md },
  actionBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', paddingVertical: Spacing.two, marginBottom: Spacing.two },
  actionBtn: { alignItems: 'center', gap: 2, paddingHorizontal: Spacing.two },
  thumbWrap: { flex: 1, margin: Spacing.one, borderRadius: Radius.lg, borderWidth: 2, padding: Spacing.two, alignItems: 'center' },
  thumb: { width: '100%', height: 150 },
  thumbLabelRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%', paddingHorizontal: Spacing.one, marginTop: Spacing.one },
});
