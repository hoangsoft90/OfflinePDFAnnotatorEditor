import { useCallback, useEffect, useRef, useState } from 'react';
import { FlatList, Image, Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import type { PdfEngine } from '@/engine/types';
import { usePalette } from '@/store/use-theme-store';
import { BitmapCache } from '@/engine/bitmap-cache';

interface Props {
  engine: PdfEngine;
  cache: BitmapCache;
  pageIds: string[];
  currentPage: number;
  onSelect: (pageIndex: number) => void;
  onClose: () => void;
}

const THUMB_W = 108;

export function ThumbnailsSheet({ engine, cache, pageIds, currentPage, onSelect, onClose }: Props) {
  const palette = usePalette();
  const [thumbs, setThumbs] = useState<Record<number, string>>({});
  const requested = useRef<Set<number>>(new Set());

  const ensureThumb = useCallback(
    (index: number) => {
      if (requested.current.has(index)) return;
      requested.current.add(index);
      void (async () => {
        try {
          const cached = await cache.get(index, 0.5);
          if (cached) {
            setThumbs((prev) => ({ ...prev, [index]: cached.uri }));
            return;
          }
          const rendered = await engine.renderPage(index, 0.5);
          setThumbs((prev) => ({ ...prev, [index]: rendered.uri }));
          if (rendered.uri.startsWith('data:image')) {
            await cache.put(index, 0.5, rendered);
          }
        } catch {
          // ignore failed thumbnails
        }
      })();
    },
    [cache, engine]
  );

  // Kick off generation for visible + neighbors lazily via onViewableItemsChanged.
  useEffect(() => {
    for (let i = 0; i < Math.min(pageIds.length, 8); i++) ensureThumb(i);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <View style={[styles.sheet, { backgroundColor: palette.backgroundElevated }]}>
      <View style={styles.header}>
        <ThemedText type="subheading">{pageIds.length} trang</ThemedText>
        <Pressable onPress={onClose} hitSlop={8}>
          <ThemedText type="linkPrimary">Đóng</ThemedText>
        </Pressable>
      </View>
      <FlatList
        data={pageIds}
        keyExtractor={(id, i) => `${id}-${i}`}
        numColumns={2}
        contentContainerStyle={{ padding: Spacing.three }}
        onEndReached={() => {
          for (let i = thumbsCount(pageIds.length); i < pageIds.length; i++) ensureThumb(i);
        }}
        renderItem={({ item, index }) => (
          <Pressable
            onPress={() => onSelect(index)}
            style={[
              styles.thumb,
              { borderColor: index === currentPage ? palette.primary : 'transparent' },
            ]}>
            {thumbs[index] ? (
              <Image source={{ uri: thumbs[index] }} style={styles.thumbImg} resizeMode="contain" />
            ) : (
              <View style={[styles.thumbPlaceholder, { backgroundColor: palette.backgroundElement }]} />
            )}
            <ThemedText type="caption" color="textSecondary" style={{ marginTop: Spacing.half }}>
              {index + 1}
            </ThemedText>
          </Pressable>
        )}
      />
    </View>
  );
}

function thumbsCount(total: number): number {
  return total;
}

const styles = StyleSheet.create({
  sheet: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    width: '82%',
    borderTopRightRadius: Radius.xl,
    borderBottomRightRadius: Radius.xl,
    paddingTop: 12,
    zIndex: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.three,
    paddingBottom: Spacing.two,
  },
  thumb: {
    width: THUMB_W,
    margin: Spacing.two,
    alignItems: 'center',
    borderWidth: 2,
    borderRadius: Radius.md,
    padding: Spacing.one,
  },
  thumbImg: { width: THUMB_W - 8, height: 140 },
  thumbPlaceholder: { width: THUMB_W - 8, height: 140, borderRadius: Radius.sm },
});
