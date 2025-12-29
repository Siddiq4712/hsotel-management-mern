import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, ActivityIndicator, Alert, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import { studentAPI } from '../../api/api';
import { useAuth } from '../../hooks/useAuth';
import { 
  User, Bed, Receipt, Calendar, Users, Home, 
  CreditCard, FileText, Clock, Utensils, CheckCircle, 
  XCircle, AlertCircle, AlertTriangle 
} from 'lucide-react-native';
import { BarChart, LineChart } from 'react-native-chart-kit';
import moment from 'moment';
import RoommatesList from '../../components/student/RoommatesList';
import Header from '../../components/common/Header';

const screenWidth = Dimensions.get('window').width - 32;

const StudentDashboardScreen = ({ navigation }) => {
  const { user } = useAuth();
  const [profile, setProfile] = useState(null);
  const [roommates, setRoommates] = useState([]);
  const [todayAttendance, setTodayAttendance] = useState(null);
  const [loading, setLoading] = useState(true);
  const [messExpenseChartData, setMessExpenseChartData] = useState(null);
  const [attendanceChartData, setAttendanceChartData] = useState(null);
  const [chartLoading, setChartLoading] = useState(true);

  /* -------------------- DATA PROCESSORS -------------------- */
  
  const processMessExpenseData = useCallback((data) => {
    const labels = [];
    const expenses = [];
    const allMonths = [];
    for (let i = 5; i >= 0; i--) { // Showing last 6 months for better mobile fit
      const monthMoment = moment().subtract(i, 'months');
      allMonths.push({ year: monthMoment.year(), month: monthMoment.month() + 1 });
    }

    allMonths.forEach((m) => {
      const monthData = data.find((item) => item.year === m.year && item.month === m.month);
      labels.push(moment().year(m.year).month(m.month - 1).format('MMM'));
      expenses.push(monthData ? parseFloat(monthData.total_amount) : 0);
    });

    setMessExpenseChartData({
      labels: labels,
      datasets: [{ data: expenses }],
    });
  }, []);

  const processAttendanceData = useCallback((data) => {
    const labels = [];
    const attendanceDays = [];
    const absentDays = [];
    const onDutyDays = [];

    for (let i = 5; i >= 0; i--) {
      const monthMoment = moment().subtract(i, 'months');
      const mYear = monthMoment.year();
      const mMonth = monthMoment.month() + 1;

      const monthData = data.find((item) => item.year === mYear && item.month === mMonth);
      labels.push(monthMoment.format('MMM'));
      
      attendanceDays.push(monthData ? parseInt(monthData.present_days || 0) : 0);
      absentDays.push(monthData ? parseInt(monthData.absent_days || 0) : 0);
      onDutyDays.push(monthData ? parseInt(monthData.on_duty_days || 0) : 0);
    }

    setAttendanceChartData({
      labels: labels,
      datasets: [
        { data: attendanceDays, color: (opacity = 1) => `rgba(16, 185, 129, ${opacity})` },
        { data: absentDays, color: (opacity = 1) => `rgba(239, 68, 68, ${opacity})` },
        { data: onDutyDays, color: (opacity = 1) => `rgba(59, 130, 246, ${opacity})` },
      ],
      legend: ['P', 'A', 'OD']
    });
  }, []);

  /* -------------------- DATA FETCHING -------------------- */

  const fetchData = useCallback(async () => {
    setLoading(true);
    setChartLoading(true);
    try {
      // 1. Fetch Profile
      const profileResponse = await studentAPI.getProfile();
      const profileData = profileResponse.data.data || null;
      setProfile(profileData);
      
      // 2. Fetch Roommates
      if (profileData?.tbl_RoomAllotments?.[0]?.HostelRoom?.id) {
        const roommatesResponse = await studentAPI.getRoommates();
        if (roommatesResponse?.data?.data) {
          setRoommates(roommatesResponse.data.data.filter(mate => mate.id !== user.id));
        }
      }

      // 3. Fetch Today's Attendance
      const today = moment().format('YYYY-MM-DD');
      const attendanceResponse = await studentAPI.getMyAttendance({ date: today });
      setTodayAttendance(attendanceResponse.data.data?.[0] || null);

      // 4. Fetch Chart Data
      const [messRes, attRes] = await Promise.all([
        studentAPI.getMonthlyMessExpensesChart(),
        studentAPI.getMonthlyAttendanceChart()
      ]);

      if (messRes.data.success) processMessExpenseData(messRes.data.data);
      if (attRes.data.success) processAttendanceData(attRes.data.data);
      
    } catch (error) {
      console.error('Dashboard Fetch Error:', error);
    } finally {
      setLoading(false);
      setChartLoading(false);
    }
  }, [user.id, processMessExpenseData, processAttendanceData]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  /* -------------------- HELPERS -------------------- */

  const getStatusDisplay = (status) => {
    switch (status) {
      case 'P': return { icon: <CheckCircle color="#10b981" size={24} />, text: 'Present', bgColor: '#f0fdf4', borderColor: '#10b981', textColor: '#065f46' };
      case 'A': return { icon: <XCircle color="#ef4444" size={24} />, text: 'Absent', bgColor: '#fef2f2', borderColor: '#ef4444', textColor: '#991b1b' };
      case 'OD': return { icon: <Clock color="#3b82f6" size={24} />, text: 'On Duty', bgColor: '#eff6ff', borderColor: '#3b82f6', textColor: '#1e40af' };
      default: return { icon: <AlertCircle color="#6b7280" size={24} />, text: 'Not Marked', bgColor: '#f9fafb', borderColor: '#d1d5db', textColor: '#4b5563' };
    }
  };

  const statusInfo = getStatusDisplay(todayAttendance?.status);
  const roomInfo = profile?.tbl_RoomAllotments?.[0]?.HostelRoom;

  if (loading) return (
    <View style={styles.loadingContainer}>
      <ActivityIndicator size="large" color="#2563eb" />
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: '#f8fafc' }}>
      <Header />
      <ScrollView style={{ padding: 16 }} showsVerticalScrollIndicator={false}>
        
        {/* Title */}
        <View style={{ marginBottom: 20 }}>
          <Text style={styles.title}>Dashboard</Text>
          <Text style={styles.subtitle}>Welcome back, {profile?.username}</Text>
        </View>

        {/* --- ANNUAL FEE REMINDER BANNER --- */}
        {profile?.Hostel?.show_fee_reminder == 1 && (
          <TouchableOpacity 
            activeOpacity={0.9}
            onPress={() => navigation.navigate('MessCharges')}
            style={styles.feeBanner}
          >
            <View style={styles.feeBannerIcon}>
              <AlertTriangle color="#d97706" size={24} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.feeBannerTitle}>Annual Fee Released</Text>
              <Text style={styles.feeBannerSub}>
                Due: <Text style={{fontWeight: '700'}}>₹{Number(profile?.Hostel?.annual_fee_amount).toLocaleString()}</Text>
              </Text>
            </View>
            <View style={styles.payNowBtn}>
              <Text style={styles.payNowText}>Pay</Text>
            </View>
          </TouchableOpacity>
        )}

        {/* --- STATS GRID (2x2) --- */}
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <View style={[styles.statIconWrap, {backgroundColor: statusInfo.bgColor}]}>
              <Calendar color={statusInfo.borderColor} size={20} />
            </View>
            <Text style={styles.statLabel}>Attendance</Text>
            <Text style={[styles.statValue, {color: statusInfo.textColor}]}>{statusInfo.text}</Text>
          </View>

          <View style={styles.statCard}>
            <View style={[styles.statIconWrap, {backgroundColor: '#f0fdf4'}]}>
              <Home color="#10b981" size={20} />
            </View>
            <Text style={styles.statLabel}>Hostel</Text>
            <Text style={styles.statValue} numberOfLines={1}>{profile?.Hostel?.name || 'N/A'}</Text>
          </View>

          <View style={styles.statCard}>
            <View style={[styles.statIconWrap, {backgroundColor: '#faf5ff'}]}>
              <Bed color="#8b5cf6" size={20} />
            </View>
            <Text style={styles.statLabel}>Room No</Text>
            <Text style={styles.statValue}>{roomInfo?.room_number || 'N/A'}</Text>
          </View>

          <View style={[styles.statCard, profile?.Hostel?.show_fee_reminder == 1 && {borderColor: '#fed7aa', borderWidth: 1}]}>
            <View style={[styles.statIconWrap, {backgroundColor: profile?.Hostel?.show_fee_reminder == 1 ? '#fff7ed' : '#f0fdf4'}]}>
              <Receipt color={profile?.Hostel?.show_fee_reminder == 1 ? '#f97316' : '#10b981'} size={20} />
            </View>
            <Text style={styles.statLabel}>Annual Fee</Text>
            <Text style={[styles.statValue, {color: profile?.Hostel?.show_fee_reminder == 1 ? '#ea580c' : '#10b981'}]}>
              {profile?.Hostel?.show_fee_reminder == 1 ? `₹${Number(profile?.Hostel?.annual_fee_amount).toLocaleString()}` : 'Cleared'}
            </Text>
          </View>
        </View>

        {/* Quick Actions */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Quick Actions</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
            <ActionBtn icon={<Receipt color="#2563eb"/>} label="Bills" onPress={() => navigation.navigate('MessCharges')} />
            <ActionBtn icon={<Utensils color="#f97316"/>} label="Food" onPress={() => navigation.navigate('FoodOrder')} />
            <ActionBtn icon={<FileText color="#8b5cf6"/>} label="Leave" onPress={() => navigation.navigate('Leaves')} />
            <ActionBtn icon={<AlertCircle color="#f59e0b"/>} label="Issue" onPress={() => navigation.navigate('Complaints')} />
          </View>
        </View>

        {/* Roommates Card */}
        {roommates.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Roommates</Text>
            <RoommatesList roommates={roommates} currentUserId={user.id} />
          </View>
        )}

        {/* Charts */}
        <View style={styles.card}>
            <Text style={styles.cardTitle}>Mess Expense Trend</Text>
            {chartLoading ? <ActivityIndicator color="#2563eb" /> : messExpenseChartData && (
                <LineChart
                    data={messExpenseChartData}
                    width={screenWidth - 40}
                    height={180}
                    chartConfig={chartConfig}
                    bezier
                    style={{ marginLeft: -20 }}
                />
            )}
        </View>

        <View style={[styles.card, {marginBottom: 40}]}>
            <Text style={styles.cardTitle}>Attendance Overview</Text>
            {chartLoading ? <ActivityIndicator color="#10b981" /> : attendanceChartData && (
                <BarChart
                    data={attendanceChartData}
                    width={screenWidth - 40}
                    height={180}
                    chartConfig={{...chartConfig, color: (opacity=1) => `rgba(16, 185, 129, ${opacity})`}}
                    style={{ marginLeft: -20 }}
                />
            )}
        </View>

      </ScrollView>
    </View>
  );
};

