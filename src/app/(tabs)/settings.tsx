import { Ionicons } from '@expo/vector-icons';
import { useCallback } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Radius, Spacing } from '@/constants/theme';
import { useMetadataStore } from '@/store/use-metadata-store';
import { usePalette, useThemeStore } from '@/store/use-theme-store';
import { showRewardedAd } from '@/ads/rewarded-manager';

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={{ marginTop: Spacing.four }}>
      <ThemedText type="label" color="textSecondary" style={{ marginBottom: Spacing.two }}>
        {title}
      </ThemedText>
      {children}
    </View>
  );
}

function Row({ icon, title, subtitle, onPress, tint }: { icon: keyof typeof Ionicons.glyphMap; title: string; subtitle?: string; onPress?: () => void; tint?: string }) {
  const palette = usePalette();
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        { backgroundColor: palette.backgroundElevated, borderColor: palette.border },
        pressed && { opacity: 0.7 },
      ]}>
      <View style={[styles.rowIcon, { backgroundColor: palette.backgroundElement }]}>
        <Ionicons name={icon} size={18} color={tint ?? palette.primary} />
      </View>
      <View style={{ flex: 1 }}>
        <ThemedText type="smallBold">{title}</ThemedText>
        {subtitle ? (
          <ThemedText type="caption" color="textSecondary">
            {subtitle}
          </ThemedText>
        ) : null}
      </View>
      {onPress ? <Ionicons name="chevron-forward" size={18} color={palette.textSecondary} /> : null}
    </Pressable>
  );
}

export default function SettingsScreen() {
  const palette = usePalette();
  const { mode, setMode } = useThemeStore();
  const clearRecents = useMetadataStore((s) => s.clearRecents);

  const handleRewarded = useCallback(async () => {
    const earned = await showRewardedAd();
    if (earned) {
      Alert.alert('Cảm ơn bạn!', 'Bạn đã giúp giữ ứng dụng miễn phí. Hẹn gặp lại ở tài liệu tiếp theo!');
    }
  }, []);

  const confirmClear = useCallback(() => {
    Alert.alert('Xóa lịch sử & bộ nhớ đệm', 'Xóa danh sách tài liệu gần đây và ảnh xem trước đã lưu? File PDF gốc và các thay đổi chưa lưu sẽ không bị ảnh hưởng.', [
      { text: 'Hủy', style: 'cancel' },
      {
        text: 'Xóa',
        style: 'destructive',
        onPress: async () => {
          await clearRecents();
        },
      },
    ]);
  }, [clearRecents]);

  return (
    <ThemedView color="background" style={{ flex: 1 }}>
      <SafeAreaView edges={['top']} style={{ flex: 1, paddingHorizontal: Spacing.three }}>
        <ThemedText type="title" style={{ paddingTop: Spacing.four }}>
          Cài đặt
        </ThemedText>

        <Section title="Giao diện">
          <View style={{ flexDirection: 'row', gap: Spacing.two }}>
            {(['light', 'dark', 'system'] as const).map((m) => (
              <Pressable
                key={m}
                onPress={() => setMode(m)}
                style={[styles.modePill, { backgroundColor: mode === m ? palette.primary : palette.backgroundElevated, borderColor: palette.border }]}>
                <ThemedText type="small" color={mode === m ? 'onPrimary' : 'textSecondary'}>
                  {m === 'light' ? 'Sáng' : m === 'dark' ? 'Tối' : 'Hệ thống'}
                </ThemedText>
              </Pressable>
            ))}
          </View>
        </Section>

        <Section title="Quyền riêng tư">
          <Row
            icon="shield-checkmark-outline"
            title="Dữ liệu riêng tư"
            subtitle="PDF, chú thích và chữ ký chỉ nằm trên thiết bị của bạn — app không chủ động gửi dữ liệu đi đâu."
            tint={palette.success}
          />
          <Row icon="person-outline" title="Không tài khoản" subtitle="Không đăng nhập, không theo dõi, không phân tích." />
        </Section>

        <Section title="Dữ liệu">
          <Row icon="trash-outline" title="Xóa lịch sử & bộ nhớ đệm" subtitle="Xóa tài liệu gần đây và ảnh xem trước" onPress={() => void confirmClear()} tint={palette.danger} />
        </Section>

        <Section title="Ủng hộ">
          <Row
            icon="heart-outline"
            title="Xem quảng cáo ủng hộ"
            subtitle="Xem một quảng cáo ngắn để hỗ trợ phát triển ứng dụng miễn phí"
            onPress={() => void handleRewarded()}
          />
        </Section>

        <Section title="Về ứng dụng">
          <Row icon="information-circle-outline" title="Offline PDF Annotator & Editor" subtitle="Phiên bản 1.0.0 · Miễn phí, mã nguồn mở" />
        </Section>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three, padding: Spacing.three, borderRadius: Radius.lg, borderWidth: StyleSheet.hairlineWidth, marginBottom: Spacing.two },
  rowIcon: { width: 32, height: 32, borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center' },
  modePill: { flex: 1, paddingVertical: Spacing.two, borderRadius: Radius.md, borderWidth: 1, alignItems: 'center' },
});
