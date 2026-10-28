import React, { useMemo, useState } from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Home, CalendarCheck, Bell } from 'lucide-react-native';
import MobileTabBar from '../components/common/MobileTabBar';
import ParentDashboardScreen from '../screens/parent/ParentDashboardScreen';
import { ParentStudentContext } from '../hooks/useParentStudent';

const Tab = createBottomTabNavigator();
export default function ParentNavigator() {
  const [selectedStudentId, setSelectedStudentId] = useState(null);
  const selection = useMemo(() => ({ selectedStudentId, setSelectedStudentId }), [selectedStudentId]);
  return <ParentStudentContext.Provider value={selection}>
    <Tab.Navigator tabBar={props => <MobileTabBar {...props} />} screenOptions={{ headerShown: false, freezeOnBlur: true }}>
      <Tab.Screen name="ParentDashboard" component={ParentDashboardScreen} initialParams={{ section: 'overview' }}
        options={{ tabBarLabel: 'Overview', tabBarIcon: ({ color, size }) => <Home color={color} size={size} /> }} />
      <Tab.Screen name="ParentAttendance" component={ParentDashboardScreen} initialParams={{ section: 'attendance' }}
        options={{ tabBarLabel: 'Attendance', tabBarIcon: ({ color, size }) => <CalendarCheck color={color} size={size} /> }} />
      <Tab.Screen name="ParentAlerts" component={ParentDashboardScreen} initialParams={{ section: 'alerts' }}
        options={{ tabBarLabel: 'Alerts', tabBarIcon: ({ color, size }) => <Bell color={color} size={size} /> }} />
    </Tab.Navigator>
  </ParentStudentContext.Provider>;
}
