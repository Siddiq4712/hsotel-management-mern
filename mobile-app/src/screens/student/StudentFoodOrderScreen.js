import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, ScrollView, ActivityIndicator, Alert, TouchableOpacity, TextInput, Modal, RefreshControl } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Picker } from '@react-native-picker/picker';
import DateTimePickerModal from 'react-native-modal-datetime-picker';
import { Calendar, History, Minus, Plus, XCircle } from 'lucide-react-native';
import moment from 'moment';
import { studentAPI } from '../../api/api';
import Header from '../../components/common/Header';
import FoodItemCard from '../../components/student/FoodItemCard';
import { additionalFoodRequest, foodDeadline, foodOrderingClosed, foodToday, nextFoodDate, WEEK_DAYS } from '../../utils/additionalFood';

export default function StudentFoodOrderScreen({ navigation }) {
  const [foods, setFoods] = useState([]);
  const [category, setCategory] = useState('all');
  const [meal, setMeal] = useState('all');
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [quantity, setQuantity] = useState('1');
  const [servingDate, setServingDate] = useState(foodToday());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const submittingRef = useRef(false);
  const [now, setNow] = useState(Date.now());
  useEffect(() => { const timer = setInterval(() => setNow(Date.now()), 15000); return () => clearInterval(timer); }, []);
  const selectionClosed = selected && foodOrderingClosed(selected, servingDate, now);
  const loadFoods = useCallback(async () => {
    setLoading(true);
    try {
      const response = await studentAPI.getSpecialFoodItems();
      if (!response.data.success) throw new Error(response.data.message || 'Unable to load additional food.');
      setFoods(response.data.data || []);
    } catch (error) { Alert.alert('Unable to load food', error.message); }
    finally { setLoading(false); }
  }, []);
  useFocusEffect(useCallback(() => { loadFoods(); }, [loadFoods]));
  const add = food => {
    setSelected(food);
    setQuantity('1');
    setServingDate(nextFoodDate(food.weekly_day));
  };
  const close = () => {
    if (submittingRef.current) return;
    setShowDatePicker(false);
    setSelected(null);
  };
  const confirm = async () => {
    if (submittingRef.current) return;
    let payload;
    try { payload = additionalFoodRequest(selected, quantity, servingDate); }
    catch (error) { Alert.alert('Check your selection', error.message); return; }
    submittingRef.current = true;
    setSubmitting(true);
    try {
      const response = await studentAPI.createFoodOrder(payload);
      if (!response.data.success) throw new Error(response.data.message || 'Unable to confirm additional food.');
      setSelected(null);
      Alert.alert('Request confirmed', 'Your additional food request was saved for the selected serving date.', [
        { text: 'OK' }, { text: 'View orders', onPress: () => navigation.navigate('MyFoodOrders') },
      ]);
      loadFoods();
    } catch (error) { Alert.alert('Unable to confirm food', error.message); }
    finally { submittingRef.current = false; setSubmitting(false); }
  };
  const chooseDate = value => {
    setShowDatePicker(false);
    const date = moment(value).format('YYYY-MM-DD');
    try { additionalFoodRequest(selected, 1, date); setServingDate(date); }
    catch (error) { Alert.alert('Choose a serving date', error.message); }
  };
  const changeQuantity = change => setQuantity(current => String(Math.min(selected?.max_quantity_per_student ?? 1, Math.max(1, (Number(current) || 1) + change))));
  const categories = ['Veg', 'Non-Veg'];
  const visible = foods.filter(food => (category === 'all' || food.category === category) && (meal === 'all' || food.meal_type === meal));
  const count = Number(quantity);
  const total = selected && Number.isInteger(count) && count > 0 ? (Math.round(Number(selected.price) * 100) * count / 100).toFixed(2) : '0.00';

  return <View className="flex-1 bg-gray-50">
    <Header />
    <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 32 }} refreshControl={<RefreshControl refreshing={loading} onRefresh={loadFoods} />}>
      <Text className="text-3xl font-bold text-gray-900 mb-2">Additional Food</Text>
      <Text className="text-gray-600 mb-4">Choose food from the weekly schedule, add it, and confirm a serving date.</Text>
      <TouchableOpacity accessibilityRole="button" onPress={() => navigation.navigate('MyFoodOrders')} className="flex-row items-center self-start mb-4 py-2">
        <History size={18} color="#2563eb" /><Text className="text-blue-600 font-semibold ml-2">My Additional Food Orders</Text>
      </TouchableOpacity>
      <View className="border border-gray-300 rounded-lg bg-white mb-4">
        <Picker accessibilityLabel="Food category" selectedValue={category} onValueChange={setCategory}>
          <Picker.Item label="All categories" value="all" />
          {categories.map(value => <Picker.Item key={value} label={value} value={value} />)}
        </Picker>
      </View>
      <View className="border border-gray-300 rounded-lg bg-white mb-4">
        <Picker accessibilityLabel="Meal" selectedValue={meal} onValueChange={setMeal}>
          <Picker.Item label="All meals" value="all" />
          {['Breakfast', 'Lunch', 'Dinner'].map(value => <Picker.Item key={value} label={value} value={value} />)}
        </Picker>
      </View>
      {loading && !foods.length ? <ActivityIndicator size="large" color="#2563eb" /> : visible.length ? <View className="flex-row flex-wrap justify-between">
        {visible.map(food => <View key={food.id} className="w-[48%]"><FoodItemCard item={food} onAdd={add} now={now} /></View>)}
      </View> : <Text className="text-center text-gray-600 py-12">No additional food available in this category.</Text>}
    </ScrollView>
    <Modal visible={!!selected} transparent animationType="slide" onRequestClose={close}>
      <View className="flex-1 justify-end bg-black/50">
        <View className="bg-white rounded-t-xl p-6" style={{ maxHeight: '85%', paddingBottom: 32 }}>
          <ScrollView keyboardShouldPersistTaps="handled">
            <View className="flex-row justify-between items-center mb-4">
              <Text className="text-xl font-bold text-gray-900 flex-1">Confirm Additional Food</Text>
              <TouchableOpacity accessibilityRole="button" accessibilityLabel="Close confirmation" disabled={submitting} onPress={close}><XCircle size={28} color="#6b7280" /></TouchableOpacity>
            </View>
            {selected && <>
              <Text className="text-xl font-semibold text-gray-900">{selected.name}</Text>
              <Text className="text-gray-600 mt-1 mb-4">{['Veg', 'Non-Veg'].includes(selected.category) ? selected.category : 'Category not set'} · {selected.meal_type || 'Meal not set'} · {selected.weekly_day == null ? 'Available food' : `Every ${WEEK_DAYS[selected.weekly_day]}`}</Text>
              <Text className="text-gray-600 mb-4">Order before {foodDeadline(selected, servingDate).format('DD MMM YYYY, h:mm A')} (IST).{selectionClosed ? ' Ordering is closed.' : ''}</Text>
              <Text className="font-medium text-gray-700 mb-2">Serving date</Text>
              <TouchableOpacity accessibilityRole="button" accessibilityLabel="Select serving date" disabled={submitting} onPress={() => setShowDatePicker(true)} className="border border-gray-300 rounded-lg p-3 flex-row justify-between items-center mb-4">
                <Text>{moment(servingDate).format('ddd, DD MMM YYYY')}</Text><Calendar size={20} color="#6b7280" />
              </TouchableOpacity>
              <Text className="font-medium text-gray-700 mb-2">Quantity</Text>
              <Text className="text-gray-500 mb-2">Maximum {selected.max_quantity_per_student ?? 1} in total for this food on this serving date.</Text>
              <View className="flex-row items-center mb-4">
                <TouchableOpacity accessibilityRole="button" accessibilityLabel="Decrease quantity" disabled={submitting || count <= 1} onPress={() => changeQuantity(-1)} className="p-3"><Minus size={20} color="#2563eb" /></TouchableOpacity>
                <TextInput accessibilityLabel="Quantity" value={quantity} onChangeText={setQuantity} editable={!submitting} keyboardType="number-pad" maxLength={4} className="border border-gray-300 rounded-lg p-3 text-center" style={{ width: 80 }} />
                <TouchableOpacity accessibilityRole="button" accessibilityLabel="Increase quantity" disabled={submitting || count >= (selected.max_quantity_per_student ?? 1)} onPress={() => changeQuantity(1)} className="p-3"><Plus size={20} color="#2563eb" /></TouchableOpacity>
              </View>
              <Text className="text-xl font-bold text-blue-600 mb-2">Total: ₹{total}</Text>
              <Text className="text-gray-500 mb-6">This request is for the selected serving date only. The amount is added to your additional bill.</Text>
              <View className="flex-row">
                <TouchableOpacity accessibilityRole="button" disabled={submitting} onPress={close} className="bg-gray-200 rounded-lg items-center justify-center mr-3" style={{ flex: 1, height: 48 }}><Text className="font-semibold text-gray-700">Cancel</Text></TouchableOpacity>
                <TouchableOpacity accessibilityRole="button" accessibilityLabel="Confirm additional food" accessibilityState={{ disabled: submitting || !!selectionClosed, busy: submitting }} disabled={submitting || selectionClosed} onPress={confirm} className="bg-blue-600 rounded-lg flex-row items-center justify-center" style={{ flex: 1, height: 48, opacity: selectionClosed ? 0.5 : 1 }}>
                  {submitting && <ActivityIndicator size="small" color="white" style={{ marginRight: 8 }} />}<Text className="text-white font-semibold">Confirm</Text>
                </TouchableOpacity>
              </View>
            </>}
          </ScrollView>
          <DateTimePickerModal isVisible={showDatePicker} mode="date" date={moment(`${servingDate}T12:00:00`).toDate()} minimumDate={moment(foodToday()).startOf('day').toDate()} onConfirm={chooseDate} onCancel={() => setShowDatePicker(false)} />
        </View>
      </View>
    </Modal>
  </View>;
}
