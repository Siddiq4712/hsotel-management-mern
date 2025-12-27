import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import {
  Home,
  Users,
  CheckSquare,
  FileText,
  MessageCircle,
  Bed,
  DollarSign,
  MoreHorizontal,
} from 'lucide-react-native';
// ✅ Corrected import path: from src/navigation/ to src/components/common/Header is '../components/common/Header'
import Header from '../components/common/Header';
import WardenDashboardScreen from '../screens/warden/WardenDashboardScreen';
import ManageStudentsScreen from '../screens/warden/ManageStudentsScreen';
import AttendanceManagementScreen from '../screens/warden/AttendanceManagementScreen';
import LeaveRequestsScreen from '../screens/warden/LeaveRequestsScreen';
import ComplaintManagementScreen from '../screens/warden/ComplaintManagementScreen';
import RoomAllotmentScreen from '../screens/warden/RoomAllotmentScreen';
import MessBillManagementScreen from '../screens/warden/MessBillManagementScreen';
import MoreScreen from '../screens/warden/MoreScreen';

const Tab = createBottomTabNavigator();

const WardenTabNavigator = () => {
  return (
    <Tab.Navigator
      screenOptions={{
        // ❌ Removed global header to avoid conflict with per-screen <Header />
        headerShown: false,
        tabBarActiveTintColor: '#4F46E5',
        tabBarInactiveTintColor: '#6B7280',
        tabBarStyle: {
          backgroundColor: '#FFFFFF',
          borderTopWidth: 1,
          borderTopColor: '#E5E7EB',
          paddingBottom: 5,
          height: 60,
        },
        tabBarLabelStyle: { fontSize: 12, fontWeight: '600' },
        tabBarIconStyle: { marginBottom: -3 },
      }}
    >
      <Tab.Screen
        name="Dashboard"
        component={WardenDashboardScreen}
        options={{
          tabBarLabel: 'Dashboard',
          tabBarIcon: ({ color, size }) => (
            <Home color={color} size={size} />
          ),
        }}
      />
      <Tab.Screen
        name="Students"
        component={ManageStudentsScreen}
        options={{
          tabBarLabel: 'Students',
          tabBarIcon: ({ color, size }) => (
            <Users color={color} size={size} />
          ),
        }}
      />
      <Tab.Screen
        name="Attendance"
        component={AttendanceManagementScreen}
        options={{
          tabBarLabel: 'Attendance',
          tabBarIcon: ({ color, size }) => (
            <CheckSquare color={color} size={size} />
          ),
        }}
      />
      <Tab.Screen
        name="Leaves"
        component={LeaveRequestsScreen}
        options={{
          tabBarLabel: 'Leaves',
          tabBarIcon: ({ color, size }) => (
            <FileText color={color} size={size} />
          ),
        }}
      />
      <Tab.Screen
        name="Complaints"
        component={ComplaintManagementScreen}
        options={{
          tabBarLabel: 'Complaints',
          tabBarIcon: ({ color, size }) => (
            <MessageCircle color={color} size={size} />
          ),
        }}
      />
      <Tab.Screen
        name="Rooms"
        component={RoomAllotmentScreen}
        options={{
          tabBarLabel: 'Rooms',
          tabBarIcon: ({ color, size }) => (
            <Bed color={color} size={size} />
          ),
        }}
      />
      <Tab.Screen
        name="Bills"
        component={MessBillManagementScreen}
        options={{
          tabBarLabel: 'Bills',
          tabBarIcon: ({ color, size }) => (
            <DollarSign color={color} size={size} />
          ),
        }}
      />
      <Tab.Screen
        name="More"
        component={MoreScreen}
        options={{
          tabBarLabel: 'More',
          tabBarIcon: ({ color, size }) => (
            <MoreHorizontal color={color} size={size} />
          ),
        }}
      />
    </Tab.Navigator>
  );
};

export default WardenTabNavigator;