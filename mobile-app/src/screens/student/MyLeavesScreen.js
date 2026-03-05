import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, ActivityIndicator, Alert, TouchableOpacity, TextInput, Modal } from 'react-native';
import { studentAPI } from '../../api/api';
import { Calendar, FileText, CheckCircle, Clock, XCircle, Search, Eye, RefreshCcw } from 'lucide-react-native';
import moment from 'moment';
import Header from '../../components/common/Header';
import StatusBadge from '../../components/common/StatusBadge'; // Reusing common badge component
import DateTimePickerModal from 'react-native-modal-datetime-picker';
import { Picker } from '@react-native-picker/picker';
const LeaveDetailsModal = ({ leave, onClose }) => {
  if (!leave) return null;

  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={true} // Always visible when `leave` prop is present
      onRequestClose={onClose}
    >
      <View className="flex-1 justify-center items-center bg-black/50 p-4">
        <View className="bg-white rounded-lg shadow-xl w-full max-w-md">
          <View className="bg-gray-100 px-6 py-4 border-b border-gray-200 rounded-t-lg flex-row justify-between items-center">
            <Text className="text-lg font-semibold text-gray-900">Leave Details</Text>
            <TouchableOpacity onPress={onClose} className="p-1">
              <XCircle size={24} color="#6B7280" />
            </TouchableOpacity>
          </View>
          
          <ScrollView className="p-6 max-h-[70vh]">
            <View className="mb-4">
              <Text className="text-sm text-gray-500">Leave Type</Text>
              <Text className="font-semibold capitalize text-base text-gray-900">{leave.leave_type}</Text>
            </View>
            
            <View className="flex-row justify-between mb-4">
              <View className="flex-1 mr-2">
                <Text className="text-sm text-gray-500">From Date</Text>
                <Text className="font-semibold text-base text-gray-900">{moment(leave.from_date).format('MMM DD, YYYY')}</Text>
              </View>
              <View className="flex-1 ml-2">
                <Text className="text-sm text-gray-500">To Date</Text>
                <Text className="font-semibold text-base text-gray-900">{moment(leave.to_date).format('MMM DD, YYYY')}</Text>
              </View>
            </View>
            
            <View className="mb-4">
              <Text className="text-sm text-gray-500">Status</Text>
              <View className="mt-1">
                <StatusBadge status={leave.status} type="leave" />
              </View>
              {leave.ApprovedBy && (
                <Text className="text-xs text-gray-500 mt-1">
                  Processed by: {leave.ApprovedBy.userName}
                </Text>
              )}
            </View>
            
            <View className="mb-4">
              <Text className="text-sm text-gray-500 mb-1">Reason</Text>
              <View className="bg-gray-50 p-3 rounded-md">
                <Text className="text-gray-700 text-sm">{leave.reason}</Text>
              </View>
            </View>
            
            {leave.comment && ( // Assuming comment is a field for admin remarks
              <View className="mb-4">
                <Text className="text-sm text-gray-500 mb-1">Admin Comment</Text>
                <View className="bg-gray-50 p-3 rounded-md">
                  <Text className="text-gray-700 text-sm">{leave.comment}</Text>
                </View>
              </View>
            )}
            
            <Text className="text-xs text-gray-500 pt-2 text-center">
              Submitted on {moment(leave.createdAt).format('MMM DD, YYYY [at] h:mm A')}
            </Text>
          </ScrollView>
          
          <View className="px-6 py-4 bg-gray-50 border-t border-gray-200 rounded-b-lg flex-row justify-end">
            <TouchableOpacity
              onPress={onClose}
              className="bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700"
            >
              <Text className="text-white font-semibold">Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};


