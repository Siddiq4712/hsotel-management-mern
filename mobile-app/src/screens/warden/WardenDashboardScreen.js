import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { wardenAPI } from '../../api/api';
import Header from '../../components/common/Header';
import {
  Users,
  Bed,
  Clock,
  AlertCircle,
} from 'lucide-react-native';
import { LineChart } from 'react-native-chart-kit';

const screenWidth = Dimensions.get('window').width;

const WardenDashboardScreen = ({ navigation }) => {
  const [stats, setStats] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

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
    propsForDots: {
      r: '4',
      strokeWidth: '2',
      stroke: '#3B82F6',
    },
  };

  const attendanceData = {
    labels: ['Aug', 'Sep', 'Oct'],
    datasets: [
      {
        data: [95, 92, 98],
      },
    ],
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

        <View className="mb-4">
          <StatCard
            title="Total Students"
            value={stats?.totalStudents || 0}
            icon={Users}
            color="bg-blue-500"
            subText="Active"
          />
          <StatCard
            title="Available Beds"
            value={stats?.availableBeds || 0}
            icon={Bed}
            color="bg-green-500"
            subText="Vacant"
          />
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

        <View className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 mt-4">
          <Text className="text-lg font-bold text-gray-900 mb-4">
            Attendance Trend
          </Text>
          <LineChart
            data={attendanceData}
            width={screenWidth - 64}
            height={220}
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
