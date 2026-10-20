import colors from '../theme/colors';
import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import SecurityDashboardScreen from '../screens/security/SecurityDashboardScreen';
import QRScannerScreen from '../screens/security/QRScannerScreen';
import VerificationResultScreen from '../screens/security/VerificationResultScreen';

const Stack = createNativeStackNavigator();

const SecurityNavigator = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: colors.card,
        },
        headerTintColor: colors.text,
        headerShadowVisible: false,
        headerTitleStyle: {
          fontWeight: 'bold',
        },
      }}
    >
      <Stack.Screen 
        name="SecurityDashboard" 
        component={SecurityDashboardScreen} 
        options={{ title: 'Security Console' }}
      />
      <Stack.Screen 
        name="QRScanner" 
        component={QRScannerScreen} 
        options={{ title: 'Scan Gate Pass' }}
      />
      <Stack.Screen 
        name="VerificationResult" 
        component={VerificationResultScreen} 
        options={{ title: 'Verification Details' }}
      />
    </Stack.Navigator>
  );
};

export default SecurityNavigator;
