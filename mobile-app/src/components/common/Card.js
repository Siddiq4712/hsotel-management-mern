import React from 'react';
import { View, StyleSheet } from 'react-native';
import colors from '../../theme/colors';
import { useReferenceDesign } from './ReferenceDesign';

const Card = React.forwardRef(({ style, className, ...props }, ref) => {
  const { enabled } = useReferenceDesign();
  return <View ref={ref} {...props} className={className}
    style={[styles.base, !className && styles.padding, enabled && styles.reference, style]} />;
});
Card.displayName = 'Card';
const styles = StyleSheet.create({
  base: { minWidth: 0, maxWidth: '100%', backgroundColor: colors.card, borderRadius: 16, borderWidth: 1, borderColor: colors.border },
  padding: { padding: 18 },
  reference: { borderRadius: 16, shadowOpacity: 0, elevation: 0 },
});
export default Card;
