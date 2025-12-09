import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, ActivityIndicator, Alert, TouchableOpacity, TextInput, Modal } from 'react-native';
import { studentAPI } from '../../api/api';
import { Wifi, Plus, Clock, DollarSign, CheckCircle, AlertCircle, TrendingUp, History } from 'lucide-react-native';
import moment from 'moment';
import Header from '../../components/common/Header';

const FacilityUsageScreen = () => {
  const [facilities, setFacilities] = useState([]);
  const [usageHistory, setUsageHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showUseModal, setShowUseModal] = useState(false);
  const [selectedFacility, setSelectedFacility] = useState(null);
  const [usageForm, setUsageForm] = useState({
    duration_minutes: '',
    remarks: ''
  });
  const [submittingUsage, setSubmittingUsage] = useState(false);

  useEffect(() => {
    fetchFacilities();
    fetchUsageHistory();
  }, []);

  const fetchFacilities = async () => {
    try {
      const response = await studentAPI.getFacilities();
      setFacilities(response.data.data || []);
    } catch (error) {
      console.error('Error fetching facilities:', error);
      Alert.alert('Error', error.message || 'Failed to load facilities.');
    } finally {
      setLoading(false);
    }
  };

  const fetchUsageHistory = async () => {
    try {
      const response = await studentAPI.getMyFacilityUsage();
      setUsageHistory(response.data.data || []);
    } catch (error) {
      console.error('Error fetching usage history:', error);
      Alert.alert('Error', error.message || 'Failed to load usage history.');
    }
  };

  const handleUseFacility = (facility) => {
    setSelectedFacility(facility);
    setUsageForm({ duration_minutes: '', remarks: '' });
    setShowUseModal(true);
  };

  const handleSubmitUsage = async () => {
    setSubmittingUsage(true);
    try {
      if (!selectedFacility || !usageForm.duration_minutes) {
        Alert.alert('Validation Error', 'Duration is required.');
        setSubmittingUsage(false);
        return;
      }

      await studentAPI.useFacility({
        facility_id: selectedFacility.id,
        duration_minutes: parseInt(usageForm.duration_minutes),
        remarks: usageForm.remarks
      });
      
      Alert.alert('Success', 'Facility usage recorded successfully!');
      setShowUseModal(false);
      setSelectedFacility(null);
      setUsageForm({ duration_minutes: '', remarks: '' });
      fetchUsageHistory();
    } catch (error) {
      console.error('Facility usage error:', error);
      Alert.alert('Error', error.message || 'Failed to record facility usage');
    } finally {
      setSubmittingUsage(false);
    }
  };

  const calculateCost = (costPerUse, durationMinutes) => {
    if (!costPerUse || !durationMinutes) return 0;
    return (costPerUse * (durationMinutes / 60)).toFixed(2);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'inactive':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'maintenance':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  if (loading) {
    return (
      <View className="flex-1 justify-center items-center bg-gray-100">
        <ActivityIndicator size="large" color="#4F46E5" />
        <Text className="mt-4 text-lg text-gray-700">Loading facilities...</Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-gray-50">
      <Header />
      <ScrollView className="p-4">
        <Text className="text-3xl font-bold text-gray-900 mb-2">Hostel Facilities</Text>
        <Text className="text-gray-600 mb-6">Use available facilities and track your usage</Text>

        {/* Available Facilities */}
        <View className="mb-8">
          <Text className="text-xl font-semibold text-gray-900 mb-4 flex-row items-center">
            <TrendingUp size={20} color="#3B82F6" className="mr-2" /> Available Facilities
          </Text>
          <View className="flex-row flex-wrap justify-between">
            {facilities.map((facility) => (
              <View key={facility.id} className="w-[48%] bg-white rounded-lg shadow-md p-4 mb-4">
                <View className="flex-row items-center justify-between mb-3">
                  <View className="flex-row items-center">
                    <View className="bg-blue-100 p-2 rounded-lg">
                      <Wifi className="text-blue-600" size={20} />
                    </View>
                    <View className="ml-2">
                      <Text className="text-lg font-semibold text-gray-900">{facility.name}</Text>
                      <Text className="text-xs text-gray-600">{facility.HostelFacilityType?.name}</Text>
                    </View>
                  </View>
                  <View className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(facility.status)}`}>
                    <Text className={`text-xs font-medium ${getStatusColor(facility.status).split(' ').find(cls => cls.startsWith('text-'))}`}>
                        {facility.status.charAt(0).toUpperCase() + facility.status.slice(1)}
                    </Text>
                  </View>
                </View>

                <View className="space-y-1 mb-3">
                  {facility.capacity && (
                    <Text className="text-sm text-gray-600">
                      <Text className="font-bold">Capacity:</Text> {facility.capacity} users
                    </Text>
                  )}
                  {facility.cost_per_use > 0 && (
                    <Text className="text-sm text-gray-600">
                      <Text className="font-bold">Cost:</Text> ₹{facility.cost_per_use} per hour
                    </Text>
                  )}
                </View>

                {facility.status === 'active' ? (
                  <TouchableOpacity
                    onPress={() => handleUseFacility(facility)}
                    className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg flex-row items-center justify-center"
                  >
                    <Plus size={16} color="white" className="mr-2" />
                    <Text className="text-white font-semibold">Use Facility</Text>
                  </TouchableOpacity>
                ) : (
                  <View className="w-full bg-gray-300 py-2 px-4 rounded-lg items-center">
                    <Text className="text-gray-600">
                      {facility.status === 'maintenance' ? 'Under Maintenance' : 'Not Available'}
                    </Text>
                  </View>
                )}
              </View>
            ))}
          </View>

          {facilities.length === 0 && (
            <View className="text-center py-12 bg-white rounded-lg shadow-md">
              <Wifi className="mx-auto h-12 w-12 text-gray-400" />
              <Text className="mt-2 text-sm font-medium text-gray-900">No facilities available</Text>
              <Text className="mt-1 text-sm text-gray-500">
                Available facilities will appear here.
              </Text>
            </View>
          )}
        </View>

        {/* Usage History */}
        <View className="bg-white shadow-md rounded-lg overflow-hidden mb-8">
          <View className="px-4 py-3 bg-gray-50 border-b border-gray-200 flex-row items-center">
            <History className="text-gray-400 mr-2" size={20} />
            <Text className="text-lg font-medium text-gray-900">Usage History</Text>
            <Text className="ml-2 text-sm text-gray-500">
              ({usageHistory.length} records)
            </Text>
          </View>

          {usageHistory.length > 0 ? (
            <View className="divide-y divide-gray-200">
              {usageHistory.map((usage) => (
                <View key={usage.id} className="p-4 flex-row items-center justify-between hover:bg-gray-50">
                  <View className="flex-1">
                    <View className="flex-row items-center mb-1">
                      <Wifi className="text-blue-600 mr-2" size={16} />
                      <Text className="text-sm font-medium text-gray-900">
                        {usage.facility?.name}
                      </Text>
                    </View>
                    <Text className="text-xs text-gray-500 ml-6">
                      {usage.facility?.HostelFacilityType?.name}
                    </Text>
                    <View className="flex-row items-center mt-2 ml-6">
                      <Clock size={14} className="mr-1 text-gray-500" />
                      <Text className="text-xs text-gray-700">
                        {usage.duration_minutes} minutes
                      </Text>
                      <DollarSign size={14} className="ml-3 mr-1 text-green-600" />
                      <Text className="text-xs text-gray-700">
                        ₹{usage.cost}
                      </Text>
                    </View>
                  </View>
                  <View className="items-end">
                    <Text className="text-xs text-gray-500">
                      {moment(usage.usage_date).format('MMM DD, YYYY')}
                    </Text>
                    <Text className="text-xs text-gray-500">
                      {moment(usage.usage_date).format('h:mm A')}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          ) : (
            <View className="text-center py-12">
              <History className="mx-auto h-12 w-12 text-gray-400" />
              <Text className="mt-2 text-sm font-medium text-gray-900">No usage history</Text>
              <Text className="mt-1 text-sm text-gray-500">
                Your facility usage history will appear here.
              </Text>
            </View>
          )}
        </View>

        {/* Use Facility Modal */}
        <Modal
          animationType="slide"
          transparent={true}
          visible={showUseModal}
          onRequestClose={() => setShowUseModal(false)}
        >
          <View className="flex-1 justify-center items-center bg-black/50 p-4">
            <View className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
              <Text className="text-lg font-medium text-gray-900 mb-4">
                Use {selectedFacility?.name}
              </Text>
              
              <View className="mb-4 p-3 bg-gray-50 rounded-lg">
                <Text className="text-sm text-gray-600">
                  <Text className="font-bold">Facility Type:</Text> {selectedFacility?.HostelFacilityType?.name}
                </Text>
                {selectedFacility?.cost_per_use > 0 && (
                  <Text className="text-sm text-gray-600 mt-1">
                    <Text className="font-bold">Cost:</Text> ₹{selectedFacility?.cost_per_use} per hour
                  </Text>
                )}
              </View>
              
              <View className="space-y-4">
                <View>
                  <Text className="block text-sm font-medium text-gray-700 mb-1">
                    Duration (minutes) *
                  </Text>
                  <TextInput
                    value={usageForm.duration_minutes}
                    onChangeText={(text) => setUsageForm({
                      ...usageForm,
                      duration_minutes: text
                    })}
                    keyboardType="numeric"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-700"
                    placeholder="e.g., 60"
                    min="1"
                  />
                  {usageForm.duration_minutes && selectedFacility?.cost_per_use > 0 && (
                    <Text className="mt-1 text-sm text-gray-600">
                      Estimated cost: ₹{calculateCost(selectedFacility.cost_per_use, usageForm.duration_minutes)}
                    </Text>
                  )}
                </View>
                
                <View>
                  <Text className="block text-sm font-medium text-gray-700 mb-1">
                    Remarks (Optional)
                  </Text>
                  <TextInput
                    value={usageForm.remarks}
                    onChangeText={(text) => setUsageForm({
                      ...usageForm,
                      remarks: text
                    })}
                    multiline
                    numberOfLines={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md h-24 text-gray-700"
                    placeholder="Any additional notes..."
                    textAlignVertical="top"
                  />
                </View>

                <View className="flex-row gap-3 pt-4">
                  <TouchableOpacity
                    onPress={handleSubmitUsage}
                    disabled={submittingUsage}
                    className="flex-1 bg-blue-600 py-3 rounded-md flex-row items-center justify-center disabled:opacity-50"
                  >
                    {submittingUsage ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <Text className="text-white font-semibold">Record Usage</Text>
                    )}
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => {
                      setShowUseModal(false);
                      setSelectedFacility(null);
                      setUsageForm({ duration_minutes: '', remarks: '' });
                    }}
                    className="flex-1 bg-gray-300 py-3 rounded-md flex-row items-center justify-center"
                  >
                    <Text className="text-gray-700 font-semibold">Cancel</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </View>
        </Modal>
      </ScrollView>
    </View>
  );
};

export default FacilityUsageScreen;
