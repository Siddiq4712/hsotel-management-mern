import { withScreenPermission } from '../../auth/PermissionContext';
import { SectionTitle, ui } from '../../components/common/ReferenceDesign';
import { AttendanceBreakdown } from '../../components/common/DashboardSummary';
import HighlightCard, { highlightStyles } from '../../components/common/HighlightCard';
import { Text } from "../../components/common/ReferenceDesign";
import QuickActionsRow from '../../components/common/QuickActionsRow';
import Screen from '../../components/common/Screen';
import Button from '../../components/common/Button';
import Card from '../../components/common/Card';
import colors from '../../theme/colors';
import { typography } from '../../theme/typography';
import React, { useState, useCallback, useMemo } from 'react';
import useAfterPaintFocusEffect from '../../hooks/useAfterPaintFocusEffect';
import { View, ScrollView, RefreshControl, StyleSheet, Alert } from 'react-native';
import * as Location from 'expo-location';
import { getDashboardResource } from '../../api/api';
import Header from '../../components/common/Header';
import WardenHomeDetails from '../../components/warden/WardenHomeDetails';
import {
  Users,
  Bed,
  Clock,
  MapPin,
  CheckCircle2,
  DoorOpen, TriangleAlert, RotateCw,
  CalendarCheck, FileText, DollarSign, MessageSquare, QrCode, ChevronRight,
} from 'lucide-react-native';
import moment from 'moment';


// STATIC HOSTEL COORDS (Change these to your hostel's actual location)
const HOSTEL_LAT = 9.1474619;
const HOSTEL_LON = 77.8276993;
const ALLOWED_RADIUS = 50; // meters

const WardenDashboardScreen = ({ navigation }) => {
  const [stats, setStats] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [detailRefresh, setDetailRefresh] = useState(0);
  const [isVerifying, setIsVerifying] = useState(false); // GPS Loading state
  const [isVerified, setIsVerified] = useState(false);   // GPS Success state

  // --- GPS LOGIC ---
  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371e3; 
    const p1 = (lat1 * Math.PI) / 180;
    const p2 = (lat2 * Math.PI) / 180;
    const dp = ((lat2 - lat1) * Math.PI) / 180;
    const dl = ((lon2 - lon1) * Math.PI) / 180;
    const a = Math.sin(dp / 2) ** 2 + Math.cos(p1) * Math.cos(p2) * Math.sin(dl / 2) ** 2;
    return R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
  };

  const handleGPSVerify = async () => {
    setIsVerifying(true);
    try {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Please enable location to verify presence.');
        return;
      }

      let location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      const distance = calculateDistance(
        location.coords.latitude,
        location.coords.longitude,
        HOSTEL_LAT,
        HOSTEL_LON
      );

      if (distance <= ALLOWED_RADIUS) {
        setIsVerified(true);
        Alert.alert('Success', 'Location verified! You are in the hostel.');
        // Optional: Call API to log warden's daily check-in
      } else {
        setIsVerified(false);
        Alert.alert('Out of Range', `You are ${Math.round(distance)}m away from the hostel.`);
      }
    } catch (error) {
      Alert.alert('Error', 'Could not fetch location.');
    } finally {
      setIsVerifying(false);
    }
  };

  // --- API LOGIC ---
  const fetchStats = useCallback(async (force = false) => {
    try {
      const response = await getDashboardResource('/warden/dashboard-stats', {}, { force });
      setStats(response.data.data);
    } catch (error) {
      console.error('Dashboard fetch error:', error);
    }
  }, []);

  useAfterPaintFocusEffect(useCallback(() => {
    fetchStats();
  }, [fetchStats]));

  const onRefresh = () => {
    setDetailRefresh(value => value + 1);
    setRefreshing(true);
    fetchStats(true).finally(() => setRefreshing(false));
  };

  const actions = useMemo(() => [
    { label: 'Attendance', icon: CalendarCheck, onPress: () => navigation.navigate('Attendance') },
    { label: 'Bills', icon: DollarSign, onPress: () => navigation.navigate('More', { screen: 'Bills', initial: false }) },
    { label: 'Complaints', icon: MessageSquare, color: colors.warning, backgroundColor: colors.warningSoft, onPress: () => navigation.navigate('More', { screen: 'Complaints', initial: false }) },
    { label: 'Gate passes', icon: QrCode, onPress: () => navigation.navigate('Requests', { kind: 'passes', request: Date.now() }) },
    { label: 'GPS Attendance', icon: MapPin, color: colors.accent, backgroundColor: colors.accentSoft, onPress: () => navigation.navigate('Attendance', { screen: 'GPSAttendance', initial: false }) },
    { label: 'Leaves', icon: Clock, onPress: () => navigation.navigate('Requests', { kind: 'leave', request: Date.now() }) },
    { label: 'Reductions', icon: FileText, onPress: () => navigation.navigate('Requests', { kind: 'reductions', request: Date.now() }) },
    { label: 'Rooms', icon: Bed, onPress: () => navigation.navigate('More', { screen: 'Rooms', initial: false }) },
    { label: 'Students', icon: Users, onPress: () => navigation.navigate('More', { screen: 'Students', initial: false }) },
  ], [navigation]);

  const pendingLeaves = Number(stats?.pendingLeaves || 0);
  const pendingPasses = Number(stats?.outpasses?.pending || 0);
  const pendingComplaints = Number(stats?.pendingComplaints || 0);
  const pendingTotal = pendingLeaves + pendingPasses + pendingComplaints;
  const reviewRequests = () => navigation.navigate('Requests', {
    kind: pendingLeaves ? 'leave' : pendingPasses ? 'passes' : pendingComplaints ? 'complaints' : 'leave',
    request: Date.now(),
  });

  return <Screen className="flex-1 bg-background">
    <Header />
    <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={[ui.content, styles.content]}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} colors={[colors.primary]} />}>
      <View style={styles.intro}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <View style={styles.roleBadge}><Text style={styles.roleText}>WARDEN</Text></View>
          <Button variant="ghost" accessibilityLabel="Refresh hostel overview" disabled={refreshing} onPress={onRefresh} style={styles.refresh}>
            <RotateCw size={21} color={colors.highlightStart} />
          </Button>
        </View>
        <Text accessibilityRole="header" style={styles.title}>Hostel overview</Text>
        <Text style={styles.date}>{moment().format('dddd, D MMMM')}</Text>
      </View>
      <HighlightCard gradientColors={[colors.highlightEnd, colors.highlightStart]} style={styles.priority}>
        <Text style={styles.priorityEyebrow}>NEXT PRIORITY</Text>
        <View style={styles.priorityContent}>
          <View style={{ flex: 1, minWidth: 0, gap: 5 }}>
            <Text style={styles.priorityTitle}>{stats ? pendingTotal === 1 ? '1 request needs review' : `${pendingTotal} requests need review` : 'Loading requests…'}</Text>
            <Text style={styles.priorityDetail}>{stats ? `${pendingLeaves} leave · ${pendingPasses} gate pass · ${pendingComplaints} complaints` : 'Fetching current review counts'}</Text>
          </View>
          <Button variant="secondary" disabled={!stats} onPress={reviewRequests} style={[highlightStyles.button, styles.reviewButton]}>
            <Text style={styles.reviewText}>Review now</Text><ChevronRight size={17} color={colors.highlightEnd} />
          </Button>
        </View>
      </HighlightCard>
      <View style={styles.metrics}>
        {[
          ['Students', stats?.totalStudents, Users],
          ['Free beds', stats?.availableBeds, DoorOpen],
          ['Pending', stats ? pendingTotal : null, TriangleAlert],
        ].map(([label, value, Icon]) => <Card key={label} style={styles.metric}>
          <Icon size={23} color={colors.highlightStart} />
          <Text adjustsFontSizeToFit minimumFontScale={0.7} numberOfLines={1} style={styles.metricValue}>{value ?? '—'}</Text>
          <Text style={styles.metricLabel}>{label}</Text>
        </Card>)}
      </View>
      <QuickActionsRow actions={actions} />
      <WardenHomeDetails navigation={navigation} refreshToken={detailRefresh} />
      <SectionTitle title="Today's attendance" />
      <Card style={{ gap: 14 }}>
        <AttendanceBreakdown records={stats?.attendanceStatus} />
        <Text style={ui.small}>{stats ? (stats.totalTodayAttendance ?? 0) + ' recorded entries' : 'Loading attendance summary…'}</Text>
      </Card>
      <Card style={{ gap: 14 }}>
        <View style={styles.locationHeading}>
          <View style={styles.locationIcon}><MapPin size={21} color={colors.accent} /></View>
          <View style={{ flex: 1, gap: 4 }}><Text style={ui.sectionTitle}>Your location</Text><Text style={ui.small}>Local check only; does not mark attendance.</Text></View>
        </View>
        <Button onPress={handleGPSVerify} disabled={isVerifying} loading={isVerifying}
          style={isVerified ? { backgroundColor: colors.success } : undefined}>
          {isVerified && <CheckCircle2 size={19} color={colors.card} />}
          <Text style={{ color: colors.card, fontWeight: '700' }}>{isVerified ? 'Location verified' : 'Verify my location'}</Text>
        </Button>
      </Card>
    </ScrollView>
  </Screen>;
};

