import { Segments, ServiceLink } from '../../components/common/ReferenceDesign';
import { Text } from "../../components/common/ReferenceDesign";
import HighlightCard, { highlightStyles } from '../../components/common/HighlightCard';
import Screen from '../../components/common/Screen';
import Button from '../../components/common/Button';
import Card from '../../components/common/Card';
import colors from '../../theme/colors';
import React, { useState, useEffect } from 'react';
import { View, ScrollView, ActivityIndicator, Alert, TouchableOpacity, Modal } from 'react-native';
import { studentAPI } from '../../api/api';
import { Receipt, Calendar, CheckCircle, XCircle, ChevronDown, ChevronUp, Clock, DollarSign, BookOpen, Droplet, ExternalLink, Bed, Utensils, History, ChevronRight } from 'lucide-react-native';
import moment from 'moment';
import Header from '../../components/student/StudentHeader';

const MyMessChargesScreen = ({ navigation }) => {
  const [mode, setMode] = useState('statement');
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
  const [monthPickerOpen, setMonthPickerOpen] = useState(false);

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
      <Segments items={[['statement', 'Monthly statement'], ['services', 'Mess services']]} value={mode} onChange={setMode} />
      {mode === 'statement' ? <>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <Text style={{ color: colors.mutedText, fontSize: 12, fontWeight: '600', flexShrink: 1 }}>Billing period</Text>
        <TouchableOpacity accessibilityRole="button" accessibilityLabel={`Billing month: ${moment(new Date(currentYear, currentMonth - 1)).format('MMMM YYYY')}`}
          accessibilityState={{ expanded: monthPickerOpen }} onPress={() => setMonthPickerOpen(true)}
          style={{ minHeight: 40, maxWidth: '60%', paddingHorizontal: 12, paddingVertical: 9, flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, borderColor: colors.border, borderRadius: 10, backgroundColor: colors.card }}>
          <Text style={{ color: colors.text, fontSize: 12, flexShrink: 1 }}>{moment(new Date(currentYear, currentMonth - 1)).format('MMMM YYYY')}</Text><ChevronDown size={18} color={colors.text} />
        </TouchableOpacity>
      </View>
      <HighlightCard style={{ padding: 22 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
          <Text style={[highlightStyles.title, { flex: 1 }]}>TOTAL MONTHLY CHARGES</Text>
          <View style={[highlightStyles.badge, { flexShrink: 0, marginLeft: 'auto' }]}><Text style={highlightStyles.badgeText}>{moment(new Date(currentYear, currentMonth - 1)).format('MMMM YYYY')}</Text></View>
        </View>
        <Text style={[highlightStyles.value, { fontSize: 32 }]}>{loading ? '—' : `₹${money(totalMonthlyBill)}`}</Text>
        <Text style={highlightStyles.detail}>Detailed statement · This is not an online payment checkout.</Text>
      </HighlightCard>
        <Card className="bg-white rounded-2xl border border-gray-200 p-4">
          <Text style={{ color: colors.mutedText, fontSize: 12, fontWeight: '600', letterSpacing: 0.7, marginBottom: 8 }}>APPROVED REDUCTION</Text><Text style={{ color: colors.primaryDark, fontSize: 22, fontWeight: '700' }}>{reductionSummary.approvedReductionDays == null ? 'Legacy' : `${reductionSummary.approvedReductionDays} days`}</Text>
          <Text style={{ color: colors.mutedText, fontSize: 12, marginTop: 6 }}>Applied to eligible food charges only</Text>
        </Card>
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
      </> : <>
        <Card style={{ padding: 16, gap: 14 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <View style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' }}><Utensils size={22} color={colors.primary} /></View>
            <View style={{ flex: 1, gap: 4 }}>
              <Text style={{ color: colors.text, fontSize: 17, fontWeight: '700' }}>Additional food</Text>
              <Text style={{ color: colors.mutedText, fontSize: 12, lineHeight: 18 }}>Browse items available for upcoming serving dates.</Text>
            </View>
          </View>
          <Button onPress={() => navigation.navigate('FoodOrder')} style={{ alignSelf: 'stretch' }}>Browse food catalogue</Button>
        </Card>
        <Text accessibilityRole="header" style={{ color: colors.text, fontSize: 16, fontWeight: '700' }}>Your mess services</Text>
        <ServiceLink icon={Utensils} title="My food orders" tone="teal" onPress={() => navigation.navigate('MyFoodOrders')} />
        <ServiceLink icon={History} title="Transaction history" tone="warning" onPress={() => navigation.navigate('Transactions')} />
        <ServiceLink icon={Receipt} title="Mess reduction history" onPress={() => navigation.navigate('Attendance', { workflow: 'reduction', view: 'history', request: Date.now() })} />
      </>}
    </ScrollView>
    <Modal visible={monthPickerOpen} transparent animationType="fade" onRequestClose={() => setMonthPickerOpen(false)}>
      <View style={{ flex: 1, backgroundColor: '#00000066', justifyContent: 'center', padding: 24 }}>
        <Card accessibilityViewIsModal style={{ width: '100%', maxWidth: 360, maxHeight: '75%', alignSelf: 'center', gap: 12 }}>
          <Text accessibilityRole="header" style={{ color: colors.text, fontSize: 18, fontWeight: '700' }}>Billing period</Text>
          <ScrollView keyboardShouldPersistTaps="handled">
            {monthOptions.map(option => {
              const selected = option.value === `${currentYear}-${String(currentMonth).padStart(2, '0')}`;
              return <TouchableOpacity key={option.value} accessibilityRole="button" accessibilityState={{ selected }}
                onPress={() => { handleMonthChange(option.value); setMonthPickerOpen(false); }}
                style={{ minHeight: 48, padding: 12, borderRadius: 10, backgroundColor: selected ? colors.primarySoft : colors.card }}>
                <Text style={{ color: selected ? colors.primary : colors.text, fontSize: 14, fontWeight: selected ? '700' : '400' }}>{option.label}</Text>
              </TouchableOpacity>;
            })}
          </ScrollView>
          <Button variant="ghost" onPress={() => setMonthPickerOpen(false)}>Close</Button>
        </Card>
      </View>
    </Modal>
  </Screen>;
};
export default MyMessChargesScreen;
