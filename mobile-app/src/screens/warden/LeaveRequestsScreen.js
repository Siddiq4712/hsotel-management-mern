import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, ActivityIndicator, Alert, Modal, TextInput } from 'react-native';
import { wardenAPI } from '../../api/api';
import Header from '../../components/common/Header';
import StatusBadge from '../../components/common/StatusBadge';
import { Calendar, User, Clock, CheckCircle, XCircle } from 'lucide-react-native';
import moment from 'moment';

const LeaveRequestsScreen = () => {
  const [leaves, setLeaves] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedLeave, setSelectedLeave] = useState(null);
  const [remarks, setRemarks] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => { fetchLeaves(); }, []);

  const fetchLeaves = async () => {
    setLoading(true);
    try {
      const res = await wardenAPI.getLeaveRequests();
      setLeaves(res.data.data);
    } catch (e) {
      Alert.alert("Error", "Failed to fetch leave requests");
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (status) => {
    if (!selectedLeave) return;
    setActionLoading(true);
    try {
      await wardenAPI.approveLeave(selectedLeave.id, { status, remarks });
      Alert.alert("Success", `Request ${status} successfully`);
      setModalVisible(false);
      fetchLeaves();
    } catch (e) {
      Alert.alert("Error", e.message);
    } finally {
      setActionLoading(false);
    }
  };

  const renderLeaveItem = ({ item }) => (
    <View className="bg-white p-4 rounded-2xl mb-4 shadow-sm border border-gray-100">
      <View className="flex-row justify-between items-start mb-3">
        <View className="flex-row items-center flex-1">
          <View className="bg-indigo-100 p-2 rounded-full mr-3">
            <User size={18} color="#4F46E5" />
          </View>
          <View>
            <Text className="font-bold text-gray-900 text-base">{item.Student?.username}</Text>
            <Text className="text-gray-500 text-xs">Type: {item.leave_type}</Text>
          </View>
        </View>
        <StatusBadge status={item.status} type="leave" />
      </View>

      <View className="flex-row items-center bg-gray-50 p-3 rounded-xl mb-3">
        <Calendar size={16} color="#6B7280" />
        <Text className="ml-2 text-gray-600 text-xs">
          {moment(item.from_date).format('MMM DD')} - {moment(item.to_date).format('MMM DD, YYYY')}
        </Text>
      </View>

      <Text className="text-gray-700 text-sm mb-4 leading-5" numberOfLines={2}>
        {item.reason}
      </Text>

      {item.status === 'pending' && (
        <TouchableOpacity 
          onPress={() => {
            setSelectedLeave(item);
            setRemarks('');
            setModalVisible(true);
          }}
          className="bg-indigo-600 py-3 rounded-xl items-center"
        >
          <Text className="text-white font-bold">Review Request</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  return (
    <View className="flex-1 bg-gray-50">
      <Header />
      <View className="p-4 flex-1">
        <Text className="text-2xl font-bold text-gray-900 mb-4">Leave Requests</Text>
        {loading ? <ActivityIndicator color="#4F46E5" size="large" className="mt-10" /> : (
          <FlatList 
            data={leaves}
            renderItem={renderLeaveItem}
            keyExtractor={item => item.id.toString()}
            contentContainerStyle={{ paddingBottom: 20 }}
            ListEmptyComponent={<Text className="text-center text-gray-400 mt-10">No leave requests found.</Text>}
          />
        )}
      </View>

      {/* Approval/Rejection Modal */}
      <Modal visible={modalVisible} animationType="fade" transparent>
        <View className="flex-1 bg-black/50 justify-center p-6">
          <View className="bg-white rounded-3xl p-6 shadow-2xl">
            <Text className="text-xl font-bold text-gray-900 mb-2">Process Leave</Text>
            <Text className="text-gray-500 text-sm mb-4">Add remarks for the student regarding this decision.</Text>
            
            <TextInput 
              placeholder="Enter remarks (optional)..."
              multiline
              numberOfLines={4}
              value={remarks}
              onChangeText={setRemarks}
              className="bg-gray-50 border border-gray-200 rounded-2xl p-4 text-gray-800 mb-6 text-start"
              textAlignVertical="top"
            />

            <View className="flex-row space-x-3">
              <TouchableOpacity 
                disabled={actionLoading}
                onPress={() => handleAction('rejected')}
                className="flex-1 flex-row bg-red-50 py-4 rounded-2xl items-center justify-center border border-red-100"
              >
                <XCircle size={18} color="#EF4444" className="mr-2" />
                <Text className="text-red-600 font-bold">Reject</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                disabled={actionLoading}
                onPress={() => handleAction('approved')}
                className="flex-1 flex-row bg-green-500 py-4 rounded-2xl items-center justify-center"
              >
                <CheckCircle size={18} color="white" className="mr-2" />
                <Text className="text-white font-bold">Approve</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity onPress={() => setModalVisible(false)} className="mt-4 items-center">
              <Text className="text-gray-400 font-medium">Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

export default LeaveRequestsScreen;