const styles = StyleSheet.create({
  content: { padding: 20, gap: 12 },
  intro: { gap: 5, marginBottom: 6 },
  roleBadge: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20, backgroundColor: colors.primarySoft },
  roleText: { fontSize: 10, fontWeight: '700', letterSpacing: 0.5, color: colors.highlightStart },
  refresh: { minHeight: 40, minWidth: 40, paddingHorizontal: 8, paddingVertical: 8 },
  title: { color: colors.text, fontSize: typography.pageTitle, lineHeight: 36, fontWeight: '800', letterSpacing: -0.7 },
  date: { color: colors.mutedText, fontSize: 14, lineHeight: 21 },
  metrics: { flexDirection: 'row', gap: 10 },
  metric: { flex: 1, minWidth: 0, padding: 14, gap: 7, borderRadius: 16 },
  metricValue: { color: colors.text, fontSize: 24, lineHeight: 32, fontWeight: '800' },
  metricLabel: { color: colors.mutedText, fontSize: 11 },
  priority: { padding: 20, gap: 12, borderRadius: 22, minHeight: 140, justifyContent: 'center', boxShadow: 'none' },
  priorityEyebrow: { color: colors.highlightDescription, fontSize: 11, fontWeight: '800', letterSpacing: 1 },
  priorityContent: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  priorityTitle: { color: colors.card, fontSize: 20, lineHeight: 27, fontWeight: '700' },
  priorityDetail: { color: colors.highlightDescription, fontSize: 11, lineHeight: 18 },
  reviewButton: { minHeight: 42, paddingHorizontal: 12, paddingVertical: 9, borderRadius: 12, flexWrap: 'nowrap', gap: 2 },
  reviewText: { color: colors.highlightEnd, fontSize: 11, fontWeight: '700' },
  locationHeading: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  locationIcon: { width: 42, height: 42, borderRadius: 12, backgroundColor: colors.accentSoft, alignItems: 'center', justifyContent: 'center' },
});
export default withScreenPermission(WardenDashboardScreen, 'dashboard');
