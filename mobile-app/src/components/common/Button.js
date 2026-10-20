import React from 'react';
import { ActivityIndicator, Text, TouchableOpacity, StyleSheet } from 'react-native';
import colors from '../../theme/colors';

// Existing handlers, disabled conditions and children pass through unchanged.
const Button = React.forwardRef(({ children, variant = 'primary', loading = false, disabled,
  className, style, accessibilityLabel, ...props }, ref) => {
  const inactive = disabled || loading;
  const foreground = variant === 'secondary' || variant === 'ghost' ? colors.primary : colors.card;
  return (
    <TouchableOpacity
      ref={ref}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled: Boolean(inactive), busy: loading }}
      activeOpacity={0.75}
      {...props}
      disabled={inactive}
      className={className}
      style={[styles.base, !className && styles[variant], inactive && styles.disabled, style]}
    >
      {loading && <ActivityIndicator color={foreground} style={{ marginRight: 8 }} />}
      {typeof children === 'string' || typeof children === 'number'
        ? <Text style={[styles.label, { color: foreground }]}>{children}</Text>
        : children}
    </TouchableOpacity>
  );
});
Button.displayName = 'Button';

const styles = StyleSheet.create({
  base: { minHeight: 48, minWidth: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', flexWrap: 'wrap' },
  primary: { backgroundColor: colors.primary, paddingHorizontal: 18, paddingVertical: 14 },
  secondary: { backgroundColor: colors.primarySoft, paddingHorizontal: 18, paddingVertical: 14, borderWidth: 1, borderColor: colors.primaryTint },
  ghost: { paddingHorizontal: 12, paddingVertical: 10 },
  danger: { backgroundColor: colors.danger, paddingHorizontal: 18, paddingVertical: 14 },
  disabled: { opacity: 0.55 },
  label: { fontSize: 16, fontWeight: '600', textAlign: 'center', flexShrink: 1 },
});
export default Button;
