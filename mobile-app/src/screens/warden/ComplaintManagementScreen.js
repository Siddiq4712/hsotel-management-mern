import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, ActivityIndicator, Alert, Modal, TextInput } from 'react-native';
import { wardenAPI } from '../../api/api';
import Header from '../../components/common/Header';
import StatusBadge from '../../components/common/StatusBadge';
import { MessageSquare, AlertTriangle, ShieldCheck, ChevronRight } from 'lucide-react-native';

const ComplaintManagementScreen = () => {
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedComplaint, setSelectedComplaint] = useState(null);
  const [resolution, setResolution] = useState('');
  const [statusUpdate, setStatusUpdate] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => { fetchComplaints(); }, []);

  const fetchComplaints = async () => {
    setLoading(true);
    try {
      const res = await wardenAPI.getComplaints();
      setComplaints(res.data.data);
    } catch (e) {
      Alert.alert("Error", "Failed to fetch complaints");
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async () => {
    if (!statusUpdate) return;
    setActionLoading(true);
    try {
      await wardenAPI.updateComplaint(selectedComplaint.id, { 
        status: statusUpdate, 
        resolution: resolution 
      });
      Alert.alert("Updated", `Complaint marked as ${statusUpdate}`);
      setModalVisible(false);
      fetchComplaints();
    } catch (e) {
      Alert.alert("Error", e.message);
    } finally {
      setActionLoading(false);
    }
  };

  const renderComplaintItem = ({ item }) => (
    <View className="bg-white p-5 rounded-2xl mb-4 shadow-sm border border-gray-100">
      <View className="flex-row justify-between items-center mb-2">
        <Text className="text-xs font-bold text-indigo-600 uppercase tracking-widest">{item.category}</Text>
        <StatusBadge status={item.status} type="complaint" />
      </View>

      <Text className="text-lg font-bold text-gray-900 mb-1">{item.subject}</Text>
      <Text className="text-gray-500 text-xs mb-3">By: {item.Student?.username}</Text>

      <View className="bg-orange-50 self-start px-2 py-1 rounded-md flex-row items-center mb-4">
        <AlertTriangle size={12} color="#F97316" />
        <Text className="text-orange-700 text-[10px] font-bold ml-1 uppercase">{item.priority} Priority</Text>
      </View>

      <Text className="text-gray-600 text-sm leading-5 mb-4">{item.description}</Text>

      {item.status !== 'resolved' && item.status !== 'closed' && (
        <TouchableOpacity 
          onPress={() => {
            setSelectedComplaint(item);
            setResolution(item.resolution || '');
            setStatusUpdate(item.status);
            setModalVisible(true);
          }}
          className="flex-row items-center justify-between bg-gray-50 p-4 rounded-xl"
        >
          <Text className="text-gray-900 font-semibold text-sm">Update Status</Text>
          <ChevronRight size={18} color="#9CA3AF" />
        </TouchableOpacity>
      )}
    </View>
  );

  return (
    <View className="flex-1 bg-gray-50">
      <Header />
      <View className="p-4 flex-1">
        <Text className="text-2xl font-bold text-gray-900 mb-4">Complaints</Text>
        {loading ? <ActivityIndicator color="#4F46E5" size="large" className="mt-10" /> : (
          <FlatList 
            data={complaints}
            renderItem={renderComplaintItem}
            keyExtractor={item => item.id.toString()}
            contentContainerStyle={{ paddingBottom: 20 }}
          />
        )}
      </View>

      <Modal visible={modalVisible} animationType="slide" transparent>
        <View className="flex-1 bg-black/50 justify-end">
          <View className="bg-white rounded-t-[40px] p-8 shadow-2xl">
            <Text className="text-xl font-bold text-gray-900 mb-6">Manage Complaint</Text>
            
            <Text className="text-gray-700 font-bold mb-3">Set Status</Text>
            <View className="flex-row flex-wrap gap-2 mb-6">
              {['in_progress', 'resolved', 'closed'].map((s) => (
                <TouchableOpacity 
                  key={s}
                  onPress={() => setStatusUpdate(s)}
                  className={`px-4 py-2 rounded-full border ${statusUpdate === s ? 'bg-indigo-600 border-indigo-600' : 'bg-white border-gray-200'}`}
                >
                  <Text className={`capitalize font-medium ${statusUpdate === s ? 'text-white' : 'text-gray-600'}`}>
                    {s.replace('_', ' ')}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text className="text-gray-700 font-bold mb-2">Resolution Note</Text>
            <TextInput 
              placeholder="Describe the solution..."
              multiline
              value={resolution}
              onChangeText={setResolution}
              className="bg-gray-50 border border-gray-200 rounded-2xl p-4 text-gray-800 mb-8"
              style={{ minHeight: 100 }}
              textAlignVertical="top"
            />

            <TouchableOpacity 
              disabled={actionLoading}
              onPress={updateStatus}
              className="bg-indigo-600 py-4 rounded-2xl items-center shadow-lg shadow-indigo-200"
            >
              <Text className="text-white font-bold text-lg">Save Changes</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={() => setModalVisible(false)} className="mt-6 items-center">
              <Text className="text-gray-400 font-bold">Discard</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

export default ComplaintManagementScreen;