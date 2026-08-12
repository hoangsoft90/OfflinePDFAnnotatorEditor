import { useCallback, useMemo, useRef, useState } from 'react';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { runOnJS, useAnimatedStyle, useSharedValue } from 'react-native-reanimated';
import { useShallow } from 'zustand/react/shallow';

import { AnnotationOverlay } from '@/components/pdf/AnnotationOverlay';
import { AddAnnotationCommand, DeleteAnnotationCommand, MoveAnnotationCommand } from '@/commands/annotation-commands';
import { useCommandStack } from '@/commands/stack';
import { useAnnotationStore } from '@/store/use-annotation-store';
import { useToolStore } from '@/store/use-tool-store';
import { useSignatureStore } from '@/store/use-signature-store';
import { ToolSession } from '@/tools/registry';
import { TOOL_TO_ANNOTATION_TYPE } from '@/tools/types';
import { createAnnotation, type Annotation } from '@/models/annotation';
import { screenToPdfPoint } from '@/engine/coordinates';
import type { PageId } from '@/models/page';
import { copySignatureIntoWorkspace } from '@/signatures/signature-assets';

interface Props {
  docId: string;
  pageId: PageId;
  /** page height in PDF points */
  pageHeightPts: number;
  /** current zoom scale (screen px per PDF point) */
  scale: number;
  /** canvas-local width/height in px */
  width: number;
  height: number;
  /** text lines (PDF-point rects) for snap tools */
  textLines?: import('@/models/annotation').PdfRect[];
  /** resolve signature asset path -> image uri */
  resolveAsset?: (assetPath: string) => string | null;
  /** inner content transform is managed by PdfCanvas; this layer sits inside */
  style?: object;
}

/**
 * Handles raw drawing gestures for the active annotation tool and renders the
 * annotation overlay. Placed INSIDE the PdfCanvas transformed container so
 * coordinate mapping is consistent at any zoom (ADR-003).
 */
