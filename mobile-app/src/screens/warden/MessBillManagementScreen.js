import MoreSectionNav from '../../components/common/MoreSectionNav';
import Screen from '../../components/common/Screen';
import Input from '../../components/common/Input';
import Button from '../../components/common/Button';
import Card from '../../components/common/Card';
import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, Modal, Alert, ActivityIndicator } from 'react-native';
import { wardenAPI } from '../../api/api';
import Header from '../../components/common/Header';
import StatusBadge from '../../components/common/StatusBadge';
import { DollarSign, Calendar, CheckCircle, XCircle } from 'lucide-react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import moment from 'moment';

const MessBillManagementScreen = () => {
  const [bills, setBills] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(moment());
  const [generateModal, setGenerateModal] = useState(false);
  const [amountPerDay, setAmountPerDay] = useState('');
  const [summary, setSummary] = useState({ totalBills: 0, totalAmount: 0, pendingBills: 0, pendingAmount: 0, paidBills: 0, paidAmount: 0 });

  useEffect(() => {
    fetchBills();
  }, [selectedMonth]);

  const fetchBills = async () => {
    setLoading(true);
    try {
      const res = await wardenAPI.getMessBills({ month: selectedMonth.month() + 1, year: selectedMonth.year() });
      setBills(res.data.data.bills || []);
      setSummary(res.data.data);
    } catch (error) {
      Alert.alert('Error', 'Failed to fetch bills');
    } finally {
      setLoading(false);
    }
  };

  const generateBills = async () => {
    if (!amountPerDay) return Alert.alert('Error', 'Amount per day required');
    try {
      await wardenAPI.generateMessBills({
        month: selectedMonth.month() + 1,
        year: selectedMonth.year(),
        amount_per_day: parseFloat(amountPerDay)
      });
      Alert.alert('Success', 'Bills generated');
      setGenerateModal(false);
      fetchBills();
    } catch (error) {
      Alert.alert('Error', error.message);
    }
  };

  const updateStatus = async (id, status) => {
    try {
      await wardenAPI.updateMessBillStatus(id, { status });
      fetchBills();
    } catch (error) {
      Alert.alert('Error', error.message);
    }
  };

  const renderBill = ({ item }) => (
    <Card className="bg-white p-4 rounded-2xl mb-3 border border-gray-100">
      <View className="flex-row justify-between items-center mb-2">
        <Text className="font-bold text-gray-900">{item.MessBillStudent?.userName}</Text>
        <StatusBadge status={item.status} type="bill" />
      </View>
      <Text className="text-gray-600">₹{parseFloat(item.amount).toFixed(2)}</Text>
      <Text className="text-gray-500 text-xs">Due: {moment(item.due_date).format('DD MMM YYYY')}</Text>
      {item.status !== 'paid' && (
        <Button onPress={() => updateStatus(item.id, 'paid')} className="bg-indigo-600 p-2 rounded mt-2">
          <Text className="text-white text-center">Mark Paid</Text>
        </Button>
      )}
    </Card>
  );

  return (
    <Screen className="flex-1 bg-background">
      <Header />
      <MoreSectionNav />
      <View className="p-4">
        <Button onPress={() => setGenerateModal(true)} className="bg-blue-600 p-4 rounded-xl items-center mb-4">
          <Text className="text-white font-bold">Generate Bills</Text>
        </Button>
        <View className="grid grid-cols-2 gap-4 mb-4">
          <View className="bg-blue-50 p-3 rounded-xl">
            <Text className="text-blue-600 font-bold">Total: ₹{summary.totalAmount?.toFixed(2)}</Text>
            <Text className="text-blue-500 text-sm">{summary.totalBills} bills</Text>
          </View>
          <View className="bg-green-50 p-3 rounded-xl">
            <Text className="text-green-600 font-bold">Pending: ₹{summary.pendingAmount?.toFixed(2)}</Text>
            <Text className="text-green-500 text-sm">{summary.pendingBills} bills</Text>
          </View>
        </View>
        <FlatList data={bills} renderItem={renderBill} keyExtractor={item => item.id.toString()} />
      </View>
      <Modal visible={generateModal} animationType="slide">
        <View className="flex-1 bg-white p-6">
          <Text className="text-xl font-bold mb-4">Generate Mess Bills</Text>
          <Input
            placeholder="Amount per day (₹)"
            value={amountPerDay}
            onChangeText={setAmountPerDay}
            keyboardType="numeric"
            className="border p-3 rounded mb-4"
          />
          <Button onPress={generateBills} className="bg-indigo-600 p-4 rounded">
            <Text className="text-white text-center font-bold">Generate</Text>
          </Button>
        </View>
      </Modal>
    </Screen>
  );
};

export default MessBillManagementScreen;