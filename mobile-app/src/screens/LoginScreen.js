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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../hooks/useAuth';
import { User, Lock, GraduationCap, Info, AlertCircle } from 'lucide-react-native';
import { AntDesign } from '@expo/vector-icons';

const LoginScreen = () => {
  const [credentials, setCredentials] = useState({ username: '', password: '' });
  const [showError, setShowError] = useState('');
  const [showLoading, setShowLoading] = useState(false);

  const { login } = useAuth();

  const handleLogin = async () => {
    Keyboard.dismiss();
    setShowError('');
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
      'Google login is not available yet. Please use username/password.'
    );
  };

  const handleInputChange = (field, value) => {
    setCredentials({ ...credentials, [field]: value });
    setShowError('');
  };

  return (
    <SafeAreaView className="flex-1 bg-gradient-to-br from-blue-50 to-white">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1"
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <ScrollView
            contentContainerStyle={{ flexGrow: 1 }}
            keyboardShouldPersistTaps="handled"
          >
            <View className="flex-1 items-center justify-center py-8 px-5">

              {/* LOGO */}
              <View className="mb-12 mt-8 items-center">
                <View className="flex-row items-center space-x-4">
                  <View className="bg-gradient-to-br from-indigo-600 to-blue-500 rounded-2xl h-16 w-16 shadow-lg justify-center items-center">
                    <GraduationCap size={32} color="#fff" />
                  </View>
                  <View>
                    <Text className="font-extrabold text-gray-900 text-2xl leading-tight">
                      NATIONAL{'\n'}ENGINEERING COLLEGE
                    </Text>
                    <Text className="text-indigo-500 text-base font-semibold">
                      Hostel Management
                    </Text>
                  </View>
                </View>
              </View>

              {/* LOGIN CARD */}
              <View className="bg-white/90 border border-blue-100 rounded-2xl w-full max-w-md shadow-xl py-8 px-5">
                <Text className="text-3xl font-bold text-center text-blue-700 mb-2">
                  Sign In
                </Text>
                <Text className="text-center text-gray-500 mb-8 text-base">
                  Student Portal
                </Text>

                {/* ERROR */}
                {showError ? (
                  <View className="flex-row items-center bg-red-50 border border-red-200 rounded-lg px-3 py-3 mb-5">
                    <AlertCircle size={20} color="#f87171" />
                    <Text className="text-red-700 text-sm flex-1 ml-2">
                      {showError}
                    </Text>
                  </View>
                ) : null}

                {/* INPUTS */}
                <View className="space-y-4">
                  {/* USERNAME */}
                  <View>
                    <Text className="text-sm font-semibold text-gray-700 mb-2">
                      Username
                    </Text>
                    <View className="flex-row items-center bg-gray-50 border border-gray-200 rounded-lg px-3">
                      <User size={20} color="#6366f1" />
                      <TextInput
                        className="flex-1 text-base ml-2 py-3"
                        placeholder="Enter username"
                        value={credentials.username}
                        onChangeText={val => handleInputChange('username', val)}
                        autoCapitalize="none"
                        autoCorrect={false}
                        editable={!showLoading}
                      />
                    </View>
                  </View>

                  {/* PASSWORD */}
                  <View>
                    <Text className="text-sm font-semibold text-gray-700 mb-2">
                      Password
                    </Text>
                    <View className="flex-row items-center bg-gray-50 border border-gray-200 rounded-lg px-3">
                      <Lock size={20} color="#6366f1" />
                      <TextInput
                        className="flex-1 text-base ml-2 py-3"
                        placeholder="Enter password"
                        value={credentials.password}
                        onChangeText={val => handleInputChange('password', val)}
                        secureTextEntry
                        editable={!showLoading}
                      />
                    </View>
                  </View>

                  {/* LOGIN BUTTON */}
                  <TouchableOpacity
                    className={`mt-4 rounded-lg w-full py-3 bg-gradient-to-r 
                      ${
                        showLoading
                          ? 'from-gray-400 to-gray-300'
                          : 'from-indigo-600 via-blue-600 to-purple-600'
                      } 
                      shadow-lg flex-row items-center justify-center
                    `}
                    disabled={showLoading}
                    onPress={handleLogin}
                  >
                    {showLoading ? (
                      <>
                        <ActivityIndicator color="#fff" size="small" />
                        <Text className="ml-2 text-white font-bold">
                          Signing In...
                        </Text>
                      </>
                    ) : (
                      <Text className="text-white font-bold text-base">
                        Sign In →
                      </Text>
                    )}
                  </TouchableOpacity>
                </View>

                {/* DIVIDER */}
                <View className="relative my-7 flex-row items-center">
                  <View className="flex-1 h-0.5 bg-gray-100" />
                  <Text className="mx-3 text-gray-400 font-semibold">OR</Text>
                  <View className="flex-1 h-0.5 bg-gray-100" />
                </View>

                {/* GOOGLE */}
                <TouchableOpacity
                  className="flex-row justify-center items-center h-12 bg-white border border-gray-200 rounded-lg"
                  onPress={handleGoogleLogin}
                  disabled={showLoading}
                >
                  <AntDesign
                    name="google"
                    size={22}
                    color="#DB4437"
                    style={{ marginRight: 8 }}
                  />
                  <Text className="text-base font-semibold text-gray-700">
                    Continue with Google
                  </Text>
                </TouchableOpacity>

                {/* INFO */}
                <View className="mt-4 py-2 px-3 bg-blue-50 border border-blue-100 flex-row rounded-lg">
                  <Info size={16} color="#3b82f6" />
                  <Text className="text-sm text-blue-800 flex-1 ml-2">
                    Only authorized college users can access the system.
                  </Text>
                </View>

                {/* TEST CREDS */}
                <View className="mt-6 border-t border-gray-100 pt-5">
                  <View className="bg-gray-50 px-4 py-3 rounded-lg border border-gray-100 flex-row justify-between">
                    <Text className="text-xs font-semibold text-gray-500">
                      Test Credentials
                    </Text>
                    <Text className="font-mono text-xs font-bold">
                      admin / admin123
                    </Text>
                  </View>
                </View>
              </View>

              {/* FOOTER */}
              <View className="mt-12 items-center">
                <Text className="text-xs text-gray-400">
                  © 2025 National Engineering College
                </Text>
              </View>

            </View>
          </ScrollView>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>

      {/* FULLSCREEN LOADER */}
      <Modal visible={showLoading} transparent animationType="fade">
        <View className="flex-1 bg-black/30 justify-center items-center">
          <View className="bg-white rounded-2xl py-8 px-8 items-center w-64">
            <ActivityIndicator size="large" color="#6366f1" />
            <Text className="mt-5 font-bold text-lg text-blue-700">
              Loading app...
            </Text>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

export default LoginScreen;
