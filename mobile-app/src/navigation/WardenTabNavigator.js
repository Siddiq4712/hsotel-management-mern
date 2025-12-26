import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { LayoutDashboard, ClipboardCheck, FileText, MessageSquare, Bed } from 'lucide-react-native';
import WardenDashboardScreen from '../screens/warden/WardenDashboardScreen';
import AttendanceManagementScreen from '../screens/warden/AttendanceManagementScreen';
import LeaveRequestsScreen from '../screens/warden/LeaveRequestsScreen';
import ComplaintManagementScreen from '../screens/warden/ComplaintManagementScreen';
import RoomAllotmentScreen from '../screens/warden/RoomAllotmentScreen';

const Tab = createBottomTabNavigator();

const WardenTabNavigator = () => {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#4F46E5',
        tabBarInactiveTintColor: '#6B7280',
        tabBarStyle: { height: 65, paddingBottom: 10, paddingTop: 10 },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
      }}
    >
      <Tab.Screen 
        name="Dashboard" 
        component={WardenDashboardScreen} 
        options={{ tabBarIcon: ({ color }) => <LayoutDashboard color={color} size={24} /> }} 
      />
      <Tab.Screen 
        name="Attendance" 
        component={AttendanceManagementScreen} 
        options={{ tabBarIcon: ({ color }) => <ClipboardCheck color={color} size={24} /> }} 
      />
      <Tab.Screen 
        name="Leaves" 
        component={LeaveRequestsScreen} 
        options={{ tabBarIcon: ({ color }) => <FileText color={color} size={24} /> }} 
      />
      <Tab.Screen 
        name="Rooms" 
        component={RoomAllotmentScreen} 
        options={{ tabBarIcon: ({ color }) => <Bed color={color} size={24} /> }} 
      />
      <Tab.Screen 
        name="Complaints" 
        component={ComplaintManagementScreen} 
        options={{ tabBarIcon: ({ color }) => <MessageSquare color={color} size={24} /> }} 
      />
    </Tab.Navigator>
  );
};

export default WardenTabNavigator;