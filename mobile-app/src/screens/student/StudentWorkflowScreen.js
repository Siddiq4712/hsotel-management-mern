import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator, StyleSheet } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { ChevronLeft, ChevronRight, CalendarDays } from 'lucide-react-native';
import moment from 'moment';
import colors from '../../theme/colors';
import { studentAPI } from '../../api/api';
import Header from '../../components/student/StudentHeader';
import { StudentPresentation, useStudentVisible } from '../../components/student/StudentPresentation';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import GPSAttendanceScreen from './GPSAttendanceScreen';
import ApplyLeaveScreen from './ApplyLeaveScreen';
import MyLeavesScreen from './MyLeavesScreen';
import OutpassRequestScreen from './OutpassRequestScreen';
import OutpassStatusScreen from './OutpassStatusScreen';
import MessReductionsScreen from '../MessReductionsScreen';

const sections = [['attendance', 'Attendance'], ['leave', 'Leave'], ['reduction', 'Reduction'], ['gatepass', 'Gate Pass']];
const statuses = {
  P: ['Present', colors.success, colors.successSoft],
  A: ['Absent', colors.danger, colors.dangerSoft],
  OD: ['On duty', colors.accent, colors.accentSoft],
  H: ['Holiday', colors.primary, colors.primarySoft],
};

// Keep drafts mounted; skip parent-driven renders while a panel is hidden.
const WorkflowPanel = React.memo(function WorkflowPanel({ active, children }) {
  const presentation = useMemo(() => ({ embedded: true, active }), [active]);
  return <View style={[styles.panel, !active && styles.hidden]}>
    <StudentPresentation.Provider value={presentation}>{children}</StudentPresentation.Provider>
  </View>;
}, (previous, next) => !previous.active && !next.active);

function AttendanceHistory() {
  const isVisible = useStudentVisible();
  const [month, setMonth] = useState(() => moment().startOf('month'));
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [limit, setLimit] = useState(10);
  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const response = await studentAPI.getMyAttendance({ from_date: month.format('YYYY-MM-DD'), to_date: month.clone().endOf('month').format('YYYY-MM-DD') });
      setRecords([...(response.data.data || [])].sort((a, b) => moment(b.date).valueOf() - moment(a.date).valueOf()));
    } catch (e) { setError(e.message || 'Unable to load attendance.'); }
    finally { setLoading(false); }
  }, [month]);
  useFocusEffect(useCallback(() => { if (isVisible) load(); }, [load, isVisible]));
  const counted = records.filter(row => ['P', 'A', 'OD'].includes(row.status));
  const present = counted.filter(row => row.status === 'P' || row.status === 'OD').length;
  return <View style={{ gap: 12 }}>
    <View style={styles.monthRow}>
      <Text style={styles.sectionTitle}>{month.format('MMMM YYYY')}</Text>
      {counted.length > 0 && <Text style={styles.ratio}>{Math.round(present / counted.length * 100)}% P / OD</Text>}
      <TouchableOpacity accessibilityRole="button" accessibilityLabel="Previous month" style={styles.iconButton}
        onPress={() => { setMonth(m => m.clone().subtract(1, 'month')); setLimit(10); }}><ChevronLeft size={20} color={colors.mutedText} /></TouchableOpacity>
      <TouchableOpacity accessibilityRole="button" accessibilityLabel="Next month" disabled={month.isSameOrAfter(moment(), 'month')}
        style={[styles.iconButton, month.isSameOrAfter(moment(), 'month') && { opacity: 0.35 }]}
        onPress={() => { setMonth(m => m.clone().add(1, 'month')); setLimit(10); }}><ChevronRight size={20} color={colors.mutedText} /></TouchableOpacity>
    </View>
    {loading ? <ActivityIndicator color={colors.primary} /> : error ? <Card>
      <Text style={styles.body}>{error}</Text><Button variant="secondary" onPress={load}>Retry</Button>
    </Card> : !records.length ? <Card style={{ alignItems: 'center', padding: 24, gap: 10 }}>
      <CalendarDays size={26} color={colors.mutedText} /><Text style={styles.body}>No attendance records for this month.</Text>
    </Card> : <Card style={{ padding: 0, overflow: 'hidden' }}>
      {records.slice(0, limit).map((row, index) => {
        const [label, color, backgroundColor] = statuses[row.status] || ['Not marked', colors.mutedText, colors.surface];
        return <View key={row.id ?? `${row.date}-${index}`} style={[styles.record, index > 0 && styles.divider]}>
          <View style={[styles.dateTile, { backgroundColor }]}><Text style={{ color, fontSize: 16, fontWeight: '700' }}>{moment(row.date).format('DD')}</Text></View>
          <View style={{ flex: 1, gap: 4 }}><Text style={styles.recordTitle}>{moment(row.date).format('dddd')}</Text>
            <Text style={styles.small}>{moment(row.date).format('DD MMM YYYY')}{row.reduction_request_id ? ' · Approved reduction' : ''}</Text></View>
          <Text style={[styles.status, { color, backgroundColor }]}>{label}</Text>
        </View>;
      })}
    </Card>}
    {!loading && records.length > limit && <Button variant="secondary" onPress={() => setLimit(n => n + 10)}>Load more history</Button>}
  </View>;
}

