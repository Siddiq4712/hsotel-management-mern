import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, Alert, ScrollView } from 'react-native';
import { studentAPI } from '../../api/api';
import { Calendar, FileText, CheckCircle, AlertCircle } from 'lucide-react-native';
import DateTimePickerModal from 'react-native-modal-datetime-picker';
import moment from 'moment';
import Header from '../../components/common/Header';

const ApplyLeaveScreen = ({ navigation }) => {
  const [formData, setFormData] = useState({
    leave_type: '',
    from_date: '',
    to_date: '',
    reason: ''
  });
  const [loading, setLoading] = useState(false);
  const [isDatePickerVisible, setDatePickerVisible] = useState(false);
  const [currentPickerField, setCurrentPickerField] = useState(null); // 'from_date' or 'to_date'

  const showDatePicker = (field) => {
    setCurrentPickerField(field);
    setDatePickerVisible(true);
  };

  const hideDatePicker = () => {
    setDatePickerVisible(false);
  };

  const handleConfirmDate = (date) => {
    const formattedDate = moment(date).format('YYYY-MM-DD');
    setFormData(prev => ({ ...prev, [currentPickerField]: formattedDate }));
    hideDatePicker();
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      if (!formData.leave_type || !formData.from_date || !formData.to_date || !formData.reason) {
        Alert.alert('Error', 'All fields are required.');
        setLoading(false);
        return;
      }
      if (moment(formData.from_date).isAfter(moment(formData.to_date))) {
        Alert.alert('Error', 'From date cannot be after to date.');
        setLoading(false);
        return;
      }

      await studentAPI.applyLeave(formData);
      Alert.alert('Success', 'Leave application submitted successfully!');
      setFormData({
        leave_type: '',
        from_date: '',
        to_date: '',
        reason: ''
      });
      // Optionally navigate back or refresh a list
      navigation.goBack(); // Example: Go back to MyLeavesScreen
    } catch (error) {
      console.error('Leave application error:', error);
      Alert.alert('Error', error.message || 'Failed to submit leave application');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setFormData({
      leave_type: '',
      from_date: '',
      to_date: '',
      reason: ''
    });
  };

  return (
    <View className="flex-1 bg-gray-50">
      <Header />
      <ScrollView className="p-4">
        <Text className="text-3xl font-bold text-gray-900 mb-2">Apply for Leave</Text>
        <Text className="text-gray-600 mb-6">Submit your leave application for approval</Text>

        <View className="bg-white rounded-lg shadow-md p-6">
          <View className="space-y-6">
            {/* Leave Type */}
            <View>
              <Text className="block text-sm font-medium text-gray-700 mb-2">
                Leave Type *
              </Text>
              <View className="relative border border-gray-300 rounded-lg">
                <Picker
                  selectedValue={formData.leave_type}
                  onValueChange={(itemValue) => setFormData(prev => ({ ...prev, leave_type: itemValue }))}
                  className="w-full h-12"
                >
                  <Picker.Item label="Select Leave Type" value="" />
                  <Picker.Item label="Casual Leave" value="casual" />
                  <Picker.Item label="Sick Leave" value="sick" />
                  <Picker.Item label="Emergency Leave" value="emergency" />
                  <Picker.Item label="Vacation Leave" value="vacation" />
                  <Picker.Item label="Other" value="other" />
                </Picker>
              </View>
            </View>

            {/* From Date */}
            <View>
              <Text className="block text-sm font-medium text-gray-700 mb-2">
                From Date *
              </Text>
              <TouchableOpacity
                onPress={() => showDatePicker('from_date')}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg flex-row items-center justify-between"
              >
                <Text className="text-base text-gray-700">
                  {formData.from_date ? moment(formData.from_date).format('MMM DD, YYYY') : 'Select Date'}
                </Text>
                <Calendar size={20} color="#6B7280" />
              </TouchableOpacity>
            </View>

            {/* To Date */}
            <View>
              <Text className="block text-sm font-medium text-gray-700 mb-2">
                To Date *
              </Text>
              <TouchableOpacity
                onPress={() => showDatePicker('to_date')}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg flex-row items-center justify-between"
              >
                <Text className="text-base text-gray-700">
                  {formData.to_date ? moment(formData.to_date).format('MMM DD, YYYY') : 'Select Date'}
                </Text>
                <Calendar size={20} color="#6B7280" />
              </TouchableOpacity>
            </View>

            {/* Reason */}
            <View>
              <Text className="block text-sm font-medium text-gray-700 mb-2">
                Reason for Leave *
              </Text>
              <TextInput
                value={formData.reason}
                onChangeText={(text) => setFormData(prev => ({ ...prev, reason: text }))}
                multiline
                numberOfLines={4}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg h-32 text-gray-700"
                placeholder="Please provide detailed reason for your leave..."
                textAlignVertical="top"
              />
            </View>

            <View className="flex-row gap-4 justify-start">
              <TouchableOpacity
                onPress={handleSubmit}
                disabled={loading}
                className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 flex-row items-center justify-center disabled:opacity-50"
              >
                {loading ? (
                  <ActivityIndicator size="small" color="#fff" className="mr-2" />
                ) : (
                  <Text className="text-white text-base font-semibold">Submit Application</Text>
                )}
              </TouchableOpacity>
              
              <TouchableOpacity
                onPress={handleReset}
                className="bg-gray-300 text-gray-700 px-6 py-3 rounded-lg hover:bg-gray-400 flex-row items-center justify-center"
              >
                <Text className="text-gray-700 text-base font-semibold">Reset</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        <DateTimePickerModal
          isVisible={isDatePickerVisible}
          mode="date"
          onConfirm={handleConfirmDate}
          onCancel={hideDatePicker}
          minimumDate={currentPickerField === 'to_date' && formData.from_date ? moment(formData.from_date).toDate() : moment().toDate()}
        />
      </ScrollView>
    </View>
  );
};

export default ApplyLeaveScreen;
