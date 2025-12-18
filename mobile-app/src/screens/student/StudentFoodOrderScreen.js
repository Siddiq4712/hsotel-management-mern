import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, ActivityIndicator, Alert, TouchableOpacity, Image, TextInput, Modal } from 'react-native';
import { studentAPI } from '../../api/api';
import { Plus, Minus, ShoppingCart, Utensils, Info, XCircle } from 'lucide-react-native';
import DateTimePickerModal from 'react-native-modal-datetime-picker';
import moment from 'moment';
import Header from '../../components/common/Header';
import FoodItemCard from '../../components/student/FoodItemCard';
import { Picker } from '@react-native-picker/picker';
const StudentFoodOrderScreen = ({ navigation }) => {
  const [foodItems, setFoodItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [cartItems, setCartItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showCartModal, setShowCartModal] = useState(false);
  const [requestedTime, setRequestedTime] = useState(moment().add(1, 'hour').toDate());
  const [isDatePickerVisible, setDatePickerVisible] = useState(false);
  const [orderNotes, setOrderNotes] = useState('');

  useEffect(() => {
    fetchFoodItems(selectedCategory);
    fetchCategories();
  }, [selectedCategory]);

  const fetchFoodItems = async (category) => {
    try {
      setLoading(true);
      const params = category && category !== 'all' ? { is_available: true, category: category } : { is_available: true };
      const response = await studentAPI.getSpecialFoodItems(params);
      if (response.data.success) {
        setFoodItems(response.data.data);
      } else {
        Alert.alert('Error', response.data.message || 'Failed to fetch food items');
      }
    } catch (error) {
      console.error('Failed to fetch food items:', error);
      Alert.alert('Error', 'Failed to fetch food items: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await studentAPI.getSpecialFoodItemCategories();
      if (response.data.success) {
        setCategories(response.data.data);
      } else {
        Alert.alert('Error', response.data.message || 'Failed to fetch categories');
      }
    } catch (error) {
      console.error('Failed to fetch categories:', error);
      Alert.alert('Error', 'Failed to fetch categories: ' + error.message);
    }
  };

  const addToCart = (item) => {
    setCartItems(prev => {
      const existingItem = prev.find(i => i.id === item.id);
      if (existingItem) {
        return prev.map(i =>
          i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i
        );
      } else {
        return [...prev, { ...item, quantity: 1, special_instructions: '' }];
      }
    });
  };

  const updateCartItemQuantity = (id, quantity) => {
    if (quantity <= 0) {
      setCartItems(prev => prev.filter(item => item.id !== id));
    } else {
      setCartItems(prev =>
        prev.map(item =>
          item.id === id ? { ...item, quantity } : item
        )
      );
    }
  };

  const updateCartItemInstructions = (id, instructions) => {
    setCartItems(prev =>
      prev.map(item =>
        item.id === id ? { ...item, special_instructions: instructions } : item
      )
    );
  };

  const removeFromCart = (id) => {
    setCartItems(prev => prev.filter(item => item.id !== id));
  };

  const clearCart = () => {
    setCartItems([]);
  };

  const calculateTotal = () => {
    return cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  };

  const handleSubmitOrder = async () => {
    if (cartItems.length === 0) {
      Alert.alert('Warning', 'Please add at least one item to your cart.');
      return;
    }
    if (!requestedTime) {
      Alert.alert('Validation', 'Please select a requested time.');
      return;
    }

    setSubmitting(true);
    try {
      const orderData = {
        items: cartItems.map(item => ({
          food_item_id: item.id,
          quantity: item.quantity,
          special_instructions: item.special_instructions
        })),
        requested_time: moment(requestedTime).toISOString(),
        notes: orderNotes
      };

      const response = await studentAPI.createFoodOrder(orderData);
      
      if (response.data.success) {
        Alert.alert('Success', 'Food order placed successfully!');
        setCartItems([]);
        setOrderNotes('');
        setRequestedTime(moment().add(1, 'hour').toDate());
        setShowCartModal(false);
      } else {
        Alert.alert('Error', response.data.message || 'Failed to place order');
      }
    } catch (error) {
      console.error('Failed to place order:', error);
      Alert.alert('Error', error.message || 'Failed to place order. Please try again later.');
    } finally {
      setSubmitting(false);
    }
  };

  const showTimePicker = () => setDatePickerVisible(true);
  const hideTimePicker = () => setDatePickerVisible(false);

  const handleConfirmTime = (date) => {
    // Ensure the selected time is at least 30 minutes from now
    const now = moment();
    const minTime = now.add(30, 'minutes');
    const selectedMoment = moment(date);

    if (selectedMoment.isBefore(minTime)) {
      Alert.alert('Invalid Time', `Requested time must be at least 30 minutes from now. Please select a time after ${minTime.format('h:mm A')}.`);
      setRequestedTime(minTime.toDate()); // Reset to minimum valid time
    } else {
      setRequestedTime(date);
    }
    hideTimePicker();
  };


  return (
    <View className="flex-1 bg-gray-50">
      <Header />
      <ScrollView className="p-4">
        <Text className="text-3xl font-bold text-gray-900 mb-2">Special Food Order</Text>
        <Text className="text-gray-600 mb-6">Order special items not in the regular mess menu</Text>

        {/* Category Selector and Cart Button */}
        <View className="flex-row justify-between items-center mb-4">
          <View className="relative w-[60%]">
            <Picker
              selectedValue={selectedCategory}
              onValueChange={(itemValue) => setSelectedCategory(itemValue)}
              className="w-full border border-gray-300 rounded-lg h-12"
            >
              <Picker.Item label="All Categories" value="all" />
              {categories.map(category => (
                <Picker.Item key={category} label={category} value={category} />
              ))}
            </Picker>
          </View>
          <TouchableOpacity
            onPress={() => setShowCartModal(true)}
            className="bg-blue-600 py-2 px-4 rounded-lg flex-row items-center"
          >
            <ShoppingCart size={20} color="white" className="mr-2" />
            <Text className="text-white font-semibold">Cart ({cartItems.length})</Text>
          </TouchableOpacity>
        </View>

        {/* Food Items List */}
        {loading ? (
          <View className="flex-1 justify-center items-center h-64">
            <ActivityIndicator size="large" color="#4F46E5" />
            <Text className="mt-4 text-lg text-gray-700">Loading food items...</Text>
          </View>
        ) : foodItems.length > 0 ? (
          <View className="flex-row flex-wrap justify-between">
            {foodItems.map(item => (
              <View key={item.id} className="w-[48%]">
                <FoodItemCard item={item} onAddToCart={addToCart} />
              </View>
            ))}
          </View>
        ) : (
          <View className="text-center py-12 bg-white rounded-lg shadow-md">
            <Utensils className="mx-auto h-12 w-12 text-gray-400" />
            <Text className="mt-2 text-sm font-medium text-gray-900">No food items available</Text>
            <Text className="mt-1 text-sm text-gray-500">
              {selectedCategory === 'all' ? 'There are no special food items available at the moment.' : `No items in '${selectedCategory}' category.`}
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Cart Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={showCartModal}
        onRequestClose={() => setShowCartModal(false)}
      >
        <View className="flex-1 justify-end bg-black/50">
          <View className="bg-white rounded-t-xl p-6 h-[80%]">
            <View className="flex-row justify-between items-center mb-4">
              <Text className="text-2xl font-bold">Your Order</Text>
              <TouchableOpacity onPress={() => setShowCartModal(false)}>
                <XCircle size={28} color="#6B7280" />
              </TouchableOpacity>
            </View>

            {cartItems.length === 0 ? (
              <View className="flex-1 justify-center items-center">
                <ShoppingCart size={64} color="#D1D5DB" />
                <Text className="mt-4 text-lg text-gray-500">Your cart is empty</Text>
              </View>
            ) : (
              <ScrollView className="flex-1 mb-4">
                {cartItems.map(item => (
                  <View key={item.id} className="flex-row items-center justify-between py-3 border-b border-gray-200">
                    <View className="flex-1 mr-2">
                      <Text className="font-semibold text-base">{item.name}</Text>
                      <Text className="text-sm text-gray-500">₹{parseFloat(item.price).toFixed(2)}</Text>
                      <TextInput
                        placeholder="Special instructions"
                        value={item.special_instructions}
                        onChangeText={(text) => updateCartItemInstructions(item.id, text)}
                        className="border border-gray-300 rounded-md p-2 text-sm mt-2"
                        multiline
                      />
                    </View>
                    <View className="flex-row items-center">
                      <TouchableOpacity onPress={() => updateCartItemQuantity(item.id, item.quantity - 1)} className="p-1">
                        <Minus size={20} color="#6B7280" />
                      </TouchableOpacity>
                      <Text className="font-bold text-lg mx-2">{item.quantity}</Text>
                      <TouchableOpacity onPress={() => updateCartItemQuantity(item.id, item.quantity + 1)} className="p-1">
                        <Plus size={20} color="#6B7280" />
                      </TouchableOpacity>
                    </View>
                    <Text className="font-bold text-lg ml-4">₹{(item.price * item.quantity).toFixed(2)}</Text>
                  </View>
                ))}
                <View className="flex-row justify-between items-center mt-4">
                  <Text className="text-xl font-bold">Total:</Text>
                  <Text className="text-2xl font-bold text-blue-600">₹{calculateTotal().toFixed(2)}</Text>
                </View>
                <View className="mt-4">
                    <Text className="text-sm font-medium text-gray-700 mb-2">Requested Time:</Text>
                    <TouchableOpacity onPress={showTimePicker} className="border border-gray-300 rounded-lg p-3 flex-row justify-between items-center">
                        <Text>{moment(requestedTime).format('YYYY-MM-DD h:mm A')}</Text>
                        <Info size={20} color="#6B7280" />
                    </TouchableOpacity>
                </View>
                <View className="mt-4">
                  <Text className="text-sm font-medium text-gray-700 mb-2">Additional Notes:</Text>
                  <TextInput
                    placeholder="Any additional notes for your order"
                    value={orderNotes}
                    onChangeText={setOrderNotes}
                    className="border border-gray-300 rounded-lg p-3 text-sm h-24"
                    multiline
                    textAlignVertical="top"
                  />
                </View>
              </ScrollView>
            )}

            <View className="flex-row justify-between items-center pt-4 border-t border-gray-200">
              <TouchableOpacity onPress={clearCart} className="bg-gray-300 py-3 px-4 rounded-lg">
                <Text className="font-semibold text-gray-700">Clear Cart</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleSubmitOrder}
                disabled={submitting || cartItems.length === 0}
                className="bg-blue-600 py-3 px-6 rounded-lg flex-row items-center justify-center disabled:opacity-50"
              >
                {submitting ? (
                  <ActivityIndicator size="small" color="#fff" className="mr-2" />
                ) : (
                  <Text className="text-white font-semibold text-lg">Place Order</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <DateTimePickerModal
        isVisible={isDatePickerVisible}
        mode="datetime"
        onConfirm={handleConfirmTime}
        onCancel={hideTimePicker}
        minimumDate={moment().add(30, 'minutes').toDate()} // Minimum 30 minutes from now
        date={requestedTime}
      />
    </View>
  );
};

export default StudentFoodOrderScreen;
