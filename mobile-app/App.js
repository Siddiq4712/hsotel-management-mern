import 'react-native-gesture-handler';
import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider } from './src/auth/AuthContext';
import AppNavigator from './src/navigation/AppNavigator';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { TextSizeProvider } from './src/theme/TextSizeContext';

export default function App() {
  return (
    <SafeAreaProvider>
      <TextSizeProvider>
        <AuthProvider>
          <StatusBar style="dark" />
          <AppNavigator />
        </AuthProvider>
      </TextSizeProvider>
    </SafeAreaProvider>
  );
}
