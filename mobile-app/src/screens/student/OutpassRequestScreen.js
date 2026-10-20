import DateRangeField from '../../components/common/DateRangeField';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import Card from '../../components/common/Card';
import colors from '../../theme/colors';
import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { outpassAPI } from '../../api/api';
import { ClipboardList, MapPin, Calendar, Clock, Send } from 'lucide-react-native';
import DateTimePickerModal from 'react-native-modal-datetime-picker';
import moment from 'moment';

const OutpassRequestScreen = ({ navigation }) => {
  const [purpose, setPurpose] = useState('');
  const [destination, setDestination] = useState('');
  const [fromDate, setFromDate] = useState(null);
  const [toDate, setToDate] = useState(null);
  const [loading, setLoading] = useState(false);

  // Picker States
  const [fromPickerVisible, setFromPickerVisible] = useState(false);
  const [toPickerVisible, setToPickerVisible] = useState(false);

  const handleSubmit = async () => {
    if (!purpose.trim() || !destination.trim() || !fromDate || !toDate) {
      Alert.alert('Validation Error', 'All fields are required');
      return;
    }

    if (fromDate >= toDate) {
      Alert.alert('Validation Error', 'Return time must be after exit time');
      return;
    }

    setLoading(true);
    try {
      await outpassAPI.createOutpass({
        purpose: purpose.trim(),
        destination: destination.trim(),
        from_date: fromDate.toISOString(),
        to_date: toDate.toISOString()
      });
      Alert.alert('Success', 'Outpass request submitted successfully');
      navigation.goBack();
    } catch (error) {
      Alert.alert('Request Failed', error.message.replace('API Error: ', ''));
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 32 }} keyboardShouldPersistTaps="handled" className="flex-1 bg-gray-50">
      <Card className="bg-white p-4 rounded-2xl border border-gray-200" style={{ gap: 16 }}>
        
        <Text className="text-lg font-bold text-indigo-900">Request a gate pass</Text>
        <Text className="text-sm text-gray-600">Enter your visit details. The QR pass becomes available after approval.</Text>
        {/* Purpose */}
        <View className="gap-2">
          <Text className="text-gray-700 font-bold text-sm flex-row items-center">
            Purpose of Visit
          </Text>
          <Input
            placeholder="e.g. Medical emergency, weekend trip home"
            value={purpose}
            onChangeText={setPurpose}
            className="border border-gray-200 rounded-xl p-3 text-gray-800 bg-gray-50"
          />
        </View>

        {/* Destination */}
        <View className="gap-2">
          <Text className="text-gray-700 font-bold text-sm">
            Destination Place
          </Text>
          <Input
            placeholder="e.g. Madurai, Salem"
            value={destination}
            onChangeText={setDestination}
            className="border border-gray-200 rounded-xl p-3 text-gray-800 bg-gray-50"
          />
        </View>

        <DateRangeField label="Visit dates *" from={fromDate} to={toDate} minimumDate={new Date()} disabled={loading}
          onChange={(from,to)=>{
            const exitClock=moment(fromDate||new Date()),returnClock=moment(toDate||moment().add(1,'hour').toDate());
            setFromDate(moment(from).hour(exitClock.hour()).minute(exitClock.minute()).second(0).millisecond(0).toDate());
            setToDate(moment(to).hour(returnClock.hour()).minute(returnClock.minute()).second(0).millisecond(0).toDate());
          }}/>
        {/* Exit Time Picker */}
        <View className="gap-2">
          <Text className="text-gray-700 font-bold text-sm">
            Exit time *
          </Text>
          <TouchableOpacity 
            disabled={!fromDate||loading}
            onPress={() => setFromPickerVisible(true)}
            className="border border-gray-200 rounded-xl p-3 bg-gray-50 flex-row justify-between items-center"
          >
            <Text className={fromDate ? 'text-gray-800 font-semibold' : 'text-gray-400'}>
              {fromDate ? moment(fromDate).format('h:mm A') : 'Select visit dates first'}
            </Text>
            <Calendar size={18} color={colors.mutedText} />
          </TouchableOpacity>
        </View>

        {/* Return Time Picker */}
        <View className="gap-2">
          <Text className="text-gray-700 font-bold text-sm">
            Return time *
          </Text>
          <TouchableOpacity 
            disabled={!toDate||loading}
            onPress={() => setToPickerVisible(true)}
            className="border border-gray-200 rounded-xl p-3 bg-gray-50 flex-row justify-between items-center"
          >
            <Text className={toDate ? 'text-gray-800 font-semibold' : 'text-gray-400'}>
              {toDate ? moment(toDate).format('h:mm A') : 'Select visit dates first'}
            </Text>
            <Calendar size={18} color={colors.mutedText} />
          </TouchableOpacity>
        </View>

        {/* Action Button */}
        <Button
          onPress={handleSubmit}
          disabled={loading}
          className="bg-indigo-600 p-4 rounded-xl flex-row justify-center items-center space-x-2 mt-4"
        >
          {loading ? (
            <ActivityIndicator size="small" color={colors.card} />
          ) : (
            <>
              <Send size={18} color={colors.card} />
              <Text className="text-white font-extrabold text-base" style={{ flexShrink: 1, textAlign: 'center' }}>Submit Outpass Request</Text>
            </>
          )}
        </Button>
      </Card>

      {/* Date Pickers */}
      <DateTimePickerModal
        isVisible={fromPickerVisible}
        date={fromDate || new Date()}
        mode="time"
        onConfirm={(date) => {
          setFromDate(moment(fromDate).hour(date.getHours()).minute(date.getMinutes()).second(0).millisecond(0).toDate());
          setFromPickerVisible(false);
        }}
        onCancel={() => setFromPickerVisible(false)}
      />

      <DateTimePickerModal
        isVisible={toPickerVisible}
        date={toDate || new Date()}
        mode="time"
        onConfirm={(date) => {
          setToDate(moment(toDate).hour(date.getHours()).minute(date.getMinutes()).second(0).millisecond(0).toDate());
          setToPickerVisible(false);
        }}
        onCancel={() => setToPickerVisible(false)}
      />
    </ScrollView>
  );
};

export default OutpassRequestScreen;
