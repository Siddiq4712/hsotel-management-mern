import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Home, CalendarCheck, Utensils, UserRound } from 'lucide-react-native';
import colors from '../theme/colors';
import MobileTabBar from '../components/common/MobileTabBar';
import { OriginalDesign } from '../components/common/ReferenceDesign';
import StudentDashboardScreen from '../screens/student/StudentDashboardScreen';
import StudentWorkflowScreen from '../screens/student/StudentWorkflowScreen';
import StudentAccountScreen from '../screens/student/StudentAccountScreen';
import PasswordScreen from '../screens/PasswordScreen';
import MyMessChargesScreen from '../screens/student/MyMessChargesScreen';
import StudentFoodOrderScreen from '../screens/student/StudentFoodOrderScreen';
import MyFoodOrdersScreen from '../screens/student/MyFoodOrdersScreen';
import TransactionHistoryScreen from '../screens/student/TransactionHistoryScreen';
import MyComplaintsScreen from '../screens/student/MyComplaintsScreen';
import ViewRoomsScreen from '../screens/student/ViewRoomsScreen';
import MyLeavesScreen from '../screens/student/MyLeavesScreen';
import ApplyLeaveScreen from '../screens/student/ApplyLeaveScreen';
import OutpassRequestScreen from '../screens/student/OutpassRequestScreen';
import OutpassStatusScreen from '../screens/student/OutpassStatusScreen';
import MessReductionsScreen from '../screens/MessReductionsScreen';
import StudentRequestDetailsScreen from '../screens/student/StudentRequestDetailsScreen';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();
const MessStack = createNativeStackNavigator();
const ProfileStack = createNativeStackNavigator();
const stackOptions = { headerShown: false, contentStyle: { backgroundColor: colors.background } };

function MessNavigator() {
  return <MessStack.Navigator screenOptions={stackOptions}>
    <MessStack.Screen name="MessOverview" component={MyMessChargesScreen} />
    <MessStack.Screen name="FoodOrder" component={StudentFoodOrderScreen} />
    <MessStack.Screen name="MyFoodOrders" component={MyFoodOrdersScreen} />
    <MessStack.Screen name="Transactions" component={TransactionHistoryScreen} />
  </MessStack.Navigator>;
}
function ProfileNavigator() {
  return <ProfileStack.Navigator screenOptions={stackOptions}>
    <ProfileStack.Screen name="StudentAccount" component={StudentAccountScreen} />
    <ProfileStack.Screen name="ChangePassword" component={PasswordScreen} />
    <ProfileStack.Screen name="Rooms" component={ViewRoomsScreen} />
    <ProfileStack.Screen name="Complaints" component={MyComplaintsScreen} />
  </ProfileStack.Navigator>;
}
function PreservedStudentHome(props) {
  return <OriginalDesign><StudentDashboardScreen {...props} /></OriginalDesign>;
}
function StudentTabs() {
  return <Tab.Navigator initialRouteName="Dashboard" tabBar={props => <MobileTabBar {...props} />}
    screenOptions={{ headerShown: false, tabBarHideOnKeyboard: true, freezeOnBlur: true }}>
    <Tab.Screen name="Dashboard" component={PreservedStudentHome} options={{ tabBarLabel: 'Home', tabBarIcon: ({ color, size }) => <Home color={color} size={size} /> }} />
    <Tab.Screen name="Attendance" component={StudentWorkflowScreen} options={{ tabBarLabel: 'Services', tabBarIcon: ({ color, size }) => <CalendarCheck color={color} size={size} /> }} />
    <Tab.Screen name="MessCharges" component={MessNavigator} options={{ tabBarLabel: 'Mess', tabBarIcon: ({ color, size }) => <Utensils color={color} size={size} /> }} />
    <Tab.Screen name="Profile" component={ProfileNavigator} options={{ tabBarLabel: 'Profile', tabBarIcon: ({ color, size }) => <UserRound color={color} size={size} /> }} />
  </Tab.Navigator>;
}
// Keep previous route names available for existing links and navigation calls.
export default function StudentStackNavigator() {
  return <Stack.Navigator screenOptions={stackOptions}>
    <Stack.Screen name="StudentTabs" component={StudentTabs} />
    <Stack.Screen name="MyFoodOrders" component={MyFoodOrdersScreen} />
    <Stack.Screen name="ApplyLeave" component={ApplyLeaveScreen} options={{ presentation: 'fullScreenModal' }} />
    <Stack.Screen name="OutpassStatus" component={OutpassStatusScreen} />
    <Stack.Screen name="OutpassRequest" component={OutpassRequestScreen} options={{ presentation: 'fullScreenModal' }} />
    <Stack.Screen name="Leaves" component={MyLeavesScreen} />
    <Stack.Screen name="MessReductionRequest" options={{ presentation: 'fullScreenModal' }}>{props => <MessReductionsScreen {...props} studentLayout view="form" />}</Stack.Screen>
    <Stack.Screen name="StudentRequestDetails" component={StudentRequestDetailsScreen} options={{ presentation: 'fullScreenModal' }} />
    <Stack.Screen name="ReductionRequestDetails" options={{ presentation: 'fullScreenModal' }}>{props => <MessReductionsScreen {...props} studentLayout view="details" requestId={props.route.params?.id} />}</Stack.Screen>
    <Stack.Screen name="MessReductions">{props => <MessReductionsScreen {...props} studentLayout />}</Stack.Screen>
    <Stack.Screen name="Complaints" component={MyComplaintsScreen} />
    <Stack.Screen name="FoodOrder" component={StudentFoodOrderScreen} />
    <Stack.Screen name="Rooms" component={ViewRoomsScreen} />
    <Stack.Screen name="Transactions" component={TransactionHistoryScreen} />
  </Stack.Navigator>;
}
