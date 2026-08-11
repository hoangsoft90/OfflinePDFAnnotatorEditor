import { forwardRef, useImperativeHandle, useRef, useState } from 'react';
import { StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Svg, { Path } from 'react-native-svg';

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

/**
 * Web signature pad — same API as the native pad (`signature-pad.tsx`), but
 * capture serializes the drawn strokes to an SVG, renders it to a canvas, and
 * returns a PNG data: URL (no react-native-view-shot on web).
 */
export const SignaturePad = forwardRef<SignaturePadHandle, { onChange?: (isEmpty: boolean) => void }>(
  function SignaturePad({ onChange }, ref) {
    const [strokes, setStrokes] = useState<Stroke[]>([]);
    const currentPath = useRef('');
    const currentPoints = useRef<{ x: number; y: number }[]>([]);
    const [size, setSize] = useState<{ width: number; height: number }>({ width: 0, height: 0 });

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
      if (strokes.length === 0) throw new Error('Chưa có nét vẽ nào');
      const w = Math.max(1, Math.round(size.width));
      const h = Math.max(1, Math.round(size.height));
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">` +
        `<rect width="100%" height="100%" fill="#FFFFFF"/>` +
        strokes
          .map(
            (s) =>
              `<path d="${s.path}" stroke="${s.color}" stroke-width="${s.width}" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`
          )
          .join('') +
        `</svg>`;
      const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }));
      try {
        const img = new Image();
        await new Promise<void>((resolve, reject) => {
          img.onload = () => resolve();
          img.onerror = () => reject(new Error('Không thể dựng ảnh chữ ký'));
          img.src = url;
        });
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error('Canvas 2D context unavailable');
        ctx.drawImage(img, 0, 0, w, h);
        return canvas.toDataURL('image/png');
      } finally {
        URL.revokeObjectURL(url);
      }
    };

    useImperativeHandle(ref, () => ({ capture, clear }));

    const onLayout = (e: LayoutChangeEvent) => {
      const { width: w, height: h } = e.nativeEvent.layout;
      setSize({ width: w, height: h });
    };

    return (
      <GestureDetector gesture={gesture}>
        <View style={styles.pad} onLayout={onLayout}>
          <Svg style={StyleSheet.absoluteFill} pointerEvents="none">
            {strokes.map((s) => (
              <Path
                key={s.id}
                d={s.path}
                stroke={s.color}
                strokeWidth={s.width}
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
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
