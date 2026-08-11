/**
 * Tool store — active tool and style (color/opacity/width) for annotation.
 */
import { create } from 'zustand';

import type { ToolId } from '@/tools/types';

export interface ToolSettings {
  activeTool: ToolId;
  color: string;
  opacity: number;
  strokeWidth: number;
  setTool: (tool: ToolId) => void;
  setColor: (c: string) => void;
  setOpacity: (o: number) => void;
  setStrokeWidth: (w: number) => void;
  /** Text annotation content staged for the next text-placement. */
  pendingText: string;
  setPendingText: (t: string) => void;
}

export const useToolStore = create<ToolSettings>((set) => ({
  activeTool: 'select',
  color: '#FFD54F',
  opacity: 0.35,
  strokeWidth: 1.5,
  setTool: (activeTool) => set({ activeTool }),
  setColor: (color) => set({ color }),
  setOpacity: (opacity) => set({ opacity }),
  setStrokeWidth: (strokeWidth) => set({ strokeWidth }),
  pendingText: '',
  setPendingText: (pendingText) => set({ pendingText }),
}));
