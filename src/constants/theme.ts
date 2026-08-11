/**
 * Design tokens — single source of truth for colors, spacing, radii,
 * typography and elevation across the app (app/shell spec).
 */
import { Platform } from 'react-native';

export type ColorScheme = 'light' | 'dark';

export interface Palette {
  /** Primary brand color */
  primary: string;
  /** Primary, pressed state */
  primaryPressed: string;
  /** Text on primary */
  onPrimary: string;
  text: string;
  textSecondary: string;
  background: string;
  backgroundElement: string;
  backgroundSelected: string;
  backgroundElevated: string;
  /** Dimmed surroundings behind the PDF page (viewer) */
  viewerBackground: string;
  border: string;
  danger: string;
  success: string;
  warning: string;
  /** Annotation swatch presets */
  swatches: string[];
}

export type PaletteColorKey = Exclude<keyof Palette, 'swatches'>;

export const Colors: Record<ColorScheme, Palette> = {
  light: {
    primary: '#2F6FED',
    primaryPressed: '#1F5AD0',
    onPrimary: '#FFFFFF',
    text: '#101828',
    textSecondary: '#5A6472',
    background: '#F5F7FA',
    backgroundElement: '#EDF0F5',
    backgroundSelected: '#DFE5EE',
    backgroundElevated: '#FFFFFF',
    viewerBackground: '#14181F',
    border: '#D8DEE8',
    danger: '#D92D20',
    success: '#12B76A',
    warning: '#F79009',
    swatches: ['#FFD54F', '#FF8A65', '#64B5F6', '#81C784', '#BA68C8', '#E57373'],
  },
  dark: {
    primary: '#5B8DEF',
    primaryPressed: '#6E9BF2',
    onPrimary: '#0B1220',
    text: '#F2F4F7',
    textSecondary: '#A8B0BC',
    background: '#0B1220',
    backgroundElement: '#16203A',
    backgroundSelected: '#1E2A45',
    backgroundElevated: '#101A30',
    viewerBackground: '#05070C',
    border: '#25314D',
    danger: '#F97066',
    success: '#32D583',
    warning: '#FDB022',
    swatches: ['#FFD54F', '#FF8A65', '#64B5F6', '#81C784', '#BA68C8', '#E57373'],
  },
};

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const Radius = {
  sm: 6,
  md: 10,
  lg: 16,
  xl: 24,
} as const;

export const FontSize = {
  xs: 11,
  sm: 13,
  md: 15,
  lg: 18,
  xl: 24,
  xxl: 32,
} as const;

export const Elevation = {
  none: { elevation: 0, shadowOpacity: 0 },
  card: { elevation: 2, shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 8, shadowOffset: { width: 0, height: 2 } },
  overlay: { elevation: 6, shadowColor: '#000', shadowOpacity: 0.16, shadowRadius: 16, shadowOffset: { width: 0, height: 4 } },
} as const;

export const Fonts = Platform.select({
  ios: { sans: 'System', mono: 'Menlo' },
  default: { sans: 'sans-serif', mono: 'monospace' },
}) ?? { sans: 'System', mono: 'monospace' };

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;
