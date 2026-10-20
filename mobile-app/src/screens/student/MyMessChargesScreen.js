import { LinearGradient } from 'expo-linear-gradient';
import Screen from '../../components/common/Screen';
import Button from '../../components/common/Button';
import Card from '../../components/common/Card';
import colors from '../../theme/colors';
import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, ActivityIndicator, Alert, TouchableOpacity } from 'react-native';
import { studentAPI } from '../../api/api';
import { Receipt, Calendar, CheckCircle, XCircle, ChevronDown, ChevronUp, Clock, DollarSign, BookOpen, Droplet, ExternalLink, Bed, Utensils, History, ChevronRight } from 'lucide-react-native';
import moment from 'moment';
import Header from '../../components/student/StudentHeader';
import { Picker } from '@react-native-picker/picker';

const MyMessChargesScreen = ({ navigation }) => {
  const [dailyCharges, setDailyCharges] = useState([]);
  const [monthlyFlatFees, setMonthlyFlatFees] = useState([]);
  const [monthlyCalculatedDailyRate, setMonthlyCalculatedDailyRate] = useState(0);
  const [studentTotalManDaysForMonth, setStudentTotalManDaysForMonth] = useState(0);
  const [totalMonthlySpecialFoodCost, setTotalMonthlySpecialFoodCost] = useState(0);

  const [reductionSummary, setReductionSummary] = useState({});
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
      setReductionSummary(data.monthlySummary || {});
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

  const foodCharge = reductionSummary.historicalMessAmount ?? (monthlyCalculatedDailyRate * studentTotalManDaysForMonth);
  const totalFlatFeesSum = monthlyFlatFees.reduce((sum, fee) => sum + parseFloat(fee.amount || 0), 0);
  const totalMonthlyBill = reductionSummary.historicalFinalAmount ?? (foodCharge + totalMonthlySpecialFoodCost + totalFlatFeesSum);

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

  const money = value => Number(value || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return <Screen className="flex-1 bg-background">
    <Header title="Mess & fees" />
    <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 16, paddingBottom: 32, gap: 16 }}>
      <View className="flex-row items-center justify-between" style={{ gap: 12 }}>
        <Text className="text-lg font-bold text-gray-900">Monthly statement</Text>
        <TouchableOpacity accessibilityRole="button" onPress={() => navigation.navigate('Transactions')} className="p-3 flex-row items-center">
          <History size={17} color={colors.primary}/><Text className="text-xs font-semibold text-indigo-600 ml-2">History</Text>
        </TouchableOpacity>
      </View>
      <View className="bg-white border border-gray-200 rounded-xl">
        <Picker accessibilityLabel="Billing month" selectedValue={`${currentYear}-${String(currentMonth).padStart(2, '0')}`} onValueChange={handleMonthChange}>
          {monthOptions.map(option => <Picker.Item key={option.value} label={option.label} value={option.value} />)}
        </Picker>
      </View>
      <LinearGradient colors={[colors.primary, colors.primaryDark]} style={{ padding: 22, borderRadius: 22, gap: 10 }}>
        <Text style={{ color: colors.card, fontSize: 10, fontWeight: '600', letterSpacing: 1 }}>TOTAL MONTHLY CHARGES</Text>
        <Text style={{ color: colors.card, fontSize: 32, fontWeight: '700' }}>{loading ? '—' : `₹${money(totalMonthlyBill)}`}</Text>
        <Text style={{ color: colors.card, fontSize: 13 }}>{moment(new Date(currentYear, currentMonth - 1)).format('MMMM YYYY')}</Text>
        <Text style={{ color: colors.card, fontSize: 12, lineHeight: 18 }}>Food charges, additional food and applicable hostel fees.</Text>
      </LinearGradient>
      <View className="flex-row" style={{ gap: 12 }}>
        <Card className="bg-white rounded-2xl border border-gray-200 p-4 flex-1">
          <Text className="text-xs text-gray-600 mb-2">Daily food rate</Text><Text className="text-lg font-bold text-gray-900">₹{money(monthlyCalculatedDailyRate)}</Text>
        </Card>
        <Card className="bg-white rounded-2xl border border-gray-200 p-4 flex-1">
          <Text className="text-xs text-gray-600 mb-2">Approved reduction</Text><Text className="text-lg font-bold text-green-700">{reductionSummary.approvedReductionDays == null ? 'Legacy' : `${reductionSummary.approvedReductionDays} days`}</Text>
        </Card>
      </View>
      <Button onPress={() => navigation.navigate('FoodOrder')} className="bg-indigo-600 rounded-xl p-4 flex-row items-center justify-center">
        <Utensils size={20} color={colors.card} /><Text className="text-white font-semibold ml-2">Additional Food</Text><ChevronRight size={18} color={colors.card} style={{ marginLeft: 8 }}/>
      </Button>
      <Text className="text-base font-bold text-gray-900">Charge breakdown</Text>
      <Card className="bg-white rounded-2xl border border-gray-200 p-4">
        {[
          ['Food charges', foodCharge, 'Monthly food share after applicable reductions'],
          ['Additional food', totalMonthlySpecialFoodCost, 'Orders for the selected month'],
        ].map(([label, amount, detail], index) => <View key={label} className={index ? 'border-t border-gray-100 py-4' : 'pb-4'}>
          <View className="flex-row justify-between" style={{ gap: 12 }}><Text className="text-sm font-semibold text-gray-900 flex-1">{label}</Text><Text className="text-sm font-bold text-gray-900">₹{money(amount)}</Text></View>
          <Text className="text-xs text-gray-600 mt-1">{detail}</Text>
        </View>)}
        {monthlyFlatFees.map((fee, index) => <View key={fee.fee_type || index} className="border-t border-gray-100 py-4">
          <View className="flex-row items-center justify-between" style={{ gap: 12 }}>
            <View className="flex-row items-center flex-1">{getFeeIcon(fee.fee_type)}<Text className="text-sm font-semibold text-gray-900 capitalize flex-1">{fee.fee_type.replace(/_/g, ' ')}</Text></View>
            <Text className="text-sm font-bold text-gray-900">₹{money(fee.amount)}</Text>
          </View>
          {!!fee.description&&<Text className="text-xs text-gray-600 mt-1">{fee.description}</Text>}
        </View>)}
        <View className="border-t border-gray-200 pt-4 flex-row justify-between" style={{ gap: 12 }}><Text className="text-sm font-bold text-gray-900">Total charges</Text><Text className="text-lg font-bold text-indigo-600">₹{money(totalMonthlyBill)}</Text></View>
      </Card>
      <View className="bg-teal-50 border border-teal-100 rounded-xl p-4">
        <Text className="text-sm text-teal-800 leading-5">Base days: {reductionSummary.baseDays ?? 'Legacy'} · Approved reductions: {reductionSummary.approvedReductionDays ?? 'Legacy'}. Only approved operational days reduce food charges. Water and other charges stay unchanged.</Text>
        <Text className="text-xs text-gray-600 mt-2">Recorded P / OD man-days: {studentTotalManDaysForMonth}</Text>
      </View>
      <TouchableOpacity accessibilityRole="button" onPress={() => navigation.navigate('MyFoodOrders')} className="bg-white border border-gray-200 rounded-2xl p-4 flex-row items-center justify-between">
        <View style={{ gap: 4, flex: 1 }}><Text className="text-sm font-semibold text-gray-900">Additional food orders</Text><Text className="text-xs text-gray-600">View requests, serving dates and status</Text></View><ChevronRight size={19} color={colors.primary}/>
      </TouchableOpacity>
      <Text className="text-base font-bold text-gray-900">Daily charges</Text>
      {loading ? <ActivityIndicator color={colors.primary}/> : dailyCharges.length ? dailyCharges.map(charge => {
        const statusInfo = getStatusInfo(charge.attendance_status);
        const isExpanded = expandedRow === charge.id;
        return <Card key={charge.id} className="bg-white border border-gray-200 rounded-2xl p-4">
          <TouchableOpacity accessibilityRole="button" accessibilityState={{ expanded: isExpanded }} accessibilityLabel={`Charges for ${moment(charge.date).format('DD MMM YYYY')}`} onPress={() => toggleRow(charge.id)}>
            <View className="flex-row items-center justify-between" style={{ gap: 12 }}>
              <View className="flex-1"><Text className="text-sm font-semibold text-gray-900">{moment(charge.date).format('ddd, DD MMM')}</Text>
                <View className="flex-row items-center mt-2">{statusInfo.icon}<Text className={`text-xs ml-2 ${statusInfo.color}`}>{statusInfo.text}</Text></View>
              </View>
              <Text className="text-base font-bold text-indigo-600">₹{money(charge.dailyTotalCharge)}</Text>
              {isExpanded ? <ChevronUp size={18} color={colors.mutedText}/> : <ChevronDown size={18} color={colors.mutedText}/>}
            </View>
          </TouchableOpacity>
          {isExpanded&&<View className="mt-4 pt-4 border-t border-gray-100" style={{ gap: 12 }}>
            {[
              ['Daily food share', charge.baseMessCharge],
              ['Additional food', charge.specialFoodCost],
              ['Monthly daily rate', monthlyCalculatedDailyRate],
              ['Total for this day', charge.dailyTotalCharge],
            ].map(([label, value])=><View key={label} className="flex-row justify-between" style={{ gap: 12 }}><Text className="text-sm text-gray-600 flex-1">{label}</Text><Text className="text-sm font-semibold text-gray-900">₹{money(value)}</Text></View>)}
          </View>}
        </Card>;
      }) : <Card><Text className="text-sm text-gray-600 text-center">No charges found for this month.</Text></Card>}
    </ScrollView>
  </Screen>;
};
export default MyMessChargesScreen;
