import React from 'react';
import { View, StyleSheet } from 'react-native';
import colors from '../../theme/colors';

const Card = React.forwardRef(({ style, className, ...props }, ref) => (
  <View ref={ref} {...props} className={className}
    style={[styles.base, !className && styles.padding, style]} />
));
Card.displayName = 'Card';
const styles = StyleSheet.create({
  base: { minWidth: 0, maxWidth: '100%', backgroundColor: colors.card, borderRadius: 16, borderWidth: 1, borderColor: colors.border },
  padding: { padding: 18 },
});
export default Card;
