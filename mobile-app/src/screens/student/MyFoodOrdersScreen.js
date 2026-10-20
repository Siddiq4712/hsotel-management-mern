import Screen from '../../components/common/Screen';
import Button from '../../components/common/Button';
import Card from '../../components/common/Card';
import colors from '../../theme/colors';
import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, ActivityIndicator, Alert, TouchableOpacity, Modal, FlatList, StyleSheet } from 'react-native';
import { studentAPI } from '../../api/api';
import { Search, Clock, CheckCircle, XCircle, Eye, Download, Calendar, Utensils, Info } from 'lucide-react-native';
import DateTimePickerModal from 'react-native-modal-datetime-picker';
import moment from 'moment';
import Header from '../../components/student/StudentHeader';
import StatusBadge from '../../components/common/StatusBadge';
import { foodOrderPaymentStatus } from '../../utils/additionalFood';
import { Picker } from '@react-native-picker/picker';

const PAYMENT_STATUSES = {
  pending: { label: 'Pending', color: colors.warning, backgroundColor: colors.warningTint },
  paid: { label: 'Paid', color: colors.success, backgroundColor: colors.successTint },
  refunded: { label: 'Refunded', color: colors.accent, backgroundColor: colors.accentTint },
  not_payable: { label: 'No payment due', color: colors.mutedText, backgroundColor: colors.surface },
  unknown: { label: 'Unknown', color: colors.mutedText, backgroundColor: colors.surface },
};

