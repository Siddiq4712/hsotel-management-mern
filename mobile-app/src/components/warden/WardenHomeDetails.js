import React, { useCallback, useRef, useState } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import moment from 'moment';
import { wardenAPI, outpassAPI, reductionAPI } from '../../api/api';
import { trendDates, buildAttendanceTrend, pendingApprovalRows } from '../../utils/wardenDashboard';
import WardenRequestCard from './WardenRequestCard';
import { Text, SectionTitle, ui } from '../common/ReferenceDesign';
import { personName } from '../common/RequestDetails';
import Card from '../common/Card';
import Button from '../common/Button';
import colors from '../../theme/colors';

export default function WardenHomeDetails({ navigation, refreshToken = 0 }) {
  const serial = useRef(0);
  const [pending, setPending] = useState([]), [trend, setTrend] = useState([]);
  const [loading, setLoading] = useState(true), [pendingError, setPendingError] = useState(false), [trendError, setTrendError] = useState(false);
  const today = moment().format('YYYY-MM-DD');
  const load = useCallback(async () => {
    const request = ++serial.current;
    setLoading(true); setPendingError(false); setTrendError(false);
    const dates = trendDates(today);
    const months = [...new Set(dates.map(date => date.slice(0, 7)))];
    const results = await Promise.allSettled([
      wardenAPI.getLeaveRequests({ status: 'pending' }),
      outpassAPI.getWardenOutpasses({ status: 'pending' }),
      reductionAPI.list('warden', { status: 'pending_admin' }),
      ...months.map(month => wardenAPI.getAttendance({ view: 'monthly', year: Number(month.slice(0, 4)), month: Number(month.slice(5, 7)) })),
    ]);
    if (request !== serial.current) return;
    const data = result => result.status === 'fulfilled' && Array.isArray(result.value?.data?.data) ? result.value.data.data : [];
    setPending(pendingApprovalRows(...results.slice(0, 3).map(data)));
    setPendingError(results.slice(0, 3).some(result => result.status === 'rejected'));
    setTrendError(results.slice(3).some(result => result.status === 'rejected'));
    setTrend(buildAttendanceTrend(results.slice(3).flatMap(data), dates));
    setLoading(false);
  }, [today, refreshToken]);
  useFocusEffect(useCallback(() => { load(); return () => { serial.current++; }; }, [load]));
  return <View style={{ gap: 12 }}>
    <SectionTitle title="Pending approvals" action="See all" onPress={() => navigation.navigate('Requests', { kind: 'leave', request: Date.now() })} />
    {loading ? <Card style={styles.loading}><ActivityIndicator color={colors.primary} /></Card> : <>
      {pendingError && <Card style={{ gap: 10 }}><Text style={ui.description}>Some approval queues could not load.</Text><Button variant="secondary" onPress={load}>Retry</Button></Card>}
      {pending.slice(0, 2).map(({ kind, row }) => <WardenRequestCard key={kind + ':' + row.id} previewReason
        kind={{ leave: 'Leave request', passes: 'Gate pass', reductions: 'Reduction' }[kind]}
        title={kind === 'leave' ? (row.leave_type || 'Leave request') : kind === 'passes' ? (row.purpose || 'Gate pass') : ({ medical: 'Medical leave', od: 'College participation', internship: 'Internship', study_holiday: 'Study holiday' }[row.category] || 'Reduction request')}
        reference={row.id} status={row.status} statusLabel="Pending review" submittedBy={personName(row.Student, row.student_id)} studentMeta={row.Student?.roll_number}
        submittedAt={row.createdAt} fromDate={row.from_date} toDate={row.to_date} includeTime={kind === 'passes'} reason={row.reason || row.purpose}>
        <Button onPress={() => navigation.navigate('Requests', { kind, request: Date.now() })}>Review</Button>
      </WardenRequestCard>)}
      {!pending.length && !pendingError && <Card><Text style={ui.description}>No pending approvals.</Text></Card>}
    </>}
    <SectionTitle title="Attendance trend" />
    <Card style={{ gap: 14, padding: 16 }}>
      <View style={styles.chartHeading}><Text style={styles.chartTitle}>Last 7 days</Text><Text style={ui.small}>{moment(today).subtract(6, 'days').format('D MMM')} – {moment(today).format('D MMM')}</Text></View>
      {loading ? <View style={styles.loading}><ActivityIndicator color={colors.primary} /></View> : trendError ? <View style={{ gap: 10 }}><Text style={ui.description}>Unable to load the attendance trend.</Text><Button variant="secondary" onPress={load}>Retry</Button></View> : <>
        <View style={styles.chart}>{trend.map(day => <View key={day.date} style={styles.column} accessible
          accessibilityLabel={moment(day.date).format('D MMM') + ': ' + (day.percent == null ? 'No records' : day.percent + ' percent, ' + (day.present + day.od) + ' present or on duty out of ' + day.total + ' recorded')}>
          <Text style={styles.percent}>{day.percent == null ? '—' : day.percent + '%'}</Text>
          <View style={styles.track}><View style={[styles.bar, { height: (day.percent ?? 0) + '%' }]} /></View>
          <Text style={styles.day}>{moment(day.date).format('DD')}</Text>
        </View>)}</View>
        <Text style={styles.chartNote}>Present + on duty as a share of recorded attendance. — means no records.</Text>
      </>}
    </Card>
  </View>;
}
const styles = StyleSheet.create({
  loading: { minHeight: 100, alignItems: 'center', justifyContent: 'center' },
  chartHeading: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 6 },
  chartTitle: { fontSize: 13, fontWeight: '600', color: colors.text },
  chart: { flexDirection: 'row', gap: 6, alignItems: 'flex-end', paddingTop: 6 },
  column: { flex: 1, alignItems: 'center', gap: 7, minWidth: 0 },
  percent: { color: colors.primaryDark, fontSize: 12, fontWeight: '600' },
  track: { height: 88, width: '72%', backgroundColor: colors.surface, borderRadius: 6, overflow: 'hidden', justifyContent: 'flex-end' },
  bar: { backgroundColor: colors.primary, width: '100%', borderRadius: 6 },
  day: { fontSize: 12, color: colors.mutedText },
  chartNote: { fontSize: 12, color: colors.mutedText, lineHeight: 18 },
});
