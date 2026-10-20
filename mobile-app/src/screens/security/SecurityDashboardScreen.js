import QuickActionsRow from '../../components/common/QuickActionsRow';
import Button from '../../components/common/Button';
import Card from '../../components/common/Card';
import colors from '../../theme/colors';
import React, { useState, useCallback, useMemo, useRef } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { outpassAPI } from '../../api/api';
import { Shield, Scan, Users, ExternalLink, History, RefreshCw, LogOut, KeyRound } from 'lucide-react-native';
import { useAuth } from '../../hooks/useAuth';
import moment from 'moment';

const SecurityDashboardScreen = ({ navigation }) => {
  const { logout } = useAuth();
  const scroll = useRef(null);
  const recentOffset = useRef(0);
  const loadingRef = useRef(false);
  const [stats, setStats] = useState({ exits: 0, returns: 0, outside: 0 });
  const [recentScans, setRecentScans] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchData = useCallback(async () => {
    if (loadingRef.current) return;
    loadingRef.current = true;
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
      loadingRef.current = false;
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [fetchData])
  );

  const actions = useMemo(() => [
    { label: 'Manual token', icon: KeyRound, onPress: () => navigation.navigate('QRScanner', { manual: true }) },
    { label: 'Recent scans', icon: History, onPress: () => scroll.current?.scrollTo({ y: Math.max(0, recentOffset.current - 8), animated: true }) },
    { label: 'Refresh', icon: RefreshCw, disabled: loading, onPress: fetchData },
    { label: 'Scan QR', icon: Scan, onPress: () => navigation.navigate('QRScanner', { manual: false }) },
  ], [navigation, fetchData, loading]);

  return (
    <SafeAreaView className="flex-1 bg-gray-50" edges={['left', 'right', 'bottom']}>
      <ScrollView ref={scroll} contentContainerStyle={{ paddingBottom: 32 }} keyboardShouldPersistTaps="handled" className="flex-1 p-4">
        {/* Header Profile Section */}
        <Card className="flex-row justify-between items-center bg-white p-4 rounded-2xl shadow-sm mb-6 border border-gray-100">
          <View className="flex-row items-center space-x-3">
            <View className="p-2.5 bg-indigo-50 rounded-2xl">
              <Shield size={24} color={colors.primary} />
            </View>
            <View>
              <Text className="text-gray-900 font-bold text-lg">Duty Officer</Text>
              <Text className="text-gray-400 text-xs font-semibold">Security Gate Console</Text>
            </View>
          </View>
          <TouchableOpacity onPress={logout} className="p-2 bg-rose-50 rounded-xl">
            <LogOut size={20} color={colors.danger} />
          </TouchableOpacity>
        </Card>

        <QuickActionsRow actions={actions} style={{ marginBottom: 20 }} />

        {/* Main Scan Trigger */}
        <Button
          onPress={() => navigation.navigate('QRScanner', { manual: false })}
          className="bg-indigo-600 p-6 rounded-xl shadow-sm shadow-indigo-100 items-center justify-center mb-6 flex-row space-x-3"
        >
          <Scan size={28} color={colors.card} />
          <Text className="text-white font-extrabold text-xl">Scan Student QR</Text>
        </Button>

        {/* Stat Cards */}
        <View className="flex-row justify-between mb-6">
          <Card className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm w-[31%] items-center">
            <ExternalLink size={20} color={colors.primary} />
            <Text className="text-gray-400 text-xs mt-1 font-bold uppercase">Outside</Text>
            <Text className="text-violet-700 font-extrabold text-xl mt-1">{stats.outside}</Text>
          </Card>

          <Card className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm w-[31%] items-center">
            <Scan size={20} color={colors.success} />
            <Text className="text-gray-400 text-xs mt-1 font-bold uppercase">Exits Today</Text>
            <Text className="text-emerald-700 font-extrabold text-xl mt-1">{stats.exits}</Text>
          </Card>

          <Card className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm w-[31%] items-center">
            <RefreshCw size={20} color={colors.primary} />
            <Text className="text-gray-400 text-xs mt-1 font-bold uppercase">Returns</Text>
            <Text className="text-blue-700 font-extrabold text-xl mt-1">{stats.returns}</Text>
          </Card>
        </View>

        {/* Recent Scans Section */}
        <Card onLayout={event => { recentOffset.current = event.nativeEvent.layout.y; }} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 mb-8">
          <View className="flex-row items-center space-x-2 mb-4">
            <History size={18} color={colors.mutedText} />
            <Text className="text-gray-800 font-bold text-base">Recent Gate Scans</Text>
          </View>

          {loading ? (
            <ActivityIndicator size="small" color={colors.primary} className="my-6" />
          ) : (
            <View>
              {recentScans.map(item => (
                <View key={item.id} className="flex-row justify-between items-center py-3 border-b border-gray-50">
                  <View>
                    <Text className="text-gray-800 font-bold text-sm">{item.Student?.userName}</Text>
                    <Text className="text-gray-400 text-xs font-semibold">Roll: {item.Student?.roll_number}</Text>
                  </View>
                  <View className="items-end">
                    <Text className={`text-xs font-bold uppercase ${item.status === 'outside' ? 'text-violet-600' : 'text-emerald-600'}`}>
                      {item.status.replace('_', ' ')}
                    </Text>
                    <Text className="text-xs text-gray-400 mt-0.5">
                      {moment(item.updatedAt).format('LT')}
                    </Text>
                  </View>
                </View>
              ))}
              {recentScans.length === 0 && (
                <Text className="text-gray-400 text-sm text-center py-6">No scans recorded today</Text>
              )}
            </View>
          )}
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
};

export default SecurityDashboardScreen;