const LeaveManagementScreen = ({ navigation }) => {
  const [leaves, setLeaves] = useState([]);
  const [filteredLeaves, setFilteredLeaves] = useState([]);
  const [filters, setFilters] = useState({
    status: 'all',
    type: 'all',
    searchQuery: ''
  });
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [tempFilters, setTempFilters] = useState(filters); // For modal form
  
  const [loading, setLoading] = useState(true);
  const [selectedLeave, setSelectedLeave] = useState(null);

  useEffect(() => {
    fetchLeaves();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [leaves, filters]);

  const fetchLeaves = async () => {
    setLoading(true);
    try {
      const response = await studentAPI.getMyLeaves();
      setLeaves(response.data.data || []);
    } catch (error) {
      console.error('Error fetching leaves:', error);
      Alert.alert('Error', error.message || 'Failed to load leaves.');
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = useCallback(() => {
    let result = [...leaves];
    
    if (filters.status !== 'all') {
      result = result.filter(leave => leave.status === filters.status);
    }
    
    if (filters.type !== 'all') {
      result = result.filter(leave => leave.leave_type === filters.type);
    }
    
    if (filters.searchQuery) {
      const query = filters.searchQuery.toLowerCase();
      result = result.filter(leave => 
        leave.reason?.toLowerCase().includes(query) || 
        leave.leave_type?.toLowerCase().includes(query)
      );
    }
    
    result.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    
    setFilteredLeaves(result);
  }, [leaves, filters]);

  const handleApplyFilters = () => {
    setFilters(tempFilters);
    setShowFilterModal(false);
  };

  const handleResetFilters = () => {
    const resetValues = { status: 'all', type: 'all', searchQuery: '' };
    setTempFilters(resetValues);
    setFilters(resetValues);
    setShowFilterModal(false);
  };

  const openLeaveDetails = (leave) => {
    setSelectedLeave(leave);
  };

  const leaveTypes = ['all', ...new Set(leaves.map(leave => leave.leave_type))];

  return (
    <View className="flex-1 bg-gray-50">
      <Header />
      <ScrollView className="p-4">
        <Text className="text-3xl font-bold text-gray-900 mb-2">Leave Management</Text>
        <Text className="text-gray-600 mb-6">Apply for leave and track your applications</Text>

        {/* Apply for Leave Button */}
        <TouchableOpacity
          onPress={() => navigation.navigate('ApplyLeave')} // Navigate to ApplyLeaveScreen
          className="bg-blue-600 py-3 px-4 rounded-lg flex-row items-center justify-center mb-6"
        >
          <Calendar size={20} color="white" className="mr-2" />
          <Text className="text-white font-semibold text-base">Apply for New Leave</Text>
        </TouchableOpacity>

        {/* Leave History Section */}
        <View className="bg-white shadow-md rounded-lg overflow-hidden h-full">
          <View className="px-4 py-3 bg-gray-50 border-b border-gray-200 flex-row justify-between items-center">
            <View className="flex-row items-center">
              <FileText className="text-gray-400 mr-2" size={20} />
              <Text className="text-lg font-medium text-gray-900">Leave History</Text>
            </View>
            <TouchableOpacity onPress={() => setShowFilterModal(true)} className="p-2 bg-gray-100 rounded-md">
              <Search size={20} color="#6B7280" />
            </TouchableOpacity>
          </View>

          {loading ? (
            <View className="flex items-center justify-center h-64">
              <ActivityIndicator size="small" color="#4F46E5" />
            </View>
          ) : filteredLeaves.length > 0 ? (
            <View className="divide-y divide-gray-200">
              {filteredLeaves.map((leave) => {
                const fromDate = moment(leave.from_date);
                const toDate = moment(leave.to_date);
                const duration = toDate.diff(fromDate, 'days') + 1;
                
                return (
                  <View key={leave.id} className="p-4 hover:bg-gray-50">
                    <View className="flex-row justify-between items-center mb-2">
                      <View>
                        <Text className="text-base font-medium text-gray-900 capitalize">{leave.leave_type}</Text>
                        <Text className="text-xs text-gray-500">{moment(leave.createdAt).format('MMM DD, YYYY')}</Text>
                      </View>
                      <StatusBadge status={leave.status} type="leave" />
                    </View>
                    <Text className="text-sm text-gray-700 mt-1">
                      {fromDate.format('MMM DD')} - {toDate.format('MMM DD, YYYY')} ({duration} {duration === 1 ? 'day' : 'days'})
                    </Text>
                    <Text className="text-sm text-gray-600 mt-2" numberOfLines={2}>
                      Reason: {leave.reason}
                    </Text>
                    <TouchableOpacity
                      onPress={() => openLeaveDetails(leave)}
                      className="mt-3 flex-row items-center self-end px-3 py-1 rounded-md bg-blue-50"
                    >
                      <Eye size={16} color="#3B82F6" className="mr-1" />
                      <Text className="text-blue-600 text-sm">View Details</Text>
                    </TouchableOpacity>
                  </View>
                );
              })}
            </View>
          ) : (
            <View className="text-center py-12">
              <FileText className="mx-auto h-12 w-12 text-gray-400" />
              <Text className="mt-2 text-sm font-medium text-gray-900">No leave applications found</Text>
              <Text className="mt-1 text-sm text-gray-500">
                {filters.status !== 'all' || filters.type !== 'all' || filters.searchQuery
                  ? "Try changing your filters or search criteria."
                  : "Get started by applying for a leave."}
              </Text>
              {(filters.status !== 'all' || filters.type !== 'all' || filters.searchQuery) && (
                  <TouchableOpacity
                    onPress={handleResetFilters}
                    className="mt-3 text-sm text-blue-600 hover:text-blue-800"
                  >
                    <Text className="text-blue-600">Clear all filters</Text>
                  </TouchableOpacity>
                )}
            </View>
          )}
        </View>
      </ScrollView>
      
      {selectedLeave && (
        <LeaveDetailsModal 
          leave={selectedLeave} 
          onClose={() => setSelectedLeave(null)} 
        />
      )}

      {/* Filter Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={showFilterModal}
        onRequestClose={() => setShowFilterModal(false)}
      >
        <View className="flex-1 justify-end bg-black/50">
          <View className="bg-white rounded-t-xl p-6">
            <View className="flex-row justify-between items-center mb-4">
              <Text className="text-2xl font-bold">Filter Leaves</Text>
              <TouchableOpacity onPress={() => setShowFilterModal(false)}>
                <XCircle size={28} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <View className="space-y-4">
              <View>
                <Text className="text-sm font-medium text-gray-700 mb-1">Status</Text>
                <Picker
                  selectedValue={tempFilters.status}
                  onValueChange={(itemValue) => setTempFilters(prev => ({ ...prev, status: itemValue }))}
                  className="w-full border border-gray-300 rounded-lg h-12"
                >
                  <Picker.Item label="All Statuses" value="all" />
                  <Picker.Item label="Pending" value="pending" />
                  <Picker.Item label="Approved" value="approved" />
                  <Picker.Item label="Rejected" value="rejected" />
                </Picker>
              </View>
              <View>
                <Text className="text-sm font-medium text-gray-700 mb-1">Leave Type</Text>
                <Picker
                  selectedValue={tempFilters.type}
                  onValueChange={(itemValue) => setTempFilters(prev => ({ ...prev, type: itemValue }))}
                  className="w-full border border-gray-300 rounded-lg h-12"
                >
                  <Picker.Item label="All Types" value="all" />
                  {leaveTypes.filter(type => type !== 'all').map(type => (
                    <Picker.Item key={type} label={type.charAt(0).toUpperCase() + type.slice(1)} value={type} />
                  ))}
                </Picker>
              </View>
              <View>
                <Text className="text-sm font-medium text-gray-700 mb-1">Search</Text>
                <TextInput
                  value={tempFilters.searchQuery}
                  onChangeText={(text) => setTempFilters(prev => ({ ...prev, searchQuery: text }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900"
                  placeholder="Search in reasons..."
                />
              </View>
            </View>

            <View className="flex-row justify-between items-center mt-6 pt-4 border-t border-gray-200">
              <TouchableOpacity onPress={handleResetFilters} className="bg-gray-300 py-3 px-4 rounded-lg">
                <Text className="font-semibold text-gray-700">Reset Filters</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleApplyFilters} className="bg-blue-600 py-3 px-6 rounded-lg">
                <Text className="text-white font-semibold text-lg">Apply Filters</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

export default LeaveManagementScreen;
