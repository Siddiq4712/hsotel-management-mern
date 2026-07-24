import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, FlatList } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { outpassAPI } from '../../api/api';
import { Shield, Scan, Users, ExternalLink, History, RefreshCw, LogOut } from 'lucide-react-native';
import { useAuth } from '../../hooks/useAuth';
import moment from 'moment';

const SecurityDashboardScreen = ({ navigation }) => {
  const { logout } = useAuth();
  const [stats, setStats] = useState({ exits: 0, returns: 0, outside: 0 });
  const [recentScans, setRecentScans] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [activityRes, outsideRes, scansRes] = await Promise.all([
        outpassAPI.getTodayGateActivity(),
        outpassAPI.getStudentsCurrentlyOutside(),
        outpassAPI.getRecentScans()
      ]);

      const activities = activityRes.data.data || [];
      const outsideList = outsideRes.data.data || [];

      const exitsToday = activities.filter(a => a.exit_time).length;
      const returnsToday = activities.filter(a => a.return_time).length;

      setStats({
        exits: exitsToday,
        returns: returnsToday,
        outside: outsideList.length
      });

      setRecentScans((scansRes.data.data || []).slice(0, 10));
    } catch (error) {
      console.error('Error fetching security dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [])
  );

  return (
    <SafeAreaView className="flex-1 bg-gray-50" edges={['top', 'left', 'right']}>
      <ScrollView className="flex-1 p-4">
        {/* Header Profile Section */}
        <View className="flex-row justify-between items-center bg-white p-4 rounded-3xl shadow-sm mb-6 border border-gray-100">
          <View className="flex-row items-center space-x-3">
            <View className="p-2.5 bg-indigo-50 rounded-2xl">
              <Shield size={24} color="#4F46E5" />
            </View>
            <View>
              <Text className="text-gray-900 font-bold text-lg">Duty Officer</Text>
              <Text className="text-gray-400 text-xs font-semibold">Security Gate Console</Text>
            </View>
          </View>
          <TouchableOpacity onPress={logout} className="p-2 bg-rose-50 rounded-xl">
            <LogOut size={20} color="#EF4444" />
          </TouchableOpacity>
        </View>

        {/* Main Scan Trigger */}
        <TouchableOpacity 
          onPress={() => navigation.navigate('QRScanner')}
          className="bg-indigo-600 p-6 rounded-[32px] shadow-lg shadow-indigo-100 items-center justify-center mb-6 flex-row space-x-3"
        >
          <Scan size={28} color="#fff" />
          <Text className="text-white font-extrabold text-xl">Scan Student QR</Text>
        </TouchableOpacity>

        {/* Stat Cards */}
        <View className="flex-row justify-between mb-6">
          <View className="bg-white p-4 rounded-3xl border border-gray-100 shadow-sm w-[31%] items-center">
            <ExternalLink size={20} color="#7C3AED" />
            <Text className="text-gray-400 text-[10px] mt-1 font-bold uppercase">Outside</Text>
            <Text className="text-violet-700 font-extrabold text-xl mt-1">{stats.outside}</Text>
          </View>

          <View className="bg-white p-4 rounded-3xl border border-gray-100 shadow-sm w-[31%] items-center">
            <Scan size={20} color="#10B981" />
            <Text className="text-gray-400 text-[10px] mt-1 font-bold uppercase">Exits Today</Text>
            <Text className="text-emerald-700 font-extrabold text-xl mt-1">{stats.exits}</Text>
          </View>

          <View className="bg-white p-4 rounded-3xl border border-gray-100 shadow-sm w-[31%] items-center">
            <RefreshCw size={20} color="#3B82F6" />
            <Text className="text-gray-400 text-[10px] mt-1 font-bold uppercase">Returns</Text>
            <Text className="text-blue-700 font-extrabold text-xl mt-1">{stats.returns}</Text>
          </View>
        </View>

        {/* Recent Scans Section */}
        <View className="bg-white rounded-3xl border border-gray-100 shadow-sm p-4 mb-8">
          <View className="flex-row items-center space-x-2 mb-4">
            <History size={18} color="#4B5563" />
            <Text className="text-gray-800 font-bold text-base">Recent Gate Scans</Text>
          </View>

          {loading ? (
            <ActivityIndicator size="small" color="#4F46E5" className="my-6" />
          ) : (
            <FlatList
              data={recentScans}
              keyExtractor={(item) => item.id.toString()}
              scrollEnabled={false}
              renderItem={({ item }) => (
                <View className="flex-row justify-between items-center py-3 border-b border-gray-50">
                  <View>
                    <Text className="text-gray-800 font-bold text-sm">{item.Student?.userName}</Text>
                    <Text className="text-gray-400 text-xs font-semibold">Roll: {item.Student?.roll_number}</Text>
                  </View>
                  <View className="items-end">
                    <Text className={`text-xs font-bold uppercase ${item.status === 'outside' ? 'text-violet-600' : 'text-emerald-600'}`}>
                      {item.status.replace('_', ' ')}
                    </Text>
                    <Text className="text-[10px] text-gray-400 mt-0.5">
                      {moment(item.updatedAt).format('LT')}
                    </Text>
                  </View>
                </View>
              )}
              ListEmptyComponent={
                <Text className="text-gray-400 text-sm text-center py-6">No scans recorded today</Text>
              }
            />
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default SecurityDashboardScreen;
