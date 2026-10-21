import React, { useEffect } from 'react';
import { View } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Home, CheckSquare, FileText, QrCode, MoreHorizontal, Percent } from 'lucide-react-native';
import MobileTabBar from '../components/common/MobileTabBar';
import colors from '../theme/colors';
import WardenDashboardScreen from '../screens/warden/WardenDashboardScreen';
import AttendanceManagementScreen from '../screens/warden/AttendanceManagementScreen';
import GPSAttendanceScreen from '../screens/warden/GPSAttendanceScreen';
import LeaveRequestsScreen from '../screens/warden/LeaveRequestsScreen';
import MessReductionsScreen from '../screens/MessReductionsScreen';
import GatePassRequestsScreen from '../screens/warden/GatePassRequestsScreen';
import MoreScreen from '../screens/warden/MoreScreen';
import RequestsScreen, { requestAliases } from '../screens/warden/RequestsScreen';
import WardenRequestDetailsScreen from '../screens/warden/WardenRequestDetailsScreen';
import Screen from '../components/common/Screen';
import Header from '../components/common/Header';
import { PageIntro, Segments, EmbeddedHeader } from '../components/common/ReferenceDesign';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();
function AttendanceFrame({ mode, navigation, children }) {
  return <Screen><Header /><View style={{ padding: 16, paddingBottom: 8, gap: 10 }}>
    <PageIntro title="Attendance" />
    <Segments items={[[ 'manual', 'Manual roster' ], [ 'gps', 'GPS session' ]]}
      value={mode} onChange={value => navigation.navigate(value === 'manual' ? 'AttendanceRecords' : 'GPSAttendance')} />
  </View><EmbeddedHeader value={true}>{children}</EmbeddedHeader></Screen>;
}
function ManualAttendance(props) {
  return <AttendanceFrame mode="manual" navigation={props.navigation}><AttendanceManagementScreen {...props} /></AttendanceFrame>;
}
function GPSAttendance(props) {
  return <AttendanceFrame mode="gps" navigation={props.navigation}><GPSAttendanceScreen {...props} /></AttendanceFrame>;
}
function AttendanceNavigator() {
  return <Stack.Navigator initialRouteName="AttendanceRecords" screenOptions={{ headerShown: false }}>
    <Stack.Screen name="AttendanceRecords" component={ManualAttendance} />
    <Stack.Screen name="GPSAttendance" component={GPSAttendance} />
  </Stack.Navigator>;
}
const tabs = [
  ['Dashboard', 'Overview', WardenDashboardScreen, Home],
  ['Attendance', 'Attendance', AttendanceNavigator, CheckSquare],
  ['Requests', 'Requests', RequestsScreen, FileText],
  ['More', 'More', MoreScreen, MoreHorizontal],
];
function WardenTabs() {
  return <Tab.Navigator initialRouteName="Dashboard" tabBar={props => <MobileTabBar {...props} />}
    screenOptions={{ headerShown: false, tabBarActiveTintColor: colors.primary, tabBarInactiveTintColor: colors.mutedText }}>
    {tabs.map(([name, label, component, Icon]) => <Tab.Screen key={name} name={name} component={component}
      options={{ tabBarLabel: label, tabBarIcon: ({ color, size }) => <Icon color={color} size={size} /> }} />)}
  </Tab.Navigator>;
}

function LegacyRequest({ navigation, route }) {
  useEffect(() => { navigation.replace('WardenWorkspace', { screen: 'Requests', params: { kind: requestAliases[route.name], request: Date.now() } }); }, [navigation, route.name]);
  return <View style={{ flex: 1, backgroundColor: colors.background }} />;
}
export default function WardenTabNavigator() {
  return <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="WardenWorkspace" component={WardenTabs} />
    <Stack.Screen name="WardenRequestDetails" component={WardenRequestDetailsScreen} />
    {Object.keys(requestAliases).map(name => <Stack.Screen key={name} name={name} component={LegacyRequest} />)}
  </Stack.Navigator>;
}
