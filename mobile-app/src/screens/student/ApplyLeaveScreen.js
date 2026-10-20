import DateRangeField from '../../components/common/DateRangeField';
import { useStudentPresentation } from '../../components/student/StudentPresentation';
import Screen from '../../components/common/Screen';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import Card from '../../components/common/Card';
import colors from '../../theme/colors';
import React, { useState } from 'react';
import { View, Text, ActivityIndicator, Alert, ScrollView } from 'react-native';
import { studentAPI } from '../../api/api';
import moment from 'moment';
import Header from '../../components/student/StudentHeader';
import { Picker } from '@react-native-picker/picker';
const ApplyLeaveScreen = ({ navigation }) => {
  const { embedded } = useStudentPresentation();
  const [formData, setFormData] = useState({
    leave_type: '',
    from_date: '',
    to_date: '',
    reason: ''
  });
  const [loading, setLoading] = useState(false);
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
    <Screen className="flex-1 bg-background">
      <Header title="Apply for leave" back />
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, paddingBottom: 32 }} keyboardShouldPersistTaps="handled">
        {!embedded && <Text className="text-2xl font-bold text-indigo-900 mb-2">Apply for Leave</Text>}
        <Text className="text-gray-600 mb-4 text-sm">Choose your leave type, dates and reason. Your warden will review the request.</Text>

        <Card className="bg-white rounded-2xl p-4 border border-gray-200" style={{ alignSelf: 'stretch' }}>
          <View style={{ gap: 16, minWidth: 0, alignSelf: 'stretch' }}>
            {/* Leave Type */}
            <View>
              <Text className="block text-sm font-medium text-gray-700 mb-2">
                Leave Type *
              </Text>
              <View className="relative bg-gray-50 border border-gray-200 rounded-xl">
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

            <DateRangeField label="Leave dates *" from={formData.from_date} to={formData.to_date} minimumDate={new Date()} disabled={loading}
              onChange={(from_date,to_date)=>setFormData(prev=>({...prev,from_date,to_date}))}/>

            {/* Reason */}
            <View>
              <Text className="block text-sm font-medium text-gray-700 mb-2">
                Reason for Leave *
              </Text>
              <Input
                value={formData.reason}
                onChangeText={(text) => setFormData(prev => ({ ...prev, reason: text }))}
                multiline
                numberOfLines={4}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl h-32 text-gray-700"
                placeholder="Please provide detailed reason for your leave..."
                textAlignVertical="top"
              />
            </View>

            <View style={{ gap: 12, alignSelf: 'stretch' }}>
              <Button
                onPress={handleSubmit}
                disabled={loading}
                style={{ alignSelf: 'stretch' }}
              >
                {loading ? (
                  <ActivityIndicator size="small" color={colors.card} className="mr-2" />
                ) : (
                  <Text className="text-white text-base font-semibold">Submit Application</Text>
                )}
              </Button>
              
              <Button variant="secondary"
                onPress={handleReset}
                style={{ alignSelf: 'stretch' }}
              >
                <Text className="text-gray-700 text-base font-semibold">Reset</Text>
              </Button>
            </View>
          </View>
        </Card>

      </ScrollView>
    </Screen>
  );
};

export default ApplyLeaveScreen;
