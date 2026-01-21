import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  View, Text, ScrollView, ActivityIndicator, TouchableOpacity, 
  StyleSheet, Dimensions, RefreshControl, Animated
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { studentAPI } from '../../api/api';
import { useAuth } from '../../hooks/useAuth';
import { 
  Bed, Receipt, Calendar, Home, CreditCard, 
  FileText, Utensils, AlertTriangle, 
  ChevronLeft, ChevronRight, LayoutGrid, RefreshCw, 
  CheckCircle2
} from 'lucide-react-native';
import { BarChart } from 'react-native-chart-kit';
import moment from 'moment';
import Header from '../../components/common/Header';

const { width } = Dimensions.get('window');
const isTablet = width > 768;

const StudentDashboardScreen = ({ navigation }) => {
  const { user } = useAuth();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [chartLoading, setChartLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [messExpenseChartData, setMessExpenseChartData] = useState(null);
  const [attendanceHeatmapData, setAttendanceHeatmapData] = useState([]);
  const [selectedYear, setSelectedYear] = useState(moment().year());
  const [selectedMonth, setSelectedMonth] = useState(moment().month() + 1);

  const fetchDashboardData = useCallback(async () => {
    try {
      const p = await studentAPI.getProfile();
      setProfile(p.data.data);
      const [messRes] = await Promise.all([studentAPI.getMonthlyMessExpensesChart()]);
      const expenses = Array(12).fill(0);
      messRes.data.data?.forEach(d => { if (d.year === selectedYear) expenses[d.month - 1] = Number(d.total_amount); });
      setMessExpenseChartData({ labels: moment.monthsShort(), datasets: [{ data: expenses }] });
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setChartLoading(false);
    }
  }, [selectedYear]);

  const fetchHeatmap = useCallback(async () => {
    try {
      const start = moment().year(selectedYear).month(selectedMonth - 1).startOf('month').format('YYYY-MM-DD');
      const end = moment(start).endOf('month').format('YYYY-MM-DD');
      const res = await studentAPI.getMyAttendance({ from_date: start, to_date: end });
      setAttendanceHeatmapData(res.data.data || []);
    } catch (e) { console.error(e); }
  }, [selectedYear, selectedMonth]);

  useEffect(() => { fetchDashboardData(); fetchHeatmap(); }, [fetchDashboardData, fetchHeatmap]);

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([fetchDashboardData(), fetchHeatmap()]);
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

  if (loading && !refreshing) return <View style={styles.center}><ActivityIndicator color="#2563eb" /></View>;

  return (
    <View style={styles.container}>
      <Header />
      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <View style={isTablet ? styles.tabletLayout : styles.mobileLayout}>
          
          <View style={isTablet ? { flex: 2 } : { width: '100%' }}>
            {/* Reduced Title Size */}
            <View style={styles.headerRow}>
              <View>
                <Text style={styles.welcomeText}>Dashboard</Text>
                <Text style={styles.subText}>{moment().format('dddd, Do MMMM')}</Text>
              </View>
              <TouchableOpacity onPress={onRefresh} style={styles.miniRefresh}>
                <RefreshCw size={16} color="#64748b" />
              </TouchableOpacity>
            </View>

            {profile?.Hostel?.show_fee_reminder == 1 && (
              <TouchableOpacity style={styles.feeBanner} onPress={() => navigation.navigate('MessCharges')}>
                <View style={styles.row}>
                  <AlertTriangle color="#fff" size={18} />
                  <Text style={styles.feeText}>Annual Fee Pending: ₹{profile?.Hostel?.annual_fee_amount}</Text>
                </View>
                <Text style={styles.paySmall}>PAY NOW</Text>
              </TouchableOpacity>
            )}

            <View style={styles.statsGrid}>
              <StatCard label="HOSTEL" val={profile?.Hostel?.name || '-'} icon={Home} color="#3b82f6" bg="#eff6ff" />
              <StatCard label="ROOM" val={profile?.tbl_RoomAllotments?.[0]?.HostelRoom?.room_number || '-'} icon={Bed} color="#a855f7" bg="#faf5ff" />
              <StatCard label="FEE" val={profile?.Hostel?.show_fee_reminder == 1 ? 'Pending' : 'Paid'} icon={Receipt} color="#f59e0b" bg="#fffbeb" />
              <StatCard label="ATTENDANCE" val="Marked" icon={CheckCircle2} color="#10b981" bg="#f0fdf4" />
            </View>

            <View style={styles.actionGrid}>
              <ActionBtn label="Leave" icon={Calendar} color="#10b981" bg="#f0fdf4" onPress={() => navigation.navigate('Leaves')} />
              <ActionBtn label="Issues" icon={FileText} color="#3b82f6" bg="#eff6ff" onPress={() => navigation.navigate('Complaints')} />
              <ActionBtn label="Bills" icon={Receipt} color="#a855f7" bg="#faf5ff" onPress={() => navigation.navigate('MessCharges')} />
              <ActionBtn label="Food" icon={Utensils} color="#f97316" bg="#fff7ed" onPress={() => navigation.navigate('FoodOrder')} />
            </View>

            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.cardTitle}>Mess Trend</Text>
                <View style={styles.yearSelector}>
                  <TouchableOpacity onPress={() => setSelectedYear(y => y-1)}><ChevronLeft size={14} color="#64748b"/></TouchableOpacity>
                  <Text style={styles.yearText}>{selectedYear}</Text>
                  <TouchableOpacity onPress={() => setSelectedYear(y => y+1)}><ChevronRight size={14} color="#64748b"/></TouchableOpacity>
                </View>
              </View>
              {!chartLoading && messExpenseChartData && (
                <BarChart
                  data={messExpenseChartData}
                  width={isTablet ? (width * 0.6) - 60 : width - 64}
                  height={180}
                  yAxisLabel="₹"
                  chartConfig={chartConfig}
                  style={{ borderRadius: 12, marginTop: 10, marginLeft: -10 }}
                />
              )}
            </View>
          </View>

          <View style={isTablet ? { flex: 1, marginLeft: 16 } : { width: '100%' }}>
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Attendance</Text>
              <View style={styles.monthNav}>
                <TouchableOpacity onPress={() => setSelectedMonth(m => m === 1 ? 12 : m - 1)}><ChevronLeft size={16} /></TouchableOpacity>
                <Text style={styles.monthLabel}>{moment().month(selectedMonth-1).format('MMMM')}</Text>
                <TouchableOpacity onPress={() => setSelectedMonth(m => m === 12 ? 1 : m + 1)}><ChevronRight size={16} /></TouchableOpacity>
              </View>
              <View style={styles.heatmapGrid}>
                {['S','M','T','W','T','F','S'].map((dayChar, index) => (
                  <Text key={`h-${index}`} style={styles.dayHeader}>{dayChar}</Text>
                ))}
                {heatmapDays.map((day) => (
                  <View key={`day-${day.key}`} style={[styles.heatBox, !day.isCurrentMonth && { opacity: 0.1 }, day.status === 'P' && { backgroundColor: '#10b981' }, day.status === 'A' && { backgroundColor: '#f43f5e' }]}>
                    <Text style={[styles.heatText, day.status && { color: '#fff' }]}>{day.date.date()}</Text>
                  </View>
                ))}
              </View>
            </View>
          </View>

        </View>
      </ScrollView>
    </View>
  );
};

