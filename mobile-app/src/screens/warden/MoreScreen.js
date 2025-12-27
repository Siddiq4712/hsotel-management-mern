import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack'; // ✅ Fixed: Use native-stack instead of deprecated stack
import HolidayManagementScreen from './HolidayManagementScreen';
import SuspensionManagementScreen from './SuspensionManagementScreen';
import CreateRoomScreen from './CreateRoomScreen';
import EnrollStudentScreen from './EnrollStudentScreen';
import RoomRequestsScreen from './RoomRequestsScreen';
import ViewLayoutScreen from './ViewLayoutScreen';
// ✅ Removed GenerateMessBillsScreen import as it's not implemented yet; bills handled in MessBillManagementScreen

const Stack = createNativeStackNavigator();

const MoreScreen = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="Holidays" component={HolidayManagementScreen} />
    <Stack.Screen name="Suspensions" component={SuspensionManagementScreen} />
    <Stack.Screen name="CreateRoom" component={CreateRoomScreen} />
    <Stack.Screen name="EnrollStudent" component={EnrollStudentScreen} />
    <Stack.Screen name="RoomRequests" component={RoomRequestsScreen} />
    <Stack.Screen name="ViewLayout" component={ViewLayoutScreen} />
    {/* ✅ Removed GenerateBills screen to avoid import error; add back when implemented */}
  </Stack.Navigator>
);

export default MoreScreen;