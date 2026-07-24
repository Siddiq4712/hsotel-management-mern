import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, ActivityIndicator, Alert } from 'react-native';
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
    <ScrollView className="flex-1 bg-gray-50 p-4">
      <View className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-5">
        
        {/* Purpose */}
        <View className="space-y-2">
          <Text className="text-gray-700 font-bold text-sm flex-row items-center">
            <ClipboardList size={16} color="#4F46E5" /> Purpose of Visit
          </Text>
          <TextInput
            placeholder="e.g. Medical emergency, weekend trip home"
            value={purpose}
            onChangeText={setPurpose}
            className="border border-gray-200 rounded-xl p-3 text-gray-800 bg-gray-50"
          />
        </View>

        {/* Destination */}
        <View className="space-y-2">
          <Text className="text-gray-700 font-bold text-sm">
            <MapPin size={16} color="#4F46E5" /> Destination Place
          </Text>
          <TextInput
            placeholder="e.g. Madurai, Salem"
            value={destination}
            onChangeText={setDestination}
            className="border border-gray-200 rounded-xl p-3 text-gray-800 bg-gray-50"
          />
        </View>

        {/* Exit Time Picker */}
        <View className="space-y-2">
          <Text className="text-gray-700 font-bold text-sm">
            <Clock size={16} color="#4F46E5" /> Planned Exit Time
          </Text>
          <TouchableOpacity 
            onPress={() => setFromPickerVisible(true)}
            className="border border-gray-200 rounded-xl p-3 bg-gray-50 flex-row justify-between items-center"
          >
            <Text className={fromDate ? 'text-gray-800 font-semibold' : 'text-gray-400'}>
              {fromDate ? moment(fromDate).format('lll') : 'Select exit date & time'}
            </Text>
            <Calendar size={18} color="#9CA3AF" />
          </TouchableOpacity>
        </View>

        {/* Return Time Picker */}
        <View className="space-y-2">
          <Text className="text-gray-700 font-bold text-sm">
            <Clock size={16} color="#4F46E5" /> Expected Return Time
          </Text>
          <TouchableOpacity 
            onPress={() => setToPickerVisible(true)}
            className="border border-gray-200 rounded-xl p-3 bg-gray-50 flex-row justify-between items-center"
          >
            <Text className={toDate ? 'text-gray-800 font-semibold' : 'text-gray-400'}>
              {toDate ? moment(toDate).format('lll') : 'Select expected return date & time'}
            </Text>
            <Calendar size={18} color="#9CA3AF" />
          </TouchableOpacity>
        </View>

        {/* Action Button */}
        <TouchableOpacity 
          onPress={handleSubmit}
          disabled={loading}
          className="bg-indigo-600 p-4 rounded-2xl flex-row justify-center items-center space-x-2 mt-4"
        >
          {loading ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <Send size={18} color="#fff" />
              <Text className="text-white font-extrabold text-base">Submit Outpass Request</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      {/* Date Pickers */}
      <DateTimePickerModal
        isVisible={fromPickerVisible}
        mode="datetime"
        onConfirm={(date) => {
          setFromDate(date);
          setFromPickerVisible(false);
        }}
        onCancel={() => setFromPickerVisible(false)}
      />

      <DateTimePickerModal
        isVisible={toPickerVisible}
        mode="datetime"
        onConfirm={(date) => {
          setToDate(date);
          setToPickerVisible(false);
        }}
        onCancel={() => setToPickerVisible(false)}
      />
    </ScrollView>
  );
};

export default OutpassRequestScreen;
