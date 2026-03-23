import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import AuthNavigator from '../auth/AuthNavigator';
import StudentTabNavigator from './StudentTabNavigator';
import WardenTabNavigator from './WardenTabNavigator';
import { useAuth } from '../hooks/useAuth';
import { View, ActivityIndicator, Text } from 'react-native';

const AppNavigator = () => {
  const { user, loading } = useAuth();

  const resolveRole = (value) => {
    if (value === null || value === undefined) return null;
    const raw = String(value).trim().toLowerCase();
    const roleIdMap = {
      '1': 'admin',
      '2': 'student',
      '3': 'warden',
      '4': 'mess',
      '5': 'lapc'
    };
    if (roleIdMap[raw]) return roleIdMap[raw];
    const roleMap = {
      admin: 'admin',
      administrator: 'admin',
      warden: 'warden',
      student: 'student',
      lapc: 'lapc',
      mess: 'mess',
      messstaff: 'mess',
      'mess staff': 'mess'
    };
    return roleMap[raw] || raw;
  };

  const resolvedRole = resolveRole(
    user?.role ??
      user?.roleName ??
      user?.role?.roleName ??
      user?.role_id ??
      user?.roleId
  );

  if (loading) {
    return (
      <View className="flex-1 justify-center items-center bg-gray-100">
        <ActivityIndicator size="large" color="#4F46E5" />
        <Text className="mt-4 text-lg text-gray-700">Loading app...</Text>
      </View>
    );
  }

  return (
    <NavigationContainer>
      {user ? (
        resolvedRole === 'student' ? (
          <StudentTabNavigator />
        ) : resolvedRole === 'warden' ? (
          <WardenTabNavigator />
        ) : (
          <AuthNavigator />
        )
      ) : (
        <AuthNavigator />
      )}
    </NavigationContainer>
  );
};

export default AppNavigator;