const PaymentStatusBadge = ({ order }) => {
  const status = PAYMENT_STATUSES[foodOrderPaymentStatus(order)];
  return <View style={[styles.paymentBadge, { backgroundColor: status.backgroundColor }]}>
    <Text style={[styles.paymentLabel, { color: status.color }]}>{status.label}</Text>
  </View>;
};

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

  const getTimelineColor = (status) => {
    switch (status) {
      case 'pending': return colors.warning; // Yellow
      case 'confirmed': return colors.primary; // Blue
      case 'preparing': return colors.primary; // Purple
      case 'ready': return colors.accent; // Cyan
      case 'delivered': return colors.success; // Green
      case 'cancelled': return colors.danger; // Red
      default: return colors.mutedText; // Gray
    }
  };

  const OrderCard = ({ order }) => (
    <Card className="bg-white rounded-2xl shadow-sm p-4 mb-3">
      <View style={styles.orderHeading}>
        <Text className="font-bold text-lg" style={{ flexShrink: 1 }}>Order #{order.id}</Text>
        {renderOrderStatus(order.status)}
      </View>
      <View className="flex-row justify-between items-center mb-2">
        <Text className="text-sm text-gray-600">Order Date:</Text>
        <Text className="text-sm text-gray-800">{moment(order.order_date).format('DD/MM/YYYY h:mm A')}</Text>
      </View>
      <View className="flex-row justify-between items-center mb-2">
        <Text className="text-sm text-gray-600">Serving date:</Text>
        <Text className="text-sm text-gray-800">{moment(order.requested_time).utcOffset(330).format('DD/MM/YYYY')}</Text>
      </View>
      <View className="flex-row justify-between items-center mb-2">
        <Text className="text-sm text-gray-600">Total Amount:</Text>
        <Text className="font-bold text-lg text-blue-600">₹{parseFloat(order.total_amount).toFixed(2)}</Text>
      </View>
      <View style={[styles.summaryRow, { marginBottom: 16 }]}>
        <Text className="text-sm text-gray-600">Payment Status:</Text>
        <PaymentStatusBadge order={order} />
      </View>
      <View style={styles.orderActions}>
        <Button
          onPress={() => handleViewOrder(order)}
          accessibilityLabel={`View order ${order.id}`}
          style={styles.orderAction}
        >
          <Eye size={16} color={colors.card} />
          <Text style={styles.actionLabel}>View</Text>
        </Button>
        {order.status === 'pending' && (
          <Button
            onPress={() => handleCancelOrder(order.id)}
            accessibilityLabel={`Cancel order ${order.id}`}
            variant="danger"
            style={styles.orderAction}
          >
            <XCircle size={16} color={colors.card} />
            <Text style={styles.actionLabel}>Cancel</Text>
          </Button>
        )}
      </View>
    </Card>
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
          <Card className="bg-white rounded-2xl p-6 h-[90%]">
            <View className="flex-row justify-between items-center mb-4">
              <Text className="text-2xl font-bold">Order #{selectedOrder.id} Details</Text>
              <TouchableOpacity onPress={() => setViewModalVisible(false)}>
                <XCircle size={28} color={colors.mutedText} />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={{ paddingBottom: 32 }} keyboardShouldPersistTaps="handled" className="flex-1 mb-4">
              <View className="border border-gray-200 rounded-xl overflow-hidden mb-4">
                <View className="bg-gray-50 p-3">
                  <Text className="font-semibold text-gray-800">Order Summary</Text>
                </View>
                <View className="p-3 space-y-2">
                  <View className="flex-row justify-between">
                    <Text className="text-gray-600">Order Date:</Text>
                    <Text className="font-medium">{moment(selectedOrder.order_date).format('DD/MM/YYYY h:mm A')}</Text>
                  </View>
                  <View className="flex-row justify-between">
                    <Text className="text-gray-600">Serving date:</Text>
                    <Text className="font-medium">{moment(selectedOrder.requested_time).utcOffset(330).format('DD/MM/YYYY')}</Text>
                  </View>
                  <View style={styles.summaryRow}>
                    <Text className="text-gray-600">Status:</Text>
                    {renderOrderStatus(selectedOrder.status)}
                  </View>
                  <View style={styles.summaryRow}>
                    <Text className="text-gray-600">Payment Status:</Text>
                    <PaymentStatusBadge order={selectedOrder} />
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

              <View className="border border-gray-200 rounded-xl overflow-hidden mb-4">
                <View className="bg-gray-50 p-3">
                  <Text className="font-semibold text-gray-800">Order Items</Text>
                </View>
                {(selectedOrder.FoodOrderItems || []).map(item => (
                    <View key={item.id} className="p-3 border-b border-gray-100 last:border-b-0">
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
                ))}
              </View>

              <View className="border border-gray-200 rounded-xl overflow-hidden mb-4">
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
          </Card>
        </View>
      </Modal>
    );
  };

  return (
    <Screen className="flex-1 bg-background">
      <Header title="Additional food orders" back />
      <FlatList
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
        keyboardShouldPersistTaps="handled"
        data={loading ? [] : orders}
        keyExtractor={item => item.id.toString()}
        renderItem={({ item }) => <OrderCard order={item} />}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={<>
        <TouchableOpacity accessibilityRole="button" onPress={() => navigation.goBack()} className="self-start py-2 mb-2">
          <Text className="font-semibold text-blue-600">Back to Additional Food</Text>
        </TouchableOpacity>
        <Text className="text-2xl font-bold text-indigo-900 mb-2">My Additional Food Orders</Text>
        <Text className="text-gray-600 mb-6">Track your additional food order history</Text>

        <View className="flex-row flex-wrap justify-between items-center mb-4">
          <TouchableOpacity
            onPress={() => { setShowDatePicker(true); setPickerMode('from'); }}
            className="w-[48%] border border-gray-300 rounded-xl p-3 flex-row justify-between items-center mb-2"
          >
            <Text className="text-gray-700">{dateRange.startDate ? moment(dateRange.startDate).format('YYYY-MM-DD') : 'From Date'}</Text>
            <Calendar size={20} color={colors.mutedText} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => { setShowDatePicker(true); setPickerMode('to'); }}
            className="w-[48%] border border-gray-300 rounded-xl p-3 flex-row justify-between items-center mb-2"
          >
            <Text className="text-gray-700">{dateRange.endDate ? moment(dateRange.endDate).format('YYYY-MM-DD') : 'To Date'}</Text>
            <Calendar size={20} color={colors.mutedText} />
          </TouchableOpacity>
          
          <Button
            onPress={handleSearch}
            className="w-[48%] bg-blue-600 py-3 rounded-xl flex-row items-center justify-center mb-2"
          >
            <Search size={20} color="white" className="mr-2" />
            <Text className="text-white font-semibold">Search</Text>
          </Button>
          <TouchableOpacity
            onPress={handleReset}
            className="w-[48%] bg-gray-300 py-3 rounded-xl flex-row items-center justify-center mb-2"
          >
            <Text className="text-gray-700 font-semibold">Reset</Text>
          </TouchableOpacity>
        </View>
        </>}
        ListEmptyComponent={loading ? (
          <View className="flex-1 justify-center items-center h-64">
            <ActivityIndicator size="large" color={colors.primary} />
            <Text className="mt-4 text-lg text-gray-700">Loading orders...</Text>
          </View>
        ) : (
          <Card className="text-center py-12 bg-white rounded-2xl shadow-sm">
            <Utensils className="mx-auto h-12 w-12 text-gray-400" />
            <Text className="mt-2 text-sm font-medium text-gray-900">No food orders found</Text>
            <Text className="mt-1 text-sm text-gray-500">Your additional food order history will appear here.</Text>
          </Card>
        )}
      />

      {renderOrderDetailModal()}

      <DateTimePickerModal
        isVisible={showDatePicker}
        mode="date"
        onConfirm={handleConfirmDatePicker}
        onCancel={() => setShowDatePicker(false)}
        date={new Date()}
      />
    </Screen>
  );
};

const styles = StyleSheet.create({
  orderHeading: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 8 },
  summaryRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  orderActions: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'flex-end', gap: 8 },
  orderAction: { minWidth: 104, flexShrink: 0, flexWrap: 'nowrap', gap: 8, paddingHorizontal: 16, paddingVertical: 12 },
  actionLabel: { color: colors.card, fontSize: 14, fontWeight: '600', flexShrink: 0, paddingEnd: 2 },
  paymentBadge: { alignSelf: 'flex-start', maxWidth: '100%', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999 },
  paymentLabel: { fontSize: 12, fontWeight: '600', paddingEnd: 2, flexShrink: 1 },
});

export default MyFoodOrdersScreen;
