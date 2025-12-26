import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import AuthNavigator from '../auth/AuthNavigator';
import StudentTabNavigator from './StudentTabNavigator';
import WardenTabNavigator from './WardenTabNavigator';
import { useAuth } from '../hooks/useAuth';
import { View, ActivityIndicator, Text } from 'react-native';

const AppNavigator = () => {
  const { user, loading } = useAuth();

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
        user.role === 'student' ? (
          <StudentTabNavigator />
        ) : user.role === 'warden' ? (
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