/* --- SUB COMPONENTS --- */
const StatCard = ({ label, val, icon: Icon, color, bg }) => (
  <View style={[styles.statCard, { width: isTablet ? '23.5%' : '48%' }]}>
    <View style={[styles.statIcon, { backgroundColor: bg }]}><Icon size={16} color={color} /></View>
    <View style={{ flex: 1 }}>
        <Text style={styles.statLabel}>{label}</Text>
        <Text style={styles.statValue}>{val}</Text>
    </View>
  </View>
);

const ActionBtn = ({ label, icon: Icon, color, bg, onPress }) => (
  <TouchableOpacity onPress={onPress} style={styles.actionBtn}>
    <View style={[styles.actionIcon, { backgroundColor: bg }]}><Icon size={20} color={color} /></View>
    <Text style={styles.actionLabel}>{label}</Text>
  </TouchableOpacity>
);

/* --- STYLES --- */
const chartConfig = {
  backgroundGradientFrom: "#fff",
  backgroundGradientTo: "#fff",
  color: (opacity = 1) => `rgba(37, 99, 235, ${opacity})`,
  labelColor: (opacity = 1) => `rgba(100, 116, 139, ${opacity})`,
  barPercentage: 0.5,
  decimalPlaces: 0,
  propsForLabels: { fontSize: 10 }
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  scrollContent: { padding: 16 },
  tabletLayout: { flexDirection: 'row', alignItems: 'flex-start' },
  mobileLayout: { flexDirection: 'column' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  welcomeText: { fontSize: 18, fontWeight: '800', color: '#0f172a' },
  subText: { fontSize: 12, color: '#64748b' },
  miniRefresh: { padding: 8, backgroundColor: '#fff', borderRadius: 10, elevation: 1 },

  feeBanner: { backgroundColor: '#ea580c', borderRadius: 16, padding: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  feeText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  paySmall: { color: '#fff', fontSize: 10, fontWeight: '900', borderLeftWidth: 1, borderLeftColor: 'rgba(255,255,255,0.3)', paddingLeft: 10 },

  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 20 },
  statCard: { backgroundColor: '#fff', padding: 12, borderRadius: 16, flexDirection: 'row', alignItems: 'center', gap: 8, borderWeight: 1, borderColor: '#f1f5f9' },
  statIcon: { padding: 8, borderRadius: 10 },
  statLabel: { fontSize: 9, fontWeight: '800', color: '#94a3b8' },
  statValue: { fontSize: 12, fontWeight: '700', color: '#1e293b' },

  actionGrid: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
  actionBtn: { width: '22%', alignItems: 'center' },
  actionIcon: { width: '100%', aspectRatio: 1, borderRadius: 16, backgroundColor: '#fff', justifyContent: 'center', alignItems: 'center', marginBottom: 6, elevation: 2, shadowOpacity: 0.05 },
  actionLabel: { fontSize: 11, fontWeight: '600', color: '#475569' },

  card: { backgroundColor: '#fff', borderRadius: 24, padding: 16, marginBottom: 16, elevation: 1 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  cardTitle: { fontSize: 14, fontWeight: '700', color: '#1e293b' },
  yearSelector: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f1f5f9', padding: 4, borderRadius: 8 },
  yearText: { marginHorizontal: 6, fontWeight: '700', fontSize: 11, color: '#475569' },

  monthNav: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, backgroundColor: '#f8fafc', padding: 6, borderRadius: 12 },
  monthLabel: { fontWeight: '800', fontSize: 10, textTransform: 'uppercase', color: '#64748b' },
  heatmapGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  dayHeader: { width: '13%', textAlign: 'center', fontSize: 9, fontWeight: '800', color: '#cbd5e1', marginBottom: 8 },
  heatBox: { width: '13%', aspectRatio: 1, backgroundColor: '#f1f5f9', borderRadius: 6, justifyContent: 'center', alignItems: 'center', marginBottom: 4 },
  heatText: { fontSize: 9, fontWeight: '700', color: '#64748b' }
});

export default StudentDashboardScreen;