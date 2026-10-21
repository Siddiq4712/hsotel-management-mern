import { Text } from "./ReferenceDesign";
import React from 'react';
import { ActivityIndicator, TouchableOpacity, StyleSheet } from 'react-native';
import colors from '../../theme/colors';
import { useReferenceDesign } from './ReferenceDesign';

// Existing handlers, disabled conditions and children pass through unchanged.
const Button = React.forwardRef(({ children, variant = 'primary', loading = false, disabled,
  className, style, accessibilityLabel, onFocus, onBlur, ...props }, ref) => {
  const inactive = disabled || loading;
  const [focused, setFocused] = React.useState(false);
  const { enabled } = useReferenceDesign();
  const primaryButton = (!className && variant === 'primary') || /(?:^|\s)bg-(?:blue|indigo|purple|violet)-(?:400|500|600|700|800|900)(?=\s|$)/.test(className || '');
  const foreground = primaryButton ? colors.buttonText : variant === 'secondary' || variant === 'ghost' ? colors.primary : colors.card;
  return (
    <TouchableOpacity
      ref={ref}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled: Boolean(inactive), busy: loading }}
      activeOpacity={0.75}
      {...props}
      onFocus={event => { setFocused(true); onFocus?.(event); }}
      onBlur={event => { setFocused(false); onBlur?.(event); }}
      disabled={inactive}
      className={className}
      style={[styles.base, !className && styles[variant], enabled && styles.reference,
        primaryButton && styles.primaryPalette, inactive && styles.disabled, style,
        primaryButton && focused && styles.focus]}
    >
      {loading && <ActivityIndicator color={foreground} style={{ marginRight: 8 }} />}
      {React.Children.map(children, child =>
        typeof child === 'string' || typeof child === 'number'
          ? <Text style={[styles.label, { color: foreground }]}>{child}</Text>
          : child)}
    </TouchableOpacity>
  );
});
Button.displayName = 'Button';

const styles = StyleSheet.create({
  base: { minHeight: 48, minWidth: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', flexWrap: 'wrap' },
  reference: { minHeight: 48, borderRadius: 12, columnGap: 8 },
  primary: { backgroundColor: colors.buttonBackground, paddingHorizontal: 18, paddingVertical: 14 },
  primaryPalette: { backgroundColor: colors.buttonBackground, boxShadow: `0px 4px 12px ${colors.buttonShadow}` },
  focus: { outlineColor: colors.buttonFocus, outlineWidth: 3, outlineOffset: 3, outlineStyle: 'solid' },
  secondary: { backgroundColor: colors.primarySoft, paddingHorizontal: 18, paddingVertical: 14, borderWidth: 1, borderColor: colors.primaryTint },
  ghost: { paddingHorizontal: 12, paddingVertical: 10 },
  danger: { backgroundColor: colors.danger, paddingHorizontal: 18, paddingVertical: 14 },
  disabled: { opacity: 0.55 },
  label: { fontSize: 16, fontWeight: '600', textAlign: 'center', flexShrink: 1 },
});
export default Button;
