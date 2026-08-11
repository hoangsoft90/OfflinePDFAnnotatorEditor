import React, { memo } from 'react';
import Svg, {
  Ellipse,
  G,
  Image as SvgImage,
  Line,
  Path,
  Polygon,
  Rect,
  Text as SvgText,
} from 'react-native-svg';

import type { Annotation } from '@/models/annotation';
import { pdfRectToScreen } from '@/engine/coordinates';

interface Props {
  annotations: Annotation[];
  /** page height in PDF points */
  pageHeightPts: number;
  /** screen scale (px per PDF point) */
  scale: number;
  /** optional local image uri resolution for signature assets */
  resolveAsset?: (assetPath: string) => string | null;
  /** selection highlight */
  selectedId?: string | null;
  onSelect?: (id: string) => void;
}

/**
 * Renders annotations for the current page in the same coordinate space as
 * the page bitmap (inside the transformed canvas), so they align at any zoom.
 * All geometry is converted from PDF points via pdfRectToScreen.
 */
export const AnnotationOverlay = memo(function AnnotationOverlay({
  annotations,
  pageHeightPts,
  scale,
  resolveAsset,
  selectedId,
  onSelect,
}: Props) {
  if (annotations.length === 0) return null;

  return (
    <Svg
      width="100%"
      height="100%"
      style={{ position: 'absolute', top: 0, left: 0 }}
      pointerEvents={onSelect ? 'box-none' : 'none'}>
      {annotations.map((a) => {
        const rect = pdfRectToScreen(a.geometry.boundingBox, pageHeightPts, scale);
        const common = {
          fillOpacity: a.opacity,
          stroke: a.color,
          strokeOpacity: a.opacity,
          strokeWidth: Math.max(1, a.strokeWidth * scale),
          onPress: onSelect ? () => onSelect(a.id) : undefined,
        };
        const sel = a.id === selectedId;

        switch (a.type) {
          case 'highlight':
            return (
              <G key={a.id} onPress={common.onPress}>
                <Rect x={rect.x} y={rect.y} width={rect.width} height={rect.height} fill={a.color} fillOpacity={0.45} strokeWidth={0} />
                {sel && <Rect x={rect.x} y={rect.y} width={rect.width} height={rect.height} fill="none" stroke="#2F6FED" strokeWidth={1.5} strokeDasharray="6 4" />}
              </G>
            );
          case 'underline':
            return (
              <G key={a.id} onPress={common.onPress}>
                <Rect x={rect.x} y={rect.y + rect.height - Math.max(2, 1.2 * scale)} width={rect.width} height={Math.max(2, 1.2 * scale)} fill={a.color} fillOpacity={0.8} strokeWidth={0} />
                {sel && <Rect x={rect.x} y={rect.y} width={rect.width} height={rect.height} fill="none" stroke="#2F6FED" strokeWidth={1.5} strokeDasharray="6 4" />}
              </G>
            );
          case 'strikeout':
            return (
              <G key={a.id} onPress={common.onPress}>
                <Rect x={rect.x} y={rect.y + rect.height / 2 - Math.max(1, 0.6 * scale)} width={rect.width} height={Math.max(2, 1.2 * scale)} fill={a.color} fillOpacity={0.8} strokeWidth={0} />
                {sel && <Rect x={rect.x} y={rect.y} width={rect.width} height={rect.height} fill="none" stroke="#2F6FED" strokeWidth={1.5} strokeDasharray="6 4" />}
              </G>
            );
          case 'pen':
            return (
              <Path
                key={a.id}
                d={pathFromPoints(a, scale, pageHeightPts)}
                fill="none"
                stroke={a.color}
                strokeOpacity={a.opacity}
                strokeWidth={Math.max(1, a.strokeWidth * scale)}
                strokeLinecap="round"
                strokeLinejoin="round"
                onPress={common.onPress}
              />
            );
          case 'rectangle':
            return <Rect key={a.id} x={rect.x} y={rect.y} width={rect.width} height={rect.height} fill="none" {...common} />;
          case 'ellipse':
            return <Ellipse key={a.id} cx={rect.x + rect.width / 2} cy={rect.y + rect.height / 2} rx={rect.width / 2} ry={rect.height / 2} fill="none" {...common} />;
          case 'line':
          case 'arrow': {
            const s = a.geometry.line?.start;
            const e = a.geometry.line?.end;
            if (!s || !e) return null;
            const yFlip = (pt: { x: number; y: number }) => ({
              x: pt.x * scale,
              y: (pageHeightPts - pt.y) * scale,
            });
            const p1 = yFlip(s);
            const p2 = yFlip(e);
            const head = a.type === 'arrow' ? arrowHead(p1, p2, 8) : null;
            return (
              <G key={a.id} onPress={common.onPress}>
                <Line x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y} stroke={a.color} strokeOpacity={a.opacity} strokeWidth={Math.max(1, a.strokeWidth * scale)} />
                {head && <Polygon points={head.map((p) => `${p.x},${p.y}`).join(' ')} fill={a.color} fillOpacity={a.opacity} />}
              </G>
            );
          }
          case 'text':
            return (
              <SvgText
                key={a.id}
                x={rect.x}
                y={rect.y + 14 * scale}
                fontSize={14 * scale}
                fill={a.color}
                fillOpacity={a.opacity}
                onPress={common.onPress}>
                {a.content ?? ''}
              </SvgText>
            );
          case 'signature': {
            const uri = a.assetPath ? resolveAsset?.(a.assetPath) : null;
            if (!uri) return null;
            return (
              <G key={a.id} onPress={common.onPress}>
                <SvgImage
                  href={{ uri }}
                  x={rect.x}
                  y={rect.y}
                  width={rect.width}
                  height={rect.height}
                  preserveAspectRatio="xMidYMid meet"
                />
              </G>
            );
          }
          default:
            return null;
        }
      })}
    </Svg>
  );
});

function pathFromPoints(a: Annotation, scale: number, pageHeightPts: number): string {
  const pts = a.geometry.pathPoints ?? [];
  if (pts.length === 0) return '';
  return pts
    .map((p, i) => {
      const x = p.x * scale;
      const y = (pageHeightPts - p.y) * scale;
      return `${i === 0 ? 'M' : 'L'}${x.toFixed(2)},${y.toFixed(2)}`;
    })
    .join(' ');
}

function arrowHead(from: { x: number; y: number }, to: { x: number; y: number }, size: number) {
  const angle = Math.atan2(to.y - from.y, to.x - from.x);
  const a1 = angle + Math.PI - 0.42;
  const a2 = angle + Math.PI + 0.42;
  return [
    { x: to.x + size * Math.cos(a1), y: to.y + size * Math.sin(a1) },
    to,
    { x: to.x + size * Math.cos(a2), y: to.y + size * Math.sin(a2) },
  ];
}
