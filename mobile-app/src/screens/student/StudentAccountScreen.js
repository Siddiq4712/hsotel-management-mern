import React, { useCallback, useState } from 'react';
import { View, Text, ScrollView, Image, TouchableOpacity, Alert, Linking, StyleSheet, ActivityIndicator } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { BedDouble, MessageSquare, ReceiptText, Utensils, ChevronRight, Monitor, LogOut, UserRound, ExternalLink } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { studentAPI, API_BASE_URL } from '../../api/api';
import { useAuth } from '../../hooks/useAuth';
import Header from '../../components/student/StudentHeader';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import colors from '../../theme/colors';

export default function StudentAccountScreen({ navigation }) {
  const { user, logout } = useAuth();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [imageError, setImageError] = useState(false);
  const load = useCallback(async () => {
    setLoading(true); setError('');
    try { setProfile((await studentAPI.getProfile()).data.data); }
    catch (e) { setError(e.message || 'Unable to load profile.'); }
    finally { setLoading(false); }
  }, []);
  useFocusEffect(useCallback(() => { load(); }, [load]));
  const person = profile || user;
  const name = person?.userName || person?.username || person?.name || 'Student';
  const room = profile?.tbl_RoomAllotments?.[0]?.HostelRoom;
  const hostel = profile?.Hostel?.name || user?.hostel?.name;
  const openWeb = async () => {
    const url = process.env.EXPO_PUBLIC_WEB_URL || API_BASE_URL.replace(/:\d+\/api\/?$/, ':3000');
    try { await Linking.openURL(url); }
    catch { Alert.alert('Unable to open web dashboard', `Open ${url} in your browser.`); }
  };
  const menu = [
    [BedDouble, 'Room details & requests', 'View layout, occupants and availability', () => navigation.navigate('Rooms')],
    [MessageSquare, 'Complaints', 'Submit an issue and follow its progress', () => navigation.navigate('Complaints')],
    [ReceiptText, 'Transaction history', 'View recorded payments and adjustments', () => navigation.navigate('MessCharges', { screen: 'Transactions' })],
    [Utensils, 'Additional food orders', 'View requests and serving dates', () => navigation.navigate('MessCharges', { screen: 'MyFoodOrders' })],
  ];
  return <View style={styles.page}>
    <Header title="My profile" />
    <ScrollView contentContainerStyle={styles.content}>
      <View style={styles.identity}>
        {person?.profile_picture && !imageError
          ? <Image source={{ uri: person.profile_picture }} onError={() => setImageError(true)} style={styles.avatar} />
          : <View style={[styles.avatar, styles.placeholder]}><UserRound size={34} color={colors.primary} /></View>}
        <Text style={styles.name}>{name}</Text>
        <Text style={styles.subtitle}>{[hostel, room?.room_number && `Room ${room.room_number}`].filter(Boolean).join(' · ') || 'Student account'}</Text>
        <Text style={styles.role}>STUDENT</Text>
      </View>
      {loading && <ActivityIndicator color={colors.primary} />}
      {error ? <Card><Text style={styles.subtitle}>{error}</Text><Button variant="secondary" onPress={load}>Retry</Button></Card> : null}
      <LinearGradient colors={[colors.primary, colors.primaryDark]} style={styles.web}>
        <Monitor size={24} color={colors.card} />
        <Text style={styles.webTitle}>Web dashboard</Text>
        <Text style={styles.webBody}>Access your full hostel workspace through the web application.</Text>
        <Button variant="secondary" onPress={openWeb} style={{ backgroundColor: colors.card, paddingHorizontal: 16, paddingVertical: 12 }}>
          <Text style={{ color: colors.primary, fontSize: 14, fontWeight: '700' }}>Open web access</Text><ExternalLink size={16} color={colors.primary} style={{ marginLeft: 8 }} />
        </Button>
      </LinearGradient>
      <Text style={styles.label}>STUDENT SERVICES</Text>
      <Card style={{ padding: 0, overflow: 'hidden' }}>
        {menu.map(([Icon, label, detail, onPress], index) => <TouchableOpacity key={label} onPress={onPress}
          accessibilityRole="button" style={[styles.menuItem, index > 0 && styles.divider]}>
          <View style={styles.menuIcon}><Icon size={20} color={colors.primary} /></View>
          <View style={{ flex: 1, gap: 4 }}><Text style={styles.menuTitle}>{label}</Text><Text style={styles.small}>{detail}</Text></View>
          <ChevronRight size={18} color={colors.mutedText} />
        </TouchableOpacity>)}
      </Card>
      <Text style={styles.label}>ACCOUNT DETAILS</Text>
      <Card style={{ gap: 14 }}>
        {[
          ['Roll number', person?.roll_number],
          ['Email', person?.email || person?.userMail],
          ['Hostel', hostel],
          ['Room', room?.room_number],
        ].map(([label, value]) => <View key={label} style={{ gap: 4 }}>
          <Text style={styles.small}>{label}</Text><Text style={styles.menuTitle}>{value || 'Not available'}</Text>
        </View>)}
      </Card>
      <Button variant="ghost" onPress={() => Alert.alert('Sign out', 'Sign out of your student account?', [
        { text: 'Cancel', style: 'cancel' }, { text: 'Sign out', style: 'destructive', onPress: logout },
      ])} style={{ borderWidth: 1, borderColor: colors.dangerTint, backgroundColor: colors.card, padding: 14 }}>
        <LogOut size={18} color={colors.danger} /><Text style={{ color: colors.danger, fontWeight: '600', marginLeft: 8 }}>Sign out</Text>
      </Button>
      <Text style={styles.footer}>Hostel Management</Text>
    </ScrollView>
  </View>;
}
const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.background }, content: { padding: 16, paddingBottom: 32, gap: 16 },
  identity: { alignItems: 'center', backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: 24, padding: 24, gap: 8 },
  avatar: { width: 76, height: 76, borderRadius: 38, borderWidth: 3, borderColor: colors.primarySoft },
  placeholder: { backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
  name: { fontSize: 21, fontWeight: '700', color: colors.text, textAlign: 'center' },
  subtitle: { fontSize: 14, color: colors.mutedText, textAlign: 'center' },
  role: { fontSize: 10, fontWeight: '700', letterSpacing: 1, color: colors.primary, backgroundColor: colors.primarySoft, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 },
  web: { padding: 20, borderRadius: 20, gap: 10 }, webTitle: { fontSize: 18, fontWeight: '700', color: colors.card },
  webBody: { fontSize: 13, lineHeight: 20, color: colors.card }, label: { fontSize: 11, fontWeight: '600', letterSpacing: 1, color: colors.mutedText, marginTop: 4 },
  menuItem: { minHeight: 80, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 12 },
  divider: { borderTopWidth: 1, borderTopColor: colors.surface }, menuIcon: { padding: 10, backgroundColor: colors.primarySoft, borderRadius: 12 },
  menuTitle: { color: colors.text, fontSize: 14, fontWeight: '600' }, small: { fontSize: 12, color: colors.mutedText, lineHeight: 18 },
  footer: { fontSize: 11, textAlign: 'center', color: colors.mutedText, paddingVertical: 8 },
});
