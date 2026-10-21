// Shared by React Native styles and NativeWind's Tailwind configuration.
const colors = {
  primary: '#4338CA',
  primaryDark: '#2E296F',
  highlightStart: '#4C43DA',
  highlightEnd: '#39359D',
  chargesGradient: ['#4C43DA', '#39359D'],
  highlightText: '#FFFFFF',
  highlightDescription: '#DFE3FF',
  highlightButton: '#FFFFFF',
  highlightBadge: '#FFFFFF20',
  highlightShadow: '#4C43DA26',
  buttonBackground: '#4F46E5',
  buttonText: '#FFFFFF',
  buttonShadow: '#4F46E526',
  buttonFocus: '#C7D2FE',
  background: '#F8FAFC',
  card: '#FFFFFF',
  text: '#0F172A',
  mutedText: '#475569',
  success: '#15803D',
  warning: '#A16207',
  danger: '#B91C1C',
  accent: '#0F766E',
  // Supporting surfaces keep status labels readable without relying on color alone.
  border: '#E2E8F0',
  borderStrong: '#CBD5E1',
  surface: '#F1F5F9',
  primarySoft: '#EEF2FF',
  primaryTint: '#E0E7FF',
  successSoft: '#F0FDF4',
  successTint: '#DCFCE7',
  warningSoft: '#FFFBEB',
  warningTint: '#FEF3C7',
  dangerSoft: '#FEF2F2',
  dangerTint: '#FEE2E2',
  accentSoft: '#F0FDFA',
  accentTint: '#CCFBF1',
};

// Charts need an alpha channel; derive it from the same palette as other styles.
const withOpacity = (hex, opacity = 1) => {
  const value = parseInt(hex.slice(1), 16);
  return `rgba(${(value >> 16) & 255}, ${(value >> 8) & 255}, ${value & 255}, ${opacity})`;
};

module.exports = { ...colors, withOpacity };
