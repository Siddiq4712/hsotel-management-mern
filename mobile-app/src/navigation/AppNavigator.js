import { Text } from "../components/common/ReferenceDesign";
import colors from '../theme/colors';
import React from 'react';
import { DefaultTheme, NavigationContainer } from '@react-navigation/native';
import AuthNavigator from '../auth/AuthNavigator';
import StudentTabNavigator from './StudentTabNavigator';
import WardenTabNavigator from './WardenTabNavigator';
import SecurityNavigator from './SecurityNavigator';
import ParentNavigator from './ParentNavigator';
import WebAccountScreen from '../screens/WebAccountScreen';
import { useAuth } from '../hooks/useAuth';
import { View, ActivityIndicator } from 'react-native';
import { normalizeRole } from '../utils/role';
import { ReferenceProvider, OriginalDesign } from '../components/common/ReferenceDesign';

const navigationTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: colors.primary,
    background: colors.background,
    card: colors.card,
    text: colors.text,
    border: colors.border,
    notification: colors.danger,
  },
};

const AppNavigator = () => {
  const { user, loading } = useAuth();

  const resolvedRole = normalizeRole(
    user?.role ??
      user?.roleName ??
      user?.role?.roleName ??
      null
  );

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background, padding: 24 }}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={{ marginTop: 16, fontSize: 18, color: colors.text, textAlign: 'center' }}>Loading app...</Text>
      </View>
    );
  }

  return (
    <NavigationContainer theme={navigationTheme}>
      {user ? <ReferenceProvider>{(
        resolvedRole === 'student' ? (
          <StudentTabNavigator />
        ) : resolvedRole === 'warden' ? (
          <WardenTabNavigator />
        ) : resolvedRole === 'security' ? (
          <SecurityNavigator />
        ) : resolvedRole === 'parent' ? (
          <ParentNavigator />
        ) : (
          <OriginalDesign><WebAccountScreen /></OriginalDesign>
        )
      )}</ReferenceProvider> : (
        <AuthNavigator />
      )}
    </NavigationContainer>
  );
};

export default AppNavigator;
