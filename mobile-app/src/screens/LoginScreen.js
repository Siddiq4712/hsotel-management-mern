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
  Image,
} from 'react-native';
import { useAuth } from '../hooks/useAuth';
import { User, Lock, Info, AlertCircle } from 'lucide-react-native';
import { AntDesign } from '@expo/vector-icons';

const LoginScreen = () => {
  const [credentials, setCredentials] = useState({ username: '', password: '' });
  const [showError, setShowError] = useState('');
  const [showLoading, setShowLoading] = useState(false);
  const { login } = useAuth();

  const handleLogin = async () => {
    Keyboard.dismiss();
    setShowError('');

    if (!credentials.username.trim() || !credentials.password.trim()) {
      setShowError('Please enter both username and password');
      return;
    }

    setShowLoading(true);

    setTimeout(async () => {
      const result = await login(credentials);
      if (!result.success) {
        setShowLoading(false);
        setShowError(result.message || 'Sign in failed. Please try again.');
      }
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
      <StatusBar barStyle="dark-content" backgroundColor="#F8FAFC" />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1"
        style={{ backgroundColor: '#F8FAFC' }}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <ScrollView
            contentContainerStyle={{ flexGrow: 1 }}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View className="flex-1 items-center justify-center py-8 px-5">

              {/* ================= LOGO SECTION ================= */}
              <View className="mb-10 mt-8 items-center">
                <View className="flex-row items-center">
                  <View
                    className="rounded-2xl h-16 w-16 justify-center items-center bg-white"
                    style={{
                      shadowColor: '#000',
                      shadowOffset: { width: 0, height: 4 },
                      shadowOpacity: 0.1,
                      shadowRadius: 8,
                      elevation: 4,
                    }}
                  >
                    <Image
                      source={require('../../assets/nec_logo.jpeg')}
                      style={{
                        width: 56,
                        height: 56,
                        resizeMode: 'contain',
                        borderRadius: 12,
                      }}
                    />
                  </View>

                  <View className="ml-4">
                    <Text className="font-bold text-gray-900 text-xl">
                      NATIONAL
                    </Text>
                    <Text className="font-bold text-gray-900 text-xl">
                      ENGINEERING COLLEGE
                    </Text>
                    <Text className="text-gray-600 text-sm font-semibold mt-1">
                      Hostel Management
                    </Text>
                  </View>
                </View>
              </View>

              {/* ================= LOGIN CARD ================= */}
              <View
                className="bg-white rounded-2xl w-full max-w-md py-8 px-6"
                style={{
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.05,
                  shadowRadius: 12,
                  elevation: 6,
                  borderWidth: 1,
                  borderColor: '#E2E8F0',
                }}
              >
                <Text className="text-2xl font-bold text-center text-gray-900 mb-2">
                  Sign In
                </Text>
                <Text className="text-center text-gray-500 mb-6 text-base">
                  Student Portal
                </Text>

                {showError ? (
                  <View className="flex-row items-start bg-red-50 border border-red-200 rounded-lg px-4 py-3 mb-5">
                    <AlertCircle size={20} color="#EF4444" />
                    <Text className="text-red-700 text-sm flex-1 ml-3">
                      {showError}
                    </Text>
                  </View>
                ) : null}

                {/* Username */}
                <View className="mb-4">
                  <Text className="text-sm font-semibold text-gray-700 mb-2">
                    Username
                  </Text>
                  <View className="flex-row items-center bg-gray-50 border border-gray-200 rounded-lg px-4 h-[52px]">
                    <User size={20} color="#374151" />
                    <TextInput
                      className="flex-1 text-base ml-3"
                      placeholder="Enter username"
                      placeholderTextColor="#9CA3AF"
                      value={credentials.username}
                      onChangeText={(val) => handleInputChange('username', val)}
                      autoCapitalize="none"
                      editable={!showLoading}
                    />
                  </View>
                </View>

                {/* Password */}
                <View className="mb-6">
                  <Text className="text-sm font-semibold text-gray-700 mb-2">
                    Password
                  </Text>
                  <View className="flex-row items-center bg-gray-50 border border-gray-200 rounded-lg px-4 h-[52px]">
                    <Lock size={20} color="#374151" />
                    <TextInput
                      className="flex-1 text-base ml-3"
                      placeholder="Enter password"
                      placeholderTextColor="#9CA3AF"
                      secureTextEntry
                      value={credentials.password}
                      onChangeText={(val) => handleInputChange('password', val)}
                      editable={!showLoading}
                      onSubmitEditing={handleLogin}
                    />
                  </View>
                </View>

                {/* Sign In Button */}
                <TouchableOpacity disabled={showLoading} onPress={handleLogin}>
                  <View
                    className="rounded-lg flex-row items-center justify-center h-[52px] bg-gray-500"
                    style={{
                      backgroundColor: showLoading ? '#9CA3AF' : '#2982ffff',
                    }}
                  >
                    {showLoading ? (
                      <>
                        <ActivityIndicator color="#fff" />
                        <Text className="ml-2 text-white font-bold">
                          Signing In...
                        </Text>
                      </>
                    ) : (
                      <Text className="text-white font-bold text-base">
                        Sign In →
                      </Text>
                    )}
                  </View>
                </TouchableOpacity>

                {/* Divider */}
                <View className="my-6 flex-row items-center">
                  <View className="flex-1 h-px bg-gray-200" />
                  <Text className="mx-4 text-gray-400 font-semibold">OR</Text>
                  <View className="flex-1 h-px bg-gray-200" />
                </View>

                {/* Google Button */}
                <TouchableOpacity
                  className="flex-row justify-center items-center bg-white border border-gray-300 rounded-lg h-[52px]"
                  onPress={handleGoogleLogin}
                  disabled={showLoading}
                >
                  <AntDesign name="google" size={22} color="#DB4437" />
                  <Text className="ml-3 font-semibold text-gray-700">
                    Continue with Google
                  </Text>
                </TouchableOpacity>

                {/* Info */}
                <View className="mt-5 p-4 bg-gray-50 border border-gray-200 rounded-lg flex-row">
                  <Info size={18} color="#6B7280" />
                  <Text className="ml-3 text-gray-700 text-sm flex-1">
                    Only authorized college users can access this system.
                  </Text>
                </View>

                {/* Test Credentials */}
                <View className="mt-6 border-t border-gray-200 pt-4">
                  <Text className="text-xs text-gray-500 text-center">
                    Test Login: admin / admin123
                  </Text>
                </View>
              </View>

              {/* Footer */}
              <View className="mt-10">
                <Text className="text-xs text-gray-400">
                  © 2025 National Engineering College
                </Text>
              </View>
            </View>
          </ScrollView>
        </TouchableWithoutFeedback>

        {/* Loading Modal */}
        <Modal visible={showLoading} transparent animationType="fade">
          <View className="flex-1 bg-black/40 justify-center items-center">
            <View className="bg-white rounded-2xl px-10 py-8 items-center">
              <ActivityIndicator size="large" color="#374151" />
              <Text className="mt-4 font-bold text-lg text-gray-900">Loading app...</Text>
            </View>
          </View>
        </Modal>
      </KeyboardAvoidingView>
    </>
  );
};

export default LoginScreen;