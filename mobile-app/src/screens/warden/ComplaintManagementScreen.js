import RequestDetails, { personName, displayDate } from '../../components/common/RequestDetails';
import Screen from '../../components/common/Screen';
import MoreSectionNav from '../../components/common/MoreSectionNav';
import Input from '../../components/common/Input';
import Button from '../../components/common/Button';
import colors from '../../theme/colors';
import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, ActivityIndicator, Alert, Modal } from 'react-native';
import { wardenAPI } from '../../api/api';
import Header from '../../components/common/Header';

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

  const renderComplaintItem = ({ item }) => <RequestDetails
    title={item.subject} reference={item.id} status={item.status}
    submittedBy={personName(item.Student,item.student_id)}
    reviewedBy={personName(item.AssignedTo,item.assigned_to)||'Not assigned'} reviewLabel="Assigned to"
    submittedAt={item.createdAt} reason={item.description} reasonLabel="Description"
    fields={[
      {label:'Category',value:item.category}, {label:'Priority',value:item.priority,tone:['urgent','high'].includes(item.priority)?'danger':'warning'},
      {label:'Resolved on',value:item.resolved_date?displayDate(item.resolved_date):null},
      {label:'Resolution',value:item.resolution,full:true},
    ]}>
    {item.status!=='resolved'&&item.status!=='closed'&&<Button variant="secondary"
      onPress={()=>{setSelectedComplaint(item);setResolution(item.resolution||'');setStatusUpdate(item.status);setModalVisible(true);}}>Update status</Button>}
  </RequestDetails>;

  return (
    <Screen className="flex-1 bg-background">
      <Header />
      <MoreSectionNav />
      <View className="p-4 flex-1">
        <Text className="text-2xl font-bold text-indigo-900 mb-4">Complaints</Text>
        {loading ? <ActivityIndicator color={colors.primary} size="large" className="mt-10" /> : (
          <FlatList 
            refreshing={loading}
            onRefresh={fetchComplaints}
            ListEmptyComponent={<Text className="text-center text-gray-600 py-6">No complaints found.</Text>}
            data={complaints}
            renderItem={renderComplaintItem}
            keyExtractor={item => item.id.toString()}
            contentContainerStyle={{ paddingBottom: 20 }}
          />
        )}
      </View>

      <Modal visible={modalVisible} animationType="slide" transparent onRequestClose={()=>!actionLoading&&setModalVisible(false)}>
        <View className="flex-1 bg-black/50 justify-end">
          <View className="bg-white rounded-t-[40px] p-8 shadow-2xl">
            <Text className="text-xl font-bold text-indigo-900 mb-6">Manage Complaint</Text>
            
            <Text className="text-gray-700 font-bold mb-3">Set Status</Text>
            <View className="flex-row flex-wrap gap-2 mb-6">
              {['in_progress', 'resolved', 'closed'].map((s) => (
                <Button
                  key={s}
                  onPress={() => setStatusUpdate(s)}
                  className={`px-4 py-2 rounded-full border ${statusUpdate === s ? 'bg-indigo-600 border-indigo-600' : 'bg-white border-gray-200'}`}
                >
                  <Text className={`capitalize font-medium ${statusUpdate === s ? 'text-white' : 'text-gray-600'}`}>
                    {s.replace('_', ' ')}
                  </Text>
                </Button>
              ))}
            </View>

            <Text className="text-gray-700 font-bold mb-2">Resolution Note</Text>
            <Input
              placeholder="Describe the solution..."
              multiline
              value={resolution}
              onChangeText={setResolution}
              className="bg-gray-50 border border-gray-200 rounded-2xl p-4 text-gray-800 mb-8"
              style={{ minHeight: 100 }}
              textAlignVertical="top"
            />

            <Button
              disabled={actionLoading}
              onPress={updateStatus}
              className="bg-indigo-600 py-4 rounded-xl items-center shadow-sm shadow-indigo-200"
            >
              <Text className="text-white font-bold text-lg">Save Changes</Text>
            </Button>

            <TouchableOpacity disabled={actionLoading} onPress={() => setModalVisible(false)} className="mt-6 items-center">
              <Text className="text-gray-400 font-bold">Discard</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </Screen>
  );
};

export default ComplaintManagementScreen;
