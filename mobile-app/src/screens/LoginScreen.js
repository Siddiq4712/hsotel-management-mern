import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ScrollView,
  Modal,
  TouchableWithoutFeedback,
  Keyboard,
  StatusBar,
} from 'react-native';
import { useAuth } from '../hooks/useAuth';
import { User, Lock, GraduationCap, Info, AlertCircle } from 'lucide-react-native';
import { AntDesign } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

const LoginScreen = () => {
  const [credentials, setCredentials] = useState({ username: '', password: '' });
  const [showError, setShowError] = useState('');
  const [showLoading, setShowLoading] = useState(false);
  const { login } = useAuth();

  const handleLogin = async () => {
    Keyboard.dismiss();
    setShowError('');

    // Validation
    if (!credentials.username.trim() || !credentials.password.trim()) {
      setShowError('Please enter both username and password');
      return;
    }

    setShowLoading(true);

    // Simulate server latency
    setTimeout(async () => {
      const result = await login(credentials);
      if (!result.success) {
        setShowLoading(false);
        setShowError(result.message || 'Sign in failed. Please try again.');
      }
      // If login is successful, AppNavigator will switch screen
    }, 1200);
  };

  const handleGoogleLogin = () => {
    Alert.alert(
      'Google Login',
      'Google login is not available yet. Please use username/password.',
      [{ text: 'OK' }]
    );
  };

  const handleInputChange = (field, value) => {
    setCredentials({ ...credentials, [field]: value });
    setShowError('');
  };

  return (
    <>
      <StatusBar barStyle="dark-content" backgroundColor="#EFF6FF" />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1"
        style={{ backgroundColor: '#EFF6FF' }}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <ScrollView
            contentContainerStyle={{ flexGrow: 1 }}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View className="flex-1 items-center justify-center py-8 px-5">
              {/* Logo Section */}
              <View className="mb-10 mt-8 items-center">
                <View className="flex-row items-center">
                  <LinearGradient
                    colors={['#4F46E5', '#3B82F6']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    className="rounded-2xl h-16 w-16 justify-center items-center"
                    style={{
                      shadowColor: '#4F46E5',
                      shadowOffset: { width: 0, height: 4 },
                      shadowOpacity: 0.3,
                      shadowRadius: 8,
                      elevation: 8,
                    }}
                  >
                    <GraduationCap size={32} color="#fff" />
                  </LinearGradient>
                  <View className="ml-4">
                    <Text className="font-extrabold text-gray-900 text-xl leading-tight tracking-tight">
                      NATIONAL
                    </Text>
                    <Text className="font-extrabold text-gray-900 text-xl leading-tight tracking-tight">
                      ENGINEERING COLLEGE
                    </Text>
                    <Text className="text-indigo-600 text-sm font-semibold mt-1">
                      Hostel Management
                    </Text>
                  </View>
                </View>
              </View>

              {/* Login Card */}
              <View
                className="bg-white rounded-3xl w-full max-w-md py-8 px-6"
                style={{
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 8 },
                  shadowOpacity: 0.1,
                  shadowRadius: 24,
                  elevation: 12,
                  borderWidth: 1,
                  borderColor: '#E0E7FF',
                }}
              >
                <Text className="text-3xl font-bold text-center text-blue-700 mb-2">
                  Sign In
                </Text>
                <Text className="text-center text-gray-500 mb-6 text-base">
                  Student Portal
                </Text>

                {/* Error Message */}
                {showError ? (
                  <View className="flex-row items-start bg-red-50 border border-red-200 rounded-xl px-4 py-3 mb-5">
                    <AlertCircle size={20} color="#EF4444" style={{ marginTop: 2 }} />
                    <Text className="text-red-700 text-sm flex-1 ml-3">{showError}</Text>
                  </View>
                ) : null}

                {/* Input Fields */}
                <View>
                  {/* Username */}
                  <View className="mb-4">
                    <Text className="text-sm font-semibold text-gray-700 mb-2">
                      Username
                    </Text>
                    <View
                      className="flex-row items-center bg-gray-50 border border-gray-200 rounded-xl px-4"
                      style={{ height: 52 }}
                    >
                      <User size={20} color="#6366F1" />
                      <TextInput
                        className="flex-1 text-base ml-3"
                        placeholder="Enter username"
                        placeholderTextColor="#9CA3AF"
                        value={credentials.username}
                        onChangeText={(val) => handleInputChange('username', val)}
                        autoCapitalize="none"
                        autoCorrect={false}
                        editable={!showLoading}
                      />
                    </View>
                  </View>

                  {/* Password */}
                  <View className="mb-6">
                    <Text className="text-sm font-semibold text-gray-700 mb-2">
                      Password
                    </Text>
                    <View
                      className="flex-row items-center bg-gray-50 border border-gray-200 rounded-xl px-4"
                      style={{ height: 52 }}
                    >
                      <Lock size={20} color="#6366F1" />
                      <TextInput
                        className="flex-1 text-base ml-3"
                        placeholder="Enter password"
                        placeholderTextColor="#9CA3AF"
                        value={credentials.password}
                        onChangeText={(val) => handleInputChange('password', val)}
                        secureTextEntry
                        editable={!showLoading}
                        onSubmitEditing={handleLogin}
                        returnKeyType="go"
                      />
                    </View>
                  </View>

                  {/* Sign In Button */}
                  <TouchableOpacity
                    disabled={showLoading}
                    onPress={handleLogin}
                    activeOpacity={0.8}
                  >
                    <LinearGradient
                      colors={
                        showLoading
                          ? ['#9CA3AF', '#6B7280']
                          : ['#4F46E5', '#3B82F6', '#8B5CF6']
                      }
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      className="rounded-xl flex-row items-center justify-center"
                      style={{
                        height: 52,
                        shadowColor: showLoading ? '#6B7280' : '#4F46E5',
                        shadowOffset: { width: 0, height: 4 },
                        shadowOpacity: 0.3,
                        shadowRadius: 8,
                        elevation: 6,
                      }}
                    >
                      {showLoading ? (
                        <>
                          <ActivityIndicator color="#fff" size="small" />
                          <Text className="ml-2 text-white font-bold text-base">
                            Signing In...
                          </Text>
                        </>
                      ) : (
                        <>
                          <Text className="text-white font-bold text-base">Sign In</Text>
                          <Text className="ml-2 text-white text-lg">→</Text>
                        </>
                      )}
                    </LinearGradient>
                  </TouchableOpacity>
                </View>

                {/* Divider */}
                <View className="relative my-6 flex-row items-center">
                  <View className="flex-1 h-px bg-gray-200" />
                  <Text className="mx-4 text-gray-400 font-semibold text-sm">OR</Text>
                  <View className="flex-1 h-px bg-gray-200" />
                </View>

                {/* Google Login Button */}
                <TouchableOpacity
                  className="flex-row justify-center items-center bg-white border border-gray-300 rounded-xl"
                  style={{
                    height: 52,
                    opacity: showLoading ? 0.6 : 1,
                  }}
                  onPress={handleGoogleLogin}
                  disabled={showLoading}
                  activeOpacity={0.7}
                >
                  <AntDesign name="google" size={22} color="#DB4437" />
                  <Text className="text-base font-semibold text-gray-700 ml-3">
                    Continue with Google
                  </Text>
                </TouchableOpacity>

                {/* Information Message */}
                <View className="mt-5 py-3 px-4 bg-blue-50 border border-blue-200 flex-row rounded-xl items-start">
                  <Info size={18} color="#3B82F6" style={{ marginTop: 2 }} />
                  <Text className="text-sm text-blue-800 flex-1 ml-3 leading-5">
                    Only authorized college users can access the system. Contact the
                    administrator for access.
                  </Text>
                </View>

                {/* Test Credentials */}
                <View className="mt-6 border-t border-gray-200 pt-5">
                  <View className="bg-gray-50 px-4 py-3 rounded-xl border border-gray-200 flex-row justify-between items-center">
                    <Text className="font-semibold text-xs text-gray-500">
                      Test Credentials
                    </Text>
                    <View className="bg-white px-3 py-2 rounded-lg border border-gray-300">
                      <Text className="font-mono text-gray-800 font-semibold text-xs">
                        admin / admin123
                      </Text>
                    </View>
                  </View>
                </View>
              </View>

              {/* Footer */}
              <View className="mt-10 items-center">
                <Text className="text-xs text-gray-400">
                  © 2025 National Engineering College. All rights reserved.
                </Text>
              </View>
            </View>
          </ScrollView>
        </TouchableWithoutFeedback>

        {/* Loading Overlay Modal */}
        <Modal visible={showLoading} transparent animationType="fade">
          <View className="flex-1 bg-black/40 justify-center items-center">
            <View
              className="bg-white rounded-2xl py-8 px-10 items-center"
              style={{
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 8 },
                shadowOpacity: 0.3,
                shadowRadius: 16,
                elevation: 16,
                minWidth: 240,
              }}
            >
              <ActivityIndicator size="large" color="#4F46E5" />
              <Text className="mt-4 font-bold text-lg text-gray-800">
                Loading app...
              </Text>
              <Text className="mt-2 text-sm text-gray-500">Please wait</Text>
            </View>
          </View>
        </Modal>
      </KeyboardAvoidingView>
    </>
  );
};

export default LoginScreen;