export function AnnotationCanvas({
  docId,
  pageId,
  pageHeightPts,
  scale,
  width,
  height,
  textLines,
  resolveAsset,
}: Props) {
  const activeTool = useToolStore((s) => s.activeTool);
  const color = useToolStore((s) => s.color);
  const opacity = useToolStore((s) => s.opacity);
  const strokeWidth = useToolStore((s) => s.strokeWidth);
  const styleCfg = useMemo(() => ({ color, opacity, strokeWidth }), [color, opacity, strokeWidth]);
  const pendingText = useToolStore((s) => s.pendingText);
  const setPendingText = useToolStore((s) => s.setPendingText);
  const selectedSig = useSignatureStore((s) => s.selectedForPlacement);
  const selectSig = useSignatureStore((s) => s.selectForPlacement);
  const annotations = useAnnotationStore(
    useShallow((s) => Object.values(s.byDoc[docId] ?? {}).filter((a) => a.pageId === pageId))
  );
  const execute = useCommandStack((s) => s.execute);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Annotation | null>(null);
  const [draftPreview, setDraftPreview] = useState<Annotation | null>(null);
  const draftSeq = useRef(0);

  const session = useMemo(
    () =>
      new ToolSession({
        tool: activeTool,
        style: styleCfg,
        pageHeightPts,
        scale,
        textLines,
      }),
    [activeTool, styleCfg, pageHeightPts, scale, textLines]
  );

  const commit = useCallback(
    (d: import('@/tools/types').DraftAnnotation) => {
      const type = selectedSig ? 'signature' : TOOL_TO_ANNOTATION_TYPE[activeTool];
      if (!type) return;
      const annotation = createAnnotation({
        pageId,
        type,
        geometry: d.geometry,
        color: d.color,
        opacity: d.opacity,
        strokeWidth: d.strokeWidth,
        content: d.content ?? (type === 'text' ? pendingText || 'Ghi chú' : undefined),
        assetPath: selectedSig ? `signatures/${selectedSig.imagePath}` : d.assetPath,
      });
      execute(new AddAnnotationCommand(docId, annotation));
      if (type === 'text') setPendingText('');
      if (selectedSig) {
        // copy the global signature asset into this doc's workspace so the
        // document is self-contained (survives global deletion + export).
        void copySignatureIntoWorkspace(docId, selectedSig.imagePath);
        selectSig(null);
        setSelectedId(annotation.id);
      } else if (activeTool === 'select') {
        setSelectedId(annotation.id);
      }
    },
    [activeTool, docId, execute, pageId, pendingText, selectedSig, selectSig, setPendingText]
  );

  // -- gesture handling for draw tools --
  const tx = useSharedValue(0);
  const ty = useSharedValue(0);
  const inGesture = useRef(false);

  const handleDraw = useCallback(
    (phase: 'begin' | 'move' | 'end' | 'cancel', gx: number, gy: number) => {
      const tool = activeTool;
      if (tool === 'select' || tool === 'eraser') return;
      if (phase === 'begin') {
        inGesture.current = true;
        setDraft(null);
      }
      const d = session.handle({ x: gx, y: gy, phase });
      if (phase === 'move' && d) {
        // Show a live draft (recreated each move with a fresh id key).
        const seq = ++draftSeq.current;
        setDraft({ ...createAnnotation({ pageId, type: d.type, geometry: d.geometry, color: d.color, opacity: d.opacity, strokeWidth: d.strokeWidth, content: d.content, assetPath: d.assetPath }), id: `draft-${seq}` });
      }
    if (phase === 'end' && d) {
      inGesture.current = false;
      setDraft(null);
      commit(d);
      if (selectedSig) return;
    }
      if (phase === 'cancel') {
        inGesture.current = false;
        setDraft(null);
      }
    },
    [activeTool, commit, pageId, session, selectedSig]
  );

  const tapOrDraw = Gesture.Pan()
    .enabled(activeTool !== 'select' && activeTool !== 'eraser')
    .minDistance(0)
    .averageTouches(true)
    // eslint-disable-next-line react-hooks/refs -- reanimated runOnJS pattern
    .onBegin((e) => {
      runOnJS(handleDraw)('begin', e.x, e.y);
    })
    // eslint-disable-next-line react-hooks/refs -- reanimated runOnJS pattern
    .onUpdate((e) => {
      runOnJS(handleDraw)('move', e.x, e.y);
    })
    // eslint-disable-next-line react-hooks/refs -- reanimated runOnJS pattern
    .onEnd((e) => {
      runOnJS(handleDraw)('end', e.x, e.y);
    })
    // eslint-disable-next-line react-hooks/refs -- reanimated runOnJS pattern
    .onFinalize(() => {
      runOnJS(handleDraw)('cancel', 0, 0);
    });

  // -- selection / move for select tool --
  // The drag is accumulated locally and committed ONCE on end, so a single
  // drag produces exactly one command (and one journal entry), not dozens.
  const dragOrigin = useRef<{ x: number; y: number } | null>(null);
  const draggedId = useRef<string | null>(null);

  const selectGesture = Gesture.Pan()
    .enabled(activeTool === 'select' || activeTool === 'eraser')
    .minDistance(2)
    // eslint-disable-next-line react-hooks/refs -- gesture callbacks run on events, not render
    .onStart((e) => {
      const pt = screenToPdfPoint({ x: e.x, y: e.y }, pageHeightPts, scale);
      const hit = findHit(annotations, pt, scale);
      if (activeTool === 'eraser') {
        if (hit) execute(new DeleteAnnotationCommand(docId, hit));
        return;
      }
      if (hit) {
        setSelectedId(hit.id);
        draggedId.current = hit.id;
        dragOrigin.current = { x: e.x, y: e.y };
      }
    })
    // eslint-disable-next-line react-hooks/refs -- gesture callbacks run on events, not render
    .onUpdate((e) => {
      // Preview the move by updating the selected annotation's draft position
      // locally (no command yet).
      const sel = draggedId.current ? annotations.find((a) => a.id === draggedId.current) : undefined;
      if (activeTool === 'select' && sel && dragOrigin.current) {
        const pt = screenToPdfPoint({ x: e.x, y: e.y }, pageHeightPts, scale);
        const startPt = screenToPdfPoint(
          { x: dragOrigin.current.x, y: dragOrigin.current.y },
          pageHeightPts,
          scale
        );
        const dx = pt.x - startPt.x;
        const dy = pt.y - startPt.y;
        if (dx !== 0 || dy !== 0) {
          const moved: Annotation = {
            ...sel,
            geometry: {
              ...sel.geometry,
              boundingBox: {
                ...sel.geometry.boundingBox,
                x: sel.geometry.boundingBox.x + dx,
                y: sel.geometry.boundingBox.y + dy,
              },
            },
          };
          setDraftPreview(moved);
        }
      }
    })
    // eslint-disable-next-line react-hooks/refs -- gesture callbacks run on events, not render
    .onEnd(() => {
      // Commit the accumulated move as a single command.
      const sel = draggedId.current ? annotations.find((a) => a.id === draggedId.current) : undefined;
      const prev = draggedId.current ? annotations.find((a) => a.id === draggedId.current) : undefined;
      if (activeTool === 'select' && sel && prev && draftPreview) {
        if (hasMoved(prev, draftPreview)) {
          execute(new MoveAnnotationCommand(docId, draftPreview));
          setSelectedId(draftPreview.id);
        }
      }
      setDraftPreview(null);
      dragOrigin.current = null;
      draggedId.current = null;
    })
    // eslint-disable-next-line react-hooks/refs -- gesture callbacks run on events, not render
    .onFinalize(() => {
      dragOrigin.current = null;
      draggedId.current = null;
    });

  const gesture = Gesture.Exclusive(tapOrDraw, selectGesture);

  const gestureStyle = useAnimatedStyle(() => ({ transform: [{ translateX: tx.value }, { translateY: ty.value }] }));

  const visible = [...annotations, ...(draft ? [draft] : []), ...(draftPreview ? [draftPreview] : [])];

  return (
    <GestureDetector gesture={gesture}>
      <Animated.View
        style={[
          {
            position: 'absolute',
            top: 0,
            left: 0,
            width,
            height,
          },
          gestureStyle,
        ]}>
        <AnnotationOverlay
          annotations={visible}
          pageHeightPts={pageHeightPts}
          scale={scale}
          resolveAsset={resolveAsset}
          selectedId={selectedId}
          onSelect={setSelectedId}
        />
      </Animated.View>
    </GestureDetector>
  );
}

function hasMoved(a: Annotation, b: Annotation): boolean {
  return (
    a.geometry.boundingBox.x !== b.geometry.boundingBox.x ||
    a.geometry.boundingBox.y !== b.geometry.boundingBox.y
  );
}

function findHit(annotations: Annotation[], pt: { x: number; y: number }, scale: number): Annotation | null {
  // topmost first
  for (let i = annotations.length - 1; i >= 0; i--) {
    const a = annotations[i];
    const b = a.geometry.boundingBox;
    const pad = 6 / scale;
    if (pt.x >= b.x - pad && pt.x <= b.x + b.width + pad && pt.y >= b.y - pad && pt.y <= b.y + b.height + pad) {
      return a;
    }
  }
  return null;
}