/* -------------------- STYLES -------------------- */

const ActionBtn = ({ icon, label, onPress }) => (
    <TouchableOpacity onPress={onPress} style={styles.actionBtn}>
        {icon}
        <Text style={styles.actionLabel}>{label}</Text>
    </TouchableOpacity>
);

const chartConfig = {
    backgroundColor: '#fff',
    backgroundGradientFrom: '#fff',
    backgroundGradientTo: '#fff',
    decimalPlaces: 0,
    color: (opacity = 1) => `rgba(37, 99, 235, ${opacity})`,
    labelColor: (opacity = 1) => `rgba(100, 116, 139, ${opacity})`,
};

const styles = StyleSheet.create({
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 26, fontWeight: '700', color: '#0f172a' },
  subtitle: { fontSize: 14, color: '#64748b' },
  feeBanner: {
    backgroundColor: '#fffbeb', borderLeftWidth: 4, borderLeftColor: '#f59e0b', borderRadius: 12,
    padding: 16, flexDirection: 'row', alignItems: 'center', marginBottom: 20, elevation: 2,
  },
  feeBannerIcon: { backgroundColor: '#fef3c7', padding: 8, borderRadius: 50, marginRight: 12 },
  feeBannerTitle: { color: '#92400e', fontWeight: '700', fontSize: 16 },
  feeBannerSub: { color: '#b45309', fontSize: 13 },
  payNowBtn: { backgroundColor: '#f59e0b', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  payNowText: { color: '#fff', fontWeight: '700', fontSize: 12 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginBottom: 16 },
  statCard: { backgroundColor: '#fff', width: '48%', borderRadius: 12, padding: 14, marginBottom: 12, elevation: 1 },
  statIconWrap: { width: 32, height: 32, borderRadius: 8, justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
  statLabel: { fontSize: 11, color: '#64748b' },
  statValue: { fontSize: 14, fontWeight: '700', color: '#0f172a' },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 16, elevation: 1 },
  cardTitle: { fontSize: 16, fontWeight: '600', color: '#0f172a', marginBottom: 12 },
  actionBtn: { width: '22.5%', padding: 10, backgroundColor: '#f8fafc', borderRadius: 10, alignItems: 'center', borderWidth: 1, borderColor: '#e2e8f0' },
  actionLabel: { fontSize: 11, fontWeight: '600', color: '#334155', marginTop: 4 }
});

export default StudentDashboardScreen;