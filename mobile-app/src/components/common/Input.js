import React from 'react';
import { TextInput, StyleSheet } from 'react-native';
import colors from '../../theme/colors';
import { useReferenceDesign } from './ReferenceDesign';
import { useTextSize } from '../../theme/TextSizeContext';
import { textMetrics, typography } from '../../theme/typography';

// A native TextInput with the same controlled-value, event and ref contract.
const Input = React.forwardRef(({ style, multiline, ...props }, ref) => {
  const { enabled, fontsReady } = useReferenceDesign();
  const { preference } = useTextSize();
  const metrics = textMetrics(StyleSheet.flatten([styles.base, style]), preference);
  return (
  <TextInput
    ref={ref}
    placeholderTextColor={colors.mutedText}
    selectionColor={colors.primary}
    underlineColorAndroid="transparent"
    {...props}
    multiline={multiline}
    style={[styles.base, enabled && fontsReady && { fontFamily: 'DMRegular' }, multiline && styles.multiline, style, metrics]}
  />
); });
Input.displayName = 'Input';
const styles = StyleSheet.create({
  base: { minWidth: 0, maxWidth: '100%', minHeight: 48, borderRadius: 12, color: colors.text, fontSize: typography.body, paddingVertical: 12 },
  multiline: { minHeight: 112, textAlignVertical: 'top' },
});
export default Input;
