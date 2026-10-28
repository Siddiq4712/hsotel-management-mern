import React from 'react';
import { Platform, Pressable, TouchableOpacity } from 'react-native';
import { styled } from 'nativewind';
import colors from '../../theme/colors';

// Android uses native ripple feedback without an Animated opacity node per tap.
// Keep onPress semantics: dragging away or cancelling never activates an action.
const Touchable = React.forwardRef(({ activeOpacity = 0.75, android_ripple, ...props }, ref) => {
  if (Platform.OS === 'android') return <Pressable ref={ref} {...props}
    android_ripple={android_ripple === null ? undefined : { color: colors.primaryTint, borderless: false, ...android_ripple }} />;
  return <TouchableOpacity ref={ref} {...props} activeOpacity={activeOpacity} />;
});
Touchable.displayName = 'Touchable';
export default styled(Touchable);
