import React from 'react';
import { View, StyleSheet } from 'react-native';
import HighlightCard, { highlightStyles } from './HighlightCard';
import { Text } from './ReferenceDesign';
import colors from '../../theme/colors';

export function MetricCard({ title, value, detail, icon: Icon, style }) {
  return <HighlightCard style={[styles.metric, style]}>
    <View style={styles.metricTop}>
      <View style={[styles.icon, { backgroundColor: colors.highlightBadge }]}><Icon size={20} color={colors.highlightText} /></View>
      <Text style={[styles.metricTitle, { color: colors.highlightText }]}>{title}</Text>
    </View>
    <Text adjustsFontSizeToFit minimumFontScale={0.7} numberOfLines={1} style={[styles.value, { color: colors.highlightText }]}>{value}</Text>
    {!!detail && <Text style={highlightStyles.detail}>{detail}</Text>}
  </HighlightCard>;
}

// These are recorded statuses, not an inference about any unrecorded dates.
export function AttendanceBreakdown({ records }) {
  return <View style={styles.breakdown}>
    {[['P', 'Present', 'success'], ['A', 'Absent', 'danger'], ['OD', 'On duty', 'accent']].map(([key, label, tone]) =>
      <View key={key} style={[styles.status, { backgroundColor: colors[`${tone}Soft`] }]}>
        <Text style={[styles.count, { color: colors[tone] }]}>{records ? records[key] ?? 0 : '—'}</Text>
        <Text style={styles.statusLabel}>{label}</Text>
      </View>)}
  </View>;
}

const styles = StyleSheet.create({
  metric: { flexGrow: 1, flexBasis: '46%', minWidth: 130, padding: 16, gap: 10 },
  metricTop: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 9 },
  icon: { width: 38, height: 38, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  metricTitle: { flex: 1, minWidth: 70, fontSize: 13, fontWeight: '600', color: colors.mutedText },
  value: { fontSize: 30, lineHeight: 40, fontWeight: '800' },
  breakdown: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  status: { flexGrow: 1, flexBasis: '29%', minWidth: 75, padding: 12, borderRadius: 12, gap: 4 },
  count: { fontSize: 22, fontWeight: '700' },
  statusLabel: { fontSize: 12, color: colors.mutedText },
});
