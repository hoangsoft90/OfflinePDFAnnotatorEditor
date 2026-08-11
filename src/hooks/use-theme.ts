import { usePalette } from '@/store/use-theme-store';

/** Returns the resolved palette for the current color scheme. */
export function useTheme() {
  return usePalette();
}
