import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Dimensions,
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
} from 'lucide-react-native';
import { LineChart } from 'react-native-chart-kit';

const screenWidth = Dimensions.get('window').width;

// STATIC HOSTEL COORDS (Change these to your hostel's actual location)
const HOSTEL_LAT = 12.9716;
const HOSTEL_LON = 77.5946;
const ALLOWED_RADIUS = 50; // meters

const WardenDashboardScreen = ({ navigation }) => {
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

  // --- UI COMPONENTS ---
  const StatCard = ({ title, value, icon: Icon, color, subText, onPress }) => (
    <TouchableOpacity
      onPress={onPress}
      disabled={!onPress}
      className="bg-white p-5 rounded-2xl mb-4 shadow-sm border border-gray-100"
    >
      <View className="flex-row items-center">
        <View className={`${color} p-3 rounded-xl mr-4`}>
          <Icon size={24} color="white" />
        </View>
        <View className="flex-1">
          <Text className="text-gray-500 text-xs font-medium uppercase tracking-wider">
            {title}
          </Text>
          <Text className="text-2xl font-bold text-gray-900 mt-1">
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
  );

  const chartConfig = {
    backgroundGradientFrom: '#FFFFFF',
    backgroundGradientTo: '#FFFFFF',
    color: (opacity = 1) => `rgba(59, 130, 246, ${opacity})`,
    strokeWidth: 2,
    propsForDots: { r: '4', strokeWidth: '2', stroke: '#3B82F6' },
  };

  const attendanceData = {
    labels: ['Aug', 'Sep', 'Oct'],
    datasets: [{ data: [95, 92, 98] }],
  };

  return (
    <View className="flex-1 bg-gray-50">
      <Header />
      <ScrollView
        contentContainerStyle={{ padding: 16 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <Text className="text-2xl font-bold text-gray-900 mb-6">
          Hostel Overview
        </Text>

        {/* --- GPS VERIFICATION SECTION --- */}
        <View className="bg-white p-5 rounded-3xl mb-6 shadow-md border-2 border-blue-50">
          <View className="flex-row justify-between items-center mb-4">
            <View>
              <Text className="text-lg font-bold text-gray-900">Presence Check</Text>
              <Text className="text-gray-500 text-xs">Verify your location within hostel</Text>
            </View>
            <MapPin size={24} color={isVerified ? "#10B981" : "#3B82F6"} />
          </View>

          <TouchableOpacity
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
          </TouchableOpacity>
        </View>

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
          onPress={() => navigation.navigate('Complaints')}
        />

        {/* --- CHART SECTION --- */}
        <View className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 mt-4 mb-10">
          <Text className="text-lg font-bold text-gray-900 mb-4">
            Attendance Trend
          </Text>
          <LineChart
            data={attendanceData}
            width={screenWidth - 64}
            height={200}
            chartConfig={chartConfig}
            bezier
            style={{ borderRadius: 16 }}
          />
        </View>
      </ScrollView>
    </View>
  );
};

export default WardenDashboardScreen;