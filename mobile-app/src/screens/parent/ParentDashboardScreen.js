import QuickActionsRow from '../../components/common/QuickActionsRow';
import Card from '../../components/common/Card';
import colors from '../../theme/colors';
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Image, Alert } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { parentAPI } from '../../api/api';
import { useAuth } from '../../hooks/useAuth';
import { Picker } from '@react-native-picker/picker';
import { User, Building, Calendar, IndianRupee, Bell, Info, LogOut, RefreshCw } from 'lucide-react-native';
import moment from 'moment';

const ParentDashboardScreen = () => {
  const { logout } = useAuth();
  const scroll = useRef(null);
  const bodyOffset = useRef(0);
  const sectionPositions = useRef({});
  const dashboardRequest = useRef(0);
  const [students, setStudents] = useState([]);
  const [selectedStudentId, setSelectedStudentId] = useState(null);
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [notifications, setNotifications] = useState([]);

  const fetchStudents = useCallback(async () => {
    try {
      const res = await parentAPI.getStudents();
      const list = res.data.data || [];
      setStudents(list);
      setSelectedStudentId(current => list.some(student => String(student.userId) === String(current)) ? current : (list[0]?.userId ?? null));
    } catch (err) {
      console.error(err);
    }
  }, []);

  const fetchDashboard = useCallback(async () => {
    if (!selectedStudentId) { setDashboardData(null); setLoading(false); return; }
    const request = ++dashboardRequest.current;
    setLoading(true);
    try {
      const res = await parentAPI.getStudentDashboard(selectedStudentId);
      if (request === dashboardRequest.current) setDashboardData(res.data.data);
    } catch (err) {
      console.error(err);
    } finally {
      if (request === dashboardRequest.current) setLoading(false);
    }
  }, [selectedStudentId]);

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await parentAPI.getNotifications();
      setNotifications((res.data.data || []).slice(0, 5));
    } catch (err) {
      console.error(err);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchStudents();
      fetchNotifications();
    }, [fetchStudents, fetchNotifications])
  );

  useFocusEffect(useCallback(() => {
    fetchDashboard();
    return () => { dashboardRequest.current += 1; };
  }, [fetchDashboard]));

  const handleMarkRead = async (id) => {
    try {
      await parentAPI.markNotificationRead(id);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, status: 'read' } : n));
    } catch (err) {
      console.error(err);
    }
  };

  const scrollToSection = useCallback(key => {
    const offset = sectionPositions.current[key];
    if (offset != null) scroll.current?.scrollTo({ y: Math.max(0, bodyOffset.current + offset - 8), animated: true });
  }, []);
  const rememberSection = key => event => { sectionPositions.current[key] = event.nativeEvent.layout.y; };
  const hasCurrentStudent = dashboardData && String(dashboardData.student?.userId) === String(selectedStudentId);
  const actions = useMemo(() => [
    { label: 'Attendance', icon: Calendar, disabled: loading || !hasCurrentStudent, onPress: () => scrollToSection('summary') },
    { label: 'Fees', icon: IndianRupee, disabled: loading || !hasCurrentStudent, onPress: () => scrollToSection('summary') },
    { label: 'Notices', icon: Info, disabled: loading || !hasCurrentStudent, onPress: () => scrollToSection('notices') },
    { label: 'Notifications', icon: Bell, disabled: loading || !hasCurrentStudent, onPress: () => scrollToSection('notifications') },
    { label: 'Refresh', icon: RefreshCw, disabled: loading, onPress: () => { fetchDashboard(); fetchNotifications(); } },
  ], [loading, hasCurrentStudent, scrollToSection, fetchDashboard, fetchNotifications]);
  const outstandingDues = useMemo(() => dashboardData ? (
    dashboardData.fees.filter(f => f.status !== 'paid').reduce((sum, f) => sum + parseFloat(f.amount), 0) +
    dashboardData.messBills.filter(b => b.status !== 'paid').reduce((sum, b) => sum + parseFloat(b.total_amount), 0)
  ).toFixed(0) : '0', [dashboardData]);

  return (
    <SafeAreaView className="flex-1 bg-gray-50" edges={['left', 'right', 'bottom']}>
      <ScrollView ref={scroll} contentContainerStyle={{ paddingBottom: 32 }} keyboardShouldPersistTaps="handled" className="flex-1 p-4">

        {/* Header Console Banner */}
        <Card className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm mb-6 flex-row justify-between items-center">
          <View className="flex-row items-center space-x-3">
            <View className="p-2.5 bg-blue-50 rounded-2xl">
              <User size={24} color={colors.primary} />
            </View>
            <View>
              <Text className="text-gray-900 font-extrabold text-base">Parent Portal</Text>
              <Text className="text-gray-400 text-xs font-semibold">Monitoring Console</Text>
            </View>
          </View>
          <TouchableOpacity onPress={logout} className="p-2 bg-rose-50 rounded-xl">
            <LogOut size={20} color={colors.danger} />
          </TouchableOpacity>
        </Card>

        <QuickActionsRow actions={actions} style={{ marginBottom: 20 }} />

        {/* Student Selector Dropdown */}
        {students.length > 1 && (
          <Card className="bg-white rounded-2xl border border-gray-100 shadow-sm mb-6 overflow-hidden">
            <Picker
              selectedValue={selectedStudentId}
              onValueChange={setSelectedStudentId}
              style={{ height: 50, width: '100%' }}
            >
              {students.map(s => (
                <Picker.Item key={s.userId} label={`${s.userName} (${s.roll_number})`} value={s.userId} />
              ))}
            </Picker>
          </Card>
        )}

        {loading ? (
          <ActivityIndicator size="large" color={colors.primary} className="my-10" />
        ) : hasCurrentStudent ? (
          <View className="gap-4" onLayout={event => { bodyOffset.current = event.nativeEvent.layout.y; }}>

            {/* Student Profile Card */}
            <Card className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex-row items-center space-x-4">
              <Image
                source={dashboardData.student?.profile_picture ? { uri: dashboardData.student.profile_picture } : require('../../../assets/adaptive-icon.png')}
                className="w-16 h-16 rounded-2xl border border-gray-200 shrink-0"
              />
              <View className="flex-1">
                <Text className="text-gray-900 font-extrabold text-base">{dashboardData.student?.userName}</Text>
                <Text className="text-gray-400 text-xs mt-0.5">Roll No: {dashboardData.student?.roll_number}</Text>
                <View className="flex-row items-center mt-2 space-x-2">
                  <Building size={14} color={colors.primary} />
                  <Text className="text-gray-700 text-xs font-bold">{dashboardData.student?.Hostel?.name || 'Assigned Hostel'}</Text>
                </View>
              </View>
            </Card>

            {/* Attendance & Dues Row */}
            <View className="flex-row justify-between" onLayout={rememberSection('summary')}>
              {/* Attendance Card */}
              <Card className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm w-[48%] items-center justify-between">
                <Text className="text-gray-400 text-xs font-extrabold uppercase">Attendance</Text>
                <Text className="text-blue-600 font-extrabold text-2xl my-2">
                  {dashboardData.attendanceSummary.total ? Math.round((dashboardData.attendanceSummary.present / dashboardData.attendanceSummary.total) * 100) : 0}%
                </Text>
                <Text className="text-gray-500 text-xs font-semibold">
                  Pres: {dashboardData.attendanceSummary.present} / {dashboardData.attendanceSummary.total} days
                </Text>
              </Card>

              {/* Dues Card */}
              <Card className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm w-[48%] items-center justify-between">
                <Text className="text-gray-400 text-xs font-extrabold uppercase">Outstanding Dues</Text>
                <Text className="text-rose-600 font-extrabold text-2xl my-2">
                  ₹{outstandingDues}
                </Text>
                <Text className="text-gray-400 text-xs font-bold text-center">Unpaid Fees & Mess Bills</Text>
              </Card>
            </View>

            {/* Live Feed alerts */}
            <Card onLayout={rememberSection('notifications')} className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
              <View className="flex-row items-center space-x-2 mb-4">
                <Bell size={18} color={colors.primary} />
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
                    <TouchableOpacity onPress={() => handleMarkRead(item.id)} className="px-2.5 py-1 bg-blue-50 rounded-xl">
                      <Text className="text-xs text-blue-600 font-bold">Acknowledge</Text>
                    </TouchableOpacity>
                  )}
                </View>
              ))}
            </Card>

            {/* Announcements Card */}
            <Card onLayout={rememberSection('notices')} className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm mb-8">
              <View className="flex-row items-center space-x-2 mb-4">
                <Info size={18} color={colors.primary} />
                <Text className="text-gray-900 font-extrabold text-base">Hostel Notices</Text>
              </View>
              {dashboardData.notices?.slice(0, 3).map(item => (
                <View key={item.id} className="py-3 border-b border-gray-50 last:border-0">
                  <Text className="text-gray-800 font-bold text-sm">{item.title}</Text>
                  <Text className="text-gray-400 text-xs mt-1 leading-relaxed">{item.content}</Text>
                  <Text className="text-gray-400 text-xs mt-2 block text-right">{moment(item.createdAt).format('LL')}</Text>
                </View>
              ))}
            </Card>

          </View>
        ) : (
          <Text className="text-gray-400 text-center my-10 font-bold">{students.length ? 'Unable to load student details. Use Refresh to try again.' : 'No student mapping found'}</Text>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

export default ParentDashboardScreen;
