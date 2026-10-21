import { useEmbeddedHeader } from '../../components/common/ReferenceDesign';
import { Text } from "../../components/common/ReferenceDesign";
import RequestDetails, { personName, displayDate } from '../../components/common/RequestDetails';
import WardenRequestCard from '../../components/warden/WardenRequestCard';
import { SearchField } from '../../components/warden/WardenUI';
import Screen from '../../components/common/Screen';
import MoreSectionNav from '../../components/common/MoreSectionNav';
import Input from '../../components/common/Input';
import Button from '../../components/common/Button';
import ReviewSheet from '../../components/common/ReviewSheet';
import colors from '../../theme/colors';
import React, { useState, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { View, FlatList, ActivityIndicator, Alert } from 'react-native';
import { wardenAPI } from '../../api/api';
import Header from '../../components/common/Header';

const ComplaintManagementScreen = ({ requestId } = {}) => {
  const detailView = requestId != null;
  const RequestCard = detailView ? RequestDetails : WardenRequestCard;
  const [complaints, setComplaints] = useState([]);
  const embedded = useEmbeddedHeader();
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedComplaint, setSelectedComplaint] = useState(null);
  const [resolution, setResolution] = useState('');
  const [statusUpdate, setStatusUpdate] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  useFocusEffect(useCallback(() => { fetchComplaints(); }, []));

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

  const renderComplaintItem = ({ item }) => <RequestCard detailLayout={detailView} kind="Complaint" studentMeta={item.Student?.roll_number}
    title={item.subject} reference={item.id} status={item.status}
    submittedBy={personName(item.Student,item.student_id)}
    reviewedBy={personName(item.AssignedTo,item.assigned_to)||'Not assigned'} reviewLabel="Assigned to"
    submittedAt={item.createdAt} reason={item.description} reasonLabel="Description"
    fields={[
      {label:'Category',value:item.category}, {label:'Priority',value:item.priority,tone:['urgent','high'].includes(item.priority)?'danger':'warning'},
      {label:'Resolved on',value:item.resolved_date?displayDate(item.resolved_date):null},
      {label:'Resolution',value:item.resolution,full:true},
    ]}>
    {item.status!=='resolved'&&item.status!=='closed'&&<Button variant="secondary" disabled={loading||actionLoading}
      onPress={()=>{setSelectedComplaint(item);setResolution(item.resolution||'');setStatusUpdate(item.status);setModalVisible(true);}}>Update status</Button>}
  </RequestCard>;

  return (
    <Screen className="flex-1 bg-background">
      <Header />
      <MoreSectionNav />
      <View className="p-4 flex-1">
        {!embedded && <Text className="text-2xl font-bold text-indigo-900 mb-4">Complaints</Text>}
        {!detailView && <SearchField accessibilityLabel="Search requests" placeholder="Search complaints" value={search} onChangeText={setSearch} style={{ marginBottom: 12 }} />}
          <FlatList style={{flex:1}}
            keyboardShouldPersistTaps="handled"
            refreshing={loading}
            onRefresh={fetchComplaints}
            ListEmptyComponent={loading ? <ActivityIndicator color={colors.primary} size="large" style={{padding:32}}/> : <Text className="text-center text-gray-600 py-6">{detailView ? 'This complaint is unavailable.' : 'No complaints found.'}</Text>}
            data={complaints.filter(item => detailView ? String(item.id) === String(requestId) : JSON.stringify([item.Student?.userName, item.Student?.roll_number, item.leave_type, item.subject, item.reason, item.description]).toLowerCase().includes(search.toLowerCase()))}
            renderItem={renderComplaintItem}
            keyExtractor={item => item.id.toString()}
            contentContainerStyle={{ paddingBottom: 20 }}
          />
      </View>

      <ReviewSheet visible={modalVisible} title="Update complaint" description={selectedComplaint?.subject} busy={actionLoading} onClose={()=>setModalVisible(false)}>
            <Text style={{ fontWeight: '600', color: colors.text }}>Status</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {['in_progress', 'resolved', 'closed'].map((s) => (
                <Button
                  key={s}
                  disabled={actionLoading}
                  onPress={() => setStatusUpdate(s)}
                  variant={statusUpdate === s ? 'primary' : 'secondary'}
                  accessibilityState={{ selected: statusUpdate === s, disabled: actionLoading }}
                >
                  <Text className={`capitalize font-medium ${statusUpdate === s ? 'text-white' : 'text-gray-600'}`}>
                    {s.replace('_', ' ')}
                  </Text>
                </Button>
              ))}
            </View>

            <Text style={{ fontWeight: '600', color: colors.text }}>Resolution note</Text>
            <Input
              accessibilityLabel="Complaint resolution note"
              placeholder="Describe the solution..."
              multiline
              value={resolution}
              onChangeText={setResolution}
              className="bg-gray-50 border border-gray-200 rounded-xl p-4 text-gray-800"
              style={{ minHeight: 100 }}
              textAlignVertical="top"
            />

            <Button
              disabled={actionLoading}
              loading={actionLoading}
              onPress={updateStatus}
            >
              <Text className="text-white font-bold text-lg">Save Changes</Text>
            </Button>

      </ReviewSheet>
    </Screen>
  );
};

export default ComplaintManagementScreen;
