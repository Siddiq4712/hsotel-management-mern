import React from 'react';
import { ScrollView, Text, View, StyleSheet } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ChevronRight } from 'lucide-react-native';
import Header from '../../components/common/Header';
import Screen from '../../components/common/Screen';
import Button from '../../components/common/Button';
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
function MoreHome({ navigation }) {
  return <Screen><Header /><ScrollView contentContainerStyle={styles.content}>
    <Text style={styles.title}>More</Text>
    <Text style={styles.subtitle}>Manage your hostel and review student complaints.</Text>
    {moreSections.map(([name, label, description]) => <Button key={name} variant="ghost"
      onPress={() => navigation.navigate(name)} style={styles.row}>
      <View style={{ flex: 1 }}><Text style={styles.label}>{label}</Text><Text style={styles.description}>{description}</Text></View>
      <ChevronRight color={colors.primary} size={20} />
    </Button>)}
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
  title: { fontSize: 26, fontWeight: '700', color: colors.primaryDark },
  subtitle: { fontSize: 14, lineHeight: 21, color: colors.mutedText, marginBottom: 4 },
  row: { backgroundColor: colors.card, padding: 16, borderRadius: 16, borderWidth: 1, borderColor: colors.border, gap: 12 },
  label: { fontSize: 16, fontWeight: '600', color: colors.text },
  description: { fontSize: 13, lineHeight: 19, color: colors.mutedText, marginTop: 4 },
});
