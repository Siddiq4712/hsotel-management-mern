import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Home, FileText, MessageCircle, Utensils, CreditCard, DollarSign, Bed } from 'lucide-react-native'; // Removed Wifi, ShoppingBag, Building for simpler tabs
import StudentDashboardScreen from '../screens/student/StudentDashboardScreen';
import MyLeavesScreen from '../screens/student/MyLeavesScreen';
import MyComplaintsScreen from '../screens/student/MyComplaintsScreen';
import StudentFoodOrderScreen from '../screens/student/StudentFoodOrderScreen';
import TransactionHistoryScreen from '../screens/student/TransactionHistoryScreen';
import MyMessChargesScreen from '../screens/student/MyMessChargesScreen';
import ViewRoomsScreen from '../screens/student/ViewRoomsScreen'; // New tab for rooms

const Tab = createBottomTabNavigator();

const StudentTabNavigator = () => {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#4F46E5', // Indigo-600
        tabBarInactiveTintColor: '#6B7280', // Gray-500
        tabBarStyle: {
          backgroundColor: '#FFFFFF',
          borderTopWidth: 1,
          borderTopColor: '#E5E7EB', // Gray-200
          paddingBottom: 5,
          paddingTop: 5,
          height: 60,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '600',
        },
        tabBarIconStyle: {
          marginBottom: -3,
        },
      }}
    >
      <Tab.Screen
        name="Dashboard"
        component={StudentDashboardScreen}
        options={{
          tabBarLabel: 'Dashboard',
          tabBarIcon: ({ color, size }) => <Home color={color} size={size} />,
        }}
      />
      <Tab.Screen
        name="Leaves"
        component={MyLeavesScreen}
        options={{
          tabBarLabel: 'Leaves',
          tabBarIcon: ({ color, size }) => <FileText color={color} size={size} />,
        }}
      />
      <Tab.Screen
        name="Complaints"
        component={MyComplaintsScreen}
        options={{
          tabBarLabel: 'Complaints',
          tabBarIcon: ({ color, size }) => <MessageCircle color={color} size={size} />,
        }}
      />
      <Tab.Screen
        name="FoodOrder"
        component={StudentFoodOrderScreen}
        options={{
          tabBarLabel: 'Order Food',
          tabBarIcon: ({ color, size }) => <Utensils color={color} size={size} />,
        }}
      />
      <Tab.Screen
        name="MessCharges"
        component={MyMessChargesScreen}
        options={{
          tabBarLabel: 'Mess',
          tabBarIcon: ({ color, size }) => <DollarSign color={color} size={size} />,
        }}
      />
       <Tab.Screen
        name="Rooms"
        component={ViewRoomsScreen}
        options={{
          tabBarLabel: 'Rooms',
          tabBarIcon: ({ color, size }) => <Bed color={color} size={size} />,
        }}
      />
      <Tab.Screen
        name="Transactions"
        component={TransactionHistoryScreen}
        options={{
          tabBarLabel: 'Txns',
          tabBarIcon: ({ color, size }) => <CreditCard color={color} size={size} />,
        }}
      />
    </Tab.Navigator>
  );
};

export default StudentTabNavigator;
