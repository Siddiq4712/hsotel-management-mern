import React from 'react';
import { TextInput, StyleSheet } from 'react-native';
import colors from '../../theme/colors';
import { useReferenceDesign } from './ReferenceDesign';

// A native TextInput with the same controlled-value, event and ref contract.
const Input = React.forwardRef(({ style, multiline, ...props }, ref) => {
  const { enabled, fontsReady } = useReferenceDesign();
  return (
  <TextInput
    ref={ref}
    placeholderTextColor={colors.mutedText}
    selectionColor={colors.primary}
    underlineColorAndroid="transparent"
    {...props}
    multiline={multiline}
    style={[styles.base, enabled && fontsReady && { fontFamily: 'DMRegular' }, multiline && styles.multiline, style]}
  />
); });
Input.displayName = 'Input';
const styles = StyleSheet.create({
  base: { minWidth: 0, maxWidth: '100%', minHeight: 48, borderRadius: 12, color: colors.text, fontSize: 16, paddingVertical: 12 },
  multiline: { minHeight: 112, textAlignVertical: 'top' },
});
export default Input;
