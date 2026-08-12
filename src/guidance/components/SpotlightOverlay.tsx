/**
 * SpotlightOverlay — coach-mark overlay that highlights a target with a
 * cutout (in-app-guidance change, components spec). Full-screen; blocks
 * interaction outside the target/card; tap on the cutout completes the flow;
 * "Bỏ qua" always visible; respects reduce-motion.
 */
import { useEffect, useMemo, useState } from 'react';
import { AccessibilityInfo, Animated, Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { usePalette } from '@/store/use-theme-store';

/** Window-coordinate rect (from `measureInWindow`). */
export interface SpotlightTarget {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface SpotlightStep {
  title: string;
  description: string;
  /** Rect to highlight; when null, the card is centered without a cutout. */
  target?: SpotlightTarget | null;
}

interface Props {
  steps: SpotlightStep[];
  index: number;
  onNext: () => void;
  onSkip: () => void;
  /** Tap inside the highlighted cutout → user is now using the feature. */
  onTargetTap: () => void;
}

const GAP = 16;
const EDGE_MARGIN = Spacing.four; // 24

export function SpotlightOverlay({ steps, index, onNext, onSkip, onTargetTap }: Props) {
  const palette = usePalette();
  const { width: winW, height: winH } = useWindowDimensions();
  const step = steps[index];
  const target = step?.target ?? null;
  const isLast = index >= steps.length - 1;

  const [cardH, setCardH] = useState(0);
  const [reduceMotion, setReduceMotion] = useState(false);
  const fade = useMemo(() => new Animated.Value(0), []);

  useEffect(() => {
    let mounted = true;
    AccessibilityInfo.isReduceMotionEnabled().then((v) => {
      if (mounted) setReduceMotion(v);
    });
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (reduceMotion) {
      fade.setValue(1);
      return;
    }
    fade.setValue(0);
    Animated.timing(fade, { toValue: 1, duration: 200, useNativeDriver: true }).start();
  }, [reduceMotion, fade, index]);

  if (!step) return null;

  const cardW = winW - EDGE_MARGIN * 2;
  const cardEstH = cardH || 160;
  const placeBelow = target
    ? target.y + target.height + GAP + cardEstH < winH - EDGE_MARGIN
    : false;
  const cardTop = target
    ? placeBelow
      ? target.y + target.height + GAP
      : Math.max(EDGE_MARGIN, target.y - GAP - cardEstH)
    : Math.round((winH - cardEstH) / 2);
  const cardLeft = Math.round((winW - cardW) / 2);

  const dims = target
    ? [
        { top: 0, left: 0, width: winW, height: Math.max(target.y, 0) },
        { top: target.y + target.height, left: 0, width: winW, height: Math.max(winH - target.y - target.height, 0) },
        { top: target.y, left: 0, width: Math.max(target.x, 0), height: target.height },
        { top: target.y, left: target.x + target.width, width: Math.max(winW - target.x - target.width, 0), height: target.height },
      ]
    : [{ top: 0, left: 0, width: winW, height: winH }];

  return (
    <Animated.View style={[StyleSheet.absoluteFill, { opacity: fade }]} accessibilityViewIsModal>
      {/* Block all touches outside the target/card (tap outside does nothing). */}
      <Pressable style={StyleSheet.absoluteFill} onPress={() => {}} />

      {/* Dimmed regions carving the cutout. */}
      {dims.map((d, i) => (
        <View key={i} pointerEvents="none" style={[styles.dim, d]} />
      ))}

      {target ? (
        <>
          <View
            pointerEvents="none"
            style={[
              styles.highlight,
              {
                top: target.y - 3,
                left: target.x - 3,
                width: target.width + 6,
                height: target.height + 6,
                borderColor: palette.primary,
              },
            ]}
          />
          <Pressable
            style={{ position: 'absolute', top: target.y, left: target.x, width: target.width, height: target.height }}
            onPress={onTargetTap}
            accessibilityLabel={isLast ? 'Hoàn tất hướng dẫn' : 'Đã hiểu, tiếp tục'}
          />
        </>
      ) : null}

      {/* Step card */}
      <View
        style={[
          styles.card,
          { backgroundColor: palette.backgroundElevated, width: cardW, left: cardLeft, top: cardTop },
        ]}
        onLayout={(e) => setCardH(e.nativeEvent.layout.height)}>
        <View style={styles.dots}>
          {steps.map((_, i) => (
            <View key={i} style={[styles.dot, { backgroundColor: i === index ? palette.primary : palette.border }]} />
          ))}
        </View>
        <ThemedText type="subheading">{step.title}</ThemedText>
        <ThemedText type="small" color="textSecondary" style={{ marginTop: Spacing.one }}>
          {step.description}
        </ThemedText>
        <View style={styles.footer}>
          <Pressable onPress={onSkip} hitSlop={8} accessibilityLabel="Bỏ qua hướng dẫn">
            <ThemedText type="small" color="textSecondary">
              Bỏ qua
            </ThemedText>
          </Pressable>
          <Pressable
            onPress={onNext}
            style={[styles.nextBtn, { backgroundColor: palette.primary }]}
            accessibilityLabel={isLast ? 'Xong' : 'Tiếp'}>
            <ThemedText type="smallBold" color="onPrimary">
              {isLast ? 'Xong' : 'Tiếp'}
            </ThemedText>
          </Pressable>
        </View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  dim: { position: 'absolute', backgroundColor: 'rgba(0,0,0,0.72)' },
  highlight: {
    position: 'absolute',
    borderRadius: Radius.lg,
    borderWidth: 2,
    shadowOpacity: 0.4,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 0 },
  },
  card: {
    position: 'absolute',
    borderRadius: Radius.xl,
    padding: Spacing.three,
    elevation: 8,
    shadowOpacity: 0.25,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 6 },
  },
  dots: { flexDirection: 'row', gap: Spacing.one, justifyContent: 'flex-end', marginBottom: Spacing.two },
  dot: { width: 6, height: 6, borderRadius: 3 },
  footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: Spacing.three },
  nextBtn: { paddingHorizontal: Spacing.three, paddingVertical: Spacing.two, borderRadius: Radius.md },
});
