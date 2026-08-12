/**
 * GuidanceBadge — small "MỚI" pill that marks a new/updated feature
 * (in-app-guidance change, components spec). Pure presentational: the parent
 * decides visibility via `useGuidance().showBadge` and positions it.
 */
import { StyleSheet, Text, View, type ViewStyle } from 'react-native';

import { usePalette } from '@/store/use-theme-store';

export type BadgeLabel = 'MỚI' | 'BETA' | 'CẬP NHẬT';

interface Props {
  label?: BadgeLabel;
  /** Absolute position override; default top-right of the parent. */
  style?: ViewStyle | ViewStyle[];
  /** Accessible description (defaults to the label). */
  accessibilityLabel?: string;
}

export function GuidanceBadge({ label = 'MỚI', style, accessibilityLabel }: Props) {
  const palette = usePalette();
  return (
    <View
      pointerEvents="none"
      accessibilityLabel={accessibilityLabel ?? `Tính năng ${label}`}
      style={[styles.badge, { backgroundColor: palette.danger, shadowColor: palette.background }, style]}>
      <Text style={styles.text}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    position: 'absolute',
    top: -6,
    right: -8,
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 8,
    shadowOpacity: 0.25,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
    elevation: 3,
  },
  text: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
});
