import { usePermissions, mobileRouteScreens } from '../../auth/PermissionContext';
import { Text } from "./ReferenceDesign";
import React from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import Button from './Button';
import colors from '../../theme/colors';
import { useEmbeddedHeader } from './ReferenceDesign';

export const moreSections = [
  ['Bills', 'Bills', 'Generate bills and manage payments'],
  ['Complaints', 'Complaints', 'Review and resolve student complaints'],
  ['Students', 'Students', 'View and manage enrolled students'],
  ['Rooms', 'Rooms', 'Manage room allotments and occupants'],
  ['Holidays', 'Holidays', 'Manage hostel holidays'], ['Suspensions', 'Suspensions', 'Review student suspensions'],
  ['CreateRoom', 'Create room', 'Add rooms to your hostel'], ['EnrollStudent', 'Enroll student', 'Add a student to your hostel'],
  ['RoomRequests', 'Room requests', 'Review student room requests'], ['ViewLayout', 'Room layout', 'View the hostel layout'],
].sort(([, a], [, b]) => a.localeCompare(b));
const sections = [['MoreHome', 'All sections'], ...moreSections];

export default function MoreSectionNav() {
  const { can } = usePermissions();
  const navigation = useNavigation();
  const route = useRoute();
  const embedded = useEmbeddedHeader();
  if (embedded) return null;
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false}
      style={styles.bar} contentContainerStyle={styles.content}>
      {sections.filter(([name]) => name === 'MoreHome' || (mobileRouteScreens('warden', name) || []).some(id => can(id))).map(([name, label]) => (
        <Button key={name} variant="ghost" onPress={() => navigation.navigate(name)}
          accessibilityState={{ selected: route.name === name }}
          style={[styles.item, route.name === name && styles.active]}>
          <Text style={[styles.label, route.name === name && styles.activeLabel]}>{label}</Text>
        </Button>
      ))}
    </ScrollView>
  );
}
const styles = StyleSheet.create({
  bar: { flexGrow: 0, backgroundColor: colors.card, borderBottomWidth: 1, borderBottomColor: colors.border },
  content: { gap: 8, paddingHorizontal: 16, paddingVertical: 8 },
  item: { paddingHorizontal: 14, borderRadius: 18, borderWidth: 1, borderColor: 'transparent', overflow: 'hidden' },
  active: { backgroundColor: colors.primarySoft, borderColor: colors.primaryTint, borderRadius: 18 },
  label: { fontSize: 13, fontWeight: '600', color: colors.mutedText },
  activeLabel: { color: colors.primary },
});
