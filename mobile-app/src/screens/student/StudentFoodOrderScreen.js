import Screen from '../../components/common/Screen';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import Card from '../../components/common/Card';
import colors from '../../theme/colors';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, ScrollView, ActivityIndicator, Alert, TouchableOpacity, Modal, RefreshControl } from 'react-native';
import { useFocusEffect, useIsFocused } from '@react-navigation/native';
import { Picker } from '@react-native-picker/picker';
import DateTimePickerModal from 'react-native-modal-datetime-picker';
import { Calendar, History, Minus, Plus, XCircle, Search } from 'lucide-react-native';
import moment from 'moment';
import { studentAPI } from '../../api/api';
import Header from '../../components/student/StudentHeader';
import FoodItemCard from '../../components/student/FoodItemCard';
import { additionalFoodRequest, foodDeadline, foodOrderingClosed, foodToday, nextFoodDate, WEEK_DAYS } from '../../utils/additionalFood';

export default function StudentFoodOrderScreen({ navigation }) {
  const isVisible = useIsFocused();
  const [foods, setFoods] = useState([]);
  const [category, setCategory] = useState('all');
  const [meal, setMeal] = useState('all');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [quantity, setQuantity] = useState('1');
  const [servingDate, setServingDate] = useState(foodToday());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const submittingRef = useRef(false);
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    if (!isVisible) return;
    setNow(Date.now());
    const timer = setInterval(() => setNow(Date.now()), 15000);
    return () => clearInterval(timer);
  }, [isVisible]);
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
  const add = useCallback(food => {
    setSelected(food);
    setQuantity('1');
    setServingDate(nextFoodDate(food.weekly_day));
  }, []);
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
  const visible = foods.filter(food => (category === 'all' || food.category === category) && (meal === 'all' || food.meal_type === meal) && (!search.trim() || `${food.name || ''} ${food.meal_type || ''} ${food.category || ''}`.toLowerCase().includes(search.trim().toLowerCase())));
  const count = Number(quantity);
  const total = selected && Number.isInteger(count) && count > 0 ? (Math.round(Number(selected.price) * 100) * count / 100).toFixed(2) : '0.00';

  return <Screen className="flex-1 bg-background">
    <Header title="Additional food" back />
    <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 16, paddingBottom: 32 }} refreshControl={<RefreshControl refreshing={loading} onRefresh={loadFoods} />}>
      <View className="flex-row items-center bg-white border border-gray-200 rounded-xl px-4 mb-4">
        <Search size={19} color={colors.mutedText} /><Input accessibilityLabel="Search additional food" placeholder="Search food..." value={search} onChangeText={setSearch} className="flex-1 ml-3" />
      </View>
      <Text className="text-gray-600 mb-4">Choose food from the weekly schedule, add it, and confirm a serving date.</Text>
      <TouchableOpacity accessibilityRole="button" onPress={() => navigation.navigate('MyFoodOrders')} className="flex-row items-center self-start mb-4 py-2">
        <History size={18} color={colors.primary} /><Text className="text-blue-600 font-semibold ml-2">My Additional Food Orders</Text>
      </TouchableOpacity>
      <Card className="border border-gray-300 rounded-2xl bg-white mb-3">
        <Picker accessibilityLabel="Food category" selectedValue={category} onValueChange={setCategory}>
          <Picker.Item label="All categories" value="all" />
          {categories.map(value => <Picker.Item key={value} label={value} value={value} />)}
        </Picker>
      </Card>
      <Card className="border border-gray-300 rounded-2xl bg-white mb-3">
        <Picker accessibilityLabel="Meal" selectedValue={meal} onValueChange={setMeal}>
          <Picker.Item label="All meals" value="all" />
          {['Breakfast', 'Lunch', 'Dinner'].map(value => <Picker.Item key={value} label={value} value={value} />)}
        </Picker>
      </Card>
      {loading && !foods.length ? <ActivityIndicator size="large" color={colors.primary} /> : visible.length ? <View>
        {visible.map(food => <FoodItemCard key={food.id} item={food} onAdd={add} now={now} />)}
      </View> : <Text className="text-center text-gray-600 py-12">No additional food available in this category.</Text>}
    </ScrollView>
    <Modal visible={!!selected} transparent animationType="slide" onRequestClose={close}>
      <View className="flex-1 justify-end bg-black/50">
        <Card className="bg-white rounded-2xl p-6" style={{ maxHeight: '85%', paddingBottom: 32 }}>
          <ScrollView contentContainerStyle={{ paddingBottom: 32 }} keyboardShouldPersistTaps="handled">
            <View className="flex-row justify-between items-center mb-4">
              <Text className="text-xl font-bold text-indigo-900 flex-1">Confirm Additional Food</Text>
              <TouchableOpacity accessibilityRole="button" accessibilityLabel="Close confirmation" disabled={submitting} onPress={close}><XCircle size={28} color={colors.mutedText} /></TouchableOpacity>
            </View>
            {selected && <>
              <Text className="text-xl font-semibold text-gray-900">{selected.name}</Text>
              <Text className="text-gray-600 mt-1 mb-4">{['Veg', 'Non-Veg'].includes(selected.category) ? selected.category : 'Category not set'} · {selected.meal_type || 'Meal not set'} · {selected.weekly_day == null ? 'Available food' : `Every ${WEEK_DAYS[selected.weekly_day]}`}</Text>
              <Text className="text-gray-600 mb-4">Order before {foodDeadline(selected, servingDate).format('DD MMM YYYY, h:mm A')} (IST).{selectionClosed ? ' Ordering is closed.' : ''}</Text>
              <Text className="font-medium text-gray-700 mb-2">Serving date</Text>
              <TouchableOpacity accessibilityRole="button" accessibilityLabel="Select serving date" disabled={submitting} onPress={() => setShowDatePicker(true)} className="border border-gray-300 rounded-xl p-3 flex-row justify-between items-center mb-4">
                <Text style={{ flex: 1, minWidth: 0 }}>{moment(servingDate).format('ddd, DD MMM YYYY')}</Text><Calendar size={20} color={colors.mutedText} style={{ flexShrink: 0 }} />
              </TouchableOpacity>
              <Text className="font-medium text-gray-700 mb-2">Quantity</Text>
              <Text className="text-gray-500 mb-2">Maximum {selected.max_quantity_per_student ?? 1} in total for this food on this serving date.</Text>
              <View className="flex-row items-center mb-4">
                <TouchableOpacity accessibilityRole="button" accessibilityLabel="Decrease quantity" disabled={submitting || count <= 1} onPress={() => changeQuantity(-1)} className="p-3"><Minus size={20} color={colors.primary} /></TouchableOpacity>
                <Input accessibilityLabel="Quantity" value={quantity} onChangeText={setQuantity} editable={!submitting} keyboardType="number-pad" maxLength={4} className="border border-gray-300 rounded-xl p-3 text-center" style={{ width: 80 }} />
                <TouchableOpacity accessibilityRole="button" accessibilityLabel="Increase quantity" disabled={submitting || count >= (selected.max_quantity_per_student ?? 1)} onPress={() => changeQuantity(1)} className="p-3"><Plus size={20} color={colors.primary} /></TouchableOpacity>
              </View>
              <Text className="text-xl font-bold text-blue-600 mb-2">Total: ₹{total}</Text>
              <Text className="text-gray-500 mb-6">This request is for the selected serving date only. The amount is added to your additional bill.</Text>
              <View className="flex-row">
                <TouchableOpacity accessibilityRole="button" disabled={submitting} onPress={close} className="bg-gray-200 rounded-xl items-center justify-center mr-3" style={{ flex: 1, height: 48 }}><Text className="font-semibold text-gray-700">Cancel</Text></TouchableOpacity>
                <Button accessibilityRole="button" accessibilityLabel="Confirm additional food" accessibilityState={{ disabled: submitting || !!selectionClosed, busy: submitting }} disabled={submitting || selectionClosed} onPress={confirm} className="bg-blue-600 rounded-xl flex-row items-center justify-center" style={{ flex: 1, height: 48, opacity: selectionClosed ? 0.5 : 1 }}>
                  {submitting && <ActivityIndicator size="small" color="white" style={{ marginRight: 8 }} />}<Text className="text-white font-semibold">Confirm</Text>
                </Button>
              </View>
            </>}
          </ScrollView>
          <DateTimePickerModal isVisible={showDatePicker} mode="date" date={moment(`${servingDate}T12:00:00`).toDate()} minimumDate={moment(foodToday()).startOf('day').toDate()} onConfirm={chooseDate} onCancel={() => setShowDatePicker(false)} />
        </Card>
      </View>
    </Modal>
  </Screen>;
}
