import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, RefreshControl, TouchableOpacity } from 'react-native';
import { wardenAPI } from '../../api/api';
import Header from '../../components/common/Header';
import { Users, Bed, Clock, AlertCircle } from 'lucide-react-native';

const WardenDashboardScreen = ({ navigation }) => {
  const [stats, setStats] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchStats = async () => {
    try {
      const response = await wardenAPI.getDashboardStats();
      setStats(response.data.data);
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => { fetchStats(); }, []);

  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    fetchStats().then(() => setRefreshing(false));
  }, []);

  const StatCard = ({ title, value, icon: Icon, color, subText }) => (
    <View className="bg-white p-5 rounded-2xl mb-4 shadow-sm border border-gray-100 flex-row items-center">
      <View className={`p-3 rounded-xl ${color} mr-4`}>
        <Icon size={24} color="white" />
      </View>
      <View>
        <Text className="text-gray-500 text-xs font-medium uppercase tracking-wider">{title}</Text>
        <Text className="text-2xl font-bold text-gray-900">{value}</Text>
        {subText && <Text className="text-gray-400 text-[10px] mt-1">{subText}</Text>}
      </View>
    </View>
  );

  return (
    <View className="flex-1 bg-gray-50">
      <Header />
      <ScrollView 
        contentContainerStyle={{ padding: 16 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <Text className="text-2xl font-bold text-gray-900 mb-6">Hostel Overview</Text>
        
        <View className="flex-row flex-wrap justify-between">
          <View className="w-[48%]">
            <StatCard title="Students" value={stats?.totalStudents || 0} icon={Users} color="bg-blue-500" />
          </View>
          <View className="w-[48%]">
            <StatCard title="Vacant" value={stats?.availableBeds || 0} icon={Bed} color="bg-green-500" />
          </View>
        </View>

        <TouchableOpacity onPress={() => navigation.navigate('Leaves')}>
          <StatCard title="Pending Leaves" value={stats?.pendingLeaves || 0} icon={Clock} color="bg-orange-500" subText="Requires your approval" />
        </TouchableOpacity>

        <TouchableOpacity onPress={() => navigation.navigate('Complaints')}>
          <StatCard title="Open Complaints" value={stats?.pendingComplaints || 0} icon={AlertCircle} color="bg-red-500" subText="Maintenance or Mess issues" />
        </TouchableOpacity>

        <View className="bg-indigo-600 p-6 rounded-3xl mt-4 shadow-lg shadow-indigo-300">
          <Text className="text-white text-lg font-bold">Quick Task</Text>
          <Text className="text-indigo-100 mt-1">Don't forget to mark today's attendance before 9:00 PM.</Text>
          <TouchableOpacity 
            onPress={() => navigation.navigate('Attendance')}
            className="bg-white mt-4 py-3 rounded-xl items-center"
          >
            <Text className="text-indigo-600 font-bold">Go to Attendance</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
};

export default WardenDashboardScreen;