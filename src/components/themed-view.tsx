import { View, type ViewProps } from 'react-native';

import type { PaletteColorKey } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type ThemedViewProps = ViewProps & {
  /** Background token; defaults to 'background' */
  color?: PaletteColorKey;
};

export function ThemedView({ style, color = 'background', ...otherProps }: ThemedViewProps) {
  const theme = useTheme();
  return <View style={[{ backgroundColor: theme[color] }, style]} {...otherProps} />;
}
