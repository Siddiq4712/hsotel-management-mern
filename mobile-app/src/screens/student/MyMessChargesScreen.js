import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, ActivityIndicator, Alert, TouchableOpacity } from 'react-native';
import { studentAPI } from '../../api/api';
import { Receipt, Calendar, CheckCircle, XCircle, ChevronDown, ChevronUp, Clock, DollarSign, BookOpen, Droplet, ExternalLink } from 'lucide-react-native';
import moment from 'moment';
import Header from '../../components/common/Header';
import { Picker } from '@react-native-picker/picker';

const MyMessChargesScreen = () => {
  const [dailyCharges, setDailyCharges] = useState([]);
  const [monthlyFlatFees, setMonthlyFlatFees] = useState([]);
  const [monthlyCalculatedDailyRate, setMonthlyCalculatedDailyRate] = useState(0);
  const [studentTotalManDaysForMonth, setStudentTotalManDaysForMonth] = useState(0);
  const [totalMonthlySpecialFoodCost, setTotalMonthlySpecialFoodCost] = useState(0);

  const [loading, setLoading] = useState(true);
  const [currentMonth, setCurrentMonth] = useState(moment().month() + 1);
  const [currentYear, setCurrentYear] = useState(moment().year());
  const [expandedRow, setExpandedRow] = useState(null);

  useEffect(() => {
    fetchChargesAndSummary();
  }, [currentMonth, currentYear]);

  const fetchChargesAndSummary = async () => {
    setLoading(true);
    try {
      const response = await studentAPI.getMyDailyMessCharges({ month: currentMonth, year: currentYear });
      const data = response.data.data;
      
      setDailyCharges(data.dailyCharges || []);
      setMonthlyFlatFees(data.monthlySummary.flatFees || []);
      setMonthlyCalculatedDailyRate(data.monthlySummary.monthlyCalculatedDailyRate || 0);
      setStudentTotalManDaysForMonth(data.monthlySummary.studentTotalManDaysForMonth || 0);
      setTotalMonthlySpecialFoodCost(data.monthlySummary.totalMonthlySpecialFoodCost || 0);

    } catch (error) {
      console.error('Error fetching mess charges and summary:', error);
      Alert.alert('Error', error.message || 'Failed to load mess charges.');
    } finally {
      setLoading(false);
    }
  };

  const attendanceBasedMessCharge = monthlyCalculatedDailyRate * studentTotalManDaysForMonth;
  const totalFlatFeesSum = monthlyFlatFees.reduce((sum, fee) => sum + parseFloat(fee.amount || 0), 0);
  const totalMonthlyBill = attendanceBasedMessCharge + totalMonthlySpecialFoodCost + totalFlatFeesSum;

  const handleMonthChange = (value) => {
    const [year, month] = value.split('-');
    setCurrentYear(parseInt(year));
    setCurrentMonth(parseInt(month));
    setExpandedRow(null); // Collapse any expanded rows on month change
  };

  const getStatusInfo = (status) => {
    switch (status) {
      case 'P': return { icon: <CheckCircle className="text-green-500" size={16} />, text: 'Present', color: 'text-green-700' };
      case 'A': return { icon: <XCircle className="text-red-500" size={16} />, text: 'Absent', color: 'text-red-700' };
      case 'OD': return { icon: <Clock className="text-blue-500" size={16} />, text: 'On Duty', color: 'text-blue-700' };
      default: return { icon: <XCircle className="text-gray-500" size={16} />, text: 'Not Marked', color: 'text-gray-700' };
    }
  };
  
  const getFeeIcon = (feeType) => {
    switch (feeType) {
      case 'bed_charge': return <Bed className="w-5 h-5 text-purple-600 mr-2" />;
      case 'newspaper': return <BookOpen className="w-5 h-5 text-yellow-600 mr-2" />;
      case 'water_bill': return <Droplet className="w-5 h-5 text-blue-600 mr-2" />;
      case 'special_food_charge': return <Receipt className="w-5 h-5 text-orange-600 mr-2" />;
      default: return <DollarSign className="w-5 h-5 text-gray-500 mr-2" />;
    }
  };

  const toggleRow = (id) => {
    setExpandedRow(expandedRow === id ? null : id);
  };

  const monthOptions = Array.from({ length: 12 }, (_, i) => {
    const monthVal = i + 1;
    const date = moment().month(i).year(currentYear);
    return {
      label: date.format('MMMM YYYY'),
      value: date.format('YYYY-MM')
    };
  }).filter(opt => moment(opt.value, 'YYYY-MM').isSameOrBefore(moment(), 'month')); // Only show up to current month

  return (
    <View className="flex-1 bg-gray-50">
      <Header />
      <ScrollView className="p-4">
        <Text className="text-3xl font-bold text-gray-900 mb-2">My Mess Charges</Text>
        <Text className="text-gray-600 mb-6">Detailed daily breakdown of your mess fees.</Text>

        {/* Month Selector */}
        <View className="mb-6">
          <Text className="text-base font-medium text-gray-700 mb-2">Select Month:</Text>
          <View className="relative border border-gray-300 rounded-md">
            <Picker
              selectedValue={`${currentYear}-${String(currentMonth).padStart(2, '0')}`}
              onValueChange={handleMonthChange}
              className="w-full h-12"
            >
              {monthOptions.map(option => (
                <Picker.Item key={option.value} label={option.label} value={option.value} />
              ))}
            </Picker>
          </View>
        </View>

        {/* Monthly Summary Card */}
        <View className="bg-white rounded-lg shadow-md p-6 mb-8">
          <Text className="text-xl font-semibold text-gray-900 mb-4">
            Summary for {moment(new Date(currentYear, currentMonth - 1)).format('MMMM YYYY')}
          </Text>
          <View className="mt-4 space-y-2">
              <View className="flex-row items-center justify-between">
                  <Text className="text-lg text-gray-700">Hostel's Monthly Averaged Daily Rate:</Text>
                  <Text className="text-lg font-bold text-gray-800">₹{monthlyCalculatedDailyRate.toFixed(2)}</Text>
              </View>
              <View className="flex-row items-center justify-between border-t border-gray-100 pt-2">
                  <Text className="text-lg text-gray-700">Your Total Man-Days Present/On-Duty:</Text>
                  <Text className="text-lg font-bold text-gray-800">{studentTotalManDaysForMonth}</Text>
              </View>
              <View className="flex-row items-center justify-between border-t border-gray-100 pt-2">
                  <Text className="text-lg text-gray-700">Total Mess Charges:</Text>
                  <Text className="text-lg font-bold text-gray-800">₹{attendanceBasedMessCharge.toFixed(2)}</Text>
              </View>
              <View className="flex-row items-center justify-between border-t border-gray-100 pt-2">
                  <Text className="text-lg text-gray-700">Additional Token:</Text>
                  <Text className="text-lg font-bold text-gray-800">₹{totalMonthlySpecialFoodCost.toFixed(2)}</Text>
              </View>

              {monthlyFlatFees.map((fee, index) => (
                  <View key={fee.fee_type || index} className="flex-row items-center justify-between border-t border-gray-100 pt-2">
                      <View className="flex-row items-center">
                        {getFeeIcon(fee.fee_type)} 
                        <Text className="text-lg text-gray-700 capitalize mr-2">
                          {fee.fee_type.replace(/_/g, ' ')}
                        </Text>
                        {fee.description && <Text className="text-gray-500 text-sm italic">({fee.description})</Text>}
                      </View>
                      <Text className="text-lg font-bold text-gray-800">₹{parseFloat(fee.amount).toFixed(2)}</Text>
                  </View>
              ))}
          </View>
          <View className="mt-4 flex-row items-center justify-between border-t-2 border-gray-300 pt-4">
            <Text className="text-xl font-bold text-gray-900">Total Monthly Bill:</Text>
            <Text className="text-3xl font-bold text-blue-600">₹{totalMonthlyBill.toFixed(2)}</Text>
          </View>
          <TouchableOpacity
            className="mt-6 w-full bg-green-600 text-white px-6 py-3 rounded-lg flex-row items-center justify-center"
            onPress={() => Alert.alert('Payment Gateway', 'Integrate with a payment gateway to enable online payments.')} // Placeholder
          >
            <ExternalLink size={20} color="white" className="mr-2" />
            <Text className="text-white text-lg font-semibold">Pay Now</Text>
          </TouchableOpacity>
        </View>

        {/* Daily Charges Breakdown Table */}
        <View className="bg-white shadow-md rounded-lg overflow-hidden">
          <View className="px-4 py-3 bg-gray-50 border-b border-gray-200">
            <Text className="text-lg font-medium text-gray-900">Daily Charges Breakdown</Text>
          </View>

          {loading ? (
            <View className="flex justify-center p-8 flex-row items-center">
              <ActivityIndicator size="small" color="#4F46E5" />
              <Text className="ml-3 text-gray-600">Loading daily charges...</Text>
            </View>
          ) : dailyCharges.length > 0 ? (
            <View>
              <View className="flex-row bg-gray-100 px-4 py-2 border-b border-gray-200">
                <Text className="flex-2 text-left text-xs font-medium text-gray-500 uppercase">Date</Text>
                <Text className="flex-2 text-left text-xs font-medium text-gray-500 uppercase">Att.</Text>
                <Text className="flex-2 text-right text-xs font-medium text-gray-500 uppercase">Base</Text>
                <Text className="flex-2 text-right text-xs font-medium text-gray-500 uppercase">Special</Text>
                <Text className="flex-2 text-right text-xs font-medium text-gray-500 uppercase">Total</Text>
              </View>
              {dailyCharges.map((charge) => {
                const statusInfo = getStatusInfo(charge.attendance_status);
                const isExpanded = expandedRow === charge.id;

                return (
                  <View key={charge.id} className="border-b border-gray-200">
                    <TouchableOpacity
                      onPress={() => toggleRow(charge.id)}
                      className="flex-row items-center px-4 py-3 bg-white"
                    >
                      <Text className="flex-2 text-sm text-gray-900">{moment(charge.date).format('MMM DD')}</Text>
                      <View className="flex-2 flex-row items-center">
                        {statusInfo.icon}
                        <Text className={`ml-1 text-sm font-medium ${statusInfo.color}`}>{statusInfo.text}</Text>
                      </View>
                      <Text className={`flex-2 text-right text-sm font-medium ${parseFloat(charge.baseMessCharge) > 0 ? 'text-gray-900' : 'text-gray-400'}`}>
                        ₹{parseFloat(charge.baseMessCharge).toFixed(2)}
                      </Text>
                      <Text className={`flex-2 text-right text-sm font-medium ${parseFloat(charge.specialFoodCost) > 0 ? 'text-gray-900' : 'text-gray-400'}`}>
                        ₹{parseFloat(charge.specialFoodCost).toFixed(2)}
                      </Text>
                      <Text className="flex-2 text-right text-sm font-bold text-blue-600">
                        ₹{parseFloat(charge.dailyTotalCharge).toFixed(2)}
                      </Text>
                      {isExpanded ? <ChevronUp className="w-4 h-4 text-gray-600 ml-2" /> : <ChevronDown className="w-4 h-4 text-gray-600 ml-2" />}
                    </TouchableOpacity>
                    {isExpanded && (
                      <View className="bg-gray-50 p-4 border-t border-gray-200">
                        <View className="border-l-4 border-blue-500 pl-4 space-y-4">
                          {/* Base Mess Charge Details */}
                          <View>
                            <Text className="font-semibold text-gray-800 mb-2">Base Mess Charge</Text>
                            <View className="space-y-1">
                              <View className="flex-row justify-between">
                                <Text className="font-bold">Your Daily Share:</Text>
                                <Text className="font-bold">₹{parseFloat(charge.baseMessCharge).toFixed(2)}</Text>
                              </View>
                              <View className="flex-row justify-between text-sm text-gray-600">
                                <Text>Hostel's Monthly Calculated Daily Rate:</Text>
                                <Text>₹{monthlyCalculatedDailyRate.toFixed(2)}</Text>
                              </View>
                            </View>
                          </View>

                          {/* Special Food Orders Details */}
                          <View>
                            <Text className="font-semibold text-gray-800 mb-2">Special Food Orders (Pending Payment)</Text>
                            <View className="space-y-1">
                              <View className="flex-row justify-between">
                                <Text className="font-medium">Amount:</Text>
                                <Text className={parseFloat(charge.specialFoodCost) > 0 ? 'font-bold text-green-600' : 'text-gray-500'}>
                                  ₹{parseFloat(charge.specialFoodCost).toFixed(2)}
                                </Text>
                              </View>
                              <Text className="text-sm text-gray-600 italic">
                                This is the cost of special food items you ordered for this day, which is still pending payment and added to your bill.
                              </Text>
                            </View>
                          </View>

                          {/* Daily Summary */}
                          <View>
                            <Text className="font-semibold text-gray-800 mb-2">Daily Summary</Text>
                            <View className="space-y-1">
                              <View className="mt-4 pt-2 border-t border-gray-300 flex-row justify-between">
                                <Text className="font-bold text-lg">Your Total Daily Charge:</Text>
                                <Text className="font-bold text-lg text-blue-600">
                                  ₹{parseFloat(charge.dailyTotalCharge).toFixed(2)}
                                </Text>
                              </View>
                            </View>
                          </View>
                        </View>
                      </View>
                    )}
                  </View>
                );
              })}
            </View>
          ) : (
            <View className="text-center py-12">
              <Receipt className="mx-auto h-12 w-12 text-gray-400" />
              <Text className="mt-2 text-sm font-medium text-gray-900">No charges found for this month</Text>
              <Text className="mt-1 text-sm text-gray-500">Mess charges are calculated and applied daily by the mess manager.</Text>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
};

export default MyMessChargesScreen;
