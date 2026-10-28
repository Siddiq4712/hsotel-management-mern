import React from 'react';
import { StyleSheet } from 'react-native';
import { Picker as NativePicker } from '@react-native-picker/picker';
import { styled } from 'nativewind';
import { useTextSize } from '../../theme/TextSizeContext';
import { textMetrics, typography } from '../../theme/typography';

const ScaledPicker = React.forwardRef(({ children, style, itemStyle, ...props }, ref) => {
  const { preference } = useTextSize();
  const base = { fontSize: typography.body, ...StyleSheet.flatten(style) };
  const { fontSize } = textMetrics(base, preference);
  return <NativePicker ref={ref} {...props} style={[{ minHeight: 52 }, style, { fontSize }]}
    itemStyle={[itemStyle, { fontSize }]}>
    {React.Children.map(children, child => React.isValidElement(child)
      ? React.cloneElement(child, { style: [child.props.style,
        { fontSize: textMetrics({ ...base, ...StyleSheet.flatten(child.props.style) }, preference).fontSize }] })
      : child)}
  </NativePicker>;
});
ScaledPicker.displayName = 'ScaledPicker';
export const Picker = styled(ScaledPicker);
Picker.Item = NativePicker.Item;
