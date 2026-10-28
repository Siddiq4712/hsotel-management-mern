import { withScreenPermission } from '../../auth/PermissionContext';
import React, { useRef, useState } from 'react';
import { Alert, View } from 'react-native';
import moment from 'moment';
import { FileText } from 'lucide-react-native';
import { studentAPI } from '../../api/api';
import Input from '../../components/common/Input';
import Button from '../../components/common/Button';
import DateRangeField from '../../components/common/DateRangeField';
import { RequestPage, RequestField, RequestNote, RequestSelect, requestStyles } from '../../components/student/RequestUI';

const types = [['casual', 'Casual leave'], ['sick', 'Sick leave'], ['emergency', 'Emergency leave'], ['vacation', 'Vacation leave'], ['other', 'Other']];
function ApplyLeaveScreen({ navigation }) {
  const [formData, setFormData] = useState({ leave_type: '', from_date: '', to_date: '', reason: '' });
  const [loading, setLoading] = useState(false);
  const busy = useRef(false);
  const handleSubmit = async () => {
    if (busy.current) return;
    if (!formData.leave_type || !formData.from_date || !formData.to_date || !formData.reason.trim()) return Alert.alert('Check the request', 'All fields are required.');
    if (moment(formData.from_date).isAfter(moment(formData.to_date))) return Alert.alert('Check the dates', 'From date cannot be after to date.');
    busy.current = true; setLoading(true);
    try {
      await studentAPI.applyLeave({ ...formData, reason: formData.reason.trim() });
      Alert.alert('Submitted', 'Leave application submitted successfully.');
      navigation.goBack();
    } catch (error) { Alert.alert('Unable to submit', error.message || 'Failed to submit leave application.'); }
    finally { busy.current = false; setLoading(false); }
  };
  return <RequestPage title="Leave request" description="Submit dates and a reason for warden review" navigation={navigation} busy={loading}>
    <RequestNote icon={FileText}>Your application will be sent to the warden for review.</RequestNote>
    <RequestField label="Leave type" required>
      <RequestSelect label="Leave type" placeholder="Select leave type" value={formData.leave_type} options={types} disabled={loading}
        onChange={leave_type => setFormData(v => ({ ...v, leave_type }))} />
    </RequestField>
    <DateRangeField compact label="Leave dates *" from={formData.from_date} to={formData.to_date} minimumDate={new Date()} disabled={loading}
      onChange={(from_date, to_date) => setFormData(v => ({ ...v, from_date, to_date }))} />
    <RequestField label="Reason" required>
      <Input accessibilityLabel="Reason for leave" value={formData.reason} editable={!loading} multiline placeholder="Explain why you need leave"
        onChangeText={reason => setFormData(v => ({ ...v, reason }))} style={[requestStyles.input, { minHeight: 120 }]} />
    </RequestField>
    <View style={{ gap: 10 }}>
      <Button permissionAction="create" onPress={handleSubmit} loading={loading}>Submit leave request</Button>
      <Button variant="secondary" disabled={loading} onPress={() => navigation.goBack()} style={requestStyles.outline}>Cancel</Button>
    </View>
  </RequestPage>;
}

export default withScreenPermission(ApplyLeaveScreen, 'my-leaves');
