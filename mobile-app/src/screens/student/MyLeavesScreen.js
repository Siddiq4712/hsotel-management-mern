import { NewRequestCard, ApplicationCard, requestStyles } from '../../components/student/RequestUI';
import { useFocusEffect } from '@react-navigation/native';
import ProgressiveRows from "../../components/common/ProgressiveRows";
import { Text } from "../../components/common/ReferenceDesign";
import { useStudentVisible } from '../../components/student/StudentPresentation';
import Screen from '../../components/common/Screen';
import Input from '../../components/common/Input';
import Button from '../../components/common/Button';
import Card from '../../components/common/Card';
import colors from '../../theme/colors';
import React, { useState, useEffect, useCallback } from 'react';
import { View, ScrollView, ActivityIndicator, Alert, TouchableOpacity, Modal } from 'react-native';
import { studentAPI } from '../../api/api';
import { Calendar, Search, XCircle } from 'lucide-react-native';
import moment from 'moment';
import Header from '../../components/student/StudentHeader';
import { Picker } from '@react-native-picker/picker';
const LeaveManagementScreen = ({ navigation, refreshToken = 0 }) => {
  const isVisible = useStudentVisible();
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

  useFocusEffect(useCallback(() => {
    if (isVisible) fetchLeaves();
  }, [refreshToken, isVisible]));

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
    navigation.navigate('StudentRequestDetails', { kind: 'leave', id: leave.id });
  };

  const leaveTypes = ['all', ...new Set(leaves.map(leave => leave.leave_type))];

  return (
    <Screen className="flex-1 bg-background">
      <Header title="Leave history" back />
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, paddingBottom: 32 }} keyboardShouldPersistTaps="handled">
        <View style={{ gap: 16 }}>
          <NewRequestCard icon={Calendar} title="Leave request" description="Submit dates and a reason for warden review." button="New leave request" onPress={() => navigation.navigate('ApplyLeave')} />
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Text accessibilityRole="header" style={requestStyles.sectionTitle}>Your applications</Text>
            <Button variant="ghost" accessibilityLabel="Filter leave applications" onPress={() => { setTempFilters(filters); setShowFilterModal(true); }}><Search size={18} color={colors.primary} /></Button>
          </View>
          {loading ? <ActivityIndicator color={colors.primary} /> : filteredLeaves.length ?
            <ProgressiveRows data={filteredLeaves} resetKey={JSON.stringify(filters)} renderItem={leave => <ApplicationCard key={leave.id}
              title={`${leave.leave_type || 'Other'} leave`} reference={`LR-${leave.id}`} status={leave.status}
              dates={`${moment(leave.from_date).format('DD MMM')} → ${moment(leave.to_date).format('DD MMM YYYY')} · ${moment(leave.to_date).diff(moment(leave.from_date),'days')+1} days`}
              onPress={() => openLeaveDetails(leave)} />} /> :
            <Card style={{ gap: 10 }}><Text style={requestStyles.small}>No matching leave applications.</Text>
              {(filters.status !== 'all' || filters.type !== 'all' || filters.searchQuery) && <Button variant="ghost" onPress={handleResetFilters}>Clear filters</Button>}
            </Card>}
        </View>
      </ScrollView>
      
      {/* Filter Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={showFilterModal}
        onRequestClose={() => setShowFilterModal(false)}
      >
        <View className="flex-1 justify-end bg-black/50">
          <Card className="bg-white rounded-2xl" style={{ maxHeight: '85%' }}>
            <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 16, paddingBottom: 32 }}>
            <View className="flex-row justify-between items-center mb-4">
              <Text className="text-2xl font-bold" style={{ flex: 1, minWidth: 0 }}>Filter Leaves</Text>
              <TouchableOpacity onPress={() => setShowFilterModal(false)}>
                <XCircle size={28} color={colors.mutedText} />
              </TouchableOpacity>
            </View>

            <View className="gap-3">
              <View>
                <Text className="text-sm font-medium text-gray-700 mb-1">Status</Text>
                <Picker
                  selectedValue={tempFilters.status}
                  onValueChange={(itemValue) => setTempFilters(prev => ({ ...prev, status: itemValue }))}
                  className="w-full border border-gray-300 rounded-xl h-12"
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
                  className="w-full border border-gray-300 rounded-xl h-12"
                >
                  <Picker.Item label="All Types" value="all" />
                  {leaveTypes.filter(type => type !== 'all').map(type => (
                    <Picker.Item key={type} label={type.charAt(0).toUpperCase() + type.slice(1)} value={type} />
                  ))}
                </Picker>
              </View>
              <View>
                <Text className="text-sm font-medium text-gray-700 mb-1">Search</Text>
                <Input
                  value={tempFilters.searchQuery}
                  onChangeText={(text) => setTempFilters(prev => ({ ...prev, searchQuery: text }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-xl text-gray-900"
                  placeholder="Search in reasons..."
                />
              </View>
            </View>

            <View className="mt-6 pt-4 border-t border-gray-200" style={{ gap: 12, alignSelf: 'stretch' }}>
              <TouchableOpacity onPress={handleResetFilters} className="bg-gray-300 py-3 px-4 rounded-xl">
                <Text className="font-semibold text-gray-700">Reset Filters</Text>
              </TouchableOpacity>
              <Button onPress={handleApplyFilters} className="bg-blue-600 py-3 px-6 rounded-xl">
                <Text className="text-white font-semibold text-lg">Apply Filters</Text>
              </Button>
            </View>
            </ScrollView>
          </Card>
        </View>
      </Modal>
    </Screen>
  );
};

export default LeaveManagementScreen;
