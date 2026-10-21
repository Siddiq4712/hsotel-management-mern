import React from 'react';
import { Modal, View, ScrollView, KeyboardAvoidingView, Platform, StyleSheet, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { X } from 'lucide-react-native';
import Card from './Card';
import Button from './Button';
import { Text, ui } from './ReferenceDesign';
import colors from '../../theme/colors';

export default function ReviewSheet({ visible, title, description, busy, onClose, children }) {
  const close = () => { if (!busy) onClose(); };
  return <Modal visible={visible} animationType="slide" transparent onRequestClose={close}>
    <SafeAreaView edges={['top', 'bottom', 'left', 'right']} style={styles.overlay}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.keyboard}>
        <Card style={styles.sheet}>
          <View style={styles.heading}>
            <Text accessibilityRole="header" style={styles.title}>{title}</Text>
            {busy && <ActivityIndicator color={colors.primary} accessibilityLabel="Saving review" />}
            <Button variant="ghost" accessibilityLabel="Close review" disabled={busy} onPress={close}><X size={21} color={colors.mutedText} /></Button>
          </View>
          <ScrollView keyboardShouldPersistTaps="handled" style={styles.scroll} contentContainerStyle={styles.content}>
            {!!description && <Text style={ui.description}>{description}</Text>}
            {children}
          </ScrollView>
        </Card>
      </KeyboardAvoidingView>
    </SafeAreaView>
  </Modal>;
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(15,23,42,0.45)' },
  keyboard: { flex: 1, justifyContent: 'flex-end', padding: 16 },
  sheet: { maxHeight: '92%', flexShrink: 1, padding: 0, overflow: 'hidden' },
  heading: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, paddingLeft: 20, borderBottomWidth: 1, borderBottomColor: colors.border },
  title: { flex: 1, fontSize: 20, fontWeight: '700', color: colors.primaryDark },
  scroll: { flexGrow: 0 },
  content: { padding: 20, gap: 16 },
});
