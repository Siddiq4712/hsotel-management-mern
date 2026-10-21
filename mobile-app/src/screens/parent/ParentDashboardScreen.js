import { useParentStudent } from '../../hooks/useParentStudent';
import Screen from '../../components/common/Screen';
import Button from '../../components/common/Button';
import ReferenceHeader from '../../components/common/ReferenceHeader';
import { SectionTitle, ui } from '../../components/common/ReferenceDesign';
import { MetricCard, AttendanceBreakdown } from '../../components/common/DashboardSummary';
import { Text } from "../../components/common/ReferenceDesign";
import Card from '../../components/common/Card';
import colors from '../../theme/colors';
import React, { useState, useCallback, useMemo, useRef } from 'react';
import { View, ScrollView, RefreshControl, ActivityIndicator, StyleSheet } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { parentAPI } from '../../api/api';
import { useAuth } from '../../hooks/useAuth';
import { Picker } from '@react-native-picker/picker';
import { Bell, LogOut, CalendarCheck, IndianRupee } from 'lucide-react-native';
import moment from 'moment';

const ParentDashboardScreen = ({ route }) => {
  const section = route?.params?.section || 'overview';
  const selection = useParentStudent();
  const { logout } = useAuth();
  const dashboardRequest = useRef(0);
  const [students, setStudents] = useState([]);
  const { selectedStudentId, setSelectedStudentId } = selection;
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [notifications, setNotifications] = useState([]);

  const fetchStudents = useCallback(async () => {
    try {
      const res = await parentAPI.getStudents();
      const list = res.data.data || [];
      setStudents(list);
      setSelectedStudentId(current => list.some(student => String(student.userId) === String(current)) ? current : (list[0]?.userId ?? null));
    } catch (err) {
      console.error(err);
    }
  }, []);

  const fetchDashboard = useCallback(async () => {
    if (!selectedStudentId) { setDashboardData(null); setLoading(false); return; }
    const request = ++dashboardRequest.current;
    setLoading(true);
    try {
      const res = await parentAPI.getStudentDashboard(selectedStudentId);
      if (request === dashboardRequest.current) setDashboardData(res.data.data);
    } catch (err) {
      console.error(err);
    } finally {
      if (request === dashboardRequest.current) setLoading(false);
    }
  }, [selectedStudentId]);

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await parentAPI.getNotifications();
      setNotifications((res.data.data || []).slice(0, 5));
    } catch (err) {
      console.error(err);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchStudents();
      fetchNotifications();
    }, [fetchStudents, fetchNotifications])
  );

  useFocusEffect(useCallback(() => {
    fetchDashboard();
    return () => { dashboardRequest.current += 1; };
  }, [fetchDashboard]));

  const handleMarkRead = async (id) => {
    try {
      await parentAPI.markNotificationRead(id);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, status: 'read' } : n));
    } catch (err) {
      console.error(err);
    }
  };

  const hasCurrentStudent = dashboardData && String(dashboardData.student?.userId) === String(selectedStudentId);
  const outstandingDues = useMemo(() => dashboardData ? (
    dashboardData.fees.filter(f => f.status !== 'paid').reduce((sum, f) => sum + parseFloat(f.amount), 0) +
    dashboardData.messBills.filter(b => b.status !== 'paid').reduce((sum, b) => sum + parseFloat(b.total_amount), 0)
  ).toFixed(0) : '0', [dashboardData]);

  const studentName = hasCurrentStudent ? dashboardData.student?.userName : students.find(student => String(student.userId) === String(selectedStudentId))?.userName;
  const initials = (studentName || '').trim().split(/\s+/).filter(Boolean).slice(0, 2).map(part => part[0]).join('').toUpperCase();

  return <Screen>
    <ReferenceHeader title={section === 'attendance' ? 'Student attendance' : section === 'alerts' ? 'Alerts & notices' : 'Parent portal'} actions={<Button variant="ghost" onPress={logout} accessibilityLabel="Log out"><LogOut size={20} color={colors.mutedText} /></Button>} />
    <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={ui.content}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={() => { fetchDashboard(); fetchNotifications(); }} tintColor={colors.primary} colors={[colors.primary]} />}>
      <Card style={styles.identity}>
        <View style={styles.identityRow}>
          <View style={{ flex: 1, gap: 6 }}>
            <Text style={ui.eyebrow}>YOUR STUDENT</Text>
            <Text accessibilityRole="header" style={styles.studentName}>{studentName || 'Student details'}</Text>
            {hasCurrentStudent && <Text style={ui.description}>{[dashboardData.student?.roll_number, dashboardData.student?.Hostel?.name, dashboardData.room?.room_number && 'Room ' + dashboardData.room.room_number].filter(Boolean).join(' · ')}</Text>}
          </View>
          {!!initials && <View style={styles.avatar}><Text style={styles.initials}>{initials}</Text></View>}
        </View>
        {students.length > 1 && <View style={styles.studentPicker}>
          <Text style={styles.pickerLabel}>Switch student</Text>
          <Picker accessibilityLabel="Choose linked student" selectedValue={selectedStudentId} onValueChange={setSelectedStudentId} style={{ color: colors.text }}>
            {students.map(student => <Picker.Item key={student.userId} label={student.userName + ' · ' + (student.roll_number || 'No roll number')} value={student.userId} />)}
          </Picker>
        </View>}
      </Card>
      {section !== 'alerts' && (loading ? <View style={styles.loading} accessibilityLabel="Loading student details"><ActivityIndicator color={colors.primary} size="large" /></View> : hasCurrentStudent ? <>
        <View style={styles.metrics}>
          <MetricCard title="Attendance" value={(dashboardData.attendanceSummary.total ? Math.round(dashboardData.attendanceSummary.present / dashboardData.attendanceSummary.total * 100) : 0) + '%'}
            detail={dashboardData.attendanceSummary.total + ' recorded days'} icon={CalendarCheck} />
          {section === 'overview' && <MetricCard title="Outstanding dues" value={'₹' + outstandingDues} detail="Fees & mess charges" icon={IndianRupee} tone={Number(outstandingDues) > 0 ? 'warning' : 'success'} />}
        </View>
        <Card style={{ gap: 14 }}>
          <Text style={ui.sectionTitle}>Attendance breakdown</Text>
          <AttendanceBreakdown records={{ P: dashboardData.attendanceSummary.present, A: dashboardData.attendanceSummary.absent, OD: dashboardData.attendanceSummary.od }} />
        </Card>
      </> : <Card style={{ gap: 12 }}><Text style={ui.description}>{students.length ? 'Unable to load student details.' : 'No student mapping found'}</Text>{students.length > 0 && <Button variant="secondary" onPress={fetchDashboard}>Retry</Button>}</Card>)}
      {section === 'alerts' && <><SectionTitle title="Alerts" action="Refresh" onPress={fetchNotifications} />
      {notifications.length ? notifications.map(item => <Card key={item.id} style={[styles.alert, item.status === 'unread' && styles.unread]}>
        <View style={styles.alertHeading}>
          <View style={styles.alertIcon}><Bell size={19} color={colors.primary} /></View>
          <View style={{ flex: 1, gap: 5 }}>
            <Text style={styles.cardTitle}>{item.title}</Text>
            <Text style={ui.small}>{moment(item.createdAt).format('DD MMM YYYY, h:mm A')}</Text>
          </View>
          {item.status === 'unread' && <Text style={styles.unreadLabel}>Unread</Text>}
        </View>
        <Text style={ui.description}>{item.message}</Text>
        {item.status === 'unread' && <Button variant="secondary" onPress={() => handleMarkRead(item.id)}>Acknowledge</Button>}
      </Card>) : <Card style={styles.empty}><Bell size={23} color={colors.mutedText} /><Text style={ui.description}>No alerts yet.</Text></Card>}</>}
      {section !== 'attendance' && hasCurrentStudent && <>
        <SectionTitle title="Hostel notices" />
        {dashboardData.notices?.length ? dashboardData.notices.slice(0, 3).map(item => <Card key={item.id} style={styles.notice}>
          <View style={styles.noticeDate}>
            <Text style={styles.noticeDay}>{moment(item.createdAt).format('DD')}</Text>
            <Text style={styles.noticeMonth}>{moment(item.createdAt).format('MMM').toUpperCase()}</Text>
          </View>
          <View style={{ flex: 1, minWidth: 0, gap: 7 }}><Text style={styles.cardTitle}>{item.title}</Text><Text style={ui.description}>{item.content}</Text><Text style={ui.small}>Posted {moment(item.createdAt).format('DD MMM YYYY')}</Text></View>
        </Card>) : <Card><Text style={ui.description}>No hostel notices.</Text></Card>}
      </>}
    </ScrollView>
  </Screen>;
};
const styles = StyleSheet.create({
  identity: { padding: 20, gap: 18 },
  identityRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  studentName: { fontSize: 24, lineHeight: 32, fontWeight: '800', color: colors.primaryDark },
  avatar: { width: 56, height: 56, borderRadius: 18, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
  initials: { fontSize: 20, fontWeight: '700', color: colors.primary },
  studentPicker: { borderWidth: 1, borderColor: colors.border, backgroundColor: colors.background, borderRadius: 12, overflow: 'hidden' },
  pickerLabel: { fontSize: 12, color: colors.mutedText, paddingHorizontal: 16, paddingTop: 10 },
  metrics: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  loading: { minHeight: 160, alignItems: 'center', justifyContent: 'center' },
  alert: { padding: 16, gap: 14 },
  unread: { borderLeftWidth: 3, borderLeftColor: colors.primary },
  alertHeading: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 10 },
  alertIcon: { width: 38, height: 38, borderRadius: 11, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
  cardTitle: { fontSize: 15, lineHeight: 22, fontWeight: '700', color: colors.text },
  unreadLabel: { fontSize: 12, fontWeight: '600', color: colors.primary, backgroundColor: colors.primarySoft, paddingHorizontal: 9, paddingVertical: 5, borderRadius: 8 },
  empty: { padding: 24, alignItems: 'center', gap: 10 },
  notice: { padding: 16, flexDirection: 'row', alignItems: 'flex-start', gap: 14 },
  noticeDate: { width: 50, paddingVertical: 10, borderRadius: 12, backgroundColor: colors.primarySoft, alignItems: 'center', gap: 2 },
  noticeDay: { fontSize: 22, fontWeight: '800', color: colors.primary },
  noticeMonth: { fontSize: 12, fontWeight: '600', color: colors.primary },
});
export default ParentDashboardScreen;
