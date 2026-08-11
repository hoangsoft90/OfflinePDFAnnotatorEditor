import { Ionicons } from '@expo/vector-icons';
import { Modal, Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { usePalette } from '@/store/use-theme-store';

interface Props {
  visible: boolean;
  onClose: () => void;
  onSaveCopy: () => void;
  onOverwrite: () => void;
  onShare: () => void;
  onDuplicate: () => void;
}

function MenuItem({ icon, label, sub, onPress, tint }: { icon: keyof typeof Ionicons.glyphMap; label: string; sub?: string; onPress: () => void; tint?: string }) {
  const palette = usePalette();
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.item, { backgroundColor: palette.backgroundElement }, pressed && { opacity: 0.7 }]}>
      <Ionicons name={icon} size={20} color={tint ?? palette.primary} />
      <View style={{ flex: 1 }}>
        <ThemedText type="smallBold">{label}</ThemedText>
        {sub ? <ThemedText type="caption" color="textSecondary">{sub}</ThemedText> : null}
      </View>
      <Ionicons name="chevron-forward" size={16} color={palette.textSecondary} />
    </Pressable>
  );
}

export function DocumentMenuModal({ visible, onClose, onSaveCopy, onOverwrite, onShare, onDuplicate }: Props) {
  const palette = usePalette();
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={[styles.sheet, { backgroundColor: palette.backgroundElevated }]} onPress={(e) => e.stopPropagation()}>
          <View style={styles.header}>
            <ThemedText type="subheading">Tài liệu</ThemedText>
            <Pressable onPress={onClose} hitSlop={8}>
              <Ionicons name="close" size={22} color={palette.textSecondary} />
            </Pressable>
          </View>
          <MenuItem icon="copy-outline" label="Lưu bản sao…" sub="Xuất PDF kèm ghi chú (khuyên dùng)" onPress={onSaveCopy} />
          <MenuItem icon="swap-horizontal-outline" label="Ghi đè file gốc" sub="Cập nhật file gốc (atomic, có xác nhận)" onPress={onOverwrite} tint={palette.warning} />
          <MenuItem icon="share-social-outline" label="Chia sẻ" sub="Chia sẻ bản sao qua ứng dụng khác" onPress={onShare} />
          <MenuItem icon="duplicate-outline" label="Nhân bản" sub="Tạo một tài liệu độc lập" onPress={onDuplicate} />
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', padding: Spacing.four },
  sheet: { borderRadius: Radius.xl, padding: Spacing.three },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: Spacing.three },
  item: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three, padding: Spacing.three, borderRadius: Radius.lg, marginBottom: Spacing.two },
});
