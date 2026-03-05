import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ActivityIndicator,
  KeyboardAvoidingView, Platform, Alert, ScrollView, Modal,
  TouchableWithoutFeedback, Keyboard, StatusBar, Image,
} from 'react-native';
import { useAuth } from '../hooks/useAuth';
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
    const result = await login(credentials);
    if (!result.success) {
      setShowLoading(false);
      setShowError(result.message || 'Sign in failed.');
    }
  };

  // --- GOOGLE OAUTH LOGIN ---
  const handleGoogleLogin = async () => {
    setShowLoading(true);
    setShowError('');

    try {
      // 1. Define your Backend URL
      const authUrl = `http://192.168.66.186:5001/api/auth/google`;

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
      <StatusBar barStyle="dark-content" backgroundColor="#F8FAFC" />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1"
        style={{ backgroundColor: '#F8FAFC' }}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled">
            <View className="flex-1 items-center justify-center py-8 px-5">
              
              {/* LOGO SECTION */}
              <View className="mb-10 mt-8 items-center">
                <View className="flex-row items-center">
                  <View className="bg-white rounded-2xl h-16 w-16 justify-center items-center shadow-md">
                    <Image 
                        source={require('../../assets/nec_logo.jpeg')} 
                        style={{ width: 56, height: 56, borderRadius: 12 }} 
                    />
                  </View>
                  <View className="ml-4">
                    <Text className="font-bold text-gray-900 text-xl">NATIONAL</Text>
                    <Text className="font-bold text-gray-900 text-xl">ENGINEERING COLLEGE</Text>
                  </View>
                </View>
              </View>

              {/* LOGIN CARD */}
              <View className="bg-white rounded-2xl w-full max-w-md py-8 px-6 shadow-sm border border-slate-200">
                <Text className="text-2xl font-bold text-center text-gray-900 mb-6">Sign In</Text>

                {showError ? (
                  <View className="flex-row items-center bg-red-50 border border-red-200 rounded-lg p-3 mb-5">
                    <AlertCircle size={20} color="#EF4444" />
                    <Text className="text-red-700 text-sm ml-3 flex-1">{showError}</Text>
                  </View>
                ) : null}

                <View className="mb-4">
                  <Text className="text-sm font-semibold text-gray-700 mb-2">userName</Text>
                  <View className="flex-row items-center bg-gray-50 border border-gray-200 rounded-lg px-4 h-12">
                    <User size={20} color="#374151" />
                    <TextInput
                      className="flex-1 ml-3 text-base"
                      placeholder="userName or Roll Number"
                      value={credentials.userName}
                      onChangeText={(v) => handleInputChange('userName', v)}
                      autoCapitalize="none"
                    />
                  </View>
                </View>

                <View className="mb-6">
                  <Text className="text-sm font-semibold text-gray-700 mb-2">Password</Text>
                  <View className="flex-row items-center bg-gray-50 border border-gray-200 rounded-lg px-4 h-12">
                    <Lock size={20} color="#374151" />
                    <TextInput
                      className="flex-1 ml-3 text-base"
                      placeholder="••••••••"
                      secureTextEntry
                      value={credentials.password}
                      onChangeText={(v) => handleInputChange('password', v)}
                    />
                  </View>
                </View>

                <TouchableOpacity 
                  onPress={handleLogin} 
                  disabled={showLoading}
                  className={`rounded-lg h-12 justify-center items-center ${showLoading ? 'bg-gray-400' : 'bg-blue-600'}`}
                >
                  <Text className="text-white font-bold text-base">Sign In →</Text>
                </TouchableOpacity>

                <View className="my-6 flex-row items-center">
                  <View className="flex-1 h-px bg-gray-200" />
                  <Text className="mx-4 text-gray-400 font-semibold">OR</Text>
                  <View className="flex-1 h-px bg-gray-200" />
                </View>

                {/* GOOGLE LOGIN BUTTON */}
                <TouchableOpacity
                  className="flex-row justify-center items-center bg-white border border-gray-300 rounded-lg h-12"
                  onPress={handleGoogleLogin}
                  disabled={showLoading}
                >
                  <AntDesign name="google" size={20} color="#DB4437" />
                  <Text className="ml-3 font-semibold text-gray-700">Continue with Google</Text>
                </TouchableOpacity>
              </View>

              <Text className="mt-10 text-xs text-gray-400">© 2026 National Engineering College</Text>
            </View>
          </ScrollView>
        </TouchableWithoutFeedback>

        {/* LOADING OVERLAY */}
        {showLoading && (
          <Modal transparent visible={showLoading}>
            <View className="flex-1 bg-black/30 justify-center items-center">
              <View className="bg-white p-6 rounded-xl items-center">
                <ActivityIndicator size="large" color="#2563EB" />
                <Text className="mt-4 font-semibold">Authenticating...</Text>
              </View>
            </View>
          </Modal>
        )}
      </KeyboardAvoidingView>
    </>
  );
};

export default LoginScreen;