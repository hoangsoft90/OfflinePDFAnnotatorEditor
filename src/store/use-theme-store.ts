/**
 * Theme store — resolves the active palette from the system scheme.
 */
import { useColorScheme } from 'react-native';
import { create } from 'zustand';

import { Colors, type ColorScheme } from '@/constants/theme';

interface ThemeState {
  /** 'system' | 'light' | 'dark' — user override; default 'system' */
  mode: ColorScheme | 'system';
  setMode: (mode: ColorScheme | 'system') => void;
}

export const useThemeStore = create<ThemeState>((set) => ({
  mode: 'system',
  setMode: (mode) => set({ mode }),
}));

/** Hook returning the resolved palette. */
export function usePalette(): (typeof Colors)[ColorScheme] {
  const raw = useColorScheme();
  const system: ColorScheme = raw === 'dark' ? 'dark' : 'light';
  const mode = useThemeStore((s) => s.mode);
  const resolved: ColorScheme = mode === 'system' ? system : mode;
  return Colors[resolved];
}
