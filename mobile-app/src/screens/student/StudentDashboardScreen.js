import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, ActivityIndicator, Alert, TouchableOpacity, Image } from 'react-native';
import { studentAPI } from '../../api/api';
import { useAuth } from '../../hooks/useAuth';
import { User, Bed, Receipt, Calendar, Users, Home, CreditCard, FileText, Clock, Utensils } from 'lucide-react-native';
import { BarChart } from 'react-native-chart-kit';
import { Dimensions } from 'react-native';
import moment from 'moment';
import RoommatesList from '../../components/student/RoommatesList';
import Header from '../../components/common/Header';
import { CheckCircle } from 'lucide-react-native';
const screenWidth = Dimensions.get('window').width - 32; // Padding 16 on each side

const StudentDashboardScreen = ({ navigation }) => {
  const { user } = useAuth();
  const [profile, setProfile] = useState(null);
  const [roommates, setRoommates] = useState([]);
  const [todayAttendance, setTodayAttendance] = useState(null);
  const [loading, setLoading] = useState(true);
  const [messExpenseChartData, setMessExpenseChartData] = useState(null);
  const [attendanceChartData, setAttendanceChartData] = useState(null);
  const [chartLoading, setChartLoading] = useState(true);

  const getInitials = (name) => {
    if (!name) return '?';
    return name.charAt(0).toUpperCase();
  };

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
      labels.push(moment().year(m.year).month(m.month - 1).format('MMM YY'));
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
      labels.push(moment().year(m.year).month(m.month - 1).format('MMM YY'));
      
      if (monthData) {
        const presentCount = parseInt(monthData.present_days || 0);
        const totalManDays = parseInt(monthData.totalManDays || 0); // Assuming this comes from backend too now
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
        { data: attendanceDays, color: (opacity = 1) => `rgba(54, 162, 235, ${opacity})`, legendLabel: 'Present' }, // Blue
        { data: absentDays, color: (opacity = 1) => `rgba(255, 99, 132, ${opacity})`, legendLabel: 'Absent' }, // Red
        { data: onDutyDays, color: (opacity = 1) => `rgba(255, 206, 86, ${opacity})`, legendLabel: 'On Duty' }, // Yellow
      ],
      legend: ['Present', 'Absent', 'On Duty'] // Labels for the legend
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
        const roomId = profileData.tbl_RoomAllotments[0].HostelRoom.id;
        const roommatesResponse = await studentAPI.getRoommates(); // Use the dedicated roommate API
        if (roommatesResponse?.data?.data) {
          // Filter out the current user from roommates list
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
        return { icon: <CheckCircle className="text-green-600" size={32} />, text: 'Present', color: 'bg-green-50 border-green-200 text-green-800' };
      case 'A':
        return { icon: <XCircle className="text-red-600" size={32} />, text: 'Absent', color: 'bg-red-50 border-red-200 text-red-800' };
      case 'OD':
        return { icon: <Clock className="text-blue-600" size={32} />, text: 'On Duty', color: 'bg-blue-50 border-blue-200 text-blue-800' };
      default:
        return { icon: <Clock className="text-gray-400" size={32} />, text: 'Not Marked', color: 'bg-gray-50 border-gray-200 text-gray-500' };
    }
  };

  const statusInfo = todayAttendance ? getStatusDisplay(todayAttendance.status) : getStatusDisplay(null);
  const roomInfo = profile?.tbl_RoomAllotments?.[0]?.HostelRoom;
  const roomType = roomInfo?.RoomType || roomInfo?.tbl_RoomType;

  if (loading) {
    return (
      <View className="flex-1 justify-center items-center bg-gray-100">
        <ActivityIndicator size="large" color="#4F46E5" />
        <Text className="mt-4 text-lg text-gray-700">Loading dashboard...</Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-gray-50">
      <Header />
      <ScrollView className="p-4">
        <Text className="text-3xl font-bold text-gray-900 mb-2">Dashboard</Text>
        <Text className="text-gray-600 mb-6">Welcome to your student dashboard</Text>

        {/* Today's Attendance Status */}
        <View className="bg-white rounded-lg shadow-md p-4 mb-4">
          <Text className="text-xl font-semibold text-gray-900 mb-3 flex-row items-center">
            <Calendar className="mr-2 text-blue-600" size={20} /> Today's Attendance
          </Text>
          <View className={`rounded-lg border p-4 flex-row items-center ${statusInfo.color}`}>
            <View className="mr-4">
              {statusInfo.icon}
            </View>
            <View>
              <Text className="font-medium text-lg">{statusInfo.text}</Text>
              <Text className="text-sm">
                {todayAttendance ? 
                  `Marked on ${moment(todayAttendance.date).format('MMM DD, YYYY')}` : 
                  'Attendance has not been marked yet'
                }
              </Text>
            </View>
          </View>
        </View>

        {/* Hostel Info */}
        <View className="bg-white rounded-lg shadow-md p-4 mb-4">
          <Text className="text-xl font-semibold text-gray-900 mb-3 flex-row items-center">
            <Home className="mr-2 text-blue-600" size={20} /> Hostel Info
          </Text>
          {profile?.Hostel ? (
            <View className="p-4 bg-blue-50 rounded-lg">
              <Text className="font-medium text-gray-900 text-lg">
                {profile.Hostel.name}
              </Text>
              {profile.Hostel.address && (
                <Text className="text-sm text-gray-600 mt-1">
                  {profile.Hostel.address}
                </Text>
              )}
              {profile.Hostel.contact_number && (
                <Text className="text-sm text-gray-600 mt-2 font-medium">
                  Contact: {profile.Hostel.contact_number}
                </Text>
              )}
            </View>
          ) : (
            <Text className="text-gray-500 p-3 bg-gray-50 rounded-lg">
              No hostel information available.
            </Text>
          )}
        </View>

        {/* Room Information with Roommates */}
        {roomInfo && (
          <View className="bg-white rounded-lg shadow-md p-4 mb-4">
            <Text className="text-xl font-semibold text-gray-900 mb-3 flex-row items-center">
              <Home className="mr-2 text-green-600" size={20} /> Room Information
            </Text>
            
            <View className="flex-row items-center p-4 bg-gray-50 rounded-lg mb-4">
              <Bed className="text-green-600 mr-3" size={20} />
              <View>
                <Text className="font-medium text-gray-900">Room {roomInfo.room_number}</Text>
                <Text className="text-gray-600">
                  {roomType?.name || 'Standard Room'} 
                  {roomType?.capacity ? ` (${roomType.capacity} capacity)` : ''}
                </Text>
                {profile?.tbl_RoomAllotments?.[0]?.allotment_date && (
                  <Text className="text-sm text-gray-500">
                    Allotted on: {moment(profile.tbl_RoomAllotments[0].allotment_date).format('MMM DD, YYYY')}
                  </Text>
                )}
              </View>
            </View>
            
            {/* Roommates Section */}
            <View className="mt-4">
              <Text className="font-medium text-gray-900 mb-3 flex-row items-center">
                <Users className="mr-2 text-blue-600" size={16} /> Roommates
              </Text>
              <RoommatesList roommates={roommates} currentUserId={user.id} />
            </View>
          </View>
        )}

        {/* Quick Actions */}
        <View className="bg-white rounded-lg shadow-md p-4 mb-4">
          <Text className="text-xl font-semibold text-gray-900 mb-3 flex-row items-center">
            <Clock className="mr-2 text-indigo-600" size={20} /> Quick Actions
          </Text>
          <View className="flex-row flex-wrap justify-between gap-2">
            <TouchableOpacity 
              onPress={() => navigation.navigate('MessCharges')} 
              className="w-[48%] p-3 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors flex flex-col items-center justify-center min-h-[100px]"
            >
              <Receipt className="text-blue-600 mb-2" size={24} />
              <Text className="font-medium text-blue-900 text-center">Mess Bills</Text>
              <Text className="text-xs text-blue-700 text-center mt-1">Check your mess expenses</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              onPress={() => navigation.navigate('FoodOrder')} 
              className="w-[48%] p-3 bg-orange-50 hover:bg-orange-100 rounded-lg transition-colors flex flex-col items-center justify-center min-h-[100px]"
            >
              <Utensils className="text-orange-600 mb-2" size={24} />
              <Text className="font-medium text-orange-900 text-center">Order Special Food</Text>
              <Text className="text-xs text-orange-700 text-center mt-1">Request special meal options</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              onPress={() => navigation.navigate('Leaves')} 
              className="w-[48%] p-3 bg-purple-50 hover:bg-purple-100 rounded-lg transition-colors flex flex-col items-center justify-center min-h-[100px] mt-2"
            >
              <FileText className="text-purple-600 mb-2" size={24} />
              <Text className="font-medium text-purple-900 text-center">My Leaves</Text>
              <Text className="text-xs text-purple-700 text-center mt-1">View your leave history</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              onPress={() => navigation.navigate('Complaints')} 
              className="w-[48%] p-3 bg-amber-50 hover:bg-amber-100 rounded-lg transition-colors flex flex-col items-center justify-center min-h-[100px] mt-2"
            >
              <FileText className="text-amber-600 mb-2" size={24} />
              <Text className="font-medium text-amber-900 text-center">Complaints</Text>
              <Text className="text-xs text-amber-700 text-center mt-1">Manage your complaints</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Mess Expense Chart */}
        <View className="bg-white rounded-lg shadow-md p-4 mb-4">
          <Text className="text-xl font-semibold text-gray-900 mb-3 flex-row items-center">
            <CreditCard className="mr-2 text-red-600" size={20} /> Mess Expenses Trend
          </Text>
          {chartLoading ? (
            <View className="flex items-center justify-center h-48">
              <ActivityIndicator size="small" color="#4F46E5" />
            </View>
          ) : messExpenseChartData ? (
            <BarChart
              data={messExpenseChartData}
              width={screenWidth}
              height={220}
              yAxisLabel="₹"
              chartConfig={{
                backgroundColor: '#ffffff',
                backgroundGradientFrom: '#ffffff',
                backgroundGradientTo: '#ffffff',
                decimalPlaces: 0, // Show whole numbers
                color: (opacity = 1) => `rgba(75, 192, 192, ${opacity})`,
                labelColor: (opacity = 1) => `rgba(107, 114, 128, ${opacity})`, // Gray-500
                style: {
                  borderRadius: 16,
                },
                propsForDots: {
                  r: '6',
                  strokeWidth: '2',
                  stroke: '#ffa726',
                },
              }}
              style={{
                marginVertical: 8,
                borderRadius: 16,
              }}
              fromZero
            />
          ) : (
            <Text className="text-gray-600 p-4 bg-gray-50 rounded-lg">
              No mess expense data available yet.
            </Text>
          )}
        </View>

        {/* Attendance Chart */}
        <View className="bg-white rounded-lg shadow-md p-4 mb-4">
          <Text className="text-xl font-semibold text-gray-900 mb-3 flex-row items-center">
            <Calendar className="mr-2 text-green-600" size={20} /> Attendance Overview
          </Text>
          {chartLoading ? (
            <View className="flex items-center justify-center h-48">
              <ActivityIndicator size="small" color="#4F46E5" />
            </View>
          ) : attendanceChartData ? (
             <BarChart
                data={attendanceChartData}
                width={screenWidth}
                height={220}
                yAxisLabel="" // No currency symbol for days
                chartConfig={{
                  backgroundColor: '#ffffff',
                  backgroundGradientFrom: '#ffffff',
                  backgroundGradientTo: '#ffffff',
                  decimalPlaces: 0,
                  color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`, // Default color, overridden by dataset
                  labelColor: (opacity = 1) => `rgba(107, 114, 128, ${opacity})`, // Gray-500
                  style: {
                    borderRadius: 16,
                  },
                  propsForDots: {
                    r: '6',
                    strokeWidth: '2',
                    stroke: '#ffa726',
                  },
                }}
                bezier // Optional: makes lines curved
                style={{
                  marginVertical: 8,
                  borderRadius: 16,
                }}
                fromZero
                // This is a workaround for multi-dataset bar charts in react-native-chart-kit.
                // It treats each dataset as a separate bar for each label.
                // A better approach for stacked/grouped bars might require a different library.
                hidePoints
              />
          ) : (
            <Text className="text-gray-600 p-4 bg-gray-50 rounded-lg">
              No attendance data available yet.
            </Text>
          )}
           <Text className="text-xs text-gray-500 mt-2 text-center">
              *Attendance days shows the maximum of total man-days and present days
            </Text>
        </View>

        {/* Important Notices */}
        <View className="bg-white rounded-lg shadow-md p-4 mb-4">
          <Text className="text-xl font-semibold text-gray-900 mb-3 flex-row items-center">
            <FileText className="mr-2 text-yellow-600" size={20} /> Important Notices
          </Text>
          <View className="space-y-3">
            <View className="p-3 bg-yellow-50 border-l-4 border-yellow-400 rounded">
              <Text className="text-sm font-medium text-yellow-800">
                Mess Bill Due
              </Text>
              <Text className="text-sm text-yellow-700">
                Your monthly mess bill is due on 10th of this month.
              </Text>
            </View>
            
            <View className="p-3 bg-blue-50 border-l-4 border-blue-400 rounded">
              <Text className="text-sm font-medium text-blue-800">
                Upcoming Event
              </Text>
              <Text className="text-sm text-blue-700">
                Hostel cultural event on {moment().add(2, 'weeks').format('MMMM Do')}.
              </Text>
            </View>
            
            <View className="p-3 bg-orange-50 border-l-4 border-orange-400 rounded">
              <Text className="text-sm font-medium text-orange-800">
                Special Menu
              </Text>
              <Text className="text-sm text-orange-700">
                Special food menu available this weekend. Check mess for details.
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>
      
    </View>
  );
};

export default StudentDashboardScreen;
