import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Image, Alert } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { parentAPI } from '../../api/api';
import { useAuth } from '../../hooks/useAuth';
import { Picker } from '@react-native-picker/picker';
import { User, Building, Calendar, IndianRupee, Bell, Info, LogOut } from 'lucide-react-native';
import moment from 'moment';

const ParentDashboardScreen = () => {
  const { logout } = useAuth();
  const [students, setStudents] = useState([]);
  const [selectedStudentId, setSelectedStudentId] = useState(null);
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [notifications, setNotifications] = useState([]);

  const fetchStudents = async () => {
    try {
      const res = await parentAPI.getStudents();
      const list = res.data.data || [];
      setStudents(list);
      if (list.length > 0) {
        setSelectedStudentId(list[0].userId);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchDashboard = useCallback(async () => {
    if (!selectedStudentId) return;
    setLoading(true);
    try {
      const res = await parentAPI.getStudentDashboard(selectedStudentId);
      setDashboardData(res.data.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [selectedStudentId]);

  const fetchNotifications = async () => {
    try {
      const res = await parentAPI.getNotifications();
      setNotifications((res.data.data || []).slice(0, 5));
    } catch (err) {
      console.error(err);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchStudents();
      fetchNotifications();
    }, [])
  );

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  const handleMarkRead = async (id) => {
    try {
      await parentAPI.markNotificationRead(id);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, status: 'read' } : n));
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-gray-50" edges={['top', 'left', 'right']}>
      <ScrollView className="flex-1 p-4">

        {/* Header Console Banner */}
        <View className="bg-white p-4 rounded-3xl border border-gray-100 shadow-sm mb-6 flex-row justify-between items-center">
          <View className="flex-row items-center space-x-3">
            <View className="p-2.5 bg-blue-50 rounded-2xl">
              <User size={24} color="#2563EB" />
            </View>
            <View>
              <Text className="text-gray-900 font-extrabold text-base">Parent Portal</Text>
              <Text className="text-gray-400 text-xs font-semibold">Monitoring Console</Text>
            </View>
          </View>
          <TouchableOpacity onPress={logout} className="p-2 bg-rose-50 rounded-xl">
            <LogOut size={20} color="#EF4444" />
          </TouchableOpacity>
        </View>

        {/* Student Selector Dropdown */}
        {students.length > 1 && (
          <View className="bg-white rounded-2xl border border-gray-100 shadow-sm mb-6 overflow-hidden">
            <Picker
              selectedValue={selectedStudentId}
              onValueChange={setSelectedStudentId}
              style={{ height: 50, width: '100%' }}
            >
              {students.map(s => (
                <Picker.Item key={s.userId} label={`${s.userName} (${s.roll_number})`} value={s.userId} />
              ))}
            </Picker>
          </View>
        )}

        {loading ? (
          <ActivityIndicator size="large" color="#2563EB" className="my-10" />
        ) : dashboardData ? (
          <View className="space-y-6">

            {/* Student Profile Card */}
            <View className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm flex-row items-center space-x-4">
              <Image
                source={dashboardData.student?.profile_picture ? { uri: dashboardData.student.profile_picture } : require('../../../assets/adaptive-icon.png')}
                className="w-16 h-16 rounded-2xl border border-gray-200 shrink-0"
              />
              <View className="flex-1">
                <Text className="text-gray-900 font-extrabold text-base">{dashboardData.student?.userName}</Text>
                <Text className="text-gray-400 text-xs mt-0.5">Roll No: {dashboardData.student?.roll_number}</Text>
                <View className="flex-row items-center mt-2 space-x-2">
                  <Building size={14} color="#3B82F6" />
                  <Text className="text-gray-700 text-xs font-bold">{dashboardData.student?.Hostel?.name || 'Assigned Hostel'}</Text>
                </View>
              </View>
            </View>

            {/* Attendance & Dues Row */}
            <View className="flex-row justify-between">
              {/* Attendance Card */}
              <View className="bg-white p-4 rounded-3xl border border-gray-100 shadow-sm w-[48%] items-center justify-between">
                <Text className="text-gray-400 text-[10px] font-extrabold uppercase">Attendance</Text>
                <Text className="text-blue-600 font-extrabold text-2xl my-2">
                  {dashboardData.attendanceSummary.total ? Math.round((dashboardData.attendanceSummary.present / dashboardData.attendanceSummary.total) * 100) : 0}%
                </Text>
                <Text className="text-gray-500 text-[10px] font-semibold">
                  Pres: {dashboardData.attendanceSummary.present} / {dashboardData.attendanceSummary.total} days
                </Text>
              </View>

              {/* Dues Card */}
              <View className="bg-white p-4 rounded-3xl border border-gray-100 shadow-sm w-[48%] items-center justify-between">
                <Text className="text-gray-400 text-[10px] font-extrabold uppercase">Outstanding Dues</Text>
                <Text className="text-rose-600 font-extrabold text-2xl my-2">
                  ₹{(
                    dashboardData.fees.filter(f => f.status !== 'paid').reduce((sum, f) => sum + parseFloat(f.amount), 0) +
                    dashboardData.messBills.filter(b => b.status !== 'paid').reduce((sum, b) => sum + parseFloat(b.total_amount), 0)
                  ).toFixed(0)}
                </Text>
                <Text className="text-gray-400 text-[9px] font-bold text-center">Unpaid Fees & Mess Bills</Text>
              </View>
            </View>

            {/* Live Feed alerts */}
            <View className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm">
              <View className="flex-row items-center space-x-2 mb-4">
                <Bell size={18} color="#2563EB" />
                <Text className="text-gray-900 font-extrabold text-base">Alerts Feed</Text>
              </View>
              {notifications.map(item => (
                <View key={item.id} className="flex-row justify-between items-start py-3 border-b border-gray-50 last:border-0">
                  <View className="flex-1 mr-2">
                    <Text className={`text-sm font-bold ${item.status === 'unread' ? 'text-blue-700' : 'text-gray-700'}`}>
                      {item.title}
                    </Text>
                    <Text className="text-gray-400 text-xs mt-0.5">{item.message}</Text>
                  </View>
                  {item.status === 'unread' && (
                    <TouchableOpacity onPress={() => handleMarkRead(item.id)} className="px-2.5 py-1 bg-blue-50 rounded-lg">
                      <Text className="text-[10px] text-blue-600 font-bold">Acknowledge</Text>
                    </TouchableOpacity>
                  )}
                </View>
              ))}
            </View>

            {/* Announcements Card */}
            <View className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm mb-8">
              <View className="flex-row items-center space-x-2 mb-4">
                <Info size={18} color="#2563EB" />
                <Text className="text-gray-900 font-extrabold text-base">Hostel Notices</Text>
              </View>
              {dashboardData.notices?.slice(0, 3).map(item => (
                <View key={item.id} className="py-3 border-b border-gray-50 last:border-0">
                  <Text className="text-gray-800 font-bold text-sm">{item.title}</Text>
                  <Text className="text-gray-400 text-xs mt-1 leading-relaxed">{item.content}</Text>
                  <Text className="text-gray-400 text-[10px] mt-2 block text-right">{moment(item.createdAt).format('LL')}</Text>
                </View>
              ))}
            </View>

          </View>
        ) : (
          <Text className="text-gray-400 text-center my-10 font-bold">No student mapping found</Text>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

export default ParentDashboardScreen;
