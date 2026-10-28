import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Home, ScanLine, History } from 'lucide-react-native';
import MobileTabBar from '../components/common/MobileTabBar';
import colors from '../theme/colors';
import SecurityDashboardScreen from '../screens/security/SecurityDashboardScreen';
import QRScannerScreen from '../screens/security/QRScannerScreen';
import VerificationResultScreen from '../screens/security/VerificationResultScreen';
import { Text } from '../components/common/ReferenceDesign';
import { typography } from '../theme/typography';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();
function ScanNavigator() {
  return <Stack.Navigator screenOptions={{ headerStyle: { backgroundColor: colors.card }, headerTintColor: colors.text, headerShadowVisible: false,
    headerTitle: ({ children }) => <Text numberOfLines={1} style={{ fontSize: typography.header, fontWeight: '700' }}>{children}</Text> }}>
    <Stack.Screen name="QRScanner" component={QRScannerScreen} options={{ title: 'Scan Gate Pass' }} />
    <Stack.Screen name="VerificationResult" component={VerificationResultScreen} options={{ title: 'Verification Details' }} />
  </Stack.Navigator>;
}
export default function SecurityNavigator() {
  return <Tab.Navigator tabBar={props => <MobileTabBar {...props} />} screenOptions={{ headerShown: false, freezeOnBlur: true }}>
    <Tab.Screen name="SecurityDashboard" component={SecurityDashboardScreen} initialParams={{ section: 'overview' }}
      options={{ tabBarLabel: 'Overview', tabBarIcon: ({ color, size }) => <Home color={color} size={size} /> }} />
    <Tab.Screen name="Scan" component={ScanNavigator}
      options={{ tabBarLabel: 'Scan', tabBarIcon: ({ color, size }) => <ScanLine color={color} size={size} /> }} />
    <Tab.Screen name="SecurityActivity" component={SecurityDashboardScreen} initialParams={{ section: 'activity' }}
      options={{ tabBarLabel: 'Activity', tabBarIcon: ({ color, size }) => <History color={color} size={size} /> }} />
  </Tab.Navigator>;
}
