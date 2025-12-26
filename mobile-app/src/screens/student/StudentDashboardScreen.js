import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, ActivityIndicator, Alert, TouchableOpacity } from 'react-native';
import { studentAPI } from '../../api/api';
import { useAuth } from '../../hooks/useAuth';
import { User, Bed, Receipt, Calendar, Users, Home, CreditCard, FileText, Clock, Utensils, CheckCircle, XCircle, AlertCircle } from 'lucide-react-native';
import { BarChart, LineChart } from 'react-native-chart-kit';
import { Dimensions } from 'react-native';
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

  const processMessExpenseData = useCallback((data) => {
    const labels = [];
    const expenses = [];
    const allMonths = [];
    for (let i = 11; i >= 0; i--) {
      const monthMoment = moment().subtract(i, 'months');
      allMonths.push({
        year: monthMoment.year(),
        month: monthMoment.month() + 1,
      });
    }

    allMonths.forEach((m) => {
      const monthData = data.find(
        (item) => item.year === m.year && item.month === m.month
      );
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

    const allMonths = [];
    for (let i = 11; i >= 0; i--) {
      const monthMoment = moment().subtract(i, 'months');
      allMonths.push({
        year: monthMoment.year(),
        month: monthMoment.month() + 1,
      });
    }

    allMonths.forEach((m) => {
      const monthData = data.find(
        (item) => item.year === m.year && item.month === m.month
      );
      labels.push(moment().year(m.year).month(m.month - 1).format('MMM'));
      
      if (monthData) {
        const presentCount = parseInt(monthData.present_days || 0);
        const totalManDays = parseInt(monthData.totalManDays || 0);
        const maxAttendanceValue = Math.max(presentCount, totalManDays);
        
        attendanceDays.push(maxAttendanceValue);
        absentDays.push(parseInt(monthData.absent_days || 0));
        onDutyDays.push(parseInt(monthData.on_duty_days || 0));
      } else {
        attendanceDays.push(0);
        absentDays.push(0);
        onDutyDays.push(0);
      }
    });

    setAttendanceChartData({
      labels: labels,
      datasets: [
        { data: attendanceDays, color: (opacity = 1) => `rgba(16, 185, 129, ${opacity})` },
        { data: absentDays, color: (opacity = 1) => `rgba(239, 68, 68, ${opacity})` },
        { data: onDutyDays, color: (opacity = 1) => `rgba(59, 130, 246, ${opacity})` },
      ],
      legend: ['Present', 'Absent', 'On Duty']
    });
  }, []);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setChartLoading(true);
    try {
      const profileResponse = await studentAPI.getProfile();
      const profileData = profileResponse.data.data || null;
      setProfile(profileData);
      
      if (profileData?.tbl_RoomAllotments?.[0]?.HostelRoom?.id) {
        const roommatesResponse = await studentAPI.getRoommates();
        if (roommatesResponse?.data?.data) {
          setRoommates(roommatesResponse.data.data.filter(mate => mate.id !== user.id));
        }
      }

      const today = moment().format('YYYY-MM-DD');
      const attendanceResponse = await studentAPI.getMyAttendance({ date: today });
      setTodayAttendance(attendanceResponse.data.data?.[0] || null);

      const messResponse = await studentAPI.getMonthlyMessExpensesChart();
      if (messResponse.data.success) {
        processMessExpenseData(messResponse.data.data);
      }

      const attendanceChartResponse = await studentAPI.getMonthlyAttendanceChart();
      if (attendanceChartResponse.data.success) {
        processAttendanceData(attendanceChartResponse.data.data);
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      Alert.alert('Error', error.message || 'Failed to load dashboard data.');
    } finally {
      setLoading(false);
      setChartLoading(false);
    }
  }, [user, processMessExpenseData, processAttendanceData]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const getStatusDisplay = (status) => {
    switch (status) {
      case 'P':
        return { 
          icon: <CheckCircle color="#10b981" size={24} />, 
          text: 'Present', 
          bgColor: '#f0fdf4',
          borderColor: '#10b981',
          textColor: '#065f46'
        };
      case 'A':
        return { 
          icon: <XCircle color="#ef4444" size={24} />, 
          text: 'Absent', 
          bgColor: '#fef2f2',
          borderColor: '#ef4444',
          textColor: '#991b1b'
        };
      case 'OD':
        return { 
          icon: <Clock color="#3b82f6" size={24} />, 
          text: 'On Duty', 
          bgColor: '#eff6ff',
          borderColor: '#3b82f6',
          textColor: '#1e40af'
        };
      default:
        return { 
          icon: <AlertCircle color="#6b7280" size={24} />, 
          text: 'Not Marked', 
          bgColor: '#f9fafb',
          borderColor: '#d1d5db',
          textColor: '#4b5563'
        };
    }
  };

  const statusInfo = todayAttendance ? getStatusDisplay(todayAttendance.status) : getStatusDisplay(null);
  const roomInfo = profile?.tbl_RoomAllotments?.[0]?.HostelRoom;
  const roomType = roomInfo?.RoomType || roomInfo?.tbl_RoomType;

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#ffffff' }}>
        <ActivityIndicator size="large" color="#2563eb" />
        <Text style={{ marginTop: 16, fontSize: 16, color: '#6b7280' }}>Loading dashboard...</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#f8fafc' }}>
      <Header />
      <ScrollView style={{ padding: 16 }}>
        {/* Header Section */}
        <View style={{ marginBottom: 24 }}>
          <Text style={{ fontSize: 28, fontWeight: '700', color: '#0f172a', marginBottom: 4 }}>
            Dashboard
          </Text>
          <Text style={{ fontSize: 14, color: '#64748b' }}>
            {moment().format('dddd, MMMM D, YYYY')}
          </Text>
        </View>

        {/* Today's Attendance Status */}
        <View style={{ 
          backgroundColor: '#ffffff', 
          borderRadius: 12, 
          padding: 20,
          marginBottom: 16,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: 0.05,
          shadowRadius: 3,
          elevation: 2,
        }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
            <Calendar color="#2563eb" size={20} />
            <Text style={{ fontSize: 16, fontWeight: '600', color: '#0f172a', marginLeft: 8 }}>
              Today's Attendance
            </Text>
          </View>
          <View style={{ 
            borderRadius: 8, 
            borderWidth: 1,
            borderLeftWidth: 4,
            padding: 16, 
            flexDirection: 'row', 
            alignItems: 'center',
            backgroundColor: statusInfo.bgColor,
            borderColor: statusInfo.borderColor,
          }}>
            <View style={{ marginRight: 16 }}>
              {statusInfo.icon}
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontWeight: '600', fontSize: 16, color: statusInfo.textColor }}>
                {statusInfo.text}
              </Text>
              <Text style={{ fontSize: 13, color: '#64748b', marginTop: 2 }}>
                {todayAttendance ? 
                  `Marked on ${moment(todayAttendance.date).format('MMM DD, YYYY')}` : 
                  'Attendance has not been marked yet'
                }
              </Text>
            </View>
          </View>
        </View>

        {/* Stats Grid */}
        <View style={{ flexDirection: 'row', marginBottom: 16, gap: 12 }}>
          {/* Hostel Info */}
          <View style={{ 
            flex: 1,
            backgroundColor: '#ffffff', 
            borderRadius: 12, 
            padding: 16,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.05,
            shadowRadius: 3,
            elevation: 2,
          }}>
            <View style={{ 
              width: 40, 
              height: 40, 
              borderRadius: 8, 
              backgroundColor: '#eff6ff', 
              justifyContent: 'center', 
              alignItems: 'center',
              marginBottom: 12
            }}>
              <Home color="#2563eb" size={20} />
            </View>
            <Text style={{ fontSize: 13, color: '#64748b', marginBottom: 4 }}>
              Hostel
            </Text>
            <Text style={{ fontSize: 16, fontWeight: '600', color: '#0f172a' }}>
              {profile?.Hostel?.name || 'N/A'}
            </Text>
          </View>

          {/* Room Info */}
          <View style={{ 
            flex: 1,
            backgroundColor: '#ffffff', 
            borderRadius: 12, 
            padding: 16,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.05,
            shadowRadius: 3,
            elevation: 2,
          }}>
            <View style={{ 
              width: 40, 
              height: 40, 
              borderRadius: 8, 
              backgroundColor: '#f0fdf4', 
              justifyContent: 'center', 
              alignItems: 'center',
              marginBottom: 12
            }}>
              <Bed color="#10b981" size={20} />
            </View>
            <Text style={{ fontSize: 13, color: '#64748b', marginBottom: 4 }}>
              Room
            </Text>
            <Text style={{ fontSize: 16, fontWeight: '600', color: '#0f172a' }}>
              {roomInfo?.room_number || 'N/A'}
            </Text>
          </View>
        </View>

        {/* Room Details & Roommates */}
        {roomInfo && (
          <View style={{ 
            backgroundColor: '#ffffff', 
            borderRadius: 12, 
            padding: 20,
            marginBottom: 16,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.05,
            shadowRadius: 3,
            elevation: 2,
          }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
              <Users color="#2563eb" size={20} />
              <Text style={{ fontSize: 16, fontWeight: '600', color: '#0f172a', marginLeft: 8 }}>
                Room Details
              </Text>
            </View>
            
            <View style={{ 
              padding: 12, 
              backgroundColor: '#f8fafc', 
              borderRadius: 8,
              marginBottom: 16
            }}>
              <Text style={{ fontSize: 14, color: '#64748b', marginBottom: 4 }}>
                {roomType?.name || 'Standard Room'}
                {roomType?.capacity ? ` • ${roomType.capacity} capacity` : ''}
              </Text>
              {profile?.tbl_RoomAllotments?.[0]?.allotment_date && (
                <Text style={{ fontSize: 13, color: '#94a3b8' }}>
                  Allotted: {moment(profile.tbl_RoomAllotments[0].allotment_date).format('MMM DD, YYYY')}
                </Text>
              )}
            </View>
            
            <RoommatesList roommates={roommates} currentUserId={user.id} />
          </View>
        )}

        {/* Quick Actions */}
        <View style={{ 
          backgroundColor: '#ffffff', 
          borderRadius: 12, 
          padding: 20,
          marginBottom: 16,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: 0.05,
          shadowRadius: 3,
          elevation: 2,
        }}>
          <Text style={{ fontSize: 16, fontWeight: '600', color: '#0f172a', marginBottom: 16 }}>
            Quick Actions
          </Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
            <TouchableOpacity 
              onPress={() => navigation.navigate('MessCharges')} 
              style={{ 
                width: '48%',
                padding: 16, 
                backgroundColor: '#f8fafc',
                borderRadius: 8,
                borderWidth: 1,
                borderColor: '#e2e8f0'
              }}
            >
              <Receipt color="#2563eb" size={24} style={{ marginBottom: 8 }} />
              <Text style={{ fontWeight: '600', fontSize: 14, color: '#0f172a' }}>
                Mess Bills
              </Text>
              <Text style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>
                View expenses
              </Text>
            </TouchableOpacity>

            <TouchableOpacity 
              onPress={() => navigation.navigate('FoodOrder')} 
              style={{ 
                width: '48%',
                padding: 16, 
                backgroundColor: '#f8fafc',
                borderRadius: 8,
                borderWidth: 1,
                borderColor: '#e2e8f0'
              }}
            >
              <Utensils color="#f97316" size={24} style={{ marginBottom: 8 }} />
              <Text style={{ fontWeight: '600', fontSize: 14, color: '#0f172a' }}>
                Order Food
              </Text>
              <Text style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>
                Special meals
              </Text>
            </TouchableOpacity>

            <TouchableOpacity 
              onPress={() => navigation.navigate('Leaves')} 
              style={{ 
                width: '48%',
                padding: 16, 
                backgroundColor: '#f8fafc',
                borderRadius: 8,
                borderWidth: 1,
                borderColor: '#e2e8f0'
              }}
            >
              <FileText color="#8b5cf6" size={24} style={{ marginBottom: 8 }} />
              <Text style={{ fontWeight: '600', fontSize: 14, color: '#0f172a' }}>
                My Leaves
              </Text>
              <Text style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>
                Leave history
              </Text>
            </TouchableOpacity>

            <TouchableOpacity 
              onPress={() => navigation.navigate('Complaints')} 
              style={{ 
                width: '48%',
                padding: 16, 
                backgroundColor: '#f8fafc',
                borderRadius: 8,
                borderWidth: 1,
                borderColor: '#e2e8f0'
              }}
            >
              <AlertCircle color="#f59e0b" size={24} style={{ marginBottom: 8 }} />
              <Text style={{ fontWeight: '600', fontSize: 14, color: '#0f172a' }}>
                Complaints
              </Text>
              <Text style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>
                Track issues
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Mess Expense Chart */}
        <View style={{ 
          backgroundColor: '#ffffff', 
          borderRadius: 12, 
          padding: 20,
          marginBottom: 16,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: 0.05,
          shadowRadius: 3,
          elevation: 2,
        }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
            <CreditCard color="#2563eb" size={20} />
            <Text style={{ fontSize: 16, fontWeight: '600', color: '#0f172a', marginLeft: 8 }}>
              Mess Expenses
            </Text>
          </View>
          {chartLoading ? (
            <View style={{ height: 200, justifyContent: 'center', alignItems: 'center' }}>
              <ActivityIndicator size="small" color="#2563eb" />
            </View>
          ) : messExpenseChartData ? (
            <LineChart
              data={messExpenseChartData}
              width={screenWidth}
              height={220}
              yAxisLabel="₹"
              chartConfig={{
                backgroundColor: '#ffffff',
                backgroundGradientFrom: '#ffffff',
                backgroundGradientTo: '#ffffff',
                decimalPlaces: 0,
                color: (opacity = 1) => `rgba(37, 99, 235, ${opacity})`,
                labelColor: (opacity = 1) => `rgba(100, 116, 139, ${opacity})`,
                style: { borderRadius: 16 },
                propsForDots: {
                  r: '4',
                  strokeWidth: '2',
                  stroke: '#2563eb',
                },
                propsForBackgroundLines: {
                  strokeDasharray: '',
                  stroke: '#e2e8f0',
                  strokeWidth: 1,
                },
              }}
              bezier
              style={{ marginVertical: 8, borderRadius: 16 }}
              fromZero
            />
          ) : (
            <Text style={{ color: '#64748b', padding: 16, textAlign: 'center' }}>
              No expense data available
            </Text>
          )}
        </View>

        {/* Attendance Chart */}
        <View style={{ 
          backgroundColor: '#ffffff', 
          borderRadius: 12, 
          padding: 20,
          marginBottom: 16,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: 0.05,
          shadowRadius: 3,
          elevation: 2,
        }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
            <Calendar color="#10b981" size={20} />
            <Text style={{ fontSize: 16, fontWeight: '600', color: '#0f172a', marginLeft: 8 }}>
              Attendance Overview
            </Text>
          </View>
          {chartLoading ? (
            <View style={{ height: 200, justifyContent: 'center', alignItems: 'center' }}>
              <ActivityIndicator size="small" color="#10b981" />
            </View>
          ) : attendanceChartData ? (
            <>
              <BarChart
                data={attendanceChartData}
                width={screenWidth}
                height={220}
                chartConfig={{
                  backgroundColor: '#ffffff',
                  backgroundGradientFrom: '#ffffff',
                  backgroundGradientTo: '#ffffff',
                  decimalPlaces: 0,
                  color: (opacity = 1) => `rgba(16, 185, 129, ${opacity})`,
                  labelColor: (opacity = 1) => `rgba(100, 116, 139, ${opacity})`,
                  style: { borderRadius: 16 },
                  propsForBackgroundLines: {
                    strokeDasharray: '',
                    stroke: '#e2e8f0',
                    strokeWidth: 1,
                  },
                }}
                style={{ marginVertical: 8, borderRadius: 16 }}
                fromZero
              />
              <View style={{ flexDirection: 'row', justifyContent: 'center', marginTop: 12, gap: 16 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <View style={{ width: 12, height: 12, borderRadius: 2, backgroundColor: '#10b981', marginRight: 6 }} />
                  <Text style={{ fontSize: 12, color: '#64748b' }}>Present</Text>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <View style={{ width: 12, height: 12, borderRadius: 2, backgroundColor: '#ef4444', marginRight: 6 }} />
                  <Text style={{ fontSize: 12, color: '#64748b' }}>Absent</Text>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <View style={{ width: 12, height: 12, borderRadius: 2, backgroundColor: '#3b82f6', marginRight: 6 }} />
                  <Text style={{ fontSize: 12, color: '#64748b' }}>On Duty</Text>
                </View>
              </View>
            </>
          ) : (
            <Text style={{ color: '#64748b', padding: 16, textAlign: 'center' }}>
              No attendance data available
            </Text>
          )}
        </View>

        {/* Important Notices */}
        <View style={{ 
          backgroundColor: '#ffffff', 
          borderRadius: 12, 
          padding: 20,
          marginBottom: 24,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: 0.05,
          shadowRadius: 3,
          elevation: 2,
        }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
            <FileText color="#f59e0b" size={20} />
            <Text style={{ fontSize: 16, fontWeight: '600', color: '#0f172a', marginLeft: 8 }}>
              Notices
            </Text>
          </View>
          
          <View style={{ 
            padding: 14, 
            backgroundColor: '#fffbeb', 
            borderLeftWidth: 3, 
            borderLeftColor: '#f59e0b',
            borderRadius: 8,
            marginBottom: 12
          }}>
            <Text style={{ fontSize: 13, fontWeight: '600', color: '#78350f', marginBottom: 4 }}>
              Mess Bill Due
            </Text>
            <Text style={{ fontSize: 13, color: '#92400e' }}>
              Monthly mess bill is due on 10th of this month
            </Text>
          </View>
          
          <View style={{ 
            padding: 14, 
            backgroundColor: '#eff6ff', 
            borderLeftWidth: 3, 
            borderLeftColor: '#3b82f6',
            borderRadius: 8,
            marginBottom: 12
          }}>
            <Text style={{ fontSize: 13, fontWeight: '600', color: '#1e3a8a', marginBottom: 4 }}>
              Upcoming Event
            </Text>
            <Text style={{ fontSize: 13, color: '#1e40af' }}>
              Hostel cultural event on {moment().add(2, 'weeks').format('MMMM Do')}
            </Text>
          </View>
          
          <View style={{ 
            padding: 14, 
            backgroundColor: '#f0fdf4', 
            borderLeftWidth: 3, 
            borderLeftColor: '#10b981',
            borderRadius: 8
          }}>
            <Text style={{ fontSize: 13, fontWeight: '600', color: '#065f46', marginBottom: 4 }}>
              Special Menu
            </Text>
            <Text style={{ fontSize: 13, color: '#047857' }}>



              
              Special food menu available this weekend
            </Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

export default StudentDashboardScreen;