import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, ActivityIndicator, Alert, TouchableOpacity } from 'react-native';
import { studentAPI } from '../../api/api';
import { DollarSign, AlertTriangle, CheckCircle, Calendar, FileText, Download, CreditCard, Clock, XCircle, ExternalLink } from 'lucide-react-native';
import DateTimePickerModal from 'react-native-modal-datetime-picker';
import moment from 'moment';
import Header from '../../components/common/Header';
import StatusBadge from '../../components/common/StatusBadge';

const ViewBillsScreen = () => {
  const [loading, setLoading] = useState(true);
  const [messBills, setMessBills] = useState([]);
  const [selectedMonth, setSelectedMonth] = useState(moment());
  const [stats, setStats] = useState({
    totalAmount: 0,
    paidAmount: 0,
    pendingAmount: 0,
    overdueAmount: 0,
  });
  const [todayAttendance, setTodayAttendance] = useState(null);
  const [attendanceLoading, setAttendanceLoading] = useState(true);
  const [isMonthPickerVisible, setMonthPickerVisible] = useState(false);

  useEffect(() => {
    fetchMessBills();
    fetchAttendance();
  }, [selectedMonth]);

  const fetchMessBills = async () => {
    setLoading(true);
    try {
      const month = selectedMonth.month() + 1; // 1-based month
      const year = selectedMonth.year();
      const response = await studentAPI.getMessBills({ month, year });
      
      const bills = response.data.data || [];
      setMessBills(bills);
      
      const totalAmount = bills.reduce((sum, bill) => sum + parseFloat(bill.amount || 0), 0);
      const paidAmount = bills.filter(bill => bill.status === 'paid')
        .reduce((sum, bill) => sum + parseFloat(bill.amount || 0), 0);
      const pendingAmount = bills.filter(bill => bill.status === 'pending')
        .reduce((sum, bill) => sum + parseFloat(bill.amount || 0), 0);
      const overdueAmount = bills.filter(bill => bill.status === 'overdue')
        .reduce((sum, bill) => sum + parseFloat(bill.amount || 0), 0);
      
      setStats({ 
        totalAmount, 
        paidAmount, 
        pendingAmount, 
        overdueAmount,
      });
    } catch (error) {
      console.error('Error fetching mess bills:', error);
      Alert.alert('Error', error.message || 'Failed to load mess bills');
    } finally {
      setLoading(false);
    }
  };

  const fetchAttendance = async () => {
    setAttendanceLoading(true);
    try {
      const date = moment().format('YYYY-MM-DD');
      const response = await studentAPI.getMyAttendance({ date });
      const records = response.data.data || [];
      setTodayAttendance(records.length > 0 ? records[0] : null);
    } catch (error) {
      console.error('Error fetching attendance:', error);
      Alert.alert('Error', 'Failed to load attendance');
      setTodayAttendance(null);
    } finally {
      setAttendanceLoading(false);
    }
  };

  const getAttendanceStatusDisplay = (status) => {
    switch (status) {
      case 'P':
        return { icon: <CheckCircle className="text-green-600" size={48} />, text: 'Present', color: 'bg-green-50 border-green-200 text-green-800' };
      case 'A':
        return { icon: <XCircle className="text-red-600" size={48} />, text: 'Absent', color: 'bg-red-50 border-red-200 text-red-800' };
      case 'OD':
        return { icon: <Clock className="text-blue-600" size={48} />, text: 'On Duty', color: 'bg-blue-50 border-blue-200 text-blue-800' };
      default:
        return { icon: null, text: 'Not Marked', color: 'bg-gray-50 border-gray-200 text-gray-500' };
    }
  };

  const attendanceStatusInfo = todayAttendance ? getAttendanceStatusDisplay(todayAttendance.status) : getAttendanceStatusDisplay(null);

  const handleMonthChange = (date) => {
    setSelectedMonth(moment(date));
    setMonthPickerVisible(false);
  };

  const handlePayNow = (bill) => {
    Alert.alert('Payment Gateway', `Initiate payment for Bill ID ${bill.id}. (Integration Required)`);
  };

  const handleDownloadReceipt = (bill) => {
    Alert.alert('Download Receipt', `Generate and download receipt for Bill ID ${bill.id}. (Functionality Required)`);
  };

  const BillCard = ({ bill }) => (
    <View className="bg-white rounded-lg shadow-sm p-4 mb-3 border border-gray-200">
      <View className="flex-row justify-between items-center mb-2">
        <View>
          <Text className="font-bold text-lg text-gray-900">
            {moment().month(bill.month - 1).format('MMMM')} {bill.year} Mess Bill
          </Text>
          <Text className="text-xs text-gray-500">Due: {moment(bill.due_date).format('DD MMM YYYY')}</Text>
        </View>
        <StatusBadge status={bill.status} type="bill" />
      </View>
      <View className="flex-row justify-between items-center mt-2">
        <Text className="text-gray-600 text-sm">Amount:</Text>
        <Text className="font-bold text-xl text-blue-600">₹{parseFloat(bill.amount).toFixed(2)}</Text>
      </View>
      <View className="flex-row justify-end space-x-2 mt-4">
        {bill.status !== 'paid' && (
          <TouchableOpacity
            onPress={() => handlePayNow(bill)}
            className="bg-green-600 py-2 px-3 rounded-lg flex-row items-center"
          >
            <CreditCard size={16} color="white" className="mr-1" />
            <Text className="text-white text-sm font-semibold">Pay Now</Text>
          </TouchableOpacity>
        )}
        {bill.status === 'paid' && (
          <TouchableOpacity
            onPress={() => handleDownloadReceipt(bill)}
            className="bg-gray-300 py-2 px-3 rounded-lg flex-row items-center"
          >
            <Download size={16} color="#4B5563" className="mr-1" />
            <Text className="text-gray-700 text-sm font-semibold">Receipt</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  if (loading) {
    return (
      <View className="flex-1 justify-center items-center bg-gray-100">
        <ActivityIndicator size="large" color="#4F46E5" />
        <Text className="mt-4 text-lg text-gray-700">Loading mess bills...</Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-gray-50">
      <Header />
      <ScrollView className="p-4">
        <View className="flex-row justify-between items-center mb-6">
          <Text className="text-3xl font-bold text-gray-900">My Mess Bills</Text>
          <TouchableOpacity onPress={() => setMonthPickerVisible(true)} className="flex-row items-center p-2 bg-white rounded-lg border border-gray-300">
            <Calendar size={20} color="#4B5563" className="mr-2" />
            <Text className="text-gray-700 font-medium">{selectedMonth.format('MMMM YYYY')}</Text>
          </TouchableOpacity>
        </View>

        <View className="flex-row flex-wrap justify-between mb-6">
          <View className="w-[48%] bg-white rounded-lg shadow-md p-3 mb-3">
            <Text className="text-gray-600 text-sm flex-row items-center"><FileText size={16} className="mr-1" color="#6B7280" /> Total Amount</Text>
            <Text className="text-2xl font-bold text-blue-600 mt-1">₹{stats.totalAmount.toFixed(2)}</Text>
          </View>
          <View className="w-[48%] bg-white rounded-lg shadow-md p-3 mb-3">
            <Text className="text-gray-600 text-sm flex-row items-center"><CheckCircle size={16} className="mr-1" color="#10B981" /> Paid Amount</Text>
            <Text className="text-2xl font-bold text-green-600 mt-1">₹{stats.paidAmount.toFixed(2)}</Text>
          </View>
          <View className="w-[48%] bg-white rounded-lg shadow-md p-3">
            <Text className="text-gray-600 text-sm flex-row items-center"><Clock size={16} className="mr-1" color="#F59E0B" /> Pending Amount</Text>
            <Text className="text-2xl font-bold text-yellow-600 mt-1">₹{stats.pendingAmount.toFixed(2)}</Text>
          </View>
          <View className="w-[48%] bg-white rounded-lg shadow-md p-3">
            <Text className="text-gray-600 text-sm flex-row items-center"><AlertTriangle size={16} className="mr-1" color="#EF4444" /> Overdue Amount</Text>
            <Text className="text-2xl font-bold text-red-600 mt-1">₹{stats.overdueAmount.toFixed(2)}</Text>
          </View>
        </View>

        {/* Today's Attendance Status Card */}
        <View className="bg-white rounded-lg shadow-md mb-6">
          <View className="p-4 flex-row items-center border-b border-gray-200">
            <Calendar className="mr-2" size={18} color="#4B5563" />
            <Text className="text-lg font-medium text-gray-900">Today's Attendance ({moment().format('DD MMM YYYY')})</Text>
          </View>
          {attendanceLoading ? (
            <View className="flex justify-center py-8">
              <ActivityIndicator size="small" color="#4F46E5" />
            </View>
          ) : (
            <View className={`flex-col items-center p-6 border-b border-gray-200 rounded-b-lg ${attendanceStatusInfo.color}`}>
              {attendanceStatusInfo.icon}
              <Text className="mt-2 mb-1 text-2xl font-bold">{attendanceStatusInfo.text}</Text>
              {todayAttendance && (
                <Text className="text-sm text-gray-600 mb-2">
                  Reason: {todayAttendance.reason || 'N/A'}
                  {todayAttendance.remarks && ` - ${todayAttendance.remarks}`}
                </Text>
              )}
              {todayAttendance && todayAttendance.status === 'OD' && (
                <Text className="text-sm text-gray-600">
                  From: {moment(todayAttendance.from_date).format('DD MMM')} to {moment(todayAttendance.to_date).format('DD MMM')}
                </Text>
              )}
              {!todayAttendance && <Text className="text-sm text-gray-500">No attendance record for today</Text>}
            </View>
          )}
        </View>

        <View className="bg-white rounded-lg shadow-md mb-6 p-4">
          <Text className="text-xl font-semibold text-gray-900 mb-4">Bills for {selectedMonth.format('MMMM YYYY')}</Text>
          {messBills.length > 0 ? (
            <View>
              {messBills.map(bill => <BillCard key={bill.id} bill={bill} />)}
            </View>
          ) : (
            <View className="text-center py-8">
              <DollarSign className="mx-auto h-12 w-12 text-gray-400" />
              <Text className="mt-2 text-sm font-medium text-gray-900">No mess bills found for {selectedMonth.format('MMMM YYYY')}</Text>
              <Text className="mt-1 text-sm text-gray-500">Payment instructions below.</Text>
            </View>
          )}
        </View>

        <View className="bg-gray-100 rounded-lg shadow-md p-4 mb-6">
          <Text className="text-lg font-semibold text-gray-900 mb-3">Payment Instructions</Text>
          <Text className="text-sm text-gray-700">
            • Bills are generated at the end of each month based on the mess services provided{"\n"}
            • Payment is due by the 10th of the following month{"\n"}
            • Late payments may incur additional charges{"\n"}
            • For any billing queries, please contact the mess office
          </Text>
        </View>
      </ScrollView>

      <DateTimePickerModal
        isVisible={isMonthPickerVisible}
        mode="date"
        onConfirm={handleMonthChange}
        onCancel={() => setMonthPickerVisible(false)}
        date={selectedMonth.toDate()}
      />
    </View>
  );
};

export default ViewBillsScreen;
