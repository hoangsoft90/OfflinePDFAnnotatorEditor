import React, { forwardRef, useImperativeHandle } from 'react';
import { Image, StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { usePalette } from '@/store/use-theme-store';

export interface PdfCanvasHandle {
  /** Animated zoom scale (read via JS through getScale()) */
  getScale: () => number;
  /** Snap to 1x centered */
  reset: () => void;
}

interface Props {
  /** Current page bitmap uri */
  uri: string | null;
  /** Aspect ratio width/height of the rendered page */
  aspectRatio: number;
  /** Rendered page width in px (fit-width base) */
  width: number;
  /** Height derived from width/aspectRatio */
  height: number;
  onScaleChange?: (scale: number) => void;
  /** Content layer rendered inside the transformed container (annotation overlay) */
  children?: React.ReactNode;
  /** Whether gestures are enabled (tool may need raw gestures) */
  gesturesEnabled?: boolean;
}

/**
 * Owned gesture canvas (pdf-viewer design D4). Pinch/pan/double-tap are
 * animated here; the page bitmap AND the annotation overlay live inside the
 * same transformed container, so annotations stay pixel-aligned at any zoom.
 */
export const PdfCanvas = forwardRef<PdfCanvasHandle, Props>(function PdfCanvas(
  { uri, aspectRatio, width, height, onScaleChange, children, gesturesEnabled = true },
  ref
) {
  const palette = usePalette();
  const scale = useSharedValue(1);
  const savedScale = useSharedValue(1);
  const tx = useSharedValue(0);
  const ty = useSharedValue(0);
  const savedTx = useSharedValue(0);
  const savedTy = useSharedValue(0);

  useImperativeHandle(ref, () => ({
    getScale: () => scale.value,
    reset: () => {
      scale.value = withTiming(1);
      tx.value = withTiming(0);
      ty.value = withTiming(0);
      savedScale.value = 1;
      savedTx.value = 0;
      savedTy.value = 0;
    },
  }));

  const reportScale = (s: number) => {
    onScaleChange?.(s);
  };

  const pinch = Gesture.Pinch()
    .enabled(gesturesEnabled)
    .onStart(() => {
      savedScale.value = scale.value;
    })
    .onUpdate((e) => {
      const next = Math.min(4, Math.max(1, savedScale.value * e.scale));
      scale.value = next;
    })
    .onEnd(() => {
      runOnJS(reportScale)(scale.value);
    });

  const pan = Gesture.Pan()
    .enabled(gesturesEnabled)
    .minPointers(1)
    .maxPointers(2)
    .onStart(() => {
      savedTx.value = tx.value;
      savedTy.value = ty.value;
    })
    .onUpdate((e) => {
      tx.value = savedTx.value + e.translationX;
      ty.value = savedTy.value + e.translationY;
    });

  const doubleTap = Gesture.Tap()
    .enabled(gesturesEnabled)
    .numberOfTaps(2)
    .onEnd(() => {
      if (scale.value > 1.05) {
        scale.value = withTiming(1);
        tx.value = withTiming(0);
        ty.value = withTiming(0);
      } else {
        scale.value = withTiming(2);
      }
      runOnJS(reportScale)(scale.value);
    });

  const composed = Gesture.Simultaneous(pinch, pan, doubleTap);

  const containerStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: tx.value }, { translateY: ty.value }, { scale: scale.value }],
  }));

  return (
    <View style={styles.viewport} pointerEvents="box-none">
      <GestureDetector gesture={composed}>
        <Animated.View style={[styles.stage, { width, height }, containerStyle]}>
          {uri ? (
            <Image
              source={{ uri }}
              style={{ width, height }}
              resizeMode="contain"
              fadeDuration={0}
            />
          ) : (
            <View style={[styles.placeholder, { backgroundColor: palette.viewerBackground }]} />
          )}
          {children}
        </Animated.View>
      </GestureDetector>
    </View>
  );
});

const styles = StyleSheet.create({
  viewport: {
    flex: 1,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stage: {
    position: 'relative',
    backgroundColor: '#FFFFFF',
  },
  placeholder: {
    flex: 1,
  },
});
