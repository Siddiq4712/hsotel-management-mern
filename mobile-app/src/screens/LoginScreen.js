import Button from '../components/common/Button';
import Input from '../components/common/Input';
import Card from '../components/common/Card';
import LoadingOverlay from '../components/common/LoadingOverlay';
import colors from '../theme/colors';
import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, ActivityIndicator,
  KeyboardAvoidingView, Platform, Alert, ScrollView,
  TouchableWithoutFeedback, Keyboard, StatusBar, Image } from 'react-native';
import { useAuth } from '../hooks/useAuth';
import { API_BASE_URL } from '../api/api';
import { User, Lock, Info, AlertCircle } from 'lucide-react-native';
import { AntDesign } from '@expo/vector-icons';

// GOOGLE AUTH IMPORTS
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';

// This is required to close the browser popup after redirect
WebBrowser.maybeCompleteAuthSession();

const LoginScreen = () => {
  const [credentials, setCredentials] = useState({ userName: '', password: '' });
  const [showError, setShowError] = useState('');
  const [showLoading, setShowLoading] = useState(false);
  
  const { login, completeExternalLogin } = useAuth();

  // --- STANDARD LOGIN ---
  const handleLogin = async () => {
    Keyboard.dismiss();
    setShowError('');

    if (!credentials.userName.trim() || !credentials.password.trim()) {
      setShowError('Please enter both userName and password');
      return;
    }

    setShowLoading(true);
    try {
      console.log('Attempting login...');
      const result = await login(credentials);
      console.log('Login result:', result);
      if (!result.success) {
        setShowLoading(false);
        setShowError(result.message || 'Sign in failed.');
      }
    } catch (error) {
      console.error('Login exception:', error);
      setShowError(error.message || 'Network error or server unreachable.');
      setShowLoading(false);
    }
  };

  // --- GOOGLE OAUTH LOGIN ---
  const handleGoogleLogin = async () => {
    setShowLoading(true);
    setShowError('');

    try {
      // 1. Define your Backend URL
      const authUrl = `${API_BASE_URL}/auth/google`;

      // 2. Open Web Browser and wait for the redirect back to 'hostelapp://'
      const result = await WebBrowser.openAuthSessionAsync(authUrl, 'hostelapp://');

      // 3. Handle the result from the redirect URL
      if (result.type === 'success' && result.url) {
        const parsed = Linking.parse(result.url);
        const { token, user: userJson } = parsed.queryParams;

        if (token && userJson) {
          const userData = JSON.parse(decodeURIComponent(userJson));
          await completeExternalLogin(token, userData);
        } else {
          setShowError('Failed to retrieve user data from Google.');
        }
      }
    } catch (error) {
      console.error('Google Auth Error:', error);
      setShowError('An error occurred during Google Sign-in.');
    } finally {
      setShowLoading(false);
    }
  };

  const handleInputChange = (field, value) => {
    setCredentials({ ...credentials, [field]: value });
    setShowError('');
  };

  return (
    <>
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
        style={{ backgroundColor: colors.background }}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled">
            <View className="flex-1 items-center justify-center py-8 px-5">
              
              {/* LOGO SECTION */}
              <View className="mb-8 mt-4 items-center w-full max-w-md">
                <View className="items-center w-full">
                  <View className="bg-white rounded-2xl h-16 w-16 justify-center items-center shadow-sm">
                    <Image 
                        source={require('../../assets/nec-logo.png')} 
                        style={{ width: 56, height: 56, borderRadius: 12 }} 
                    />
                  </View>
                  <Text className="mt-3 font-bold text-indigo-900 text-lg text-center"
                    style={{ maxWidth: 280, lineHeight: 26 }}>National Engineering College</Text>
                </View>
              </View>

              {/* LOGIN CARD */}
              <Card className="bg-white rounded-2xl w-full max-w-md py-8 px-6 shadow-sm border border-slate-200">

                {showError ? (
                  <View className="flex-row items-center bg-red-50 border border-red-200 rounded-xl p-3 mb-5">
                    <AlertCircle size={20} color={colors.danger} />
                    <Text className="text-red-700 text-sm ml-3 flex-1">{showError}</Text>
                  </View>
                ) : null}

                <View className="mb-4">
                  <Text className="text-sm font-semibold text-gray-700 mb-2">Username or roll number</Text>
                  <View className="flex-row items-center bg-gray-50 border border-gray-200 rounded-xl px-4 min-h-[56px]">
                    <User size={20} color={colors.text} />
                    <Input
                      className="flex-1 ml-3 text-base"
                      accessibilityLabel="Username or roll number"
                      placeholder="Enter username or roll number"
                      value={credentials.userName}
                      onChangeText={(v) => handleInputChange('userName', v)}
                      autoCapitalize="none"
                    />
                  </View>
                </View>

                <View className="mb-6">
                  <Text className="text-sm font-semibold text-gray-700 mb-2">Password</Text>
                  <View className="flex-row items-center bg-gray-50 border border-gray-200 rounded-xl px-4 h-12">
                    <Lock size={20} color={colors.text} />
                    <Input
                      className="flex-1 ml-3 text-base"
                      accessibilityLabel="Password"
                      placeholder="Enter your password"
                      secureTextEntry
                      value={credentials.password}
                      onChangeText={(v) => handleInputChange('password', v)}
                    />
                  </View>
                </View>

                <Button
                  onPress={handleLogin} 
                  disabled={showLoading}
                  className="bg-indigo-600 px-4 py-4"
                >
                  <Text className="text-white font-bold text-base">Sign In →</Text>
                </Button>

                <View className="my-6 flex-row items-center">
                  <View className="flex-1 h-px bg-gray-200" />
                  <Text className="mx-4 text-gray-400 font-semibold">OR</Text>
                  <View className="flex-1 h-px bg-gray-200" />
                </View>

                {/* GOOGLE LOGIN BUTTON */}
                <Button
                  className="flex-row justify-center items-center bg-white border border-gray-300 rounded-xl h-12"
                  onPress={handleGoogleLogin}
                  disabled={showLoading}
                >
                  <AntDesign name="google" size={20} color="#DB4437" />
                  <Text className="ml-3 font-semibold text-gray-700">Continue with Google</Text>
                </Button>
              </Card>

              <Text className="mt-10 text-xs text-gray-400" style={{ alignSelf: 'stretch', textAlign: 'center' }}>© 2026 National Engineering College</Text>
            </View>
          </ScrollView>
        </TouchableWithoutFeedback>

      </KeyboardAvoidingView>
      <LoadingOverlay visible={showLoading} message="Authenticating..." />
    </>
  );
};

export default LoginScreen;
