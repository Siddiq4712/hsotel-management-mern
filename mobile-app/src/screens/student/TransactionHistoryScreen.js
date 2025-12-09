import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, ActivityIndicator, Alert, TouchableOpacity } from 'react-native';
import { studentAPI } from '../../api/api';
import { CreditCard, Calendar, DollarSign, CheckCircle, XCircle, Clock, Filter } from 'lucide-react-native';
import moment from 'moment';
import Header from '../../components/common/Header';
import StatusBadge from '../../components/common/StatusBadge';
import { Picker } from '@react-native-picker/picker';

const TransactionHistoryScreen = () => {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    fetchTransactions();
  }, [filter]); // Re-fetch when filter changes

  const fetchTransactions = async () => {
    setLoading(true);
    try {
      const params = filter === 'all' ? {} : { status: filter };
      const response = await studentAPI.getTransactions(params); // Assuming API can take status filter
      setTransactions(response.data.data || []);
    } catch (error) {
      console.error('Error fetching transactions:', error);
      Alert.alert('Error', error.message || 'Failed to load transactions.');
    } finally {
      setLoading(false);
    }
  };

  const getTransactionTypeColor = (type) => {
    switch (type) {
      case 'payment': return 'bg-red-50 text-red-700 border-red-200';
      case 'refund': return 'bg-green-50 text-green-700 border-green-200';
      case 'adjustment': return 'bg-blue-50 text-blue-700 border-blue-200';
      default: return 'bg-gray-50 text-gray-700 border-gray-200';
    }
  };

  const totalAmount = transactions.reduce((sum, transaction) => {
    return sum + parseFloat(transaction.amount);
  }, 0);

  if (loading) {
    return (
      <View className="flex-1 justify-center items-center bg-gray-100">
        <ActivityIndicator size="large" color="#4F46E5" />
        <Text className="mt-4 text-lg text-gray-700">Loading transactions...</Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-gray-50">
      <Header />
      <ScrollView className="p-4">
        <View className="mb-8 flex-row justify-between items-center">
          <View>
            <Text className="text-3xl font-bold text-gray-900 mb-2">Transaction History</Text>
            <Text className="text-gray-600">View your payment and transaction history</Text>
          </View>
        </View>

        {/* Filter dropdown */}
        <View className="mb-6">
          <Text className="text-sm font-medium text-gray-700 mb-2">Filter by Status:</Text>
          <View className="relative border border-gray-300 rounded-lg">
            <Picker
              selectedValue={filter}
              onValueChange={(itemValue) => setFilter(itemValue)}
              className="w-full h-12"
            >
              <Picker.Item label="All Transactions" value="all" />
              <Picker.Item label="Completed" value="completed" />
              <Picker.Item label="Pending" value="pending" />
              <Picker.Item label="Failed" value="failed" />
              <Picker.Item label="Cancelled" value="cancelled" />
            </Picker>
          </View>
        </View>

        {/* Statistics */}
        <View className="flex-row flex-wrap justify-between mb-8">
          <View className="w-[48%] bg-white rounded-lg shadow-md p-3 mb-2">
            <View className="flex-row items-center">
              <CreditCard className="text-blue-600" size={24} />
              <View className="ml-3">
                <Text className="text-sm text-gray-600">Total Txns</Text>
                <Text className="text-2xl font-bold text-blue-900">{transactions.length}</Text>
              </View>
            </View>
          </View>
          <View className="w-[48%] bg-white rounded-lg shadow-md p-3 mb-2">
            <View className="flex-row items-center">
              <DollarSign className="text-green-600" size={24} />
              <View className="ml-3">
                <Text className="text-sm text-gray-600">Total Amount</Text>
                <Text className="text-2xl font-bold text-green-900">₹{totalAmount.toFixed(2)}</Text>
              </View>
            </View>
          </View>
          <View className="w-[48%] bg-white rounded-lg shadow-md p-3 mt-2">
            <View className="flex-row items-center">
              <CheckCircle className="text-green-600" size={24} />
              <View className="ml-3">
                <Text className="text-sm text-gray-600">Completed</Text>
                <Text className="text-2xl font-bold text-green-900">
                  {transactions.filter(t => t.status === 'completed').length}
                </Text>
              </View>
            </View>
          </View>
          <View className="w-[48%] bg-white rounded-lg shadow-md p-3 mt-2">
            <View className="flex-row items-center">
              <Clock className="text-yellow-600" size={24} />
              <View className="ml-3">
                <Text className="text-sm text-gray-600">Pending</Text>
                <Text className="text-2xl font-bold text-yellow-900">
                  {transactions.filter(t => t.status === 'pending').length}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Transactions List */}
        <View className="bg-white shadow-md rounded-lg overflow-hidden">
          <View className="px-4 py-3 bg-gray-50 border-b border-gray-200 flex-row items-center">
            <CreditCard className="text-gray-400 mr-2" size={20} />
            <Text className="text-lg font-medium text-gray-900">Transaction History</Text>
            {filter !== 'all' && (
              <Text className="ml-2 text-sm text-gray-500">
                (Filtered by {filter})
              </Text>
            )}
          </View>

          {transactions.length > 0 ? (
            <View>
              {transactions.map((transaction) => (
                <View key={transaction.id} className="p-4 border-b border-gray-200 last:border-b-0">
                  <View className="flex-row justify-between items-center mb-2">
                    <View className={`px-2 py-0.5 rounded-full text-xs font-medium border ${getTransactionTypeColor(transaction.transaction_type)}`}>
                        <Text className={`text-xs font-medium ${getTransactionTypeColor(transaction.transaction_type).split(' ').find(cls => cls.startsWith('text-'))}`}>
                            {transaction.transaction_type.charAt(0).toUpperCase() + transaction.transaction_type.slice(1)}
                        </Text>
                    </View>
                    <StatusBadge status={transaction.status} type="transaction" />
                  </View>
                  <Text className="text-sm text-gray-700 mb-1" numberOfLines={2}>
                    {transaction.description || 'No description provided.'}
                  </Text>
                  <View className="flex-row justify-between items-center mt-2">
                    <View className="flex-row items-center">
                      <DollarSign size={16} className="mr-1 text-green-600" />
                      <Text className={transaction.transaction_type === 'refund' ? 'text-green-600 font-bold' : 'text-red-600 font-bold'}>
                        {transaction.transaction_type === 'refund' ? '+' : '-'}₹{parseFloat(transaction.amount).toFixed(2)}
                      </Text>
                    </View>
                    <View className="flex-row items-center">
                      <Calendar className="mr-1 text-gray-500" size={14} />
                      <Text className="text-sm text-gray-500">
                        {moment(transaction.createdAt).format('MMM DD, YYYY')}
                      </Text>
                    </View>
                  </View>
                  <View className="flex-row justify-between items-center mt-1">
                    <Text className="text-xs text-gray-500">Method: {transaction.payment_method.replace('_', ' ').toUpperCase()}</Text>
                    <Text className="text-xs text-gray-500">Ref: {transaction.reference_id || 'N/A'}</Text>
                  </View>
                </View>
              ))}
            </View>
          ) : (
            <View className="text-center py-12">
              <CreditCard className="mx-auto h-12 w-12 text-gray-400" />
              <Text className="mt-2 text-sm font-medium text-gray-900">No transactions found</Text>
              <Text className="mt-1 text-sm text-gray-500">
                {filter === 'all' 
                  ? 'Your transaction history will appear here.'
                  : `No ${filter} transactions found.`
                }
              </Text>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
};

export default TransactionHistoryScreen;
