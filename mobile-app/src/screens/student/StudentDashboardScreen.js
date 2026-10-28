import { withScreenPermission } from '../../auth/PermissionContext';
import HighlightCard, { highlightStyles } from '../../components/common/HighlightCard';
import Button from '../../components/common/Button';
import Card from '../../components/common/Card';
import colors from '../../theme/colors';
import { Text } from '../../components/common/ReferenceDesign';
import { useTextSize } from '../../theme/TextSizeContext';
import { textMetrics, typography } from '../../theme/typography';
import React, { useState, useCallback, useMemo, useRef } from 'react';
import {
  View, ScrollView, ActivityIndicator,
  StyleSheet, useWindowDimensions, RefreshControl, Animated
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import TouchableOpacity from '../../components/common/Touchable';
import { getDashboardResource } from '../../api/api';
import useAfterPaintFocusEffect from '../../hooks/useAfterPaintFocusEffect';
import { expenseChartData } from '../../utils/expenseChartData';
import { useAuth } from '../../hooks/useAuth';
import { 
  Bed, Receipt, Calendar, Home, CreditCard, 
  FileText, Utensils, AlertTriangle, 
  ChevronLeft, ChevronRight, LayoutGrid, RefreshCw, 
  CheckCircle2, QrCode
} from 'lucide-react-native';
import { BarChart } from 'react-native-chart-kit';
import moment from 'moment';
import Header from '../../components/student/StudentHeader';


const StudentDashboardScreen = ({ navigation }) => {
  const { width } = useWindowDimensions();
  const { user } = useAuth();
  const [profile, setProfile] = useState(null);
  const [monthlyCharges, setMonthlyCharges] = useState(null);
  const [loading, setLoading] = useState(true);
  const [chartLoading, setChartLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [messExpenseChartData, setMessExpenseChartData] = useState(null);
  const [attendanceHeatmapData, setAttendanceHeatmapData] = useState([]);
  const [selectedYear, setSelectedYear] = useState(moment().year());
  const [selectedMonth, setSelectedMonth] = useState(moment().month() + 1);
  const expenseRequest = useRef(0);
  const loadedChartYear = useRef(null);
  const heatmapRequest = useRef(0);

  const fetchProfile = useCallback(async (force = false) => {
    try { setProfile((await getDashboardResource('/student/profile', {}, { force })).data.data); }
    catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, []);

  const fetchCharges = useCallback(async (force = false) => {
    try {
      const response = await getDashboardResource('/student/daily-mess-charges', { month: moment().month() + 1, year: moment().year() }, { force });
      const summary = response.data.data?.monthlySummary;
      if (!summary) { setMonthlyCharges(null); return; }
      const food = summary.historicalMessAmount ?? Number(summary.monthlyCalculatedDailyRate || 0) * Number(summary.studentTotalManDaysForMonth || 0);
      const flatFees = (summary.flatFees || []).reduce((sum, fee) => sum + Number(fee.amount || 0), 0);
      setMonthlyCharges(Number(summary.historicalFinalAmount ?? (Number(food) + Number(summary.totalMonthlySpecialFoodCost || 0) + flatFees)));
    } catch (e) { setMonthlyCharges(null); console.error(e); }
  }, []);

  const fetchExpenses = useCallback(async (force = false) => {
    const request = ++expenseRequest.current;
    if (force === true || loadedChartYear.current !== selectedYear) setChartLoading(true);
    try {
      const messRes = await getDashboardResource('/student/chart-data/mess-expenses', {}, { force });
      if (request !== expenseRequest.current) return;
      loadedChartYear.current = selectedYear;
      setMessExpenseChartData(current => expenseChartData(current, messRes.data.data, selectedYear, moment.monthsShort()));
    } catch (e) { console.error(e); }
    finally { if (request === expenseRequest.current) setChartLoading(false); }
  }, [selectedYear]);

  const fetchHeatmap = useCallback(async (force = false) => {
    const request = ++heatmapRequest.current;
    try {
      const start = moment().year(selectedYear).month(selectedMonth - 1).startOf('month').format('YYYY-MM-DD');
      const end = moment(start).endOf('month').format('YYYY-MM-DD');
      const res = await getDashboardResource('/student/attendance', { from_date: start, to_date: end }, { force });
      if (request === heatmapRequest.current) setAttendanceHeatmapData(res.data.data || []);
    } catch (e) { console.error(e); }
  }, [selectedYear, selectedMonth]);

  useAfterPaintFocusEffect(useCallback(() => { fetchProfile(); fetchCharges(); }, [fetchProfile, fetchCharges]));
  useAfterPaintFocusEffect(useCallback(() => { fetchExpenses(); return () => { expenseRequest.current++; }; }, [fetchExpenses]));
  useAfterPaintFocusEffect(useCallback(() => { fetchHeatmap(); return () => { heatmapRequest.current++; }; }, [fetchHeatmap]));

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([fetchProfile(true), fetchCharges(true), fetchExpenses(true), fetchHeatmap(true)]);
    setRefreshing(false);
  };

  const heatmapDays = useMemo(() => {
    const firstDay = moment().year(selectedYear).month(selectedMonth - 1).startOf('month');
    const start = firstDay.clone().startOf('week');
    const end = firstDay.clone().endOf('month').endOf('week');
    const days = [];
    let curr = start.clone();
    const attMap = new Map(attendanceHeatmapData.map(d => [moment(d.date).format('YYYY-MM-DD'), d.status]));
    while (curr.isBefore(end) || curr.isSame(end)) {
      days.push({ date: curr.clone(), isCurrentMonth: curr.month() === firstDay.month(), status: attMap.get(curr.format('YYYY-MM-DD')), key: curr.format('YYYY-MM-DD') });
      curr.add(1, 'day');
    }
    return days;
  }, [selectedYear, selectedMonth, attendanceHeatmapData]);

  const recorded = attendanceHeatmapData.filter(row => ['P', 'A', 'OD'].includes(row.status));
  const attended = recorded.filter(row => row.status === 'P' || row.status === 'OD').length;
  const ratio = recorded.length ? Math.round(attended / recorded.length * 100) : null;
  const name = profile?.userName || profile?.username || user?.username || user?.userName || 'Student';
  const room = profile?.tbl_RoomAllotments?.[0]?.HostelRoom?.room_number;
  const openWorkflow = workflow => navigation.navigate('Attendance', { workflow, view: 'form', request: Date.now() });
  const actions = [
    ['Leave', Calendar, colors.primary, colors.primarySoft, () => openWorkflow('leave')],
    ['Reduction', FileText, colors.accent, colors.accentSoft, () => openWorkflow('reduction')],
    ['Gate Pass', QrCode, colors.accent, colors.accentSoft, () => openWorkflow('gatepass')],
    ['Complaint', AlertTriangle, colors.warning, colors.warningSoft, () => navigation.navigate('Profile', { screen: 'Complaints' })],
    ['Additional Food', Utensils, colors.primary, colors.primarySoft, () => navigation.navigate('MessCharges', { screen: 'FoodOrder' })],
  ].sort(([a], [b]) => a.localeCompare(b));
  const chartData = useMemo(() => {
    if (!messExpenseChartData) return null;
    const end = selectedYear === moment().year() ? moment().month() + 1 : 12;
    const start = Math.max(0, end - 4);
    return {
      labels: messExpenseChartData.labels.slice(start, end),
      datasets: [{ data: messExpenseChartData.datasets[0].data.slice(start, end) }],
    };
  }, [messExpenseChartData, selectedYear]);
  return <View style={styles.page}>
    <Header />
    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled"
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} colors={[colors.primary]} />}>
      <View style={styles.greeting}>
        <View style={{ flex: 1, gap: 6 }}><Text style={styles.title}>Hi, {name}</Text>
          <Text style={styles.subtitle}>{[profile?.Hostel?.name, room && `Room ${room}`].filter(Boolean).join(' · ') || 'Your student workspace'}</Text>
        </View>
        <TouchableOpacity accessibilityRole="button" accessibilityLabel="Refresh dashboard" onPress={onRefresh} style={styles.iconButton}>
          <RefreshCw size={19} color={colors.mutedText} />
        </TouchableOpacity>
      </View>
      {loading && !refreshing && <ActivityIndicator color={colors.primary} />}
      <View style={styles.stats}>
        <Card style={styles.stat}><Text style={styles.eyebrow}>ATTENDANCE</Text>
          <Text style={[styles.statValue, { color: colors.primaryDark }]}>{ratio == null ? '—' : `${ratio}%`}</Text>
          <Text style={styles.small}>{moment().month(selectedMonth - 1).format('MMMM')} · P / OD</Text>
        </Card>
        <Card style={styles.stat}><Text style={styles.eyebrow}>YOUR ROOM</Text>
          <Text style={[styles.statValue, { color: colors.primaryDark }, !room && { fontSize: 16 }]}>{room || 'Not allotted'}</Text>
          <Text style={styles.small}>{profile?.Hostel?.name || 'Room details in Profile'}</Text>
        </Card>
      </View>
      <HighlightCard gradientColors={colors.chargesGradient} style={styles.feeCard}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <Text style={[styles.feeLabel, { flex: 1 }]}>{profile?.Hostel?.show_fee_reminder == 1 ? 'ANNUAL HOSTEL FEE · NEEDS ATTENTION' : 'MESS & HOSTEL CHARGES'}</Text>
          <View style={[highlightStyles.badge, { flexShrink: 0 }]}><Text style={{ color: colors.card, fontSize: 10, fontWeight: '700' }}>{moment().format('MMM YYYY').toUpperCase()}</Text></View>
        </View>
        <View style={{ gap: 4, marginTop: 10 }}>
          <Text adjustsFontSizeToFit minimumFontScale={0.7} numberOfLines={1} style={styles.feeValue}>{profile?.Hostel?.show_fee_reminder == 1 ? `₹${profile?.Hostel?.annual_fee_amount ?? '—'}` : monthlyCharges == null ? '—' : `₹${monthlyCharges.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}</Text>
          <Text style={[highlightStyles.detail, { fontSize: 11, lineHeight: 17 }]}>Includes food, additional orders and approved reductions.</Text>
        </View>
        <Button variant="secondary" onPress={() => navigation.navigate('MessCharges', { screen: 'MessOverview' })}
          style={[highlightStyles.button, { alignSelf: 'flex-start', marginTop: 12, paddingVertical: 12, paddingHorizontal: 16, borderRadius: 14, gap: 10 }]}>
          <Text style={{ color: '#39359D', fontSize: 12, fontWeight: '700' }}>View statement</Text><ChevronRight size={18} color="#39359D" />
        </Button>
      </HighlightCard>
      <View style={styles.sectionRow}><Text style={styles.sectionTitle}>Quick actions</Text>
        <View style={styles.swipeHint}><Text style={styles.small}>Swipe</Text><ChevronRight size={15} color={colors.mutedText} /></View>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} nestedScrollEnabled directionalLockEnabled
        contentContainerStyle={styles.quickRow}>
        {actions.map(([label, Icon, color, backgroundColor, onPress]) => <TouchableOpacity key={label} onPress={onPress}
          accessibilityRole="button" accessibilityLabel={label} style={styles.quickAction}>
          <View style={[styles.quickIcon, { backgroundColor }]}><Icon size={22} color={color} /></View>
          <Text style={styles.quickLabel}>{label}</Text>
        </TouchableOpacity>)}
      </ScrollView>
      <View style={styles.sectionRow}><Text style={styles.sectionTitle}>Mess expenses</Text>
        <View style={styles.yearControl}>
          <TouchableOpacity accessibilityRole="button" accessibilityLabel="Previous year" style={styles.iconButton} onPress={() => setSelectedYear(y => y - 1)}><ChevronLeft size={18} color={colors.mutedText} /></TouchableOpacity>
          <Text style={styles.year}>{selectedYear}</Text>
          <TouchableOpacity accessibilityRole="button" accessibilityLabel="Next year" style={styles.iconButton} onPress={() => setSelectedYear(y => y + 1)}><ChevronRight size={18} color={colors.mutedText} /></TouchableOpacity>
        </View>
      </View>
      <Card style={{ padding: 12, overflow: 'hidden' }}>
        {chartLoading ? <ActivityIndicator color={colors.primary} /> : chartData ? <>
          <ExpenseChart data={chartData} width={Math.max(240, width - 64)} />
          <Text style={[styles.small, { textAlign: 'center' }]}>Monthly mess expenses · amounts in rupees</Text>
        </> : <Text style={styles.subtitle}>No expense data available.</Text>}
      </Card>
      <View style={styles.sectionRow}><Text style={styles.sectionTitle}>Attendance calendar</Text>
        <TouchableOpacity accessibilityRole="button" onPress={() => navigation.navigate('Attendance', { workflow: 'attendance', request: Date.now() })} style={styles.linkButton}>
          <Text style={styles.link}>View history</Text>
        </TouchableOpacity>
      </View>
      <Card>
        <View style={styles.sectionRow}>
          <TouchableOpacity accessibilityRole="button" accessibilityLabel="Previous calendar month" style={styles.iconButton} onPress={() => setSelectedMonth(m => m === 1 ? 12 : m - 1)}><ChevronLeft size={20} color={colors.mutedText} /></TouchableOpacity>
          <Text style={styles.sectionTitle}>{moment().month(selectedMonth - 1).format('MMMM')}</Text>
          <TouchableOpacity accessibilityRole="button" accessibilityLabel="Next calendar month" style={styles.iconButton} onPress={() => setSelectedMonth(m => m === 12 ? 1 : m + 1)}><ChevronRight size={20} color={colors.mutedText} /></TouchableOpacity>
        </View>
        <AttendanceCalendar days={heatmapDays} />
        <Text style={[styles.small, { marginTop: 12 }]}>P · Present     A · Absent     OD · On duty</Text>
      </Card>
    </ScrollView>
  </View>;
};
const AttendanceCalendar = React.memo(function AttendanceCalendar({ days }) {
  return <View style={styles.calendar}>
    {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((label, index) => <Text key={index} style={styles.dayLabel}>{label}</Text>)}
    {days.map(day => <View key={day.key} style={[styles.day, !day.isCurrentMonth && { opacity: 0.4 },
      day.status === 'P' && { backgroundColor: colors.success }, day.status === 'A' && { backgroundColor: colors.danger }, day.status === 'OD' && { backgroundColor: colors.accent }]}>
      <Text style={[styles.dayText, ['P', 'A', 'OD'].includes(day.status) && { color: colors.card }]}>{day.date.date()}</Text>
    </View>)}
  </View>;
});
const ExpenseChart = React.memo(function ExpenseChart({ data, width }) {
  const { preference } = useTextSize();
  const fontSize = textMetrics({ fontSize: typography.metadata }, preference, { allowSmallText: true }).fontSize;
  return <BarChart data={data} width={width} height={210} yAxisLabel="₹" chartConfig={{ ...chartConfig, propsForLabels: { fontSize } }}
    fromZero style={styles.chart} />;
});
const chartConfig = {
  backgroundGradientFrom: colors.card, backgroundGradientTo: colors.card,
  color: (opacity = 1) => colors.withOpacity(colors.primary, opacity),
  labelColor: (opacity = 1) => colors.withOpacity(colors.mutedText, opacity),
  barPercentage: 0.55, decimalPlaces: 0, propsForLabels: { fontSize: 11 },
};
const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.background }, content: { padding: 16, paddingBottom: 32, gap: 16 },
  greeting: { flexDirection: 'row', alignItems: 'center', gap: 10 }, title: { fontSize: typography.pageTitle, fontWeight: '700', color: colors.text },
  subtitle: { fontSize: 13, color: colors.mutedText, lineHeight: 20 }, stats: { flexDirection: 'row', gap: 12 },
  stat: { flex: 1, padding: 16, gap: 8 }, eyebrow: { fontSize: 10, letterSpacing: 0.8, color: colors.mutedText, fontWeight: '600' },
  statValue: { fontSize: 23, color: colors.text, fontWeight: '700' }, small: { fontSize: 12, color: colors.mutedText, lineHeight: 18 },
  feeCard: { borderRadius: 24, padding: 20, gap: 10, boxShadow: 'none' }, feeLabel: { color: colors.card, fontSize: 9, fontWeight: '700', letterSpacing: 0.7 },
  feeValue: { color: colors.card, fontSize: typography.amount, lineHeight: 36, fontWeight: '800' }, feeDetail: { color: colors.card, fontSize: 13, lineHeight: 20 },
  sectionTitle: { color: colors.text, fontSize: typography.section, fontWeight: '700' }, quickRow: { gap: 12, paddingBottom: 4 }, swipeHint: { flexDirection: 'row', alignItems: 'center', gap: 2 }, chart: { borderRadius: 12, marginLeft: -8 },
  quickAction: { width: 104, alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: colors.card, padding: 12, minHeight: 100, borderWidth: 1, borderColor: colors.border, borderRadius: 16 },
  quickIcon: { width: 42, height: 42, alignItems: 'center', justifyContent: 'center', borderRadius: 12 }, quickLabel: { color: colors.text, fontSize: 12, fontWeight: '600', textAlign: 'center' },
  sectionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 },
  yearControl: { flexDirection: 'row', alignItems: 'center' }, year: { fontSize: 13, fontWeight: '600', color: colors.mutedText },
  iconButton: { minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' }, linkButton: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 6 },
  link: { color: colors.primary, fontSize: 12, fontWeight: '600' }, calendar: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  dayLabel: { width: '13%', textAlign: 'center', color: colors.mutedText, fontSize: 12, fontWeight: '600', marginBottom: 8 },
  day: { width: '13%', aspectRatio: 1, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center', marginBottom: 5, borderRadius: 8 },
  dayText: { fontSize: 12, color: colors.text, fontWeight: '600' },
});
export default withScreenPermission(StudentDashboardScreen, 'dashboard');
