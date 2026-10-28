// Text preferences never scale spacing, icons, borders or touch targets.
export const TEXT_SIZE_KEY = '@hostel/text-size';
export const TEXT_SIZES = Object.freeze([
  { id: 'small', label: 'Small', scale: 0.9 },
  { id: 'default', label: 'Default', scale: 1 },
  { id: 'large', label: 'Large', scale: 1.1 },
  { id: 'extra-large', label: 'Extra Large', scale: 1.2 },
]);
export const DEFAULT_TEXT_SIZE = 'default';
export const MAX_TEXT_SCALE = 1.2;
export const typography = Object.freeze({
  pageTitle: 24, heroTitle: 22, amount: 29, section: 15, header: 14,
  item: 14, button: 14, body: 14, supporting: 12, metadata: 11, navigation: 11,
});

export function textSizeOption(id) {
  return TEXT_SIZES.find(option => option.id === id) || TEXT_SIZES[1];
}

export function textMetrics(style = {}, preference = DEFAULT_TEXT_SIZE, { allowSmallText = false } = {}) {
  const baseSize = typeof style.fontSize === 'number' ? style.fontSize : typography.body;
  const minimum = allowSmallText ? 10 : 12;
  const fontSize = Math.round(Math.max(minimum, baseSize * textSizeOption(preference).scale) * 10) / 10;
  // Reserve the largest preset's line box for every preset. Single-line rows,
  // buttons and navigation therefore retain the same height as text changes.
  const largestSize = Math.max(minimum, baseSize * MAX_TEXT_SCALE);
  const lineHeight = Math.ceil(Math.max(style.lineHeight || 0, largestSize * 1.2));
  return { fontSize, lineHeight };
}
