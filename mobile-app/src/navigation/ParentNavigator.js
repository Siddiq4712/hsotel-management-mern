import colors from '../theme/colors';
import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import ParentDashboardScreen from '../screens/parent/ParentDashboardScreen';

const Stack = createNativeStackNavigator();

const ParentNavigator = () => {
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
        name="ParentDashboard" 
        component={ParentDashboardScreen} 
        options={{ title: 'Parent Portal' }}
      />
    </Stack.Navigator>
  );
};

export default ParentNavigator;
