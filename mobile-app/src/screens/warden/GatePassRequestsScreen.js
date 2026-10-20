import React, { useCallback, useRef, useState } from 'react';
import { View, Text, FlatList, ScrollView, Modal, Alert, StyleSheet } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Picker } from '@react-native-picker/picker';
import Screen from '../../components/common/Screen';
import Header from '../../components/common/Header';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import RequestDetails, { personName, displayDate } from '../../components/common/RequestDetails';
import { outpassAPI } from '../../api/api';
import colors from '../../theme/colors';

export default function GatePassRequestsScreen() {
  const [rows, setRows] = useState([]);
  const [status, setStatus] = useState('pending');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [decision, setDecision] = useState(null);
  const [remarks, setRemarks] = useState('');
  const [saving, setSaving] = useState(false);
  const busy = useRef(false);
  const request = useRef(0);
  const load = useCallback(async () => {
    const serial = ++request.current;
    setLoading(true);
    try {
      const response = await outpassAPI.getWardenOutpasses({ status });
      if (serial === request.current) setRows(response.data.data || []);
    } catch (error) { if (serial === request.current) Alert.alert('Cannot load gate passes', error.message); }
    finally { if (serial === request.current) setLoading(false); }
  }, [status]);
  useFocusEffect(useCallback(() => { load(); return () => { request.current++; }; }, [load]));
  const choose = (row, action) => { setDecision({ row, action }); setRemarks(''); };
  const decide = async () => {
    if (!decision || busy.current) return;
    busy.current = true; setSaving(true);
    try {
      if (decision.action === 'approve') await outpassAPI.approveOutpass(decision.row.id, remarks);
      else await outpassAPI.rejectOutpass(decision.row.id, remarks);
      setDecision(null);
      Alert.alert('Gate pass updated', decision.action === 'approve' ? 'Approved. The student can now show the QR pass to security.' : 'Request rejected.');
      await load();
    } catch (error) { Alert.alert('Cannot update gate pass', error.message); }
    finally { busy.current = false; setSaving(false); }
  };
  const query = search.trim().toLowerCase();
  const filtered = rows.filter(row => `${row.Student?.userName || ''} ${row.Student?.roll_number || ''} ${row.destination || ''}`.toLowerCase().includes(query));
  return <Screen><Header />
    <FlatList style={{ flex: 1 }} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled"
      refreshing={loading} onRefresh={load} data={filtered} keyExtractor={row => String(row.id)}
      ListHeaderComponent={<View style={styles.filters}>
        <Text style={styles.title}>Gate pass requests</Text>
        <Text style={styles.help}>Review requests here. Security records exit and return after your approval.</Text>
        <Input accessibilityLabel="Search gate passes" placeholder="Search student, roll number or destination" value={search} onChangeText={setSearch} />
        <View style={styles.picker}><Picker accessibilityLabel="Gate pass status" selectedValue={status} onValueChange={setStatus}>
          {['pending', 'all', 'approved', 'rejected', 'outside', 'completed', 'late_return', 'cancelled', 'expired'].map(value => <Picker.Item key={value} value={value} label={value.replace(/_/g, ' ').replace(/^./, first => first.toUpperCase())} />)}
        </Picker></View>
        <Button variant="ghost" disabled={loading} onPress={load}>Refresh</Button>
      </View>}
      ListEmptyComponent={!loading && <Text style={styles.help}>No matching gate pass requests.</Text>}
      renderItem={({ item }) => <RequestDetails title="Gate pass request" reference={item.id} status={item.status}
        submittedBy={[personName(item.Student, item.student_id), item.Student?.roll_number].filter(Boolean).join(' · ')}
        reviewedBy={personName(item.Approver, item.approved_by)} reviewLabel={item.status === 'rejected' ? 'Rejected by' : 'Approved by'}
        submittedAt={item.createdAt} reviewedAt={item.approved_date} fromDate={item.from_date} toDate={item.to_date} includeTime
        reason={item.purpose} fields={[
          { label: 'Destination', value: item.destination, full: true },
          { label: 'Remarks', value: item.remarks, full: true },
          ...(item.exit_time ? [{ label: 'Actual exit', value: displayDate(item.exit_time, true) }] : []),
          ...(item.return_time ? [{ label: 'Actual return', value: displayDate(item.return_time, true) }] : []),
        ]}>
        {item.status === 'pending' && <View style={styles.buttons}>
          <Button disabled={saving} onPress={() => choose(item, 'approve')} style={{ flex: 1 }}>Approve</Button>
          <Button variant="danger" disabled={saving} onPress={() => choose(item, 'reject')} style={{ flex: 1 }}>Reject</Button>
        </View>}
      </RequestDetails>}
    />
    <Modal visible={Boolean(decision)} transparent animationType="fade" onRequestClose={() => !saving && setDecision(null)}>
      <View style={styles.overlay}><View style={styles.dialog}><ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.filters}>
        <Text style={styles.title}>{decision?.action === 'approve' ? 'Approve' : 'Reject'} gate pass</Text>
        <Text style={styles.help}>{decision?.row.Student?.userName} · #{decision?.row.id}</Text>
        <Input accessibilityLabel="Gate pass decision remarks" placeholder="Remarks (optional)" multiline value={remarks} onChangeText={setRemarks} style={{ minHeight: 100 }} />
        <Button variant={decision?.action === 'reject' ? 'danger' : 'primary'} loading={saving} onPress={decide}>Confirm {decision?.action === 'approve' ? 'approval' : 'rejection'}</Button>
        <Button variant="ghost" disabled={saving} onPress={() => setDecision(null)}>Cancel</Button>
      </ScrollView></View></View>
    </Modal>
  </Screen>;
}
const styles = StyleSheet.create({
  content: { padding: 16, paddingBottom: 32 }, filters: { gap: 12, paddingBottom: 16 },
  title: { fontSize: 24, color: colors.primaryDark, fontWeight: '700' },
  help: { fontSize: 14, lineHeight: 21, color: colors.mutedText },
  picker: { backgroundColor: colors.card, borderRadius: 12, borderColor: colors.border, borderWidth: 1 },
  buttons: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  overlay: { flex: 1, backgroundColor: '#0F172A80', justifyContent: 'center', padding: 16 },
  dialog: { padding: 20, borderRadius: 20, backgroundColor: colors.card, maxHeight: '85%' },
});
