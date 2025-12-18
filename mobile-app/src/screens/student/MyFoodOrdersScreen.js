import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, ActivityIndicator, Alert, TouchableOpacity, Modal, FlatList } from 'react-native';
import { studentAPI } from '../../api/api';
import { Search, Clock, CheckCircle, XCircle, Eye, Download, Calendar, Utensils, Info } from 'lucide-react-native';
import DateTimePickerModal from 'react-native-modal-datetime-picker';
import moment from 'moment';
import Header from '../../components/common/Header';
import StatusBadge from '../../components/common/StatusBadge';
import { Picker } from '@react-native-picker/picker';
const MyFoodOrdersScreen = ({ navigation }) => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [dateRange, setDateRange] = useState({ startDate: null, endDate: null });
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [pickerMode, setPickerMode] = useState('from'); // 'from' or 'to'
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [viewModalVisible, setViewModalVisible] = useState(false);

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      let params = {};
      if (dateRange.startDate && dateRange.endDate) {
        params = {
          from_date: moment(dateRange.startDate).format('YYYY-MM-DD'),
          to_date: moment(dateRange.endDate).format('YYYY-MM-DD')
        };
      }
      
      const response = await studentAPI.getFoodOrders(params);
      if (response.data.success) {
        setOrders(response.data.data);
      } else {
        Alert.alert('Error', response.data.message || 'Failed to load orders');
      }
    } catch (error) {
      console.error('Failed to fetch orders:', error);
      Alert.alert('Error', error.message || 'Failed to load orders. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    fetchOrders();
  };

  const handleReset = () => {
    setDateRange({ startDate: null, endDate: null });
    fetchOrders();
  };

  const handleViewOrder = (order) => {
    setSelectedOrder(order);
    setViewModalVisible(true);
  };

  const handleCancelOrder = async (id) => {
    Alert.alert(
      'Confirm Cancellation',
      'Are you sure you want to cancel this order? This action cannot be undone.',
      [
        { text: 'No', style: 'cancel' },
        { text: 'Yes, Cancel', onPress: async () => {
            try {
              const response = await studentAPI.cancelFoodOrder(id);
              if (response.data.success) {
                Alert.alert('Success', 'Order cancelled successfully!');
                fetchOrders();
              } else {
                Alert.alert('Error', response.data.message || 'Failed to cancel order');
              }
            } catch (error) {
              console.error('Failed to cancel order:', error);
              Alert.alert('Error', error.message || 'Failed to cancel order. Please try again later.');
            }
          },
          style: 'destructive'
        }
      ]
    );
  };

  const renderOrderStatus = (status) => {
    return <StatusBadge status={status} type="foodOrder" />;
  };

  const handleConfirmDatePicker = (date) => {
    if (pickerMode === 'from') {
      setDateRange(prev => ({ ...prev, startDate: date }));
    } else {
      setDateRange(prev => ({ ...prev, endDate: date }));
    }
    setShowDatePicker(false);
  };

  const getPaymentStatusColor = (status) => {
    switch (status) {
      case 'paid': return 'bg-green-100 text-green-800';
      case 'refunded': return 'bg-orange-100 text-orange-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getTimelineColor = (status) => {
    switch (status) {
      case 'pending': return '#F59E0B'; // Yellow
      case 'confirmed': return '#3B82F6'; // Blue
      case 'preparing': return '#A855F7'; // Purple
      case 'ready': return '#06B6D4'; // Cyan
      case 'delivered': return '#10B981'; // Green
      case 'cancelled': return '#EF4444'; // Red
      default: return '#6B7280'; // Gray
    }
  };

  const OrderCard = ({ order }) => (
    <View className="bg-white rounded-lg shadow-md p-4 mb-4">
      <View className="flex-row justify-between items-center mb-2">
        <Text className="font-bold text-lg">Order #{order.id}</Text>
        {renderOrderStatus(order.status)}
      </View>
      <View className="flex-row justify-between items-center mb-2">
        <Text className="text-sm text-gray-600">Order Date:</Text>
        <Text className="text-sm text-gray-800">{moment(order.order_date).format('DD/MM/YYYY h:mm A')}</Text>
      </View>
      <View className="flex-row justify-between items-center mb-2">
        <Text className="text-sm text-gray-600">Requested Time:</Text>
        <Text className="text-sm text-gray-800">{moment(order.requested_time).format('DD/MM/YYYY h:mm A')}</Text>
      </View>
      <View className="flex-row justify-between items-center mb-2">
        <Text className="text-sm text-gray-600">Total Amount:</Text>
        <Text className="font-bold text-lg text-blue-600">₹{parseFloat(order.total_amount).toFixed(2)}</Text>
      </View>
      <View className="flex-row justify-between items-center mb-4">
        <Text className="text-sm text-gray-600">Payment Status:</Text>
        <View className={`px-2 py-1 rounded-full text-xs font-medium ${getPaymentStatusColor(order.payment_status)}`}>
            <Text className={`text-xs font-medium ${getPaymentStatusColor(order.payment_status).split(' ').find(cls => cls.startsWith('text-'))}`}>
                {order.payment_status.toUpperCase()}
            </Text>
        </View>
      </View>
      <View className="flex-row justify-end space-x-2">
        <TouchableOpacity
          onPress={() => handleViewOrder(order)}
          className="bg-blue-600 px-3 py-2 rounded-lg flex-row items-center"
        >
          <Eye size={16} color="white" className="mr-1" />
          <Text className="text-white text-sm">View</Text>
        </TouchableOpacity>
        {order.status === 'pending' && (
          <TouchableOpacity
            onPress={() => handleCancelOrder(order.id)}
            className="bg-red-600 px-3 py-2 rounded-lg flex-row items-center"
          >
            <XCircle size={16} color="white" className="mr-1" />
            <Text className="text-white text-sm">Cancel</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  const renderOrderDetailModal = () => {
    if (!selectedOrder) return null;
    
    return (
      <Modal
        animationType="slide"
        transparent={true}
        visible={viewModalVisible}
        onRequestClose={() => setViewModalVisible(false)}
      >
        <View className="flex-1 justify-end bg-black/50 p-4">
          <View className="bg-white rounded-t-xl p-6 h-[90%]">
            <View className="flex-row justify-between items-center mb-4">
              <Text className="text-2xl font-bold">Order #{selectedOrder.id} Details</Text>
              <TouchableOpacity onPress={() => setViewModalVisible(false)}>
                <XCircle size={28} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <ScrollView className="flex-1 mb-4">
              <View className="border border-gray-200 rounded-lg overflow-hidden mb-4">
                <View className="bg-gray-50 p-3">
                  <Text className="font-semibold text-gray-800">Order Summary</Text>
                </View>
                <View className="p-3 space-y-2">
                  <View className="flex-row justify-between">
                    <Text className="text-gray-600">Order Date:</Text>
                    <Text className="font-medium">{moment(selectedOrder.order_date).format('DD/MM/YYYY h:mm A')}</Text>
                  </View>
                  <View className="flex-row justify-between">
                    <Text className="text-gray-600">Requested Time:</Text>
                    <Text className="font-medium">{moment(selectedOrder.requested_time).format('DD/MM/YYYY h:mm A')}</Text>
                  </View>
                  <View className="flex-row justify-between">
                    <Text className="text-gray-600">Status:</Text>
                    {renderOrderStatus(selectedOrder.status)}
                  </View>
                  <View className="flex-row justify-between">
                    <Text className="text-gray-600">Payment Status:</Text>
                    <View className={`px-2 py-1 rounded-full text-xs font-medium ${getPaymentStatusColor(selectedOrder.payment_status)}`}>
                        <Text className={`text-xs font-medium ${getPaymentStatusColor(selectedOrder.payment_status).split(' ').find(cls => cls.startsWith('text-'))}`}>
                            {selectedOrder.payment_status.toUpperCase()}
                        </Text>
                    </View>
                  </View>
                  <View className="flex-row justify-between">
                    <Text className="text-lg font-bold">Total Amount:</Text>
                    <Text className="text-xl font-bold text-blue-600">₹{parseFloat(selectedOrder.total_amount).toFixed(2)}</Text>
                  </View>
                  {selectedOrder.notes && (
                    <View>
                      <Text className="text-gray-600 mt-2">Notes:</Text>
                      <Text className="font-medium text-gray-800">{selectedOrder.notes}</Text>
                    </View>
                  )}
                </View>
              </View>

              <View className="border border-gray-200 rounded-lg overflow-hidden mb-4">
                <View className="bg-gray-50 p-3">
                  <Text className="font-semibold text-gray-800">Order Items</Text>
                </View>
                <FlatList
                  data={selectedOrder.FoodOrderItems}
                  keyExtractor={item => item.id.toString()}
                  renderItem={({ item }) => (
                    <View className="p-3 border-b border-gray-100 last:border-b-0">
                      <View className="flex-row justify-between items-center">
                        <Text className="font-medium text-gray-900">{item.SpecialFoodItem?.name}</Text>
                        <Text className="text-sm text-gray-700">x{item.quantity}</Text>
                      </View>
                      <View className="flex-row justify-between items-center mt-1">
                        <Text className="text-xs text-gray-500">₹{parseFloat(item.unit_price).toFixed(2)} each</Text>
                        <Text className="font-medium text-gray-800">₹{parseFloat(item.subtotal).toFixed(2)}</Text>
                      </View>
                      {item.special_instructions && (
                        <Text className="text-xs text-gray-600 mt-1 italic">Instructions: {item.special_instructions}</Text>
                      )}
                    </View>
                  )}
                />
              </View>

              <View className="border border-gray-200 rounded-lg overflow-hidden mb-4">
                <View className="bg-gray-50 p-3">
                  <Text className="font-semibold text-gray-800">Order Timeline</Text>
                </View>
                <View className="p-3">
                  {/* Simplified timeline */}
                  <Text className="text-sm text-gray-800"><Text className="font-bold text-green-600">● </Text>Order Placed: {moment(selectedOrder.createdAt).format('DD/MM/YYYY h:mm A')}</Text>
                  {selectedOrder.status !== 'pending' && (
                    <Text className="text-sm text-gray-800 mt-2"><Text className="font-bold text-blue-600">● </Text>Order Confirmed/Updated: {moment(selectedOrder.updatedAt).format('DD/MM/YYYY h:mm A')}</Text>
                  )}
                  {selectedOrder.status === 'cancelled' && (
                    <Text className="text-sm text-gray-800 mt-2"><Text className="font-bold text-red-600">● </Text>Cancelled: {moment(selectedOrder.updatedAt).format('DD/MM/YYYY h:mm A')}</Text>
                  )}
                </View>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    );
  };

  return (
    <View className="flex-1 bg-gray-50">
      <Header />
      <ScrollView className="p-4">
        <Text className="text-3xl font-bold text-gray-900 mb-2">My Food Orders</Text>
        <Text className="text-gray-600 mb-6">Track your special food order history</Text>

        <View className="flex-row flex-wrap justify-between items-center mb-4">
          <TouchableOpacity
            onPress={() => { setShowDatePicker(true); setPickerMode('from'); }}
            className="w-[48%] border border-gray-300 rounded-lg p-3 flex-row justify-between items-center mb-2"
          >
            <Text className="text-gray-700">{dateRange.startDate ? moment(dateRange.startDate).format('YYYY-MM-DD') : 'From Date'}</Text>
            <Calendar size={20} color="#6B7280" />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => { setShowDatePicker(true); setPickerMode('to'); }}
            className="w-[48%] border border-gray-300 rounded-lg p-3 flex-row justify-between items-center mb-2"
          >
            <Text className="text-gray-700">{dateRange.endDate ? moment(dateRange.endDate).format('YYYY-MM-DD') : 'To Date'}</Text>
            <Calendar size={20} color="#6B7280" />
          </TouchableOpacity>
          
          <TouchableOpacity
            onPress={handleSearch}
            className="w-[48%] bg-blue-600 py-3 rounded-lg flex-row items-center justify-center mb-2"
          >
            <Search size={20} color="white" className="mr-2" />
            <Text className="text-white font-semibold">Search</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handleReset}
            className="w-[48%] bg-gray-300 py-3 rounded-lg flex-row items-center justify-center mb-2"
          >
            <Text className="text-gray-700 font-semibold">Reset</Text>
          </TouchableOpacity>
        </View>

        {loading ? (
          <View className="flex-1 justify-center items-center h-64">
            <ActivityIndicator size="large" color="#4F46E5" />
            <Text className="mt-4 text-lg text-gray-700">Loading orders...</Text>
          </View>
        ) : orders.length > 0 ? (
          <FlatList
            data={orders}
            keyExtractor={item => item.id.toString()}
            renderItem={({ item }) => <OrderCard order={item} />}
            showsVerticalScrollIndicator={false}
          />
        ) : (
          <View className="text-center py-12 bg-white rounded-lg shadow-md">
            <Utensils className="mx-auto h-12 w-12 text-gray-400" />
            <Text className="mt-2 text-sm font-medium text-gray-900">No food orders found</Text>
            <Text className="mt-1 text-sm text-gray-500">Your special food order history will appear here.</Text>
          </View>
        )}
      </ScrollView>

      {renderOrderDetailModal()}

      <DateTimePickerModal
        isVisible={showDatePicker}
        mode="date"
        onConfirm={handleConfirmDatePicker}
        onCancel={() => setShowDatePicker(false)}
        date={new Date()}
      />
    </View>
  );
};

export default MyFoodOrdersScreen;
