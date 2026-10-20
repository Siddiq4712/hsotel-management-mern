import RequestDetails, { personName, displayDate } from '../../components/common/RequestDetails';
import Screen from '../../components/common/Screen';
import Input from '../../components/common/Input';
import Button from '../../components/common/Button';
import colors from '../../theme/colors';
import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, ActivityIndicator, Alert, Modal } from 'react-native';
import { wardenAPI } from '../../api/api';
import Header from '../../components/common/Header';
import { CheckCircle, XCircle } from 'lucide-react-native';
import moment from 'moment';

const LeaveRequestsScreen = ({ navigation }) => {
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

  const renderLeaveItem = ({ item }) => <RequestDetails
    title={item.leave_type ? item.leave_type.charAt(0).toUpperCase()+item.leave_type.slice(1)+' leave' : 'Leave request'}
    reference={item.id} status={item.status}
    submittedBy={personName(item.Student,item.student_id)}
    reviewedBy={personName(item.ApprovedBy,item.approved_by)}
    reviewLabel={item.status==='rejected'?'Rejected by':'Approved by'}
    submittedAt={item.createdAt} reviewedAt={item.approved_date}
    fromDate={item.from_date} toDate={item.to_date}
    duration={(moment(item.to_date).startOf('day').diff(moment(item.from_date).startOf('day'),'days')+1)+' days, inclusive'}
    reason={item.reason} fields={[{label:'Remarks',value:item.remarks,full:true}]}>
    {item.status==='pending'&&<Button onPress={()=>{setSelectedLeave(item);setRemarks('');setModalVisible(true);}}>Review request</Button>}
  </RequestDetails>;

  return (
    <Screen className="flex-1 bg-background">
      <Header />
      <View className="p-4 flex-1">
        <Text className="text-2xl font-bold text-indigo-900 mb-4">Leave Requests</Text>
        <Button variant="secondary" onPress={()=>navigation.navigate('GatePasses')} style={{marginBottom:16}}>Review gate passes</Button>
        {loading ? <ActivityIndicator color={colors.primary} size="large" className="mt-10" /> : (
          <FlatList 
            refreshing={loading}
            onRefresh={fetchLeaves}
            data={leaves}
            renderItem={renderLeaveItem}
            keyExtractor={item => item.id.toString()}
            contentContainerStyle={{ paddingBottom: 20 }}
            ListEmptyComponent={<Text className="text-center text-gray-400 mt-10">No leave requests found.</Text>}
          />
        )}
      </View>

      {/* Approval/Rejection Modal */}
      <Modal visible={modalVisible} animationType="fade" transparent onRequestClose={()=>!actionLoading&&setModalVisible(false)}>
        <View className="flex-1 bg-black/50 justify-center p-6">
          <View className="bg-white rounded-3xl p-6 shadow-2xl">
            <Text className="text-xl font-bold text-indigo-900 mb-2">Process Leave</Text>
            <Text className="text-gray-500 text-sm mb-4">{personName(selectedLeave?.Student,selectedLeave?.student_id)} · {displayDate(selectedLeave?.from_date)} → {displayDate(selectedLeave?.to_date)}</Text>
            
            <Input
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
                <XCircle size={18} color={colors.danger} className="mr-2" />
                <Text className="text-red-600 font-bold">Reject</Text>
              </TouchableOpacity>

              <Button
                disabled={actionLoading}
                onPress={() => handleAction('approved')}
                className="flex-1 flex-row bg-green-700 py-4 rounded-xl items-center justify-center"
              >
                <CheckCircle size={18} color="white" className="mr-2" />
                <Text className="text-white font-bold">Approve</Text>
              </Button>
            </View>

            <TouchableOpacity disabled={actionLoading} onPress={() => setModalVisible(false)} className="mt-4 items-center">
              <Text className="text-gray-400 font-medium">Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </Screen>
  );
};

export default LeaveRequestsScreen;
