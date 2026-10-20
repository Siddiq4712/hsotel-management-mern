import QuickActionsRow from '../../components/common/QuickActionsRow';
import Screen from '../../components/common/Screen';
import Button from '../../components/common/Button';
import Card from '../../components/common/Card';
import colors from '../../theme/colors';
import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  useWindowDimensions,
  Alert,
  ActivityIndicator,
} from 'react-native';
import * as Location from 'expo-location'; // 1. Import Location
import { wardenAPI } from '../../api/api';
import Header from '../../components/common/Header';
import {
  Users,
  Bed,
  Clock,
  AlertCircle,
  MapPin, // 2. Import MapPin
  CheckCircle2,
  CalendarCheck, FileText, DollarSign, MessageSquare, QrCode,
} from 'lucide-react-native';
import { LineChart } from 'react-native-chart-kit';


// STATIC HOSTEL COORDS (Change these to your hostel's actual location)
const HOSTEL_LAT = 9.1474619;
const HOSTEL_LON = 77.8276993;
const ALLOWED_RADIUS = 50; // meters

const StatCard = React.memo(({ title, value, icon: Icon, color, subText, onPress }) => (
    <TouchableOpacity
      onPress={onPress}
      disabled={!onPress}
      className="bg-white p-4 rounded-2xl mb-4 border border-gray-200"
    >
      <View className="items-start">
        <View className={`${color} p-3 rounded-xl mb-3`}>
          <Icon size={24} color="white" />
        </View>
        <View className="w-full">
          <Text className="text-gray-500 text-xs font-medium uppercase tracking-wider">
            {title}
          </Text>
          <Text className="text-2xl font-bold text-indigo-900 mt-1">
            {value}
          </Text>
          {subText && (
            <Text className="text-gray-400 text-xs mt-1">
              {subText}
            </Text>
          )}
        </View>
      </View>
    </TouchableOpacity>
  ));

const chartConfig = {
  backgroundGradientFrom: colors.card,
  backgroundGradientTo: colors.card,
  color: (opacity = 1) => colors.withOpacity(colors.primary, opacity),
  strokeWidth: 2,
  propsForDots: { r: '4', strokeWidth: '2', stroke: colors.primary },
};

const attendanceData = {
  labels: ['Aug', 'Sep', 'Oct'],
  datasets: [{ data: [95, 92, 98] }],
};
const AttendanceTrend = React.memo(function AttendanceTrend({ width }) {
  return <LineChart data={attendanceData} width={width} height={200} chartConfig={chartConfig} bezier style={{ borderRadius: 16 }} />;
});

const WardenDashboardScreen = ({ navigation }) => {
  const { width: screenWidth } = useWindowDimensions();
  const [stats, setStats] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
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
  const fetchStats = async () => {
    try {
      const response = await wardenAPI.getDashboardStats();
      setStats(response.data.data);
    } catch (error) {
      console.error('Dashboard fetch error:', error);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchStats().finally(() => setRefreshing(false));
  };

  const actions = useMemo(() => [
    { label: 'Attendance', icon: CalendarCheck, onPress: () => navigation.navigate('Attendance') },
    { label: 'Bills', icon: DollarSign, onPress: () => navigation.navigate('More', { screen: 'Bills', initial: false }) },
    { label: 'Complaints', icon: MessageSquare, color: colors.warning, backgroundColor: colors.warningSoft, onPress: () => navigation.navigate('More', { screen: 'Complaints', initial: false }) },
    { label: 'Gate passes', icon: QrCode, onPress: () => navigation.navigate('GatePasses') },
    { label: 'GPS Attendance', icon: MapPin, color: colors.accent, backgroundColor: colors.accentSoft, onPress: () => navigation.navigate('Attendance', { screen: 'GPSAttendance', initial: false }) },
    { label: 'Leaves', icon: Clock, onPress: () => navigation.navigate('Leaves') },
    { label: 'Reductions', icon: FileText, onPress: () => navigation.navigate('MessReductions') },
    { label: 'Rooms', icon: Bed, onPress: () => navigation.navigate('More', { screen: 'Rooms', initial: false }) },
    { label: 'Students', icon: Users, onPress: () => navigation.navigate('More', { screen: 'Students', initial: false }) },
  ], [navigation]);

  return (
    <Screen className="flex-1 bg-background">
      <Header />
      <ScrollView keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <Text className="text-2xl font-bold text-indigo-900 mb-2">
          Hostel Overview
        </Text>
        <Text className="text-sm text-gray-500 mb-6">Your hostel, at a glance.</Text>

        <QuickActionsRow actions={actions} style={{ marginBottom: 20 }} />

        {/* --- GPS VERIFICATION SECTION --- */}
        <Card className="bg-white p-5 rounded-2xl mb-6 shadow-sm border-2 border-blue-50">
          <View className="flex-row justify-between items-center mb-4">
            <View>
              <Text className="text-lg font-bold text-gray-900">Presence Check</Text>
              <Text className="text-gray-500 text-xs">Verify your location within hostel</Text>
            </View>
            <MapPin size={24} color={isVerified ? colors.success : colors.primary} />
          </View>

          <Button
            onPress={handleGPSVerify}
            disabled={isVerifying}
            className={`py-3 rounded-xl flex-row justify-center items-center ${
              isVerified ? 'bg-green-500' : 'bg-blue-600'
            }`}
          >
            {isVerifying ? (
              <ActivityIndicator color="white" size="small" />
            ) : isVerified ? (
              <>
                <CheckCircle2 size={18} color="white" className="mr-2" />
                <Text className="text-white font-bold ml-2">Location Verified</Text>
              </>
            ) : (
              <Text className="text-white font-bold">Mark My Attendance</Text>
            )}
          </Button>
        </Card>

        {/* --- EXISTING STAT CARDS --- */}
        <View className="flex-row flex-wrap justify-between">
            <View style={{width: '48%'}}>
                <StatCard
                    title="Students"
                    value={stats?.totalStudents || 0}
                    icon={Users}
                    color="bg-blue-500"
                />
            </View>
            <View style={{width: '48%'}}>
                <StatCard
                    title="Beds"
                    value={stats?.availableBeds || 0}
                    icon={Bed}
                    color="bg-green-500"
                />
            </View>
        </View>

        <StatCard
          title="Pending Leaves"
          value={stats?.pendingLeaves || 0}
          icon={Clock}
          color="bg-yellow-500"
          subText="Awaiting approval"
          onPress={() => navigation.navigate('Leaves')}
        />

        <StatCard
          title="Pending Complaints"
          value={stats?.pendingComplaints || 0}
          icon={AlertCircle}
          color="bg-red-500"
          subText="Open issues"
          onPress={() => navigation.navigate('More', { screen: 'Complaints', initial: false })}
        />

        {/* --- CHART SECTION --- */}
        <Card className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 mt-4 mb-10">
          <Text className="text-lg font-bold text-gray-900 mb-4">
            Attendance Trend
          </Text>
          <AttendanceTrend width={Math.max(240, screenWidth - 64)} />
          <Text className="text-xs text-gray-500 mt-3">Illustrative chart · sample values, not live attendance</Text>
        </Card>
      </ScrollView>
    </Screen>
  );
};

export default WardenDashboardScreen;
