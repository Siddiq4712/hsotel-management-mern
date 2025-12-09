import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import AuthNavigator from '../auth/AuthNavigator';
import StudentTabNavigator from './StudentTabNavigator';
import { useAuth } from '../hooks/useAuth';
import { Text, View, ActivityIndicator } from 'react-native';

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

  // TODO: Implement other role navigators (Warden, Mess, Admin)
  if (user && user.role === 'student') {
    return (
      <NavigationContainer>
        <StudentTabNavigator />
      </NavigationContainer>
    );
  }
  // This will handle the case where user is null or role is not 'student' (for now)
  return (
    <NavigationContainer>
      <AuthNavigator />
    </NavigationContainer>
  );
};

export default AppNavigator;
