import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Image, Modal, Pressable, StyleSheet, View, FlatList } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { usePalette } from '@/store/use-theme-store';
import { useSignatureStore } from '@/store/use-signature-store';
import { useToolStore } from '@/store/use-tool-store';
import type { Signature } from '@/models/signature';

interface Props {
  visible: boolean;
  onClose: () => void;
}

export function SignaturePickerModal({ visible, onClose }: Props) {
  const palette = usePalette();
  const { signatures, selectForPlacement } = useSignatureStore();

  const pick = (sig: Signature) => {
    selectForPlacement(sig);
    // Switch to the signature tool so the next canvas tap places it
    // (draw gestures are only enabled for non-select/eraser tools).
    useToolStore.getState().setTool('signature');
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={[styles.sheet, { backgroundColor: palette.backgroundElevated }]} onPress={(e) => e.stopPropagation()}>
          <View style={styles.header}>
            <ThemedText type="subheading">Chữ ký</ThemedText>
            <Pressable onPress={onClose} hitSlop={8}>
              <Ionicons name="close" size={22} color={palette.textSecondary} />
            </Pressable>
          </View>

          {signatures.length === 0 ? (
            <View style={styles.empty}>
              <ThemedText type="smallBold">Chưa có chữ ký nào.</ThemedText>
              <ThemedText type="small" color="textSecondary" style={{ textAlign: 'center', marginTop: Spacing.one, maxWidth: 280 }}>
                Vẽ một chữ ký và dùng lại trên mọi tài liệu. Chữ ký chỉ nằm trên thiết bị của bạn.
              </ThemedText>
            </View>
          ) : (
            <FlatList
              data={signatures}
              keyExtractor={(s) => s.id}
              numColumns={2}
              contentContainerStyle={{ paddingBottom: Spacing.four }}
              renderItem={({ item }) => (
                <Pressable
                  onPress={() => pick(item)}
                  style={[styles.sigCard, { backgroundColor: palette.backgroundElement }]}>
                  <Image source={{ uri: item.uri }} style={styles.sigImg} resizeMode="contain" />
                  <ThemedText type="caption" color="textSecondary">
                    {new Date(item.createdAt).toLocaleDateString('vi-VN')}
                  </ThemedText>
                </Pressable>
              )}
            />
          )}

          <Pressable
            onPress={() => {
              onClose();
              router.push('/signature-pad');
            }}
            style={[styles.newBtn, { backgroundColor: palette.primary }]}>
            <Ionicons name="create-outline" size={18} color={palette.onPrimary} />
            <ThemedText type="smallBold" color="onPrimary">
              Vẽ chữ ký mới
            </ThemedText>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  sheet: { borderTopLeftRadius: Radius.xl, borderTopRightRadius: Radius.xl, padding: Spacing.three, maxHeight: '75%' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: Spacing.three },
  empty: { paddingVertical: Spacing.five, alignItems: 'center' },
  sigCard: { flex: 1, margin: Spacing.one, padding: Spacing.two, borderRadius: Radius.lg, alignItems: 'center' },
  sigImg: { width: '100%', height: 80 },
  newBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.two, paddingVertical: Spacing.three, borderRadius: Radius.lg, marginTop: Spacing.two },
});
