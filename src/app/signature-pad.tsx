import { Ionicons } from '@expo/vector-icons';
import { useRef, useState } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { SignaturePad, type SignaturePadHandle } from '@/signatures/signature-pad';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Radius, Spacing } from '@/constants/theme';
import { usePalette } from '@/store/use-theme-store';
import { signatureRepo } from '@/signatures/signature-repo';
import { useSignatureStore } from '@/store/use-signature-store';
import { safeBack } from '@/utils/navigation';

export default function SignaturePadScreen() {
  const palette = usePalette();
  const padRef = useRef<SignaturePadHandle>(null);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (saving) return;
    try {
      setSaving(true);
      const uri = await padRef.current?.capture();
      if (!uri) return;
      const sig = await signatureRepo.saveFromFile(uri);
      useSignatureStore.getState().add(sig);
      Alert.alert('Đã lưu chữ ký', 'Chữ ký đã được lưu vào thiết bị. Quay lại viewer và chọn công cụ Chữ ký để đặt lên trang.', [
        { text: 'OK', onPress: () => safeBack() },
      ]);
    } catch (e) {
      Alert.alert('Lỗi', e instanceof Error ? e.message : 'Không thể lưu chữ ký');
    } finally {
      setSaving(false);
    }
  };

  return (
    <ThemedView color="background" style={{ flex: 1 }}>
      <SafeAreaView style={{ flex: 1, padding: Spacing.three }}>
        <View style={styles.header}>
          <Pressable onPress={() => safeBack()} hitSlop={8} style={styles.iconBtn}>
            <Ionicons name="close" size={24} color={palette.text} />
          </Pressable>
          <ThemedText type="subheading">Vẽ chữ ký</ThemedText>
          <Pressable onPress={() => padRef.current?.clear()} hitSlop={8} style={styles.iconBtn}>
            <Ionicons name="refresh" size={22} color={palette.textSecondary} />
          </Pressable>
        </View>

        <ThemedText type="small" color="textSecondary" style={{ marginBottom: Spacing.three }}>
          Dùng ngón tay hoặc bút stylus để vẽ chữ ký của bạn.
        </ThemedText>

        <SignaturePad ref={padRef} />

        <Pressable
          onPress={() => void handleSave()}
          disabled={saving}
          style={({ pressed }) => [
            styles.saveBtn,
            { backgroundColor: palette.primary },
            pressed && { backgroundColor: palette.primaryPressed },
            saving && { opacity: 0.6 },
          ]}>
          <Ionicons name="checkmark" size={20} color={palette.onPrimary} />
          <ThemedText type="smallBold" color="onPrimary">
            Lưu chữ ký
          </ThemedText>
        </Pressable>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: Spacing.three },
  iconBtn: { padding: Spacing.two, borderRadius: Radius.md },
  saveBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.two, marginTop: Spacing.three, paddingVertical: Spacing.three, borderRadius: Radius.lg },
});
