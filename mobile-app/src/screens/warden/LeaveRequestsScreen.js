import { withScreenPermission } from '../../auth/PermissionContext';
import ApplicationDetails from '../../components/student/ApplicationDetails';
import { useEmbeddedHeader } from '../../components/common/ReferenceDesign';
import { Text } from "../../components/common/ReferenceDesign";
import RequestDetails, { personName, displayDate } from '../../components/common/RequestDetails';
import WardenRequestCard from '../../components/warden/WardenRequestCard';
import { SearchField } from '../../components/warden/WardenUI';
import Screen from '../../components/common/Screen';
import Input from '../../components/common/Input';
import Button from '../../components/common/Button';
import ReviewSheet from '../../components/common/ReviewSheet';
import colors from '../../theme/colors';
import React, { useState, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { View, FlatList, ActivityIndicator, Alert } from 'react-native';
import { wardenAPI } from '../../api/api';
import Header from '../../components/common/Header';
import { CheckCircle, XCircle } from 'lucide-react-native';
import moment from 'moment';

const LeaveRequestsScreen = ({ navigation, requestId }) => {
  const detailView = requestId != null;
  const RequestCard = detailView ? RequestDetails : WardenRequestCard;
  const [leaves, setLeaves] = useState([]);
  const embedded = useEmbeddedHeader();
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedLeave, setSelectedLeave] = useState(null);
  const [remarks, setRemarks] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  useFocusEffect(useCallback(() => { fetchLeaves(); }, []));

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

  const renderLeaveItem = ({ item }) => detailView ? <ApplicationDetails kind="leave" row={item}>
    {item.status==='pending'&&<Button disabled={loading||actionLoading} onPress={()=>{setSelectedLeave(item);setRemarks('');setModalVisible(true);}}>Review request</Button>}
  </ApplicationDetails> : <RequestCard detailLayout={detailView} kind="Leave request" studentMeta={item.Student?.roll_number}
    title={item.leave_type ? item.leave_type.charAt(0).toUpperCase()+item.leave_type.slice(1)+' leave' : 'Leave request'}
    reference={item.id} status={item.status}
    submittedBy={personName(item.Student,item.student_id)}
    reviewedBy={personName(item.ApprovedBy,item.approved_by)}
    reviewLabel={item.status==='rejected'?'Rejected by':'Approved by'}
    submittedAt={item.createdAt} reviewedAt={item.approved_date}
    fromDate={item.from_date} toDate={item.to_date}
    duration={(moment(item.to_date).startOf('day').diff(moment(item.from_date).startOf('day'),'days')+1)+' days, inclusive'}
    reason={item.reason} fields={[{label:'Remarks',value:item.remarks,full:true}]}>
    {item.status==='pending'&&<Button disabled={loading||actionLoading} onPress={()=>{setSelectedLeave(item);setRemarks('');setModalVisible(true);}}>Review request</Button>}
  </RequestCard>;

  return (
    <Screen className="flex-1 bg-background">
      <Header />
      <View className="p-4 flex-1">
        {!embedded && <Text className="text-2xl font-bold text-indigo-900 mb-4">Leave Requests</Text>}
        {!embedded && <Button variant="secondary" onPress={()=>navigation.navigate('GatePasses')} style={{marginBottom:16}}>Review gate passes</Button>}
        {!detailView && <SearchField accessibilityLabel="Search requests" placeholder="Search leave requests" value={search} onChangeText={setSearch} style={{ marginBottom: 12 }} />}
          <FlatList style={{flex:1}}
            keyboardShouldPersistTaps="handled"
            refreshing={loading}
            onRefresh={fetchLeaves}
            data={leaves.filter(item => detailView ? String(item.id) === String(requestId) : JSON.stringify([item.Student?.userName, item.Student?.roll_number, item.leave_type, item.subject, item.reason, item.description]).toLowerCase().includes(search.toLowerCase()))}
            renderItem={renderLeaveItem}
            keyExtractor={item => item.id.toString()}
            contentContainerStyle={{ paddingBottom: 20 }}
            ListEmptyComponent={loading ? <ActivityIndicator color={colors.primary} size="large" style={{padding:32}}/> : <Text className="text-center text-gray-600 mt-10">{detailView ? 'This leave request is unavailable.' : 'No leave requests found.'}</Text>}
          />
      </View>

      {/* Approval/Rejection Modal */}
      <ReviewSheet visible={modalVisible} title="Review leave" busy={actionLoading} onClose={()=>setModalVisible(false)}
        description={`${personName(selectedLeave?.Student,selectedLeave?.student_id)} · ${displayDate(selectedLeave?.from_date)} → ${displayDate(selectedLeave?.to_date)}`}>
            <Text style={{ fontWeight: '600', color: colors.text }}>Remarks</Text>
            <Input
              accessibilityLabel="Leave review remarks"
              placeholder="Enter remarks (optional)..."
              multiline
              numberOfLines={4}
              value={remarks}
              onChangeText={setRemarks}
              className="bg-gray-50 border border-gray-200 rounded-xl p-4 text-gray-800"
              style={{ minHeight: 110 }}
              textAlignVertical="top"
            />

            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
              <Button permissionAction="approve" variant="secondary"
                disabled={actionLoading}
                onPress={() => handleAction('rejected')}
                style={{ flexGrow: 1, flexBasis: '42%', backgroundColor: colors.dangerSoft, borderColor: colors.dangerTint }}
              >
                <XCircle size={18} color={colors.danger} className="mr-2" />
                <Text className="text-red-600 font-bold">Reject</Text>
              </Button>

              <Button permissionAction="approve"
                disabled={actionLoading}
                onPress={() => handleAction('approved')}
                style={{ flexGrow: 1, flexBasis: '42%', backgroundColor: colors.success }}
              >
                <CheckCircle size={18} color="white" className="mr-2" />
                <Text className="text-white font-bold">Approve</Text>
              </Button>
            </View>

      </ReviewSheet>
    </Screen>
  );
};

export default withScreenPermission(LeaveRequestsScreen, 'leave-approvals');
