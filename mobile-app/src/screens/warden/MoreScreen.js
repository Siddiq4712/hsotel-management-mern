import { PageIntro, ServiceLink } from '../../components/common/ReferenceDesign';
import { Wallet, MessageSquare, Building2, Users, CalendarDays, DoorOpen, AlertTriangle } from 'lucide-react-native';
import { Text } from "../../components/common/ReferenceDesign";
import React, { useState } from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import Header from '../../components/common/Header';
import Screen from '../../components/common/Screen';
import Input from '../../components/common/Input';
import { moreSections } from '../../components/common/MoreSectionNav';
import colors from '../../theme/colors';
import HolidayManagementScreen from './HolidayManagementScreen';
import SuspensionManagementScreen from './SuspensionManagementScreen';
import CreateRoomScreen from './CreateRoomScreen';
import EnrollStudentScreen from './EnrollStudentScreen';
import RoomRequestsScreen from './RoomRequestsScreen';
import ViewLayoutScreen from './ViewLayoutScreen';
import ManageStudentsScreen from './ManageStudentsScreen';
import RoomAllotmentScreen from './RoomAllotmentScreen';
import MessBillManagementScreen from './MessBillManagementScreen';
import ComplaintManagementScreen from './ComplaintManagementScreen';

const Stack = createNativeStackNavigator();
const sectionIcons = { Bills: Wallet, Complaints: MessageSquare, Students: Users, EnrollStudent: Users, Rooms: DoorOpen, RoomRequests: DoorOpen, Holidays: CalendarDays, Suspensions: AlertTriangle, CreateRoom: Building2, ViewLayout: Building2 };
function MoreHome({ navigation }) {
  const [search, setSearch] = useState('');
  const matching = moreSections.filter(([, label, description]) => `${label} ${description}`.toLowerCase().includes(search.trim().toLowerCase()));
  return <Screen><Header /><ScrollView contentContainerStyle={styles.content}>
    <PageIntro title="All sections" />
    <Input accessibilityLabel="Search management sections" placeholder="Search sections" value={search} onChangeText={setSearch} style={styles.search} />
    {matching.map(([name, label, description]) => <ServiceLink key={name} icon={sectionIcons[name] || Building2}
      title={label} description={description} onPress={() => navigation.navigate(name)} />)}
    {!matching.length && <Text style={styles.description}>No matching sections.</Text>}
  </ScrollView></Screen>;
}
export default function MoreScreen() {
  return <Stack.Navigator initialRouteName="MoreHome" screenOptions={{ headerShown: false }}>
    <Stack.Screen name="MoreHome" component={MoreHome} />
    <Stack.Screen name="Students" component={ManageStudentsScreen} />
    <Stack.Screen name="Rooms" component={RoomAllotmentScreen} />
    <Stack.Screen name="Bills" component={MessBillManagementScreen} />
    <Stack.Screen name="Complaints" component={ComplaintManagementScreen} />
    <Stack.Screen name="Holidays" component={HolidayManagementScreen} />
    <Stack.Screen name="Suspensions" component={SuspensionManagementScreen} />
    <Stack.Screen name="CreateRoom" component={CreateRoomScreen} />
    <Stack.Screen name="EnrollStudent" component={EnrollStudentScreen} />
    <Stack.Screen name="RoomRequests" component={RoomRequestsScreen} />
    <Stack.Screen name="ViewLayout" component={ViewLayoutScreen} />
  </Stack.Navigator>;
}
const styles = StyleSheet.create({
  content: { padding: 16, paddingBottom: 32, gap: 12 },
  search: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: 12, padding: 14, minHeight: 48 },
  description: { fontSize: 13, lineHeight: 19, color: colors.mutedText, marginTop: 4 },
});
