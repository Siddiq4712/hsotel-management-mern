import { withScreenPermission, usePermissions } from '../../auth/PermissionContext';
import { Text } from "../../components/common/ReferenceDesign";
import useForegroundScreen from '../../hooks/useForegroundScreen';
import Screen from '../../components/common/Screen';
import Card from '../../components/common/Card';
import Input from '../../components/common/Input';
import Button from '../../components/common/Button';
import colors from '../../theme/colors';
import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, TouchableOpacity, Alert, ActivityIndicator, ScrollView } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { outpassAPI } from '../../api/api';

const QRScannerScreen = ({ navigation, route }) => {
  const { can } = usePermissions();
  const isFocused = useForegroundScreen();
  const manualMode = Boolean(route?.params?.manual);
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [manualToken, setManualToken] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const isScanning = useRef(false);

  useEffect(() => {
    if (isFocused && !manualMode && !permission) {
      requestPermission();
    }
  }, [permission, isFocused, manualMode]);

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
    if (!can('gate-scan', 'create')) return;
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

  // Release the native camera whenever another screen is shown.
  if (!can('gate-scan', 'create')) return <Screen><Text style={{ padding: 24 }}>View-only access. Gate-pass scanning is disabled for your role.</Text></Screen>;
  if (!isFocused) return <View className="flex-1 bg-gray-50" />;
  if (manualMode) return <Screen className="flex-1 bg-background">
    <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 16, paddingBottom: 32 }}>
      <Card className="bg-white border border-gray-200 rounded-2xl p-5">
        <Text className="text-xl font-bold text-indigo-900 mb-2">Manual verification</Text>
        <Text className="text-sm text-gray-600 mb-5">Enter the student's gate-pass verification token.</Text>
        <Input accessibilityLabel="Verification token" placeholder="Enter verification token" value={manualToken}
          onChangeText={setManualToken} autoCapitalize="none" className="border border-gray-200 rounded-xl bg-gray-50 p-3 mb-4" />
        <Button disabled={submitting} onPress={handleManualSubmit} className="bg-indigo-600 rounded-xl p-4">
          {submitting ? <ActivityIndicator color={colors.card} /> : <Text className="text-white font-semibold">Verify token</Text>}
        </Button>
        <Button variant="secondary" onPress={() => navigation.setParams({ manual: false })} style={{ marginTop: 12, padding: 14, backgroundColor: colors.primarySoft }}>Switch to camera</Button>
      </Card>
    </ScrollView>
  </Screen>;

  if (!permission) {
    return (
      <View className="flex-1 justify-center items-center bg-gray-50">
        <ActivityIndicator size="large" color={colors.primary} />
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
        <Button
          onPress={requestPermission}
          className="bg-indigo-600 px-6 py-3 rounded-xl mb-8"
        >
          <Text className="text-white font-bold">Grant Permission</Text>
        </Button>
        
        {/* Manual Fallback Form */}
        <View className="w-full bg-white p-6 rounded-3xl border border-gray-200 shadow-sm">
          <Text className="text-gray-900 font-bold text-base mb-2">Manual Code Verification</Text>
          <Input
            placeholder="Enter secure verification token..."
            value={manualToken}
            onChangeText={setManualToken}
            className="border border-gray-200 rounded-xl p-3 mb-4 text-gray-800"
            autoCapitalize="none"
          />
          <Button
            onPress={handleManualSubmit}
            disabled={submitting}
            className="bg-indigo-600 p-4 rounded-xl items-center"
          >
            {submitting ? (
              <ActivityIndicator size="small" color={colors.card} />
            ) : (
              <Text className="text-white font-bold">Verify Code</Text>
            )}
          </Button>
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
      <Card className="bg-white p-6 rounded-2xl absolute bottom-0 left-0 right-0">
        <Text className="text-gray-800 font-bold text-base mb-2">Manual Token Fallback</Text>
        <View className="flex-row space-x-2">
          <Input
            placeholder="Type verification token..."
            value={manualToken}
            onChangeText={setManualToken}
            className="flex-1 border border-gray-200 rounded-xl p-3 text-gray-800 bg-gray-50"
            autoCapitalize="none"
          />
          <Button
            onPress={handleManualSubmit}
            disabled={submitting}
            className="bg-indigo-600 px-6 rounded-xl justify-center items-center"
          >
            {submitting ? (
              <ActivityIndicator size="small" color={colors.card} />
            ) : (
              <Text className="text-white font-bold">Verify</Text>
            )}
          </Button>
        </View>
      </Card>
    </View>
  );
};

export default withScreenPermission(QRScannerScreen, 'gate-scan');