function AttendanceSection() {
  return <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: 28 }}>
    <GPSAttendanceScreen embedded />
    <View style={{ paddingHorizontal: 16 }}><AttendanceHistory /></View>
  </ScrollView>;
}

export default function StudentWorkflowScreen({ navigation, route }) {
  const initial = sections.some(([key]) => key === route.params?.workflow) ? route.params.workflow : 'attendance';
  const [section, setSection] = useState(initial);
  const [visited, setVisited] = useState({ [initial]: true });
  const [views, setViews] = useState({ leave: 'form', gatepass: 'history' });
  const [visitedViews, setVisitedViews] = useState({});
  const [historyRevision, setHistoryRevision] = useState(0);
  const [formRevision, setFormRevision] = useState({ leave: 0, gatepass: 0 });
  const choose = useCallback(key => {
    setVisited(current => current[key] ? current : { ...current, [key]: true }); setSection(key);
  }, []);
  useEffect(() => {
    if (views[section]) {
      const key = section + ':' + views[section];
      setVisitedViews(current => current[key] ? current : { ...current, [key]: true });
    }
  }, [section, views]);
  const seen = (key, view) => visitedViews[key + ':' + view] || (section === key && views[key] === view);
  useEffect(() => {
    const key = route.params?.workflow;
    if (sections.some(([value]) => value === key)) {
      setSection(key); setVisited(current => current[key] ? current : { ...current, [key]: true });
      if (route.params?.view) setViews(current => ({ ...current, [key]: route.params.view }));
    }
  }, [route.params?.workflow, route.params?.view, route.params?.request]);
  const formNavigation = useCallback(key => ({
    ...navigation,
    navigate: (name, params) => {
      if (name === 'ApplyLeave') { choose('leave'); setViews(v => ({ ...v, leave: 'form' })); }
      else if (name === 'OutpassRequest') { choose('gatepass'); setViews(v => ({ ...v, gatepass: 'form' })); }
      else navigation.navigate(name, params);
    },
    goBack: () => { setViews(v => ({ ...v, [key]: 'history' })); setHistoryRevision(n => n + 1); setFormRevision(v => ({ ...v, [key]: v[key] + 1 })); },
  }), [navigation, choose]);
  const leaveNavigation = useMemo(() => formNavigation('leave'), [formNavigation]);
  const passNavigation = useMemo(() => formNavigation('gatepass'), [formNavigation]);
  return <View style={styles.page}>
    <Header title="Workflows" back />
    <View style={styles.segmentBar}>
      {sections.map(([key, label]) => <TouchableOpacity key={key} accessibilityRole="tab"
        accessibilityState={{ selected: section === key }} onPress={() => choose(key)}
        style={[styles.segment, section === key && styles.selectedSegment]}>
        <Text style={[styles.segmentText, section === key && { color: colors.primary }]}>{label}</Text>
      </TouchableOpacity>)}
    </View>
    {['leave', 'gatepass'].includes(section) && <View style={styles.viewSwitch}>
      <Text style={styles.sectionTitle}>{section === 'leave' ? 'Leave application' : 'Digital gate pass'}</Text>
      <View style={{ flexDirection: 'row', gap: 6 }}>{[['form', 'Request'], ['history', section === 'leave' ? 'History' : 'My pass']].map(([key, label]) =>
        <TouchableOpacity key={key} accessibilityRole="button" accessibilityState={{ selected: views[section] === key }}
          onPress={() => setViews(v => ({ ...v, [section]: key }))}
          style={[styles.mode, views[section] === key && { backgroundColor: colors.primarySoft }]}>
          <Text style={{ color: views[section] === key ? colors.primary : colors.mutedText, fontSize: 12, fontWeight: '600' }}>{label}</Text>
        </TouchableOpacity>)}</View>
    </View>}
    <View style={styles.panel}>
      {visited.attendance && <WorkflowPanel active={section === 'attendance'}><AttendanceSection /></WorkflowPanel>}
      {visited.leave && <View style={[styles.panel, section !== 'leave' && styles.hidden]}>
        {seen('leave', 'form') && <WorkflowPanel active={section === 'leave' && views.leave === 'form'}><ApplyLeaveScreen key={`leave-form-${formRevision.leave}`} navigation={leaveNavigation} /></WorkflowPanel>}
        {seen('leave', 'history') && <WorkflowPanel active={section === 'leave' && views.leave === 'history'}><MyLeavesScreen refreshToken={historyRevision} navigation={leaveNavigation} /></WorkflowPanel>}
      </View>}
      {visited.reduction && <WorkflowPanel active={section === 'reduction'}><MessReductionsScreen studentLayout embedded /></WorkflowPanel>}
      {visited.gatepass && <View style={[styles.panel, section !== 'gatepass' && styles.hidden]}>
        {seen('gatepass', 'form') && <WorkflowPanel active={section === 'gatepass' && views.gatepass === 'form'}><OutpassRequestScreen key={`pass-form-${formRevision.gatepass}`} navigation={passNavigation} /></WorkflowPanel>}
        {seen('gatepass', 'history') && <WorkflowPanel active={section === 'gatepass' && views.gatepass === 'history'}><OutpassStatusScreen refreshToken={historyRevision} navigation={passNavigation} /></WorkflowPanel>}
      </View>}
    </View>
  </View>;
}
const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.background }, panel: { flex: 1 }, hidden: { display: 'none' },
  segmentBar: { flexDirection: 'row', margin: 16, padding: 4, backgroundColor: colors.surface, borderRadius: 14 },
  segment: { flex: 1, minHeight: 48, alignItems: 'center', justifyContent: 'center', borderRadius: 11, paddingHorizontal: 2 },
  selectedSegment: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border },
  segmentText: { fontSize: 11, fontWeight: '700', color: colors.mutedText, textAlign: 'center' },
  viewSwitch: { paddingHorizontal: 16, marginBottom: 8, flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  mode: { minHeight: 44, paddingHorizontal: 12, alignItems: 'center', justifyContent: 'center', borderRadius: 10 },
  sectionTitle: { fontSize: 16, color: colors.text, fontWeight: '700', flexShrink: 1 },
  monthRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6 },
  iconButton: { minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  ratio: { marginLeft: 'auto', padding: 6, borderRadius: 8, backgroundColor: colors.successSoft, color: colors.success, fontSize: 11, fontWeight: '700' },
  record: { padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12 },
  divider: { borderTopWidth: 1, borderTopColor: colors.surface },
  dateTile: { minWidth: 42, minHeight: 48, alignItems: 'center', justifyContent: 'center', borderRadius: 12 },
  recordTitle: { color: colors.text, fontSize: 14, fontWeight: '600' },
  status: { paddingHorizontal: 8, paddingVertical: 6, borderRadius: 10, fontSize: 11, fontWeight: '700', maxWidth: '30%' },
  small: { color: colors.mutedText, fontSize: 12 }, body: { color: colors.mutedText, fontSize: 14, marginBottom: 12 },
});
