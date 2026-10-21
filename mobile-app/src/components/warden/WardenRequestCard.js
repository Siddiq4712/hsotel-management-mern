import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { CalendarDays } from 'lucide-react-native';
import Card from '../common/Card';
import Button from '../common/Button';
import { displayDate } from '../common/RequestDetails';
import { Text } from '../common/ReferenceDesign';
import { StudentIdentity } from './WardenUI';
import colors from '../../theme/colors';

export default function WardenRequestCard({ kind = 'Request', studentMeta, previewReason = false, queueActions, ...details }) {
  const navigation = useNavigation();
  const { title, reference, status, statusLabel, submittedBy, fromDate, toDate, includeTime, reason, duration, children } = details;
  const tone = /reject|urgent|late_return|expired/.test(status) ? 'danger' : /approv|completed|resolved|closed/.test(status) ? 'success' : /cancel/.test(status) ? 'mutedText' : 'warning';
  const fill = tone === 'mutedText' ? colors.surface : colors[tone + 'Soft'];
  const requestKind = { 'Leave request': 'leave', 'Gate pass': 'passes', Reduction: 'reductions', Complaint: 'complaints' }[kind];
  return <Card style={styles.card}>
    <View style={styles.top}><Text style={styles.reference}>{kind.toUpperCase()}{reference ? ' · #' + reference : ''}</Text>
      <Text style={[styles.badge, { color: colors[tone], backgroundColor: fill }]}>{statusLabel || String(status || 'Unknown').replaceAll('_', ' ')}</Text>
    </View>
    <Text style={styles.title}>{title}</Text>
    <StudentIdentity name={submittedBy} meta={studentMeta} />
    {(fromDate || toDate) && <View style={styles.period}><CalendarDays size={19} color={colors.primary} />
      <View style={{ flex: 1, minWidth: 0, gap: 4 }}><Text style={styles.periodLabel}>REQUESTED PERIOD</Text><Text style={styles.periodValue}>{displayDate(fromDate, includeTime)} → {displayDate(toDate, includeTime)}</Text></View>
      {!!duration && <Text style={styles.duration}>{duration}</Text>}
    </View>}
    {previewReason && !!reason && <Text style={styles.reason} numberOfLines={2}>{reason}</Text>}
    <View style={styles.actions}>
      <Button variant="secondary" onPress={() => navigation.navigate('WardenRequestDetails', { kind: requestKind, requestId: reference })} style={styles.action}>View details</Button>
      {(queueActions === undefined ? children : queueActions) && <View style={styles.action}>{queueActions === undefined ? children : queueActions}</View>}
    </View>
  </Card>;
}
const styles = StyleSheet.create({
  card: { padding: 16, borderRadius: 17, marginBottom: 12, gap: 14 },
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 },
  reference: { fontSize: 12, fontWeight: '600', color: colors.mutedText },
  badge: { fontSize: 12, fontWeight: '700', textTransform: 'capitalize', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10, overflow: 'hidden' },
  title: { fontSize: 18, lineHeight: 25, fontWeight: '700', color: colors.primaryDark },
  period: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 9, backgroundColor: colors.surface, borderRadius: 11, padding: 12 },
  periodLabel: { fontSize: 12, fontWeight: '600', color: colors.mutedText },
  periodValue: { fontSize: 13, fontWeight: '600', lineHeight: 20, color: colors.text },
  duration: { fontSize: 12, color: colors.primary, fontWeight: '600', maxWidth: '100%' },
  reason: { fontSize: 13, lineHeight: 20, color: colors.mutedText },
  actions: { borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 12, flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  action: { flexGrow: 1, flexBasis: '44%', minWidth: 110, gap: 8 },
});
