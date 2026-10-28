import { withScreenPermission } from '../../auth/PermissionContext';
import { RequestPage, RequestField, RequestNote, requestStyles } from '../../components/student/RequestUI';
import { Text } from "../../components/common/ReferenceDesign";
import DateRangeField from '../../components/common/DateRangeField';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import colors from '../../theme/colors';
import React, { useRef, useState } from 'react';
import { View, TouchableOpacity, Alert } from 'react-native';
import { outpassAPI } from '../../api/api';
import { Clock, ScanLine, ChevronRight } from 'lucide-react-native';
import DateTimePickerModal from 'react-native-modal-datetime-picker';
import moment from 'moment';

const OutpassRequestScreen = ({ navigation }) => {
  const busy = useRef(false);
  const [purpose, setPurpose] = useState('');
  const [destination, setDestination] = useState('');
  const [fromDate, setFromDate] = useState(null);
  const [toDate, setToDate] = useState(null);
  const [loading, setLoading] = useState(false);

  // Picker States
  const [fromPickerVisible, setFromPickerVisible] = useState(false);
  const [toPickerVisible, setToPickerVisible] = useState(false);

  const handleSubmit = async () => {
    if (busy.current) return;
    if (!purpose.trim() || !destination.trim() || !fromDate || !toDate) {
      Alert.alert('Validation Error', 'All fields are required');
      return;
    }

    if (fromDate >= toDate) {
      Alert.alert('Validation Error', 'Return time must be after exit time');
      return;
    }

    busy.current = true;
    setLoading(true);
    try {
      await outpassAPI.createOutpass({
        purpose: purpose.trim(),
        destination: destination.trim(),
        from_date: fromDate.toISOString(),
        to_date: toDate.toISOString()
      });
      Alert.alert('Success', 'Outpass request submitted successfully');
      navigation.goBack();
    } catch (error) {
      Alert.alert('Request Failed', error.message.replace('API Error: ', ''));
    } finally {
      busy.current = false;
      setLoading(false);
    }
  };

  return <RequestPage title="Gate pass request" description="Request permission to leave the hostel" navigation={navigation} busy={loading}>
    <RequestNote icon={ScanLine}>After approval, show the generated QR pass to security when leaving and returning.</RequestNote>
    <RequestField label="Purpose of visit" required><Input accessibilityLabel="Purpose of visit" placeholder="e.g. Family function" value={purpose} onChangeText={setPurpose} editable={!loading} style={requestStyles.input} /></RequestField>
    <RequestField label="Destination" required><Input accessibilityLabel="Destination" placeholder="e.g. Coimbatore" value={destination} onChangeText={setDestination} editable={!loading} style={requestStyles.input} /></RequestField>
    <DateRangeField compact label="Visit dates *" from={fromDate} to={toDate} minimumDate={new Date()} disabled={loading}
      onChange={(from,to)=>{
        const exitClock=moment(fromDate||new Date()),returnClock=moment(toDate||moment().add(1,'hour').toDate());
        setFromDate(moment(from).hour(exitClock.hour()).minute(exitClock.minute()).second(0).millisecond(0).toDate());
        setToDate(moment(to).hour(returnClock.hour()).minute(returnClock.minute()).second(0).millisecond(0).toDate());
      }}/>
    <View style={{ flexDirection: 'row', gap: 12 }}>
      <RequestField label="Exit time" required style={{ flex: 1 }}>
        <TouchableOpacity accessibilityRole="button" accessibilityLabel="Choose exit time" disabled={!fromDate || loading} onPress={() => setFromPickerVisible(true)} style={[requestStyles.input, requestStyles.select]}>
          <Text style={{ flex: 1, fontSize: 13, color: fromDate ? colors.text : colors.mutedText }}>{fromDate ? moment(fromDate).format('hh:mm A') : 'Choose dates'}</Text><Clock size={16} color={colors.mutedText} />
        </TouchableOpacity>
      </RequestField>
      <RequestField label="Return time" required style={{ flex: 1 }}>
        <TouchableOpacity accessibilityRole="button" accessibilityLabel="Choose return time" disabled={!toDate || loading} onPress={() => setToPickerVisible(true)} style={[requestStyles.input, requestStyles.select]}>
          <Text style={{ flex: 1, fontSize: 13, color: toDate ? colors.text : colors.mutedText }}>{toDate ? moment(toDate).format('hh:mm A') : 'Choose dates'}</Text><Clock size={16} color={colors.mutedText} />
        </TouchableOpacity>
      </RequestField>
    </View>
    {fromDate && toDate && <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, padding: 14, backgroundColor: colors.surface, borderRadius: 12 }}>
      <View style={{ flex: 1, gap: 4 }}><Text style={requestStyles.small}>PLANNED EXIT</Text><Text style={{ fontSize: 12, fontWeight: '700' }}>{moment(fromDate).format('DD MMM · h:mm A')}</Text></View>
      <ChevronRight size={20} color={colors.text} />
      <View style={{ flex: 1, gap: 4 }}><Text style={requestStyles.small}>EXPECTED RETURN</Text><Text style={{ fontSize: 12, fontWeight: '700' }}>{moment(toDate).format('DD MMM · h:mm A')}</Text></View>
    </View>}
    <View style={{ gap: 10 }}>
      <Button permissionAction="create" onPress={handleSubmit} loading={loading}>Submit gate pass request</Button>
      <Button variant="secondary" disabled={loading} onPress={() => navigation.goBack()} style={requestStyles.outline}>Cancel</Button>
    </View>
    <DateTimePickerModal isVisible={fromPickerVisible} date={fromDate || new Date()} mode="time"
      onConfirm={date => { setFromDate(moment(fromDate).hour(date.getHours()).minute(date.getMinutes()).second(0).millisecond(0).toDate()); setFromPickerVisible(false); }} onCancel={() => setFromPickerVisible(false)} />
    <DateTimePickerModal isVisible={toPickerVisible} date={toDate || new Date()} mode="time"
      onConfirm={date => { setToDate(moment(toDate).hour(date.getHours()).minute(date.getMinutes()).second(0).millisecond(0).toDate()); setToPickerVisible(false); }} onCancel={() => setToPickerVisible(false)} />
  </RequestPage>;
};
export default withScreenPermission(OutpassRequestScreen, 'my-outpass');
