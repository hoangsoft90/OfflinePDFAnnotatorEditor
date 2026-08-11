import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useCallback } from 'react';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Radius, Spacing, Elevation } from '@/constants/theme';
import { useMetadataStore } from '@/store/use-metadata-store';
import { usePalette } from '@/store/use-theme-store';
import { openPdfViaPicker } from '@/files/open';
import { formatFileSize, formatRelativeTime } from '@/utils/format';
import { AdBanner } from '@/ads/AdBanner';

function RecentRow({ doc }: { doc: ReturnType<typeof useMetadataStore.getState>['recents'][number] }) {
  const palette = usePalette();
  const setFavorite = useMetadataStore((s) => s.setFavorite);

  const open = useCallback(() => {
    router.push({ pathname: '/viewer/[docId]', params: { docId: doc.id } });
  }, [doc.id]);

  return (
    <Pressable
      onPress={open}
      style={({ pressed }) => [
        styles.row,
        { backgroundColor: palette.backgroundElevated, borderColor: palette.border },
        pressed && { opacity: 0.7 },
      ]}>
      <View style={[styles.rowIcon, { backgroundColor: palette.backgroundElement }]}>
        <Ionicons name="document-text" size={22} color={palette.primary} />
      </View>
      <View style={styles.rowBody}>
        <ThemedText type="smallBold" numberOfLines={1}>
          {doc.name}
        </ThemedText>
        <ThemedText type="caption" color="textSecondary">
          {doc.pageCount > 0 ? `${doc.pageCount} trang · ` : ''}
          {formatFileSize(doc.size)} · {formatRelativeTime(doc.lastOpened)}
        </ThemedText>
      </View>
      <Pressable hitSlop={8} onPress={() => void setFavorite(doc.id, !doc.isFavorite)}>
        <Ionicons
          name={doc.isFavorite ? 'star' : 'star-outline'}
          size={20}
          color={doc.isFavorite ? palette.warning : palette.textSecondary}
        />
      </Pressable>
    </Pressable>
  );
}

export default function HomeScreen() {
  const palette = usePalette();
  const { recents, showFavoritesOnly, setFavoritesOnly } = useMetadataStore();
  const handleOpen = useCallback(async () => {
    try {
      await openPdfViaPicker();
    } catch (e) {
      console.warn('Open failed', e);
    }
  }, []);

  const empty = (
    <ThemedView color="background" style={styles.empty}>
      <Ionicons name="shield-checkmark-outline" size={48} color={palette.success} />
      <ThemedText type="subheading" style={{ marginTop: Spacing.three }}>
        Chưa có tài liệu nào
      </ThemedText>
      <ThemedText type="small" color="textSecondary" style={styles.emptyText}>
        Mở một file PDF từ thiết bị của bạn. Mọi thứ được xử lý 100% offline — tài liệu không bao giờ rời khỏi máy.
      </ThemedText>
    </ThemedView>
  );

  return (
    <ThemedView color="background" style={styles.container}>
      <SafeAreaView edges={['top']} style={styles.safe}>
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <ThemedText type="title">PDF Workspace</ThemedText>
            <ThemedText type="small" color="textSecondary">
              Offline · Riêng tư · Không tài khoản
            </ThemedText>
          </View>
          <Pressable
            onPress={() => void handleOpen()}
            style={({ pressed }) => [
              styles.openBtn,
              { backgroundColor: palette.primary },
              pressed && { backgroundColor: palette.primaryPressed },
            ]}>
            <Ionicons name="folder-open-outline" size={18} color={palette.onPrimary} />
            <ThemedText type="smallBold" color="onPrimary">
              Mở PDF
            </ThemedText>
          </Pressable>
        </View>

        <View style={styles.filterRow}>
          <Pressable onPress={() => setFavoritesOnly(false)} style={styles.filterPill}>
            <ThemedText type="small" color={!showFavoritesOnly ? 'primary' : 'textSecondary'}>
              Gần đây
            </ThemedText>
          </Pressable>
          <Pressable onPress={() => setFavoritesOnly(true)} style={styles.filterPill}>
            <ThemedText type="small" color={showFavoritesOnly ? 'primary' : 'textSecondary'}>
              Yêu thích
            </ThemedText>
          </Pressable>
        </View>

        {recents.length === 0 ? (
          empty
        ) : (
          <FlatList
            data={recents}
            keyExtractor={(d) => d.id}
            renderItem={({ item }) => <RecentRow doc={item} />}
            contentContainerStyle={styles.list}
            ItemSeparatorComponent={() => <View style={{ height: Spacing.two }} />}
          />
        )}

        <AdBanner placement="home" />
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safe: { flex: 1, paddingHorizontal: Spacing.three },
  header: { flexDirection: 'row', alignItems: 'center', paddingTop: Spacing.four, gap: Spacing.three },
  openBtn: { flexDirection: 'row', alignItems: 'center', gap: Spacing.one, paddingHorizontal: Spacing.three, paddingVertical: Spacing.two, borderRadius: Radius.md },
  filterRow: { flexDirection: 'row', gap: Spacing.two, marginVertical: Spacing.three },
  filterPill: { paddingHorizontal: Spacing.three, paddingVertical: Spacing.one },
  list: { paddingBottom: Spacing.six },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three, padding: Spacing.three, borderRadius: Radius.lg, borderWidth: StyleSheet.hairlineWidth, ...Elevation.card },
  rowIcon: { width: 40, height: 40, borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center' },
  rowBody: { flex: 1, gap: Spacing.half },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.five },
  emptyText: { textAlign: 'center', maxWidth: 320, marginTop: Spacing.two },
});
