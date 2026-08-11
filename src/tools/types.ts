/**
 * Tool engine contracts (annotation/tools spec). Tools translate canvas
 * gestures into annotation geometry in PDF points.
 */
import type { AnnotationType } from '@/models/annotation';

export type ToolId =
  | 'select'
  | 'highlight'
  | 'underline'
  | 'strikeout'
  | 'pen'
  | 'eraser'
  | 'text'
  | 'rectangle'
  | 'ellipse'
  | 'line'
  | 'arrow'
  | 'signature';

export const TOOL_TO_ANNOTATION_TYPE: Partial<Record<ToolId, AnnotationType>> = {
  highlight: 'highlight',
  underline: 'underline',
  strikeout: 'strikeout',
  pen: 'pen',
  text: 'text',
  rectangle: 'rectangle',
  ellipse: 'ellipse',
  line: 'line',
  arrow: 'arrow',
  signature: 'signature',
};

export const TOOL_ORDER: ToolId[] = [
  'select',
  'highlight',
  'underline',
  'strikeout',
  'pen',
  'eraser',
  'text',
  'rectangle',
  'ellipse',
  'line',
  'arrow',
  'signature',
];

export interface ToolStyle {
  color: string;
  opacity: number;
  strokeWidth: number;
}

/** A draft annotation created by a tool while a gesture is in progress. */
export interface DraftAnnotation {
  type: AnnotationType;
  geometry: import('@/models/annotation').AnnotationGeometry;
  color: string;
  opacity: number;
  strokeWidth: number;
  content?: string;
  assetPath?: string;
}

export type GesturePhase = 'begin' | 'move' | 'end' | 'cancel';

export interface GestureEvent {
  /** Canvas-local coordinates (top-left pixels) at current scale */
  x: number;
  y: number;
  phase: GesturePhase;
}
