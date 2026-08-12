/**
 * GuidanceTooltip — short bubble that explains a control (in-app-guidance
 * change, components spec).
 *
 * Two modes:
 * - Anchor mode (children provided): bubble renders above/below the wrapped
 *   control; while visible, a transparent overlay covers the anchor so a tap
 *   dismisses instead of firing the action.
 * - Floating mode (no children): the bubble itself is the component's root and
 *   `bubbleStyle` positions it (e.g. `{ position:'absolute', bottom, right }`
 *   relative to the caller's container). Safe for anchors inside ScrollViews,
 *   which would clip a bubble extending past their bounds on Android.
 *
 * Always dismisses via ✕ or an 8s auto-timeout.
 */
import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState, type ReactElement } from 'react';
import { Pressable, StyleSheet, View, type ViewStyle } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { usePalette } from '@/store/use-theme-store';

const AUTO_DISMISS_MS = 8000;

interface Props {
  visible: boolean;
  text: string;
  placement?: 'top' | 'bottom';
  align?: 'left' | 'right';
  onDismiss: () => void;
  children?: ReactElement;
  /** Floating mode: positions the bubble relative to the caller's container. */
  bubbleStyle?: ViewStyle;
}

export function GuidanceTooltip({ visible, text, placement = 'top', align = 'left', onDismiss, children, bubbleStyle }: Props) {
  const palette = usePalette();
  const [anchorH, setAnchorH] = useState(0);
  const floating = children == null;

  useEffect(() => {
    if (!visible) return;
    const t = setTimeout(onDismiss, AUTO_DISMISS_MS);
    return () => clearTimeout(t);
  }, [visible, onDismiss]);

  if (floating && visible) {
    return (
      <View
        pointerEvents="box-none"
        style={[styles.bubbleWrap, styles.floatingWrap, bubbleStyle]}>
        <View style={[styles.bubble, { backgroundColor: palette.backgroundElevated, borderColor: palette.border }]}>
          <ThemedText type="small" style={{ flexShrink: 1 }}>
            {text}
          </ThemedText>
          <Pressable onPress={onDismiss} hitSlop={8} style={styles.closeBtn} accessibilityLabel="Đóng gợi ý">
            <Ionicons name="close" size={14} color={palette.textSecondary} />
          </Pressable>
        </View>
        <View
          style={[
            styles.arrow,
            placement === 'top'
              ? { bottom: -6, borderTopColor: palette.backgroundElevated }
              : { top: -6, borderBottomColor: palette.backgroundElevated },
            align === 'right' ? { right: 16 } : { left: 16 },
          ]}
        />
      </View>
    );
  }

  return (
    <View collapsable={false}>
      {children ? (
        <View
          collapsable={false}
          onLayout={(e) => setAnchorH(e.nativeEvent.layout.height)}>
          {children}
        </View>
      ) : null}

      {visible ? (
        <>
          <Pressable style={StyleSheet.absoluteFill} onPress={onDismiss} accessibilityLabel="Đóng gợi ý" />
          <View
            pointerEvents="box-none"
            style={[
              styles.bubbleWrap,
              placement === 'top' ? { bottom: anchorH + 8 } : { top: anchorH + 8 },
              align === 'right' ? { right: 0 } : { left: 0 },
            ]}>
            <View style={[styles.bubble, { backgroundColor: palette.backgroundElevated, borderColor: palette.border }]}>
              <ThemedText type="small" style={{ flexShrink: 1 }}>
                {text}
              </ThemedText>
              <Pressable onPress={onDismiss} hitSlop={8} style={styles.closeBtn} accessibilityLabel="Đóng gợi ý">
                <Ionicons name="close" size={14} color={palette.textSecondary} />
              </Pressable>
            </View>
            <View
              style={[
                styles.arrow,
                placement === 'top'
                  ? { bottom: -6, borderTopColor: palette.backgroundElevated }
                  : { top: -6, borderBottomColor: palette.backgroundElevated },
                align === 'right' ? { right: 16 } : { left: 16 },
              ]}
            />
          </View>
        </>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  bubbleWrap: {
    position: 'absolute',
    minWidth: 180,
    maxWidth: 240,
  },
  floatingWrap: {
    zIndex: 20,
    elevation: 8,
  },
  bubble: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingVertical: Spacing.two,
    paddingLeft: Spacing.three,
    paddingRight: Spacing.one,
    borderRadius: Radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    shadowOpacity: 0.15,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  closeBtn: { padding: Spacing.one },
  arrow: {
    position: 'absolute',
    width: 0,
    height: 0,
    borderLeftWidth: 6,
    borderRightWidth: 6,
    borderTopWidth: 6,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
  },
});
