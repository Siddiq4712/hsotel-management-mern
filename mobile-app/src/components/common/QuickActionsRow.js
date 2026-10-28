import { Text } from "./ReferenceDesign";
import React, { useMemo } from 'react';
import { ScrollView, View, StyleSheet } from 'react-native';
import TouchableOpacity from './Touchable';
import { ChevronRight } from 'lucide-react-native';
import colors from '../../theme/colors';

function QuickActionsRow({ actions, title = 'Quick actions', style }) {
  const ordered = useMemo(() => [...actions].sort((a, b) => a.label.localeCompare(b.label)), [actions]);
  return <View style={[styles.container, style]}>
    <View style={styles.heading}>
      <Text style={styles.title}>{title}</Text>
      <View style={styles.hint}><Text style={styles.hintText}>Swipe</Text><ChevronRight size={15} color={colors.mutedText} /></View>
    </View>
    <ScrollView horizontal showsHorizontalScrollIndicator={false} nestedScrollEnabled directionalLockEnabled
      keyboardShouldPersistTaps="handled" contentContainerStyle={styles.row}>
      {ordered.map(({ label, icon: Icon, onPress, disabled, color = colors.primary, backgroundColor = colors.primarySoft }) => (
        <TouchableOpacity key={label} onPress={onPress} disabled={disabled} activeOpacity={0.75}
          accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ disabled: Boolean(disabled) }}
          style={[styles.action, disabled && styles.disabled]}>
          <View style={[styles.icon, { backgroundColor }]}><Icon size={22} color={color} /></View>
          <Text style={styles.label}>{label}</Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  </View>;
}
export default React.memo(QuickActionsRow);
const styles = StyleSheet.create({
  container: { gap: 12 }, heading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  title: { fontSize: 16, fontWeight: '700', color: colors.text }, hint: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  hintText: { fontSize: 12, color: colors.mutedText }, row: { gap: 12, paddingBottom: 4 },
  action: { width: 104, minHeight: 100, padding: 12, gap: 8, alignItems: 'center', justifyContent: 'center',
    backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: 16, overflow: 'hidden' },
  icon: { width: 42, height: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  label: { fontSize: 12, fontWeight: '600', color: colors.text, textAlign: 'center' }, disabled: { opacity: 0.45 },
});
