import { StyleSheet, Text, type TextProps } from 'react-native';

import { Fonts, FontSize, type PaletteColorKey } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type ThemedTextProps = TextProps & {
  type?: 'default' | 'title' | 'heading' | 'subheading' | 'small' | 'smallBold' | 'caption' | 'link' | 'linkPrimary' | 'code' | 'label';
  color?: PaletteColorKey;
};

export function ThemedText({ style, type = 'default', color = 'text', ...rest }: ThemedTextProps) {
  const theme = useTheme();
  return (
    <Text
      style={[
        { color: theme[color] },
        type === 'default' && styles.default,
        type === 'title' && styles.title,
        type === 'heading' && styles.heading,
        type === 'subheading' && styles.subheading,
        type === 'small' && styles.small,
        type === 'smallBold' && styles.smallBold,
        type === 'caption' && styles.caption,
        type === 'label' && styles.label,
        type === 'link' && styles.link,
        type === 'linkPrimary' && styles.linkPrimary,
        type === 'code' && styles.code,
        style,
      ]}
      {...rest}
    />
  );
}

const styles = StyleSheet.create({
  default: { fontSize: FontSize.md, lineHeight: 22, fontWeight: '500' },
  title: { fontSize: FontSize.xxl, lineHeight: 38, fontWeight: '700' },
  heading: { fontSize: FontSize.xl, lineHeight: 30, fontWeight: '700' },
  subheading: { fontSize: FontSize.lg, lineHeight: 26, fontWeight: '600' },
  small: { fontSize: FontSize.sm, lineHeight: 20, fontWeight: '500' },
  smallBold: { fontSize: FontSize.sm, lineHeight: 20, fontWeight: '700' },
  caption: { fontSize: FontSize.xs, lineHeight: 16, fontWeight: '500' },
  label: { fontSize: FontSize.sm, lineHeight: 18, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.6 },
  link: { lineHeight: 20, fontSize: FontSize.sm, color: '#3c87f7' },
  linkPrimary: { lineHeight: 20, fontSize: FontSize.sm, color: '#3c87f7', fontWeight: '700' },
  code: { fontFamily: Fonts.mono, fontWeight: '700', fontSize: 12 },
});
