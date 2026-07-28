import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Button, TextInput, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { outpassAPI } from '../../api/api';

const QRScannerScreen = ({ navigation }) => {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [manualToken, setManualToken] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const isScanning = useRef(false);

  useEffect(() => {
    if (!permission) {
      requestPermission();
    }
  }, [permission]);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      setScanned(false);
      isScanning.current = false;
    });
    return unsubscribe;
  }, [navigation]);

  const handleBarCodeScanned = async ({ data }) => {
    if (isScanning.current || scanned) return;
    isScanning.current = true;
    setScanned(true);
    await processToken(data);
  };

  const handleManualSubmit = async () => {
    if (!manualToken.trim()) {
      Alert.alert('Error', 'Please enter a verification token');
      return;
    }
    await processToken(manualToken.trim());
  };

  const processToken = async (token) => {
    setSubmitting(true);
    try {
      const res = await outpassAPI.scanOutpassQR(token);
      if (res.data.success) {
        navigation.navigate('VerificationResult', {
          success: true,
          message: res.data.message,
          outpass: res.data.data
        });
      } else {
        navigation.navigate('VerificationResult', {
          success: false,
          message: res.data.message || 'Verification Failed',
          outpass: res.data.data
        });
      }
    } catch (error) {
      console.log('Verification Error:', error.message);
      navigation.navigate('VerificationResult', {
        success: false,
        message: error.message.replace('API Error: ', '') || 'Invalid QR or Server Error',
        outpass: null
      });
    } finally {
      setSubmitting(false);
      setScanned(false);
    }
  };

  if (!permission) {
    return (
      <View className="flex-1 justify-center items-center bg-gray-50">
        <ActivityIndicator size="large" color="#4F46E5" />
        <Text className="mt-4 text-gray-500 font-semibold">Requesting camera permission...</Text>
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View className="flex-1 justify-center items-center bg-gray-50 p-6">
        <Text className="text-gray-700 text-center font-bold text-lg mb-4">
          Camera permission is required to scan QR codes
        </Text>
        <TouchableOpacity 
          onPress={requestPermission}
          className="bg-indigo-600 px-6 py-3 rounded-2xl mb-8"
        >
          <Text className="text-white font-bold">Grant Permission</Text>
        </TouchableOpacity>
        
        {/* Manual Fallback Form */}
        <View className="w-full bg-white p-6 rounded-3xl border border-gray-200 shadow-sm">
          <Text className="text-gray-900 font-bold text-base mb-2">Manual Code Verification</Text>
          <TextInput
            placeholder="Enter secure verification token..."
            value={manualToken}
            onChangeText={setManualToken}
            className="border border-gray-200 rounded-xl p-3 mb-4 text-gray-800"
            autoCapitalize="none"
          />
          <TouchableOpacity 
            onPress={handleManualSubmit}
            disabled={submitting}
            className="bg-indigo-600 p-4 rounded-xl items-center"
          >
            {submitting ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text className="text-white font-bold">Verify Code</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-black">
      <CameraView
        style={StyleSheet.absoluteFillObject}
        onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
        barcodeScannerSettings={{
          barcodeTypes: ['qr'],
        }}
      />
      
      {/* Overlay guide */}
      <View className="flex-1 justify-center items-center">
        <View className="w-64 h-64 border-2 border-white rounded-3xl bg-transparent" />
        <Text className="text-white font-bold text-center mt-6 px-4 bg-black/50 py-2 rounded-full">
          Align QR Code within the frame to scan
        </Text>
      </View>

      {/* Manual Code verification overlay at the bottom */}
      <View className="bg-white p-6 rounded-t-[32px] absolute bottom-0 left-0 right-0">
        <Text className="text-gray-800 font-bold text-base mb-2">Manual Token Fallback</Text>
        <View className="flex-row space-x-2">
          <TextInput
            placeholder="Type verification token..."
            value={manualToken}
            onChangeText={setManualToken}
            className="flex-1 border border-gray-200 rounded-xl p-3 text-gray-800 bg-gray-50"
            autoCapitalize="none"
          />
          <TouchableOpacity 
            onPress={handleManualSubmit}
            disabled={submitting}
            className="bg-indigo-600 px-6 rounded-xl justify-center items-center"
          >
            {submitting ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text className="text-white font-bold">Verify</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

export default QRScannerScreen;
