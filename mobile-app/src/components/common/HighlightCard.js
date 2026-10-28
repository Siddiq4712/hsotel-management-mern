import React from 'react';
import { StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import colors from '../../theme/colors';
import { typography } from '../../theme/typography';

export default function HighlightCard({ style, children, gradientColors, ...props }) {
  return <LinearGradient {...props} colors={gradientColors || [colors.highlightStart, colors.highlightEnd]}
    start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[highlightStyles.card, style]}>
    {children}
  </LinearGradient>;
}

export const highlightStyles = StyleSheet.create({
  card: {
    minWidth: 0, borderRadius: 22, padding: 20, gap: 10,
    boxShadow: `0px 10px 24px ${colors.highlightShadow}`,
  },
  title: { color: colors.highlightText, fontSize: 12, fontWeight: '700', letterSpacing: 0.7 },
  value: { color: colors.highlightText, fontSize: typography.amount, fontWeight: '800' },
  detail: { color: colors.highlightDescription, fontSize: 13, lineHeight: 20 },
  badge: { backgroundColor: colors.highlightBadge, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20 },
  badgeText: { color: colors.highlightText, fontSize: 12, fontWeight: '600' },
  button: { backgroundColor: colors.highlightButton, borderColor: colors.highlightButton },
  buttonText: { color: colors.highlightStart, fontWeight: '700' },
});
