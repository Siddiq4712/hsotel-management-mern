import React from 'react';
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

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();
function AttendanceNavigator() {
  return <Stack.Navigator initialRouteName="AttendanceRecords" screenOptions={{ headerShown: false }}>
    <Stack.Screen name="AttendanceRecords" component={AttendanceManagementScreen} />
    <Stack.Screen name="GPSAttendance" component={GPSAttendanceScreen} />
  </Stack.Navigator>;
}
const tabs = [
  ['Dashboard', 'Dashboard', WardenDashboardScreen, Home],
  ['Attendance', 'Attendance', AttendanceNavigator, CheckSquare],
  ['Leaves', 'Leaves', LeaveRequestsScreen, FileText],
  ['MessReductions', 'Reductions', MessReductionsScreen, Percent],
  ['GatePasses', 'Gate Pass Approval', GatePassRequestsScreen, QrCode],
  ['More', 'More', MoreScreen, MoreHorizontal],
];
export default function WardenTabNavigator() {
  return <Tab.Navigator initialRouteName="Dashboard" tabBar={props => <MobileTabBar {...props} />}
    screenOptions={{ headerShown: false, tabBarActiveTintColor: colors.primary, tabBarInactiveTintColor: colors.mutedText }}>
    {tabs.map(([name, label, component, Icon]) => <Tab.Screen key={name} name={name} component={component}
      options={{ tabBarLabel: label, tabBarIcon: ({ color, size }) => <Icon color={color} size={size} /> }} />)}
  </Tab.Navigator>;
}
