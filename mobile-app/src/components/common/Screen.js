import React from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import colors from '../../theme/colors';
import { useEmbeddedHeader } from './ReferenceDesign';

// Keep the existing screen content and handlers; only manage its viewport.
export default function Screen({ children, style, ...props }) {
  const embedded = useEmbeddedHeader();
  if (embedded) return <View {...props} style={[styles.body, style]}>{children}</View>;
  return (
    <SafeAreaView edges={['left', 'right']} style={styles.safe}>
      <KeyboardAvoidingView {...props} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={[styles.body, style]}>
        {children}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  body: { flex: 1, backgroundColor: colors.background },
});
