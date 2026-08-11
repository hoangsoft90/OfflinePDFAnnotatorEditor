import { forwardRef, useImperativeHandle, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Svg, { Path } from 'react-native-svg';
import { captureRef } from 'react-native-view-shot';

export interface SignaturePadHandle {
  capture: () => Promise<string>;
  clear: () => void;
}

interface Stroke {
  id: number;
  path: string;
  color: string;
  width: number;
}

let strokeSeq = 0;

export const SignaturePad = forwardRef<SignaturePadHandle, { onChange?: (isEmpty: boolean) => void }>(
  function SignaturePad({ onChange }, ref) {
  const containerRef = useRef<View>(null);

  useImperativeHandle(ref, () => ({ capture, clear }));
  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const currentPath = useRef('');
  const currentPoints = useRef<{ x: number; y: number }[]>([]);

  const width = 2.5;

  const gesture = Gesture.Pan()
    .minDistance(0)
    .onStart((e) => {
      currentPoints.current = [{ x: e.x, y: e.y }];
      currentPath.current = `M${e.x},${e.y}`;
    })
    .onUpdate((e) => {
      const pts = currentPoints.current;
      const last = pts[pts.length - 1];
      pts.push({ x: e.x, y: e.y });
      // quadratic smoothing
      const midX = (last.x + e.x) / 2;
      const midY = (last.y + e.y) / 2;
      currentPath.current += ` Q${last.x},${last.y} ${midX},${midY}`;
      setStrokes((prev) => {
        const live = { id: -1, path: currentPath.current, color: '#1B1B1F', width };
        return [...prev.filter((s) => s.id !== -1), live];
      });
    })
    .onEnd(() => {
      if (currentPath.current) {
        setStrokes((prev) => [
          ...prev.filter((s) => s.id !== -1),
          { id: ++strokeSeq, path: currentPath.current, color: '#1B1B1F', width },
        ]);
      }
      currentPath.current = '';
      currentPoints.current = [];
      onChange?.(false);
    });

  const clear = () => {
    setStrokes([]);
    onChange?.(true);
  };

  const capture = async (): Promise<string> => {
    // Capture the drawing area as PNG (white background, ink only).
    const uri = await captureRef(containerRef, {
      format: 'png',
      quality: 1,
      result: 'tmpfile',
    });
    return uri;
  };

  return (
    <GestureDetector gesture={gesture}>
      <View ref={containerRef} style={styles.pad} collapsable={false}>
        <Svg style={StyleSheet.absoluteFill} pointerEvents="none">
          {strokes.map((s) => (
            <Path key={s.id} d={s.path} stroke={s.color} strokeWidth={s.width} fill="none" strokeLinecap="round" strokeLinejoin="round" />
          ))}
        </Svg>
      </View>
    </GestureDetector>
  );
  }
);

const styles = StyleSheet.create({
  pad: {
    flex: 1,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#FFFFFF',
  },
});

export type { Stroke };
