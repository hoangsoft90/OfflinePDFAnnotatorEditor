/**
 * ContextualHelper — explains why a feature is locked/unavailable and how to
 * unlock it (in-app-guidance change, components spec). Wraps a control (which
 * may be disabled); tapping it opens a "Làm gì / Vì sao chưa dùng được / Cách
 * mở khóa" popover with an optional action button. Never a full-screen modal.
 */
import { Ionicons } from '@expo/vector-icons';
import { useState, type ReactElement } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import type { HelperContentDef } from '@/guidance/registry';
import { usePalette } from '@/store/use-theme-store';

interface Props {
  content: HelperContentDef;
  placement?: 'top' | 'bottom';
  align?: 'left' | 'right';
  /** Tracking hook (tracking spec): fired when the popover opens. */
  onOpen?: () => void;
  /** Fired when the action button is pressed (tracking + deep-link). */
  onAction?: () => void;
  children: ReactElement;
}

export function ContextualHelper({ content, placement = 'top', align = 'left', onOpen, onAction, children }: Props) {
  const palette = usePalette();
  const [open, setOpen] = useState(false);

  const close = () => setOpen(false);

  const handleAction = () => {
    onAction?.();
    close();
  };

  return (
    <View collapsable={false}>
      <View collapsable={false}>
        <Pressable
          onPress={() => {
            setOpen(true);
            onOpen?.();
          }}
          accessibilityLabel={content.title ?? 'Tại sao tính năng chưa dùng được'}>
          {children}
        </Pressable>
      </View>

      {open ? (
        <>
          <Pressable style={StyleSheet.absoluteFill} onPress={close} accessibilityLabel="Đóng giải thích" />
          <View
            pointerEvents="box-none"
            style={[styles.popoverWrap, placement === 'top' ? { bottom: 8 } : { top: 8 }, align === 'right' ? { right: 0 } : { left: 0 }]}>
            <View style={[styles.popover, { backgroundColor: palette.backgroundElevated, borderColor: palette.border }]}>
              <View style={styles.header}>
                {content.title ? (
                  <ThemedText type="smallBold" style={{ flexShrink: 1 }}>
                    {content.title}
                  </ThemedText>
                ) : null}
                <Pressable onPress={close} hitSlop={8} accessibilityLabel="Đóng giải thích">
                  <Ionicons name="close" size={16} color={palette.textSecondary} />
                </Pressable>
              </View>
              <ThemedText type="small" color="textSecondary">
                {content.why}
              </ThemedText>
              {content.how ? (
                <ThemedText type="small" color="textSecondary" style={{ marginTop: Spacing.one }}>
                  {content.how}
                </ThemedText>
              ) : null}
              {content.actionLabel ? (
                <Pressable
                  onPress={handleAction}
                  style={[styles.actionBtn, { backgroundColor: palette.primary }]}
                  accessibilityLabel={content.actionLabel}>
                  <ThemedText type="smallBold" color="onPrimary">
                    {content.actionLabel}
                  </ThemedText>
                </Pressable>
              ) : null}
            </View>
            <View
              style={[
                styles.arrow,
                placement === 'top'
                  ? { bottom: -6, borderTopColor: palette.backgroundElevated }
                  : { top: -6, borderBottomColor: palette.backgroundElevated },
                align === 'right' ? { right: 20 } : { left: 20 },
              ]}
            />
          </View>
        </>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  popoverWrap: { position: 'absolute', minWidth: 220, maxWidth: 280 },
  popover: {
    padding: Spacing.three,
    borderRadius: Radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    shadowOpacity: 0.2,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
    gap: Spacing.one,
  },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.two },
  actionBtn: {
    alignSelf: 'flex-start',
    marginTop: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: Radius.md,
  },
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
