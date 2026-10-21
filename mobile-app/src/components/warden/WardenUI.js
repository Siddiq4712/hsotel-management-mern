import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Info, Search } from 'lucide-react-native';
import { Text } from '../common/ReferenceDesign';
import Button from '../common/Button';
import Input from '../common/Input';
import colors from '../../theme/colors';

export function InfoNote({ children, icon: Icon = Info }) {
  return <View style={styles.note}><Icon size={19} color={colors.primary} /><Text style={styles.noteText}>{children}</Text></View>;
}

export function StudentIdentity({ name, meta, style }) {
  const initials = String(name || '').trim().split(/\s+/).filter(Boolean).slice(0, 2).map(part => part[0]).join('').toUpperCase();
  return <View style={[styles.person, style]}>
    <View style={styles.avatar}><Text style={styles.initials}>{initials || '?'}</Text></View>
    <View style={{ flex: 1, minWidth: 0, gap: 3 }}><Text style={styles.name}>{name || 'Student'}</Text>{!!meta && <Text style={styles.meta}>{meta}</Text>}</View>
  </View>;
}

export function SearchField({ style, ...props }) {
  return <View style={[styles.search, style]}><Search size={18} color={colors.mutedText} /><Input {...props} style={styles.searchInput} /></View>;
}

export function AttendanceSort({ value, onChange }) {
  return <View style={styles.sort}>
    <Text style={styles.sortLabel}>Sort by</Text>
    {[['name', 'Name'], ['room_asc', 'Room ↑'], ['room_desc', 'Room ↓']].map(([key, label]) => <Button key={key} variant="ghost"
      onPress={() => onChange(key)} accessibilityState={{ selected: value === key }}
      accessibilityLabel={key === 'name' ? 'Sort by student name' : `Sort by room number ${key === 'room_asc' ? 'ascending' : 'descending'}`}
      style={[styles.sortButton, key === value && styles.sortSelected]}>
      <Text style={[styles.sortText, key === value && { color: colors.primary }]}>{label}</Text>
    </Button>)}
  </View>;
}

const styles = StyleSheet.create({
  note: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, padding: 13, backgroundColor: colors.primarySoft, borderRadius: 13, borderWidth: 1, borderColor: colors.primaryTint },
  noteText: { flex: 1, color: colors.primaryDark, fontSize: 12, lineHeight: 18 },
  person: { flexDirection: 'row', alignItems: 'center', gap: 9, minWidth: 0 },
  avatar: { width: 34, height: 34, borderRadius: 10, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
  initials: { fontSize: 12, fontWeight: '700', color: colors.primary },
  name: { fontSize: 14, fontWeight: '700', color: colors.text, lineHeight: 20 },
  meta: { fontSize: 12, lineHeight: 18, color: colors.mutedText },
  search: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: 12, paddingHorizontal: 12, minHeight: 50 },
  searchInput: { flex: 1, fontSize: 14 },
  sort: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 6 },
  sortLabel: { flexGrow: 1, fontSize: 12, color: colors.mutedText, marginRight: 4 },
  sortButton: { minHeight: 48, paddingHorizontal: 10, paddingVertical: 8, borderWidth: 1, borderColor: colors.border, borderRadius: 9, backgroundColor: colors.card },
  sortSelected: { backgroundColor: colors.primarySoft, borderColor: colors.primaryTint },
  sortText: { fontSize: 12, fontWeight: '700', color: colors.mutedText },
});
